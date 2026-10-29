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

// Vercel Edge: supabase-js runs on fetch, no Node APIs — low-latency
// ingest next to the devices; execution stays well under the 25s cap.
export const runtime = "edge";

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
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
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
