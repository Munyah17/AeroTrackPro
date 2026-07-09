import { z } from "zod";
import { withApi } from "../_lib/handler";
import { ok, parseListParams } from "../_lib/respond";
import { demoAlerts } from "../_lib/demo";

const filterSchema = z.object({
  status: z.enum(["active", "acknowledged", "resolved"]).nullish(),
  severity: z.enum(["info", "warning", "critical"]).nullish(),
});

export const GET = withApi(async (req, ctx) => {
  const url = new URL(req.url);
  const { limit, page, offset } = parseListParams(url);
  const { status, severity } = filterSchema.parse({
    status: url.searchParams.get("status"),
    severity: url.searchParams.get("severity"),
  });

  if (ctx.mode === "demo") {
    let rows = demoAlerts();
    if (status) rows = rows.filter((a) => a.status === status);
    if (severity) rows = rows.filter((a) => a.severity === severity);
    const total = rows.length;
    return ok(rows.slice(offset, offset + limit), { meta: { page, limit, total, mode: "demo" } });
  }

  let query = ctx.db
    .from("alerts")
    .select("*", { count: "exact" })
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) query = query.eq("status", status);
  if (severity) query = query.eq("severity", severity);

  const { data, error, count } = await query;
  if (error) throw error;
  return ok(data, { meta: { page, limit, total: count ?? data.length } });
});
