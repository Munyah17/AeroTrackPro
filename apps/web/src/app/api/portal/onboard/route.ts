import { NextResponse } from "next/server";
import {
  createAdminClient,
  createSupabaseServerClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/server";

/**
 * POST /api/portal/onboard
 * Self-serve org creation. A signed-in user with NO users profile yet creates
 * their own organisation and becomes its admin. This is the missing step in
 * the signup flow — register() creates auth.users only, so without this every
 * new account lands on /select-tenant with nothing to select.
 *
 * Creates:
 *   tenants row  (account_kind 'owner' — direct customer, not a reseller)
 *   users row    (role 'admin' — org owner)
 *
 * Reseller orgs are never created here — only Master Admin upgrades an
 * account_kind to 'reseller'.
 */
export async function POST(req: Request) {
  try {
    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: "provisioning_unavailable", message: "Service role not configured on this deployment." },
        { status: 503 },
      );
    }

    const body = (await req.json().catch(() => null)) as { name?: string } | null;
    const name = body?.name?.trim();
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "invalid_request", message: "Organisation name is required." },
        { status: 400 },
      );
    }

    const session = await createSupabaseServerClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthenticated", message: "Sign in first." }, { status: 401 });
    }

    /* Already onboarded? Return their existing tenant instead of duplicating. */
    const { data: existing } = await session
      .from("users")
      .select("tenant_id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, tenantId: existing.tenant_id, already: true });
    }

    const admin = createAdminClient();

    /* --- unique slug -------------------------------------------------- */
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "org";
    let slug = base;
    for (let i = 1; i < 10; i++) {
      const { data: clash } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
      if (!clash) break;
      slug = `${base}-${i + 1}`;
    }

    /* --- tenant -------------------------------------------------------- */
    const { data: tenant, error: tenantErr } = await admin
      .from("tenants")
      .insert({
        name,
        slug,
        primary_color: "#1E40FF",
        custom_domain: null,
        domain_status: "pending",
        logo_url: null,
        trial_ends_at: null,
        account_kind: "owner",
        parent_tenant_id: null,
        contact_email: user.email ?? null,
        plan: "basic",
        status: "trial",
        vehicle_limit: 10,
        user_limit: 5,
        mrr_usd: 0,
      })
      .select("id")
      .single();
    if (tenantErr || !tenant) {
      return NextResponse.json(
        { error: "tenant_failed", message: tenantErr?.message ?? "Could not create the organisation." },
        { status: 500 },
      );
    }

    /* --- profile ------------------------------------------------------- */
    const { error: userErr } = await admin.from("users").insert({
      tenant_id: tenant.id,
      auth_id: user.id,
      email: user.email ?? "",
      full_name: (user.user_metadata?.full_name as string | undefined) ?? name,
      role: "admin",
      status: "active",
      permissions: [],
      phone: null,
      avatar_url: null,
      last_seen_at: null,
    });
    if (userErr) {
      await admin.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json(
        { error: "profile_failed", message: userErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, tenantId: tenant.id, slug });
  } catch (e) {
    return NextResponse.json(
      { error: "server_error", message: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
