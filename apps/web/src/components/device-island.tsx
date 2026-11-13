"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, MapPin, Navigation, X } from "lucide-react";
import { DEVICE_MODELS, getDeviceModel, type DeviceModel } from "@aerotrack/protocols";
import type { Vehicle } from "@aerotrack/shared";
import { vehicleLiveStatus, LIVE_STATUS } from "@/lib/live-status";
import { coords, kmh, timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function protocolLabel(v: Vehicle): string {
  if (v.deviceProtocol) return v.deviceProtocol.toUpperCase();
  return DEVICE_MODELS.find((d) => d.id === v.deviceModelId)?.protocol.toUpperCase() ?? "—";
}

function modelLabel(v: Vehicle): string {
  const m: DeviceModel | undefined = getDeviceModel(v.deviceModelId);
  return m ? `${m.vendor} ${m.model}` : "—";
}

function IslandRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[11px] text-white/50">{label}</span>
      <span className={cn("truncate text-[12px] font-medium text-white/90", mono && "font-mono")}>{value || "—"}</span>
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
                {vehicle.deviceName || vehicle.name}
              </span>
              <span className="shrink-0 text-[11px] font-medium text-white/50">{vehicle.plate}</span>
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/40">
                          {modelLabel(vehicle)}
                        </span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                          {LIVE_STATUS[vehicleLiveStatus(vehicle)].label}
                        </span>
                      </div>
                      <button
                        onClick={onClose}
                        aria-label="Close device summary"
                        className="rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="mt-2 divide-y divide-white/5 rounded-2xl bg-white/5 px-3.5">
                      <IslandRow label="Tracker ID" value={vehicle.imei} mono />
                      <IslandRow label="Protocol" value={protocolLabel(vehicle)} />
                      <IslandRow label="SIM / Phone" value={vehicle.simMsisdn} mono />
                      <IslandRow label="Signal" value={vehicle.gsmSignal ? `${vehicle.gsmSignal}%` : "—"} />
                      <IslandRow label="Last seen" value={vehicle.lastSeenAt ? timeAgo(vehicle.lastSeenAt) : "—"} />
                      <IslandRow
                        label="Last fix"
                        value={vehicle.position.lat !== 0 || vehicle.position.lng !== 0 ? timeAgo(vehicle.position.updatedAt) : "—"}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5 rounded-2xl bg-white/5 px-3 py-2.5">
                      <MapPin className="size-4 shrink-0 text-sky-400" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-medium leading-tight text-white/90">
                          {vehicle.position.lat !== 0 || vehicle.position.lng !== 0
                            ? coords(vehicle.position.lat, vehicle.position.lng)
                            : "No GPS fix yet"}
                        </div>
                        <div className="truncate text-[10.5px] text-white/40">
                          {vehicle.position.speedKmh > 0 ? `${kmh(vehicle.position.speedKmh)} · ` : "Stationary · "}
                          {vehicle.position.address || ""}
                        </div>
                      </div>
                    </div>

                    <Button
                      render={<Link href="/tracking" />}
                      size="sm"
                      className="mt-3 h-9 w-full gap-1.5 rounded-xl bg-white text-[12.5px] font-semibold text-neutral-950 shadow-none hover:bg-white/90"
                    >
                      <Navigation className="size-3.5" /> View on Live Tracking
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
