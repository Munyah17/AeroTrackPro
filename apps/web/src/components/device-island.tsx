"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ChevronRight,
  ChevronUp,
  Clock,
  Gauge,
  Hash,
  MapPin,
  ShieldAlert,
  Signal,
  Timer,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Vehicle } from "@aerotrack/shared";
import { vehicleLiveStatus, LIVE_STATUS, type LiveStatus } from "@/lib/live-status";
import { kmh, timeAgo } from "@/lib/format";
import { usePlaceName } from "@/lib/geocode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Summary cards show the assigned vehicle name — tracker model/IMEI are
 *  configuration details, not live-tracking labels. */
function displayName(v: Vehicle): string {
  return v.name || v.plate;
}

const STATUS_TILE_TONE: Record<LiveStatus, string> = {
  online: "bg-emerald-400/15 text-emerald-300",
  sleeping: "bg-amber-400/15 text-amber-300",
  offline: "bg-rose-400/15 text-rose-300",
};

function IslandTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-3">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-lg",
            tone ?? "bg-white/10 text-white/70",
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="truncate text-[10.5px] font-medium text-white/45">{label}</span>
      </div>
      <div className="mt-1.5 truncate text-[15px] font-bold leading-tight">{value}</div>
    </div>
  );
}

/**
 * Dynamic-island style device summary — a compact black pill pinned to the
 * top-center of the screen. Collapsed it shows the device name + live status;
 * tap to expand into the full tracker summary.
 */
export function DeviceIsland({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const status: LiveStatus = vehicle ? vehicleLiveStatus(vehicle) : "online";
  const placeName = usePlaceName(vehicle?.position.lat ?? 0, vehicle?.position.lng ?? 0);

  /* Selecting a device pops the island open immediately — the full summary
     is what the user asked to see, not just the collapsed pill. */
  useEffect(() => {
    if (vehicle?.id) setExpanded(true);
  }, [vehicle?.id]);

  return (
    /* Center via flexbox on a fixed wrapper — putting -translate-x-1/2 on the
       motion.div itself gets overwritten by framer-motion's inline transform
       and pushes the island off the right edge. */
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center px-3">
      <AnimatePresence>
        {vehicle && (
          <motion.div
            key="device-island"
            initial={{ opacity: 0, y: -28, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -28, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto w-max max-w-full"
          >
          <div
            className={cn(
              "overflow-hidden bg-neutral-950 text-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.55)] ring-1 ring-white/10 transition-[border-radius,width] duration-300",
              expanded ? "w-[min(92vw,430px)] rounded-3xl" : "rounded-full",
            )}
          >
            {/* Collapsed pill — tap to expand */}
            <button
              onClick={() => setExpanded((e) => !e)}
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2.5 text-left",
                expanded && "border-b border-white/10",
              )}
            >
              <span className={cn("size-2.5 shrink-0 rounded-full", LIVE_STATUS[vehicleLiveStatus(vehicle)].dot)} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                {vehicle ? displayName(vehicle) : ""}
              </span>
              <span className="shrink-0 text-[11px] font-medium text-white/50">{vehicle?.plate}</span>
              <ChevronUp
                className={cn("size-4 shrink-0 text-white/50 transition-transform duration-300", expanded && "rotate-180")}
              />
            </button>

            {/* Expanded summary */}
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1">
                    {/* Header — device name + model/plate/status subtitle */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-bold leading-tight">
                          {displayName(vehicle)}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-white/45">
                          {vehicle.plate} · {LIVE_STATUS[status].label}
                        </div>
                      </div>
                      <button
                        onClick={onClose}
                        aria-label="Close device summary"
                        className="shrink-0 rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    {/* Stat tiles — 2-column grid, icon chip + label over a bold value */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <IslandTile
                        icon={Activity}
                        label="Status"
                        value={LIVE_STATUS[status].label}
                        tone={STATUS_TILE_TONE[status]}
                      />
                      <IslandTile icon={Gauge} label="Speed" value={kmh(vehicle.position.speedKmh)} />
                      <IslandTile
                        icon={Signal}
                        label="Signal"
                        value={vehicle.gsmSignal ? `${vehicle.gsmSignal}%` : "—"}
                      />
                      <IslandTile
                        icon={Zap}
                        label="Ignition"
                        value={vehicle.ignition ? "On" : "Off"}
                      />
                      <IslandTile
                        icon={Timer}
                        label="Engine hrs"
                        value={vehicle.engineHours > 0 ? `${vehicle.engineHours.toFixed(1)} h` : "—"}
                      />
                      <IslandTile
                        icon={Clock}
                        label="Last seen"
                        value={vehicle.lastSeenAt ? timeAgo(vehicle.lastSeenAt) : "—"}
                      />
                      <IslandTile icon={Hash} label="Tracker ID" value={vehicle.imei} />
                      {vehicle.blocked && (
                        <IslandTile
                          icon={ShieldAlert}
                          label="Immobilizer"
                          value="Engine cut"
                          tone="bg-rose-400/15 text-rose-300"
                        />
                      )}
                    </div>

                    {/* Location strip */}
                    <div className="mt-2 flex items-center gap-2.5 rounded-2xl bg-white/5 px-3 py-2.5">
                      <MapPin className="size-4 shrink-0 text-sky-400" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium leading-tight text-white/90">
                          {placeName ??
                            (vehicle.position.lat !== 0 || vehicle.position.lng !== 0
                              ? "Location unavailable"
                              : "No GPS fix yet")}
                        </div>
                        <div className="truncate text-[10.5px] text-white/40">
                          {vehicle.position.speedKmh > 0 ? `${kmh(vehicle.position.speedKmh)} · ` : "Stationary · "}
                          {timeAgo(vehicle.position.updatedAt)}
                        </div>
                      </div>
                    </div>

                    <Button
                      render={<Link href={`/vehicles/${vehicle.id}`} />}
                      size="sm"
                      className="mt-3 h-10 w-full gap-1.5 rounded-xl bg-white text-[13px] font-semibold text-neutral-950 shadow-none hover:bg-white/90"
                    >
                      <ChevronRight className="size-4" /> View Details
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
