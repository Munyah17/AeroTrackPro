/**
 * H02 ASCII protocol — used by all SinoTrack devices
 * (ST-901, ST-902 OBD, ST-905 magnetic, ST-906 SOS/audio).
 *
 * Position frame:
 *   *HQ,8160528336,V1,054049,A,2212.8745,N,11346.6574,E,14.28,028,220617,FFFFFBFF#
 *    vendor,id,cmd,time,validity,lat,NS,lon,EW,speed(knots),course,date,status
 *
 * SinoTrack devices also send a binary variant ($ + BCD) which shares the
 * same field layout; V2/V3/V4 messages carry LBS and command responses.
 *
 * Commands are SMS or GPRS ASCII, e.g. "*HQ,{id},S20,130305,1,1#" (cut oil).
 */

import {
  DecodedMessage,
  DeviceCommand,
  EncodedCommand,
  ProtocolDecoder,
  Position,
  Session,
} from "../../core/types";
import { ascii, asciiBytes, nmeaToDecimal, parseDdmmyyHhmmss } from "../../core/bytes";

const KNOTS_TO_KMH = 1.852;

/** Status dword: bits are active-low alarm flags (0 = alarm active). */
function statusAlarms(status: number) {
  const alarms: string[] = [];
  if ((status & 0x00000001) === 0) alarms.push("tamper");
  if ((status & 0x00000002) === 0) alarms.push("sos");
  if ((status & 0x00000004) === 0) alarms.push("overspeed");
  if ((status & 0x00080000) === 0) alarms.push("powerCut");
  if ((status & 0x00100000) === 0) alarms.push("lowBattery");
  return alarms;
}

