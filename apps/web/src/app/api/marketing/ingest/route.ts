import { NextResponse } from "next/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Prospect = {
  company: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  location?: string;
  industry?: string;
  fleet_estimate?: number;
  intent?: string;
  source?: string;
  notes?: string;
};

const INTENTS = new Set(["hot", "warm", "cold"]);

/**
 * POST /api/marketing/ingest  { run_id, secret, summary?, prospects[] }
 * Callback used by the spawned lead-hunter session. Authenticated by the
 * per-run secret, not by user session.
 */
export async function POST(req: Request) {
  try {
    if (!isServiceRoleConfigured()) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    const body = (await req.json().catch(() => null)) as {
      run_id?: string;
      secret?: string;
      summary?: string;
      prospects?: Prospect[];
    } | null;
    if (!body?.run_id || !body.secret) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: run } = await admin
      .from("marketing_runs")
      .select("id, run_secret, status")
      .eq("id", body.run_id)
      .single();
    if (!run || run.run_secret !== body.secret) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const prospects = (body.prospects ?? [])
      .filter((p) => p.company?.trim())
      .slice(0, 200)
      .map((p) => ({
        run_id: run.id,
        company: p.company.trim(),
        contact_name: p.contact_name?.trim() || null,
        phone: p.phone?.trim() || null,
        email: p.email?.trim() || null,
        whatsapp: p.whatsapp?.trim() || null,
        location: p.location?.trim() || null,
        industry: p.industry?.trim() || null,
        fleet_estimate: typeof p.fleet_estimate === "number" && Number.isFinite(p.fleet_estimate) ? p.fleet_estimate : null,
        intent: INTENTS.has(p.intent ?? "") ? p.intent! : "warm",
        source: p.source?.trim() || null,
        notes: p.notes?.trim() || null,
      }));

    if (prospects.length) {
      const { error } = await admin.from("marketing_prospects").insert(prospects);
      if (error) {
        console.error("prospect insert failed:", error);
        return NextResponse.json({ error: "insert_failed" }, { status: 500 });
      }
    }

    await admin
      .from("marketing_runs")
      .update({
        status: "done",
        summary: body.summary?.trim() || null,
        prospect_count: prospects.length,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return NextResponse.json({ ok: true, inserted: prospects.length });
  } catch (e) {
    console.error("marketing ingest failed:", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
