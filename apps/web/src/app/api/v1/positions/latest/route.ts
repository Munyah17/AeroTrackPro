import { withApi } from "../../_lib/handler";
import { ok } from "../../_lib/respond";
import { demoLatestPositions } from "../../_lib/demo";

/**
 * Latest known position for every vehicle in the tenant.
 *
 * Hot path: devices.last_* columns are stamped by the ingest/Traccar bridge
 * on every fix, so the live fleet list is one row per device — no scan of
 * the positions history table. Devices whose hot cache is empty (e.g. data
 * ingested before the hot columns existed) fall back to a bounded lookup in
 * positions so nothing drops off the map mid-migration.
 */
export const GET = withApi(async (_req, ctx) => {
  if (ctx.mode === "demo") {
    return ok(demoLatestPositions(), { meta: { mode: "demo" } });
  }

  const { data: devices, error: devError } = await ctx.db
    .from("devices")
    .select(
      "id, tenant_id, last_lat, last_lng, last_speed_kmh, last_course, last_position_at, vehicles(id)",
    )
    .eq("tenant_id", ctx.tenantId);
  if (devError) throw devError;

  type PositionRow = {
    tenant_id: string;
    device_id: string;
    vehicle_id: string | null;
    lng: number;
    lat: number;
    speed_kmh: number | null;
    course: number | null;
    altitude: number | null;
    accuracy: number | null;
    event_type: string;
    raw_data: unknown;
    recorded_at: string;
  };

  const rows: PositionRow[] = [];
  const coldDeviceIds: string[] = [];

  for (const d of devices) {
    const vehicle = Array.isArray(d.vehicles) ? d.vehicles[0] : d.vehicles;
    const vehicleId = (vehicle as { id?: string } | null)?.id ?? null;
    if (d.last_lng != null && d.last_lat != null) {
      rows.push({
        tenant_id: d.tenant_id,
        device_id: d.id,
        vehicle_id: vehicleId,
        lng: d.last_lng,
        lat: d.last_lat,
        speed_kmh: d.last_speed_kmh,
        course: d.last_course,
        altitude: null,
        accuracy: null,
        event_type: "position",
        raw_data: null,
        recorded_at: d.last_position_at ?? new Date().toISOString(),
      });
    } else {
      coldDeviceIds.push(d.id);
    }
  }

  // Fallback: devices without a cached fix may still have history rows.
  if (coldDeviceIds.length > 0) {
    const { data: history, error: posError } = await ctx.db
      .from("positions")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .in("device_id", coldDeviceIds)
      .order("recorded_at", { ascending: false })
      .limit(2000);
    if (posError) throw posError;

    const latest = new Map<string, (typeof history)[number]>();
    for (const row of history) {
      if (!latest.has(row.device_id)) latest.set(row.device_id, row);
    }
    rows.push(...latest.values());
  }

  return ok(rows);
});

