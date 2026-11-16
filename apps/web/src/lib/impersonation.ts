import { supabase } from "@/lib/supabase";

/**
 * Master Admin tenant impersonation ("support access").
 *
 * Starting a session inserts an admin_impersonations row; the DB helpers
 * auth_tenant_id()/is_super_admin() then scope every RLS policy to the
 * target tenant until the row's ended_at is set. The tenant's own id is
 * never touched — this is a session-level override, fully audited.
 */

export interface Impersonation {
  id: string;
  tenantId: string;
  tenantName: string;
  reason: string | null;
  startedAt: string;
}

/** The caller's currently open impersonation session, if any. */
export async function fetchActiveImpersonation(): Promise<Impersonation | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: row } = await supabase
      .from("admin_impersonations")
      .select("id, tenant_id, reason, started_at")
      .eq("admin_user_id", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) return null;

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", row.tenant_id)
      .maybeSingle();

    return {
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: tenant?.name ?? "this organization",
      reason: row.reason,
      startedAt: row.started_at,
    };
  } catch {
    return null;
  }
}

/** Open a support session on a tenant. Returns the session or null on failure. */
export async function startImpersonation(
  tenantId: string,
  reason?: string,
): Promise<Impersonation | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: row, error } = await supabase
      .from("admin_impersonations")
      .insert({ admin_user_id: user.id, tenant_id: tenantId, reason: reason ?? null })
      .select("id, tenant_id, reason, started_at")
      .single();
    if (error || !row) return null;

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", row.tenant_id)
      .maybeSingle();

    return {
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: tenant?.name ?? "this organization",
      reason: row.reason,
      startedAt: row.started_at,
    };
  } catch {
    return null;
  }
}

/** Close the open session — restores the admin's own tenant and powers. */
export async function stopImpersonation(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("admin_impersonations")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}
