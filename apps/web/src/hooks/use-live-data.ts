"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Database,
  type DeviceHealth,
  type Driver,
  type FleetAlert,
  type FuelRecord,
  type Geofence,
  type MaintenanceItem,
  type Trip,
  type VehicleGroup,
} from "@aerotrack/shared";

type Tables = Database["public"]["Tables"];
type TableName = keyof Tables;
type Row<T extends TableName> = Tables[T]["Row"];
type InsertRow<T extends TableName> = Tables[T]["Insert"];
type UpdateRow<T extends TableName> = Tables[T]["Update"];

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Global "hard refresh" — topbar button dispatches this; every live-data
 *  hook re-runs its query. Cached rows stay visible while revalidating. */
export const LIVE_REFRESH_EVENT = "aerotrack:live-refresh";

export function refreshAllLiveData() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LIVE_REFRESH_EVENT));
  }
}

/** Subscribe a component to global refresh events; returns a bump counter. */
export function useLiveRefreshTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onRefresh = () => setTick((t) => t + 1);
    window.addEventListener(LIVE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(LIVE_REFRESH_EVENT, onRefresh);
  }, []);
  return tick;
}

type SupabaseClient = Awaited<typeof import("@/lib/supabase")>["supabase"];

/* The tenant id is stable for the session — resolve once, share everywhere. */
let tenantIdPromise: Promise<string | null> | null = null;

/* Raw query results cached for the session — page revisits render instantly
   from cache while a fresh fetch revalidates in the background. Keys are the
   raw select (table|order|ascending|limit); callers pass their own mapper. */
const rawCache = new Map<string, unknown[]>();

/** Drop all cached table data (call on sign-out / tenant switch). */
export function clearLiveDataCache() {
  rawCache.clear();
  tenantIdPromise = null;
}

/** Current tenant id (or null when unauthenticated). Exported for Storage paths. */
export async function getLiveTenantId(): Promise<string | null> {
  try {
    const { supabase } = await import("@/lib/supabase");
    return tenantId(supabase);
  } catch {
    return null;
  }
}

function tenantId(supabase: SupabaseClient): Promise<string | null> {
  tenantIdPromise ??= (async () => {
    try {
      const { data, error } = await supabase.rpc("auth_tenant_id");
      return error ? null : (data as string | null);
    } catch {
      return null;
    }
  })();
  return tenantIdPromise;
}

