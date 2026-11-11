import type { Vehicle, VehicleStatus } from "@aerotrack/shared";

/**
 * The live states shown to operators. Granular internal statuses
 * (moving/idle/stopped/parked/offline) collapse into exactly one of these.
 *  - online   → device reporting and active (green)
 *  - sleeping → device reporting but stationary / engine off (orange)
 *  - offline  → device not reporting (red)
 */
export type LiveStatus = "online" | "sleeping" | "offline";

export function liveStatusOf(status: VehicleStatus): LiveStatus {
  if (status === "offline") return "offline";
  if (status === "moving" || status === "idle") return "online";
  return "sleeping"; // stopped, parked
}

export function vehicleLiveStatus(vehicle: Vehicle): LiveStatus {
  return liveStatusOf(vehicle.status);
}

/**
 * Canonical live status from raw signals — the single source of truth for
 * any device/vehicle row. Mirrors toDomainVehicle's status derivation:
 *   no fix in 15 min → offline; moving/idle (speed > 0) → online;
 *   stopped/parked (speed 0) → sleeping.
 */
export function liveStatusFromSignals(
  lastSeenAt: string | null | undefined,
  speedKmh: number,
): LiveStatus {
  const age = lastSeenAt ? Date.now() - new Date(lastSeenAt).getTime() : Infinity;
  if (age > 15 * 60_000) return "offline";
  return speedKmh > 0 ? "online" : "sleeping";
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
