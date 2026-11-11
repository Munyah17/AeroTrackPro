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

    if (type === "V1" || type === "V4" || type === "VI1" || type === "V8") {
      // V1: time, validity, lat, NS, lon, EW, speed, course, date, status
      // V4: cmd, confirmed-cmd-time, then the V1 field set (base offset 5)
      // V8 (ST-901A): V1 layout + trailing LBS/telemetry fields; validity "V"
      const base = type === "V4" ? 5 : 3;
      const time = parts[base]!;
      const valid = parts[base + 1] === "A" || parts[base + 1] === "V";
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
          ...(type === "V8" ? { extras: parts.slice(base + 10) } : {}),
        },
      };
      return { kind: "position", position };
    }

    if (type === "V3") {
      // LBS report: mcc, mnc, lac..., we acknowledge but skip decoding cells here
      return { kind: "heartbeat", deviceId: id };
    }

    if (type === "B0" || type === "B1") {
      // Status/keep-alive frame (battery + GSM reported by some firmwares).
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
    /* Spec: *HQ,id,CMD,HHMMSS,PARA1,PARA2,...# — time precedes parameters. */
    const wrap = (cmd: string, ...params: (string | number)[]): EncodedCommand => ({
      transport: "tcp",
      payload: asciiBytes(`*HQ,${id},${cmd},${hhmmss}${params.length ? "," + params.join(",") : ""}#`),
      description: `H02 command: ${cmd} ${params.join(" ")}`.trim(),
    });

    switch (command.type) {
      case "engineStop":
        return wrap("S20", 1, 1); // cut oil
      case "engineResume":
        return wrap("S20", 1, 0); // restore oil
      case "locate":
        return wrap("CQ"); // request a fix
      case "setInterval":
        return wrap("S71", 22, command.seconds);
      case "setServer":
        // S23 expects a dotted IP; most ST-901A firmware rejects domain names.
        return wrap("S23", command.host, command.port);
      case "sleepMode":
        // SinoTrack SLEEP: minutes until sleep when stationary; 0 disables.
        // GPRS form unverified on ST-901A — SMS `SLEEP<pwd> <min>` is the
        // documented path (see SINOTRACK_SMS_COMMANDS.setSleep).
        return wrap("SLEEP", command.enabled ? (command.minutes ?? 5) : 0);
      case "custom":
        return wrap(command.payload);
      default:
        return null;
    }
  }
}

/**
 * SinoTrack SMS command catalog — verified against the ST-901A User Manual
 * (sent to the device SIM, password default 0000). Replies "SET OK".
 */
export const SINOTRACK_SMS_COMMANDS = {
  /* --- Setup --------------------------------------------------------- */
  /** Control (admin) number: phone + password + blank + slot 1-3. */
  setControlNumber: (phone: string, pwd: string, slot: 1 | 2 | 3) => `${phone}${pwd} ${slot}`,
  setApn: (pwd: string, apn: string, user?: string, apnPass?: string) =>
    `803${pwd} ${apn}${user ? ` ${user} ${apnPass ?? ""}` : ""}`,
  /** Manual requires a dotted IP — most firmware rejects domain names. */
  setServer: (pwd: string, ip: string, port: number) => `804${pwd} ${ip} ${port}`,
  setTimezone: (pwd: string, ew: "E" | "W", hours: number) => `896${pwd}${ew}${String(hours).padStart(2, "0")}`,
  changePassword: (newPwd: string, oldPwd: string) => `777${newPwd}${oldPwd}`,

  /* --- Mode ----------------------------------------------------------- */
  smsMode: (pwd: string) => `700${pwd}`,
  gprsMode: (pwd: string) => `710${pwd}`,

  /* --- Reporting ------------------------------------------------------- */
  /** ACC-on upload interval, 10-18000 s (0 disables GPRS). */
  setIntervalAccOn: (pwd: string, seconds: number) => `805${pwd} ${seconds}`,
  /** ACC-off upload interval, 10-18000 s (0 disables GPRS). */
  setIntervalAccOff: (pwd: string, seconds: number) => `809${pwd} ${seconds}`,
  /** Daily scheduled report: 665+pwd+HHMM; OFF disables. */
  setDailyReport: (pwd: string, hhmm: string | "OFF") => `665${pwd}${hhmm}`,

  /* --- Queries --------------------------------------------------------- */
  /** Google Maps link with current fix (replies via SMS). */
  locate: (pwd: string) => `669${pwd}`,
  /** Read back full configuration (APN/IP/intervals/status). */
  readConfig: () => `RCONF`,
  /** Sleep after N minutes stationary (1-720); 0 disables — saves power. */
  setSleep: (pwd: string, minutes: number) => `SLEEP${pwd} ${minutes}`,
  /** Reboot the tracker — takes no password on ST-901A. */
  reboot: () => `RESTART`,

  /* --- Alarms ---------------------------------------------------------- */
  geoFenceOn: (pwd: string) => `211${pwd}`,
  geoFenceOff: (pwd: string) => `210${pwd}`,
  /** Radius in metres; vendor suggests >= 1000. */
  setGeoFenceRadius: (pwd: string, metres: number) => `005${pwd} ${metres}`,
  /** km/h; 0 disables. */
  setOverspeed: (pwd: string, kmh: number) => `122${pwd} ${kmh}`,
  shockAlarmOn: (pwd: string, seconds: number) => `181${pwd}T${seconds}`,
  shockAlarmOff: (pwd: string) => `180${pwd}`,
  accAlarmOn: (pwd: string) => `886${pwd}`,
  accAlarmOff: (pwd: string) => `887${pwd}`,
  /** 150 = alarms phone-call + SMS, 151 = SMS only. */
  callModeOn: (pwd: string) => `150${pwd}`,
  callModeOff: (pwd: string) => `151${pwd}`,

  /* --- Relay (unverified on ST-901A) ------------------------------------ */
  /** From the ST-901 family / H02 protocol doc (S20) — not in the ST-901A
   *  manual, which only documents the cut-power *alarm*. Test on bench first. */
  cutOil: (pwd: string) => `stopelec${pwd}`,
  restoreOil: (pwd: string) => `supplyelec${pwd}`,
} as const;
