"use client";

import { useEffect, useRef, useState } from "react";
import {
  vehicles as mockVehicles,
  type Database,
  type Vehicle,
} from "@aerotrack/shared";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type PositionRow = Database["public"]["Tables"]["positions"]["Row"];

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Maps a DB vehicle + latest position into the UI's domain Vehicle. */
function toDomainVehicle(row: VehicleRow, position: PositionRow | undefined): Vehicle {
  const speed = Number(position?.speed_kmh ?? 0);
  const ageMs = position ? Date.now() - new Date(position.recorded_at).getTime() : Infinity;
  const status: Vehicle["status"] =
    ageMs > 15 * 60_000 ? "offline" : speed > 3 ? "moving" : speed > 0 ? "idle" : "stopped";

  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    plate: row.plate,
    kind: "car",
    make: row.make ?? "",
    model: row.model ?? "",
    year: row.year ?? 0,
    color: row.color ?? "#1E40FF",
    status,
    deviceModelId: "",
    imei: "",
    simMsisdn: "",
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
    gsmSignal: 80,
    satellites: 10,
    ignition: speed > 0,
    blocked: false,
    healthScore: 90,
  };
}

/** Nudges mock vehicles along their course so demo mode feels live. */
function simulateTick(fleet: Vehicle[]): Vehicle[] {
  return fleet.map((v) => {
    if (v.status !== "moving") return v;
    const meters = (v.position.speedKmh / 3.6) * 3;
    const rad = (v.position.course * Math.PI) / 180;
    const dLat = (meters * Math.cos(rad)) / 111_320;
    const dLng = (meters * Math.sin(rad)) / (111_320 * Math.cos((v.position.lat * Math.PI) / 180));
    const course = (v.position.course + (Math.random() - 0.5) * 8 + 360) % 360;
    return {
      ...v,
      position: {
        ...v.position,
        lat: v.position.lat + dLat,
        lng: v.position.lng + dLng,
        course,
        updatedAt: new Date().toISOString(),
      },
    };
  });
}

/**
 * Fleet with live positions.
 *
 * With Supabase configured and reachable: loads vehicles + latest positions
 * through RLS, then applies realtime position INSERTs as they stream in.
 * Otherwise: serves the mock fleet with simulated movement.
 */
export function useFleet(): { vehicles: Vehicle[]; live: boolean } {
  const [fleet, setFleet] = useState<Vehicle[]>(mockVehicles);
  const [live, setLive] = useState(false);
  const rowsRef = useRef<Map<string, VehicleRow>>(new Map());

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    let simTimer: ReturnType<typeof setInterval> | undefined;

    const startSimulation = () => {
      simTimer = setInterval(() => setFleet((f) => simulateTick(f)), 3000);
    };

    const startLive = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");

        const [{ data: vehicleRows, error: vErr }, { data: positionRows, error: pErr }] =
          await Promise.all([
            supabase.from("vehicles").select("*").limit(500),
            supabase
              .from("positions")
              .select("*")
              .order("recorded_at", { ascending: false })
              .limit(2000),
          ]);

        if (cancelled) return;
        if (vErr || pErr || !vehicleRows?.length) {
          startSimulation();
          return;
        }

        const latest = new Map<string, PositionRow>();
        for (const p of positionRows ?? []) {
          if (p.vehicle_id && !latest.has(p.vehicle_id)) latest.set(p.vehicle_id, p);
        }
        rowsRef.current = new Map(vehicleRows.map((r) => [r.id, r]));
        setFleet(vehicleRows.map((r) => toDomainVehicle(r, latest.get(r.id))));
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
              setFleet((f) =>
                f.map((v) => (v.id === pos.vehicle_id ? toDomainVehicle(row, pos) : v)),
              );
            },
          )
          .subscribe();

        cleanup = () => {
          void supabase.removeChannel(channel);
        };
      } catch {
        if (!cancelled) startSimulation();
      }
    };

    if (isConfigured) {
      void startLive();
    } else {
      startSimulation();
    }

    return () => {
      cancelled = true;
      cleanup?.();
      if (simTimer) clearInterval(simTimer);
    };
  }, []);

  return { vehicles: fleet, live };
}
