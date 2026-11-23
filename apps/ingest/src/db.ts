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
  driver_id: string | null;
  speed_limit_kmh: number | null;
  /** Tank capacity in litres — converts % probe drops to litres. */
  fuel_capacity_l: number | null;
  last_fuel_level: number | null;
  last_fuel_at: string | null;
  last_fuel_used_l: number | null;
  /** Adaptive fuel-model state (jsonb), hydrated on cache miss. */
  fuel_profile: unknown;
}

const deviceCache = new Map<string, DeviceRecord | null>();

/** Looks a device up by wire IMEI, joining its assigned vehicle. Cached per process. */
export async function findDeviceByImei(imei: string): Promise<DeviceRecord | null> {
  if (deviceCache.has(imei)) return deviceCache.get(imei) ?? null;

  const { data: device } = await db()
    .from("devices")
    .select(
      "id, tenant_id, last_fuel_level, last_fuel_at, last_fuel_used_l, fuel_profile",
    )
    .eq("imei", imei)
    .maybeSingle();

  if (!device) {
    deviceCache.set(imei, null);
    return null;
  }

  // The device may be the asset's primary tracker or its secondary one
  // (double tracking — e.g. a hidden module beside a laptop agent).
  const { data: vehicle } = await db()
    .from("vehicles")
    .select("id, driver_id, speed_limit_kmh, fuel_capacity_liters")
    .or(`device_id.eq.${device.id},secondary_device_id.eq.${device.id}`)
    .limit(1)
    .maybeSingle();

  const record: DeviceRecord = {
    id: device.id,
    tenant_id: device.tenant_id,
    driver_id: vehicle?.driver_id ?? null,
    vehicle_id: vehicle?.id ?? null,
    speed_limit_kmh: vehicle?.speed_limit_kmh ?? null,
    fuel_capacity_l:
      vehicle?.fuel_capacity_liters != null
        ? Number(vehicle.fuel_capacity_liters)
        : null,
    last_fuel_level:
      device.last_fuel_level != null ? Number(device.last_fuel_level) : null,
    last_fuel_at: device.last_fuel_at ?? null,
    last_fuel_used_l:
      device.last_fuel_used_l != null ? Number(device.last_fuel_used_l) : null,
    fuel_profile: device.fuel_profile ?? null,
  };
  deviceCache.set(imei, record);
  return record;
}
