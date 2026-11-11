import dns from "node:dns/promises";
import { NextResponse } from "next/server";
import {
  createAdminClient,
  createSupabaseServerClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/server";

/**
 * /api/portal/verify-domain — Master Admin checks whether a tenant's custom
 * domain points at the platform edge (CNAME → edge.aerotrack.app or the
 * configured EDGE_DOMAIN). Updates tenants.domain_status accordingly.
 *
 *   POST { tenantId } → { ok: true, status: "active" | "pending" | "failed" }
 */

const EDGE_DOMAIN = process.env.PLATFORM_EDGE_DOMAIN ?? "edge.aerotrack.app";

export async function POST(req: Request) {
  try {
    const session = await createSupabaseServerClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: me } = await session
      .from("users")
      .select("role")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (me?.role !== "super_admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (!isServiceRoleConfigured()) {
      return NextResponse.json({ error: "provisioning_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as { tenantId?: string } | null;
    if (!body?.tenantId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: tenant } = await admin
      .from("tenants")
      .select("id, name, custom_domain, domain_status")
      .eq("id", body.tenantId)
      .maybeSingle();
    if (!tenant) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!tenant.custom_domain) {
      return NextResponse.json(
        { error: "no_domain", message: "No custom domain is set for this organization." },
        { status: 400 },
      );
    }

    /* Real DNS check: the custom domain must CNAME onto our edge. */
    let verified = false;
    try {
      const records = await dns.resolveCname(tenant.custom_domain);
      verified = records.some((r) => r.toLowerCase() === EDGE_DOMAIN.toLowerCase());
    } catch {
      verified = false;
    }

    const status = verified ? "active" : "failed";
    const { error } = await admin
      .from("tenants")
      .update({ domain_status: status })
      .eq("id", tenant.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      status,
      message: verified
        ? `DNS verified — ${tenant.custom_domain} points to ${EDGE_DOMAIN}.`
        : `${tenant.custom_domain} does not CNAME to ${EDGE_DOMAIN} yet.`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "server_error", message: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
