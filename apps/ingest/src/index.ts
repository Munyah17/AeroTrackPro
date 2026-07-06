/**
 * AeroTrack Pro Device Ingestion Service
 * Listens on protocol ports (GT06, H02, GPS103, etc.) and decodes device frames
 * using the @aerotrack/protocols package, writing positions to Supabase realtime bus.
 */

import net from "net";
import { createClient } from "@supabase/supabase-js";
import { createDecoders } from "@aerotrack/protocols";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const decoders = createDecoders();

interface ProtocolListener {
  port: number;
  protocol: string;
}

// Protocol-to-port mapping
const LISTENERS: ProtocolListener[] = [
  { port: 5023, protocol: "GT06" },
  { port: 5013, protocol: "H02" },
  { port: 5001, protocol: "GPS103" },
  { port: 5064, protocol: "Eelink" },
  { port: 5004, protocol: "Queclink" },
  { port: 5020, protocol: "Meitrack" },
  { port: 5049, protocol: "Topflytech" },
  { port: 5045, protocol: "VT200" },
];

// Track device sessions per connection
interface DeviceSession {
  imei?: string;
  protocol: string;
  buffer: Buffer;
}

async function handleConnection(socket: net.Socket, protocol: string) {
  console.log(`[${protocol}] New connection from ${socket.remoteAddress}:${socket.remotePort}`);
  const session: DeviceSession = { protocol, buffer: Buffer.alloc(0) };

  const decoder = decoders[protocol];
  if (!decoder) {
    console.error(`[${protocol}] No decoder found`);
    socket.destroy();
    return;
  }

  socket.on("data", async (chunk: Buffer) => {
    try {
      // Accumulate data in buffer
      session.buffer = Buffer.concat([session.buffer, chunk]);

      // Try to split frames
      const { frames, remaining } = decoder.splitFrames(session.buffer);
      session.buffer = remaining;

      for (const frame of frames) {
        const decoded = decoder.decode(frame, session as any);
        if (!decoded) continue;

        // Identify device by IMEI
        const imei = decoded.imei || session.imei;
        if (!imei) {
          console.warn(`[${protocol}] Frame without IMEI, skipping`);
          continue;
        }

        session.imei = imei;

        // Find device in database
        const { data: device } = await supabase
          .from("devices")
          .select("id, tenant_id, vehicle_id")
          .eq("imei", imei)
          .single();

        if (!device) {
          console.warn(`[${protocol}] Device IMEI ${imei} not found`);
          continue;
        }

        // Save position to database
        if (decoded.position) {
          const { error } = await supabase.from("positions").insert({
            tenant_id: device.tenant_id,
            device_id: device.id,
            vehicle_id: device.vehicle_id,
            lng: decoded.position.lng,
            lat: decoded.position.lat,
            speed_kmh: decoded.position.speedKmh,
            course: decoded.position.course,
            altitude: decoded.position.altitude,
            accuracy: decoded.position.accuracy,
            event_type: decoded.eventType || "position",
            raw_data: { frame: frame.toString("hex"), decoded },
            recorded_at: new Date(decoded.timestamp || Date.now()).toISOString(),
          });

          if (error) {
            console.error(`[${protocol}] Failed to save position for ${imei}:`, error);
          } else {
            console.log(
              `[${protocol}] Position saved for ${imei} at [${decoded.position.lng}, ${decoded.position.lat}]`,
            );
          }
        }

        // Process commands if present
        if (decoded.commandAck) {
          console.log(`[${protocol}] Command ACK from ${imei}:`, decoded.commandAck);
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
