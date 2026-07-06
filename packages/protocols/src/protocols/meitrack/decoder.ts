/**
 * Meitrack ASCII protocol — Meitrack T366 (marine/construction, IP67).
 *
 * Frame: $$<flag><len>,<imei>,<cmd>,<payload>*<checksum>\r\n
 * Position command AAA:
 *   $$A163,864507032228727,AAA,35,22.318osv,114.169,180101012000,A,7,13,0,22,1.2,15,1000,2000,460|0|E166|A08C,0000,,,*XX
 *   fields: event,lat,lon,yymmddhhmmss,fix,sats,gsm,speed,course,hdop,alt,mileage,runtime,cell,state,ad...
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
import { ascii, asciiBytes, sumChecksum } from "../../core/bytes";

const EVENT_ALARMS: Record<number, AlarmType> = {
  1: "sos",
  17: "lowBattery",
  18: "powerCut", // low external voltage
  19: "overspeed",
  20: "geofenceEnter",
  21: "geofenceExit",
  23: "powerCut",
  36: "tow",
  37: "unknown", // RFID
  39: "crash",
  79: "hardAcceleration",
  73: "hardBraking",
};

export class MeitrackDecoder implements ProtocolDecoder {
  readonly protocol = "meitrack";
  readonly defaultPort = 5020;

  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] } {
    const frames: Uint8Array[] = [];
    let offset = 0;
    while (offset + 4 < buffer.length) {
      if (buffer[offset] === 0x24 && buffer[offset + 1] === 0x24) {
        // length field: digits after flag char until first comma
        let i = offset + 3;
        let lenStr = "";
        while (i < buffer.length && buffer[i]! >= 0x30 && buffer[i]! <= 0x39) {
          lenStr += String.fromCharCode(buffer[i]!);
          i++;
        }
        const total = i - offset + parseInt(lenStr || "0", 10);
        if (!lenStr || offset + total > buffer.length) break;
        frames.push(buffer.slice(offset, offset + total));
        offset += total;
      } else {
        offset += 1;
      }
    }
    return { consumed: offset, frames };
  }

  decode(frame: Uint8Array, session: Session): DecodedMessage {
    const text = ascii(frame).trim();
    const body = text.replace(/^\$\$[A-Z0-9]\d+,/, "").replace(/\*[0-9A-Fa-f]{2}$/, "");
    const parts = body.split(",");
    const imei = parts[0]!;
    const cmd = parts[1] ?? "";
    session.deviceId = imei;

    if (cmd !== "AAA") {
      return { kind: "commandResult", deviceId: imei, command: cmd, result: body };
    }

    const event = parseInt(parts[2] ?? "35", 10);
    const ts = parts[5] ?? "000101000000";
    const timestamp = new Date(
      Date.UTC(2000 + +ts.slice(0, 2), +ts.slice(2, 4) - 1, +ts.slice(4, 6), +ts.slice(6, 8), +ts.slice(8, 10), +ts.slice(10, 12)),
    );

    const position: Position = {
      deviceId: imei,
      timestamp,
      latitude: parseFloat(parts[3] ?? "0"),
      longitude: parseFloat(parts[4] ?? "0"),
      valid: parts[6] === "A",
      speedKmh: parseFloat(parts[9] ?? "0") || 0,
      course: parseFloat(parts[10] ?? "0") || 0,
      satellites: parseInt(parts[7] ?? "0", 10) || undefined,
      hdop: parseFloat(parts[11] ?? "0") || undefined,
      altitudeM: parseFloat(parts[12] ?? "0") || undefined,
      odometerM: parseInt(parts[13] ?? "0", 10) || undefined,
      attributes: {
        raw: text,
        alarm: EVENT_ALARMS[event],
        rssi: parseInt(parts[8] ?? "0", 10) || undefined,
        event: String(event),
      },
    };
    return { kind: "position", position };
  }

  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null {
    const imei = session.deviceId ?? "";
    const wrap = (cmd: string, args = ""): EncodedCommand => {
      const body = `,${imei},${cmd}${args ? "," + args : ""}*`;
      const withoutChecksum = `@@Q${body.length + 25}${body}`;
      const checksum = sumChecksum(withoutChecksum).toString(16).toUpperCase().padStart(2, "0");
      return {
        transport: "tcp",
        payload: asciiBytes(`${withoutChecksum}${checksum}\r\n`),
        description: `Meitrack ${cmd}${args ? " " + args : ""}`,
      };
    };
    switch (command.type) {
      case "engineStop":
        return wrap("C01", "0,12222"); // output 1 on (fuel cut relay)
      case "engineResume":
        return wrap("C01", "0,02222");
      case "locate":
        return wrap("A10");
      case "setInterval":
        return wrap("A12", String(Math.round(command.seconds / 10)));
      case "reboot":
        return wrap("F02");
      case "custom":
        return wrap(command.payload);
      default:
        return null;
    }
  }
}
