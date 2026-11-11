"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, LockOpen, MapPin, MessageSquareText, Power, RefreshCw, ShieldCheck, ShieldOff, Timer, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useFleet } from "@/hooks/use-fleet";
import { getDeviceModel, SINOTRACK_SMS_COMMANDS, COBAN_SMS_COMMANDS } from "@aerotrack/protocols";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

interface HistoryRow {
  id: string;
  command: { type?: string } | null;
  status: string;
  created_at: string;
  error: string | null;
  requested_by_name: string | null;
  vehicle: { plate: string; name: string } | null;
}

const CMD_LABELS: Record<string, string> = {
  engineStop: "Engine Stop",
  engineResume: "Engine Resume",
  locate: "Locate",
  setInterval: "Set Interval",
  setOverspeed: "Set Overspeed",
  setTimezone: "Set Timezone",
  setApn: "Set APN",
  setServer: "Set Server",
  reboot: "Reboot",
  factoryReset: "Factory Reset",
  arm: "Arm Alarm",
  disarm: "Disarm Alarm",
  sosNumber: "SOS Number",
  listen: "Voice Monitor",
  sleepMode: "Sleep Mode",
  custom: "Custom",
};

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function statusTone(status: string): "success" | "danger" | "warning" | "muted" {
  if (status === "sent" || status === "acked") return "success";
  if (status === "failed") return "danger";
  if (status === "pending") return "warning";
  return "muted";
}

