import { NextResponse } from "next/server";
import {
  createAdminClient,
  createSupabaseServerClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/server";

/**
 * GET  /api/portal/tenant  → orgs the caller may rename (role admin/super_admin)
 * PATCH /api/portal/tenant → rename one of those orgs
 * { tenantId, name }
 *
 * Display-name rename only — slug stays stable so links/bookmarks survive.
 * Needed because pre-0018 signups were named "<user>'s Fleet" by the auth
 * trigger before org_name metadata existed.
 */
const RENAMER_ROLES = new Set(["admin", "super_admin"]);

export async function GET() {
  try {
    if (!isServiceRoleConfigured()) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    const session = await createSupabaseServerClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { data, error } = await session
      .from("users")
      .select("tenant_id, role, tenants(name)")
      .eq("auth_id", user.id);
    if (error) {
      return NextResponse.json({ error: "memberships_failed" }, { status: 500 });
    }

    const orgs = (data ?? [])
      .filter((r) => RENAMER_ROLES.has(r.role))
      .map((r) => ({
        tenantId: r.tenant_id,
        name: (r.tenants as unknown as { name: string } | null)?.name ?? "",
      }))
      .filter((o) => o.name !== "");

    return NextResponse.json({ ok: true, orgs });
  } catch (e) {
    return NextResponse.json(
      { error: "server_error", message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    if (!isServiceRoleConfigured()) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    const body = (await req.json().catch(() => null)) as {
      tenantId?: string;
      name?: string;
    } | null;
    const tenantId = body?.tenantId?.trim();
    const name = body?.name?.trim();
    if (!tenantId || !name || name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { error: "invalid_request", message: "Provide tenantId and a 2–80 character name." },
        { status: 400 },
      );
    }

    const session = await createSupabaseServerClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    /* Caller must hold an admin role inside the org being renamed. */
    const { data: membership } = await session
      .from("users")
      .select("role")
      .eq("auth_id", user.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!membership || !RENAMER_ROLES.has(membership.role)) {
      return NextResponse.json(
        { error: "forbidden", message: "Only an org admin can rename the organisation." },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const { error } = await admin.from("tenants").update({ name }).eq("id", tenantId);
    if (error) {
      return NextResponse.json(
        { error: "rename_failed", message: "Could not rename the organisation." },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "server_error", message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
