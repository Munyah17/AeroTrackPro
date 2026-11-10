import { NextResponse } from "next/server";
import {
  createAdminClient,
  createSupabaseServerClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/server";

/**
 * POST /api/portal/provision-client
 * Reseller portal "Add Client". Creates a real downline organisation:
 *   tenants row  (account_kind 'client', parent_tenant_id = reseller's tenant)
 *   auth.users   (auto-generated password, email confirmed)
 *   users row    (the client's organisation admin)
 *
 * Caller must be signed in and belong to a reseller (or platform) tenant —
 * verified via the cookie-bound client before the service role does anything.
 * Returns the generated credentials once; they are not stored in plaintext.
 */
export async function POST(req: Request) {
  try {
    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: "provisioning_unavailable", message: "Service role not configured on this deployment." },
        { status: 503 },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      name?: string;
      adminName?: string;
      adminEmail?: string;
      contactEmail?: string;
      parentTenantId?: string;
      accountKind?: string;
    } | null;

    const name = body?.name?.trim();
    const adminEmail = body?.adminEmail?.trim().toLowerCase();
    if (!name || !adminEmail) {
      return NextResponse.json(
        { error: "invalid_request", message: "Organisation name and admin email are required." },
        { status: 400 },
      );
    }

    /* --- who is asking? --------------------------------------------- */
    const session = await createSupabaseServerClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthenticated", message: "Sign in first." }, { status: 401 });
    }

    const { data: me } = await session
      .from("users")
      .select("tenant_id, role")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!me) {
      return NextResponse.json({ error: "forbidden", message: "No account profile found." }, { status: 403 });
    }

    const isMaster = me.role === "super_admin";
    /* Master Admin may provision reseller/owner orgs too; everyone else
       is restricted to downline clients. */
    const accountKind = isMaster && ["client", "reseller", "owner"].includes(body?.accountKind ?? "")
      ? (body!.accountKind as "client" | "reseller" | "owner")
      : "client";
    let parentTenantId: string;
    if (isMaster) {
      /* Master Admin may create a client under any reseller (or standalone).
         Reseller/owner orgs are top-level — no parent. */
      parentTenantId = accountKind === "client" ? (body?.parentTenantId ?? me.tenant_id) : me.tenant_id;
    } else {
      const { data: org } = await session
        .from("tenants")
        .select("id, account_kind")
        .eq("id", me.tenant_id)
        .maybeSingle();
      if (org?.account_kind !== "reseller") {
        return NextResponse.json(
          { error: "forbidden", message: "Only reseller accounts can provision client organisations." },
          { status: 403 },
        );
      }
      parentTenantId = org.id;
    }

    const admin = createAdminClient();

    /* --- unique slug -------------------------------------------------- */
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "client";
    let slug = base;
    for (let i = 1; i < 10; i++) {
      const { data: clash } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
      if (!clash) break;
      slug = `${base}-${i + 1}`;
    }

    /* --- org tenant --------------------------------------------------- */
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
        account_kind: accountKind,
        parent_tenant_id: accountKind === "client" ? parentTenantId : null,
        contact_email: body?.contactEmail?.trim() || adminEmail,
        plan: "basic",
        status: "trial",
        vehicle_limit: 10,
        user_limit: 5,
        mrr_usd: 0,
      })
      .select("id, slug")
      .single();
    if (tenantErr || !tenant) {
      return NextResponse.json(
        { error: "tenant_failed", message: tenantErr?.message ?? "Could not create the organisation." },
        { status: 500 },
      );
    }

    /* --- login account ------------------------------------------------- */
    const tempPassword = `At!${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}x9`;
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: body?.adminName?.trim() || name },
    });
    if (authErr || !created.user) {
      await admin.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json(
        { error: "auth_failed", message: authErr?.message ?? "Could not create the login account." },
        { status: 500 },
      );
    }

    const { error: userErr } = await admin.from("users").insert({
      tenant_id: tenant.id,
      auth_id: created.user.id,
      email: adminEmail,
      full_name: body?.adminName?.trim() || name,
      role: "admin",
      status: "active",
      permissions: [],
      phone: null,
      avatar_url: null,
      last_seen_at: null,
    });
    if (userErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      await admin.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json(
        { error: "profile_failed", message: userErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      client: {
        id: tenant.id,
        name,
        slug: tenant.slug,
        contact: adminEmail,
        status: "trial" as const,
      },
      login: { email: adminEmail, tempPassword },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "server_error", message: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
