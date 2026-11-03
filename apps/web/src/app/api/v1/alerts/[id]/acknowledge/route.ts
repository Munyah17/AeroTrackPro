import { withApi } from "../../../_lib/handler";
import { requireScope } from "../../../_lib/auth";
import { notFound, ok } from "../../../_lib/respond";

export const POST = withApi(async (_req, ctx, params) => {
  requireScope(ctx, "write");

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
