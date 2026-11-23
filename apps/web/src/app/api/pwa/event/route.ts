import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

/*
 * POST /api/pwa/event — anonymous PWA funnel events from the /download
 * page and the install prompt. Service-role insert; the table has no
 * public write policy. Always answers { ok: true } so analytics can never
 * break the install UX — invalid payloads and DB outages are swallowed.
 */

const schema = z.object({
  type: z.enum(["page_view", "install_tap", "app_installed"]),
  platform: z.enum(["ios", "android", "desktop", "unknown"]).default("unknown"),
});

// naive per-IP throttle — page_view can be noisy; 30/min is generous
const hits = new Map<string, number>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const count = hits.get(ip) ?? 0;
  if (count >= MAX_PER_WINDOW && now - (hits.get(`${ip}:t`) ?? 0) < WINDOW_MS) {
    return NextResponse.json({ ok: true });
  }
  if (now - (hits.get(`${ip}:t`) ?? 0) >= WINDOW_MS) {
    hits.set(ip, 0);
    hits.set(`${ip}:t`, now);
  }
  hits.set(ip, count + 1);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true });

  if (!isServiceRoleConfigured()) return NextResponse.json({ ok: true });

  try {
    const db = createAdminClient();
    await db.from("pwa_install_events").insert({
      event_type: parsed.data.type,
      platform: parsed.data.platform,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300) || null,
    });
  } catch {
    /* best-effort analytics */
  }

  return NextResponse.json({ ok: true });
}
