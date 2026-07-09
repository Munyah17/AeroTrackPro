/**
 * AeroTrack Pro Device Ingestion Service
 * Listens on protocol ports (GT06, H02, GPS103, etc.) and decodes device frames
 * using the @aerotrack/protocols package, writing positions to Supabase realtime bus.
 */

import net from "net";
import { createClient } from "@supabase/supabase-js";
import {
  createDecoders,
  createSession,
  type Position,
  type ProtocolKey,
  type Session,
} from "@aerotrack/protocols";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const decoders = createDecoders();

interface ProtocolListener {
  port: number;
  protocol: ProtocolKey;
}

// Protocol-to-port mapping (ports follow Traccar conventions)
const LISTENERS: ProtocolListener[] = [
  { port: 5023, protocol: "gt06" },
  { port: 5013, protocol: "h02" },
  { port: 5001, protocol: "gps103" },
  { port: 5064, protocol: "eelink" },
  { port: 5004, protocol: "queclink" },
  { port: 5020, protocol: "meitrack" },
  { port: 5049, protocol: "topflytech" },
  { port: 5045, protocol: "vt200" },
];

/** Devices already looked up this process, keyed by wire deviceId (IMEI). */
const deviceCache = new Map<
  string,
  { id: string; tenant_id: string; vehicle_id: string | null } | null
>();

async function findDevice(imei: string) {
  if (deviceCache.has(imei)) return deviceCache.get(imei) ?? null;
  const { data } = await supabase
    .from("devices")
    .select("id, tenant_id, vehicle_id")
    .eq("imei", imei)
    .maybeSingle();
  deviceCache.set(imei, data ?? null);
  return data ?? null;
}

function reply(socket: net.Socket, response: Uint8Array | string | undefined) {
  if (response === undefined) return;
  socket.write(typeof response === "string" ? response : Buffer.from(response));
}

async function savePositions(protocol: ProtocolKey, positions: Position[]) {
  for (const position of positions) {
    const device = await findDevice(position.deviceId);
    if (!device) {
      console.warn(`[${protocol}] Device IMEI ${position.deviceId} not registered, dropping fix`);
      continue;
    }

    const { error } = await supabase.from("positions").insert({
      tenant_id: device.tenant_id,
      device_id: device.id,
      vehicle_id: device.vehicle_id,
      lng: position.longitude,
      lat: position.latitude,
      speed_kmh: position.speedKmh,
      course: Math.round(position.course),
      altitude: position.altitudeM != null ? Math.round(position.altitudeM) : null,
      accuracy: position.hdop != null ? Math.round(position.hdop * 5) : null,
      event_type: position.attributes.alarm ?? "position",
      raw_data: { attributes: position.attributes, valid: position.valid },
      recorded_at: position.timestamp.toISOString(),
    });

    if (error) {
      console.error(`[${protocol}] Failed to save position for ${position.deviceId}:`, error.message);
    } else {
      console.log(
        `[${protocol}] Position saved for ${position.deviceId} at [${position.longitude}, ${position.latitude}]`,
      );
    }
  }
}

function handleConnection(socket: net.Socket, protocol: ProtocolKey) {
  console.log(`[${protocol}] New connection from ${socket.remoteAddress}:${socket.remotePort}`);
  const decoder = decoders[protocol];
  const session: Session = createSession();
  let buffer: Buffer = Buffer.alloc(0);

  socket.on("data", async (chunk: Buffer) => {
    try {
      buffer = Buffer.concat([buffer, chunk]);

      const { consumed, frames } = decoder.splitFrames(buffer);
      buffer = buffer.subarray(consumed);

      for (const frame of frames) {
        const decoded = decoder.decode(frame, session);

        switch (decoded.kind) {
          case "position":
            await savePositions(protocol, [decoded.position]);
            break;
          case "positions":
            await savePositions(protocol, decoded.positions);
            break;
          case "login":
            session.deviceId = decoded.deviceId;
            reply(socket, decoded.response);
            console.log(`[${protocol}] Login from ${decoded.deviceId}`);
            break;
          case "heartbeat":
            reply(socket, decoded.response);
            break;
          case "commandResult":
            console.log(
              `[${protocol}] Command result from ${decoded.deviceId ?? session.deviceId}: ${decoded.command} -> ${decoded.result}`,
            );
            break;
          case "ack":
            reply(socket, decoded.response);
            break;
          case "ignored":
            break;
        }
      }
    } catch (error) {
      console.error(`[${protocol}] Error processing frame:`, error);
    }
  });

  socket.on("end", () => {
    console.log(`[${protocol}] Connection closed: ${socket.remoteAddress}:${socket.remotePort}`);
  });

  socket.on("error", (err) => {
    console.error(`[${protocol}] Socket error:`, err.message);
  });
}

async function start() {
  console.log("🚀 AeroTrack Pro Ingest Service starting...");

  for (const { port, protocol } of LISTENERS) {
    const server = net.createServer((socket) => handleConnection(socket, protocol));

    server.listen(port, "0.0.0.0", () => {
      console.log(`✓ ${protocol} listener on port ${port}`);
    });

    server.on("error", (err) => {
      console.error(`✗ ${protocol} listener error:`, err.message);
    });
  }

  console.log("Ready to receive device frames.");
}

start().catch(console.error);
