import { z } from "zod";
import { withApi } from "../_lib/handler";
import { requireScope } from "../_lib/auth";
import { badRequest, created, ok, parseListParams } from "../_lib/respond";

/** Random human-readable coupon code, e.g. ATF-8H2K4M9P. */
function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `ATF-${s}`;
}

const issueSchema = z
  .object({
    amount_usd: z.number().positive().nullish(),
    litres: z.number().positive().nullish(),
    fuel_type: z.enum(["diesel", "petrol", "any"]).default("diesel"),
    driver_id: z.string().uuid().nullish(),
    vehicle_id: z.string().uuid().nullish(),
    expires_at: z.string().datetime().nullish(),
    notes: z.string().max(280).nullish(),
    quantity: z.number().int().min(1).max(100).default(1),
  })
  .refine((v) => v.amount_usd != null || v.litres != null, {
    message: "Provide either amount_usd or litres",
  });

const DEMO_COUPONS = [
  { id: "cpn-1", code: "ATF-8H2K4M9P", amount_usd: 50, litres: null, fuel_type: "diesel", status: "active", expires_at: null, redeemed_at: null },
  { id: "cpn-2", code: "ATF-3N7Q1R5T", amount_usd: 40, litres: null, fuel_type: "diesel", status: "active", expires_at: null, redeemed_at: null },
  { id: "cpn-3", code: "ATF-1X5Y8Z2W", amount_usd: null, litres: 40, fuel_type: "diesel", status: "redeemed", expires_at: null, redeemed_at: new Date().toISOString() },
];

const COUPON_STATUSES = ["active", "redeemed", "expired", "void"] as const;
type CouponStatus = (typeof COUPON_STATUSES)[number];

export const GET = withApi(async (req, ctx) => {
  const url = new URL(req.url);
  const raw = url.searchParams.get("status");
  const status = COUPON_STATUSES.includes(raw as CouponStatus) ? (raw as CouponStatus) : null;
  const { limit, offset } = parseListParams(url, { limit: 50 });

  if (ctx.mode === "demo") {
    const rows = status ? DEMO_COUPONS.filter((c) => c.status === status) : DEMO_COUPONS;
    return ok(rows, { meta: { mode: "demo" } });
  }

  let q = ctx.db
    .from("fuel_coupons")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) throw error;
  return ok(data);
});

export const POST = withApi(async (req, ctx) => {
  requireScope(ctx, "write");
  const body = issueSchema.parse(await req.json());
  const { quantity, ...coupon } = body;

  if (ctx.mode === "demo") {
    return created(
      Array.from({ length: quantity }, () => ({
        id: `cpn-demo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        code: generateCode(),
        ...coupon,
        status: "active",
        persisted: false,
      })),
    );
  }

  const rows = Array.from({ length: quantity }, () => ({
    ...coupon,
    code: generateCode(),
    tenant_id: ctx.tenantId,
  }));

  const { data, error } = await ctx.db.from("fuel_coupons").insert(rows as never).select();
  if (error) {
    if (error.code === "23505") return badRequest("code collision, please retry");
    throw error;
  }
  return created(data);
});
