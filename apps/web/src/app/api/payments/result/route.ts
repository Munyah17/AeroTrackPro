import { NextResponse } from "next/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/server";
import { notifyOps } from "@/lib/ops-mail";
import { verifyResultHash } from "@/lib/paynow";

/*
 * Gateway result callback (resulturl). The provider server-posts the final
 * status for a mobile payment — reference, amount, status, hash.
 * We verify the signature, update the payment row, and mail ops on the
 * outcome (paid or failed — both are "important notifications").
 */

export const runtime = "nodejs";

export async function POST(req: Request) {
  const text = await req.text();
  // posted as application/x-www-form-urlencoded — keep field ORDER for the hash
  const fields: [string, string][] = text
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf("=");
      return [
        decodeURIComponent(pair.slice(0, i)),
        decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " ")),
      ];
    });
  const data = Object.fromEntries(fields);

  if (!verifyResultHash(fields, data.hash ?? "")) {
    console.warn("[payments/result] bad hash — ignored");
    return NextResponse.json({ ok: true }); // always 200: never leak validity to an attacker
  }

  if (!isServiceRoleConfigured()) return NextResponse.json({ ok: true });
  const db = createAdminClient();

  const reference = data.reference;
  const gatewayStatus = data.status ?? "unknown";
  const paid = gatewayStatus.toLowerCase() === "paid";
  const failed = ["failed", "cancelled", "disputed"].includes(gatewayStatus.toLowerCase());
  const status = paid ? "paid" : failed ? "failed" : "awaiting_customer";

  const { data: payment } = await db
    .from("payments")
    .update({ status, gateway_status: gatewayStatus, updated_at: new Date().toISOString() })
    .eq("reference", reference)
    .select("amount, method, payer_phone")
    .maybeSingle();

  if (paid || failed) {
    await notifyOps(
      paid ? "Payment RECEIVED" : "Payment FAILED",
      `Reference: ${reference}\n` +
        `Amount: $${payment?.amount ?? data.amount ?? "?"}\n` +
        `Method: ${payment?.method ?? "mobile money"}\n` +
        `Payer: ${payment?.payer_phone ?? "—"}\n` +
        `Gateway status: ${gatewayStatus}`,
    );
  }

  return NextResponse.json({ ok: true });
}
