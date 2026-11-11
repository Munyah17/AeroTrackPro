import { NextResponse } from "next/server";
import { createAdminClient, isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * GET /api/health — lightweight backend status probe for the dashboard
 * refresh button. Measures a real Supabase round-trip; no auth required
 * (returns no sensitive data).
 */
export async function GET() {
  const checkedAt = new Date().toISOString();
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) {
    return NextResponse.json(
      { ok: false, supabase: "unconfigured", checkedAt },
      { status: 503 },
    );
  }

  const started = Date.now();
  try {
    const db = createAdminClient();
    const { error } = await db.from("tenants").select("id", { head: true, count: "exact" }).limit(1);
    const ms = Date.now() - started;
    if (error) {
      return NextResponse.json(
        { ok: false, supabase: "error", error: error.message, ms, checkedAt },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, supabase: "ok", ms, checkedAt });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        supabase: "unreachable",
        error: err instanceof Error ? err.message : "unknown",
        checkedAt,
      },
      { status: 502 },
    );
  }
}