export default function CommandsPage() {
  const { vehicles, live } = useFleet();
  const [vehicleId, setVehicleId] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? vehicles[0];
  const device = vehicle ? getDeviceModel(vehicle.deviceModelId) : undefined;
  const caps = device?.capabilities;

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/commands", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const body = (await res.json()) as { commands: HistoryRow[] };
      setHistory(body.commands);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  if (!vehicle) return null;

  const send = async (label: string, command: Record<string, unknown>, warn = false) => {
    if (warn && !window.confirm(`Immobilize ${vehicle.plate}? The engine cut executes when the unit next reports in. Proceed only on a verified request.`)) {
      return;
    }
    setSending(label);
    try {
      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vehicle_id: vehicle.id, command }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(`${label} failed for ${vehicle.plate}`, { description: body.error ?? `HTTP ${res.status}` });
        return;
      }
      const dispatch = body.dispatch as { kind?: string; reason?: string } | undefined;
      if (dispatch?.kind === "queued") {
        toast.info(`${label} queued for ${vehicle.plate}`, {
          description:
            dispatch?.reason === "native_queued"
              ? "Queued for the device socket — delivers when the tracker connects."
              : dispatch?.reason === "device_offline"
                ? "Device offline — Traccar holds it for the next connection."
                : "Device not yet linked to Traccar — sends when it next reports in.",
        });
      } else if (dispatch?.kind === "failed") {
        toast.error(`${label} rejected`, { description: "Traccar refused the command — see history for detail." });
      } else {
        toast.success(`${label} sent to ${vehicle.plate}`, {
          description: `Via ${device?.protocol.toUpperCase()} downlink · IMEI ${vehicle.imei}`,
        });
      }
      void loadHistory();
    } catch {
      toast.error(`${label} failed`, { description: "Network error reaching the command API." });
    } finally {
      setSending(null);
    }
  };

  const askInterval = () => {
    const input = window.prompt("Upload interval in seconds (10–18000)", "30");
    if (!input) return;
    const seconds = parseInt(input, 10);
    if (!Number.isFinite(seconds) || seconds < 5 || seconds > 86400) {
      toast.error("Invalid interval", { description: "Enter seconds between 5 and 86400." });
      return;
    }
    void send(`Interval ${seconds}s`, { type: "setInterval", seconds });
  };

  const askListen = () => {
    const phone = window.prompt("Callback number for voice monitor (e.g. +2637...)", "");
    if (!phone || phone.trim().length < 5) return;
    void send("Voice monitor", { type: "listen", callbackPhone: phone.trim() });
  };

  const askSleep = () => {
    const input = window.prompt("Sleep after how many minutes stationary? (1–720, 0 disables)", "30");
    if (input === null) return;
    const minutes = parseInt(input, 10);
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 720) {
      toast.error("Invalid value", { description: "Enter minutes between 0 and 720." });
      return;
    }
    void send(minutes === 0 ? "Sleep off" : `Sleep ${minutes}m`, { type: "sleepMode", enabled: minutes > 0, minutes });
  };

  const commands = [
    { label: "Locate Now", icon: MapPin, show: true, action: () => void send("Locate", { type: "locate" }) },
    { label: "Immobilize Engine", icon: Lock, show: !!caps?.engineCut, warn: true, action: () => void send("Engine stop", { type: "engineStop" }, true) },
    { label: "Restore Engine", icon: LockOpen, show: !!caps?.engineCut, action: () => void send("Engine resume", { type: "engineResume" }) },
    { label: "Arm Alarm", icon: ShieldCheck, show: true, action: () => void send("Arm alarm", { type: "arm" }) },
    { label: "Disarm Alarm", icon: ShieldOff, show: true, action: () => void send("Disarm alarm", { type: "disarm" }) },
    { label: "Voice Monitor", icon: Volume2, show: !!caps?.voiceMonitor, action: askListen },
    { label: "Set Upload Interval", icon: Timer, show: true, action: askInterval },
    { label: "Reboot Device", icon: RefreshCw, show: true, action: () => void send("Reboot", { type: "reboot" }) },
    { label: "Power Saving Mode", icon: Power, show: !!caps?.internalBatteryDays, action: () => void send("Power saving", { type: "custom", payload: "powerSaving on" }) },
    { label: "Sleep Mode", icon: Power, show: device?.protocol === "h02", action: askSleep },
  ].filter((c) => c.show);

  const smsCatalog =
    device?.protocol === "h02"
      ? Object.keys(SINOTRACK_SMS_COMMANDS)
      : device?.protocol === "gps103"
        ? Object.keys(COBAN_SMS_COMMANDS)
        : [];

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Remote Commands"
        subtitle="Immobilization, configuration and device control — with full audit trail"
        actions={
          <Select value={vehicleId || vehicle.id} onValueChange={(v) => v && setVehicleId(v)}>
            <SelectTrigger className="w-full rounded-xl bg-card sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {vehicles.slice(0, 16).map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.plate} — {v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Quick Commands</h3>
            <Pill tone="primary">{device?.vendor} {device?.model} · {device?.protocol.toUpperCase()}</Pill>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {commands.map((c) => (
              <Button
                key={c.label}
                variant={c.warn ? "destructive" : "outline"}
                disabled={sending !== null}
                className="h-auto justify-start gap-2.5 rounded-xl px-4 py-3.5 text-[13px]"
                onClick={c.action}
              >
                <c.icon className="size-4.5" /> {sending === c.label ? "Sending…" : c.label}
              </Button>
            ))}
          </div>
          {smsCatalog.length > 0 && (
            <div className="mt-5 rounded-xl bg-muted/60 p-4">
              <div className="flex items-center gap-2 text-[12.5px] font-semibold">
                <MessageSquareText className="size-4 text-primary" /> SMS fallback catalog ({smsCatalog.length} commands)
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                When GPRS is unavailable, commands can be delivered by SMS to {vehicle.simMsisdn}. Supported:{" "}
                {smsCatalog.slice(0, 6).join(", ")}…
              </p>
            </div>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Command History</h3>
            {live && <Pill tone="success">live</Pill>}
          </div>
          <div className="divide-y divide-border/50">
            {history.length === 0 && (
              <div className="px-5 py-8 text-center text-[12.5px] text-muted-foreground">
                No commands issued yet.
              </div>
            )}
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{CMD_LABELS[h.command?.type ?? ""] ?? h.command?.type ?? "Command"}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {h.vehicle?.plate ?? "—"} · by {h.requested_by_name ?? "system"} · {timeAgo(h.created_at)}
                    {h.error ? ` · ${h.error}` : ""}
                  </div>
                </div>
                <Pill tone={statusTone(h.status)}>{h.status}</Pill>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
