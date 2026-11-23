import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/server";
import { verifyForwardSecret } from "@/lib/traccar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OsmAnd-compatible position ingest.
 *
 * Accepts position reports from:
 *   - Traccar Client apps (Android / iOS) — turns phones into GPS trackers
 *   - The AeroTrack laptop agent — reports IP-based location for laptops
 *   - Any OsmAnd-protocol source (OsmAnd app, own apps, Traccar bridges)
 *
 * Auth (first match wins):
 *   1. Global forward secret (TRACCAR_FORWARD_SECRET) via ?key=/?token=,
 *      Authorization: Bearer, or x-forward-key — used by Traccar bridges.
 *   2. Per-device ingest token: ?key=<devices.ingest_token>. The token is
 *      shown once at onboarding and embedded in the phone's Server URL
 *      (Traccar Client preserves query params). The report's id/deviceid
 *      must match that device's imei.
 *   3. Open mode when TRACCAR_FORWARD_SECRET is unset (local development).
 */

const KNOWN_KEYS = new Set([
  "id", "deviceid", "valid", "timestamp", "lat", "lon", "longitude", "location",
  "speed", "course", "bearing", "heading", "altitude", "accuracy", "hdop",
  "batt", "sat", "satellites", "odometer", "ignition", "motion", "charge",
  "ip", "driverUniqueId", "event", "alarm", "mock", "key", "token",
]);

