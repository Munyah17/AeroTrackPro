import { NextResponse } from "next/server";
import type { Database } from "@aerotrack/shared";
import {
  normalizeForwardBody,
  resolveBridgeDevice,
  verifyForwardSecret,
} from "@/lib/traccar";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/server";
import { notifyEvent } from "@/lib/notify";
import { mapTraccarAlarm, eventDef, type NotifyEventType } from "@/lib/notify-events";

type PositionInsert = Database["public"]["Tables"]["positions"]["Insert"];
type DeviceUpdate = Database["public"]["Tables"]["devices"]["Update"];
type FuelRecordInsert = Database["public"]["Tables"]["fuel_records"]["Insert"];

/*
 * Fuel sensors: capacitive/ultrasonic tank probes report level %; resistive
 * probes may report litres; Bluetooth flow meters report cumulative litres
 * burned. Traccar surfaces all of these as position attributes — the exact
 * key varies by protocol/model, so we probe a list of common names.
 */
const FUEL_LEVEL_KEYS = ["fuel", "fuel1", "fuelLevel", "fuel_level", "fuelLevel1", "io72", "io90", "can_fuel"];
const FUEL_USED_KEYS = ["fuelUsed", "fuelConsumption", "fuel_used", "fuelCounter", "totalFuelUsed"];

/** % jump that counts as a genuine event (probe noise + sloshing is < ~3%). */
const FUEL_JUMP_PCT = 8;
/** Stationary when below this speed — a big drop while parked = suspected theft. */
const STATIONARY_KMH = 3;

