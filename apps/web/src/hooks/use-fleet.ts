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
  /* Online = the device is powered and communicating (any frame, incl.
     invalid GPS fixes). Fall back to position age when no device is bound. */
  const commAgeMs = device?.last_seen_at
    ? Date.now() - new Date(device.last_seen_at).getTime()
    : ageMs;
  const status: Vehicle["status"] =
    commAgeMs > 15 * 60_000 ? "offline" : speed > 3 ? "moving" : speed > 0 ? "idle" : "stopped";

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
    deviceId: row.device_id ?? undefined,
    imei: device?.imei ?? "",
    simMsisdn: device?.phone_number ?? device?.sim_number ?? "",
    deviceName: device?.name ?? "",
    deviceProtocol: device?.protocol ?? "",
    lastSeenAt: device?.last_seen_at ?? undefined,
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
    engineHours: (device?.engine_hours_min ?? 0) / 60,
    fuelCapacityL: Number(row.fuel_capacity_liters ?? 0) || undefined,
    fuelLevelPct: device?.last_fuel_level != null ? Number(device.last_fuel_level) : undefined,
    gsmSignal: device?.signal_strength ?? 80,
    satellites: 10,
    /* ACC state from the device status word; fall back to motion when the
       tracker doesn't report it. */
    ignition: device?.ignition ?? speed > 0,
    blocked: device?.engine_cut ?? false,
    sleeping: device?.connection_status === "sleeping" || undefined,
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
  /** Device ids shared INTO this tenant by another account (binding). */
  sharedDeviceIds: Set<string>;
} {
  const [fleet, setFleet] = useState<Vehicle[]>(cachedFleet);
  const [live, setLive] = useState(cachedFleet.length > 0);
  const [trails, setTrails] = useState<Record<string, [number, number][]>>({});
  const [sharedDeviceIds, setSharedDeviceIds] = useState<Set<string>>(new Set());
  const refreshTick = useLiveRefreshTick();
  const rowsRef = useRef<Map<string, VehicleRow>>(new Map());
  const positionsRef = useRef<Map<string, PositionRow>>(new Map());
  const devicesRef = useRef<Map<string, DeviceRow>>(new Map());
  /* Newest fix timestamp seen — the fallback poll asks the API only for
     positions strictly newer than this, so it stays cheap. */
  const newestFixRef = useRef("");

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

        const { data: myTenant } = await supabase.rpc("auth_tenant_id");
        const [{ data: vehicleRows, error: vErr }, { data: positionRows, error: pErr }, { data: deviceRows }, { data: shareRows }] =
          await Promise.all([
            supabase.from("vehicles").select("*").limit(500),
            supabase
              .from("positions")
              .select("*")
              .order("recorded_at", { ascending: false })
              .limit(2000),
            supabase.from("devices").select("*").limit(500),
            /* Incoming bindings — devices other tenants shared with us. */
            supabase
              .from("device_shares")
              .select("device_id")
              .eq("to_tenant_id", (myTenant as string | null) ?? ""),
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
        devicesRef.current = devicesById;
        positionsRef.current = latest;
        const deviceFor = (r: VehicleRow) =>
          r.device_id ? devicesRef.current.get(r.device_id) : undefined;
        rowsRef.current = new Map(vehicleRows.map((r) => [r.id, r]));
        for (const p of latest.values()) {
          if (p.recorded_at > newestFixRef.current) newestFixRef.current = p.recorded_at;
        }
        setSharedDeviceIds(new Set((shareRows ?? []).map((s) => s.device_id)));
        const fresh = vehicleRows.map((r) => toDomainVehicle(r, latest.get(r.id), deviceFor(r)));
        cachedFleet = fresh;
        setFleet(fresh);
        setLive(true);

        /* Seed trails from the positions we just fetched (last ~2000 fixes)
           so the map shows each vehicle's recent path immediately instead
           of waiting for the next live INSERT. */
        const byVehicle = new Map<string, PositionRow[]>();
        for (const p of positionRows ?? []) {
          if (!p.vehicle_id) continue;
          const arr = byVehicle.get(p.vehicle_id) ?? [];
          arr.push(p);
          byVehicle.set(p.vehicle_id, arr);
        }
        const seeded: Record<string, [number, number][]> = {};
        for (const [vid, rows] of byVehicle) {
          rows.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
          seeded[vid] = rows
            .slice(-TRAIL_MAX_POINTS)
            .map((p) => [Number(p.lng), Number(p.lat)] as [number, number]);
        }
        setTrails(seeded);

        /** Apply one fix: update the latest-position map, extend the trail,
            repaint the vehicle card. Shared by realtime + fallback poll. */
        const applyPosition = (pos: PositionRow) => {
          if (!pos.vehicle_id) return;
          if (pos.recorded_at > newestFixRef.current) newestFixRef.current = pos.recorded_at;
          positionsRef.current.set(pos.vehicle_id, pos);
          const row = rowsRef.current.get(pos.vehicle_id);
          if (!row) return;
          appendTrail(pos.vehicle_id, Number(pos.lng), Number(pos.lat));
          setFleet((f) =>
            f.map((v) =>
              v.id === pos.vehicle_id ? toDomainVehicle(row, pos, deviceFor(row)) : v,
            ),
          );
        };

        /* The ingest service mirrors each fix onto devices.last_* — so a
           devices UPDATE already carries the newest coordinates. Synthesize
           a position from it when it's newer than what we hold; this makes
           markers move even if a positions INSERT event was missed. */
        const applyDevice = (d: DeviceRow) => {
          devicesRef.current.set(d.id, d);
          for (const [vid, row] of rowsRef.current) {
            if (row.device_id !== d.id) continue;
            if (
              d.last_lat != null &&
              d.last_lng != null &&
              d.last_position_at != null &&
              d.last_position_at > (positionsRef.current.get(vid)?.recorded_at ?? "")
            ) {
              applyPosition({
                ...positionsRef.current.get(vid),
                id: `dev-${d.id}-${d.last_position_at}`,
                tenant_id: d.tenant_id,
                device_id: d.id,
                vehicle_id: vid,
                lat: d.last_lat,
                lng: d.last_lng,
                speed_kmh: d.last_speed_kmh ?? 0,
                course: d.last_course ?? 0,
                recorded_at: d.last_position_at,
              } as PositionRow);
              continue;
            }
            setFleet((f) =>
              f.map((v) =>
                v.id === vid
                  ? toDomainVehicle(row, positionsRef.current.get(vid), d)
                  : v,
              ),
            );
          }
        };

        const channel = supabase
          .channel("fleet-positions")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "positions" },
            (payload) => applyPosition(payload.new as PositionRow),
          )
          /* Devices report every frame (incl. invalid fixes) — refresh
             Online/Offline/Sleeping live without a position INSERT. */
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "devices" },
            (payload) => applyDevice(payload.new as DeviceRow),
          )
          .subscribe();

        /* Fallback poll: realtime websockets can silently drop behind
           proxies or tab throttling. Re-checking every 15s bounds map
           staleness without hammering the API — the positions query only
           fetches fixes newer than the newest one already applied. */
        const poll = async () => {
          try {
            const [devs, poss] = await Promise.all([
              supabase.from("devices").select("*").limit(500),
              supabase
                .from("positions")
                .select("*")
                .gt("recorded_at", newestFixRef.current || "1970-01-01T00:00:00Z")
                .order("recorded_at", { ascending: false })
                .limit(2000),
            ]);
            if (cancelled) return;
            for (const d of devs.data ?? []) applyDevice(d);
            for (const p of poss.data ?? []) applyPosition(p);
          } catch {
            /* transient fetch failure — realtime may still be flowing */
          }
        };
        const pollTimer = setInterval(() => void poll(), 15_000);
        /* Tab refocus → immediate catch-up instead of waiting for the tick. */
        const onVisible = () => {
          if (document.visibilityState === "visible") void poll();
        };
        document.addEventListener("visibilitychange", onVisible);

        cleanup = () => {
          clearInterval(pollTimer);
          document.removeEventListener("visibilitychange", onVisible);
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

  return { vehicles: fleet, live, trails, sharedDeviceIds };
}
