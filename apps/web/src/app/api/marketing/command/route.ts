import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import {
  createAdminClient,
  createSupabaseServerClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/server";
import { buildHuntPrompt, createDevinSession } from "@/lib/lead-hunter";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketing/command  { command: string }
 * Queues a lead-hunting run and spawns a Devin session to execute it.
 * Super admin only.
 */
export async function POST(req: Request) {
  try {
    if (!isServiceRoleConfigured()) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    const session = await createSupabaseServerClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data: membership } = await session
      .from("users")
      .select("role")
      .eq("auth_id", user.id)
      .eq("role", "super_admin")
      .limit(1);
    if (!membership?.length) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { command } = (await req.json().catch(() => ({}))) as { command?: string };
    if (!command?.trim()) {
      return NextResponse.json({ error: "command_required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const runSecret = randomBytes(24).toString("hex");
    const { data: run, error } = await admin
      .from("marketing_runs")
      .insert({ command: command.trim(), run_secret: runSecret, created_by: user.id })
      .select("id")
      .single();
    if (error || !run) {
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    const prompt = buildHuntPrompt({
      command: command.trim(),
      ingestUrl: `${appUrl}/api/marketing/ingest`,
      runId: run.id,
      runSecret,
    });

    try {
      const devin = await createDevinSession(prompt);
      await admin
        .from("marketing_runs")
        .update({ status: "running", session_id: devin.id, session_url: devin.url })
        .eq("id", run.id);
      return NextResponse.json({ runId: run.id, status: "running", sessionUrl: devin.url });
    } catch (e) {
      await admin
        .from("marketing_runs")
        .update({
          status: "failed",
          summary: `Could not spawn the hunter: ${(e as Error).message}. Set DEVIN_API_KEY in env to enable.`,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);
      return NextResponse.json({
        runId: run.id,
        status: "failed",
        error: "devin_unavailable",
      });
    }
  } catch (e) {
    console.error("marketing command failed:", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
