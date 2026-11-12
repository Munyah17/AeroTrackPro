"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { ChevronRight, ChevronsLeft, ChevronsRight, MapPin, Minus, Navigation, Plus, Search, Star, X } from "lucide-react";
import type { Vehicle } from "@aerotrack/shared";
import { useGeofences } from "@/hooks/use-live-data";
import { useFleet } from "@/hooks/use-fleet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleStatusChip } from "@/components/shared/status";
import { LIVE_STATUS, vehicleLiveStatus, type LiveStatus } from "@/lib/live-status";
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
        <VehicleStatusChip status={vehicle.status} sleeping={vehicle.sleeping} />
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
function VehicleSummary({
  vehicle,
  onClose,
  onMinimize,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  onMinimize?: () => void;
}) {
  return (
    <div className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-bold tracking-tight">{vehicle.plate}</h3>
            <VehicleStatusChip status={vehicle.status} sleeping={vehicle.sleeping} />
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {vehicle.deviceName && vehicle.deviceName !== vehicle.name
              ? `${vehicle.deviceName} · ${vehicle.name}`
              : vehicle.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {onMinimize && (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={onMinimize}
              aria-label="Minimize vehicle details"
              title="Minimize"
            >
              <Minus className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="-mr-1 -mt-1 size-9 rounded-lg" onClick={onClose} aria-label="Close vehicle details">
            <X className="size-4" />
          </Button>
        </div>
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

      <div className="mt-2.5 flex flex-col gap-1.5 min-[420px]:flex-row">
        <Button render={<a href={`/vehicles/${vehicle.id}`} />} size="sm" className="h-10 w-full min-w-0 flex-1 gap-1.5 rounded-xl text-[12.5px] shadow-card">
          Details &amp; trips <ChevronRight className="size-3.5" />
        </Button>
        <Button
          render={<a href={mapLinks.google(vehicle.position.lat, vehicle.position.lng)} target="_blank" rel="noreferrer" />}
          variant="outline"
          size="sm"
          className="h-10 w-full min-w-0 flex-1 gap-1.5 rounded-xl text-[12.5px]"
        >
          <Navigation className="size-3.5" /> Navigate
        </Button>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  const { vehicles, trails } = useFleet();
  const { rows: geofences } = useGeofences();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [isDesktop, setIsDesktop] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [detailCollapsed, setDetailCollapsed] = useState(false);
  const [sheetMinimized, setSheetMinimized] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // On a wide layout, keep a vehicle selected so the detail column is useful.
  // On a phone, leave the map clear until the person picks one.
  useEffect(() => {
    if (!isDesktop || vehicles.length === 0) return;
    if (!selectedId || !vehicles.some((v) => v.id === selectedId)) {
      setSelectedId(vehicles[0]!.id);
    }
  }, [isDesktop, vehicles, selectedId]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (filter !== "all" && vehicleLiveStatus(v) !== filter) return false;
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
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetDrag = useDragControls();

  useEffect(() => {
    const stage = stageRef.current;
    const sheet = sheetRef.current;
    if (!stage) return;
    if (!sheet) {
      stage.style.removeProperty("--overlay-offset");
      return;
    }
    const apply = () => stage.style.setProperty("--overlay-offset", `${sheet.offsetHeight + 12}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [selectedId, isDesktop]);

  const selectVehicle = (id: string) => {
    setSelectedId(id);
    setSheetMinimized(false);
    setDetailCollapsed(false);
  };

  const filters = (
    <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
      <TabsList className="grid h-8 w-full grid-cols-4 rounded-lg p-0.5">
        {(["all", "online", "sleeping", "offline"] as const).map((f) => (
          <TabsTrigger key={f} value={f} className="min-w-0 truncate rounded-md px-0.5 text-[10.5px] capitalize">
            {f}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const search = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search vehicles..."
        className="h-9 rounded-xl border-border/70 bg-background pl-9 text-[13px]"
      />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside
        className={cn(
          "hidden min-h-0 shrink-0 flex-col border-r border-border/60 bg-card transition-[width] duration-300 lg:flex",
          listCollapsed ? "w-14" : "w-[280px] xl:w-[300px]",
        )}
      >
        {listCollapsed ? (
          <div className="flex flex-1 flex-col items-center gap-3 py-3">
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl"
              onClick={() => setListCollapsed(false)}
              aria-label="Expand vehicle list"
              title="Show vehicle list"
            >
              <ChevronsRight className="size-4" />
            </Button>
            <div className="flex flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="tabular-nums text-[13px] font-bold text-foreground">{filtered.length}</span>
              <span className="[writing-mode:vertical-rl]">vehicles</span>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2.5 border-b border-border/60 p-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">{search}</div>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0 rounded-xl"
                  onClick={() => setListCollapsed(true)}
                  aria-label="Collapse vehicle list"
                  title="Hide vehicle list"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
              </div>
              {filters}
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
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
          </>
        )}
      </aside>

      <div
        ref={stageRef}
        data-sheet={selected && !isDesktop ? "open" : "closed"}
        className="tracking-stage relative min-h-0 min-w-0 flex-1"
      >
        <FleetMap
          vehicles={filtered}
          selectedId={selectedId}
          onSelect={selectVehicle}
          geofences={geofences}
          path={trail && trail.length > 1 ? trail : undefined}
          fit
        />

        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 max-w-full space-y-2 lg:hidden">
          <div className="pointer-events-auto px-2">{search}</div>
          <div className="pointer-events-auto px-2">{filters}</div>
          <div className="scrollbar-none pointer-events-auto flex max-w-full touch-pan-x gap-2 overflow-x-auto overscroll-x-contain px-2 pb-1">
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
                    LIVE_STATUS[vehicleLiveStatus(v)].dot,
                    v.id === selectedId && "bg-primary-foreground",
                  )}
                />
                {v.plate}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div
              ref={sheetRef}
              key={`sheet-${selected.id}`}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              drag="y"
              dragListener={false}
              dragControls={sheetDrag}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.45 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) setSelectedId(undefined);
              }}
              className="absolute inset-x-2 bottom-2 z-20 flex max-h-[48%] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-float backdrop-blur-xl lg:hidden"
            >
              {/* Grab handle — drag down to dismiss; content below stays scrollable */}
              <div
                role="button"
                aria-label="Drag down to close"
                onPointerDown={(e) => sheetDrag.start(e)}
                className="flex shrink-0 cursor-grab touch-none items-center justify-center py-2 active:cursor-grabbing"
              >
                <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              {sheetMinimized ? (
                <div className="flex shrink-0 items-center gap-2.5 px-3.5 pb-3">
                  <span className={cn("size-2.5 shrink-0 rounded-full", LIVE_STATUS[vehicleLiveStatus(selected)].dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold leading-tight">{selected.plate}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {kmh(selected.position.speedKmh)} · {timeAgo(selected.position.updatedAt)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 rounded-xl"
                    onClick={() => setSheetMinimized(false)}
                    aria-label="Expand vehicle details"
                    title="Show details"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <VehicleSummary
                    vehicle={selected}
                    onClose={() => setSelectedId(undefined)}
                    onMinimize={() => setSheetMinimized(true)}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-4 rounded-full border border-border/60 bg-card/90 px-4 py-2 shadow-float backdrop-blur-xl xl:flex">
          {(["online", "sleeping", "offline"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
              <span className={cn("size-2 rounded-full", LIVE_STATUS[s].dot)} /> {LIVE_STATUS[s].label}
            </span>
          ))}
        </div>
      </div>

      <aside
        className={cn(
          "hidden min-h-0 shrink-0 flex-col border-l border-border/60 bg-card transition-[width] duration-300 lg:flex",
          detailCollapsed ? "w-14" : "w-[250px] xl:w-[300px]",
        )}
      >
        {detailCollapsed && selected ? (
          <div className="flex flex-1 flex-col items-center gap-3 py-3">
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl"
              onClick={() => setDetailCollapsed(false)}
              aria-label="Expand vehicle details"
              title="Show vehicle details"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <button
              onClick={() => setDetailCollapsed(false)}
              className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition-colors hover:bg-accent/70"
              title={`${selected.plate} — show details`}
            >
              <span className={cn("size-2.5 rounded-full", LIVE_STATUS[vehicleLiveStatus(selected)].dot)} />
              <span className="max-w-full truncate text-[10px] font-bold leading-tight">{selected.plate}</span>
              <span className="text-[9.5px] text-muted-foreground tabular-nums">{kmh(selected.position.speedKmh)}</span>
            </button>
          </div>
        ) : selected ? (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            <VehicleSummary
              vehicle={selected}
              onClose={() => setSelectedId(undefined)}
              onMinimize={() => setDetailCollapsed(true)}
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-[13px] text-muted-foreground">
            Select a vehicle to see where it is.
          </div>
        )}
      </aside>
    </div>
  );
}
