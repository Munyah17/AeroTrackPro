/**
 * AeroTrack Pro Device Ingestion Service
 *
 * Listens on protocol ports (GT06, H02, GPS103, ...), decodes device frames
 * with @aerotrack/protocols, persists positions to Supabase, evaluates alert
 * rules, fans out webhooks and delivers queued commands to live sockets.
 *
 * Without SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY it runs in decode-only
 * mode: frames are decoded and logged, nothing is persisted.
 */

import net from "net";
import {
  createDecoders,
  createSession,
  type Position,
  type ProtocolKey,
  type TcpProtocolKey,
  type Session,
} from "@aerotrack/protocols";
import { db, findDeviceByImei, persistenceEnabled, type DeviceRecord } from "./db";
import { registerConnection, unregisterSocket, connectionCount } from "./connections";
import { evaluateAlerts } from "./alerts";
import { deriveTelemetry } from "./derive";
import { dispatchWebhooks } from "./webhooks";
import { startCommandDispatcher } from "./commands";

const decoders = createDecoders();

interface ProtocolListener {
  port: number;
  protocol: TcpProtocolKey;
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
  { port: 5027, protocol: "teltonika" },
  { port: 5015, protocol: "jt808" },
  { port: 5093, protocol: "watch" },
];

function reply(socket: net.Socket, response: Uint8Array | string | undefined) {
  if (response === undefined) return;
  socket.write(typeof response === "string" ? response : Buffer.from(response));
}

/* Public GPS ports attract scanners and stuck sockets. Cap concurrent
   connections per protocol and reap sockets idle for 15 min (trackers
   report far more often; a silent socket is dead weight or an attack). */
const MAX_CONNECTIONS_PER_PROTOCOL = 500;
const IDLE_TIMEOUT_MS = 15 * 60_000;
const activeByProtocol = new Map<TcpProtocolKey, number>();

function connectionSlot(protocol: TcpProtocolKey): boolean {
  const n = activeByProtocol.get(protocol) ?? 0;
  if (n >= MAX_CONNECTIONS_PER_PROTOCOL) return false;
  activeByProtocol.set(protocol, n + 1);
  return true;
}

function releaseConnectionSlot(protocol: TcpProtocolKey) {
  const n = (activeByProtocol.get(protocol) ?? 1) - 1;
  if (n <= 0) activeByProtocol.delete(protocol);
  else activeByProtocol.set(protocol, n);
}

async function identify(
  socket: net.Socket,
  protocol: ProtocolKey,
  session: Session,
  imei: string,
): Promise<DeviceRecord | null> {
  if (!persistenceEnabled) return null;
  const device = await findDeviceByImei(imei);
  if (device) {
    registerConnection({ socket, protocol, session, deviceId: device.id, imei });
  }
  return device;
}

/* Devices in sleep/replay mode re-send the same frozen fix (identical
   timestamp + coords) on every wake. Dedupe those so positions isn't
   flooded with duplicates; last_seen still updates so the device stays
   "online". Entries expire after 30 min. */
const seenFixes = new Map<string, number>();
const FIX_DEDUPE_MS = 30 * 60_000;

function isDuplicateFix(deviceId: string, recordedAt: string, lat: number, lng: number): boolean {
  const now = Date.now();
  for (const [k, t] of seenFixes) if (now - t > FIX_DEDUPE_MS) seenFixes.delete(k);
  const key = `${deviceId}:${recordedAt}:${lat.toFixed(6)},${lng.toFixed(6)}`;
  if (seenFixes.has(key)) return true;
  seenFixes.set(key, now);
  return false;
}

