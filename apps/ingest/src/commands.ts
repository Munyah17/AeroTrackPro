/**
 * Command dispatcher: drains the device_commands queue and delivers encoded
 * commands over the device's live TCP socket. Commands stay `pending` until
 * the device connects; unsupported commands are marked `failed`.
 */

import type { DeviceCommand, ProtocolDecoder, ProtocolKey } from "@aerotrack/protocols";
import { db } from "./db";
import { getConnection } from "./connections";

const POLL_INTERVAL_MS = 5_000;

interface CommandRow {
  id: string;
  tenant_id: string;
  device_id: string;
  command: DeviceCommand;
}

async function markCommand(id: string, fields: Record<string, unknown>) {
  await db().from("device_commands").update(fields).eq("id", id);
}

async function drainQueue(decoders: Record<ProtocolKey, ProtocolDecoder>) {
  const { data, error } = await db()
    .from("device_commands")
    .select("id, tenant_id, device_id, command")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error || !data?.length) return;

  for (const row of data as CommandRow[]) {
    const conn = getConnection(row.device_id);
    if (!conn) continue; // device offline — retry on next poll

    const decoder = decoders[conn.protocol];
    try {
      const encoded = decoder.encodeCommand(row.command, conn.session);
      if (!encoded) {
        await markCommand(row.id, {
          status: "failed",
          error: `Protocol ${conn.protocol} does not support command "${row.command.type}"`,
        });
        continue;
      }
      if (encoded.transport !== "tcp") {
        await markCommand(row.id, {
          status: "failed",
          error: `Command requires ${encoded.transport} transport (SMS gateway not connected)`,
        });
        continue;
      }

      conn.socket.write(
        typeof encoded.payload === "string" ? encoded.payload : Buffer.from(encoded.payload),
      );
      await markCommand(row.id, { status: "sent", sent_at: new Date().toISOString() });
      console.log(`[commands] Sent ${row.command.type} to ${conn.imei} (${encoded.description})`);
    } catch (err) {
      await markCommand(row.id, {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export function startCommandDispatcher(decoders: Record<ProtocolKey, ProtocolDecoder>) {
  setInterval(() => {
    drainQueue(decoders).catch((err) =>
      console.error("[commands] Queue drain failed:", err instanceof Error ? err.message : err),
    );
  }, POLL_INTERVAL_MS);
  console.log(`✓ Command dispatcher polling every ${POLL_INTERVAL_MS / 1000}s`);
}
