/**
 * Teltonika Codec 8 / Codec 8 Extended protocol — the whole FMB/FMC/FMM
 * family (FMB920, FMB001 OBD, FMT100, FMC650, etc.) over TCP.
 *
 * Wire spec (Teltonika wiki + traccar):
 *   Login:  2B length (0x000F) + 15 ASCII IMEI digits → reply 0x01 accept.
 *   AVL:    4B preamble 0x00000000 + 4B data-field length + codecId(1)
 *           + N1(1) + records + N2(1) + CRC16(4, low 2 bytes = CRC-16/IBM
 *           over codecId..N2). Server replies N1 as 4-byte record count.
 *   Record: timestamp(8B ms) + priority(1) + lon(4) + lat(4) + alt(2)
 *           + angle(2) + sats(1) + speed(2) + eventIOid(1) + totalIO(1)
 *           + IO sets N1/N2/N4/N8 (Codec8) or N1/N2/N4/N8 with 16-bit ids
 *           and 16-bit counts (Codec 8 Extended, id 0x8E).
 *   Cmds:   Codec 12 (id 0x0C) GPRS text commands, CRC over data field.
 */

import {
  DecodedMessage,
  DeviceCommand,
  EncodedCommand,
  Position,
  ProtocolDecoder,
  Session,
} from "../../core/types";
import { ascii, asciiBytes, concatBytes, u16, u32 } from "../../core/bytes";

