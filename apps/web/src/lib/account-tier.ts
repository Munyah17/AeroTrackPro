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
  /** Display name + login for header identity. */
  fullName: string;
  email: string;
}

/* Session-scoped cache — the login page resolves the tier, then the
   RoleProvider reuses it instead of hitting Supabase a second time. */
let cached: { userId: string; tier: AccountTier } | null = null;

export function clearAccountTierCache() {
  cached = null;
}

/**
 * Resolve the signed-in user's portal tier from their users row joined to
 * their tenant — ONE query. Returns null when there's no session or no
 * profile. Callers redirect unauthenticated sessions to /login.
 *
 *   users.role = 'super_admin'          → Master Portal
 *   tenant.account_kind = 'reseller'    → Reseller Portal
 *   everything else (client org users)  → end-customer tracking portal
 */
export async function resolveAccountTier(): Promise<AccountTier | null> {
  try {
    /* getSession reads the local session — no network round trip. */
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      cached = null;
      return null;
    }
    if (cached?.userId === user.id) return cached.tier;

    const { data: me } = await supabase
      .from("users")
      .select("tenant_id, role, full_name, email")
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

    const tier: AccountTier = {
      role,
      tenantId: me.tenant_id,
      tenantName: org?.name ?? "",
      accountKind,
      userRole: me.role,
      fullName: me.full_name ?? "",
      email: me.email ?? user.email ?? "",
    };
    cached = { userId: user.id, tier };
    return tier;
  } catch {
    return null;
  }
}
