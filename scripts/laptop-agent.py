#!/usr/bin/env python3
"""
AeroTrack laptop agent — reports laptop location to AeroTrack Pro.

Uses only the Python standard library (3.8+). No pip install required.

Location is resolved server-side from the public IP (ip-api.com) because
laptops have no GPS. Accuracy is city-level (~10 km) — suitable for theft
recovery and "is this laptop online / roughly where", not precise routing.

Usage:
    python laptop-agent.py --url "https://app.example.com/api/ingest/osmand?key=TOKEN" --id AT-XXXXXXXX

Run once to test, then schedule it to run at login:
    Windows : Task Scheduler -> "At log on" -> python laptop-agent.py ...
    macOS   : launchd plist or cron @reboot
    Linux   : cron @reboot or systemd user service

Options:
    --url       Full ingest URL including the ?key= token (required)
    --id        Device ID shown at onboarding, e.g. AT-7K3M9N2P (required)
    --interval  Seconds between reports (default 600 = 10 min)
    --once      Report a single position and exit (for testing)
"""

import argparse
import json
import platform
import socket
import sys
import time
import urllib.parse
import urllib.request


def get_public_ip() -> str | None:
    """Best-effort public IP lookup. Returns None on failure."""
    for url in ("https://api.ipify.org", "https://ifconfig.me/ip", "https://icanhazip.com"):
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                ip = resp.read().decode().strip()
                if ip:
                    return ip
        except Exception:
            continue
    return None


def get_battery() -> int | None:
    """Battery percent if the OS exposes it (Linux /sys/class/power_supply)."""
    try:
        import glob

        for path in glob.glob("/sys/class/power_supply/BAT*/capacity"):
            with open(path) as f:
                return int(f.read().strip())
    except Exception:
        pass
    return None


def build_params(device_id: str, ip: str | None) -> dict[str, str]:
    params = {
        "id": device_id,
        "timestamp": str(int(time.time())),
        "event": "position",
        "source": "laptop-agent",
        "os": platform.system(),
        "hostname": socket.gethostname(),
    }
    batt = get_battery()
    if batt is not None:
        params["batt"] = str(batt)
    if ip:
        params["ip"] = ip
    return params


def report(url: str, params: dict[str, str]) -> bool:
    full = f"{url}{'&' if '?' in url else '?'}{urllib.parse.urlencode(params)}"
    try:
        req = urllib.request.Request(full, headers={"User-Agent": "AeroTrack-Laptop-Agent/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode(errors="replace")
            ok = resp.status == 200 and '"stored":1' in body.replace(" ", "")
            print(f"[{time.strftime('%H:%M:%S')}] reported -> HTTP {resp.status} {body.strip()}", flush=True)
            return ok
    except Exception as exc:
        print(f"[{time.strftime('%H:%M:%S')}] report failed: {exc}", flush=True)
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="AeroTrack laptop tracking agent")
    parser.add_argument("--url", required=True, help="Full ingest URL with ?key= token")
    parser.add_argument("--id", required=True, help="Device ID, e.g. AT-7K3M9N2P")
    parser.add_argument("--interval", type=int, default=600, help="Seconds between reports (default 600)")
    parser.add_argument("--once", action="store_true", help="Report once and exit")
    args = parser.parse_args()

    print(f"AeroTrack laptop agent — device {args.id}, interval {args.interval}s", flush=True)

    while True:
        ip = get_public_ip()
        params = build_params(args.id, ip)
        report(args.url, params)
        if args.once:
            return 0
        time.sleep(args.interval)


if __name__ == "__main__":
    sys.exit(main())
