import { withApi } from "../../_lib/handler";
import { ok } from "../../_lib/respond";
import { demoLatestPositions } from "../../_lib/demo";

/** Latest known position for every vehicle in the tenant. */
export const GET = withApi(async (_req, ctx) => {
  if (ctx.mode === "demo") {
    return ok(demoLatestPositions(), { meta: { mode: "demo" } });
  }

  // Recent window, newest first, deduped per vehicle in memory.
  const { data, error } = await ctx.db
    .from("positions")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("recorded_at", { ascending: false })
    .limit(2000);
  if (error) throw error;

  const latest = new Map<string, (typeof data)[number]>();
  for (const row of data) {
    if (row.vehicle_id && !latest.has(row.vehicle_id)) latest.set(row.vehicle_id, row);
  }
  return ok([...latest.values()]);
});
