import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createAdminClient,
  createSupabaseServerClient,
  isServiceRoleConfigured,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { commandSchema, recordAndDispatch } from "@/lib/device-commands";

/**
 * App-UI command channel (the /commands page).
 *
 *   GET  ?vehicle_id= | ?device_id=   latest 50 audit rows (+ vehicle join)
 *   POST { vehicle_id|device_id, command }  persist + dispatch via Traccar
 *
 * Auth: cookie session. Writes go through the service role because
 * device_commands intentionally grants app users select+insert only —
 * status transitions are system-owned.
 * Requires a configured database — the API never fabricates responses.
 */

const postSchema = z
  .object({
    vehicle_id: z.string().uuid().optional(),
    device_id: z.string().uuid().optional(),
    /** 'sms' delivers via Traccar textChannel (SMS fallback for offline GPRS). */
    channel: z.enum(["gprs", "sms"]).optional(),
    command: commandSchema,
  })
  .refine((b) => b.vehicle_id || b.device_id, {
    message: "vehicle_id or device_id is required",
  });

async function sessionUser() {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: me } = await sb
    .from("users")
    .select("id, tenant_id, full_name, email")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!me) return null;

  /* Master Admin support session: an open admin_impersonations row scopes
     this request to the impersonated tenant (mirrors auth_tenant_id()). */
  const { data: imp } = await sb
    .from("admin_impersonations")
    .select("tenant_id")
    .eq("admin_user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { ...me, tenant_id: imp?.tenant_id ?? me.tenant_id };
}

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) {
    return NextResponse.json({ error: "API is not configured on this deployment" }, { status: 503 });
  }

  const me = await sessionUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const db = createAdminClient();
  let q = db
    .from("device_commands")
    .select("*")
    .eq("tenant_id", me.tenant_id)
    .order("created_at", { ascending: false })
    .limit(50);

  const vehicleId = url.searchParams.get("vehicle_id");
  const deviceId = url.searchParams.get("device_id");
  if (vehicleId) q = q.eq("vehicle_id", vehicleId);
  if (deviceId) q = q.eq("device_id", deviceId);

  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Manual vehicle join — keeps display data next to each audit row without
  // depending on FK metadata for embedded selects.
  const vehicleIds = [...new Set((rows ?? []).map((r) => r.vehicle_id).filter(Boolean))] as string[];
  const vehicleById = new Map<string, { plate: string; name: string }>();
  if (vehicleIds.length > 0) {
    const { data: vehicles } = await db
      .from("vehicles")
      .select("id, plate, name")
      .in("id", vehicleIds);
    for (const v of vehicles ?? []) vehicleById.set(v.id, { plate: v.plate, name: v.name });
  }

  return NextResponse.json({
    commands: (rows ?? []).map((r) => ({
      ...r,
      vehicle: r.vehicle_id ? (vehicleById.get(r.vehicle_id) ?? null) : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) {
    return NextResponse.json({ error: "API is not configured on this deployment" }, { status: 503 });
  }

  const me = await sessionUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await req.json());
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : "invalid body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const db = createAdminClient();
  const vehicleId = body.vehicle_id ?? null;
  let deviceId = body.device_id ?? null;

  // A vehicle selection resolves through vehicles.device_id so the page can
  // stay in vehicle terms; a direct device_id skips that hop.
  if (vehicleId) {
    const { data: vehicle } = await db
      .from("vehicles")
      .select("id, device_id")
      .eq("tenant_id", me.tenant_id)
      .eq("id", vehicleId)
      .maybeSingle();
    if (!vehicle) return NextResponse.json({ error: "vehicle not found" }, { status: 404 });
    deviceId = vehicle.device_id ?? null;
  }
  if (!deviceId) {
    return NextResponse.json({ error: "no device bound to this vehicle" }, { status: 400 });
  }

  const { data: device } = await db
    .from("devices")
    .select("id, traccar_id")
    .eq("tenant_id", me.tenant_id)
    .eq("id", deviceId)
    .maybeSingle();
  if (!device) return NextResponse.json({ error: "device not found" }, { status: 404 });

  const outcome = await recordAndDispatch({
    db,
    tenantId: me.tenant_id,
    device,
    vehicleId,
    command: body.command,
    requestedBy: me.id,
    requestedByName: me.full_name ?? me.email,
    channel: body.channel,
  });

  return NextResponse.json(
    { command: outcome.row, dispatch: outcome.dispatch },
    { status: 201 },
  );
}
