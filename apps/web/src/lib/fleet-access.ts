/**
 * Corporate fleet-management grants issued by Master Admin.
 * Live source of truth is the `fleet_delegates` table (super-admin RLS);
 * localStorage is kept only as an unauthenticated fallback.
 */
export interface FleetDelegate {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: "reseller" | "user";
  grantedAt: string;
}

export const FLEET_DELEGATES_KEY = "at-fleet-delegates";
export const ACTIVE_DELEGATE_KEY = "at-delegate";

type DbDelegate = {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: "user" | "reseller";
  created_at: string;
};

const fromRow = (r: DbDelegate): FleetDelegate => ({
  id: r.id,
  name: r.name,
  email: r.email,
  organization: r.organization,
  role: r.role,
  grantedAt: r.created_at,
});

/** Read delegates from Supabase. Null when unavailable/unauthorized. */
export async function fetchDelegates(): Promise<FleetDelegate[] | null> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("fleet_delegates")
      .select("id, name, email, organization, role, created_at")
      .order("created_at", { ascending: false });
    if (error) return null;
    return (data ?? []).map(fromRow);
  } catch {
    return null;
  }
}

/** Grant fleet access. Returns the row, or null on failure. */
export async function insertDelegate(
  input: Omit<FleetDelegate, "id" | "grantedAt">,
): Promise<FleetDelegate | null> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("fleet_delegates")
      .insert(input)
      .select("id, name, email, organization, role, created_at")
      .single();
    if (error || !data) return null;
    return fromRow(data as DbDelegate);
  } catch {
    return null;
  }
}

/** Revoke a grant. True when the row was deleted. */
export async function deleteDelegate(id: string): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { error } = await supabase.from("fleet_delegates").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

/** Whether a signed-in email currently holds a fleet grant. */
export async function checkDelegateAccess(email: string): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("fleet_delegates")
      .select("id")
      .ilike("email", email)
      .limit(1);
    return !error && (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export function readDelegates(): FleetDelegate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FLEET_DELEGATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FleetDelegate[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d) =>
        !!d &&
        typeof d.id === "string" &&
        typeof d.email === "string" &&
        (d.role === "reseller" || d.role === "user"),
    );
  } catch {
    return [];
  }
}

export function writeDelegates(list: FleetDelegate[]) {
  localStorage.setItem(FLEET_DELEGATES_KEY, JSON.stringify(list));
}