function numAttr(attrs: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = attrs[k];
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Tank level % from probe attributes (values >100 treated as raw — ignored). */
function fuelLevelPct(attrs: Record<string, unknown>): number | null {
  const v = numAttr(attrs, FUEL_LEVEL_KEYS);
  if (v == null || v < 0 || v > 100) return null;
  return v;
}

function fuelUsedLitres(attrs: Record<string, unknown>): number | null {
  const v = numAttr(attrs, FUEL_USED_KEYS);
  return v != null && v >= 0 ? v : null;
}

/**
 * Traccar position forwarding endpoint.
 *
 * traccar.xml on the hardware VPS:
 *   <entry key='forward.enable'>true</entry>
 *   <entry key='forward.json'>true</entry>
 *   <entry key='forward.url'>https://app.example.com/api/telemetry?key=SECRET</entry>
 *
 * Traccar POSTs each successfully parsed position as JSON. We resolve the
 * device (traccar_id -> uniqueId/imei), write to `positions`, and stamp
 * last_position_at / last_seen_at / connection_status on `devices`.
 * Always 200 for parseable-but-unmatched payloads so Traccar doesn't
 * consider the forward a failure.
 */
export async function POST(req: Request): Promise<Response> {
  if (!verifyForwardSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: "Supabase service role not configured" }, { status: 503 });
  }

  let body: unknown;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    /* forward.type=url: Traccar sends position fields as form params instead
       of JSON (its default when forward.type can't be set on managed hosts). */
    const params = new URLSearchParams(await req.text());
    const num = (k: string) => {
      const v = params.get(k);
      const n = v == null ? NaN : Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const attrs: Record<string, unknown> = {};
    for (const [k, v] of params) {
      if (!["id", "deviceId", "uniqueid", "latitude", "longitude", "altitude", "speed", "course", "accuracy", "valid", "fixtime", "devicetime", "servertime", "protocol"].includes(k)) {
        attrs[k] = v;
      }
    }
    if (params.get("uniqueid")) attrs.uniqueId = params.get("uniqueid");
    body = {
      position: {
        deviceId: num("deviceId") ?? 0,
        protocol: params.get("protocol") ?? undefined,
        fixTime: params.get("fixtime") ?? undefined,
        deviceTime: params.get("devicetime") ?? undefined,
        serverTime: params.get("servertime") ?? undefined,
        latitude: num("latitude"),
        longitude: num("longitude"),
        altitude: num("altitude"),
        speed: num("speed"),
        course: num("course"),
        accuracy: num("accuracy"),
        attributes: attrs,
      },
    };
  } else {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
    }
  }

  const fixes = normalizeForwardBody(body);
  if (fixes.length === 0) {
    return NextResponse.json({ received: 0, stored: 0 });
  }

  const db = createAdminClient();
  const rows: PositionInsert[] = [];
  const skipped: { deviceId?: number; uniqueId?: string; reason: string }[] = [];
  // Alarm notifications are deduped per device+event within one payload.
  const alarms = new Map<
    string,
    { tenantId: string; event: NotifyEventType; alarm: string; imei: string; vehicleId: string | null; speedKmh: number | null }
  >();
  // Aggregate device stamps so each device row is updated once per payload.
  const stamps = new Map<string, DeviceUpdate>();
  // Fuel anomalies detected from level/flow readings — resolved to litres
  // (when tank capacity is known) and persisted after positions are stored.
  const fuelEvents: {
    tenantId: string;
    deviceId: string;
    vehicleId: string;
    kind: "refill" | "theft" | "consumption";
    deltaPct?: number;
    deltaL?: number;
    levelAfterPct: number | null;
    recordedAt: string;
    imei: string;
  }[] = [];

  for (const { position, device } of fixes) {
    const uniqueId = device?.uniqueId ?? (position.attributes?.uniqueId as string | undefined);
    const bridge = await resolveBridgeDevice({ traccarId: position.deviceId, uniqueId });
    if (!bridge) {
      skipped.push({
        deviceId: position.deviceId,
        uniqueId,
        reason: "no device row matches traccar_id or imei",
      });
      continue;
    }

    const attrs = position.attributes ?? {};
    const recordedAt = position.fixTime ?? position.deviceTime ?? position.serverTime;

    if (typeof attrs.alarm === "string") {
      const evt = mapTraccarAlarm(attrs.alarm);
      if (evt) {
        alarms.set(`${bridge.id}:${evt}`, {
          tenantId: bridge.tenant_id,
          event: evt,
          alarm: attrs.alarm,
          imei: bridge.imei,
          vehicleId: bridge.vehicle_id,
          speedKmh: typeof position.speed === "number" ? position.speed * 1.852 : null,
        });
      }
    }

    rows.push({
      tenant_id: bridge.tenant_id,
      device_id: bridge.id,
      vehicle_id: bridge.vehicle_id,
      lng: position.longitude,
      lat: position.latitude,
      // Traccar reports speed in knots
      speed_kmh: typeof position.speed === "number" ? position.speed * 1.852 : null,
      course: position.course != null ? Math.round(position.course) : null,
      altitude: position.altitude != null ? Math.round(position.altitude) : null,
      accuracy: position.accuracy != null ? Math.round(position.accuracy) : null,
      event_type: typeof attrs.alarm === "string" ? `alarm:${attrs.alarm}` : "position",
      raw_data: {
        source: "traccar",
        protocol: position.protocol ?? null,
        traccar_position_id: position.id ?? null,
        traccar_device_id: position.deviceId,
        device_time: position.deviceTime ?? null,
        attributes: attrs,
      },
      recorded_at: recordedAt ?? new Date().toISOString(),
    });

    const stamp: DeviceUpdate = stamps.get(bridge.id) ?? {};
    if (recordedAt) {
      const prev = stamp.last_position_at;
      const isNewest = !prev || recordedAt > prev;
      stamp.last_position_at = isNewest ? recordedAt : prev;
      if (isNewest) {
        // Hot cache: the live map reads these columns, never the history table.
        stamp.last_lat = position.latitude;
        stamp.last_lng = position.longitude;
        stamp.last_speed_kmh =
          typeof position.speed === "number" ? position.speed * 1.852 : null;
        stamp.last_course = position.course != null ? Math.round(position.course) : null;
      }
    }
    stamp.last_seen_at = new Date().toISOString();
    stamp.connection_status = "online"; // a live fix implies the unit is reachable

    /* Fuel probe / flow-meter analysis (rule engine):
     *   big jump up                      -> refill
     *   big drop while stationary        -> suspected theft (notified)
     *   big drop while moving            -> consumption event
     *   flow-meter cumulative delta      -> consumption event
     */
    const levelPct = fuelLevelPct(attrs);
    const usedL = fuelUsedLitres(attrs);
    if (levelPct != null) {
      const prev = bridge.last_fuel_level;
      if (prev != null && bridge.vehicle_id) {
        const delta = levelPct - prev;
        if (delta >= FUEL_JUMP_PCT) {
          fuelEvents.push({ tenantId: bridge.tenant_id, deviceId: bridge.id, vehicleId: bridge.vehicle_id, kind: "refill", deltaPct: delta, levelAfterPct: levelPct, recordedAt: recordedAt ?? new Date().toISOString(), imei: bridge.imei });
        } else if (delta <= -FUEL_JUMP_PCT) {
          const speed = typeof position.speed === "number" ? position.speed * 1.852 : 0;
          fuelEvents.push({ tenantId: bridge.tenant_id, deviceId: bridge.id, vehicleId: bridge.vehicle_id, kind: speed < STATIONARY_KMH ? "theft" : "consumption", deltaPct: -delta, levelAfterPct: levelPct, recordedAt: recordedAt ?? new Date().toISOString(), imei: bridge.imei });
        }
      }
      stamp.last_fuel_level = levelPct;
      stamp.last_fuel_at = recordedAt ?? new Date().toISOString();
      bridge.last_fuel_level = levelPct; // keep in-request comparisons sequential
    }
    if (usedL != null) {
      const prev = bridge.last_fuel_used_l;
      if (prev != null && usedL > prev && bridge.vehicle_id) {
        fuelEvents.push({ tenantId: bridge.tenant_id, deviceId: bridge.id, vehicleId: bridge.vehicle_id, kind: "consumption", deltaL: usedL - prev, levelAfterPct: levelPct, recordedAt: recordedAt ?? new Date().toISOString(), imei: bridge.imei });
      }
      stamp.last_fuel_used_l = usedL;
      bridge.last_fuel_used_l = usedL;
    }
    if (typeof attrs.battery === "number") stamp.battery_level = Math.round(attrs.battery);
    if (typeof attrs.batteryLevel === "number") stamp.battery_level = Math.round(attrs.batteryLevel);
    const rssi = attrs.rssi ?? attrs.gsmSignal;
    if (typeof rssi === "number" && rssi >= 0 && rssi <= 100) stamp.signal_strength = Math.round(rssi);
    stamps.set(bridge.id, stamp);
  }

  let stored = 0;
  if (rows.length > 0) {
    const { error } = await db.from("positions").insert(rows);
    if (error) {
      console.error("[traccar/telemetry] positions insert failed:", error.message);
      return NextResponse.json(
        { error: "positions insert failed", detail: error.message },
        { status: 500 },
      );
    }
    stored = rows.length;
  }

  for (const [deviceId, stamp] of stamps) {
    const { error } = await db.from("devices").update(stamp).eq("id", deviceId);
    if (error) console.error(`[traccar/telemetry] device stamp failed for ${deviceId}:`, error.message);
  }

  // Persist fuel events + notify on suspected theft.
  const fuelRows: FuelRecordInsert[] = [];
  for (const fe of fuelEvents) {
    let vehicleName = "";
    let capacityL: number | null = null;
    const { data: vehicle } = await db
      .from("vehicles")
      .select("name, plate, fuel_capacity_liters")
      .eq("id", fe.vehicleId)
      .maybeSingle();
    vehicleName = vehicle?.name ?? vehicle?.plate ?? "";
    capacityL = vehicle?.fuel_capacity_liters != null ? Number(vehicle.fuel_capacity_liters) : null;

    const litres = fe.deltaL ?? (fe.deltaPct != null && capacityL ? (fe.deltaPct / 100) * capacityL : fe.deltaPct ?? 0);
    fuelRows.push({
      tenant_id: fe.tenantId,
      vehicle_id: fe.vehicleId,
      device_id: fe.deviceId,
      kind: fe.kind,
      litres: Math.round(litres * 10) / 10,
      level_after_pct: fe.levelAfterPct != null ? Math.round(fe.levelAfterPct) : null,
      station: fe.deltaL != null ? "flow-meter" : "tank-probe",
      recorded_at: fe.recordedAt,
      coupon_id: null,
      cost_usd: null,
      odometer_km: null,
    });

    if (fe.kind === "theft") {
      await notifyEvent(db, fe.tenantId, "fuel_alert", {
        title: "Suspected fuel theft",
        body: `${vehicleName ? `${vehicleName} ` : ""}(tracker ${fe.imei}) tank level dropped ${fe.deltaPct?.toFixed(1)}% (≈${Math.round(litres)}L) while stationary.`,
        link: "/fuel",
      });
    }
  }
  if (fuelRows.length > 0) {
    const { error } = await db.from("fuel_records").insert(fuelRows);
    if (error) console.error("[traccar/telemetry] fuel_records insert failed:", error.message);
  }

  // Opt-in notifications for alarm fixes (rare; awaited so edge doesn't drop them).
  for (const a of alarms.values()) {
    let vehicleName = "";
    if (a.vehicleId) {
      const { data: vehicle } = await db
        .from("vehicles")
        .select("name, plate")
        .eq("id", a.vehicleId)
        .maybeSingle();
      vehicleName = vehicle?.name ?? vehicle?.plate ?? "";
    }
    const label = eventDef(a.event)?.label ?? a.event;
    await notifyEvent(db, a.tenantId, a.event, {
      title: label,
      body: `${vehicleName ? `${vehicleName} ` : ""}(tracker ${a.imei}) raised "${a.alarm}"${
        a.speedKmh != null ? ` at ${Math.round(a.speedKmh)} km/h` : ""
      }.`,
      link: "/tracking",
    });
  }

  return NextResponse.json({ received: fixes.length, stored, skipped });
}
