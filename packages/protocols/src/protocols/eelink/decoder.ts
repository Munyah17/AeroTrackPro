/**
 * Eelink binary protocol — Eelink TK116 (G-sensor crash detection).
 *
 * Frame: 0x67 0x67 | type(1) | length(2) | sequence(2) | payload
 * Types: 0x01 login (IMEI 8B BCD), 0x02 GPS, 0x03 heartbeat,
 *        0x04 alarm, 0x05 state, 0x12 extended GPS (new protocol).
 * Server acks login/heartbeat with the same header + sequence.
 */

import {
  AlarmType,
  DecodedMessage,
  DeviceCommand,
  EncodedCommand,
  ProtocolDecoder,
  Session,
} from "../../core/types";
import { asciiBytes, bcd, concatBytes, toHex, u16, u32 } from "../../core/bytes";

const ALARMS: Record<number, AlarmType> = {
  0x01: "sos",
  0x02: "lowBattery",
  0x03: "powerCut",
  0x04: "vibration",
  0x08: "overspeed",
  0x09: "movement",
  0x0e: "crash", // G-sensor collision
};

export class EelinkDecoder implements ProtocolDecoder {
  readonly protocol = "eelink";
  readonly defaultPort = 5064;

  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] } {
    const frames: Uint8Array[] = [];
    let offset = 0;
    while (offset + 5 <= buffer.length) {
      if (buffer[offset] === 0x67 && buffer[offset + 1] === 0x67) {
        const len = u16(buffer, offset + 3);
        const total = 5 + len;
        if (offset + total > buffer.length) break;
        frames.push(buffer.slice(offset, offset + total));
        offset += total;
      } else {
        offset += 1;
      }
    }
    return { consumed: offset, frames };
  }

  decode(frame: Uint8Array, session: Session): DecodedMessage {
    const type = frame[2]!;
    const seq = u16(frame, 5);

    if (type === 0x01) {
      const imei = bcd(frame, 7, 8).replace(/^0/, "");
      session.deviceId = imei;
      return { kind: "login", deviceId: imei, response: this.ack(0x01, seq) };
    }

    if (type === 0x03) {
      return { kind: "heartbeat", deviceId: session.deviceId, response: this.ack(0x03, seq) };
    }

    if ((type === 0x02 || type === 0x04 || type === 0x05 || type === 0x12) && session.deviceId) {
      const p = 7;
      const timestamp = new Date(u32(frame, p) * 1000);
      const latitude = (u32(frame, p + 4) | 0) / 1800000;
      const longitude = (u32(frame, p + 8) | 0) / 1800000;
      const speedKmh = frame[p + 12]!;
      const course = u16(frame, p + 13);
      const flags = frame[p + 20] ?? 0;
      const alarmCode = type === 0x04 ? frame[p + 21] ?? 0 : 0;

      return {
        kind: "position",
        position: {
          deviceId: session.deviceId,
          timestamp,
          latitude,
          longitude,
          valid: (flags & 0x01) !== 0,
          speedKmh,
          course,
          attributes: {
            raw: toHex(frame),
            ignition: (flags & 0x02) !== 0 ? true : undefined,
            alarm: alarmCode ? ALARMS[alarmCode] ?? "unknown" : undefined,
          },
        },
      };
    }

    return { kind: "ignored", reason: `unhandled eelink type 0x${type.toString(16)}` };
  }

  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null {
    // 0x80 command packet: content is ASCII command text
    const text =
      command.type === "locate"
        ? "WHERE#"
        : command.type === "reboot"
          ? "RESET#"
          : command.type === "setInterval"
            ? `TIMER,${command.seconds}#`
            : command.type === "custom"
              ? command.payload
              : null;
    if (!text) return null;
    const content = asciiBytes(text);
    const len = 2 + 1 + content.length; // seq + flag + content
    const header = new Uint8Array([0x67, 0x67, 0x80, (len >> 8) & 0xff, len & 0xff, 0x00, session.serverSerial++ & 0xff, 0x01]);
    return {
      transport: "tcp",
      payload: concatBytes(header, content),
      description: `Eelink command: ${text}`,
    };
  }

  private ack(type: number, seq: number): Uint8Array {
    return new Uint8Array([0x67, 0x67, type, 0x00, 0x02, (seq >> 8) & 0xff, seq & 0xff]);
  }
}
