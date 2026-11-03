# SinoTrack ST-901A — Configuration Handbook

> **Scope:** AeroTrack's proof-of-concept device. Only SinoTrack ST-901A units are
> onboarded at this stage; other brands/protocols roll out after the PoC is
> proven. Commands below are verified against the official ST-901A user manual.

---

## 1. What you need

| Item | Requirement |
|---|---|
| ST-901A tracker | With power cable, GPS + GSM antennas |
| SIM card | GSM 2G/4G data plan, SMS enabled, **PIN disabled**, sufficient credit |
| APN | Your carrier's APN (e.g. `netone` / `econet` / `internet`) |
| Server target | Traccar server **IPv4 address** + port `5013` (IP only — the unit cannot resolve hostnames) |
| Admin phone | For sending configuration SMS commands |
| 12–24V supply | Vehicle battery or bench PSU |

## 2. Wiring

```
Red     → Battery +12/24V (constant, not ignition-switched)
Black   → Ground (battery −)
Orange  → ACC / ignition sense (needed for driving/off intervals + ignition alerts)
Yellow  → Relay output to fuel pump/ignition circuit (immobilisation only)
```

Fit the GPS antenna with a clear sky view (plastic dash mount, never under metal)
and the GSM antenna away from the GPS antenna to avoid interference.

**LED guide**

| Blue (GPS) | Amber (GSM) | Meaning |
|---|---|---|
| Flashing | Flashing | Searching both networks |
| Solid | Flashing | GPS fix acquired, GSM still registering |
| Flashing | Solid | GPS searching, GSM registered |
| Solid | Solid | **Working — GPS fix + GSM registered** |

## 3. SIM setup — before powering on

1. Insert SIM in a phone. Disable PIN lock, confirm SMS send/receive works and
   data activates.
2. Save the tracker's MSISDN — this is the number you send config SMSes to.
3. Fit SIM into the tracker (chip side down, notched corner in) **before** power.

## 4. SMS command syntax

```
<command><password><space><parameters>
```

- Default password: **`0000`**
- Replies echo the new setting or `OK` / `ALREADY` / `FAIL`.
- If you get no reply at all: check SIM credit, PIN disabled, and coverage.

Example — set APN: `8030000 netone` → reply `APN:netone`

## 5. Initial setup sequence (do in order)

| Step | Command | What it does |
|---|---|---|
| 1 | `8030000 <apn>` | Set carrier APN |
| 2 | `8040000 <server-ip> 5013` | Point tracker at the Traccar ingest (dotted IP only) |
| 3 | `7100000` | GPRS mode (7000000 = SMS-only mode — do NOT use for tracking) |
| 4 | `8960000E00` | Time zone UTC+0 |
| 5 | `8050000 60` | Upload interval while driving: 60 s (range 10–18000, 0 = GPRS off) |
| 6 | `8090000 600` | Interval when ignition off: 10 min (optional, saves data) |
| 7 | `7770000 <newpwd>` | **Change the default password** — every subsequent command uses it |
| 8 | `RCONF` | Read back the full config — verify it all |

**Example RCONF reply:**

```
IP:144.91.97.245,5013;ID:8160528336;APN:netone;GPS:OK;GSM:OK;TIMER:60,600
```

**Write down `ID:` — that 10-digit tracker ID is the platform identity of the unit.**

## 6. Full SMS command reference

