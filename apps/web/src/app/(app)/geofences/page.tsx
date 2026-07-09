"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Circle, Hexagon, Plus, Route as RouteIcon, Waypoints } from "lucide-react";
import { toast } from "sonner";
import type { Map as MlMap } from "maplibre-gl";
import { geofences, vehicles, type Geofence } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { GeofenceDraw, type DrawMode } from "@/components/map/geofence-draw";
import { cn } from "@/lib/utils";

const FleetMap = dynamic(() => import("@/components/map/fleet-map").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
});

const KIND_ICON = { circle: Circle, polygon: Hexagon, route: RouteIcon } as const;

export default function GeofencesPage() {
  const [active, setActive] = useState<Record<string, boolean>>(
    Object.fromEntries(geofences.map((g) => [g.id, g.active])),
  );
  const [selectedId, setSelectedId] = useState(geofences[0]?.id);
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [localGeofences, setLocalGeofences] = useState(geofences);
  const mapRef = useRef<MlMap | null>(null);

  const shown = localGeofences.map((g) => ({ ...g, active: active[g.id] ?? g.active }));

  const handleGeofenceComplete = (
    geofence: Omit<Geofence, "id" | "tenantId" | "active" | "alertOnEnter" | "alertOnExit" | "dwellMinutes">,
  ) => {
    const newGeofence: Geofence = {
      ...geofence,
      id: `geofence-${Date.now()}`,
      tenantId: geofences[0]?.tenantId ?? "tn-speedtrack",
      active: true,
      alertOnEnter: true,
      alertOnExit: false,
    };
    setLocalGeofences((prev) => [...prev, newGeofence]);
    setActive((prev) => ({ ...prev, [newGeofence.id]: true }));
    setDrawMode(null);
    toast.success(`Geofence "${geofence.name}" created successfully`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Geofences"
        subtitle="Create zones and get alerts when assets enter or exit"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button className="gap-2 rounded-xl shadow-card">
                  <Plus className="size-4" /> Add Geofence
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={() => setDrawMode("circle")} className="gap-2 rounded-lg">
                <Circle className="size-4 text-primary" />
                Circular Geofence
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawMode("polygon")} className="gap-2 rounded-lg">
                <Hexagon className="size-4 text-primary" />
                Polygon Geofence
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="flex flex-col gap-2.5 xl:col-span-2">
          {shown.map((g) => {
            const Icon = KIND_ICON[g.kind];
            return (
              <Panel
                key={g.id}
                hover
                className={cn(
                  "cursor-pointer p-4",
                  selectedId === g.id && "ring-1 ring-primary/30",
                )}
              >
                <button className="flex w-full items-center gap-3.5 text-left" onClick={() => setSelectedId(g.id)}>
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${g.color}18`, color: g.color }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold">{g.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                      <span className="capitalize">{g.kind}</span>
                      {g.radiusM && <span>· Radius {g.radiusM} m</span>}
                      {g.points && <span>· {g.points.length} points</span>}
                      {g.dwellMinutes && <span>· Dwell {g.dwellMinutes}m</span>}
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      {g.alertOnEnter && <Pill tone="info">Entry alert</Pill>}
                      {g.alertOnExit && <Pill tone="warning">Exit alert</Pill>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Switch
                      checked={active[g.id]}
                      onCheckedChange={(c) => {
                        setActive((p) => ({ ...p, [g.id]: c }));
                        toast.success(`${g.name} ${c ? "activated" : "deactivated"}`);
                      }}
                    />
                    <Pill tone={active[g.id] ? "success" : "muted"}>{active[g.id] ? "Active" : "Inactive"}</Pill>
                  </div>
                </button>
              </Panel>
            );
          })}
        </div>

        <Panel className="relative overflow-hidden xl:col-span-3">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3.5">
            <Waypoints className="size-4 text-primary" />
            <h3 className="text-[14px] font-semibold">Zone Map</h3>
            <span className="ml-auto text-[12px] text-muted-foreground">
              {shown.filter((g) => g.active).length} active zones
            </span>
          </div>
          <div className="relative h-[560px]">
            <FleetMap
              key={JSON.stringify(active)}
              vehicles={vehicles.slice(0, 10)}
              geofences={shown}
              zoom={11}
              onMapReady={(map) => (mapRef.current = map)}
            />
            <GeofenceDraw
              map={mapRef.current}
              mode={drawMode}
              onComplete={handleGeofenceComplete}
              onCancel={() => setDrawMode(null)}
            />
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
