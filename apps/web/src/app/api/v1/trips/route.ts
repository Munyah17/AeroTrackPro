import { withApi } from "../_lib/handler";
import { ok, parseListParams } from "../_lib/respond";
import { demoTrips } from "../_lib/demo";

export const GET = withApi(async (req, ctx) => {
  const url = new URL(req.url);
  const { limit, page, offset } = parseListParams(url);
  const vehicleId = url.searchParams.get("vehicle_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (ctx.mode === "demo") {
    let rows = demoTrips();
    if (vehicleId) rows = rows.filter((t) => t.vehicle_id === vehicleId);
    if (from) rows = rows.filter((t) => t.start_at >= from);
    if (to) rows = rows.filter((t) => t.start_at <= to);
    const total = rows.length;
    return ok(rows.slice(offset, offset + limit), { meta: { page, limit, total, mode: "demo" } });
  }

  let query = ctx.db
    .from("trips")
    .select("*", { count: "exact" })
    .eq("tenant_id", ctx.tenantId)
    .order("start_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (vehicleId) query = query.eq("vehicle_id", vehicleId);
  if (from) query = query.gte("start_at", from);
  if (to) query = query.lte("start_at", to);

  const { data, error, count } = await query;
  if (error) throw error;
  return ok(data, { meta: { page, limit, total: count ?? data.length } });
});