| Function | Command (`<pwd>` = password) | Notes |
|---|---|---|
| Set APN | `803<pwd> <apn>` | Step 1 of setup |
| Set server | `804<pwd> <ip> <port>` | **IPv4 only**, port `5013` |
| GPRS mode | `710<pwd>` | Required for live tracking |
| SMS-only mode | `700<pwd>` | Tracking disabled — replies by SMS |
| Time zone | `896<pwd>E00` | UTC+0 for our platform |
| Interval (ACC on) | `805<pwd> <10–18000s>` | `0` = GPRS off |
| Interval (ACC off) | `809<pwd> <10–18000s>` | Optional |
| Daily upload time | `665<pwd> HHMM` | Once-daily schedule mode |
| Locate now | `669<pwd>` | SMS reply with Google Maps link |
| Read config | `RCONF` | No password needed |
| Restart | `RESTART` | No password needed |
| Change password | `777<pwd> <new>` | Do this during setup |
| Geofence on | `211<pwd>` | Radius set by `005` |
| Geofence off | `210<pwd>` | |
| Geofence radius | `005<pwd> <metres>` | e.g. `0050000 300` |
| Overspeed alarm | `122<pwd> <km/h>` | `0` = off |
| Shock alarm on | `181<pwd> T` | T = sensitivity 1–5 |
| Shock alarm off | `180<pwd>` | |
| ACC alarm on | `886<pwd>` | Ignition-change alerts |
| ACC alarm off | `887<pwd>` | |
| Call/voice mode | `150<pwd>` / `151<pwd>` | Monitor/voice-call behaviour |

> ⚠️ **Immobilisation (`stopelec` / `supplyelec`) is NOT in the ST-901A manual.**
> The platform exposes the commands, but treat them as *unverified* — test on a
> bench unit before relying on them in the field. The manual only documents the
> cut-power **alarm**, not a fuel-cut SMS command.

## 7. Platform onboarding (per unit)

1. **AeroTrack → Devices → Add:** Model `SinoTrack ST-901A`, protocol `h02`,
   **`imei` = the 10-digit tracker ID** from `RCONF`/sticker — *never* the
   15-digit IMEI.
2. **Traccar:** create device with `uniqueId` = same 10-digit ID; set the
   `forward.url` attribute (or server-level) to your
   `https://<host>/api/telemetry?key=<TRACCAR_FORWARD_SECRET>` endpoint, and
   `event.forward.url` to `/api/webhooks/status` for online/offline events.
3. **Point the unit:** `8040000 <traccar-server-ip> 5013`.
4. **First fix:** within ~2 upload intervals the device turns online and its
   `traccar_id` is learned + persisted automatically.

## 8. Verification checklist

- [ ] `RCONF` shows correct `IP:port`, `APN`, `ID`
- [ ] Both LEDs solid (GPS fix + GSM registered)
- [ ] `6690000` returns a live Maps link
- [ ] Device shows **online** in Traccar and on the AeroTrack map
- [ ] `device_commands` audit row appears when a command is sent from the app
- [ ] Password changed from `0000`

## 9. Troubleshooting

| Symptom | Check |
|---|---|
| No SMS replies | SIM credit, PIN still enabled, wrong MSISDN, no 2G coverage |
| Replies `FAIL` | Wrong password (did you change it with `777`?) or bad params |
| RCONF OK but offline in Traccar | `804` set a **hostname** — must be dotted IP; port must be `5013`; `710` GPRS mode |
| Online, no positions | `805`/`809` intervals are `0` (GPRS off); `665` daily mode set |
| Positions, wrong time | `896` timezone not `E00` |
| Power-cut alarm spam | Expected if yellow wire is on ignition — immobilisation relay wiring |

## 10. Firmware caveat

Some newer **ST-901A+/ST-902W** units ship **JT808 binary** firmware (frames start
with `0x7E` instead of `*HQ,`). If a unit never connects to port 5013, capture the
first frame — `0x7E` → repoint it to JT808 port `5015`, which AeroTrack's stack
already decodes.

## 11. Lab simulator (no hardware needed)

```powershell
cd apps/ingest
$env:HOST="<ingest-or-traccar-ip>"; $env:PORT="5013"; $env:TRACKER_ID="8160528336"
pnpm sim:st901a
```

Sends real H02 wire frames (V4 fixes, B0/B1 heartbeats) — positions land in the
same pipeline as a physical unit.

## 12. Field safety notes

- Engine immobilisation executes **when the unit next reports in** — only issue
  on a verified request, never to a moving vehicle mid-execution-window.
- Constant +12V wiring means the tracker keeps working with ignition off —
  expected for theft recovery, but watch vehicle battery drain on parked fleets.
