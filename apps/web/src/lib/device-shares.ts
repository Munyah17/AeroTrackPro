import { supabase } from "@/lib/supabase";

/**
 * Device sharing ("cloning / binding") — lets a privileged account share one
 * tracker with another tenant so that tenant sees the device, its vehicle and
 * live positions without credential sharing. RLS (migration 0029) enforces
 * who may share; these helpers are thin typed wrappers.
 */

export interface DeviceShare {
  id: string;
  deviceId: string;
  fromTenantId: string;
  toTenantId: string;
  toTenantName: string;
  createdAt: string;
}

export interface ShareTarget {
  id: string;
  name: string;
  accountKind: string;
}

/** Tenants this account may share a device with (RLS-scoped). */
export async function fetchShareTargets(): Promise<ShareTarget[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, account_kind")
    .order("name");
  if (error || !data) return [];
  return data.map((t) => ({ id: t.id, name: t.name, accountKind: t.account_kind }));
}

/** Shares owned by the caller's tenant (outgoing bindings). */
export async function fetchOutgoingShares(deviceId?: string): Promise<DeviceShare[]> {
  let q = supabase
    .from("device_shares")
    .select("id, device_id, from_tenant_id, to_tenant_id, created_at")
    .order("created_at", { ascending: false });
  if (deviceId) q = q.eq("device_id", deviceId);
  const { data, error } = await q;
  if (error || !data) return [];

  const tenantIds = [...new Set(data.map((s) => s.to_tenant_id))];
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name")
    .in("id", tenantIds);
  const nameById = new Map((tenants ?? []).map((t) => [t.id, t.name]));

  return data.map((s) => ({
    id: s.id,
    deviceId: s.device_id,
    fromTenantId: s.from_tenant_id,
    toTenantId: s.to_tenant_id,
    toTenantName: nameById.get(s.to_tenant_id) ?? "Unknown organization",
    createdAt: s.created_at,
  }));
}

/** Device ids shared WITH the caller's tenant (incoming bindings). */
export async function fetchIncomingShareDeviceIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("device_shares")
    .select("device_id")
    .eq("to_tenant_id", (await authTenantId()) ?? "");
  if (error || !data) return new Set();
  return new Set(data.map((s) => s.device_id));
}

async function authTenantId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("auth_tenant_id");
  return error ? null : (data as string | null);
}

export async function createDeviceShare(deviceId: string, toTenantId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user?.id ?? "")
    .maybeSingle();
  const fromTenantId = await authTenantId();
  if (!fromTenantId) return false;
  const { error } = await supabase.from("device_shares").insert({
    device_id: deviceId,
    from_tenant_id: fromTenantId,
    to_tenant_id: toTenantId,
    created_by: me?.id ?? null,
  });
  return !error;
}

export async function deleteDeviceShare(id: string): Promise<boolean> {
  const { error } = await supabase.from("device_shares").delete().eq("id", id);
  return !error;
}
