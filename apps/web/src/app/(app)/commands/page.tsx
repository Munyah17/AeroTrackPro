"use client";

import { useState } from "react";
import { Lock, LockOpen, MapPin, MessageSquareText, Power, RefreshCw, Timer, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { vehicles } from "@aerotrack/shared";
import { getDeviceModel, SINOTRACK_SMS_COMMANDS, COBAN_SMS_COMMANDS } from "@aerotrack/protocols";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const HISTORY = [
  { cmd: "Engine Resume", vehicle: "AFC 1187", by: "Munya M.", when: "2h ago", status: "delivered" },
  { cmd: "Locate", vehicle: "AEC 4521", by: "Rudo C.", when: "5h ago", status: "delivered" },
  { cmd: "Engine Stop", vehicle: "AFC 1187", by: "Munya M.", when: "6h ago", status: "delivered" },
  { cmd: "Set Interval 30s", vehicle: "ADQ 9902", by: "System", when: "1d ago", status: "delivered" },
  { cmd: "Reboot", vehicle: "AEA 1029", by: "Munya M.", when: "1d ago", status: "failed" },
];

export default function CommandsPage() {
  const [vehicleId, setVehicleId] = useState(vehicles[0]!.id);
  const vehicle = vehicles.find((v) => v.id === vehicleId)!;
  const device = getDeviceModel(vehicle.deviceModelId);
  const caps = device?.capabilities;

  const send = (label: string, warn = false) => {
    if (warn) {
      toast.warning(`${label} queued for ${vehicle.plate}`, {
        description: "Safety check: command executes only when speed < 20 km/h.",
      });
    } else {
      toast.success(`${label} sent to ${vehicle.plate}`, {
        description: `Via ${device?.protocol.toUpperCase()} GPRS downlink · IMEI ${vehicle.imei}`,
      });
    }
  };

  const commands = [
    { label: "Locate Now", icon: MapPin, show: true, action: () => send("Locate") },
    { label: "Immobilize Engine", icon: Lock, show: !!caps?.engineCut, warn: true, action: () => send("Engine stop", true) },
    { label: "Restore Engine", icon: LockOpen, show: !!caps?.engineCut, action: () => send("Engine resume") },
    { label: "Voice Monitor", icon: Volume2, show: !!caps?.voiceMonitor, action: () => send("Voice monitor callback") },
    { label: "Set Upload Interval", icon: Timer, show: true, action: () => send("Interval 30s") },
    { label: "Reboot Device", icon: RefreshCw, show: true, action: () => send("Reboot") },
    { label: "Power Saving Mode", icon: Power, show: !!caps?.internalBatteryDays, action: () => send("Power saving") },
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
          <Select value={vehicleId} onValueChange={(v) => v && setVehicleId(v)}>
            <SelectTrigger className="w-60 rounded-xl bg-card">
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
                className="h-auto justify-start gap-2.5 rounded-xl px-4 py-3.5 text-[13px]"
                onClick={c.action}
              >
                <c.icon className="size-4.5" /> {c.label}
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
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Command History</h3>
          </div>
          <div className="divide-y divide-border/50">
            {HISTORY.map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{h.cmd}</div>
                  <div className="text-[11.5px] text-muted-foreground">{h.vehicle} · by {h.by} · {h.when}</div>
                </div>
                <Pill tone={h.status === "delivered" ? "success" : "danger"}>{h.status}</Pill>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
