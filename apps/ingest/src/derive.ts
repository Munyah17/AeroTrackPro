/**
 * Telemetry derivation — turns persisted fixes into fleet state:
 *
 *   trips           opened above MOVING_SPEED, closed after STOP_GRACE below
 *                   it (or after OFFLINE_GAP silence); distance/max/avg/idle
 *                   accumulated fix-by-fix, path kept as a breadcrumb list.
 *   ignition_events ACC transitions → ignition_on/off rows (ignition report).
 *   engine_hours    ACC-on intervals accrued via increment_engine_hours RPC.
 *   driver_events   harsh braking/acceleration (speed delta over dt) and
 *                   idling (ACC on + stationary ≥ IDLE_MIN_MS).
 *   devices         ignition + engine_cut mirrors the last reported state.
 *
 * Called once per persisted position — invalid fixes and deduped repeats
 * never reach here.
 */

import type { Position } from "@aerotrack/protocols";
import {
  analyzeFuelReading,
  asFuelProfile,
  fuelLevelPct,
  fuelUsedLitres,
  type FuelProfile,
} from "@aerotrack/shared";
import { db, type DeviceRecord } from "./db";
import { haversineM, insertAlert, shouldRaise } from "./alerts";

const MOVING_SPEED_KMH = 3;
const STOP_GRACE_MS = 5 * 60_000;
const OFFLINE_GAP_MS = 15 * 60_000;
const IDLE_MIN_MS = 10 * 60_000;
const IDLE_SPEED_KMH = 2;
/* Consecutive fixes further apart than this are not interpolated for
   distance or engine hours — protects against device clock jumps and
   long offline gaps. */
const MAX_GAP_MS = 10 * 60_000;
const MAX_SEGMENT_M = 5_000;
const MAX_PATH_POINTS = 500;
/* Fleet-standard harsh thresholds: Δspeed over ≤4s windows. */
const HARSH_BRAKE_KMH = -20;
const HARSH_ACCEL_KMH = 15;
const HARSH_WINDOW_MS = 4_000;
const HARSH_DEBOUNCE_MS = 60_000;

interface Fix {
  ts: number;
  lat: number;
  lng: number;
  speed: number;
  ignition?: boolean;
}

interface OpenTrip {
  id: string;
  startedAt: number;
  distanceM: number;
  maxSpeedKmh: number;
  speedSum: number;
  fixes: number;
  idleMs: number;
  path: [number, number][];
  belowSpeedSince?: number;
  fixesSinceWrite: number;
}

interface DeviceState {
  last?: Fix;
  ignition?: boolean;
  trip?: OpenTrip;
  /** First fix after boot must recover any open trip row once. */
  recovered: boolean;
  idleSince?: number;
  idlingRaised: boolean;
  lastHarshAt: Record<string, number>;
}

const states = new Map<string, DeviceState>();

