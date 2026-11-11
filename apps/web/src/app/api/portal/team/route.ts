import { NextResponse } from "next/server";
import {
  createAdminClient,
  createSupabaseServerClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/server";

/**
 * /api/portal/team — staff management inside one tenant.
 *
 *   POST    { email, fullName?, role }        → create login + profile
 *   PATCH   { userId, role }                  → change a member's role
 *   DELETE  { userId }                        → remove member (profile + auth)
 *
 * Callers must be signed in and hold role 'admin' or 'super_admin' inside the
 * tenant they are acting on. 'super_admin' is reserved for Master Admin and
 * can never be granted or revoked through this route — the DB trigger in
 * 0017 protects the master account anyway, but we also never create one here.
 */

const ASSIGNABLE_ROLES = ["admin", "manager", "dispatcher", "driver", "viewer"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
const isAssignable = (r: unknown): r is AssignableRole =>
  typeof r === "string" && (ASSIGNABLE_ROLES as readonly string[]).includes(r);

async function caller() {
  const session = await createSupabaseServerClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;

  const { data: me } = await session
    .from("users")
    .select("id, tenant_id, role")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!me || (me.role !== "admin" && me.role !== "super_admin")) return null;
  return { me, user };
}

export async function GET() {
  const c = await caller();
  if (!c) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, email, full_name, role, status, last_seen_at")
    .eq("tenant_id", c.me.tenant_id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(req: Request) {
  try {
    if (!isServiceRoleConfigured()) {
      return NextResponse.json({ error: "provisioning_unavailable" }, { status: 503 });
    }
    const c = await caller();
    if (!c) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as {
      email?: string;
      fullName?: string;
      role?: string;
      tenantId?: string;
    } | null;
    const email = body?.email?.trim().toLowerCase();
    const role = body?.role;
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "invalid_request", message: "Valid email required." }, { status: 400 });
    }
    if (!isAssignable(role)) {
      return NextResponse.json(
        { error: "invalid_request", message: `Role must be one of: ${ASSIGNABLE_ROLES.join(", ")}.` },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    /* Master Admin may add a member to a chosen tenant (e.g. a client's
       admin user); tenant admins are locked to their own tenant. */
    let targetTenantId = c.me.tenant_id;
    if (c.me.role === "super_admin" && body?.tenantId) {
      const { data: t } = await admin.from("tenants").select("id").eq("id", body.tenantId).maybeSingle();
      if (!t) return NextResponse.json({ error: "not_found", message: "Unknown organization." }, { status: 404 });
      targetTenantId = t.id;
    }
    const tempPassword = `At!${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}x9`;

    /* Reuse an existing auth account if the email already has one — the person
       just gets added to this tenant too. */
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: body?.fullName?.trim() || email },
    });
    if (authErr || !created.user) {
      const msg = authErr?.message ?? "Could not create the login account.";
      const alreadyExists = /already|exists|registered/i.test(msg);
      return NextResponse.json(
        { error: alreadyExists ? "email_taken" : "auth_failed", message: msg },
        { status: alreadyExists ? 409 : 500 },
      );
    }

    const { data: member, error: userErr } = await admin
      .from("users")
      .insert({
        tenant_id: targetTenantId,
        auth_id: created.user.id,
        email,
        full_name: body?.fullName?.trim() || email,
        role,
        status: "active",
        permissions: [],
        phone: null,
        avatar_url: null,
        last_seen_at: null,
      })
      .select("id, email, full_name, role, status")
      .single();
    if (userErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: "profile_failed", message: userErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, member, login: { email, tempPassword } });
  } catch (e) {
    return NextResponse.json(
      { error: "server_error", message: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const c = await caller();
    if (!c) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as { userId?: string; role?: string } | null;
    if (!body?.userId || !isAssignable(body?.role)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const admin = createAdminClient();
    /* Guard: never touch super_admin, never cross tenants. */
    const { data: target } = await admin
      .from("users")
      .select("id, role")
      .eq("id", body.userId)
      .eq("tenant_id", c.me.tenant_id)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (target.role === "super_admin") {
      return NextResponse.json({ error: "forbidden", message: "Cannot change the master admin." }, { status: 403 });
    }

    const { error } = await admin.from("users").update({ role: body.role }).eq("id", body.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "server_error", message: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const c = await caller();
    if (!c) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as { userId?: string } | null;
    if (!body?.userId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: target } = await admin
      .from("users")
      .select("id, role, auth_id")
      .eq("id", body.userId)
      .eq("tenant_id", c.me.tenant_id)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (target.id === c.me.id) {
      return NextResponse.json({ error: "forbidden", message: "You cannot remove yourself." }, { status: 403 });
    }
    if (target.role === "super_admin") {
      return NextResponse.json({ error: "forbidden", message: "Cannot remove the master admin." }, { status: 403 });
    }

    await admin.from("users").delete().eq("id", target.id);
    if (target.auth_id) await admin.auth.admin.deleteUser(target.auth_id).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "server_error", message: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
