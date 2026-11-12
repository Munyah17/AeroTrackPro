import type { Vehicle, VehicleStatus } from "@aerotrack/shared";

/**
 * The live states shown to operators. Any device that is powered on, has
 * data and is reporting positions is Online — parked, stationary and
 * non-vehicle assets included (engine/ACC state is irrelevant).
 *  - online   → device reporting (green)
 *  - sleeping → operator manually commanded sleep mode (orange)
 *  - offline  → device not reporting (red)
 */
export type LiveStatus = "online" | "sleeping" | "offline";

export function liveStatusOf(status: VehicleStatus): LiveStatus {
  // Powered + reporting = Online, always. Only a silent device is Offline.
  return status === "offline" ? "offline" : "online";
}

export function vehicleLiveStatus(vehicle: Vehicle): LiveStatus {
  if (vehicle.status === "offline") return "offline";
  if (vehicle.sleeping) return "sleeping"; // operator commanded sleep mode
  return "online";
}

/**
 * Canonical live status from raw signals — the single source of truth for
 * any device/vehicle row. A device with a fresh fix is Online regardless of
 * speed or ignition; only >15 min of silence is Offline.
 */
export function liveStatusFromSignals(
  lastSeenAt: string | null | undefined,
  _speedKmh: number,
): LiveStatus {
  const age = lastSeenAt ? Date.now() - new Date(lastSeenAt).getTime() : Infinity;
  return age > 15 * 60_000 ? "offline" : "online";
}

export const LIVE_STATUS: Record<
  LiveStatus,
  { label: string; hex: string; dot: string; chip: string }
> = {
  online: {
    label: "Online",
    hex: "#059669",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  sleeping: {
    label: "Sleeping",
    hex: "#ea580c",
    dot: "bg-orange-500",
    chip: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  offline: {
    label: "Offline",
    hex: "#dc2626",
    dot: "bg-red-500",
    chip: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
};
