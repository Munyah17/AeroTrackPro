import { z } from "zod";
import { withApi } from "../_lib/handler";
import { requireScope } from "../_lib/auth";
import { created, ok, parseListParams } from "../_lib/respond";
import { demoVehicles } from "../_lib/demo";

const createVehicleSchema = z.object({
  plate: z.string().min(1),
  name: z.string().min(1),
  device_id: z.string().uuid().nullish(),
  make: z.string().nullish(),
  model: z.string().nullish(),
  year: z.number().int().min(1950).max(2100).nullish(),
  vin: z.string().nullish(),
  status: z.enum(["active", "inactive", "maintenance", "sold"]).default("active"),
  color: z.string().nullish(),
  group_name: z.string().nullish(),
  fuel_type: z.string().nullish(),
  fuel_capacity_liters: z.number().nonnegative().nullish(),
  odometer_km: z.number().nonnegative().nullish(),
  speed_limit_kmh: z.number().int().positive().nullish(),
  notes: z.string().nullish(),
});

export const GET = withApi(async (req, ctx) => {
  const url = new URL(req.url);
  const { limit, page, offset } = parseListParams(url);
  const status = z
    .enum(["active", "inactive", "maintenance", "sold"])
    .nullish()
    .parse(url.searchParams.get("status"));
  const q = url.searchParams.get("q")?.toLowerCase();

  if (ctx.mode === "demo") {
    let rows = demoVehicles();
    if (status) rows = rows.filter((v) => v.status === status);
    if (q) rows = rows.filter((v) => `${v.plate} ${v.name} ${v.make} ${v.model}`.toLowerCase().includes(q));
    const total = rows.length;
    return ok(rows.slice(offset, offset + limit), { meta: { page, limit, total, mode: "demo" } });
  }

  let query = ctx.db
    .from("vehicles")
    .select("*", { count: "exact" })
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`plate.ilike.%${q}%,name.ilike.%${q}%,make.ilike.%${q}%,model.ilike.%${q}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return ok(data, { meta: { page, limit, total: count ?? data.length } });
});

export const POST = withApi(async (req, ctx) => {
  requireScope(ctx, "write");
  const body = createVehicleSchema.parse(await req.json());

  if (ctx.mode === "demo") {
    return created({ id: `veh-demo-${Date.now()}`, tenant_id: "demo", ...body, persisted: false });
  }

  const { data, error } = await ctx.db
    .from("vehicles")
    .insert({ ...body, tenant_id: ctx.tenantId } as never)
    .select()
    .single();
  if (error) throw error;
  return created(data);
});
