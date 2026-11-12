"use client";

import { useState } from "react";
import Link from "next/link";
import { Cable, Link2, MapPin, Plus, Radio } from "lucide-react";
import { toast } from "sonner";
import { DEVICE_MODELS, type DeviceModel } from "@aerotrack/protocols";
import type { Vehicle } from "@aerotrack/shared";
import { useFleet } from "@/hooks/use-fleet";
import { vehicleLiveStatus, LIVE_STATUS } from "@/lib/live-status";
import { coords, timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<DeviceModel["category"], string> = {
  vehicle: "Vehicle",
  asset: "Asset",
  personal: "Personal",
  obd: "OBD-II",
};

function CapabilityPills({ model }: { model: DeviceModel }) {
  const c = model.capabilities;
  const caps: string[] = [];
  if (c.gps) caps.push("GPS");
  if (c.lbs) caps.push("LBS");
  if (c.wifi) caps.push("WiFi");
  if (c.engineCut) caps.push("Engine cut");
  if (c.sos) caps.push("SOS");
  if (c.voiceMonitor) caps.push("Voice");
  if (c.fuelSensor) caps.push("Fuel sensor");
  if (c.temperature) caps.push("Temp");
  if (c.gSensor) caps.push("G-sensor");
  if (c.obd) caps.push("OBD");
  if (c.solar) caps.push("Solar");
  if (c.rfid) caps.push("RFID");
  if (c.antiJamming) caps.push("Anti-jam");
  if (c.drivingBehavior) caps.push("Behavior");
  if (c.ota) caps.push("OTA");
  if (c.internalBatteryDays) caps.push(`${c.internalBatteryDays}d battery`);
  return (
    <div className="flex flex-wrap gap-1.5">
      {caps.map((cap) => (
        <span key={cap} className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
          {cap}
        </span>
      ))}
    </div>
  );
}

function protocolLabel(v: Vehicle): string {
  if (v.deviceProtocol) return v.deviceProtocol.toUpperCase();
  return DEVICE_MODELS.find((d) => d.id === v.deviceModelId)?.protocol.toUpperCase() ?? "—";
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn("truncate text-[12.5px] font-medium", mono && "font-mono")}>{value || "—"}</span>
    </div>
  );
}

/** Popup summary for one bound tracker — opened by clicking a row in the
 *  "Bound Devices" list. Shows the names/details the admin entered at
 *  registration, never manufacturer/factory names. */
function TrackerSummaryDialog({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  return (
    <Dialog open={vehicle !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {vehicle && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <span className={cn("size-2.5 shrink-0 rounded-full", LIVE_STATUS[vehicleLiveStatus(vehicle)].dot)} />
                <DialogTitle className="truncate text-[16px]">
                  {vehicle.deviceName || vehicle.name}
                </DialogTitle>
              </div>
              <DialogDescription className="flex items-center gap-2 pt-1">
                <Pill tone={vehicleLiveStatus(vehicle) === "online" ? "success" : vehicleLiveStatus(vehicle) === "sleeping" ? "warning" : "danger"}>
                  {LIVE_STATUS[vehicleLiveStatus(vehicle)].label}
                </Pill>
                <span className="truncate">
                  {vehicle.name} · {vehicle.plate}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="divide-y divide-border/60 rounded-xl border border-border/60 px-3.5">
              <DetailRow label="Tracker ID" value={vehicle.imei} mono />
              <DetailRow label="Protocol" value={protocolLabel(vehicle)} />
              <DetailRow label="SIM / Phone" value={vehicle.simMsisdn} mono />
              <DetailRow label="Signal" value={vehicle.gsmSignal ? `${vehicle.gsmSignal}%` : "—"} />
              <DetailRow label="Last seen" value={vehicle.lastSeenAt ? timeAgo(vehicle.lastSeenAt) : "—"} />
              <DetailRow label="Last fix" value={vehicle.position.updatedAt ? timeAgo(vehicle.position.updatedAt) : "—"} />
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-accent/60 px-3 py-2.5">
              <MapPin className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium leading-tight">
                  {coords(vehicle.position.lat, vehicle.position.lng)}
                </div>
                <div className="truncate text-[10.5px] text-muted-foreground">
                  {vehicle.position.speedKmh > 0 ? `${vehicle.position.speedKmh} km/h` : "Stationary"}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                render={<Link href="/tracking" />}
                className="w-full rounded-xl shadow-card"
              >
                View on Live Tracking
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function DevicesPage() {
  const [tab, setTab] = useState<"catalog" | "bound">("catalog");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { vehicles } = useFleet();
  const boundCount = (id: string) => vehicles.filter((v) => v.deviceModelId === id).length;
  const selected = vehicles.find((v) => v.id === selectedId) ?? null;

  return (
    <PageContainer>
      <PageHeader
        title="Devices"
        subtitle={`${DEVICE_MODELS.length} supported hardware models across 8 wire protocols`}
        actions={
          <Button render={<Link href="/devices/onboard" />} className="gap-2 rounded-xl shadow-card">
            <Plus className="size-4" /> Add Device
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="scrollbar-none mb-4 h-10 max-w-full overflow-x-auto rounded-xl p-1">
          <TabsTrigger value="catalog" className="rounded-lg px-4 text-[13px]">Supported Catalog</TabsTrigger>
          <TabsTrigger value="bound" className="rounded-lg px-4 text-[13px]">Bound Devices ({vehicles.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "catalog" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DEVICE_MODELS.map((m) => (
            <Panel key={m.id} hover className="flex flex-col p-5">
              <div className="flex items-start gap-3.5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Radio className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-semibold">{m.vendor} {m.model}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Pill tone="primary">{m.protocol.toUpperCase()}</Pill>
                    <Pill tone="muted">{CATEGORY_LABEL[m.category]}</Pill>
                    {m.capabilities.network.map((n) => (
                      <Pill key={n} tone="info">{n}</Pill>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">{m.description}</p>
              <div className="mt-3">
                <CapabilityPills model={m} />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-[12px] text-muted-foreground">
                  <Link2 className="mr-1 inline size-3.5" />
                  {boundCount(m.id)} bound
                </span>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toast.success(`${m.model} selected — choose a vehicle to bind`)}>
                  <Cable className="size-3.5" /> Bind
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel className="divide-y divide-border/60">
          {vehicles.map((v) => {
            const m = DEVICE_MODELS.find((d) => d.id === v.deviceModelId);
            return (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className="flex w-full flex-wrap items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-accent/50"
              >
                {(() => {
                  const ls = LIVE_STATUS[vehicleLiveStatus(v)];
                  return (
                    <>
                      <span className={cn("size-2.5 rounded-full", ls.dot)} />
                      <Pill tone={vehicleLiveStatus(v) === "online" ? "success" : vehicleLiveStatus(v) === "sleeping" ? "warning" : "danger"}>
                        {ls.label}
                      </Pill>
                    </>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{v.deviceName || v.name}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {v.name !== (v.deviceName || v.name) ? `${v.name} · ` : ""}IMEI {v.imei}
                    {v.simMsisdn ? ` · SIM ${v.simMsisdn}` : ""}
                  </div>
                </div>
                <Pill tone="primary">{protocolLabel(v)}</Pill>
                <span className="text-[13px] font-medium">{v.plate}</span>
              </button>
            );
          })}
        </Panel>
      )}

      <TrackerSummaryDialog vehicle={selected} onClose={() => setSelectedId(null)} />
    </PageContainer>
  );
}
