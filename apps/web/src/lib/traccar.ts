import "server-only";

/**
 * Traccar bridge — AeroTrack treats Traccar as a headless hardware engine
 * running on a dedicated VPS:
 *
 *   inbound:  Traccar position/event forwarding -> /api/telemetry,
 *             /api/webhooks/status (shared-secret guarded)
 *   outbound: our UI -> this client -> Traccar REST -> device wire protocol
 *
 * Environment:
 *   TRACCAR_BASE_URL        e.g. http://5.9.87.12:8082
 *   TRACCAR_TOKEN           session token (POST /api/session/token) — preferred
 *   TRACCAR_EMAIL + TRACCAR_PASSWORD  fallback: JSESSIONID login, auto re-auth
 *   TRACCAR_FORWARD_SECRET  shared secret for inbound forwarded payloads.
 *                           Send it as `forward.url` query (?key=...), an
 *                           `Authorization: Bearer`, or `x-forward-key` header.
 */

import { createAdminClient } from "@/lib/supabase/server";

const BASE_URL = (process.env.TRACCAR_BASE_URL ?? "").replace(/\/+$/, "");
const EMAIL = process.env.TRACCAR_EMAIL ?? "";
const PASSWORD = process.env.TRACCAR_PASSWORD ?? "";
const TOKEN = process.env.TRACCAR_TOKEN ?? "";
const FORWARD_SECRET = process.env.TRACCAR_FORWARD_SECRET ?? "";

export function traccarConfigured(): boolean {
  return Boolean(BASE_URL && (TOKEN || (EMAIL && PASSWORD)));
}

// ---------------------------------------------------------------------------
// Inbound: shared-secret verification for Traccar -> AeroTrack forwarding
// ---------------------------------------------------------------------------

/**
 * Traccar's forwarder can't compute signatures; a static secret is the
 * practical control. Set TRACCAR_FORWARD_SECRET and embed it in the
 * forward URL (?key=...) or as a static header via forward.header.
 * Unset = open (local development only) — a warning is logged once.
 */
let warnedMissingSecret = false;

export function verifyForwardSecret(req: Request): boolean {
  if (!FORWARD_SECRET) {
    if (!warnedMissingSecret) {
      console.warn("[traccar] TRACCAR_FORWARD_SECRET unset — inbound forwarding is open (dev only)");
      warnedMissingSecret = true;
    }
    return true;
  }
  const url = new URL(req.url);
  const auth = req.headers.get("authorization");
  return (
    auth === `Bearer ${FORWARD_SECRET}` ||
    req.headers.get("x-forward-key") === FORWARD_SECRET ||
    url.searchParams.get("key") === FORWARD_SECRET ||
    url.searchParams.get("token") === FORWARD_SECRET
  );
}

// ---------------------------------------------------------------------------
// Traccar payload shapes (subset we consume — everything else lands in raw)
// ---------------------------------------------------------------------------

export interface TraccarPosition {
  id?: number;
  deviceId: number;
  protocol?: string;
  fixTime?: string;
  deviceTime?: string;
  serverTime?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  /** Knots — multiply by 1.852 for km/h. */
  speed?: number;
  course?: number;
  accuracy?: number;
  valid?: boolean;
  address?: string;
  attributes?: Record<string, unknown>;
}

export interface TraccarDevice {
  id: number;
  name?: string;
  uniqueId?: string;
  status?: string;
  [key: string]: unknown;
}

export interface TraccarEvent {
  id?: number;
  type: string;
  deviceId: number;
  positionId?: number;
  geofenceId?: number;
  eventTime?: string;
  attributes?: Record<string, unknown>;
}

/** A normalized "one position + its device context" pair for persistence. */
export interface ForwardedFix {
  position: TraccarPosition;
  device?: TraccarDevice;
}

/**
 * Traccar's forward.json payload has shipped in three shapes across versions:
 *   { position, device }                    modern single-forward
 *   { positions: [...], devices: [...] }    batch export
 *   { ...position fields directly }         legacy bare position
 * All three normalize into ForwardedFix[].
 */
