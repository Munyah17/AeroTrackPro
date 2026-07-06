/**
 * GPS103 ASCII protocol — Coban TK103B, TK303G, TK403A (and Xexun ancestors).
 *
 * Position frame:
 *   imei:359586015829802,tracker,0710201441,,F,064128.000,A,2232.6083,N,11404.8137,E,0.00,0;
 *   imei:<imei>,<event>,<localYYMMDDHHMM>,<phone>,F,<utc hhmmss.sss>,A,<lat>,<NS>,<lon>,<EW>,<speed knots>,<course>;
 *
 * Handshake: device sends "##,imei:...,A;" → server replies "LOAD".
 * Heartbeat: bare imei digits → server replies "ON".
 *
 * Event field doubles as the alarm type: help me (SOS), low battery,
 * move, speed, door alarm, acc on/off, oil (fuel cut feedback), etc.
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
import { ascii, asciiBytes, nmeaToDecimal } from "../../core/bytes";

const KNOTS_TO_KMH = 1.852;

const EVENT_ALARMS: Record<string, AlarmType> = {
  "help me": "sos",
  "low battery": "lowBattery",
  "move": "movement",
  "speed": "overspeed",
  "door alarm": "door",
  "stockade": "geofenceExit",
  "ac alarm": "powerCut",
  "accident alarm": "crash",
  "sensor alarm": "vibration",
  "acc on": "accOn",
  "acc off": "accOff",
};

export class Gps103Decoder implements ProtocolDecoder {
  readonly protocol = "gps103";
  readonly defaultPort = 5001;

  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] } {
    const frames: Uint8Array[] = [];
    let offset = 0;
    let start = 0;
    while (offset < buffer.length) {
      const b = buffer[offset]!;
      if (b === 0x3b /* ';' */ || b === 0x0a) {
        if (offset > start) frames.push(buffer.slice(start, offset));
        start = offset + 1;
      }
      offset += 1;
    }
    // Heartbeat frames are bare IMEI digits with no terminator — flush if the
    // remaining buffer is all digits (device waits for "ON" reply).
    const rest = buffer.slice(start);
    if (rest.length >= 15 && /^\d+$/.test(ascii(rest))) {
      frames.push(rest);
      start = buffer.length;
    }
    return { consumed: start, frames };
  }

  decode(frame: Uint8Array, session: Session): DecodedMessage {
    const text = ascii(frame).trim();
    if (!text) return { kind: "ignored", reason: "empty" };

    // Handshake: "##,imei:359586015829802,A"
    if (text.startsWith("##")) {
      const imei = text.match(/imei:(\d+)/)?.[1];
      if (imei) session.deviceId = imei;
      return { kind: "login", deviceId: imei ?? "", response: "LOAD" };
    }

    // Heartbeat: bare IMEI
    if (/^\d{15,17}$/.test(text)) {
      session.deviceId = text;
      return { kind: "heartbeat", deviceId: text, response: "ON" };
    }

    if (!text.startsWith("imei:")) return { kind: "ignored", reason: "unrecognized gps103 frame" };

    const parts = text.slice(5).split(",");
    const imei = parts[0]!;
    const event = parts[1] ?? "tracker";
    session.deviceId = imei;

    // No-GPS variants (LBS fallback): "...,L,..." instead of "F"
    const fixFlag = parts[4];
    if (fixFlag === "L") {
      return { kind: "commandResult", deviceId: imei, command: event, result: "LBS-only report" };
    }

    const localStamp = parts[2] ?? ""; // YYMMDDHHMM local device time
    const utcTime = parts[5] ?? "000000"; // hhmmss.sss
    const valid = parts[6] === "A";
    const lat = nmeaToDecimal(parseFloat(parts[7] ?? "0"), parts[8] ?? "N");
    const lon = nmeaToDecimal(parseFloat(parts[9] ?? "0"), parts[10] ?? "E");
    const speedKmh = (parseFloat(parts[11] ?? "0") || 0) * KNOTS_TO_KMH;
    const course = parseFloat(parts[12] ?? "0") || 0;

    // Date from local stamp (YYMMDD...), time-of-day from the UTC field.
    const yy = 2000 + +(localStamp.slice(0, 2) || "0");
    const MM = +(localStamp.slice(2, 4) || "1");
    const dd = +(localStamp.slice(4, 6) || "1");
    const timestamp = new Date(
      Date.UTC(yy, MM - 1, dd, +utcTime.slice(0, 2), +utcTime.slice(2, 4), +utcTime.slice(4, 6)),
    );

    const position: Position = {
      deviceId: imei,
      timestamp,
      latitude: lat,
      longitude: lon,
      valid,
      speedKmh: Math.round(speedKmh * 10) / 10,
      course,
      attributes: {
        raw: text,
        event,
        alarm: EVENT_ALARMS[event.toLowerCase()],
        ignition: event === "acc on" ? true : event === "acc off" ? false : undefined,
      },
    };
    return { kind: "position", position };
  }

  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null {
    // GPRS commands mirror SMS commands: "**,imei:<imei>,<cmd>"
    const imei = session.deviceId ?? "";
    const wrap = (cmd: string): EncodedCommand => ({
      transport: "tcp",
      payload: asciiBytes(`**,imei:${imei},${cmd}`),
      description: `GPS103 command: ${cmd}`,
    });
    switch (command.type) {
      case "engineStop":
        return wrap("J"); // stop oil & power
      case "engineResume":
        return wrap("K"); // resume oil & power
      case "locate":
        return wrap("B"); // single locate
      case "setInterval":
        return wrap(`C,${String(command.seconds).padStart(2, "0")}s`);
      case "setOverspeed":
        return wrap(`H,${String(command.kmh).padStart(3, "0")}`);
      case "arm":
        return wrap("L"); // lock / arm
      case "disarm":
        return wrap("M");
      case "custom":
        return wrap(command.payload);
      default:
        return null;
    }
  }
}

/** Coban SMS command catalog (default password 123456). */
export const COBAN_SMS_COMMANDS = {
  begin: (pwd: string) => `begin${pwd}`,
  setAdmin: (pwd: string, phone: string) => `admin${pwd} ${phone}`,
  locate: (pwd: string) => `smslink${pwd}`,
  trackerMode: (pwd: string) => `tracker${pwd}`,
  monitorMode: (pwd: string) => `monitor${pwd}`, // voice listen-in
  cutOil: (pwd: string) => `stop${pwd}`,
  restoreOil: (pwd: string) => `resume${pwd}`,
  setInterval: (pwd: string, s: string) => `fix030s***n${pwd}`.replace("030s", s),
  setApn: (pwd: string, apn: string) => `apn${pwd} ${apn}`,
  setServer: (pwd: string, ip: string, port: number) => `adminip${pwd} ${ip} ${port}`,
  gprsOn: (pwd: string) => `gprs${pwd}`,
  overspeed: (pwd: string, kmh: number) => `speed${pwd} ${String(kmh).padStart(3, "0")}`,
} as const;
