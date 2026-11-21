import { NextResponse } from "next/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/server";
import { pollPayment } from "@/lib/paynow";
import { retrieveCheckoutSession } from "@/lib/stripe";
import { notifyOps } from "@/lib/ops-mail";

/*
 * GET /api/payments/status?ref=AT-… — polled by the apply form while a mobile
 * payment awaits handset approval. If the row is still open we poll the
 * gateway ourselves (their result callback is a backup), update the row, and
 * mail ops once on a terminal outcome.
 */

export const runtime = "nodejs";

const TERMINAL = new Set(["paid", "failed", "cancelled"]);

export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref");
  if (!ref) return NextResponse.json({ ok: false, error: "ref required" }, { status: 400 });
  if (!isServiceRoleConfigured()) return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });

  const db = createAdminClient();
  const { data: payment } = await db
    .from("payments")
    .select("status, poll_url, gateway_status, amount, method, payer_phone")
    .eq("reference", ref)
    .maybeSingle();
  if (!payment) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  let status = payment.status;
  let gatewayStatus = payment.gateway_status;

  if (!TERMINAL.has(status) && payment.poll_url) {
    let next = status;
    if (payment.poll_url.startsWith("stripe:")) {
      const session = await retrieveCheckoutSession(payment.poll_url.slice(7));
      gatewayStatus = session.raw ?? gatewayStatus;
      next =
        session.state === "paid" ? "paid"
        : session.state === "expired" ? "cancelled"
        : status;
    } else {
      const poll = await pollPayment(payment.poll_url);
      gatewayStatus = poll.gatewayStatus;
      next =
        poll.status === "paid" ? "paid"
        : poll.status === "failed" ? "failed"
        : poll.status === "cancelled" ? "cancelled"
        : status;
    }
    if (next !== status || gatewayStatus !== payment.gateway_status) {
      status = next;
      await db
        .from("payments")
        .update({ status, gateway_status: gatewayStatus, updated_at: new Date().toISOString() })
        .eq("reference", ref);
      if (status === "paid" || status === "failed") {
        await notifyOps(
          status === "paid" ? "Payment RECEIVED" : "Payment FAILED",
          `Reference: ${ref}\nAmount: $${payment.amount}\nMethod: ${payment.method}\n` +
            `Payer: ${payment.payer_phone ?? "—"}\nGateway status: ${gatewayStatus}`,
        );
      }
    }
  }

  return NextResponse.json({ ok: true, status, gatewayStatus });
}
