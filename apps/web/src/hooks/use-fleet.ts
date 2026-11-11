"use client";

import { useEffect, useRef, useState } from "react";
import { type AssetKind, type Database, type Vehicle } from "@aerotrack/shared";
import { useLiveRefreshTick } from "./use-live-data";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type PositionRow = Database["public"]["Tables"]["positions"]["Row"];
type DeviceRow = Database["public"]["Tables"]["devices"]["Row"];

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Maps a DB vehicle + latest position + bound device into the UI's domain Vehicle. */
function toDomainVehicle(
  row: VehicleRow,
  position: PositionRow | undefined,
  device: DeviceRow | undefined,
): Vehicle {
  const speed = Number(position?.speed_kmh ?? 0);
  const ageMs = position ? Date.now() - new Date(position.recorded_at).getTime() : Infinity;
  const status: Vehicle["status"] =
    ageMs > 15 * 60_000 ? "offline" : speed > 3 ? "moving" : speed > 0 ? "idle" : "stopped";

  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    plate: row.plate,
    kind: (row.kind as AssetKind | null) ?? "car",
    make: row.make ?? "",
    model: row.model ?? "",
    year: row.year ?? 0,
    color: row.color ?? "#1E40FF",
    status,
    deviceModelId: device?.device_model ?? "",
    imei: device?.imei ?? "",
    simMsisdn: device?.phone_number ?? device?.sim_number ?? "",
    driverId: row.driver_id ?? undefined,
    groupId: row.group_id ?? undefined,
    position: {
      lat: Number(position?.lat ?? 0),
      lng: Number(position?.lng ?? 0),
      speedKmh: speed,
      course: position?.course ?? 0,
      address: "",
      updatedAt: position?.recorded_at ?? new Date(0).toISOString(),
    },
    odometerKm: Number(row.odometer_km ?? 0),
    engineHours: 0,
    fuelCapacityL: Number(row.fuel_capacity_liters ?? 0) || undefined,
    gsmSignal: device?.signal_strength ?? 80,
    satellites: 10,
    ignition: speed > 0,
    blocked: false,
    healthScore: 90,
    insuranceExpiry: row.insurance_expiry ?? undefined,
    licenseExpiry: row.license_expiry ?? undefined,
  };
}

const TRAIL_MAX_POINTS = 240;

/* Last loaded fleet — revisiting the tracking page paints instantly while
   the live query revalidates. Cleared on sign-out via clearFleetCache(). */
let cachedFleet: Vehicle[] = [];

export function clearFleetCache() {
  cachedFleet = [];
}

/**
 * Fleet with live positions.
 *
 * Loads vehicles + latest positions through RLS, then applies realtime
 * position INSERTs as they stream in. An unreachable Supabase (or an
 * unsigned session) yields an empty fleet — never simulated rows.
 *
 * `trails` keeps the recent [lng,lat] breadcrumb per vehicle while the page
 * is open, so the map can draw a live motion trail for a monitored vehicle.
 */
export function useFleet(): {
  vehicles: Vehicle[];
  live: boolean;
  trails: Record<string, [number, number][]>;
} {
  const [fleet, setFleet] = useState<Vehicle[]>(cachedFleet);
  const [live, setLive] = useState(cachedFleet.length > 0);
  const [trails, setTrails] = useState<Record<string, [number, number][]>>({});
  const refreshTick = useLiveRefreshTick();
  const rowsRef = useRef<Map<string, VehicleRow>>(new Map());

  const appendTrail = (id: string, lng: number, lat: number) => {
    setTrails((t) => {
      const prev = t[id] ?? [];
      const last = prev[prev.length - 1];
      if (last && last[0] === lng && last[1] === lat) return t;
      return { ...t, [id]: [...prev.slice(-(TRAIL_MAX_POINTS - 1)), [lng, lat]] };
    });
  };

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const startLive = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");

        const [{ data: vehicleRows, error: vErr }, { data: positionRows, error: pErr }, { data: deviceRows }] =
          await Promise.all([
            supabase.from("vehicles").select("*").limit(500),
            supabase
              .from("positions")
              .select("*")
              .order("recorded_at", { ascending: false })
              .limit(2000),
            supabase.from("devices").select("*").limit(500),
          ]);

        if (cancelled) return;
        if (vErr || pErr) {
          setFleet([]);
          return;
        }
        if (!vehicleRows?.length) {
          setFleet([]);
          setLive(true);
          return;
        }

        const latest = new Map<string, PositionRow>();
        for (const p of positionRows ?? []) {
          if (p.vehicle_id && !latest.has(p.vehicle_id)) latest.set(p.vehicle_id, p);
        }
        const devicesById = new Map((deviceRows ?? []).map((d) => [d.id, d]));
        const deviceFor = (r: VehicleRow) =>
          r.device_id ? devicesById.get(r.device_id) : undefined;
        rowsRef.current = new Map(vehicleRows.map((r) => [r.id, r]));
        const fresh = vehicleRows.map((r) => toDomainVehicle(r, latest.get(r.id), deviceFor(r)));
        cachedFleet = fresh;
        setFleet(fresh);
        setLive(true);

        const channel = supabase
          .channel("fleet-positions")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "positions" },
            (payload) => {
              const pos = payload.new as PositionRow;
              if (!pos.vehicle_id) return;
              const row = rowsRef.current.get(pos.vehicle_id);
              if (!row) return;
              appendTrail(pos.vehicle_id, Number(pos.lng), Number(pos.lat));
              setFleet((f) =>
                f.map((v) =>
                  v.id === pos.vehicle_id ? toDomainVehicle(row, pos, deviceFor(row)) : v,
                ),
              );
            },
          )
          .subscribe();

        cleanup = () => {
          void supabase.removeChannel(channel);
        };
      } catch {
        /* leave the fleet empty — never simulate */
      }
    };

    if (isConfigured) void startLive();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [refreshTick]);

  return { vehicles: fleet, live, trails };
}
