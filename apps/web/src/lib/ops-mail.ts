import "server-only";

import nodemailer from "nodemailer";

/**
 * Operational email → info@aerotrack.live via the company mailbox on the
 * cPanel host. Used for new applications, payment outcomes, signup failures —
 * anything a human needs to see, separate from per-user notification prefs.
 *
 * NODE runtime only (nodemailer uses raw sockets — not edge-compatible).
 *
 * Env:
 *   SMTP_HOST   e.g. c3.my-control-panel.com
 *   SMTP_PORT   465 (SSL) or 587 (STARTTLS)
 *   SMTP_USER   mailbox, e.g. info@aerotrack.live
 *   SMTP_PASS   mailbox password
 *   OPS_EMAIL   recipient (defaults to SMTP_USER)
 */

const HOST = process.env.SMTP_HOST;
const PORT = Number(process.env.SMTP_PORT ?? 465);
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const TO = process.env.OPS_EMAIL ?? USER;

function smtpReady(): boolean {
  return Boolean(HOST && USER && PASS && TO);
}

let warned = false;

/**
 * Send a plain-text operational email. Never throws — ops mail must not break
 * the request that triggered it; failures are logged.
 */
export async function notifyOps(subject: string, body: string): Promise<void> {
  if (!smtpReady()) {
    if (!warned) {
      warned = true;
      console.warn("[ops-mail] SMTP_* env not configured — ops notifications disabled");
    }
    console.log(`[ops-mail] (no SMTP) ${subject}\n${body}`);
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465, // SSL on 465, STARTTLS on 587
      auth: { user: USER, pass: PASS },
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transporter.sendMail({
      from: `AeroTrack Pro <${USER}>`,
      to: TO,
      subject: `[AeroTrack] ${subject}`,
      text: body,
    });
  } catch (err) {
    console.error(
      "[ops-mail] send failed:",
      err instanceof Error ? err.message : err,
    );
  }
}
