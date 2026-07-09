import { z } from "zod";
import { withApi } from "../../_lib/handler";
import { requireScope } from "../../_lib/auth";
import { notFound, ok } from "../../_lib/respond";
import { demoVehicles } from "../../_lib/demo";

const updateVehicleSchema = z.object({
  plate: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  device_id: z.string().uuid().nullish(),
  make: z.string().nullish(),
  model: z.string().nullish(),
  year: z.number().int().min(1950).max(2100).nullish(),
  vin: z.string().nullish(),
  status: z.enum(["active", "inactive", "maintenance", "sold"]).optional(),
  color: z.string().nullish(),
  group_name: z.string().nullish(),
  fuel_type: z.string().nullish(),
  fuel_capacity_liters: z.number().nonnegative().nullish(),
  odometer_km: z.number().nonnegative().nullish(),
  speed_limit_kmh: z.number().int().positive().nullish(),
  notes: z.string().nullish(),
});

export const GET = withApi(async (_req, ctx, params) => {
  if (ctx.mode === "demo") {
    const vehicle = demoVehicles().find((v) => v.id === params.id);
    return vehicle ? ok(vehicle) : notFound("vehicle");
  }

  const { data: vehicle, error } = await ctx.db
    .from("vehicles")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.id!)
    .maybeSingle();
  if (error) throw error;
  if (!vehicle) return notFound("vehicle");

  const { data: lastPosition } = await ctx.db
    .from("positions")
    .select("*")
    .eq("vehicle_id", vehicle.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return ok({ ...vehicle, last_position: lastPosition ?? null });
});

export const PATCH = withApi(async (req, ctx, params) => {
  requireScope(ctx, "write");
  const body = updateVehicleSchema.parse(await req.json());

  if (ctx.mode === "demo") {
    const vehicle = demoVehicles().find((v) => v.id === params.id);
    return vehicle ? ok({ ...vehicle, ...body, persisted: false }) : notFound("vehicle");
  }

  const { data, error } = await ctx.db
    .from("vehicles")
    .update(body as never)
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.id!)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? ok(data) : notFound("vehicle");
});

export const DELETE = withApi(async (_req, ctx, params) => {
  requireScope(ctx, "write");

  if (ctx.mode === "demo") {
    return ok({ id: params.id, deleted: true, persisted: false });
  }

  const { data, error } = await ctx.db
    .from("vehicles")
    .delete()
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.id!)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data ? ok({ id: data.id, deleted: true }) : notFound("vehicle");
});