export function normalizeForwardBody(body: unknown): ForwardedFix[] {
  if (!body || typeof body !== "object") return [];
  const b = body as Record<string, unknown>;

  const deviceById = new Map<number, TraccarDevice>();
  const pushDevice = (d: unknown) => {
    if (d && typeof d === "object" && typeof (d as TraccarDevice).id === "number") {
      deviceById.set((d as TraccarDevice).id, d as TraccarDevice);
    }
  };
  pushDevice(b.device);
  if (Array.isArray(b.devices)) b.devices.forEach(pushDevice);

  const pair = (p: unknown): ForwardedFix | null => {
    if (!p || typeof p !== "object") return null;
    const pos = p as TraccarPosition;
    if (typeof pos.latitude !== "number" || typeof pos.longitude !== "number") return null;
    return { position: pos, device: deviceById.get(pos.deviceId) };
  };

  const fixes: ForwardedFix[] = [];
  const seen = (f: ForwardedFix | null) => { if (f) fixes.push(f); };

  seen(pair(b.position));
  if (Array.isArray(b.positions)) b.positions.forEach((p) => seen(pair(p)));
  if (typeof b.latitude === "number") seen(pair(b)); // legacy bare position
  return fixes;
}

// ---------------------------------------------------------------------------
// Device resolution: Traccar id / uniqueId -> AeroTrack devices row
// ---------------------------------------------------------------------------

export interface BridgeDevice {
  id: string;
  tenant_id: string;
  vehicle_id: string | null;
  imei: string;
  protocol: string;
  traccar_id: number | null;
}

const deviceCache = new Map<string, BridgeDevice | null>();

async function loadDevice(query: { traccarId?: number; imei?: string }): Promise<BridgeDevice | null> {
  const db = createAdminClient();
  const sel = db.from("devices").select("id, tenant_id, imei, protocol, traccar_id");
  const { data: device } = query.traccarId != null
    ? await sel.eq("traccar_id", query.traccarId).maybeSingle()
    : await sel.eq("imei", query.imei!).maybeSingle();
  if (!device) return null;

  const { data: vehicle } = await db
    .from("vehicles")
    .select("id")
    .eq("device_id", device.id)
    .maybeSingle();

  return {
    id: device.id,
    tenant_id: device.tenant_id,
    vehicle_id: vehicle?.id ?? null,
    imei: device.imei,
    protocol: device.protocol,
    traccar_id: device.traccar_id ?? null,
  };
}

/**
 * Resolves the AeroTrack device for a forwarded fix/event. Prefers the
 * learned traccar_id binding; falls back to uniqueId == devices.imei.
 * When a device matches by IMEI and carries no traccar_id yet, the id is
 * persisted so later lookups (and command sends) are O(1).
 */
export async function resolveBridgeDevice(opts: {
  traccarId?: number;
  uniqueId?: string;
}): Promise<BridgeDevice | null> {
  const keys: string[] = [];
  if (opts.traccarId != null) keys.push(`t:${opts.traccarId}`);
  if (opts.uniqueId) keys.push(`i:${opts.uniqueId}`);
  for (const k of keys) {
    const hit = deviceCache.get(k);
    if (hit !== undefined) return hit;
  }

  let device = opts.traccarId != null ? await loadDevice({ traccarId: opts.traccarId }) : null;
  if (!device && opts.uniqueId) device = await loadDevice({ imei: opts.uniqueId });

  if (device && opts.traccarId != null && device.traccar_id == null) {
    device.traccar_id = opts.traccarId;
    await createAdminClient()
      .from("devices")
      .update({ traccar_id: opts.traccarId })
      .eq("id", device.id);
  }

  const result = device ?? null;
  for (const k of keys) deviceCache.set(k, result);
  return result;
}

// ---------------------------------------------------------------------------
// Outbound: REST client + command dispatch
// ---------------------------------------------------------------------------

