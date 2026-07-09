import { withApi } from "../../../_lib/handler";
import { requireScope } from "../../../_lib/auth";
import { notFound, ok } from "../../../_lib/respond";
import { demoAlerts } from "../../../_lib/demo";

export const POST = withApi(async (_req, ctx, params) => {
  requireScope(ctx, "write");

  if (ctx.mode === "demo") {
    const alert = demoAlerts().find((a) => a.id === params.id);
    return alert
      ? ok({ ...alert, status: "acknowledged", acknowledged_at: new Date().toISOString(), persisted: false })
      : notFound("alert");
  }

  const { data, error } = await ctx.db
    .from("alerts")
    .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.id!)
    .eq("status", "active")
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? ok(data) : notFound("active alert");
});