export interface LiveTable<T extends TableName, D> {
  /** Rows in UI/domain shape — live rows when Supabase answers, [] otherwise. */
  rows: D[];
  /** True when data actually came from Supabase. */
  live: boolean;
  loading: boolean;
  refresh: () => void;
  /** Insert a row; tenant_id is filled automatically for tenant-scoped tables. */
  insert: (values: Omit<InsertRow<T>, "tenant_id"> & { tenant_id?: string }) => Promise<boolean>;
  update: (id: string, patch: UpdateRow<T>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

interface Options<T extends TableName, D> {
  /** DB row → UI/domain object. Defaults to identity. */
  map?: (row: Row<T>) => D;
  /** Data served while unauthenticated / unconfigured. Defaults to []. */
  fallback?: D[];
  order?: keyof Row<T> & string;
  ascending?: boolean;
  limit?: number;
  /** Subscribe to postgres_changes and reload on any event. */
  realtime?: boolean;
  /** Merge tenant_id into inserts. Default true. */
  tenantScoped?: boolean;
  /** Run a custom filter callback on the query builder. */
  filter?: (q: ReturnType<SupabaseClient["from"]>) => unknown;
}

/**
 * Generic tenant-scoped table reader.
 * RLS scopes every query to the caller's tenant, so no manual tenant filter
 * is needed — a query error leaves the table empty.
 */
export function useTenantTable<T extends TableName, D = Row<T>>(
  table: T,
  opts: Options<T, D> = {},
): LiveTable<T, D> {
  const { map, fallback, order, ascending = false, limit = 500, realtime = false } = opts;
  const tenantScoped = opts.tenantScoped !== false;
  /* `filter` is a builder callback — can't be cache-keyed reliably. */
  const cacheKey = opts.filter
    ? null
    : `${table}|${order ?? ""}|${ascending}|${limit}`;
  const [rows, setRows] = useState<D[]>(() => {
    const raw = cacheKey ? rawCache.get(cacheKey) : undefined;
    if (raw) {
      return raw.map((r) =>
        opts.map ? opts.map(r as unknown as Row<T>) : (r as unknown as D),
      );
    }
    return (fallback ?? []) as D[];
  });
  const [live, setLive] = useState(() => !!(cacheKey && rawCache.has(cacheKey)));
  const [loading, setLoading] = useState(() => !(cacheKey && rawCache.has(cacheKey)));
  const [tick, setTick] = useState(0);
  const refreshTick = useLiveRefreshTick();
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const load = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        let q = supabase.from(table).select("*");
        if (order) q = q.order(order, { ascending });
        q = q.limit(limit);
        const { data, error } = await q;
        if (cancelled) return;
        if (error) {
          if (!cacheKey || !rawCache.has(cacheKey)) {
            setRows((optsRef.current.fallback ?? []) as D[]);
          }
          setLive(!!(cacheKey && rawCache.has(cacheKey)));
        } else {
          const raw = (data ?? []) as unknown[];
          if (cacheKey) rawCache.set(cacheKey, raw);
          const mapped = raw.map((r) =>
            optsRef.current.map ? optsRef.current.map(r as Row<T>) : (r as unknown as D),
          );
          setRows(mapped);
          setLive(true);
        }
      } catch {
        if (!cancelled && !cacheKey) {
          setRows((optsRef.current.fallback ?? []) as D[]);
          setLive(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const start = async () => {
      await load();
      if (cancelled || !realtime) return;
      try {
        const { supabase } = await import("@/lib/supabase");
        const channel = supabase
          .channel(`live-${table}`)
          .on("postgres_changes", { event: "*", schema: "public", table }, () => void load())
          .subscribe();
        cleanup = () => void supabase.removeChannel(channel);
      } catch {
        /* realtime is best-effort */
      }
    };

    if (isConfigured) void start();
    else {
      setRows((optsRef.current.fallback ?? []) as D[]);
      setLoading(false);
    }

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, order, ascending, limit, realtime, tick, refreshTick]);

  const insert = useCallback(
    async (values: Omit<InsertRow<T>, "tenant_id"> & { tenant_id?: string }) => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const row = { ...(values as Record<string, unknown>) };
        if (tenantScoped && !row.tenant_id) {
          const tid = await tenantId(supabase);
          if (tid) row.tenant_id = tid;
        }
        /* The union-typed table generic can't satisfy concrete builder row types. */
        const { error } = await supabase.from(table).insert(row as never);
        if (error) return false;
        refresh();
        return true;
      } catch {
        return false;
      }
    },
    [table, tenantScoped, refresh],
  );

  const update = useCallback(
    async (id: string, patch: UpdateRow<T>) => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { error } = await supabase.from(table).update(patch as never).eq("id" as never, id);
        if (error) return false;
        refresh();
        return true;
      } catch {
        return false;
      }
    },
    [table, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { error } = await supabase.from(table).delete().eq("id" as never, id);
        if (error) return false;
        refresh();
        return true;
      } catch {
        return false;
      }
    },
    [table, refresh],
  );

  return { rows, live, loading, refresh, insert, update, remove };
}

/* ------------------------------------------------------------------ */
/* Row → domain mappers                                                */
/* ------------------------------------------------------------------ */

export const toDriver = (r: Row<"drivers">): Driver => ({
  id: r.id,
  tenantId: r.tenant_id,
  name: r.name,
  phone: r.phone ?? "",
  email: r.email ?? "",
  licenseNumber: r.license_number ?? "",
  licenseExpiry: r.license_expiry ?? "",
  status: r.status,
  assignedVehicleId: r.vehicle_id ?? undefined,
  behaviorScore: r.behavior_score,
  riskLevel: r.risk_level,
  tripsThisMonth: 0,
  distanceThisMonthKm: 0,
  avatarSeed: r.name.split(" ")[0]!.toLowerCase(),
});

export const toFuelRecord = (r: Row<"fuel_records">): FuelRecord => ({
  id: r.id,
  vehicleId: r.vehicle_id,
  at: r.recorded_at,
  kind: r.kind === "theft" ? "theftSuspected" : r.kind,
  liters: Number(r.litres),
  costUsd: r.cost_usd != null ? Number(r.cost_usd) : undefined,
  odometerKm: r.odometer_km ?? 0,
  levelAfterPct: r.level_after_pct ?? 0,
});

export const toGeofence = (r: Row<"geofences">): Geofence => ({
  id: r.id,
  tenantId: r.tenant_id,
  name: r.name,
  kind: r.kind,
  color: r.color,
  active: r.active,
  center: r.center && r.center.length >= 2 ? [Number(r.center[0]), Number(r.center[1])] : undefined,
  radiusM: r.radius_m ?? undefined,
  points: (r.points ?? undefined) as [number, number][] | undefined,
  alertOnEnter: r.alert_on_enter,
  alertOnExit: r.alert_on_exit,
});

