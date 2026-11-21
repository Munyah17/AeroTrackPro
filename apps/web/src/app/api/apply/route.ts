import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/server";
import { notifyOps } from "@/lib/ops-mail";
import { quoteServices, SERVICES, type ServiceKey } from "@/lib/pricing";
import { initiateHostedPayment } from "@/lib/paynow";
import { createCheckoutSession } from "@/lib/stripe";

/*
 * Public service application → lead + payment initiation.
 *
 * Payment paths:
 *   paynow → hosted Paynow checkout (EcoCash / OneMoney / InnBucks / O'mari /
 *            ZIPIT / cards); browserurl returned for redirect, confirmed by
 *            /api/payments/result + /api/payments/status
 *   stripe_card → hosted Stripe Checkout; session id stored in poll_url as
 *                 stripe:<id>, confirmed by /api/payments/status
 *   bank_transfer | direct_transfer → manual; the applicant submits their
 *                                     transaction reference (and sender name
 *                                     for EcoCash P2P), status pending_review
 *
 * Amounts are quoted server-side from lib/pricing — the client never sets
 * the price. Quoted items (dashcam) are recorded but excluded from the
 * collectable amount.
 */

// nodemailer + crypto — must run on the Node runtime, not edge.
export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(24),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  fleetSize: z.coerce.number().int().min(1).max(10000).optional(),
  services: z.array(z.string()).min(1, "Select at least one service"),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  payment: z.object({
    method: z.enum(["paynow", "stripe_card", "bank_transfer", "direct_transfer"]),
    txnReference: z.string().trim().min(3).max(80).optional(),
    senderName: z.string().trim().min(2).max(120).optional(),
  }),
});

const METHOD_LABEL: Record<string, string> = {
  paynow: "Paynow",
  stripe_card: "Card (Stripe)",
  bank_transfer: "Bank transfer",
  direct_transfer: "EcoCash / InnBucks direct transfer",
};

