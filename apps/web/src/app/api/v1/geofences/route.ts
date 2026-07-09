import { z } from "zod";
import { withApi } from "../_lib/handler";
import { requireScope } from "../_lib/auth";
import { badRequest, created, ok } from "../_lib/respond";
import { demoGeofences } from "../_lib/demo";

const lngLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

const createGeofenceSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["circle", "polygon"]),
  center: lngLat.nullish(),
  radius_m: z.number().int().positive().nullish(),
  points: z.array(lngLat).min(3).nullish(),
  color: z.string().default("#1E40FF"),
  active: z.boolean().default(true),
  alert_on_enter: z.boolean().default(true),
  alert_on_exit: z.boolean().default(true),
});

export const GET = withApi(async (_req, ctx) => {
  if (ctx.mode === "demo") {
    return ok(demoGeofences(), { meta: { mode: "demo" } });
  }

  const { data, error } = await ctx.db
    .from("geofences")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ok(data);
});

export const POST = withApi(async (req, ctx) => {
  requireScope(ctx, "write");
  const body = createGeofenceSchema.parse(await req.json());

  if (body.kind === "circle" && (!body.center || !body.radius_m)) {
    return badRequest("circle geofences require `center` and `radius_m`");
  }
  if (body.kind === "polygon" && !body.points) {
    return badRequest("polygon geofences require `points`");
  }

  if (ctx.mode === "demo") {
    return created({ id: `geo-demo-${Date.now()}`, tenant_id: "demo", ...body, persisted: false });
  }

  const { data, error } = await ctx.db
    .from("geofences")
    .insert({ ...body, tenant_id: ctx.tenantId } as never)
    .select()
    .single();
  if (error) throw error;
  return created(data);
});
