import { z } from "zod";
import { withApi } from "../../_lib/handler";
import { requireScope } from "../../_lib/auth";
import { notFound, ok } from "../../_lib/respond";
import { demoGeofences } from "../../_lib/demo";

const lngLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

const updateGeofenceSchema = z.object({
  name: z.string().min(1).optional(),
  center: lngLat.nullish(),
  radius_m: z.number().int().positive().nullish(),
  points: z.array(lngLat).min(3).nullish(),
  color: z.string().optional(),
  active: z.boolean().optional(),
  alert_on_enter: z.boolean().optional(),
  alert_on_exit: z.boolean().optional(),
});

export const GET = withApi(async (_req, ctx, params) => {
  if (ctx.mode === "demo") {
    const geofence = demoGeofences().find((g) => g.id === params.id);
    return geofence ? ok(geofence) : notFound("geofence");
  }

  const { data, error } = await ctx.db
    .from("geofences")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.id!)
    .maybeSingle();
  if (error) throw error;
  return data ? ok(data) : notFound("geofence");
});

export const PATCH = withApi(async (req, ctx, params) => {
  requireScope(ctx, "write");
  const body = updateGeofenceSchema.parse(await req.json());

  if (ctx.mode === "demo") {
    const geofence = demoGeofences().find((g) => g.id === params.id);
    return geofence ? ok({ ...geofence, ...body, persisted: false }) : notFound("geofence");
  }

  const { data, error } = await ctx.db
    .from("geofences")
    .update(body as never)
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.id!)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? ok(data) : notFound("geofence");
});

export const DELETE = withApi(async (_req, ctx, params) => {
  requireScope(ctx, "write");

  if (ctx.mode === "demo") {
    return ok({ id: params.id, deleted: true, persisted: false });
  }

  const { data, error } = await ctx.db
    .from("geofences")
    .delete()
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.id!)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data ? ok({ id: data.id, deleted: true }) : notFound("geofence");
});
