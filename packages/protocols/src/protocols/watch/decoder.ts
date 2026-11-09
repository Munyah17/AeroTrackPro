/**
 * Watch / 365GPS protocol — GF-07, GF-09, GF-21/22 and the Wonlex/3G
 * kids-watch family behind ZeroGPS, Setracker and 365GPS supplier apps.
 *
 * Frame: [3G*<deviceId>*<hexlen>*<content>]
 *   content = CMD,comma,separated,fields  (len = hex length of content)
 *
 * Key commands:
 *   LK  link keep-alive           -> reply [3G*id*0002*LK]
 *   UD  upload position (+ LBS)   -> may need no ack; we ack UD
 *   UD2 upload position + wifi    -> same layout, wifi macs appended
 *   AL  alarm keep-alive          -> reply [3G*id*0002*AL]
 *   TK  status query from device  -> reply [3G*id*0002*TK]
 *
 * UD fields (Wonlex spec):
 *   UD,DDMMYY,HHMMSS,A|V,lat,N|S,lon,E|W,speed,course,alt,sats,gsm,batt,
 *   steps,rolls,bitmap,<lbs cells...>[,<wifi macs>]
 *   LBS cells: [count?,] {mcc,mnc,lac,ci[,signal]} groups — best-effort.
 *
 * Accuracy contract: the A/V flag is the fix source. 'V' means the coords
 * are a cell-tower (LBS) estimate, which is exactly why supplier apps show
 * 500m-2km drift. We surface fixSource="lbs"|"gps" + an accuracy estimate
 * so AeroTrack can mark — not silently trust — approximate fixes.
 */

import {
  DecodedMessage,
  DeviceCommand,
  EncodedCommand,
  Position,
  ProtocolDecoder,
  Session,
} from "../../core/types";
import { ascii, asciiBytes, parseDdmmyyHhmmss } from "../../core/bytes";

/** Rough LBS accuracy estimate in metres from cell info richness. */
function lbsAccuracy(cells: number, hasSignal: boolean): number {
  if (cells >= 3) return hasSignal ? 400 : 600;
  if (cells === 2) return 800;
  return 1500; // single serving cell — worst case, matches the 1-2km drift
}

function reply(id: string, content: string): string {
  const len = content.length.toString(16).toUpperCase().padStart(4, "0");
  return `[3G*${id}*${len}*${content}]`;
}

/** SMS-style config commands for the 365GPS family (community-verified). */
export const GF_SMS_COMMANDS = {
  /** Point at our ingest: pw,123456,ip,<ip>,<port># */
  setServer: (ip: string, port: number) => `pw,123456,ip,${ip},${port}#`,
  uploadInterval: (seconds: number) => `pw,123456,upload,${seconds}#`,
  status: () => "pw,123456,ts#",
  apn: (apn: string) => `pw,123456,apn,${apn}#`,
} as const;