async function savePositions(protocol: ProtocolKey, socket: net.Socket, session: Session, positions: Position[]) {
  for (const position of positions) {
    if (!persistenceEnabled) {
      console.log(
        `[${protocol}] (decode-only) ${position.deviceId} @ [${position.longitude.toFixed(5)}, ${position.latitude.toFixed(5)}] ${position.speedKmh} km/h`,
      );
      continue;
    }

    const device = await identify(socket, protocol, session, position.deviceId);
    if (!device) {
      console.warn(`[${protocol}] Device IMEI ${position.deviceId} not registered, dropping fix`);
      continue;
    }

    /* Invalid GPS fix (e.g. H02 'V' flag): the device is alive and
       reporting, but the coordinates are stale last-known values.
       Update freshness only — never write positions or move
       last_position_at, so the dashboard keeps the real last fix. */
    if (!position.valid) {
      void db()
        .from("devices")
        .update({
          last_seen_at: new Date().toISOString(),
          last_gps_valid: false,
        })
        .eq("id", device.id)
        .then();
      console.log(
        `[${protocol}] invalid fix from ${position.deviceId} @ ${position.timestamp.toISOString()} — last known position kept`,
      );
      continue;
    }

    const duplicate = isDuplicateFix(device.id, position.timestamp.toISOString(), position.latitude, position.longitude);
    if (duplicate) {
      void db()
        .from("devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", device.id)
        .then();
      continue;
    }

    const row = {
      tenant_id: device.tenant_id,
      device_id: device.id,
      vehicle_id: device.vehicle_id,
      lng: position.longitude,
      lat: position.latitude,
      speed_kmh: position.speedKmh,
      course: Math.round(position.course),
      altitude: position.altitudeM != null ? Math.round(position.altitudeM) : null,
      accuracy:
        typeof position.attributes.accuracy === "number"
          ? Math.round(position.attributes.accuracy)
          : position.hdop != null
            ? Math.round(position.hdop * 5)
            : null,
      event_type: position.attributes.alarm ?? "position",
      raw_data: { attributes: position.attributes, valid: position.valid },
      recorded_at: position.timestamp.toISOString(),
    };

    const { data, error } = await db().from("positions").insert(row).select().single();
    if (error) {
      console.error(`[${protocol}] Failed to save position for ${position.deviceId}:`, error.message);
      continue;
    }

    // Keep device freshness + telemetry current for the fleet screens.
    void db()
      .from("devices")
      .update({
        last_position_at: row.recorded_at,
        last_valid_fix_at: row.recorded_at,
        last_seen_at: new Date().toISOString(),
        last_lat: position.latitude,
        last_lng: position.longitude,
        last_speed_kmh: Math.round(position.speedKmh * 10) / 10,
        last_course: Math.round(position.course),
        ...(typeof position.attributes.ignition === "boolean"
          ? { ignition: position.attributes.ignition }
          : {}),
        ...(typeof position.attributes.engineCut === "boolean"
          ? { engine_cut: position.attributes.engineCut }
          : {}),
        ...(position.attributes.batteryLevel != null
          ? { battery_level: Math.round(position.attributes.batteryLevel) }
          : {}),
        ...(position.attributes.gsmSignal != null
          ? { signal_strength: Math.round(position.attributes.gsmSignal) }
          : {}),
      })
      .eq("id", device.id)
      .then();

    void deriveTelemetry(device, position);
    void evaluateAlerts(device, position);
    void dispatchWebhooks(device.tenant_id, "position.created", data);
  }
}

