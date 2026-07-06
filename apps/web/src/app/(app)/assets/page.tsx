"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Backpack, Baby, BatteryLow, Dog, MapPin, Package, PawPrint, Wrench } from "lucide-react";
import { vehicles, type Vehicle } from "@aerotrack/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill, VehicleStatusChip } from "@/components/shared/status";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";

const FleetMap = dynamic(() => import("@/components/map/fleet-map").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
});

const ASSET_KINDS: Vehicle["kind"][] = ["pet", "child", "parcel", "livestock", "bag", "equipment", "container", "generator"];
const KIND_ICON: Partial<Record<Vehicle["kind"], typeof Dog>> = {
  pet: Dog,
  child: Baby,
  parcel: Package,
  livestock: PawPrint,
  bag: Backpack,
  equipment: Wrench,
  container: Package,
  generator: Wrench,
};

export default function AssetsPage() {
  const assets = vehicles.filter((v) => ASSET_KINDS.includes(v.kind));
  const [selectedId, setSelectedId] = useState(assets[0]?.id);

  // Deterministic pseudo battery per asset
  const battery = (v: Vehicle) => 15 + ((v.id.charCodeAt(4) * 37) % 80);

  return (
    <PageContainer>
      <PageHeader
        title="Assets & Personal Tracking"
        subtitle="Pets, kids, parcels, livestock, bags and valuable equipment — beyond vehicles"
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="flex flex-col gap-2.5 xl:col-span-2">
          {assets.map((a) => {
            const Icon = KIND_ICON[a.kind] ?? Package;
            const bat = battery(a);
            return (
              <Panel
                key={a.id}
                hover
                className={cn("cursor-pointer p-4", selectedId === a.id && "ring-1 ring-primary/30")}
              >
                <button className="flex w-full items-center gap-3.5 text-left" onClick={() => setSelectedId(a.id)}>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold">{a.name}</span>
                      <Pill tone="muted">{a.kind}</Pill>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-muted-foreground">
                      <MapPin className="size-3 shrink-0" /> {a.position.address} · {timeAgo(a.position.updatedAt)}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress
                        value={bat}
                        className={cn("h-1.5 w-24", bat < 25 && "[&>*]:bg-destructive")}
                      />
                      <span className={cn("text-[11px] font-semibold tabular-nums", bat < 25 ? "text-destructive" : "text-muted-foreground")}>
                        {bat}%
                      </span>
                      {bat < 25 && <BatteryLow className="size-3.5 text-destructive" />}
                    </div>
                  </div>
                  <VehicleStatusChip status={a.status} />
                </button>
              </Panel>
            );
          })}
        </div>

        <Panel className="overflow-hidden xl:col-span-3">
          <div className="border-b border-border/60 px-4 py-3.5">
            <h3 className="text-[14px] font-semibold">Asset Map</h3>
          </div>
          <div className="h-[560px]">
            <FleetMap vehicles={assets} selectedId={selectedId} onSelect={setSelectedId} fit />
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