export class WatchDecoder implements ProtocolDecoder {
  readonly protocol = "watch";
  readonly defaultPort = 5093;

  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] } {
    const frames: Uint8Array[] = [];
    let offset = 0;
    while (offset < buffer.length) {
      if (buffer[offset] === 0x5b /* '[' */) {
        const end = buffer.indexOf(0x5d /* ']' */, offset);
        if (end === -1) break;
        frames.push(buffer.slice(offset, end + 1));
        offset = end + 1;
      } else {
        offset += 1;
      }
    }
    return { consumed: offset, frames };
  }

  decode(frame: Uint8Array, session: Session): DecodedMessage {
    const text = ascii(frame).trim();
    const m = text.match(/^\[(\w+)\*(\w+)\*([0-9A-Fa-f]{4})\*(.+)\]$/);
    if (!m) return { kind: "ignored", reason: "malformed watch frame" };

    const id = m[2]!;
    const content = m[4]!;
    const firstFrame = session.deviceId === undefined;
    session.deviceId = id;
    const fields = content.split(",");
    const cmd = fields[0]?.toUpperCase();

    switch (cmd) {
      case "LK": {
        /* First frame on a fresh connection doubles as login. */
        return firstFrame
          ? { kind: "login", deviceId: id, response: reply(id, "LK") }
          : { kind: "heartbeat", deviceId: id, response: reply(id, "LK") };
      }
      case "AL":
        return { kind: "heartbeat", deviceId: id, response: reply(id, "AL") };
      case "TK":
      case "TKQ":
        return { kind: "heartbeat", deviceId: id, response: reply(id, "TK") };
      case "UD":
      case "UD2":
      case "WG":
        return this.decodePosition(id, fields, text);
      default:
        return { kind: "ignored", reason: `unhandled watch cmd ${cmd}` };
    }
  }

  private decodePosition(id: string, f: string[], raw: string): DecodedMessage {
    // f[0]=UD, 1=DDMMYY, 2=HHMMSS, 3=A|V, 4=lat, 5=NS, 6=lon, 7=EW,
    // 8=speed, 9=course, 10=alt, 11=sats, 12=gsm, 13=batt, 14=steps,
    // 15=rolls, 16=bitmap, 17+=LBS cells / wifi macs
    if (f.length < 8) return { kind: "ignored", reason: "short UD frame" };

    const gpsFix = f[3] === "A";
    const latRaw = parseFloat(f[4]!);
    const lonRaw = parseFloat(f[6]!);
    if (Number.isNaN(latRaw) || Number.isNaN(lonRaw) || (latRaw === 0 && lonRaw === 0)) {
      return { kind: "ignored", reason: "null coordinates" };
    }
    const lat = (f[5] === "S" ? -1 : 1) * Math.abs(latRaw);
    const lon = (f[7] === "W" ? -1 : 1) * Math.abs(lonRaw);

    /* Best-effort LBS extraction: scan the tail for a plausible
       mcc(200-999),mnc,lac,ci run. Wonlex puts an optional cell count first. */
    const tail = f.slice(17).map((s) => s.trim());
    let lbs: { mcc: number; mnc: number; lac: number; cellId: number } | undefined;
    let cellCount = 0;
    for (let i = 0; i + 3 < tail.length; i++) {
      const mcc = Number(tail[i]);
      if (mcc >= 200 && mcc <= 999 && Number.isInteger(mcc)) {
        const mnc = Number(tail[i + 1]);
        const lac = Number(tail[i + 2]);
        const ci = Number(tail[i + 3]);
        if (Number.isInteger(mnc) && lac > 0 && ci > 0) {
          lbs = { mcc, mnc, lac, cellId: ci };
          // Cell groups repeat as mcc,mnc,lac,ci[,rssi] — count every
          // plausible mcc (200-999) that starts a complete group.
          for (let k = i; k + 3 < tail.length; k++) {
            const m = Number(tail[k]);
            if (m >= 200 && m <= 999 && Number.isInteger(m)) cellCount++;
          }
          break;
        }
      }
    }

    const position: Position = {
      deviceId: id,
      timestamp: parseDdmmyyHhmmss(f[1]!, f[2]!),
      latitude: lat,
      longitude: lon,
      valid: gpsFix,
      speedKmh: Math.round((parseFloat(f[8]!) || 0) * 10) / 10, // km/h on this family
      course: parseFloat(f[9]!) || 0,
      altitudeM: parseFloat(f[10] ?? "") || undefined,
      satellites: parseInt(f[11] ?? "", 10) || undefined,
      attributes: {
        gsmSignal: parseInt(f[12] ?? "", 10) || undefined,
        batteryLevel: parseInt(f[13] ?? "", 10) || undefined,
        fixSource: gpsFix ? "gps" : "lbs",
        accuracy: gpsFix ? undefined : lbsAccuracy(cellCount || (lbs ? 1 : 0), tail.length > 4),
        ...(lbs ? { lbs } : {}),
        raw,
      },
    };

    return { kind: "position", position, response: reply(id, f[0]!.toUpperCase()) };
  }

  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null {
    /* GF-07/09 take config over SMS (pw,...#) not the TCP channel; only a
       passthrough custom frame is wired for debugging. */
    if (command.type === "custom" && session.deviceId) {
      const payload = reply(session.deviceId, command.payload);
      return {
        transport: "tcp",
        payload: asciiBytes(payload),
        description: `watch custom: ${command.payload}`,
      };
    }
    return null;
  }
}
