/**
 * Registry of live device connections so queued commands can be delivered
 * over the device's own TCP socket.
 */

import type net from "net";
import type { ProtocolKey, Session } from "@aerotrack/protocols";

export interface LiveConnection {
  socket: net.Socket;
  protocol: ProtocolKey;
  session: Session;
  /** Device row id (uuid) once identified against the database. */
  deviceId: string;
  imei: string;
}

const byDeviceId = new Map<string, LiveConnection>();

export function registerConnection(conn: LiveConnection) {
  byDeviceId.set(conn.deviceId, conn);
}

export function unregisterSocket(socket: net.Socket) {
  for (const [key, conn] of byDeviceId) {
    if (conn.socket === socket) byDeviceId.delete(key);
  }
}

export function getConnection(deviceId: string): LiveConnection | undefined {
  const conn = byDeviceId.get(deviceId);
  if (conn && conn.socket.destroyed) {
    byDeviceId.delete(deviceId);
    return undefined;
  }
  return conn;
}

export function connectionCount(): number {
  return byDeviceId.size;
}
