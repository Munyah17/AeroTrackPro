"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Calendar, ChevronRight, Clock, Gauge, MapPin, Route as RouteIcon } from "lucide-react";
import { trips, vehicles, vehicleById } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { cn } from "@/lib/utils";
import { km, kmh, shortDateTime } from "@/lib/format";

const FleetMap = dynamic(() => import("@/components/map/fleet-map").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
});

export default function TripsPage() {
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id);

  const rows = useMemo(
    () => trips.filter((t) => vehicleFilter === "all" || t.vehicleId === vehicleFilter),
    [vehicleFilter],
  );
  const selected = trips.find((t) => t.id === selectedTripId) ?? rows[0];
  const selectedVehicle = selected ? vehicleById(selected.vehicleId) : undefined;

  const totals = useMemo(
    () => ({
      trips: rows.length,
      distance: rows.reduce((n, t) => n + t.distanceKm, 0),
      hours: Math.round(rows.reduce((n, t) => n + t.durationMin, 0) / 60),
      avgSpeed: Math.round(rows.reduce((n, t) => n + t.avgSpeedKmh, 0) / Math.max(1, rows.length)),
    }),
    [rows],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Trip History"
        subtitle="Routes, duration and distance for every trip"
        actions={
          <Select value={vehicleFilter} onValueChange={(v) => setVehicleFilter(v ?? "all")}>
            <SelectTrigger className="w-52 rounded-xl bg-card">
              <SelectValue placeholder="All vehicles" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All vehicles</SelectItem>
              {vehicles.slice(0, 12).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.plate} — {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Totals */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Trips", value: totals.trips, icon: RouteIcon },
          { label: "Total Distance", value: km(totals.distance), icon: MapPin },
          { label: "Total Time", value: `${totals.hours}h`, icon: Clock },
          { label: "Avg Speed", value: kmh(totals.avgSpeed), icon: Gauge },
        ].map((s) => (
          <Panel key={s.label} className="flex items-center gap-3.5 p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <s.icon className="size-4.5" />
            </div>
            <div>
              <div className="text-lg font-bold tabular-nums">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Trip list */}
        <Panel className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
            <h3 className="text-[14px] font-semibold">Trips ({rows.length})</h3>
            <Calendar className="size-4 text-muted-foreground" />
          </div>
          <div className="scrollbar-thin max-h-[520px] overflow-y-auto p-2">
            {rows.map((t) => {
              const v = vehicleById(t.vehicleId);
              const active = t.id === selected?.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTripId(t.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors",
                    active ? "bg-primary/8 ring-1 ring-primary/25" : "hover:bg-accent/60",
                  )}
                >
                  <div className="flex flex-col items-center gap-1 self-stretch py-1">
                    <span className="size-2 rounded-full bg-success" />
                    <span className="w-px flex-1 bg-border" />
                    <span className="size-2 rounded-full bg-destructive" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold">{v?.plate}</span>
                      <span className="text-[11px] text-muted-foreground">{shortDateTime(t.startAt)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{t.startAddress}</div>
                    <div className="truncate text-[12px] text-muted-foreground">→ {t.endAddress}</div>
                    <div className="mt-1 flex gap-3 text-[11px] font-medium text-muted-foreground">
                      <span>{km(t.distanceKm)}</span>
                      <span>{Math.floor(t.durationMin / 60)}h {t.durationMin % 60}m</span>
                      <span>max {kmh(t.maxSpeedKmh)}</span>
                    </div>
                  </div>
                  <ChevronRight className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground/50")} />
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Trip replay map */}
        <Panel className="overflow-hidden xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3.5">
            <div>
              <h3 className="text-[14px] font-semibold">
                {selectedVehicle ? `${selectedVehicle.plate} — Trip Replay` : "Trip Replay"}
              </h3>
              {selected && (
                <p className="text-[12px] text-muted-foreground">
                  {shortDateTime(selected.startAt)} · {km(selected.distanceKm)} · avg {kmh(selected.avgSpeedKmh)}
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" className="rounded-xl">Playback</Button>
          </div>
          <div className="h-[480px]">
            {selected && selectedVehicle && (
              <FleetMap
                key={selected.id}
                vehicles={[selectedVehicle]}
                path={selected.path}
                center={selected.path[Math.floor(selected.path.length / 2)]}
                zoom={12}
              />
            )}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