let sessionCookie: string | null = null;

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Traccar login failed: HTTP ${res.status}`);
  const cookie = res.headers.get("set-cookie")?.match(/JSESSIONID=[^;]+/)?.[0];
  if (!cookie) throw new Error("Traccar login returned no JSESSIONID cookie");
  sessionCookie = cookie;
  return cookie;
}

/** Authenticated fetch against the headless Traccar instance; re-logs in once on 401. */
export async function traccarFetch(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  if (!traccarConfigured()) throw new Error("Traccar is not configured (TRACCAR_BASE_URL / credentials)");
  const headers = new Headers(init.headers);
  if (TOKEN) {
    headers.set("authorization", `Bearer ${TOKEN}`);
  } else {
    headers.set("cookie", sessionCookie ?? (await login()));
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401 && retry && !TOKEN) {
    headers.set("cookie", await login());
    return fetch(`${BASE_URL}${path}`, { ...init, headers });
  }
  return res;
}

/** Traccar's own device record (needed for /api/commands/send deviceId). */
export async function findTraccarDevice(uniqueId: string): Promise<TraccarDevice | null> {
  const res = await traccarFetch(`/api/devices?uniqueId=${encodeURIComponent(uniqueId)}`);
  if (!res.ok) throw new Error(`Traccar device lookup failed: HTTP ${res.status}`);
  const list = (await res.json()) as TraccarDevice[];
  return list[0] ?? null;
}

/** Register the device in Traccar if absent — used during AeroTrack onboarding. */
export async function ensureTraccarDevice(uniqueId: string, name: string): Promise<TraccarDevice> {
  const existing = await findTraccarDevice(uniqueId);
  if (existing) return existing;
  const res = await traccarFetch("/api/devices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uniqueId, name }),
  });
  if (!res.ok) throw new Error(`Traccar device create failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()) as TraccarDevice;
}

export interface SendCommandResult {
  ok: boolean;
  status: number;
  traccarType: string;
  body: unknown;
}

interface NormalizedCommand {
  type: string;
  attributes?: Record<string, unknown>;
}

/**
 * Map our normalized DeviceCommand onto Traccar's command types. Traccar
 * translates each type into vendor-specific bytes itself, so prefer native
 * types; anything Traccar can't express natively falls back to `custom`
 * (raw `data` string — protocol decoders in @aerotrack/protocols can supply
 * the exact payload via encodeCommand for ASCII families like h02/gps103).
 */
export function toTraccarCommand(command: { type: string } & Record<string, unknown>): NormalizedCommand {
  switch (command.type) {
    case "engineStop": return { type: "engineStop" };
    case "engineResume": return { type: "engineResume" };
    case "locate": return { type: "positionSingle" };
    case "setInterval":
      return { type: "positionPeriodic", attributes: { data: String(command.seconds) } };
    case "setTimezone":
      return { type: "setTimezone", attributes: { timezone: String(command.utcOffsetMinutes) } };
    case "reboot": return { type: "rebootDevice" };
    case "arm": return { type: "alarmArm" };
    case "disarm": return { type: "alarmDisarm" };
    case "sosNumber":
      return { type: "sosNumber", attributes: { index: command.slot, phone: command.phone } };
    default:
      // setApn / setServer / setOverspeed / factoryReset / listen / custom —
      // Traccar has no universal type; pass through as `custom`. Callers may
      // supply a pre-encoded wire string via command.payload.
      return {
        type: "custom",
        attributes: { data: String((command as { payload?: string }).payload ?? JSON.stringify(command)) },
      };
  }
}

/**
 * Send a normalized command to a device through headless Traccar.
 * Targets the modern POST /api/commands/send, falling back to the legacy
 * /api/commands endpoint on 404/405 (older Traccar builds).
 */
export async function sendTraccarCommand(opts: {
  traccarDeviceId: number;
  command: { type: string } & Record<string, unknown>;
  description?: string;
}): Promise<SendCommandResult> {
  const normalized = toTraccarCommand(opts.command);
  const payload = {
    deviceId: opts.traccarDeviceId,
    description: opts.description ?? opts.command.type,
    type: normalized.type,
    textChannel: false,
    attributes: normalized.attributes ?? {},
  };

  const post = (path: string) =>
    traccarFetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

  let res = await post("/api/commands/send");
  if (res.status === 404 || res.status === 405) res = await post("/api/commands");

  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* non-JSON response */ }
  return { ok: res.ok, status: res.status, traccarType: normalized.type, body };
}
