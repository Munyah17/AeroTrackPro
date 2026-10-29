import { NextResponse } from "next/server";
import {
  resolveBridgeDevice,
  verifyForwardSecret,
  type TraccarDevice,
  type TraccarEvent,
} from "@/lib/traccar";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/server";

/**
 * Traccar event-webhook endpoint for device connectivity heartbeats.
 *
 * traccar.xml on the hardware VPS:
 *   <entry key='event.forward.enable'>true</entry>
 *   <entry key='event.forward.url'>https://app.example.com/api/webhooks/status?key=SECRET</entry>
 *
 * Traccar POSTs { event: { type, deviceId, eventTime, ... }, device? } for
 * every event. We only act on deviceOnline / deviceOffline (the heartbeat
 * signal that replaces a Node.js cron sweep); all other event types are
 * acknowledged and ignored so the forward doesn't stall.
 */
const HANDLED = new Set(["deviceOnline", "deviceOffline"]);

// Vercel Edge: lightweight status updates belong at the edge.
export const runtime = "edge";

export async function POST(req: Request): Promise<Response> {
  if (!verifyForwardSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: "Supabase service role not configured" }, { status: 503 });
  }

  let body: { event?: TraccarEvent; device?: TraccarDevice } | TraccarEvent;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // Traccar wraps the event ({event, device?}); accept a bare event too.
  const event =
    "event" in body && body.event ? body.event : (body as TraccarEvent);
  const traccarDevice = "device" in body ? body.device : undefined;

  if (!event?.type || !HANDLED.has(event.type)) {
    return NextResponse.json({ handled: false, type: event?.type ?? null });
  }

  const bridge = await resolveBridgeDevice({
    traccarId: event.deviceId,
    uniqueId: traccarDevice?.uniqueId,
  });
  if (!bridge) {
    return NextResponse.json({
      handled: false,
      type: event.type,
      reason: "no device row matches traccar_id or uniqueId",
    });
  }

  const { error } = await createAdminClient()
    .from("devices")
    .update({
      connection_status: event.type === "deviceOnline" ? "online" : "offline",
      last_seen_at: event.eventTime ?? new Date().toISOString(),
    })
    .eq("id", bridge.id);

  if (error) {
    console.error("[traccar/status] device update failed:", error.message);
    return NextResponse.json(
      { error: "device update failed", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    handled: true,
    type: event.type,
    device: bridge.imei,
    connection_status: event.type === "deviceOnline" ? "online" : "offline",
  });
}
