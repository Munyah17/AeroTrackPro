/**
 * Topflytech binary protocol v2 — TLW2-12B solar asset tracker
 * (containers, trailers).
 *
 * Frame: 0x25 0x25 | type(1) | length(2) | serial(2) | imei(8 BCD) | payload
 * Types: 0x01 login, 0x02 GPS, 0x03 heartbeat, 0x04 alarm.
 * Solar/battery telemetry rides in the state block of GPS packets.
 */

import {
  DecodedMessage,
  DeviceCommand,
  EncodedCommand,
  ProtocolDecoder,
  Session,
} from "../../core/types";
import { asciiBytes, bcd, dateFromBytes, toHex, u16, u32 } from "../../core/bytes";

export class TopflytechDecoder implements ProtocolDecoder {
  readonly protocol = "topflytech";
  readonly defaultPort = 5049;

  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] } {
    const frames: Uint8Array[] = [];
    let offset = 0;
    while (offset + 5 <= buffer.length) {
      if (buffer[offset] === 0x25 && buffer[offset + 1] === 0x25) {
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
    const serial = u16(frame, 5);
    const imei = bcd(frame, 7, 8).replace(/^0/, "");
    session.deviceId = imei;

    if (type === 0x01) {
      return { kind: "login", deviceId: imei, response: this.ack(type, serial, imei) };
    }
    if (type === 0x03) {
      return { kind: "heartbeat", deviceId: imei, response: this.ack(type, serial, imei) };
    }
    if (type === 0x02 || type === 0x04) {
      const p = 15;
      const timestamp = dateFromBytes(frame, p);
      const flags = frame[p + 6]!;
      const latitude = (u32(frame, p + 7) | 0) / 1800000;
      const longitude = (u32(frame, p + 11) | 0) / 1800000;
      const speedKmh = frame[p + 15]!;
      const course = u16(frame, p + 16);
      const batteryLevel = frame[p + 18];

      return {
        kind: "position",
        position: {
          deviceId: imei,
          timestamp,
          latitude,
          longitude,
          valid: (flags & 0x01) !== 0,
          speedKmh,
          course,
          attributes: {
            raw: toHex(frame),
            batteryLevel: batteryLevel !== undefined && batteryLevel <= 100 ? batteryLevel : undefined,
            charging: (flags & 0x04) !== 0 ? true : undefined, // solar charging active
            alarm: type === 0x04 ? "movement" : undefined,
          },
        },
      };
    }
    return { kind: "ignored", reason: `unhandled topflytech type 0x${type.toString(16)}` };
  }

  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null {
    void session;
    // TLW series accepts ASCII config commands over the data channel
    const text =
      command.type === "locate"
        ? "*getposl*"
        : command.type === "setInterval"
          ? `*rupload*${command.seconds}*`
          : command.type === "custom"
            ? command.payload
            : null;
    if (!text) return null;
    return { transport: "tcp", payload: asciiBytes(text), description: `Topflytech: ${text}` };
  }

  private ack(type: number, serial: number, imei: string): Uint8Array {
    const out = new Uint8Array(15);
    out[0] = 0x25;
    out[1] = 0x25;
    out[2] = type;
    out[3] = 0x00;
    out[4] = 0x0a;
    out[5] = (serial >> 8) & 0xff;
    out[6] = serial & 0xff;
    const padded = imei.padStart(16, "0");
    for (let i = 0; i < 8; i++) {
      out[7 + i] = (parseInt(padded[i * 2]!, 10) << 4) | parseInt(padded[i * 2 + 1]!, 10);
    }
    return out;
  }
}
