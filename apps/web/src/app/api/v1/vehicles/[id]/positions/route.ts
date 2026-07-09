import { withApi } from "../../../_lib/handler";
import { badRequest, ok, parseListParams } from "../../../_lib/respond";
import { demoPositionHistory } from "../../../_lib/demo";

export const GET = withApi(async (req, ctx, params) => {
  const url = new URL(req.url);
  const { limit } = parseListParams(url, { limit: 200 });
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (from && isNaN(Date.parse(from))) return badRequest("`from` must be an ISO timestamp");
  if (to && isNaN(Date.parse(to))) return badRequest("`to` must be an ISO timestamp");

  if (ctx.mode === "demo") {
    return ok(demoPositionHistory(params.id!, limit), { meta: { limit, mode: "demo" } });
  }

  let query = ctx.db
    .from("positions")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("vehicle_id", params.id!)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (from) query = query.gte("recorded_at", from);
  if (to) query = query.lte("recorded_at", to);

  const { data, error } = await query;
  if (error) throw error;
  return ok(data, { meta: { limit } });
});
