/**
 * GT06 / GT06N binary protocol (Jimi IoT / Concox).
 *
 * The most widely cloned telematics protocol in the world. Used by:
 * Jimi GT06N, Jimi JM-VL03, WanWay GS10G, WanWay EV02, Seeworld R12L,
 * Seeworld S5L, and GF-07/GF-09 TCP clones.
 *
 * Frame:  0x78 0x78 | len(1) | proto(1) | payload | serial(2) | crc(2) | 0x0D 0x0A
 * Extended frame (0x79 0x79) uses a 2-byte length for large payloads
 * (JM-VL03 multimedia / LBS extension packets).
 *
 * Key message types:
 *   0x01 login, 0x12/0x22 GPS location, 0x13 heartbeat/status,
 *   0x16/0x26 alarm+GPS, 0x15 command response, 0x80 server command,
 *   0x8A time sync request, 0x94 information transmission.
 */

import {
  AlarmType,
  DecodedMessage,
  DeviceCommand,
  EncodedCommand,
  ProtocolDecoder,
  Position,
  Session,
} from "../../core/types";
import {
  asciiBytes,
  bcd,
  concatBytes,
  crcItu,
  dateFromBytes,
  toHex,
  u16,
  u32,
} from "../../core/bytes";

const MSG = {
  LOGIN: 0x01,
  GPS: 0x12,
  HEARTBEAT: 0x13,
  STRING_INFO: 0x15,
  ALARM: 0x16,
  GPS_2: 0x22,
  ALARM_2: 0x26,
  LBS_EXTEND: 0x28,
  TIME_REQUEST: 0x8a,
  INFO_TRANSMIT: 0x94,
  COMMAND: 0x80,
} as const;

const ALARM_MAP: Record<number, AlarmType> = {
  0x01: "sos",
  0x02: "powerCut",
  0x03: "vibration",
  0x04: "geofenceEnter",
  0x05: "geofenceExit",
  0x06: "overspeed",
  0x09: "movement",
  0x0e: "lowBattery",
  0x0f: "lowBattery",
  0x13: "tamper",
  0x14: "door",
  0xfe: "accOn",
  0xff: "accOff",
};