export class H02Decoder implements ProtocolDecoder {
  readonly protocol = "h02";
  readonly defaultPort = 5013;

  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] } {
    const frames: Uint8Array[] = [];
    let offset = 0;
    while (offset < buffer.length) {
      if (buffer[offset] === 0x2a /* '*' */) {
        const end = buffer.indexOf(0x23 /* '#' */, offset);
        if (end === -1) break;
        frames.push(buffer.slice(offset, end + 1));
        offset = end + 1;
      } else if (buffer[offset] === 0x24 /* '$' binary variant, fixed 32/45 bytes */) {
        if (offset + 32 > buffer.length) break;
        frames.push(buffer.slice(offset, offset + 32));
        offset += 32;
      } else {
        offset += 1;
      }
    }
    return { consumed: offset, frames };
  }

  decode(frame: Uint8Array, session: Session): DecodedMessage {
    if (frame[0] === 0x24) return this.decodeBinary(frame, session);
    const text = ascii(frame);
    const parts = text.replace(/^\*/, "").replace(/#$/, "").split(",");
    const [vendor, id, type] = parts;
    if (!vendor || !id || !type) return { kind: "ignored", reason: "malformed h02 frame" };
    session.deviceId = id;

    if (type === "V1" || type === "V4" || type === "VI1") {
      // V1: time, validity, lat, NS, lon, EW, speed, course, date, status
      const base = type === "V4" ? 4 : 3; // V4 injects a response field
      const time = parts[base]!;
      const valid = parts[base + 1] === "A";
      const lat = nmeaToDecimal(parseFloat(parts[base + 2]!), parts[base + 3]!);
      const lon = nmeaToDecimal(parseFloat(parts[base + 4]!), parts[base + 5]!);
      const speedKmh = parseFloat(parts[base + 6]!) * KNOTS_TO_KMH;
      const course = parseFloat(parts[base + 7]!) || 0;
      const date = parts[base + 8]!;
      const status = parseInt(parts[base + 9] ?? "FFFFFFFF", 16);
      const alarms = statusAlarms(status);

      const position: Position = {
        deviceId: id,
        timestamp: parseDdmmyyHhmmss(date, time),
        latitude: lat,
        longitude: lon,
        valid,
        speedKmh: Math.round(speedKmh * 10) / 10,
        course,
        attributes: {
          raw: text,
          ignition: (status & 0x00400000) === 0 ? true : undefined,
          alarm: alarms.length ? (alarms[0] as Position["attributes"]["alarm"]) : undefined,
        },
      };
      return { kind: "position", position };
    }

    if (type === "V3") {
      // LBS report: mcc, mnc, lac..., we acknowledge but skip decoding cells here
      return { kind: "heartbeat", deviceId: id };
    }

    if (type === "V2" || type === "S20" || type.startsWith("S")) {
      return { kind: "commandResult", deviceId: id, command: type, result: text };
    }

    return { kind: "ignored", reason: `unhandled h02 type ${type}` };
  }

  private decodeBinary(frame: Uint8Array, session: Session): DecodedMessage {
    // $ + deviceId(5 BCD) + time(3) + date(3) + lat(4) + status/lon(5) + speed/course(3)...
    const hex = (b: number) => b.toString(16).padStart(2, "0");
    const id = Array.from(frame.slice(1, 6)).map(hex).join("");
    session.deviceId = id;
    const t = Array.from(frame.slice(6, 9)).map(hex).join("");
    const d = Array.from(frame.slice(9, 12)).map(hex).join("");
    const latRaw = Array.from(frame.slice(12, 16)).map(hex).join("");
    const lonRaw = Array.from(frame.slice(17, 21)).map(hex).join("");
    const flags = frame[21]!;
    const speedCourse = Array.from(frame.slice(21, 24)).map(hex).join("");

    const lat = nmeaToDecimal(parseFloat(latRaw.slice(0, 4) + "." + latRaw.slice(4)), (flags & 0x04) ? "N" : "S");
    const lon = nmeaToDecimal(parseFloat(lonRaw.slice(0, 5) + "." + lonRaw.slice(5)), (flags & 0x08) ? "E" : "W");

    const position: Position = {
      deviceId: id,
      timestamp: parseDdmmyyHhmmss(d, t),
      latitude: lat,
      longitude: lon,
      valid: (flags & 0x02) !== 0,
      speedKmh: parseFloat(speedCourse.slice(2, 5)) * KNOTS_TO_KMH || 0,
      course: parseFloat(speedCourse.slice(5)) || 0,
      attributes: { raw: "$" + Array.from(frame.slice(1)).map(hex).join("") },
    };
    return { kind: "position", position };
  }

  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null {
    const id = session.deviceId ?? "0000000000";
    const now = new Date();
    const hhmmss =
      String(now.getUTCHours()).padStart(2, "0") +
      String(now.getUTCMinutes()).padStart(2, "0") +
      String(now.getUTCSeconds()).padStart(2, "0");
    const wrap = (body: string): EncodedCommand => ({
      transport: "tcp",
      payload: asciiBytes(`*HQ,${id},${body},${hhmmss}#`),
      description: `H02 command: ${body}`,
    });

    switch (command.type) {
      case "engineStop":
        return wrap("S20,1,1");
      case "engineResume":
        return wrap("S20,1,0");
      case "locate":
        return wrap("CQ");
      case "setInterval":
        return wrap(`S71,22,${command.seconds}`);
      case "custom":
        return wrap(command.payload);
      default:
        return null;
    }
  }
}

/**
 * SinoTrack SMS command catalog (sent to the device SIM, password default 0000).
 * These are surfaced in the UI as "Quick Commands".
 */
export const SINOTRACK_SMS_COMMANDS = {
  setAdmin: (pwd: string, phone: string) => `admin${pwd} ${phone}`,
  locate: (pwd: string) => `position${pwd}`,
  googleLink: (pwd: string) => `url${pwd}`,
  setInterval: (pwd: string, seconds: number) => `freq${pwd} ${seconds}`,
  cutOil: (pwd: string) => `stopelec${pwd}`,
  restoreOil: (pwd: string) => `supplyelec${pwd}`,
  setServer: (pwd: string, host: string, port: number) => `804${pwd} ${host} ${port}`,
  setApn: (pwd: string, apn: string) => `803${pwd} ${apn}`,
  reboot: (pwd: string) => `reboot${pwd}`,
  sosOn: (pwd: string, phone: string) => `101${pwd} ${phone}`,
} as const;
