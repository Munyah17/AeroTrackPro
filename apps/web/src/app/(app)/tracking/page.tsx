"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  Battery,
  ChevronRight,
  Copy,
  Fuel,
  Gauge,
  Lock,
  MapPin,
  Navigation,
  Satellite,
  Search,
  Share2,
  Signal,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { geofences, vehicles, driverById, type Vehicle } from "@aerotrack/shared";
import { getDeviceModel } from "@aerotrack/protocols";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleStatusChip } from "@/components/shared/status";
import { cn } from "@/lib/utils";
import { coords, kmh, mapLinks, timeAgo } from "@/lib/format";

const FleetMap = dynamic(() => import("@/components/map/fleet-map").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

type StatusFilter = "all" | "moving" | "stopped" | "idle" | "offline";

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

function DetailRow({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="ml-auto text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export default function TrackingPage() {
  const [selectedId, setSelectedId] = useState<string | undefined>(vehicles[0]?.id);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (filter !== "all") {
        if (filter === "stopped" && !["stopped", "parked"].includes(v.status)) return false;
        if (filter !== "stopped" && v.status !== filter) return false;
      }
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
  }, [query, filter]);

  const selected = vehicles.find((v) => v.id === selectedId);
  const driver = driverById(selected?.driverId);
  const device = selected ? getDeviceModel(selected.deviceModelId) : undefined;

  const copyCoords = () => {
    if (!selected) return;
    navigator.clipboard.writeText(coords(selected.position.lat, selected.position.lng));
    toast.success("Coordinates copied to clipboard");
  };
  const share = () => {
    if (!selected) return;
    navigator.clipboard.writeText(mapLinks.google(selected.position.lat, selected.position.lng));
    toast.success("Share link copied — opens in Google Maps");
  };

  return (
    <div className="relative h-[calc(100dvh-64px)] overflow-hidden">
      <FleetMap vehicles={filtered} selectedId={selectedId} onSelect={setSelectedId} geofences={geofences} fit />

      {/* Floating vehicle list */}
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
            <TabsList className="grid h-8 w-full grid-cols-5 rounded-lg p-0.5">
              {(["all", "moving", "stopped", "idle", "offline"] as const).map((f) => (
                <TabsTrigger key={f} value={f} className="rounded-md text-[10.5px] capitalize">
                  {f}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto p-2">
          {filtered.map((v) => (
            <VehicleRow key={v.id} vehicle={v} selected={v.id === selectedId} onClick={() => setSelectedId(v.id)} />
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-[13px] text-muted-foreground">No vehicles match.</div>
          )}
        </div>
        <div className="border-t border-border/60 px-4 py-2.5 text-[11.5px] text-muted-foreground">
          {filtered.length} of {vehicles.length} vehicles
        </div>
      </div>

      {/* Floating detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="absolute right-4 top-4 z-10 max-h-[calc(100%-2rem)] w-[320px] overflow-y-auto rounded-2xl border border-border/60 bg-card/95 shadow-float backdrop-blur-xl scrollbar-thin"
          >
            <div className="flex items-start justify-between p-4 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold tracking-tight">{selected.plate}</h3>
                  <VehicleStatusChip status={selected.status} />
                </div>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {selected.make} {selected.model} · {selected.name}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="size-7 rounded-lg" onClick={() => setSelectedId(undefined)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="px-4">
              <div className="flex items-start gap-2 rounded-xl bg-accent/60 p-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium leading-snug">{selected.position.address}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {coords(selected.position.lat, selected.position.lng)} · {timeAgo(selected.position.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Speed", value: kmh(selected.position.speedKmh) },
                  { label: "Heading", value: `${selected.position.course}°` },
                  { label: "Ignition", value: selected.ignition ? "On" : "Off" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border/60 p-2.5 text-center">
                    <div className="text-[15px] font-bold tabular-nums">{s.value}</div>
                    <div className="text-[10.5px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-border/60 px-3 py-1.5">
                <DetailRow icon={Gauge} label="Odometer" value={`${selected.odometerKm.toLocaleString()} km`} />
                {selected.fuelLevelPct !== undefined && (
                  <DetailRow icon={Fuel} label="Fuel level" value={`${selected.fuelLevelPct}%`} />
                )}
                {selected.batteryVoltage !== undefined && (
                  <DetailRow icon={Battery} label="Battery" value={`${selected.batteryVoltage} V`} />
                )}
                <DetailRow icon={Signal} label="GSM signal" value={`${selected.gsmSignal}%`} />
                <DetailRow icon={Satellite} label="Satellites" value={selected.satellites} />
              </div>

              {(driver || device) && (
                <div className="mt-3 space-y-1.5 text-[12.5px]">
                  {driver && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Driver</span>
                      <span className="font-medium">{driver.name}</span>
                    </div>
                  )}
                  {device && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Device</span>
                      <span className="font-medium">
                        {device.vendor} {device.model}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* External map links — deep links only, no SDKs */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  render={<a href={mapLinks.google(selected.position.lat, selected.position.lng)} target="_blank" rel="noreferrer" />}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-[11.5px]"
                >
                  Google Maps
                </Button>
                <Button
                  render={<a href={mapLinks.waze(selected.position.lat, selected.position.lng)} target="_blank" rel="noreferrer" />}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-[11.5px]"
                >
                  Waze
                </Button>
                <Button
                  render={<a href={mapLinks.apple(selected.position.lat, selected.position.lng)} target="_blank" rel="noreferrer" />}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-[11.5px]"
                >
                  Apple Maps
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" className="gap-1.5 rounded-xl text-[12px]" onClick={copyCoords}>
                  <Copy className="size-3.5" /> Copy Coords
                </Button>
                <Button variant="secondary" size="sm" className="gap-1.5 rounded-xl text-[12px]" onClick={share}>
                  <Share2 className="size-3.5" /> Share
                </Button>
              </div>

              <div className="my-4 space-y-2">
                <Button render={<a href={`/vehicles/${selected.id}`} />} className="w-full gap-2 rounded-xl shadow-card">
                  Vehicle details &amp; trips <ChevronRight className="size-4" />
                </Button>
                {getDeviceModel(selected.deviceModelId)?.capabilities.engineCut && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
                    onClick={() => toast.warning(`Immobilize command queued for ${selected.plate}`, {
                      description: "Requires confirmation in Commands center. Vehicle must be stationary.",
                    })}
                  >
                    <Lock className="size-4" /> Immobilize Engine
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map legend */}
      <div className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-4 rounded-full border border-border/60 bg-card/90 px-4 py-2 shadow-float backdrop-blur-xl md:flex">
        {[
          ["bg-success", "Moving"],
          ["bg-destructive", "Stopped"],
          ["bg-warning", "Idle"],
          ["bg-muted-foreground/60", "Offline"],
        ].map(([dot, label]) => (
          <span key={label} className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
            <span className={cn("size-2 rounded-full", dot)} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
