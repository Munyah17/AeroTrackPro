import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/server";
import { apiError, badRequest, ok } from "../../_lib/respond";

/**
 * Public coupon redemption — called by a fuel station after scanning the QR.
 * No API key required: the coupon code itself is the bearer secret. Redemption
 * is atomic via the redeem_fuel_coupon() SECURITY DEFINER function.
 */
const redeemSchema = z.object({
  code: z.string().min(4),
  station: z.string().min(1),
  litres: z.number().positive().nullish(),
  amount_usd: z.number().positive().nullish(),
  ref: z.string().max(120).nullish(),
});

const ERROR_MAP: Record<string, { status: number; message: string }> = {
  invalid_code: { status: 404, message: "Coupon not found" },
  already_redeemed: { status: 409, message: "This coupon has already been redeemed" },
  expired: { status: 409, message: "This coupon has expired" },
  not_active: { status: 409, message: "This coupon is not active" },
};

/** GET /api/v1/coupons/redeem?code=... — look a coupon up before redeeming. */
export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return badRequest("code query parameter is required");

  if (!isServiceRoleConfigured()) {
    return ok(
      { code, amount_usd: 50, litres: null, fuel_type: "diesel", status: "active", expires_at: null },
      { meta: { mode: "demo" } },
    );
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("fuel_coupons")
    .select("code, amount_usd, litres, fuel_type, status, expires_at, redeemed_at, redeemed_station")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return apiError(404, "not_found", "Coupon not found");
  return ok(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = redeemSchema.parse(await req.json());

    if (!isServiceRoleConfigured()) {
      return ok({
        code: body.code,
        status: "redeemed",
        redeemed_station: body.station,
        redeemed_at: new Date().toISOString(),
        persisted: false,
      });
    }

    const db = createAdminClient();
    const { data, error } = await db.rpc("redeem_fuel_coupon", {
      p_code: body.code,
      p_station: body.station,
      p_litres: body.litres ?? undefined,
      p_amount: body.amount_usd ?? undefined,
      p_ref: body.ref ?? undefined,
    });

    if (error) {
      const mapped = ERROR_MAP[error.message];
      if (mapped) return apiError(mapped.status, error.message, mapped.message);
      throw error;
    }
    return ok(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return badRequest(err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    }
    console.error("[coupons/redeem] error:", err);
    return NextResponse.json({ error: { code: "server_error", message: "Redemption failed" } }, { status: 500 });
  }
}
