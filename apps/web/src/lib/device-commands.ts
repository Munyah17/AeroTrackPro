import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@aerotrack/shared";
import { z } from "zod";
import { sendTraccarCommand, traccarConfigured } from "@/lib/traccar";

/**
 * Shared command plumbing for the two command entry points:
 *
 *   POST /api/commands                  app UI — cookie session
 *   POST /api/v1/devices/:id/commands   REST API — atk_ key
 *
 * Both persist an audit row in device_commands first, then attempt an
 * immediate Traccar dispatch. If Traccar isn't configured or the device
 * isn't linked yet (traccar_id is learned on the first forwarded fix),
 * the row stays 'pending' — queued for a later ingest-side downlink.
 */

/** Mirrors the DeviceCommand union in @aerotrack/protocols core/types. */
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("engineStop") }),
  z.object({ type: z.literal("engineResume") }),
  z.object({ type: z.literal("locate") }),
  z.object({ type: z.literal("setInterval"), seconds: z.number().int().min(5).max(86400) }),
  z.object({ type: z.literal("setOverspeed"), kmh: z.number().int().min(10).max(250) }),
  z.object({ type: z.literal("setTimezone"), utcOffsetMinutes: z.number().int().min(-720).max(840) }),
  z.object({ type: z.literal("setApn"), apn: z.string().min(1), user: z.string().optional(), password: z.string().optional() }),
  z.object({ type: z.literal("setServer"), host: z.string().min(1), port: z.number().int().min(1).max(65535) }),
  z.object({ type: z.literal("reboot") }),
  z.object({ type: z.literal("factoryReset") }),
  z.object({ type: z.literal("arm") }),
  z.object({ type: z.literal("disarm") }),
  z.object({
    type: z.literal("sosNumber"),
    slot: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    phone: z.string().min(5),
  }),
  z.object({ type: z.literal("listen"), callbackPhone: z.string().min(5) }),
  z.object({
    type: z.literal("sleepMode"),
    enabled: z.boolean(),
    minutes: z.number().int().min(0).max(720).optional(),
  }),
  z.object({ type: z.literal("custom"), payload: z.string().min(1) }),
]);

export type CommandInput = z.infer<typeof commandSchema>;

export type CommandRow = Database["public"]["Tables"]["device_commands"]["Row"];

export type DispatchOutcome =
  | { kind: "sent"; traccarType: string }
  | { kind: "failed"; error: string }
  | {
      kind: "queued";
      reason:
        | "traccar_unconfigured" // Traccar-bound but env missing — dead until configured
        | "device_not_linked"    // legacy reason, kept for older rows/UI
        | "device_offline"       // Traccar 202 — held server-side for next connect
        | "native_queued";       // ours — ingest drains it over the device's TCP socket
    };

/**
 * Persist + best-effort dispatch one command. Never throws on transport
 * failure — the audit row records the failure instead. Throws only on the
 * initial insert error.
 */
export async function recordAndDispatch(opts: {
  db: SupabaseClient<Database>;
  tenantId: string;
  device: { id: string; traccar_id: number | null };
  vehicleId?: string | null;
  command: CommandInput;
  requestedBy?: string | null;
  requestedByName?: string | null;
  description?: string;
  /** 'gprs' (default) uses the data channel; 'sms' sets Traccar textChannel. */
  channel?: "gprs" | "sms";
}): Promise<{ row: CommandRow; dispatch: DispatchOutcome }> {
  const { db, tenantId, device, command } = opts;
  const channel = opts.channel ?? "gprs";

  // Transport decides WHO delivers the command:
  //   traccar — device is linked (traccar_id) and Traccar REST is configured;
  //             dispatched inline below.
  //   ingest  — device is NOT Traccar-linked; it lives on our own socket
  //             listeners, so the row stays pending for apps/ingest to drain.
  //   none    — Traccar-linked but unconfigured; nothing can reach it.
  const transport =
    device.traccar_id != null
      ? traccarConfigured() ? "traccar" : "none"
      : "ingest";

  const { data: row, error } = await db
    .from("device_commands")
    .insert({
      tenant_id: tenantId,
      device_id: device.id,
      vehicle_id: opts.vehicleId ?? null,
      command,
      requested_by: opts.requestedBy ?? null,
      requested_by_name: opts.requestedByName ?? null,
      channel,
      transport,
    })
    .select()
    .single();
  if (error) throw error;

  if (transport === "ingest") {
    // Native path: apps/ingest polls pending 'ingest' rows and writes the
    // encoded command down the device's live TCP socket when it connects.
    return { row, dispatch: { kind: "queued", reason: "native_queued" } };
  }
  if (transport === "none") {
    return { row, dispatch: { kind: "queued", reason: "traccar_unconfigured" } };
  }

  try {
    const result = await sendTraccarCommand({
      traccarDeviceId: device.traccar_id!, // transport==='traccar' implies non-null
      command,
      description: opts.description ?? command.type,
      textChannel: channel === "sms",
    });

    // 202 = device offline, Traccar holds the command for its next connect —
    // keep the audit row pending so history reflects it isn't on-device yet.
    const patch = result.queued
      ? {
          traccar_type: result.traccarType,
          response: { queued: true, result: result.body },
          error: "device offline — queued by Traccar",
        }
      : result.ok
        ? {
            status: "sent" as const,
            traccar_type: result.traccarType,
            response: result.body,
            sent_at: new Date().toISOString(),
            error: null,
          }
        : {
            status: "failed" as const,
            traccar_type: result.traccarType,
            response: result.body,
            error: `Traccar HTTP ${result.status}`,
          };

    const { data: updated } = await db
      .from("device_commands")
      .update(patch)
      .eq("id", row.id)
      .select()
      .single();

    const dispatch: DispatchOutcome = result.queued
      ? { kind: "queued", reason: "device_offline" }
      : result.ok
        ? { kind: "sent", traccarType: result.traccarType }
        : { kind: "failed", error: `Traccar HTTP ${result.status}` };

    return { row: updated ?? ({ ...row, ...patch } as CommandRow), dispatch };
  } catch (err) {
    const message = err instanceof Error ? err.message : "dispatch failed";
    const { data: updated } = await db
      .from("device_commands")
      .update({ status: "failed", error: message })
      .eq("id", row.id)
      .select()
      .single();
    return {
      row: updated ?? ({ ...row, status: "failed", error: message } as CommandRow),
      dispatch: { kind: "failed", error: message },
    };
  }
}
