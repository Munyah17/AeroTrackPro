import { supabase } from "@/lib/supabase";
import type { Role } from "@/lib/rbac";

export interface AccountTier {
  /** Portal tier: super_admin | reseller | user (the end customer). */
  role: Role;
  tenantId: string;
  tenantName: string;
  /** tenants.account_kind: platform | owner | reseller | client */
  accountKind: string;
  /** users.role for this person inside their tenant. */
  userRole: string;
}

/**
 * Resolve the signed-in user's portal tier from their users row and their
 * tenant's account_kind. Returns null when there's no session or no profile
 * (demo mode / registration incomplete) — callers fall back to the demo
 * localStorage switcher.
 *
 *   users.role = 'super_admin'          → Master Portal
 *   tenant.account_kind = 'reseller'    → Reseller Portal
 *   everything else (client org users)  → end-customer tracking portal
 */
export async function resolveAccountTier(): Promise<AccountTier | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: me } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!me) return null;

    const { data: org } = await supabase
      .from("tenants")
      .select("name, account_kind")
      .eq("id", me.tenant_id)
      .maybeSingle();

    const accountKind = org?.account_kind ?? "owner";
    const role: Role =
      me.role === "super_admin"
        ? "super_admin"
        : accountKind === "reseller"
          ? "reseller"
          : "user";

    return {
      role,
      tenantId: me.tenant_id,
      tenantName: org?.name ?? "",
      accountKind,
      userRole: me.role,
    };
  } catch {
    return null;
  }
}
