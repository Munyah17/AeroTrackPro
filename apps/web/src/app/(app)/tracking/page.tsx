"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  Battery,
  ChevronDown,
  ChevronRight,
  ChevronUp,
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
import { geofences, driverById, type Vehicle } from "@aerotrack/shared";
import { getDeviceModel } from "@aerotrack/protocols";
import { useFleet } from "@/hooks/use-fleet";
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

/** Full detail body, shared by the desktop panel and the mobile sheet. */
function VehicleDetail({ vehicle, compact }: { vehicle: Vehicle; compact?: boolean }) {
  const driver = driverById(vehicle.driverId);
  const device = getDeviceModel(vehicle.deviceModelId);

  const copyCoords = () => {
    navigator.clipboard.writeText(coords(vehicle.position.lat, vehicle.position.lng));
    toast.success("Coordinates copied to clipboard");
  };
  const share = () => {
    navigator.clipboard.writeText(mapLinks.google(vehicle.position.lat, vehicle.position.lng));
    toast.success("Share link copied — opens in Google Maps");
  };

  return (
    <div className={compact ? "px-4 pb-4" : "px-4"}>
      <div className="flex items-start gap-2 rounded-xl bg-accent/60 p-3">
        <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="text-[13px] font-medium leading-snug">
            {vehicle.position.address || coords(vehicle.position.lat, vehicle.position.lng)}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {coords(vehicle.position.lat, vehicle.position.lng)} · {timeAgo(vehicle.position.updatedAt)}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "Speed", value: kmh(vehicle.position.speedKmh) },
          { label: "Heading", value: `${vehicle.position.course}°` },
          { label: "Ignition", value: vehicle.ignition ? "On" : "Off" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/60 p-2.5 text-center">
            <div className="text-[15px] font-bold tabular-nums">{s.value}</div>
            <div className="text-[10.5px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-border/60 px-3 py-1.5">
        <DetailRow icon={Gauge} label="Odometer" value={`${vehicle.odometerKm.toLocaleString()} km`} />
        {vehicle.fuelLevelPct !== undefined && (
          <DetailRow icon={Fuel} label="Fuel level" value={`${vehicle.fuelLevelPct}%`} />
        )}
        {vehicle.batteryVoltage !== undefined && (
          <DetailRow icon={Battery} label="Battery" value={`${vehicle.batteryVoltage} V`} />
        )}
        <DetailRow icon={Signal} label="GSM signal" value={`${vehicle.gsmSignal}%`} />
        <DetailRow icon={Satellite} label="Satellites" value={vehicle.satellites} />
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
          render={<a href={mapLinks.google(vehicle.position.lat, vehicle.position.lng)} target="_blank" rel="noreferrer" />}
          variant="outline"
          size="sm"
          className="rounded-xl text-[11.5px]"
        >
          Google Maps
        </Button>
        <Button
          render={<a href={mapLinks.waze(vehicle.position.lat, vehicle.position.lng)} target="_blank" rel="noreferrer" />}
          variant="outline"
          size="sm"
          className="rounded-xl text-[11.5px]"
        >
          Waze
        </Button>
        <Button
          render={<a href={mapLinks.apple(vehicle.position.lat, vehicle.position.lng)} target="_blank" rel="noreferrer" />}
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

      <div className="mt-4 space-y-2">
        <Button render={<a href={`/vehicles/${vehicle.id}`} />} className="w-full gap-2 rounded-xl shadow-card">
          Vehicle details &amp; trips <ChevronRight className="size-4" />
        </Button>
        {device?.capabilities.engineCut && (
          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={() =>
              toast.warning(`Immobilize command queued for ${vehicle.plate}`, {
                description: "Requires confirmation in Commands center. Vehicle must be stationary.",
              })
            }
          >
            <Lock className="size-4" /> Immobilize Engine
          </Button>
        )}
      </div>
    </div>
  );
}

export default function TrackingPage() {
  const { vehicles, trails } = useFleet();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sheetExpanded, setSheetExpanded] = useState(false);

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
  }, [vehicles, query, filter]);

  const selected = vehicles.find((v) => v.id === selectedId);
  const trail = selectedId ? trails[selectedId] : undefined;

  const selectVehicle = (id: string) => {
    setSelectedId(id);
    setSheetExpanded(false);
  };

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
                  v.status === "moving"
                    ? "bg-success"
                    : v.status === "idle"
                      ? "bg-warning"
                      : v.status === "offline"
                        ? "bg-muted-foreground/60"
                        : "bg-destructive",
                  v.id === selectedId && "bg-primary-foreground",
                )}
              />
              {v.plate}
            </button>
          ))}
        </div>
      </div>

      {/* Floating detail panel (desktop) */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="absolute right-4 top-4 z-10 hidden max-h-[calc(100%-2rem)] w-[320px] overflow-y-auto rounded-2xl border border-border/60 bg-card/95 pb-4 shadow-float backdrop-blur-xl scrollbar-thin md:block"
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
            <VehicleDetail vehicle={selected} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom sheet (mobile) — compact bar that expands on demand */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={`sheet-${selected.id}`}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="absolute inset-x-2 bottom-2 z-20 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-float backdrop-blur-xl md:hidden"
          >
            <button
              className="flex w-full items-center gap-3 px-4 py-3"
              onClick={() => setSheetExpanded((e) => !e)}
              aria-expanded={sheetExpanded}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  selected.status === "moving" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                <Navigation
                  className="size-4"
                  style={{ transform: `rotate(${selected.status === "moving" ? selected.position.course : 0}deg)` }}
                />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold">{selected.plate}</span>
                  <VehicleStatusChip status={selected.status} />
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {kmh(selected.position.speedKmh)} · {timeAgo(selected.position.updatedAt)}
                </div>
              </div>
              {sheetExpanded ? (
                <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronUp className="size-5 shrink-0 text-muted-foreground" />
              )}
            </button>
            <AnimatePresence initial={false}>
              {sheetExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="scrollbar-thin max-h-[55dvh] overflow-y-auto">
                    <VehicleDetail vehicle={selected} compact />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
