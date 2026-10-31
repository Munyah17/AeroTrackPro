import { NextResponse } from "next/server";
import type { Database } from "@aerotrack/shared";
import { verifyForwardSecret } from "@/lib/traccar";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/server";

type PositionInsert = Database["public"]["Tables"]["positions"]["Insert"];
type DeviceUpdate = Database["public"]["Tables"]["devices"]["Update"];

export const runtime = "edge";

/**
 * OsmAnd-compatible HTTP ingest — Traccar's simplest protocol, implemented
 * natively so HTTP-capable sources (Traccar Client phone app, GPS loggers,
 * DIY firmware) report straight into AeroTrack with no socket host involved.
 *
 *   GET/POST /api/ingest/osmand?id=<device uid>&lat=..&lon=..&timestamp=..&speed=..&key=<secret>
 *
 * `id`/`deviceid` is matched against devices.imei — same identity binding the
 * TCP listeners use. `speed` arrives in knots (OsmAnd convention) and is
 * stored as km/h. Unknown devices are acked-but-skipped (200) so clients
 * don't retry forever on a provisioning mistake.
 *
 * Auth: the same TRACCAR_FORWARD_SECRET guards this — ?key=, ?token=,
 * Authorization: Bearer, or x-forward-key. Unset = open dev mode.
 */

function parseTimestamp(v: string | null): string {
  if (!v) return new Date().toISOString();
  const n = Number(v);
  if (Number.isFinite(n)) {
    const ms = n < 1e12 ? n * 1000 : n; // seconds or milliseconds epoch
    return new Date(ms).toISOString();
  }
  const d = new Date(v.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseNum(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function handle(params: URLSearchParams): Promise<Response> {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: "Supabase service role not configured" }, { status: 503 });
  }

  const uid = params.get("id") ?? params.get("deviceid");
  const lat = parseNum(params.get("lat"));
  const lon = parseNum(params.get("lon")) ?? parseNum(params.get("longitude"));
  const location = params.get("location");
  let latV = lat, lonV = lon;
  if ((latV == null || lonV == null) && location) {
    const [a, b] = location.split(",").map((s) => parseNum(s));
    if (a != null && b != null) { latV = a; lonV = b; }
  }
  if (!uid || latV == null || lonV == null) {
    return NextResponse.json({ error: "id, lat and lon are required" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: device } = await db
    .from("devices")
    .select("id, tenant_id")
    .eq("imei", uid)
    .maybeSingle();
  if (!device) {
    return NextResponse.json({ received: 1, stored: 0, reason: "unknown device" });
  }
  const { data: vehicle } = await db
    .from("vehicles")
    .select("id")
    .eq("device_id", device.id)
    .maybeSingle();

  const recordedAt = parseTimestamp(params.get("timestamp"));
  const speedKmh = (() => {
    const s = parseNum(params.get("speed"));
    return s != null ? s * 1.852 : null; // OsmAnd default unit is knots
  })();

  // Everything else the client sends becomes a position attribute.
  const attrs: Record<string, unknown> = {};
  const reserved = new Set([
    "id", "deviceid", "lat", "lon", "lng", "longitude", "location",
    "timestamp", "speed", "key", "token",
  ]);
  for (const [k, v] of params) {
    if (!reserved.has(k)) attrs[k] = v;
  }

  const row: PositionInsert = {
    tenant_id: device.tenant_id,
    device_id: device.id,
    vehicle_id: vehicle?.id ?? null,
    lng: lonV,
    lat: latV,
    speed_kmh: speedKmh,
    course: parseNum(params.get("bearing")) ?? parseNum(params.get("heading")),
    altitude: parseNum(params.get("altitude")),
    accuracy: parseNum(params.get("accuracy")) ?? parseNum(params.get("hdop")),
    event_type: "position",
    raw_data: { source: "osmand", attributes: attrs, valid: params.get("valid") },
    recorded_at: recordedAt,
  };

  const { error } = await db.from("positions").insert(row);
  if (error) {
    console.error("[osmand] positions insert failed:", error.message);
    return NextResponse.json({ error: "positions insert failed" }, { status: 500 });
  }

  const stamp: DeviceUpdate = {
    last_position_at: recordedAt,
    last_seen_at: new Date().toISOString(),
    connection_status: "online",
    last_lat: latV,
    last_lng: lonV,
    last_speed_kmh: speedKmh,
    last_course: row.course,
    ...(parseNum(params.get("batt")) != null ? { battery_level: Math.round(parseNum(params.get("batt"))!) } : {}),
  };
  await db.from("devices").update(stamp).eq("id", device.id);

  return NextResponse.json({ received: 1, stored: 1 });
}

export async function GET(req: Request): Promise<Response> {
  if (!verifyForwardSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  return handle(url.searchParams);
}

export async function POST(req: Request): Promise<Response> {
  if (!verifyForwardSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const params = new URLSearchParams(url.search);
  // Form-encoded bodies merge into (not replace) the query params.
  const text = await req.text();
  if (text) {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("json")) {
      try {
        const obj = JSON.parse(text) as Record<string, unknown>;
        for (const [k, v] of Object.entries(obj)) params.set(k, String(v));
      } catch { /* fall through to form parse */ }
    }
    for (const [k, v] of new URLSearchParams(text)) params.set(k, v);
  }
  return handle(params);
}
