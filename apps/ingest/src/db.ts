/**
 * Supabase access for the ingest service (service role, bypasses RLS).
 * Without credentials the service runs in decode-only mode: frames are
 * decoded and logged but nothing is persisted.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || "";

export const persistenceEnabled = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE);

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    if (!persistenceEnabled) {
      throw new Error("Supabase is not configured for the ingest service");
    }
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export interface DeviceRecord {
  id: string;
  tenant_id: string;
  vehicle_id: string | null;
  speed_limit_kmh: number | null;
}

const deviceCache = new Map<string, DeviceRecord | null>();

/** Looks a device up by wire IMEI, joining its assigned vehicle. Cached per process. */
export async function findDeviceByImei(imei: string): Promise<DeviceRecord | null> {
  if (deviceCache.has(imei)) return deviceCache.get(imei) ?? null;

  const { data: device } = await db()
    .from("devices")
    .select("id, tenant_id")
    .eq("imei", imei)
    .maybeSingle();

  if (!device) {
    deviceCache.set(imei, null);
    return null;
  }

  const { data: vehicle } = await db()
    .from("vehicles")
    .select("id, speed_limit_kmh")
    .eq("device_id", device.id)
    .maybeSingle();

  const record: DeviceRecord = {
    id: device.id,
    tenant_id: device.tenant_id,
    vehicle_id: vehicle?.id ?? null,
    speed_limit_kmh: vehicle?.speed_limit_kmh ?? null,
  };
  deviceCache.set(imei, record);
  return record;
}
