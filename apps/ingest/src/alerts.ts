/**
 * Alert rules evaluated on every decoded position: device-reported alarms
 * (SOS, power cut, ...) and platform-side overspeed detection.
 */

import type { AlarmType, Position } from "@aerotrack/protocols";
import { db, type DeviceRecord } from "./db";
import { dispatchWebhooks } from "./webhooks";

const ALARM_SEVERITY: Partial<Record<AlarmType, "info" | "warning" | "critical">> = {
  sos: "critical",
  crash: "critical",
  powerCut: "critical",
  fuelTheft: "critical",
  jamming: "critical",
  tamper: "warning",
  overspeed: "warning",
  lowBattery: "warning",
  vibration: "warning",
  tow: "warning",
  door: "info",
  movement: "info",
  idle: "info",
};

const ALARM_TITLES: Partial<Record<AlarmType, string>> = {
  sos: "SOS button pressed",
  crash: "Crash detected",
  powerCut: "Device power disconnected",
  fuelTheft: "Possible fuel theft",
  jamming: "GPS/GSM jamming detected",
  tamper: "Device tamper detected",
  overspeed: "Overspeed reported by device",
  lowBattery: "Device battery low",
  vibration: "Vibration detected",
  tow: "Possible tow-away",
  door: "Door opened",
  movement: "Unexpected movement",
  idle: "Excessive idling",
};

/** Per-device debounce so a sustained condition doesn't flood alerts. */
const lastAlertAt = new Map<string, number>();
const DEBOUNCE_MS = 10 * 60_000;

export function shouldRaise(deviceId: string, type: string): boolean {
  const key = `${deviceId}:${type}`;
  const last = lastAlertAt.get(key) ?? 0;
  if (Date.now() - last < DEBOUNCE_MS) return false;
  lastAlertAt.set(key, Date.now());
  return true;
}

export async function insertAlert(
  device: DeviceRecord,
  position: Position,
  alertType: string,
  severity: "info" | "warning" | "critical",
  title: string,
  message: string,
) {
  const { data, error } = await db()
    .from("alerts")
    .insert({
      tenant_id: device.tenant_id,
      device_id: device.id,
      vehicle_id: device.vehicle_id,
      alert_type: alertType,
      severity,
      title,
      message,
      position: {
        lat: position.latitude,
        lng: position.longitude,
        speed_kmh: position.speedKmh,
        recorded_at: position.timestamp.toISOString(),
      },
    })
    .select()
    .single();

  if (error) {
    console.error(`[alerts] Failed to insert ${alertType} alert:`, error.message);
    return;
  }

  console.log(`[alerts] ${severity.toUpperCase()} ${alertType} for device ${position.deviceId}`);
  void dispatchWebhooks(device.tenant_id, "alert.created", data);
}

/* ---------- Geofence enter/exit ---------- */

interface GeofenceRow {
  id: string;
  name: string;
  kind: "circle" | "polygon";
  center: [number, number] | null;
  radius_m: number | null;
  points: [number, number][] | null;
  alert_on_enter: boolean;
  alert_on_exit: boolean;
}

const geofenceCache = new Map<string, { rows: GeofenceRow[]; at: number }>();
const GEOFENCE_CACHE_MS = 60_000;

function toLngLat(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const lng = Number(v[0]);
  const lat = Number(v[1]);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

async function geofencesForTenant(tenantId: string): Promise<GeofenceRow[]> {
  const cached = geofenceCache.get(tenantId);
  if (cached && Date.now() - cached.at < GEOFENCE_CACHE_MS) return cached.rows;
  const { data, error } = await db()
    .from("geofences")
    .select("id,name,kind,center,radius_m,points,alert_on_enter,alert_on_exit")
    .eq("tenant_id", tenantId)
    .eq("active", true);
  if (error) {
    console.error(`[alerts] geofence fetch failed for tenant ${tenantId}:`, error.message);
    return cached?.rows ?? [];
  }
  const rows: GeofenceRow[] = (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    kind: g.kind === "circle" ? "circle" : "polygon",
    center: toLngLat(g.center),
    radius_m: g.radius_m != null ? Number(g.radius_m) : null,
    points: Array.isArray(g.points)
      ? (g.points as unknown[]).map(toLngLat).filter((p): p is [number, number] => p !== null)
      : null,
    alert_on_enter: g.alert_on_enter !== false,
    alert_on_exit: g.alert_on_exit !== false,
  }));
  geofenceCache.set(tenantId, { rows, at: Date.now() });
  return rows;
}

export function haversineM(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Ray-casting point-in-polygon over a [lng,lat] ring. */
function pointInPolygon(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* Last known inside/outside state per device+geofence. The first fix after
   boot only establishes the baseline — no alert until a real transition. */
const geofenceState = new Map<string, boolean>();

async function evaluateGeofences(device: DeviceRecord, position: Position) {
  const fences = await geofencesForTenant(device.tenant_id);
  if (!fences.length) return;

  const lng = position.longitude;
  const lat = position.latitude;

  for (const f of fences) {
    let inside: boolean;
    if (f.kind === "circle" && f.center && f.radius_m) {
      inside = haversineM(lng, lat, f.center[0], f.center[1]) <= f.radius_m;
    } else if (f.kind === "polygon" && f.points && f.points.length >= 3) {
      inside = pointInPolygon(lng, lat, f.points);
    } else {
      continue;
    }

    const key = `${device.id}:${f.id}`;
    const was = geofenceState.get(key);
    geofenceState.set(key, inside);
    if (was === undefined || was === inside) continue;

    const entering = inside;
    if (entering ? !f.alert_on_enter : !f.alert_on_exit) continue;
    const dir = entering ? "enter" : "exit";
    if (!shouldRaise(device.id, `geofence:${f.id}:${dir}`)) continue;

    await insertAlert(
      device,
      position,
      `geofence_${dir}`,
      entering ? "info" : "warning",
      `${entering ? "Entered" : "Exited"} ${f.name}`,
      `${f.name} — ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    );
  }
}

export async function evaluateAlerts(device: DeviceRecord, position: Position) {
  // 1. Device-reported alarm flags
  const alarm = position.attributes.alarm;
  if (alarm && alarm !== "unknown" && shouldRaise(device.id, `alarm:${alarm}`)) {
    await insertAlert(
      device,
      position,
      alarm,
      ALARM_SEVERITY[alarm] ?? "warning",
      ALARM_TITLES[alarm] ?? `Device alarm: ${alarm}`,
      `Reported at ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`,
    );
  }

  // 2. Platform-side overspeed against the vehicle's configured limit
  const limit = device.speed_limit_kmh;
  if (limit && position.speedKmh > limit && shouldRaise(device.id, "overspeed")) {
    await insertAlert(
      device,
      position,
      "overspeed",
      "warning",
      "Vehicle overspeeding",
      `${Math.round(position.speedKmh)} km/h in a ${limit} km/h configured limit`,
    );
  }

  // 3. Geofence enter/exit transitions
  await evaluateGeofences(device, position);
}
