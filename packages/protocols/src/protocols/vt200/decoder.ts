/**
 * VT200 binary protocol — ThinkRace VT200 OBDII tracker
 * (driving diagnostics, WiFi hotspot).
 *
 * Frame: '(' 0x28 | deviceId(6 BCD) | type(2) | length(2) | payload | ')' 0x29
 * Types: 0x2086 position report, 0x3089 OBD data, 0x2005 heartbeat.
 */

import {
  DecodedMessage,
  DeviceCommand,
  EncodedCommand,
  ProtocolDecoder,
  Session,
} from "../../core/types";
import { bcd, nmeaToDecimal, toHex, u16 } from "../../core/bytes";

export class Vt200Decoder implements ProtocolDecoder {
  readonly protocol = "vt200";
  readonly defaultPort = 5045;

  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] } {
    const frames: Uint8Array[] = [];
    let offset = 0;
    while (offset + 11 <= buffer.length) {
      if (buffer[offset] === 0x28) {
        const len = u16(buffer, offset + 9);
        const total = 11 + len + 1; // '(' id type len payload ')'
        if (offset + total > buffer.length) break;
        if (buffer[offset + total - 1] === 0x29) {
          frames.push(buffer.slice(offset, offset + total));
          offset += total;
        } else {
          offset += 1;
        }
      } else {
        offset += 1;
      }
    }
    return { consumed: offset, frames };
  }

  decode(frame: Uint8Array, session: Session): DecodedMessage {
    const deviceId = bcd(frame, 1, 6);
    const type = u16(frame, 7);
    session.deviceId = deviceId;

    if (type === 0x2005) return { kind: "heartbeat", deviceId };

    if (type === 0x2086 || type === 0x2084) {
      const p = 11;
      // payload: date(3 BCD ddmmyy) time(3 BCD) lat(4 BCD ddmm.mmmm) lon(5 BCD dddmm.mmmm) speed(1) course(2) status(1)...
      const dd = bcd(frame, p, 3); // ddmmyy
      const tt = bcd(frame, p + 3, 3); // hhmmss
      const latBcd = bcd(frame, p + 6, 4); // ddmmmmmm -> ddmm.mmmm
      const lonBcd = bcd(frame, p + 10, 5); // dddmmmmmm(m)
      const status = frame[p + 15 + 3] ?? 0;

      const latitude = nmeaToDecimal(parseFloat(latBcd.slice(0, 4) + "." + latBcd.slice(4)), (status & 0x01) ? "N" : "S");
      const longitude = nmeaToDecimal(parseFloat(lonBcd.slice(0, 5) + "." + lonBcd.slice(5)), (status & 0x02) ? "E" : "W");
      const speedKmh = frame[p + 15]! * 1.852;
      const course = u16(frame, p + 16);

      return {
        kind: "position",
        position: {
          deviceId,
          timestamp: new Date(
            Date.UTC(2000 + +dd.slice(4, 6), +dd.slice(2, 4) - 1, +dd.slice(0, 2), +tt.slice(0, 2), +tt.slice(2, 4), +tt.slice(4, 6)),
          ),
          latitude,
          longitude,
          valid: (status & 0x04) !== 0,
          speedKmh: Math.round(speedKmh * 10) / 10,
          course,
          attributes: { raw: toHex(frame) },
        },
      };
    }

    if (type === 0x3089) {
      // OBD block: report as command result carrying raw hex for the OBD pipeline
      return { kind: "commandResult", deviceId, command: "obd", result: toHex(frame.slice(11, -1)) };
    }

    return { kind: "ignored", reason: `unhandled vt200 type 0x${type.toString(16)}` };
  }

  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null {
    void command;
    void session;
    // VT200 is configured via SMS/OBD app; GPRS downlink not implemented yet.
    return null;
  }
}
