import { withApi } from "../../../_lib/handler";
import { requireScope } from "../../../_lib/auth";
import { created, notFound, ok } from "../../../_lib/respond";
import { commandSchema, recordAndDispatch } from "@/lib/device-commands";

export const GET = withApi(async (_req, ctx, params) => {
  if (ctx.mode === "demo") {
    return ok([], { meta: { mode: "demo" } });
  }

  const { data, error } = await ctx.db
    .from("device_commands")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("device_id", params.id!)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return ok(data);
});

export const POST = withApi(async (req, ctx, params) => {
  requireScope(ctx, "write");
  const command = commandSchema.parse(await req.json());

  if (ctx.mode === "demo") {
    return created({
      id: `cmd-demo-${Date.now()}`,
      device_id: params.id,
      command,
      status: "pending",
      persisted: false,
    });
  }

  // Confirm the device belongs to this tenant before dispatching.
  const { data: device } = await ctx.db
    .from("devices")
    .select("id, traccar_id")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.id!)
    .maybeSingle();
  if (!device) return notFound("device");

  const { data: vehicle } = await ctx.db
    .from("vehicles")
    .select("id")
    .eq("device_id", device.id)
    .maybeSingle();

  const outcome = await recordAndDispatch({
    db: ctx.db,
    tenantId: ctx.tenantId,
    device,
    vehicleId: vehicle?.id ?? null,
    command,
    requestedBy: null,
    requestedByName: "api",
  });
  return created({ ...outcome.row, dispatch: outcome.dispatch });
});