function handleConnection(socket: net.Socket, protocol: TcpProtocolKey) {
  if (!connectionSlot(protocol)) {
    console.warn(`[${protocol}] connection limit reached — dropping ${socket.remoteAddress}:${socket.remotePort}`);
    socket.destroy();
    return;
  }
  socket.setTimeout(IDLE_TIMEOUT_MS);
  socket.on("timeout", () => {
    console.log(`[${protocol}] idle timeout — closing ${socket.remoteAddress}:${socket.remotePort}`);
    socket.destroy();
  });
  console.log(`[${protocol}] New connection from ${socket.remoteAddress}:${socket.remotePort}`);
  const decoder = decoders[protocol];
  const session: Session = createSession();
  let buffer: Buffer = Buffer.alloc(0);
  let loggedFirstChunk = false;

  socket.on("data", async (chunk: Buffer) => {
    try {
      if (!loggedFirstChunk) {
        loggedFirstChunk = true;
        /* GPS ports are public — reject HTTP/TLS scanner probes immediately
           so they can't hold connections or fill logs. Device protocols
           never start with an HTTP verb or a TLS handshake byte. */
        const head = chunk.subarray(0, 8).toString("latin1");
        const looksHttp = /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|CONNECT|TRACE)\s/i.test(head);
        const looksTls = chunk[0] === 0x16;
        if (looksHttp || looksTls) {
          console.log(
            `[${protocol}] rejected non-device traffic from ${socket.remoteAddress}:${socket.remotePort} (${JSON.stringify(head.slice(0, 40))})`,
          );
          socket.destroy();
          return;
        }
        const preview = chunk.subarray(0, 256);
        console.log(
          `[${protocol}] first bytes (${chunk.length}B): ${preview.toString("hex")}\n` +
            `  ascii: ${JSON.stringify(preview.toString("latin1"))}`,
        );
      }
      buffer = Buffer.concat([buffer, chunk]);

      const { consumed, frames } = decoder.splitFrames(buffer);
      buffer = buffer.subarray(consumed);

      for (const frame of frames) {
        const decoded = decoder.decode(frame, session);
        if (decoded.kind === "position") {
          console.log(
            `[${protocol}] decoded position ${decoded.position.deviceId} valid=${decoded.position.valid} @ ${decoded.position.timestamp.toISOString()}`,
          );
        }

        switch (decoded.kind) {
          case "position":
            reply(socket, decoded.response);
            await savePositions(protocol, socket, session, [decoded.position]);
            break;
          case "positions":
            reply(socket, decoded.response);
            await savePositions(protocol, socket, session, decoded.positions);
            break;
          case "login":
            session.deviceId = decoded.deviceId;
            reply(socket, decoded.response);
            await identify(socket, protocol, session, decoded.deviceId);
            console.log(`[${protocol}] Login from ${decoded.deviceId} (${connectionCount()} devices online)`);
            break;
          case "heartbeat":
            reply(socket, decoded.response);
            break;
          case "commandResult": {
            const imei = decoded.deviceId ?? session.deviceId;
            console.log(`[${protocol}] Command result from ${imei}: ${decoded.command} -> ${decoded.result}`);
            if (persistenceEnabled && imei) {
              const device = await findDeviceByImei(imei);
              if (device) {
                // Ack the oldest outstanding sent command for this device.
                const { data: sent } = await db()
                  .from("device_commands")
                  .select("id")
                  .eq("device_id", device.id)
                  .eq("status", "sent")
                  .order("sent_at", { ascending: true })
                  .limit(1)
                  .maybeSingle();
                if (sent) {
                  await db()
                    .from("device_commands")
                    .update({ status: "acked", acked_at: new Date().toISOString() })
                    .eq("id", sent.id);
                  void dispatchWebhooks(device.tenant_id, "command.acked", {
                    command_id: sent.id,
                    result: decoded.result,
                  });
                }
              }
            }
            break;
          }
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

  socket.on("close", () => {
    unregisterSocket(socket);
    releaseConnectionSlot(protocol);
    console.log(`[${protocol}] Connection closed: ${socket.remoteAddress}:${socket.remotePort}`);
  });

  socket.on("error", (err) => {
    console.error(`[${protocol}] Socket error:`, err.message);
  });
}

async function start() {
  console.log("🚀 AeroTrack Pro Ingest Service starting...");
  console.log(
    persistenceEnabled
      ? "✓ Supabase persistence enabled"
      : "⚠ Decode-only mode (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to persist)",
  );

  for (const { port, protocol } of LISTENERS) {
    const server = net.createServer((socket) => handleConnection(socket, protocol));

    server.listen(port, "0.0.0.0", () => {
      console.log(`✓ ${protocol} listener on port ${port}`);
    });

    server.on("error", (err) => {
      console.error(`✗ ${protocol} listener error:`, err.message);
    });
  }

  if (persistenceEnabled) {
    startCommandDispatcher(decoders);
  }

  console.log("Ready to receive device frames.");
}

start().catch(console.error);