function ref(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `AT-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const BANK_INSTRUCTIONS = (amount: number, reference: string) =>
  `Transfer $${amount.toFixed(2)} to:\n` +
  `Account Name: Solabliss Zimbabwe Pvt Ltd\n` +
  `Bank: FBC Bank\n` +
  `Branch: FBC Center Branch\n` +
  `USD Account: 6870465460146\n` +
  `Reference: ${reference}`;

const DIRECT_INSTRUCTIONS = (amount: number, reference: string) =>
  `Send $${amount.toFixed(2)} via EcoCash or InnBucks to:\n` +
  `Number: +263 77 390 9307\n` +
  `Name: Munyaradzi J Muzvidziwa\n` +
  `Reference: ${reference}`;

const POP_NOTE =
  "\n\nAfter paying, send your proof of payment on WhatsApp to +263 71 856 0128 " +
  "with your name, email, phone and transaction reference — we'll activate your " +
  "account as soon as it's confirmed.";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "invalid submission" },
      { status: 400 },
    );
  }
  const v = parsed.data;

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: "service unavailable" }, { status: 503 });
  }
  const db = createAdminClient();

  const quote = quoteServices(v.services);
  if (quote.items.length === 0 && quote.quotedItems.length === 0) {
    return NextResponse.json({ ok: false, error: "no valid services selected" }, { status: 400 });
  }

  const manual = v.payment.method === "bank_transfer" || v.payment.method === "direct_transfer";
  if (manual && !v.payment.txnReference) {
    return NextResponse.json(
      { ok: false, error: "transaction reference required for manual payments" },
      { status: 400 },
    );
  }
  if (v.payment.method === "direct_transfer" && !v.payment.senderName) {
    return NextResponse.json(
      { ok: false, error: "sender name required — it must match the name on the mobile money transfer" },
      { status: 400 },
    );
  }

  const { data: lead, error: leadErr } = await db
    .from("leads")
    .insert({
      name: v.name,
      email: v.email || null,
      phone: v.phone,
      company: v.company || null,
      fleet_size: v.fleetSize ?? null,
      services: v.services.filter((s): s is ServiceKey => s in SERVICES),
      message: v.message || null,
    })
    .select("id")
    .single();
  if (leadErr || !lead) {
    console.error("[apply] lead insert failed:", leadErr?.message);
    return NextResponse.json({ ok: false, error: "could not record application" }, { status: 500 });
  }

  const reference = ref();
  const quotedNote = quote.quotedItems.length
    ? `\nQuoted separately: ${quote.quotedItems.map((q) => q.name).join(", ")} — we will contact you with pricing.`
    : "";

  let status = "pending_review";
  let instructions: string;
  let pollUrl: string | null = null;
  let checkoutUrl: string | undefined;

  if (manual) {
    instructions =
      (v.payment.method === "bank_transfer"
        ? BANK_INSTRUCTIONS(quote.total, reference)
        : DIRECT_INSTRUCTIONS(quote.total, reference)) + quotedNote + POP_NOTE;
  } else if (quote.total <= 0) {
    instructions = "Your application is saved — we will confirm pricing and send a secure payment link." + quotedNote;
  } else if (v.payment.method === "stripe_card") {
      const session = await createCheckoutSession({
        reference,
        amount: quote.total,
        email: v.email || `${v.phone.replace(/\D/g, "")}@aerotrack.live`,
        description: `AeroTrack services — ${quote.items.map((i) => i.name).join(", ")}`,
      });
      if (!session.ok || !session.url || !session.sessionId) {
        await db.from("payments").insert({
          lead_id: lead.id,
          reference,
          amount: quote.total,
          method: v.payment.method,
          channel: "online",
          status: "failed",
          gateway_status: session.error ?? "session create failed",
        });
        await notifyOps(
          "Payment initiation FAILED",
          `Application ${reference} — ${v.name} (${v.phone})\n` +
            `Method: Card (Stripe) — Amount: $${quote.total.toFixed(2)}\n` +
            `Gateway error: ${session.error}`,
        );
        return NextResponse.json(
          { ok: false, error: "card checkout is unavailable right now — please choose Paynow or a manual method" },
          { status: 502 },
        );
      }
      status = "awaiting_customer";
      pollUrl = `stripe:${session.sessionId}`;
      checkoutUrl = session.url;
      instructions = `Complete the secure card payment of $${quote.total.toFixed(2)} on Stripe.${quotedNote}`;
  } else {
    // paynow — hosted checkout
    const init = await initiateHostedPayment({
      reference,
      amount: quote.total,
      email: v.email || `${v.phone.replace(/\D/g, "")}@aerotrack.live`,
      description: `AeroTrack services — ${quote.items.map((i) => i.name).join(", ")}`,
    });
    if (!init.ok || !init.browserUrl) {
      await db.from("payments").insert({
        lead_id: lead.id,
        reference,
        amount: quote.total,
        method: v.payment.method,
        channel: "online",
        status: "failed",
        gateway_status: init.error ?? "initiate failed",
      });
      await notifyOps(
        "Payment initiation FAILED",
        `Application ${reference} — ${v.name} (${v.phone})\n` +
          `Method: Paynow — Amount: $${quote.total.toFixed(2)}\n` +
          `Gateway error: ${init.error}`,
      );
      return NextResponse.json(
        { ok: false, error: "could not start the online payment — please try a manual method or contact us" },
        { status: 502 },
      );
    }
    status = "awaiting_customer";
    pollUrl = init.pollUrl ?? null;
    checkoutUrl = init.browserUrl;
    instructions = `Complete the payment of $${quote.total.toFixed(2)} on Paynow.${quotedNote}`;
  }

  const { error: payErr } = await db.from("payments").insert({
    lead_id: lead.id,
    reference,
    amount: quote.total,
    method: v.payment.method,
    channel: manual ? "manual" : "online",
    status,
    txn_reference: v.payment.txnReference ?? null,
    sender_name: v.payment.senderName ?? null,
    poll_url: pollUrl,
    instructions,
  });
  if (payErr) console.error("[apply] payment insert failed:", payErr.message);

  // Stripe already knows its URL; the client redirects there next.

  await notifyOps(
    "New application received",
    `Reference: ${reference}\n` +
      `Name: ${v.name}\nPhone: ${v.phone}\nEmail: ${v.email || "—"}\n` +
      `Company: ${v.company || "—"}\nFleet size: ${v.fleetSize ?? "—"}\n` +
      `Services: ${quote.items.map((i) => `${i.name} ($${i.price})`).join(", ")}` +
      `${quote.quotedItems.length ? ` | quoted: ${quote.quotedItems.map((q) => q.name).join(", ")}` : ""}\n` +
      `Amount due now: $${quote.total.toFixed(2)}\n` +
      `Payment method: ${METHOD_LABEL[v.payment.method]} (${manual ? "manual" : "online"})\n` +
      (v.payment.txnReference ? `Transaction ref: ${v.payment.txnReference}\n` : "") +
      (v.payment.senderName ? `Sender name: ${v.payment.senderName}\n` : "") +
      (v.message ? `Message: ${v.message}\n` : ""),
  );

  return NextResponse.json({
    ok: true,
    reference,
    amount: quote.total,
    status,
    instructions,
    checkoutUrl,
    quotedItems: quote.quotedItems.map((q) => q.name),
  });
}
