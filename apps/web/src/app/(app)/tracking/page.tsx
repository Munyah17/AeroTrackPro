"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, MapPin, Navigation, Search, Star, X } from "lucide-react";
import { geofences, type Vehicle } from "@aerotrack/shared";
import { useFleet } from "@/hooks/use-fleet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleStatusChip } from "@/components/shared/status";
import { LIVE_STATUS, liveStatusOf, type LiveStatus } from "@/lib/live-status";
import { cn } from "@/lib/utils";
import { coords, kmh, mapLinks, timeAgo } from "@/lib/format";

const FleetMap = dynamic(() => import("@/components/map/fleet-map").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

type StatusFilter = "all" | LiveStatus;

function VehicleRow({
  vehicle,
  selected,
  onClick,
}: {
  vehicle: Vehicle;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors",
        selected ? "bg-primary/8 ring-1 ring-primary/30" : "hover:bg-accent/70",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          vehicle.status === "moving" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
        )}
      >
        <Navigation
          className="size-4 transition-transform"
          style={{ transform: `rotate(${vehicle.status === "moving" ? vehicle.position.course : 0}deg)` }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold">{vehicle.plate}</span>
          {vehicle.favourite && <Star className="size-3 shrink-0 fill-warning text-warning" />}
        </div>
        <div className="truncate text-[11.5px] text-muted-foreground">{vehicle.name}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <VehicleStatusChip status={vehicle.status} />
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
          {kmh(vehicle.position.speedKmh)}
        </span>
      </div>
    </button>
  );
}

/**
 * Compact summary card — the live-tracking control card. Shows only what a
 * dispatcher needs at a glance; full telemetry, driver, device, map links and
 * commands live on the vehicle detail page (opened via "Details").
 */
function VehicleSummary({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  return (
    <div className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-bold tracking-tight">{vehicle.plate}</h3>
            <VehicleStatusChip status={vehicle.status} />
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {vehicle.make} {vehicle.model} · {vehicle.name}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="-mr-1 -mt-1 size-7 shrink-0 rounded-lg" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-accent/60 px-2.5 py-2">
        <MapPin className="size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium leading-tight">
            {vehicle.position.address || coords(vehicle.position.lat, vehicle.position.lng)}
          </div>
          <div className="truncate text-[10.5px] text-muted-foreground">
            {timeAgo(vehicle.position.updatedAt)} · {coords(vehicle.position.lat, vehicle.position.lng)}
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {[
          { label: "Speed", value: kmh(vehicle.position.speedKmh) },
          { label: "Heading", value: `${vehicle.position.course}°` },
          { label: "Ignition", value: vehicle.ignition ? "On" : "Off" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border/60 py-1.5 text-center">
            <div className="text-[13.5px] font-bold tabular-nums leading-tight">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-1.5">
        <Button render={<a href={`/vehicles/${vehicle.id}`} />} size="sm" className="gap-1.5 rounded-xl text-[12.5px] shadow-card">
          Details &amp; trips <ChevronRight className="size-3.5" />
        </Button>
        <Button
          render={<a href={mapLinks.google(vehicle.position.lat, vehicle.position.lng)} target="_blank" rel="noreferrer" />}
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl text-[12.5px]"
        >
          <Navigation className="size-3.5" /> Navigate
        </Button>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  const { vehicles, trails } = useFleet();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  // Keep the control card present on desktop: select the first vehicle as
  // soon as the fleet is available (mock or live), and heal a stale selection
  // if the fleet swaps from mock to live rows.
  useEffect(() => {
    if (vehicles.length === 0) return;
    if (!selectedId || !vehicles.some((v) => v.id === selectedId)) {
      setSelectedId(vehicles[0]!.id);
    }
  }, [vehicles, selectedId]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (filter !== "all" && liveStatusOf(v.status) !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          v.plate.toLowerCase().includes(q) ||
          v.name.toLowerCase().includes(q) ||
          v.position.address.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vehicles, query, filter]);

  const selected = vehicles.find((v) => v.id === selectedId);
  const trail = selectedId ? trails[selectedId] : undefined;

  const selectVehicle = (id: string) => setSelectedId(id);

  return (
    <div className="relative h-[calc(100dvh-64px)] overflow-hidden">
      <FleetMap
        vehicles={filtered}
        selectedId={selectedId}
        onSelect={selectVehicle}
        geofences={geofences}
        path={trail && trail.length > 1 ? trail : undefined}
        fit
      />

      {/* Floating vehicle list (desktop) */}
      <div className="absolute left-4 top-4 z-10 hidden max-h-[calc(100%-2rem)] w-[300px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-float backdrop-blur-xl md:flex">
        <div className="border-b border-border/60 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vehicles..."
              className="h-9 rounded-xl border-border/70 bg-background pl-9 text-[13px]"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)} className="mt-2.5">
            <TabsList className="grid h-8 w-full grid-cols-4 rounded-lg p-0.5">
              {(["all", "online", "sleeping", "offline"] as const).map((f) => (
                <TabsTrigger key={f} value={f} className="rounded-md text-[10.5px] capitalize">
                  {f}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto p-2">
          {filtered.map((v) => (
            <VehicleRow key={v.id} vehicle={v} selected={v.id === selectedId} onClick={() => selectVehicle(v.id)} />
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-[13px] text-muted-foreground">No vehicles match.</div>
          )}
        </div>
        <div className="border-t border-border/60 px-4 py-2.5 text-[11.5px] text-muted-foreground">
          {filtered.length} of {vehicles.length} vehicles
        </div>
      </div>

      {/* Vehicle chip scroller (mobile) */}
      <div className="absolute inset-x-0 top-3 z-10 md:hidden">
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 pb-1">
          {filtered.map((v) => (
            <button
              key={v.id}
              onClick={() => selectVehicle(v.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold shadow-card backdrop-blur-xl transition-colors",
                v.id === selectedId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card/95 text-foreground",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  LIVE_STATUS[liveStatusOf(v.status)].dot,
                  v.id === selectedId && "bg-primary-foreground",
                )}
              />
              {v.plate}
            </button>
          ))}
        </div>
      </div>

      {/* Summary card — desktop (top-right) */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="absolute right-4 top-4 z-10 hidden w-[300px] rounded-2xl border border-border/60 bg-card/95 shadow-float backdrop-blur-xl md:block"
          >
            <VehicleSummary vehicle={selected} onClose={() => setSelectedId(undefined)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary card — mobile (bottom sheet, compact) */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={`sheet-${selected.id}`}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="absolute inset-x-2 bottom-2 z-20 rounded-2xl border border-border/60 bg-card/95 shadow-float backdrop-blur-xl md:hidden"
          >
            <VehicleSummary vehicle={selected} onClose={() => setSelectedId(undefined)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map legend */}
      <div className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-4 rounded-full border border-border/60 bg-card/90 px-4 py-2 shadow-float backdrop-blur-xl md:flex">
        {(["online", "sleeping", "offline"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
            <span className={cn("size-2 rounded-full", LIVE_STATUS[s].dot)} /> {LIVE_STATUS[s].label}
          </span>
        ))}
      </div>
    </div>
  );
}
