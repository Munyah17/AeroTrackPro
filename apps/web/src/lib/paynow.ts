import "server-only";

import { createHash } from "node:crypto";

/**
 * Mobile-money collection (EcoCash / OneMoney / InnBucks) through our merchant
 * gateway. Pure fetch + SHA512 — no SDK.
 *
 * Initiate: POST form to the merchant interface; returns url-encoded
 *   status=Ok&browserurl=...&pollurl=...&hash=...
 * The customer then approves a USSD push on their handset; we confirm by
 * polling pollUrl until it reports Paid/Failed/Cancelled. The provider also
 * server-posts the result to `resulturl` for redundancy.
 *
 * Env: PAYNOW_INTEGRATION_ID, PAYNOW_INTEGRATION_KEY, NEXT_PUBLIC_APP_URL.
 */

const ID = process.env.PAYNOW_INTEGRATION_ID;
const KEY = process.env.PAYNOW_INTEGRATION_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const MOBILE_METHODS = ["ecocash", "onemoney", "innbucks"] as const;
export type MobileMethod = (typeof MOBILE_METHODS)[number];

export function gatewayConfigured(): boolean {
  return Boolean(ID && KEY);
}

/** SHA512 of ordered values + integration key, uppercase hex — per spec. */
function hash(values: string[]): string {
  return createHash("sha512")
    .update(values.join("") + KEY)
    .digest("hex")
    .toUpperCase();
}

function parseForm(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of body.split("&")) {
    const i = pair.indexOf("=");
    if (i < 0) continue;
    out[pair.slice(0, i)] = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " "));
  }
  return out;
}

export interface InitiateResult {
  ok: boolean;
  pollUrl?: string;
  instructions?: string;
  error?: string;
  raw?: Record<string, string>;
}

export async function initiateMobilePayment(opts: {
  reference: string;
  amount: number;
  email: string;
  phone: string;
  method: MobileMethod;
  description: string;
}): Promise<InitiateResult> {
  if (!gatewayConfigured()) {
    return { ok: false, error: "payment gateway not configured (PAYNOW_INTEGRATION_ID/KEY)" };
  }
  const fields: [string, string][] = [
    ["id", ID!],
    ["reference", opts.reference],
    ["amount", opts.amount.toFixed(2)],
    ["additionalinfo", opts.description.slice(0, 255)],
    ["returnurl", `${APP_URL}/apply/thanks?ref=${encodeURIComponent(opts.reference)}`],
    ["resulturl", `${APP_URL}/api/payments/result`],
    ["authemail", opts.email || "customer@aerotrack.live"],
    ["phone", opts.phone],
    ["method", opts.method],
    ["status", "Message"],
  ];
  const body = new URLSearchParams([...fields, ["hash", hash(fields.map(([, v]) => v))]]);
  try {
    const res = await fetch("https://www.paynow.co.zw/interface/initiatetransaction", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const data = parseForm(await res.text());
    if (data.status === "Ok" && data.pollurl) {
      return { ok: true, pollUrl: data.pollurl, instructions: data.instructions, raw: data };
    }
    return { ok: false, error: data.error ?? `gateway status ${data.status ?? res.status}`, raw: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "gateway unreachable" };
  }
}

export interface PollResult {
  status: "paid" | "sent" | "failed" | "cancelled" | "unknown";
  gatewayStatus: string;
  raw: Record<string, string>;
}

export async function pollPayment(pollUrl: string): Promise<PollResult> {
  try {
    const res = await fetch(pollUrl, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    const data = parseForm(await res.text());
    const s = (data.status ?? "").toLowerCase();
    return {
      status: s === "paid" ? "paid"
        : s === "awaiting delivery" || s === "sent" ? "sent"
        : s === "cancelled" ? "cancelled"
        : s === "failed" || s === "disputed" ? "failed"
        : "unknown",
      gatewayStatus: data.status ?? "unknown",
      raw: data,
    };
  } catch {
    return { status: "unknown", gatewayStatus: "poll failed", raw: {} };
  }
}

/**
 * Verify the hash on an inbound result callback. The provider signs the
 * posted fields with our integration key — order is the received order minus
 * the hash itself.
 */
export function verifyResultHash(fields: [string, string][], received: string): boolean {
  if (!KEY) return false;
  const values = fields.filter(([k]) => k.toLowerCase() !== "hash").map(([, v]) => v);
  return hash(values) === received.toUpperCase();
}
