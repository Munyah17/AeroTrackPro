import { z } from "zod";
import { withApi } from "../../../_lib/handler";
import { requireScope } from "../../../_lib/auth";
import { created, notFound, ok } from "../../../_lib/respond";

/** Mirrors the DeviceCommand union in @aerotrack/protocols. */
const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("engineStop") }),
  z.object({ type: z.literal("engineResume") }),
  z.object({ type: z.literal("locate") }),
  z.object({ type: z.literal("setInterval"), seconds: z.number().int().min(5).max(86400) }),
  z.object({ type: z.literal("setOverspeed"), kmh: z.number().int().min(10).max(250) }),
  z.object({ type: z.literal("setTimezone"), utcOffsetMinutes: z.number().int().min(-720).max(840) }),
  z.object({ type: z.literal("reboot") }),
  z.object({ type: z.literal("arm") }),
  z.object({ type: z.literal("disarm") }),
  z.object({ type: z.literal("sosNumber"), slot: z.union([z.literal(1), z.literal(2), z.literal(3)]), phone: z.string().min(5) }),
  z.object({ type: z.literal("custom"), payload: z.string().min(1) }),
]);

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

  // Confirm the device belongs to this tenant before queueing.
  const { data: device } = await ctx.db
    .from("devices")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.id!)
    .maybeSingle();
  if (!device) return notFound("device");

  const { data, error } = await ctx.db
    .from("device_commands")
    .insert({ tenant_id: ctx.tenantId, device_id: device.id, command, requested_by: null })
    .select()
    .single();
  if (error) throw error;
  return created(data);
});
