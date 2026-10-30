import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyOps } from "@/lib/ops-mail";

/*
 * POST /api/ops-event — client-reported operational events worth a mail to
 * info@aerotrack.live (e.g. signup failed client-side, where no server hook
 * exists). Fixed event allowlist + trimmed detail so the endpoint can't be
 * abused as a free-form mail relay.
 */

export const runtime = "nodejs";

const EVENTS = {
  signup_failed: "Signup failed",
  signup_succeeded: "New signup",
  apply_submit_failed: "Application submit failed",
} as const;

const schema = z.object({
  type: z.enum(Object.keys(EVENTS) as [keyof typeof EVENTS, ...(keyof typeof EVENTS)[]]),
  detail: z.string().trim().max(1000).optional(),
});

// naive per-IP throttle — enough to blunt casual abuse, not a real ratelimit
const hits = new Map<string, number>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const first = hits.get(ip) ?? 0;
  if (now - first < WINDOW_MS && (hits.get(`${ip}:n`) ?? 0) >= MAX_PER_WINDOW) {
    return NextResponse.json({ ok: true }); // silently drop
  }
  if (now - first >= WINDOW_MS) {
    hits.set(ip, now);
    hits.set(`${ip}:n`, 0);
  }
  hits.set(`${ip}:n`, (hits.get(`${ip}:n`) ?? 0) + 1);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  await notifyOps(
    EVENTS[parsed.data.type],
    `${parsed.data.detail ?? "—"}\n\nIP: ${ip}\nTime: ${new Date().toISOString()}`,
  );
  return NextResponse.json({ ok: true });
}
