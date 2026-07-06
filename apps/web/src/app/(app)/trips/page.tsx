"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Calendar,
  ChevronRight,
  Clock,
  Gauge,
  MapPin,
  Pause,
  Play,
  Route as RouteIcon,
  RotateCcw,
} from "lucide-react";
import { trips, vehicles, vehicleById, type Vehicle } from "@aerotrack/shared";
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

/** Bearing in degrees between two [lng,lat] points, for marker rotation. */
function bearing(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180;
  const dLng = (b[0] - a[0]) * toRad;
  const y = Math.sin(dLng) * Math.cos(b[1] * toRad);
  const x =
    Math.cos(a[1] * toRad) * Math.sin(b[1] * toRad) -
    Math.sin(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.cos(dLng);
  return (Math.atan2(y, x) / toRad + 360) % 360;
}

export default function TripsPage() {
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id);

  // Playback state: progress is a fractional index into the trip path.
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number>(0);

  const rows = useMemo(
    () => trips.filter((t) => vehicleFilter === "all" || t.vehicleId === vehicleFilter),
    [vehicleFilter],
  );
  const selected = trips.find((t) => t.id === selectedTripId) ?? rows[0];
  const selectedVehicle = selected ? vehicleById(selected.vehicleId) : undefined;

  const maxIndex = (selected?.path.length ?? 1) - 1;

  useEffect(() => {
    // Reset playback when switching trips
    setPlaying(false);
    setProgress(0);
  }, [selectedTripId]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        const next = p + dt * 2.2 * speed; // ~2.2 path points per second at 1x
        if (next >= maxIndex) {
          setPlaying(false);
          return maxIndex;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, maxIndex]);

  /** Vehicle ghost positioned at the interpolated playhead. */
  const playbackVehicle: Vehicle | undefined = useMemo(() => {
    if (!selected || !selectedVehicle) return undefined;
    const i = Math.min(Math.floor(progress), maxIndex - 1);
    const t = progress - i;
    const a = selected.path[i]!;
    const b = selected.path[Math.min(i + 1, maxIndex)]!;
    const lng = a[0] + (b[0] - a[0]) * t;
    const lat = a[1] + (b[1] - a[1]) * t;
    return {
      ...selectedVehicle,
      status: "moving",
      position: {
        ...selectedVehicle.position,
        lng,
        lat,
        course: Math.round(bearing(a, b)),
        speedKmh: selected.avgSpeedKmh,
      },
    };
  }, [selected, selectedVehicle, progress, maxIndex]);

  const elapsedMin = selected ? Math.round((progress / Math.max(1, maxIndex)) * selected.durationMin) : 0;

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
          </div>
          <div className="relative h-[480px]">
            {selected && playbackVehicle && (
              <FleetMap
                key={selected.id}
                vehicles={[playbackVehicle]}
                path={selected.path}
                center={selected.path[Math.floor(selected.path.length / 2)]}
                zoom={12}
              />
            )}

            {/* Floating playback bar */}
            {selected && (
              <div className="absolute bottom-4 left-1/2 z-10 flex w-[min(560px,92%)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-float backdrop-blur-xl">
                <Button
                  size="icon-sm"
                  className="shrink-0 rounded-full shadow-card"
                  onClick={() => {
                    if (progress >= maxIndex) setProgress(0);
                    setPlaying((p) => !p);
                  }}
                >
                  {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="shrink-0 rounded-full"
                  onClick={() => {
                    setProgress(0);
                    setPlaying(false);
                  }}
                >
                  <RotateCcw className="size-3.5" />
                </Button>

                {/* Scrubber */}
                <input
                  type="range"
                  min={0}
                  max={maxIndex}
                  step={0.01}
                  value={progress}
                  onChange={(e) => {
                    setProgress(parseFloat(e.target.value));
                    setPlaying(false);
                  }}
                  className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                />

                <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {Math.floor(elapsedMin / 60)}:{String(elapsedMin % 60).padStart(2, "0")} /{" "}
                  {Math.floor(selected.durationMin / 60)}:{String(selected.durationMin % 60).padStart(2, "0")}
                </span>

                <button
                  onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                  className="shrink-0 rounded-lg border px-2 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-accent"
                >
                  {speed}x
                </button>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