export class Gt06Decoder implements ProtocolDecoder {
  readonly protocol = "gt06";
  readonly defaultPort = 5023;

  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] } {
    const frames: Uint8Array[] = [];
    let offset = 0;
    while (offset + 5 <= buffer.length) {
      const b0 = buffer[offset]!;
      const b1 = buffer[offset + 1]!;
      if ((b0 === 0x78 && b1 === 0x78) || (b0 === 0x79 && b1 === 0x79)) {
        const extended = b0 === 0x79;
        const len = extended ? u16(buffer, offset + 2) : buffer[offset + 2]!;
        const total = (extended ? 4 : 3) + len + 2; // header+len + payload+crc(in len) + 0d0a
        if (offset + total > buffer.length) break; // incomplete frame — wait for more bytes
        frames.push(buffer.slice(offset, offset + total));
        offset += total;
      } else {
        offset += 1; // resync on garbage
      }
    }
    return { consumed: offset, frames };
  }

  decode(frame: Uint8Array, session: Session): DecodedMessage {
    const extended = frame[0] === 0x79;
    const headerLen = extended ? 4 : 3;
    const type = frame[headerLen]!;
    const serial = u16(frame, frame.length - 6);

    switch (type) {
      case MSG.LOGIN: {
        // payload: IMEI (8 bytes BCD, first nibble padding) [+ type id + tz]
        const imei = bcd(frame, headerLen + 1, 8).replace(/^0/, "");
        session.deviceId = imei;
        return { kind: "login", deviceId: imei, response: this.respond(MSG.LOGIN, serial) };
      }

      case MSG.HEARTBEAT: {
        // payload: terminal info(1) voltage(1) gsm(1) alarm/lang(2)
        const info = frame[headerLen + 1]!;
        const voltageLevel = frame[headerLen + 2]!;
        const gsm = frame[headerLen + 3]!;
        void info;
        void voltageLevel;
        void gsm;
        return { kind: "heartbeat", deviceId: session.deviceId, response: this.respond(MSG.HEARTBEAT, serial) };
      }

      case MSG.GPS:
      case MSG.GPS_2:
      case MSG.ALARM:
      case MSG.ALARM_2: {
        if (!session.deviceId) return { kind: "ignored", reason: "location before login" };
        const p = headerLen + 1;
        const timestamp = dateFromBytes(frame, p);
        const satellites = frame[p + 6]! & 0x0f;
        const latRaw = u32(frame, p + 7);
        const lonRaw = u32(frame, p + 11);
        const speedKmh = frame[p + 15]!;
        const courseStatus = u16(frame, p + 16);

        const valid = (courseStatus & 0x1000) !== 0;
        let latitude = latRaw / 60.0 / 30000.0;
        let longitude = lonRaw / 60.0 / 30000.0;
        if ((courseStatus & 0x0400) === 0) latitude = -latitude; // 0 = South
        if ((courseStatus & 0x0800) !== 0) longitude = -longitude; // 1 = West
        const course = courseStatus & 0x03ff;

        const position: Position = {
          deviceId: session.deviceId,
          timestamp,
          latitude,
          longitude,
          valid,
          speedKmh,
          course,
          satellites,
          attributes: { raw: toHex(frame) },
        };

        const isAlarm = type === MSG.ALARM || type === MSG.ALARM_2;
        if (isAlarm) {
          // alarm packets append LBS + status: ... terminalInfo voltage gsm alarm lang
          const alarmByte = frame[frame.length - 8]!;
          const terminalInfo = frame[frame.length - 11]!;
          position.attributes.alarm = ALARM_MAP[alarmByte] ?? "unknown";
          position.attributes.ignition = (terminalInfo & 0x02) !== 0;
          position.attributes.charging = (terminalInfo & 0x04) !== 0;
          position.attributes.armed = (terminalInfo & 0x01) !== 0;
          position.attributes.blocked = (terminalInfo & 0x80) !== 0;
        } else if (type === MSG.GPS_2) {
          // 0x22 packets carry ACC in the byte after LBS block (offset varies by clone;
          // standard GT06N: byte at p+26 is ACC)
          const accIndex = p + 26;
          if (accIndex < frame.length - 6) {
            position.attributes.ignition = frame[accIndex] === 0x01;
          }
        }

        return {
          kind: "position",
          position,
          // GT06 expects an ack for alarm packets; plain GPS packets need none,
          // but acking is harmless and some clones (Seeworld) require it.
        } satisfies DecodedMessage;
      }

      case MSG.STRING_INFO: {
        // command response: len(1) serverFlag(4) content(ascii)
        const contentLen = frame[headerLen + 1]! - 4;
        const start = headerLen + 6;
        let text = "";
        for (let i = 0; i < contentLen && start + i < frame.length - 6; i++) {
          text += String.fromCharCode(frame[start + i]!);
        }
        return { kind: "commandResult", deviceId: session.deviceId, command: "", result: text.trim() };
      }

      case MSG.TIME_REQUEST: {
        const now = new Date();
        const payload = new Uint8Array([
          now.getUTCFullYear() - 2000,
          now.getUTCMonth() + 1,
          now.getUTCDate(),
          now.getUTCHours(),
          now.getUTCMinutes(),
          now.getUTCSeconds(),
        ]);
        return { kind: "ack", response: this.respond(MSG.TIME_REQUEST, serial, payload) };
      }

      default:
        return { kind: "ignored", reason: `unhandled gt06 type 0x${type.toString(16)}` };
    }
  }

  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null {
    const text = gt06CommandText(command);
    if (!text) return null;
    const serverFlag = new Uint8Array([0, 0, 0, 1]);
    const content = asciiBytes(text);
    const cmdLen = serverFlag.length + content.length;
    const body = concatBytes(
      new Uint8Array([cmdLen]),
      serverFlag,
      content,
      new Uint8Array([0, 0]), // language: english
    );
    return {
      transport: "tcp",
      payload: this.buildFrame(MSG.COMMAND, body, session.serverSerial++),
      description: `GT06 command: ${text}`,
    };
  }

  private respond(type: number, serial: number, payload = new Uint8Array(0)): Uint8Array {
    return this.buildFrame(type, payload, serial);
  }

  private buildFrame(type: number, payload: Uint8Array, serial: number): Uint8Array {
    const len = 1 + payload.length + 2 + 2; // proto + payload + serial + crc
    const frame = new Uint8Array(2 + 1 + len + 2);
    frame[0] = 0x78;
    frame[1] = 0x78;
    frame[2] = len;
    frame[3] = type;
    frame.set(payload, 4);
    frame[4 + payload.length] = (serial >> 8) & 0xff;
    frame[5 + payload.length] = serial & 0xff;
    const crc = crcItu(frame, 2, 6 + payload.length);
    frame[6 + payload.length] = (crc >> 8) & 0xff;
    frame[7 + payload.length] = crc & 0xff;
    frame[8 + payload.length] = 0x0d;
    frame[9 + payload.length] = 0x0a;
    return frame;
  }
}

/** Map platform commands to GT06 ASCII command strings (sent in 0x80 packets). */
function gt06CommandText(command: DeviceCommand): string | null {
  switch (command.type) {
    case "engineStop":
      return "RELAY,1#";
    case "engineResume":
      return "RELAY,0#";
    case "locate":
      return "WHERE#";
    case "setInterval":
      return `TIMER,${Math.max(5, command.seconds)}#`;
    case "setOverspeed":
      return `SPEED,ON,${command.kmh},1#`;
    case "setServer":
      return `SERVER,0,${command.host},${command.port},0#`;
    case "setApn":
      return `APN,${command.apn}${command.user ? `,${command.user},${command.password ?? ""}` : ""}#`;
    case "reboot":
      return "RESET#";
    case "factoryReset":
      return "FACTORY#";
    case "sosNumber":
      return `SOS,A,${command.phone}#`;
    case "custom":
      return command.payload;
    default:
      return null;
  }
}