function parseNum(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseTimestamp(v: string | null): Date {
  if (!v) return new Date();
  // Unix seconds or milliseconds
  if (/^\d+$/.test(v)) {
    const n = Number(v);
    const ms = v.length <= 10 ? n * 1000 : n;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toIso(v: string | null): string | null {
  const n = parseNum(v);
  if (n == null) return null;
  return new Date(n * 1000).toISOString();
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

interface DeviceRef {
  id: string;
  tenant_id: string;
  imei: string;
}

const deviceCache = new Map<string, { device: DeviceRef | null; expires: number }>();
const DEVICE_CACHE_TTL_MS = 60_000;

async function findDeviceByImei(imei: string): Promise<DeviceRef | null> {
  const cached = deviceCache.get(imei);
  if (cached && cached.expires > Date.now()) return cached.device;

  const db = createAdminClient();
  const { data } = await db
    .from("devices")
    .select("id, tenant_id, imei")
    .eq("imei", imei)
    .maybeSingle();

  const device = (data as DeviceRef | null) ?? null;
  deviceCache.set(imei, { device, expires: Date.now() + DEVICE_CACHE_TTL_MS });
  return device;
}

const tokenCache = new Map<string, { device: DeviceRef | null; expires: number }>();

async function findDeviceByToken(token: string): Promise<DeviceRef | null> {
  const cached = tokenCache.get(token);
  if (cached && cached.expires > Date.now()) return cached.device;

  const db = createAdminClient();
  const { data } = await db
    .from("devices")
    .select("id, tenant_id, imei")
    .eq("ingest_token", token)
    .maybeSingle();

  const device = (data as DeviceRef | null) ?? null;
  tokenCache.set(token, { device, expires: Date.now() + DEVICE_CACHE_TTL_MS });
  return device;
}

interface AuthResult {
  ok: boolean;
  /** Pre-resolved device when authenticated via per-device token. */
  device?: DeviceRef;
  reason?: string;
}

async function authorize(req: NextRequest, params: URLSearchParams): Promise<AuthResult> {
  // 1. Global forward secret (also covers open dev mode when unset).
  if (verifyForwardSecret(req)) return { ok: true };

  // 2. Per-device ingest token.
  const key =
    params.get("key") ??
    params.get("token") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-forward-key");
  if (key) {
    const device = await findDeviceByToken(key);
    if (device) {
      const uid = params.get("id") ?? params.get("deviceid");
      if (uid && uid === device.imei) return { ok: true, device };
      return { ok: false, reason: "token does not match device id" };
    }
  }

  return { ok: false, reason: "unauthorized" };
}

/* ------------------------------------------------------------------ */
/* IP geolocation (laptop agent fallback)                              */
/* ------------------------------------------------------------------ */

interface IpGeo {
  lat: number;
  lon: number;
  attrs: Record<string, unknown>;
}

const geoCache = new Map<string, { geo: IpGeo | null; expires: number }>();
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function resolveIpGeo(ip: string): Promise<IpGeo | null> {
  const cached = geoCache.get(ip);
  if (cached && cached.expires > Date.now()) return cached.geo;

  let geo: IpGeo | null = null;
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,lat,lon,city,regionName,country,isp,query`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      if (data.status === "success" && typeof data.lat === "number" && typeof data.lon === "number") {
        geo = {
          lat: data.lat,
          lon: data.lon,
          attrs: {
            ip: str(data.query) ?? ip,
            city: str(data.city),
            region: str(data.regionName),
            country: str(data.country),
            isp: str(data.isp),
          },
        };
      }
    }
  } catch {
    // Geo lookup is best-effort; the position is skipped if it fails.
  }

  geoCache.set(ip, { geo, expires: Date.now() + GEO_CACHE_TTL_MS });
  return geo;
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: "ingest not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const params = url.searchParams;

  // Traccar Client (and some OsmAnd builds) POST form-encoded bodies with
  // the position fields in the body rather than the query string.
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      try {
        const form = await req.formData();
        for (const [k, v] of form.entries()) {
          if (typeof v === "string" && !params.has(k)) params.set(k, v);
        }
      } catch {
        // fall through with query params only
      }
    } else if (ct.includes("application/json")) {
      try {
        const body = (await req.json()) as Record<string, unknown>;
        for (const [k, v] of Object.entries(body)) {
          if (v != null && !params.has(k)) params.set(k, String(v));
        }
      } catch {
        // fall through with query params only
      }
    }
  }

  const auth = await authorize(req, params);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason ?? "unauthorized" }, { status: 401 });
  }

  const uid = params.get("id") ?? params.get("deviceid");
  if (!uid) {
    return NextResponse.json({ error: "missing device id" }, { status: 400 });
  }

  let lat = parseNum(params.get("lat"));
  let lon = parseNum(params.get("lon") ?? params.get("longitude"));
  if ((lat == null || lon == null) && params.get("location")) {
    const [a, b] = params.get("location")!.split(",");
    lat = lat ?? parseNum(a);
    lon = lon ?? parseNum(b);
  }

  // Laptop agent fallback: no GPS fix, resolve the public IP instead.
  let ipAttrs: Record<string, unknown> = {};
  if ((lat == null || lon == null) && params.get("ip")) {
    const geo = await resolveIpGeo(params.get("ip")!);
    if (geo) {
      lat = geo.lat;
      lon = geo.lon;
      ipAttrs = geo.attrs;
    }
  }

  if (lat == null || lon == null) {
    return NextResponse.json({ error: "missing lat/lon" }, { status: 400 });
  }

  const device = auth.device ?? (await findDeviceByImei(uid));
  if (!device) {
    // Unknown device — acknowledge so trackers don't retry forever, but don't store.
    return NextResponse.json({ received: 1, stored: 0, reason: "unknown device" });
  }

  const recordedAt = parseTimestamp(params.get("timestamp"));
  const speedKnots = parseNum(params.get("speed"));
  const course = parseNum(params.get("bearing") ?? params.get("heading") ?? params.get("course"));
  const accuracy = parseNum(params.get("accuracy")) ?? (ipAttrs.ip ? 10000 : null);

  const attributes: Record<string, unknown> = { ...ipAttrs };
  for (const [k, v] of params.entries()) {
    if (!KNOWN_KEYS.has(k) && v !== "") attributes[k] = v;
  }

  const db = createAdminClient();

  // Resolve the vehicle bound to this device — primary or secondary tracker
  // (double tracking) — so the position carries vehicle_id, the column the
  // fleet UI joins positions on.
  const { data: vehicle } = await db
    .from("vehicles")
    .select("id")
    .or(`device_id.eq.${device.id},secondary_device_id.eq.${device.id}`)
    .limit(1)
    .maybeSingle();

  const row = {
    tenant_id: device.tenant_id,
    device_id: device.id,
    vehicle_id: (vehicle?.id as string | undefined) ?? null,
    lat,
    lng: lon,
    speed_kmh: speedKnots != null ? Math.round(speedKnots * 1.852 * 10) / 10 : null,
    course: course != null ? Math.round(course) : null,
    altitude: parseNum(params.get("altitude")),
    accuracy,
    event_type: str(params.get("event")) ?? str(params.get("alarm")) ?? "position",
    raw_data: {
      source: "osmand",
      params: Object.fromEntries(params.entries()),
      attributes,
    },
    recorded_at: recordedAt.toISOString(),
  };

  const { error } = await db.from("positions").insert(row);
  if (error) {
    console.error("[osmand] position insert failed:", error.message);
    return NextResponse.json({ error: "store failed" }, { status: 500 });
  }

  // Hot-cache the fix on the device row and mark it online.
  await db
    .from("devices")
    .update({
      last_position_at: recordedAt.toISOString(),
      last_seen_at: new Date().toISOString(),
      last_lat: lat,
      last_lng: lon,
      last_speed_kmh: row.speed_kmh,
      last_course: row.course,
      connection_status: "online",
      battery_level: num(params.get("batt")) != null ? Math.round(num(params.get("batt"))!) : undefined,
      signal_strength: num(params.get("sat") ?? params.get("satellites")),
    })
    .eq("id", device.id);

  return NextResponse.json({ received: 1, stored: 1 });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
