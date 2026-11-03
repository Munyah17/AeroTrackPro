import { z } from "zod";
import { withApi } from "../_lib/handler";
import { requireScope } from "../_lib/auth";
import { created, ok, parseListParams } from "../_lib/respond";

const createDeviceSchema = z.object({
  imei: z.string().regex(/^\d{14,17}$/, "IMEI must be 14-17 digits"),
  protocol: z.enum(["gt06", "h02", "gps103", "eelink", "queclink", "meitrack", "topflytech", "vt200"]),
  device_model: z.string().min(1),
  name: z.string().min(1),
  phone_number: z.string().nullish(),
  sim_number: z.string().nullish(),
  serial_number: z.string().nullish(),
  notes: z.string().nullish(),
});

export const GET = withApi(async (req, ctx) => {
  const url = new URL(req.url);
  const { limit, page, offset } = parseListParams(url);

  const { data, error, count } = await ctx.db
    .from("devices")
    .select("*", { count: "exact" })
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return ok(data, { meta: { page, limit, total: count ?? data.length } });
});

export const POST = withApi(async (req, ctx) => {
  requireScope(ctx, "write");
  const body = createDeviceSchema.parse(await req.json());

  const { data, error } = await ctx.db
    .from("devices")
    .insert({ ...body, tenant_id: ctx.tenantId, status: "active" } as never)
    .select()
    .single();
  if (error) throw error;
  return created(data);
});
