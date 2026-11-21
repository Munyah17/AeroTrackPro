import "server-only";

/**
 * Card checkout through Stripe — pure fetch, no SDK, mirroring lib/paynow.
 *
 * Initiate: POST /v1/checkout/sessions → hosted checkout URL. The customer
 * pays on stripe.com, then lands back on /apply/thanks. We confirm by
 * retrieving the session (id stored in payments.poll_url as `stripe:<id>`).
 *
 * Env: STRIPE_SECRET_KEY (sk_live_… / sk_test_…), NEXT_PUBLIC_APP_URL.
 */

const KEY = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return Boolean(KEY);
}

export interface StripeSessionResult {
  ok: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export async function createCheckoutSession(opts: {
  reference: string;
  amount: number;
  email: string;
  description: string;
}): Promise<StripeSessionResult> {
  if (!stripeConfigured()) {
    return { ok: false, error: "card payments not configured (STRIPE_SECRET_KEY)" };
  }
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${APP_URL}/apply/thanks?ref=${encodeURIComponent(opts.reference)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/apply?ref=${encodeURIComponent(opts.reference)}`,
    client_reference_id: opts.reference,
    customer_email: opts.email,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(Math.round(opts.amount * 100)),
    "line_items[0][price_data][product_data][name]": opts.description.slice(0, 250),
    "payment_intent_data[metadata][reference]": opts.reference,
    "metadata[reference]": opts.reference,
  });
  try {
    const res = await fetch(`${API}/checkout/sessions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${KEY}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json();
    if (res.ok && data.id && data.url) {
      return { ok: true, sessionId: data.id, url: data.url };
    }
    return { ok: false, error: data.error?.message ?? `stripe ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "stripe unreachable" };
  }
}

export interface StripeSessionStatus {
  ok: boolean;
  /** 'paid' | 'open' | 'expired' */
  state: "paid" | "open" | "expired" | "unknown";
  raw?: string;
}

export async function retrieveCheckoutSession(id: string): Promise<StripeSessionStatus> {
  if (!stripeConfigured()) return { ok: false, state: "unknown", raw: "not configured" };
  try {
    const res = await fetch(`${API}/checkout/sessions/${encodeURIComponent(id)}`, {
      headers: { authorization: `Bearer ${KEY}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, state: "unknown", raw: data.error?.message ?? `stripe ${res.status}` };
    return {
      ok: true,
      state:
        data.payment_status === "paid" ? "paid"
        : data.status === "expired" ? "expired"
        : "open",
      raw: `${data.status}/${data.payment_status}`,
    };
  } catch {
    return { ok: false, state: "unknown", raw: "retrieve failed" };
  }
}
