/**
 * Queclink @Track ASCII protocol — Queclink GL300 portable asset tracker.
 *
 * Report frame:
 *   +RESP:GTFRI,360100,135790246811220,,0,0,1,1,4.3,92,70.0,121.354335,31.222073,20090214013254,0460,0000,18d8,6141,00,,20090214093254,11F0$
 * Ack frame: +ACK:GTxxx,...$
 * Buffered reports use +BUFF: prefix.
 *
 * Commands: AT+GTxxx=<password>,<params>,<serial>$ (password default gl300).
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
import { ascii, asciiBytes } from "../../core/bytes";

const REPORT_ALARMS: Record<string, AlarmType> = {
  GTSOS: "sos",
  GTSPD: "overspeed",
  GTBPL: "lowBattery",
  GTMPF: "powerCut",
  GTSTT: "movement",
  GTGIR: "geofenceEnter",
  GTGOR: "geofenceExit",
  GTNMR: "movement",
  GTTMP: "temperature",
};

function parseTs(ts: string): Date {
  return new Date(
    Date.UTC(+ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8), +ts.slice(8, 10), +ts.slice(10, 12), +ts.slice(12, 14)),
  );
}

export class QueclinkDecoder implements ProtocolDecoder {
  readonly protocol = "queclink";
  readonly defaultPort = 5004;

  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] } {
    const frames: Uint8Array[] = [];
    let offset = 0;
    let start = 0;
    while (offset < buffer.length) {
      if (buffer[offset] === 0x24 /* '$' */) {
        frames.push(buffer.slice(start, offset + 1));
        start = offset + 1;
      }
      offset += 1;
    }
    return { consumed: start, frames };
  }

  decode(frame: Uint8Array, session: Session): DecodedMessage {
    const text = ascii(frame).trim().replace(/\$$/, "");
    const match = text.match(/^\+(RESP|BUFF|ACK|EVENT):(GT\w+),(.*)$/);
    if (!match) return { kind: "ignored", reason: "unrecognized @Track frame" };
    const [, channel, report, rest] = match;
    const parts = rest!.split(",");
    const imei = parts[1] ?? "";
    if (imei) session.deviceId = imei;

    if (channel === "ACK") {
      return { kind: "commandResult", deviceId: imei, command: report!, result: text };
    }

    // GTFRI/GTGEO/GTSOS/... share the location block layout:
    // ...,<accuracy>,<speed>,<azimuth>,<altitude>,<lon>,<lat>,<gpsUtc>,<mcc>,<mnc>,<lac>,<cell>,...
    // GL300 GTFRI: idx 3=reserved,4=battery? — locate the timestamp field (14 digits) and work backwards.
    let tsIndex = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^\d{14}$/.test(parts[i]!) && tsIndex === -1) tsIndex = i;
    }
    // The GPS fix timestamp is the first 14-digit field after the lat field;
    // find lon/lat as the two floats immediately preceding it.
    let gpsTs = -1;
    for (let i = 6; i < parts.length - 2; i++) {
      if (
        /^\d{14}$/.test(parts[i]!) &&
        /^-?\d+\.\d+$/.test(parts[i - 1] ?? "") &&
        /^-?\d+\.\d+$/.test(parts[i - 2] ?? "")
      ) {
        gpsTs = i;
        break;
      }
    }
    if (gpsTs === -1) {
      return { kind: "commandResult", deviceId: imei, command: report!, result: text };
    }

    const latitude = parseFloat(parts[gpsTs - 1]!);
    const longitude = parseFloat(parts[gpsTs - 2]!);
    const altitudeM = parseFloat(parts[gpsTs - 3] ?? "") || undefined;
    const course = parseFloat(parts[gpsTs - 4] ?? "") || 0;
    const speedKmh = parseFloat(parts[gpsTs - 5] ?? "") || 0;

    // Battery percentage rides near the tail on GL300 (before send-time field).
    const battery = parts
      .slice(gpsTs + 5)
      .map((p) => parseInt(p, 10))
      .find((n) => Number.isFinite(n) && n >= 0 && n <= 100);

    return {
      kind: "position",
      position: {
        deviceId: imei,
        timestamp: parseTs(parts[gpsTs]!),
        latitude,
        longitude,
        valid: true,
        speedKmh,
        course,
        altitudeM,
        attributes: {
          raw: text,
          alarm: REPORT_ALARMS[report!],
          batteryLevel: battery,
          event: report,
        },
      },
    };
  }

  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null {
    void session;
    const pwd = "gl300";
    const serial = "FFFF";
    const wrap = (cmd: string, params: string): EncodedCommand => ({
      transport: "tcp",
      payload: asciiBytes(`AT+${cmd}=${pwd},${params},${serial}$`),
      description: `Queclink ${cmd}`,
    });
    switch (command.type) {
      case "locate":
        return wrap("GTRTO", "1,,,,,,");
      case "setInterval":
        return wrap("GTFRI", `1,1,,,0000,2359,${command.seconds},${command.seconds},,,1F,0,,,,`);
      case "reboot":
        return wrap("GTRTO", "3,,,,,,");
      case "custom":
        return { transport: "tcp", payload: asciiBytes(command.payload), description: command.payload };
      default:
        return null;
    }
  }
}
