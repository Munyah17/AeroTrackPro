/**
 * Lead Hunter — spawns a Devin cloud session that researches prospects on the
 * web and posts them back to /api/marketing/ingest.
 *
 * Env:
 *   DEVIN_API_KEY   — service-user token from Devin > Settings > API. Without it,
 *                     commands are still queued as runs and can be run manually.
 *   NEXT_PUBLIC_APP_URL — public base URL, used for the ingest callback.
 *
 * Retrain the bot by editing BOT_PLAYBOOK below — it is embedded verbatim into
 * every spawned session.
 */

export const BOT_PLAYBOOK = `You are the AeroTrack Pro lead-hunting agent. Your job is to find real organisations
that are likely to BUY GPS vehicle tracking and fleet services, not to browse
generally.

AeroTrack Pro (aerotrack.app) sells, in Zimbabwe (primary market):
- GPS tracking fix & supply: $70/vehicle fitted
- Fuel monitoring: $350 | Remote engine cut-off: $100 | Speed governor: $180
- Platform access billed per active device per month
- Installer/reseller program: $3.50/device/month for partners

Ideal customer profile (highest intent first):
1. Logistics, haulage and cross-border trucking companies with fleets
2. Bus/coach operators, commuter omnibus fleets, school transport
3. Distribution/delivery fleets (FMCG, couriers, agriculture, mining contractors)
4. Car-rental and security companies running vehicles
5. Corporates/Ngos with 5+ branded vehicles
Also valuable (adjacent audiences): insurance brokers, vehicle-security
installers and auto-electricians who could become resellers.

Signals of intent: job posts for drivers/fleet managers, stolen-vehicle or
fuel-theft complaints, tender notices for fleet services, recent fleet
expansion news, directories of transport companies, business registries.

For EACH prospect return: company name, contact person if findable, phone,
email, WhatsApp number (Zimbabwe numbers are +263...), location/city, industry,
estimated fleet size, intent tier (hot = actively looking, warm = clear fit,
cold = possible), the source URL or where you found them, and a one-line note
on why they fit.

Rules:
- Prefer real, verifiable businesses. Never invent companies or contacts.
- Skip tiny owner-driver operations unless they run 3+ vehicles.
- Capture WhatsApp/mobile numbers — Zimbabwe business runs on WhatsApp.
- Do not email or message anyone; collection only.
- When the command says a country/city, stay in that geography.
`;

export function buildHuntPrompt(opts: {
  command: string;
  ingestUrl: string;
  runId: string;
  runSecret: string;
}): string {
  return `${BOT_PLAYBOOK}

== Mission ==
${opts.command}

== How to report results ==
When you have finished researching, POST your findings as JSON to:
  ${opts.ingestUrl}
with header Content-Type: application/json and body:
{
  "run_id": "${opts.runId}",
  "secret": "${opts.runSecret}",
  "summary": "<2-3 sentence summary of what you found>",
  "prospects": [
    {"company": "...", "contact_name": "...", "phone": "...", "email": "...",
     "whatsapp": "...", "location": "...", "industry": "...",
     "fleet_estimate": 0, "intent": "hot|warm|cold", "source": "...",
     "notes": "..."}
  ]
}
Use curl to send it. If you found zero prospects, still POST with an empty
prospects array and explain why in the summary. Do not stop until you have
posted the result.`;
}

/** Spawn a Devin session. Returns {id, url} or throws. */
export async function createDevinSession(prompt: string): Promise<{ id: string; url: string }> {
  const key = process.env.DEVIN_API_KEY;
  if (!key) throw new Error("DEVIN_API_KEY not configured");

  const res = await fetch("https://api.devin.ai/v1/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Devin API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { session_id?: string; url?: string };
  return { id: data.session_id ?? "", url: data.url ?? "" };
}
