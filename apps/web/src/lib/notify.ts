import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@aerotrack/shared";
import { defaultPrefs, eventDef, type NotifyEventType } from "@/lib/notify-events";

/**
 * Notification dispatch — the single funnel every event goes through.
 *
 * notifyEvent() loads the tenant's active users, applies each user's saved
 * channel preference for the event (defaulting to the catalog defaults:
 * in-app on, email/SMS opt-in), then:
 *   1. inserts an in-app `notifications` row,
 *   2. sends email via Resend (RESEND_API_KEY + RESEND_FROM),
 *   3. sends SMS via Twilio REST (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
 *      TWILIO_FROM_NUMBER),
 *   4. records every attempted send in `notification_deliveries`.
 *
 * Fetch-only so it runs in edge route handlers (telemetry, webhooks).
 */

type Db = SupabaseClient<Database>;
type DeliveryInsert =
  Database["public"]["Tables"]["notification_deliveries"]["Insert"];
type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

export interface NotifyPayload {
  title: string;
  body: string;
  link?: string;
}

interface SendResult {
  ok: boolean;
  detail?: string;
}

// ---------------------------------------------------------------- providers

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "AeroTrack <onboarding@resend.dev>";

async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  if (!RESEND_API_KEY) return { ok: false, detail: "RESEND_API_KEY not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, text }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, detail: `resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "email send failed" };
  }
}

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

async function sendSms(to: string, text: string): Promise<SendResult> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    return { ok: false, detail: "Twilio env not configured (TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER)" };
  }
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: text.slice(0, 480) }),
      },
    );
    if (res.ok) return { ok: true };
    return { ok: false, detail: `twilio ${res.status}: ${(await res.text()).slice(0, 300)}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "sms send failed" };
  }
}

// ---------------------------------------------------------------- dispatch

export async function notifyEvent(
  db: Db,
  tenantId: string,
  event: NotifyEventType,
  payload: NotifyPayload,
): Promise<void> {
  try {
    const [usersRes, prefsRes] = await Promise.all([
      db
        .from("users")
        .select("id, email, phone")
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      db
        .from("notification_preferences")
        .select("user_id, in_app_enabled, email_enabled, sms_enabled")
        .eq("tenant_id", tenantId)
        .eq("event_type", event),
    ]);
    if (usersRes.error) {
      console.error(`[notify:${event}] users lookup failed:`, usersRes.error.message);
      return;
    }

    const prefsByUser = new Map(
      (prefsRes.data ?? []).map((p) => [p.user_id, p] as const),
    );
    const label = eventDef(event)?.label ?? event;

    const inAppRows: NotificationInsert[] = [];
    const deliveries: DeliveryInsert[] = [];
    const sends: Promise<void>[] = [];

    for (const user of usersRes.data ?? []) {
      const pref = prefsByUser.get(user.id);
      const inApp = pref?.in_app_enabled ?? defaultPrefs(event).in_app_enabled;
      const email = pref?.email_enabled ?? defaultPrefs(event).email_enabled;
      const sms = pref?.sms_enabled ?? defaultPrefs(event).sms_enabled;

      if (inApp) {
        inAppRows.push({
          tenant_id: tenantId,
          user_id: user.id,
          type: event,
          title: payload.title,
          body: payload.body,
          link: payload.link ?? null,
        });
        deliveries.push({
          tenant_id: tenantId, user_id: user.id, event_type: event,
          channel: "in_app", destination: null, status: "sent", detail: null,
        });
      }

      if (email && user.email) {
        const dest = user.email;
        sends.push(
          sendEmail(dest, `[AeroTrack] ${payload.title}`, `${payload.body}\n\n— AeroTrack`)
            .then((r) => {
              deliveries.push({
                tenant_id: tenantId, user_id: user.id, event_type: event,
                channel: "email", destination: dest,
                status: r.ok ? "sent" : "failed", detail: r.detail ?? null,
              });
            }),
        );
      }

      if (sms && user.phone) {
        const dest = user.phone;
        sends.push(
          sendSms(dest, `${label}: ${payload.body}`).then((r) => {
            deliveries.push({
              tenant_id: tenantId, user_id: user.id, event_type: event,
              channel: "sms", destination: dest,
              status: r.ok ? "sent" : "failed", detail: r.detail ?? null,
            });
          }),
        );
      }
    }

    if (inAppRows.length > 0) {
      const { error } = await db.from("notifications").insert(inAppRows);
      if (error) console.error(`[notify:${event}] in-app insert failed:`, error.message);
    }

    await Promise.allSettled(sends);

    if (deliveries.length > 0) {
      const { error } = await db.from("notification_deliveries").insert(deliveries);
      if (error) console.error(`[notify:${event}] delivery log failed:`, error.message);
    }
  } catch (err) {
    // Notifications must never break the trigger (ingest, redemption, etc.).
    console.error(`[notify:${event}] dispatch failed:`, err instanceof Error ? err.message : err);
  }
}
