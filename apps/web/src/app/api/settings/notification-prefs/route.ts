import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { NOTIFY_EVENTS, isNotifyEvent } from "@/lib/notify-events";

/**
 * Per-user notification channel preferences.
 *
 * GET  → { events, prefs, phone, email } — prefs keyed by event_type, with
 *        catalog defaults applied client-side for missing rows.
 * PUT  → { phone?, prefs[] } — upserts the session user's preference rows and
 *        stores the SMS destination on users.phone.
 *
 * Session auth via cookies (RLS confines writes to the caller's own rows).
 * Requires a configured database — never fabricates preferences.
 */

const prefSchema = z.object({
  event_type: z.string().refine(isNotifyEvent, "unknown event type"),
  in_app_enabled: z.boolean(),
  email_enabled: z.boolean(),
  sms_enabled: z.boolean(),
});

const putSchema = z.object({
  phone: z.string().max(32).nullish(),
  prefs: z.array(prefSchema).max(50),
});

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "API is not configured on this deployment" }, { status: 503 });
  }

  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await sb
    .from("users")
    .select("id, email, phone")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "user profile not found" }, { status: 404 });

  const { data: prefs, error } = await sb
    .from("notification_preferences")
    .select("event_type, in_app_enabled, email_enabled, sms_enabled")
    .eq("user_id", me.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prefMap = Object.fromEntries(
    (prefs ?? []).map((p) => [
      p.event_type,
      {
        in_app_enabled: p.in_app_enabled,
        email_enabled: p.email_enabled,
        sms_enabled: p.sms_enabled,
      },
    ]),
  );

  return NextResponse.json({
    events: NOTIFY_EVENTS,
    prefs: prefMap,
    phone: me.phone,
    email: me.email,
  });
}

export async function PUT(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "API is not configured on this deployment" }, { status: 503 });
  }

  let body: z.infer<typeof putSchema>;
  try {
    body = putSchema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError
      ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      : "invalid body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await sb
    .from("users")
    .select("id, tenant_id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "user profile not found" }, { status: 404 });

  if (body.phone !== undefined && body.phone !== null) {
    const { error } = await sb.from("users").update({ phone: body.phone }).eq("id", me.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.prefs.length > 0) {
    const { error } = await sb.from("notification_preferences").upsert(
      body.prefs.map((p) => ({
        tenant_id: me.tenant_id,
        user_id: me.id,
        event_type: p.event_type,
        in_app_enabled: p.in_app_enabled,
        email_enabled: p.email_enabled,
        sms_enabled: p.sms_enabled,
      })),
      { onConflict: "user_id,event_type" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
