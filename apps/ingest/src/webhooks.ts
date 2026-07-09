/**
 * Webhook fan-out: POSTs tenant-subscribed events with an HMAC-SHA256
 * signature header so receivers can verify authenticity.
 */

import { createHmac } from "crypto";
import { db } from "./db";

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  secret: string;
}

const cache = new Map<string, { rows: WebhookRow[]; fetchedAt: number }>();
const CACHE_TTL_MS = 60_000;

async function webhooksFor(tenantId: string): Promise<WebhookRow[]> {
  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.rows;

  const { data } = await db()
    .from("webhooks")
    .select("id, url, events, secret")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  const rows = (data ?? []) as WebhookRow[];
  cache.set(tenantId, { rows, fetchedAt: Date.now() });
  return rows;
}

export type WebhookEvent = "position.created" | "alert.created" | "command.acked";

export async function dispatchWebhooks(tenantId: string, event: WebhookEvent, payload: unknown) {
  let hooks: WebhookRow[];
  try {
    hooks = await webhooksFor(tenantId);
  } catch {
    return;
  }

  const matching = hooks.filter((h) => h.events.includes(event) || h.events.includes("*"));
  if (matching.length === 0) return;

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

  await Promise.allSettled(
    matching.map(async (hook) => {
      const signature = createHmac("sha256", hook.secret).update(body).digest("hex");
      const res = await fetch(hook.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-aerotrack-event": event,
          "x-aerotrack-signature": `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        console.warn(`[webhooks] ${hook.url} responded ${res.status} for ${event}`);
      }
    }),
  );
}
