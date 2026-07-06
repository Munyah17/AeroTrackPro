"use client";

import { useState } from "react";
import Link from "next/link";
import { Cable, Link2, Plus, Radio } from "lucide-react";
import { toast } from "sonner";
import { DEVICE_MODELS, type DeviceModel } from "@aerotrack/protocols";
import { vehicles } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function DevicesPage() {
  const [tab, setTab] = useState<"catalog" | "bound">("catalog");
  const boundCount = (id: string) => vehicles.filter((v) => v.deviceModelId === id).length;

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
        <TabsList className="mb-4 h-10 rounded-xl p-1">
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
              <div key={v.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <div className={cn("size-2.5 rounded-full", v.status === "offline" ? "bg-muted-foreground/50" : "bg-success")} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold">{m?.vendor} {m?.model}</div>
                  <div className="text-[11.5px] text-muted-foreground">IMEI {v.imei} · SIM {v.simMsisdn}</div>
                </div>
                <Pill tone="primary">{m?.protocol.toUpperCase()}</Pill>
                <span className="text-[13px] font-medium">{v.plate}</span>
              </div>
            );
          })}
        </Panel>
      )}
    </PageContainer>
  );
}