/* CRC-16/IBM/ARC — poly 0x8005, init 0x0000, reflected. */
function crc16Arc(data: Uint8Array, from: number, to: number): number {
  let crc = 0;
  for (let i = from; i < to; i++) {
    crc ^= data[i]! << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x8005) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/** Signed big-endian 32-bit read. */
function i32(data: Uint8Array, offset: number): number {
  return (u32(data, offset) | 0) as number;
}

/** Unsigned big-endian 64-bit → number (safe up to 2^53; ms timestamps fit). */
function u64(data: Uint8Array, offset: number): number {
  return u32(data, offset) * 0x1_0000_0000 + u32(data, offset + 4);
}

/** Teltonika I/O element ids → normalized attributes (subset we care about). */
function mapIo(id: number, value: number | bigint, attributes: Record<string, unknown>): void {
  switch (id) {
    case 239: // Ignition
      attributes.ignition = value === BigInt(1) || value === 1;
      break;
    case 240: // Movement
      attributes.motion = value === BigInt(1) || value === 1;
      break;
    case 21: // GSM signal (0-5 bars → 0-100)
      attributes.gsmSignal = Math.min(100, Number(value) * 20);
      break;
    case 66: // External voltage, mV
      attributes.externalVoltage = Number(value) / 1000;
      break;
    case 67: // Battery voltage, mV
      attributes.batteryVoltage = Number(value) / 1000;
      break;
    case 113: // Battery level, %
      attributes.batteryLevel = Number(value);
      break;
    case 16: // Total odometer, m
      attributes.odometerM = Number(value);
      break;
    case 389: // Total odometer (km) on some firmwares
      attributes.odometerM = Number(value) * 1000;
      break;
    case 5: // RFID tag read event on FMB-family (id varies by model)
    case 157: // iButton/RFID driver id (varies)
      if (!attributes.driverUniqueId && value !== 0) {
        attributes.driverUniqueId = value.toString(16);
      }
      break;
    case 80: // Data mode (0=home on stop,1=home moving,... )
      attributes.dataMode = Number(value);
      break;
    case 200: // Sleep mode
      attributes.sleep = Number(value);
      break;
    default:
      attributes[`io${id}`] = typeof value === "bigint" ? value.toString() : value;
  }
}

export class TeltonikaDecoder implements ProtocolDecoder {
  readonly protocol = "teltonika";
  readonly defaultPort = 5027;

  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] } {
    const frames: Uint8Array[] = [];
    let offset = 0;

    while (offset + 2 <= buffer.length) {
      // IMEI login: 2-byte length followed by that many ASCII digits.
      if (u16(buffer, offset) === 0x000f) {
        if (offset + 17 > buffer.length) break; // wait for full frame
        frames.push(buffer.slice(offset, offset + 17));
        offset += 17;
        continue;
      }

      // AVL packet: preamble 0x00000000 + 4B data length.
      if (
        buffer[offset] === 0 &&
        buffer[offset + 1] === 0 &&
        buffer[offset + 2] === 0 &&
        buffer[offset + 3] === 0 &&
        offset + 8 <= buffer.length
      ) {
        const dataLen = u32(buffer, offset + 4);
        const total = 8 + dataLen + 4; // preamble+len | data | crc
        if (offset + total > buffer.length) break; // wait for full frame
        frames.push(buffer.slice(offset, offset + total));
        offset += total;
        continue;
      }

      offset += 1; // resync
    }

    return { consumed: offset, frames };
  }

  decode(frame: Uint8Array, session: Session): DecodedMessage {
    // --- IMEI login ------------------------------------------------------
    if (u16(frame, 0) === 0x000f) {
      const imei = ascii(frame.slice(2, 17)).replace(/\D/g, "");
      session.deviceId = imei;
      return {
        kind: "login",
        deviceId: imei,
        response: new Uint8Array([imei.length === 15 ? 0x01 : 0x00]),
      };
    }

    if (frame.length < 12 || u32(frame, 0) !== 0) {
      return { kind: "ignored", reason: "not a teltonika frame" };
    }

    const dataLen = u32(frame, 4);
    const codecId = frame[8]!;
    const crcGiven = u32(frame, 8 + dataLen) & 0xffff;
    const crcCalc = crc16Arc(frame, 8, 8 + dataLen);
    const crcOk = crcGiven === crcCalc;

    if (codecId === 0x08 || codecId === 0x8e) {
      const positions = this.decodeAvl(frame, session, codecId === 0x8e);
      if (positions.length === 0) {
        return { kind: "ignored", reason: "codec8 packet with no AVL records" };
      }
      // ACK = number of records as 4-byte big-endian.
      const ack = new Uint8Array(4);
      new DataView(ack.buffer).setUint32(0, positions.length);
      positions.forEach((p) => ((p.attributes as Record<string, unknown>).crcOk = crcOk));
      return { kind: "positions", positions, response: ack };
    }

    if (codecId === 0x0c) {
      // Codec 12 uplink — device replied to a GPRS command.
      const reply = frame[14]; // response type
      const size = u32(frame, 15);
      const text = ascii(frame.slice(19, 19 + Math.min(size, dataLen))).trim();
      return {
        kind: "commandResult",
        deviceId: session.deviceId,
        command: "gprs",
        result: `[type ${reply ?? "?"}] ${text}`,
      };
    }

    return { kind: "ignored", reason: `unhandled teltonika codec 0x${codecId.toString(16)}` };
  }

  private decodeAvl(frame: Uint8Array, session: Session, extended: boolean): Position[] {
    const deviceId = session.deviceId ?? "unknown";
    const count = frame[9]!;
    const positions: Position[] = [];
    let p = 10;

    for (let r = 0; r < count && p + 15 + (extended ? 2 : 1) < frame.length; r++) {
      const recordStart = p;
      const timestampMs = u64(frame, p);
      p += 8;
      p += 1; // priority

      const longitude = i32(frame, p) / 1e7;
      const latitude = i32(frame, p + 4) / 1e7;
      const altitude = u16(frame, p + 8);
      const angle = u16(frame, p + 10);
      const satellites = frame[p + 12]!;
      const speed = u16(frame, p + 13);
      p += 15;

      const eventIo = extended ? u16(frame, p) : frame[p]!;
      const totalIo = extended ? u16(frame, p + 2) : frame[p + 1]!;
      p += extended ? 4 : 2;

      const attributes: Record<string, unknown> = {
        eventIo,
        totalIo,
        codec: extended ? "8E" : "8",
      };

      // IO sets: each section is a count followed by id+value pairs.
      const sections: Array<{ idWidth: 1 | 2; valueBytes: 1 | 2 | 4 | 8 }> = [
        { idWidth: extended ? 2 : 1, valueBytes: 1 },
        { idWidth: extended ? 2 : 1, valueBytes: 2 },
        { idWidth: extended ? 2 : 1, valueBytes: 4 },
        { idWidth: extended ? 2 : 1, valueBytes: 8 },
      ];

      let safe = true;
      for (const { idWidth, valueBytes } of sections) {
        const n = extended ? u16(frame, p) : frame[p]!;
        p += extended ? 2 : 1;
        for (let i = 0; i < n; i++) {
          if (p + idWidth + valueBytes > frame.length) { safe = false; break; }
          const id = idWidth === 2 ? u16(frame, p) : frame[p]!;
          p += idWidth;
          let value: number | bigint;
          if (valueBytes === 8) {
            value = BigInt(u32(frame, p)) * BigInt(0x100000000) + BigInt(u32(frame, p + 4));
          } else {
            value = valueBytes === 4 ? u32(frame, p) : valueBytes === 2 ? u16(frame, p) : frame[p]!;
          }
          p += valueBytes;
          mapIo(id, value, attributes);
        }
        if (!safe) break;
      }

      // Record sanity: timestamp plausible and non-zero coords.
      if (!safe || timestampMs === 0 || (latitude === 0 && longitude === 0)) {
        p = Math.max(p, recordStart + 1);
        continue;
      }

      positions.push({
        deviceId,
        timestamp: new Date(timestampMs),
        latitude,
        longitude,
        valid: true,
        speedKmh: speed,
        course: angle,
        altitudeM: altitude,
        satellites,
        ...(typeof attributes.odometerM === "number" ? { odometerM: attributes.odometerM as number } : {}),
        attributes,
      });
    }

    return positions;
  }

  /** Codec 12 GPRS command — works on every FMB firmware. */
  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null {
    let text: string | null = null;
    switch (command.type) {
      case "locate":
        text = "getgps"; // replies with coordinate sentence on every firmware
        break;
      case "engineStop":
        text = "setdigout 1"; // energise DOUT → fuel/ignition relay cut
        break;
      case "engineResume":
        text = "setdigout 0";
        break;
      case "setTimezone":
        // Parameter 901 = GMT offset on FMB firmware (seconds east of UTC).
        text = `setparam 901:${command.utcOffsetMinutes * 60}`;
        break;
      case "setInterval":
        // Parameter 1001 = min period for "on stop", 1000 for moving on FMB.
        text = `setparam 1001:${command.seconds}`;
        break;
      case "reboot":
        text = "reset";
        break;
      case "custom":
        text = command.payload;
        break;
      default:
        return null;
    }
    void session;

    const body = asciiBytes(text);
    const data = new Uint8Array(4 + 4 + body.length);
    const view = new DataView(data.buffer);
    view.setUint8(0, 0x0c); // codec 12
    view.setUint8(1, 1); // command quantity
    view.setUint8(2, 5); // type 5 = command
    view.setUint32(3, body.length);
    data.set(body, 7);
    view.setUint8(7 + body.length, 1); // command quantity 2

    const crc = crc16Arc(data, 0, data.length);
    const packet = concatBytes(
      new Uint8Array([0, 0, 0, 0]), // preamble
      u32be(data.length), // data field length
      data,
      u32be(crc), // crc stored as 4 bytes
    );
    return {
      transport: "tcp",
      payload: packet,
      description: `Teltonika GPRS cmd: ${text}`,
    };
  }
}

function u32be(v: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, v);
  return out;
}