function stateFor(deviceId: string): DeviceState {
  let s = states.get(deviceId);
  if (!s) {
    s = { recovered: false, idlingRaised: false, lastHarshAt: {} };
    states.set(deviceId, s);
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Fuel probe / flow-meter anomaly detection                            */
/* ------------------------------------------------------------------ */

/* In-process fuel state is authoritative (the devices row lags writes);
   it's hydrated once from the device record and updated per fix. */
interface FuelMem {
  level: number | null;
  levelAt: string | null;
  usedL: number | null;
  profile: FuelProfile | null;
}
const fuelStates = new Map<string, FuelMem>();

function fuelStateFor(device: DeviceRecord): FuelMem {
  let f = fuelStates.get(device.id);
  if (!f) {
    f = {
      level: device.last_fuel_level,
      levelAt: device.last_fuel_at,
      usedL: device.last_fuel_used_l,
      profile: asFuelProfile(device.fuel_profile),
    };
    fuelStates.set(device.id, f);
  }
  return f;
}

async function analyzeFuel(device: DeviceRecord, position: Position, s: DeviceState) {
  const attrs = (position.attributes ?? {}) as Record<string, unknown>;
  const level = fuelLevelPct(attrs);
  const used = fuelUsedLitres(attrs);
  if (level == null && used == null) return;

  const f = fuelStateFor(device);
  const at = position.timestamp.toISOString();
  const res = analyzeFuelReading({
    at,
    levelPct: level,
    prevLevelPct: f.level,
    prevAt: f.levelAt,
    usedLitres: used,
    prevUsedLitres: f.usedL,
    speedKmh: position.speedKmh,
    ignitionOff: s.ignition === false,
    profile: f.profile,
  });
  f.profile = res.profile;
  if (level != null) {
    f.level = level;
    f.levelAt = at;
  }
  if (used != null) f.usedL = used;

  /* Mirror latest readings + learned model onto the device row. */
  void db()
    .from("devices")
    .update({
      ...(level != null ? { last_fuel_level: level, last_fuel_at: at } : {}),
      ...(used != null ? { last_fuel_used_l: used } : {}),
      fuel_profile: f.profile,
    })
    .eq("id", device.id)
    .then(({ error }) => {
      if (error) console.error(`[fuel] device stamp failed for ${device.id}:`, error.message);
    });

  if (!device.vehicle_id || res.events.length === 0) return;

  for (const ev of res.events) {
    const litres =
      ev.deltaL ??
      (device.fuel_capacity_l != null && ev.deltaPct != null
        ? (ev.deltaPct / 100) * device.fuel_capacity_l
        : (ev.deltaPct ?? 0));
    if (!(litres > 0)) continue;

    const { error } = await db()
      .from("fuel_records")
      .insert({
        tenant_id: device.tenant_id,
        vehicle_id: device.vehicle_id,
        device_id: device.id,
        kind: ev.kind,
        litres: Math.round(litres * 10) / 10,
        level_after_pct:
          ev.levelAfterPct != null ? Math.round(ev.levelAfterPct) : null,
        station: ev.deltaL != null ? "flow-meter" : `tank-probe:${ev.reason}`,
        recorded_at: at,
        coupon_id: null,
        cost_usd: null,
        odometer_km: null,
      });
    if (error) {
      console.error(`[fuel] fuel_records insert failed for ${device.id}:`, error.message);
    } else {
      console.log(`[fuel] ${ev.kind}/${ev.reason} ~${Math.round(litres)}L for device ${device.id}`);
    }

    if (ev.kind === "theft" && shouldRaise(device.id, "fuel_theft")) {
      const desc =
        ev.reason === "skim"
          ? `drained gradually over ~${ev.windowMin ?? "?"} min`
          : ev.reason === "abnormal-rate"
            ? "consumed at a rate far above this vehicle's learned baseline"
            : ev.reason === "flow-stationary"
              ? "flow meter counted litres while parked with ignition off"
              : "sudden tank-level drop";
      void insertAlert(
        device,
        position,
        "fuel_theft",
        "critical",
        "Suspected fuel theft",
        `~${Math.round(litres)}L ${desc}${
          ev.deltaPct != null ? ` (${ev.deltaPct.toFixed(1)}% of tank)` : ""
        } while ${position.speedKmh < 3 ? "stationary" : `moving at ${Math.round(position.speedKmh)} km/h`}.`,
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Trips                                                               */
/* ------------------------------------------------------------------ */

/** After a restart, adopt the device's open trip row (if any) so we keep
 *  updating it instead of leaving it stuck or opening a duplicate. */
async function recoverOpenTrip(device: DeviceRecord, s: DeviceState): Promise<void> {
  s.recovered = true;
  if (!device.vehicle_id) return;
  const { data, error } = await db()
    .from("trips")
    .select("id, start_at, distance_km, max_speed_kmh, avg_speed_kmh, duration_min, idle_time_min, path")
    .eq("device_id", device.id)
    .eq("completed", false)
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(`[derive] open-trip recovery failed for ${device.id}:`, error.message);
    return;
  }
  if (!data) return;
  const fixes = Math.max(1, Math.round(((data.duration_min ?? 0) * 60) / 30));
  s.trip = {
    id: data.id,
    startedAt: new Date(data.start_at).getTime(),
    distanceM: (Number(data.distance_km) || 0) * 1000,
    maxSpeedKmh: Number(data.max_speed_kmh) || 0,
    speedSum: (Number(data.avg_speed_kmh) || 0) * fixes,
    fixes,
    idleMs: (Number(data.idle_time_min) || 0) * 60_000,
    path: Array.isArray(data.path) ? (data.path as [number, number][]) : [],
    fixesSinceWrite: 0,
  };
}

async function openTrip(device: DeviceRecord, fix: Fix): Promise<OpenTrip | null> {
  if (!device.vehicle_id) return null;
  const { data, error } = await db()
    .from("trips")
    .insert({
      tenant_id: device.tenant_id,
      vehicle_id: device.vehicle_id,
      device_id: device.id,
      start_at: new Date(fix.ts).toISOString(),
      start_address: `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}`,
      distance_km: 0,
      max_speed_kmh: Math.round(fix.speed),
      avg_speed_kmh: Math.round(fix.speed),
      idle_time_min: 0,
      path: [[fix.lng, fix.lat]],
      completed: false,
    })
    .select("id")
    .single();
  if (error) {
    console.error(`[derive] trip open failed for ${device.id}:`, error.message);
    return null;
  }
  return {
    id: data.id,
    startedAt: fix.ts,
    distanceM: 0,
    maxSpeedKmh: fix.speed,
    speedSum: fix.speed,
    fixes: 1,
    idleMs: 0,
    path: [[fix.lng, fix.lat]],
    fixesSinceWrite: 0,
  };
}

async function writeTrip(device: DeviceRecord, trip: OpenTrip, end?: { ts: number; lat: number; lng: number }) {
  const durationMin = Math.max(1, Math.round(((end?.ts ?? Date.now()) - trip.startedAt) / 60_000));
  const row: Record<string, unknown> = {
    end_at: end ? new Date(end.ts).toISOString() : null,
    distance_km: Number((trip.distanceM / 1000).toFixed(2)),
    duration_min: durationMin,
    max_speed_kmh: Math.round(trip.maxSpeedKmh),
    avg_speed_kmh: Number((trip.speedSum / Math.max(1, trip.fixes)).toFixed(1)),
    idle_time_min: Math.round(trip.idleMs / 60_000),
    path: trip.path,
  };
  if (end) {
    row.end_address = `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}`;
    row.completed = true;
  }
  const { error } = await db().from("trips").update(row).eq("id", trip.id);
  if (error) console.error(`[derive] trip write failed (${trip.id}):`, error.message);
  else if (end) console.log(`[derive] trip closed ${trip.id} — ${(trip.distanceM / 1000).toFixed(1)} km, ${durationMin} min`);
}

/* ------------------------------------------------------------------ */
/* Ignition events + engine hours                                       */
/* ------------------------------------------------------------------ */

async function recordIgnition(
  device: DeviceRecord,
  fix: Fix,
  prevIgnition: boolean | undefined,
) {
  const ignition = fix.ignition;
  if (ignition === undefined) return;

  /* Engine hours: time between consecutive ACC-on fixes. When ACC just
     switched off, the preceding interval still counts as running. */
  const prev = s_lastForAccrual(device.id);
  if (prevIgnition === true && prev != null && fix.ts > prev) {
    const mins = Math.min(fix.ts - prev, MAX_GAP_MS) / 60_000;
    if (mins > 0) {
      void db()
        .rpc("increment_engine_hours", { p_device_id: device.id, p_minutes: Math.round(mins) })
        .then(({ error }) => {
          if (error) console.error(`[derive] engine-hours RPC failed:`, error.message);
        });
    }
  }
  s_markAccrual(device.id, fix.ts);

  if (prevIgnition === undefined || prevIgnition === ignition) return;

  const kind = ignition ? "ignition_on" : "ignition_off";
  const { error } = await db()
    .from("ignition_events")
    .insert({
      tenant_id: device.tenant_id,
      device_id: device.id,
      vehicle_id: device.vehicle_id,
      driver_id: device.driver_id,
      kind,
      position: { lat: fix.lat, lng: fix.lng },
      recorded_at: new Date(fix.ts).toISOString(),
    });
  if (error) console.error(`[derive] ignition event failed:`, error.message);
  else console.log(`[derive] ${kind} — device ${device.id}`);
}

/* engine-hour accrual timestamp kept per device (outside DeviceState so the
   ignition handler stays standalone). */
const accrualAt = new Map<string, number>();
function s_lastForAccrual(id: string) {
  return accrualAt.get(id);
}
function s_markAccrual(id: string, ts: number) {
  accrualAt.set(id, ts);
}

/*/* ---- fuel probe / flow-meter anomalies ---- */
  await analyzeFuel(device, position, s);

   ------------------------------------------------------------------ */
/* Driver events: harsh braking / acceleration, idling                   */
/* ------------------------------------------------------------------ */

async function recordDriverEvent(
  device: DeviceRecord,
  fix: Fix,
  type: "harsh_braking" | "harsh_acceleration" | "idling",
) {
  const s = stateFor(device.id);
  const last = s.lastHarshAt[type] ?? 0;
  if (fix.ts - last < (type === "idling" ? IDLE_MIN_MS : HARSH_DEBOUNCE_MS)) return;
  s.lastHarshAt[type] = fix.ts;

  const { error } = await db()
    .from("driver_events")
    .insert({
      tenant_id: device.tenant_id,
      driver_id: device.driver_id,
      vehicle_id: device.vehicle_id,
      device_id: device.id,
      type,
      speed_kmh: Math.round(fix.speed * 10) / 10,
      position: { lat: fix.lat, lng: fix.lng },
      recorded_at: new Date(fix.ts).toISOString(),
    });
  if (error) console.error(`[derive] driver event failed:`, error.message);
  else console.log(`[derive] ${type} — device ${device.id} @ ${Math.round(fix.speed)} km/h`);
}

/* ------------------------------------------------------------------ */
/* Entry point                                                          */
/* ------------------------------------------------------------------ */

export async function deriveTelemetry(device: DeviceRecord, position: Position) {
  const s = stateFor(device.id);
  const fix: Fix = {
    ts: position.timestamp.getTime(),
    lat: position.latitude,
    lng: position.longitude,
    speed: position.speedKmh,
    ignition: position.attributes.ignition === true ? true : position.attributes.ignition === false ? false : undefined,
  };
  if (!Number.isFinite(fix.ts)) return;
  if (!s.recovered) await recoverOpenTrip(device, s);

  const prev = s.last;
  const dtMs = prev ? fix.ts - prev.ts : 0;
  const contiguous = prev != null && dtMs > 0 && dtMs <= OFFLINE_GAP_MS;

  /* Silence longer than OFFLINE_GAP closes any open trip at the last fix —
     the tracker was off/asleep, the trip is over. */
  if (s.trip && prev && dtMs > OFFLINE_GAP_MS) {
    await writeTrip(device, s.trip, { ts: prev.ts, lat: prev.lat, lng: prev.lng });
    s.trip = undefined;
  }

  const moving = fix.speed > MOVING_SPEED_KMH;
  const segM =
    contiguous && prev ? haversineM(prev.lng, prev.lat, fix.lng, fix.lat) : 0;

  /* ---- trip lifecycle ---- */
  if (!s.trip && moving) {
    const trip = await openTrip(device, fix);
    if (trip) s.trip = trip;
  } else if (s.trip) {
    const t = s.trip;
    if (contiguous && prev) {
      if (moving) {
        if (segM <= MAX_SEGMENT_M) t.distanceM += segM;
        t.speedSum += fix.speed;
        t.fixes += 1;
        if (fix.speed > t.maxSpeedKmh) t.maxSpeedKmh = fix.speed;
        t.belowSpeedSince = undefined;
      } else {
        /* Stationary while a trip is open — counts as idle time and starts
           the stop-grace clock toward closing the trip. */
        if (dtMs <= MAX_GAP_MS) t.idleMs += dtMs;
        t.belowSpeedSince ??= prev.ts;
        if (fix.ts - t.belowSpeedSince >= STOP_GRACE_MS) {
          await writeTrip(device, t, { ts: fix.ts, lat: fix.lat, lng: fix.lng });
          s.trip = undefined;
        }
      }
    }
    if (s.trip) {
      const last = t.path[t.path.length - 1];
      if (t.path.length < MAX_PATH_POINTS && (!last || last[0] !== fix.lng || last[1] !== fix.lat)) {
        t.path.push([fix.lng, fix.lat]);
      }
      /* Persist every ~5 fixes so the trips table stays near-live without
         an UPDATE per frame. */
      if (++t.fixesSinceWrite >= 5) {
        t.fixesSinceWrite = 0;
        void writeTrip(device, t).catch(() => {});
      }
    }
  }

  /* ---- ignition events + engine hours ---- */
  await recordIgnition(device, fix, s.ignition);
  if (fix.ignition !== undefined) s.ignition = fix.ignition;

  /* ---- harsh driving ---- */
  if (contiguous && prev && dtMs <= HARSH_WINDOW_MS) {
    const dv = fix.speed - prev.speed;
    if (dv <= HARSH_BRAKE_KMH) void recordDriverEvent(device, fix, "harsh_braking");
    else if (dv >= HARSH_ACCEL_KMH) void recordDriverEvent(device, fix, "harsh_acceleration");
  }

  /* ---- idling: ACC on + stationary ---- */
  if (fix.ignition === true && fix.speed < IDLE_SPEED_KMH) {
    s.idleSince ??= fix.ts;
    if (!s.idlingRaised && fix.ts - s.idleSince >= IDLE_MIN_MS) {
      s.idlingRaised = true;
      void recordDriverEvent(device, fix, "idling");
    }
  } else {
    s.idleSince = undefined;
    s.idlingRaised = false;
  }

  s.last = fix;
}