const ALERT_TYPES: Record<string, FleetAlert["type"]> = {
  overspeed: "overspeed",
  low_fuel: "lowFuel",
  lowFuel: "lowFuel",
  geofence_enter: "geofenceEnter",
  geofence_exit: "geofenceExit",
  geofenceEnter: "geofenceEnter",
  geofenceExit: "geofenceExit",
  maintenance_due: "maintenanceDue",
  harsh_braking: "harshBraking",
  harsh_acceleration: "harshAcceleration",
  battery_disconnect: "batteryDisconnected",
  low_battery: "lowBattery",
  sos: "sos",
  power_cut: "powerCut",
  device_offline: "deviceOffline",
  insurance_expiry: "insuranceExpiry",
  crash: "crash",
  idle: "idle",
  idling: "idle",
  temperature: "temperature",
  fuel_theft: "fuelTheft",
  theft: "fuelTheft",
};

export const toAlert = (r: Row<"alerts">): FleetAlert => ({
  id: r.id,
  tenantId: r.tenant_id,
  vehicleId: r.vehicle_id ?? "",
  type: ALERT_TYPES[r.alert_type] ?? "deviceOffline",
  title: r.title,
  message: r.message ?? "",
  severity: r.severity,
  status: r.status,
  createdAt: r.created_at,
});

export const toTrip = (r: Row<"trips">): Trip => ({
  id: r.id,
  vehicleId: r.vehicle_id,
  driverId: undefined,
  startAt: r.start_at,
  endAt: r.end_at ?? r.start_at,
  startAddress: r.start_address ?? "",
  endAddress: r.end_address ?? "",
  distanceKm: Number(r.distance_km ?? 0),
  durationMin: r.duration_min ?? 0,
  maxSpeedKmh: r.max_speed_kmh ?? 0,
  avgSpeedKmh: r.avg_speed_kmh ?? 0,
  idleTimeMin: r.idle_time_min ?? 0,
  path: (r.path ?? []) as [number, number][],
  events: [],
});

export const toMaintenanceItem = (r: Row<"maintenance_items">): MaintenanceItem => ({
  id: r.id,
  vehicleId: r.vehicle_id,
  title: r.title,
  type: r.type,
  dueDate: r.due_date ?? r.created_at,
  dueOdometerKm: r.due_odometer_km ?? undefined,
  status: r.status,
  costUsd: r.cost_usd != null ? Number(r.cost_usd) : undefined,
  notes: r.notes ?? undefined,
});

/** UI-side shape for an insurance policy row joined with its vehicle plate. */
export interface InsurancePolicy {
  id: string;
  vehicleId: string;
  policyNumber: string;
  provider: string;
  coverage?: string;
  premiumUsd?: number;
  startDate?: string;
  expiryDate: string;
  status: "active" | "expired" | "cancelled";
  documentPath?: string;
}

export const toPolicy = (r: Row<"insurance_policies">): InsurancePolicy => ({
  id: r.id,
  vehicleId: r.vehicle_id,
  policyNumber: r.policy_number,
  provider: r.provider,
  coverage: r.coverage ?? undefined,
  premiumUsd: r.premium_usd != null ? Number(r.premium_usd) : undefined,
  startDate: r.start_date ?? undefined,
  expiryDate: r.expiry_date,
  status: r.status,
  documentPath: r.document_path ?? undefined,
});

export interface DriverEvent {
  id: string;
  driverId?: string;
  vehicleId?: string;
  type: Row<"driver_events">["type"];
  speedKmh?: number;
  position?: { lat: number; lng: number };
  recordedAt: string;
}

export const toDriverEvent = (r: Row<"driver_events">): DriverEvent => ({
  id: r.id,
  driverId: r.driver_id ?? undefined,
  vehicleId: r.vehicle_id ?? undefined,
  type: r.type,
  speedKmh: r.speed_kmh != null ? Number(r.speed_kmh) : undefined,
  position:
    r.position && typeof r.position === "object"
      ? (r.position as { lat: number; lng: number })
      : undefined,
  recordedAt: r.recorded_at,
});

export interface IgnitionEvent {
  id: string;
  deviceId: string;
  vehicleId?: string;
  driverId?: string;
  kind: "ignition_on" | "ignition_off";
  position?: { lat: number; lng: number };
  recordedAt: string;
}

export const toIgnitionEvent = (r: Row<"ignition_events">): IgnitionEvent => ({
  id: r.id,
  deviceId: r.device_id,
  vehicleId: r.vehicle_id ?? undefined,
  driverId: r.driver_id ?? undefined,
  kind: r.kind,
  position:
    r.position && typeof r.position === "object"
      ? (r.position as { lat: number; lng: number })
      : undefined,
  recordedAt: r.recorded_at,
});

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

export const toNotification = (r: Row<"notifications">): AppNotification => ({
  id: r.id,
  type: r.type,
  title: r.title,
  body: r.body ?? undefined,
  link: r.link ?? undefined,
  readAt: r.read_at ?? undefined,
  createdAt: r.created_at,
});

/* ------------------------------------------------------------------ */
/* Domain hooks                                                        */
/* ------------------------------------------------------------------ */

export const useDrivers = () =>
  useTenantTable("drivers", { map: toDriver, order: "name", ascending: true });

export const useDriverEvents = () =>
  useTenantTable("driver_events", {
    map: toDriverEvent,
    fallback: [],
    order: "recorded_at",
    realtime: true,
  });

export const useIgnitionEvents = () =>
  useTenantTable("ignition_events", {
    map: toIgnitionEvent,
    fallback: [],
    order: "recorded_at",
    realtime: true,
    limit: 2000,
  });

export const useFuelRecords = () =>
  useTenantTable("fuel_records", { map: toFuelRecord, order: "recorded_at" });

export const useGeofences = () =>
  useTenantTable("geofences", { map: toGeofence, order: "created_at" });

export const useAlerts = () =>
  useTenantTable("alerts", { map: toAlert, order: "created_at", realtime: true });

export const useTrips = () =>
  useTenantTable("trips", { map: toTrip, order: "start_at", limit: 200 });

export const useMaintenanceItems = () =>
  useTenantTable("maintenance_items", { map: toMaintenanceItem, order: "due_date" });

export const useInsurancePolicies = () =>
  useTenantTable("insurance_policies", { map: toPolicy, order: "expiry_date" });

export const useNotifications = () =>
  useTenantTable("notifications", {
    map: toNotification,
    fallback: [],
    order: "created_at",
    realtime: true,
    limit: 50,
  });

export const toGroup = (r: Row<"vehicle_groups">): VehicleGroup => ({
  id: r.id,
  tenantId: r.tenant_id,
  name: r.name,
  color: r.color ?? "#1E40FF",
  vehicleIds: [],
});

export const useVehicleGroups = () =>
  useTenantTable("vehicle_groups", { map: toGroup, order: "name", ascending: true });

/**
 * Device health joins devices → vehicles (via vehicles.device_id).
 * Not a plain table read, so it runs its own two-query effect.
 */
export function useDeviceHealth(): { rows: DeviceHealth[]; live: boolean } {
  const [rows, setRows] = useState<DeviceHealth[]>([]);
  const [live, setLive] = useState(false);
  const refreshTick = useLiveRefreshTick();

  useEffect(() => {
    if (!isConfigured) return;
    let cancelled = false;
    void (async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const [{ data: devices, error }, { data: vehicles }] = await Promise.all([
          supabase.from("devices").select("*").limit(500),
          supabase.from("vehicles").select("id, device_id").limit(500),
        ]);
        if (cancelled || error || !devices?.length) return;
        const vehicleByDevice = new Map(
          (vehicles ?? []).filter((v) => v.device_id).map((v) => [v.device_id!, v.id]),
        );
        setRows(
          devices.map((d): DeviceHealth => {
            const age = d.last_seen_at
              ? Date.now() - new Date(d.last_seen_at).getTime()
              : Infinity;
            const online = age < 15 * 60_000;
            return {
              vehicleId: vehicleByDevice.get(d.id) ?? "",
              online,
              lastSeen: d.last_seen_at ?? new Date(0).toISOString(),
              backupBatteryPct: d.battery_level ?? undefined,
              charging: false,
              simStatus: (d.sim_number ? "active" : "unknown") as DeviceHealth["simStatus"],
              signal: d.signal_strength ?? 0,
              gpsAccuracyM: 5,
              satellites: 0,
              firmware: d.firmware_version ?? "—",
              healthScore: online
                ? Math.min(100, 60 + Math.round((d.signal_strength ?? 50) / 2.5))
                : 35,
            };
          }),
        );
        setLive(true);
      } catch {
        /* leave rows empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  return { rows, live };
}
