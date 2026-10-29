/**
 * JT/T 808 protocol — Chinese Ministry of Transport standard vehicle
 * terminal protocol (JT808-2013, with 2019 header tolerance). Used by
 * J16/JW-family CAT1 terminals, Chinese-market Suntech units, and most
 * government-mandated fleet hardware.
 *
 * Wire spec:
 *   Frame:  0x7E | msgId(2) | props(2) | phone BCD(6) | serial(2)
 *           | [2019: ver(1) + phone BCD(10)] | body | xorCheck(1) | 0x7E
 *   Escape: 0x7E→0x7D 0x02, 0x7D→0x7D 0x01
 *   Props:  bits0-9 body length, bit10-12 encryption, bit13 subpackage,
 *           bits14-15 version flag (1 = 2019 header).
 *   Loc 0200: alarm(4) + status(4) + lat(4)/1e6 + lon(4)/1e6 + alt(2)
 *           + speed(2, 0.1km/h) + course(2) + BCD time YYMMDDhhmmss GMT+8
 *           + additional TLV items (0x01 mileage, 0x02 fuel, 0x30 RSSI,
 *           0x31 satellites).
 *   Replies: 0x8001 general, 0x8100 registration, 0x8003 heartbeat.
 */

import {
  AlarmType,
  DecodedMessage,
  DeviceCommand,
  EncodedCommand,
  Position,
  ProtocolDecoder,
  Session,
} from "../../core/types";
import { bcd, concatBytes, toHex, u16, u32 } from "../../core/bytes";

const FLAG = 0x7e;
const ESC = 0x7d;

function unescape(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] === ESC && i + 1 < data.length) {
      const next = data[i + 1]!;
      if (next === 0x01) { out.push(ESC); i++; continue; }
      if (next === 0x02) { out.push(FLAG); i++; continue; }
    }
    out.push(data[i]!);
  }
  return Uint8Array.from(out);
}

function escape(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (const b of data) {
    if (b === FLAG) { out.push(ESC, 0x02); continue; }
    if (b === ESC) { out.push(ESC, 0x01); continue; }
    out.push(b);
  }
  return Uint8Array.from(out);
}

function xorChecksum(data: Uint8Array): number {
  let c = 0;
  for (const b of data) c ^= b;
  return c & 0xff;
}

/** Map the 0x0200 alarm dword to our normalized alarm type. */
function mapAlarm(alarm: number): AlarmType | undefined {
  if (alarm === 0) return undefined;
  if (alarm & 0x0001) return "sos";
  if (alarm & 0x0002) return "overspeed";
  if (alarm & 0x0004) return "fatigueDriving";
  if (alarm & 0x0080) return "lowBattery"; // undervoltage
  if (alarm & 0x0100) return "powerCut";
  if (alarm & 0x0200) return "tamper"; // main antenna/power tamper class
  return "unknown";
}

export class Jt808Decoder implements ProtocolDecoder {
  readonly protocol = "jt808";
  readonly defaultPort = 5015;

  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] } {
    const frames: Uint8Array[] = [];
    let offset = 0;
    while (offset < buffer.length) {
      if (buffer[offset] !== FLAG) { offset++; continue; }
      const end = buffer.indexOf(FLAG, offset + 1);
      if (end === -1) break; // incomplete trailing frame
      frames.push(buffer.slice(offset + 1, end)); // strip flags
      offset = end + 1;
    }
    return { consumed: offset, frames };
  }

  decode(raw: Uint8Array, session: Session): DecodedMessage {
    if (raw.length < 1) return { kind: "ignored", reason: "empty jt808 frame" };
    const data = unescape(raw);
    if (data.length < 13) return { kind: "ignored", reason: "short jt808 frame" };

    const body = data.slice(0, -1);
    const checkGiven = data[data.length - 1]!;
    const checkCalc = xorChecksum(body);
    // Some terminals send a bad checksum — decode anyway, flag it.

    const msgId = u16(body, 0);
    const props = u16(body, 2);
    const is2019 = (props & 0x4000) !== 0;
    const phone = is2019 ? bcd(body, 7, 10).replace(/^0+/, "") : bcd(body, 5, 6);
    const serial = is2019 ? u16(body, 17) : u16(body, 11);
    const bodyStart = is2019 ? 19 : 13;

    if (msgId !== 0x0001) session.deviceId = phone || session.deviceId;

    const makeResponse = (replyMsgId: number, replyBody: Uint8Array): Uint8Array =>
      this.wrap(replyMsgId, replyBody, session.deviceId ?? phone, session.serverSerial++);
    const generalAck = (result = 0): Uint8Array => {
      const b = new Uint8Array(5);
      new DataView(b.buffer).setUint16(0, serial);
      new DataView(b.buffer).setUint16(2, msgId);
      b[4] = result;
      return makeResponse(0x8001, b);
    };

    switch (msgId) {
      case 0x0002: // Heartbeat
        return { kind: "heartbeat", deviceId: session.deviceId, response: generalAck() };

      case 0x0100: { // Registration → 0x8100 (serial, result, auth code)
        const resp = new Uint8Array(3 + 8);
        new DataView(resp.buffer).setUint16(0, serial);
        resp[2] = 0; // success
        resp.set([0x41, 0x45, 0x52, 0x4f, 0x54, 0x52, 0x4b, 0x21], 3); // "AEROTRK!"
        return { kind: "login", deviceId: session.deviceId ?? phone, response: makeResponse(0x8100, resp) };
      }

      case 0x0102: // Authentication
        return { kind: "login", deviceId: session.deviceId ?? phone, response: generalAck() };

      case 0x0001: // Terminal general response to a downlink command
        return {
          kind: "commandResult",
          deviceId: session.deviceId,
          command: `0x${u16(body, bodyStart + 2).toString(16)}`,
          result: `result=${body[bodyStart + 4]} checksum ${checkCalc === checkGiven ? "ok" : "bad"}`,
        };

      case 0x0200: {
        const position = this.decodeLocation(body.slice(bodyStart), session);
        if (!position) return { kind: "ignored", reason: "jt808 0x0200 short body" };
        return { kind: "position", position, response: generalAck() };
      }

      case 0x0704: { // Batch location upload: count(2) + type(1) + [len(2)+body]*
        const positions: Position[] = [];
        const n = u16(body, bodyStart);
        let q = bodyStart + 3;
        for (let i = 0; i < n && q + 2 <= body.length; i++) {
          const itemLen = u16(body, q);
          const item = this.decodeLocation(body.slice(q + 2, q + 2 + itemLen), session);
          if (item) positions.push(item);
          q += 2 + itemLen;
        }
        if (positions.length === 0) return { kind: "ignored", reason: "jt808 batch had no fixes" };
        return { kind: "positions", positions, response: generalAck() };
      }

      case 0x0800: // Media event → ack so the terminal keeps reporting
      case 0x0801:
        return { kind: "ack", response: generalAck() };

      default:
        return { kind: "ignored", reason: `unhandled jt808 msg 0x${msgId.toString(16)}` };
    }
  }

  private decodeLocation(loc: Uint8Array, session: Session): Position | null {
    if (loc.length < 28) return null;
    const alarm = u32(loc, 0);
    const status = u32(loc, 4);
    const latRaw = u32(loc, 8) / 1e6;
    const lonRaw = u32(loc, 12) / 1e6;
    const altitude = u16(loc, 16);
    const speed = u16(loc, 18) / 10; // 0.1 km/h
    const course = u16(loc, 20);
    const timeStr = bcd(loc, 22, 6); // YYMMDDhhmmss, GMT+8

    const timestamp = new Date(
      Date.UTC(
        2000 + +timeStr.slice(0, 2), +timeStr.slice(2, 4) - 1, +timeStr.slice(4, 6),
        +timeStr.slice(6, 8), +timeStr.slice(8, 10), +timeStr.slice(10, 12),
      ) - 8 * 3600 * 1000, // convert GMT+8 → UTC
    );

    const attributes: Record<string, unknown> = {
      ignition: (status & 0x0001) !== 0,
      raw: toHex(loc),
    };
    if (status & 0x0400) attributes.blocked = true; // oil circuit cut
    if (status & 0x0800) attributes.blocked = true; // main circuit cut

    // Additional TLV items
    let q = 28;
    while (q + 2 <= loc.length) {
      const itemId = loc[q]!;
      const itemLen = loc[q + 1]!;
      const v = loc.slice(q + 2, q + 2 + itemLen);
      if (itemId === 0x01 && itemLen >= 4) attributes.odometerM = u32(v, 0) * 100;
      else if (itemId === 0x02 && itemLen >= 2) attributes.fuelLevel = u16(v, 0) / 10;
      else if (itemId === 0x30 && itemLen >= 1) attributes.rssi = v[0];
      else if (itemId === 0x31 && itemLen >= 1) attributes.satellites = v[0];
      q += 2 + itemLen;
    }

    const alarmType = mapAlarm(alarm);
    if (alarmType) attributes.alarm = alarmType;

    const south = (status & 0x0004) !== 0;
    const west = (status & 0x0008) !== 0;

    return {
      deviceId: session.deviceId ?? "unknown",
      timestamp,
      latitude: south ? -latRaw : latRaw,
      longitude: west ? -lonRaw : lonRaw,
      valid: (status & 0x0002) !== 0,
      speedKmh: Math.round(speed * 10) / 10,
      course,
      altitudeM: altitude,
      ...(typeof attributes.odometerM === "number" ? { odometerM: attributes.odometerM } : {}),
      ...(typeof attributes.satellites === "number" ? { satellites: attributes.satellites } : {}),
      attributes,
    };
  }

  /** Build a downlink 0x7E frame. */
  private wrap(msgId: number, msgBody: Uint8Array, phone: string, serial: number): Uint8Array {
    const padded = (phone.replace(/\D/g, "") || "0").padStart(12, "0").slice(-12);
    const phoneBytes = new Uint8Array(6);
    for (let i = 0; i < 6; i++) {
      phoneBytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
    }
    const header = new Uint8Array(12);
    const view = new DataView(header.buffer);
    view.setUint16(0, msgId);
    view.setUint16(2, msgBody.length & 0x3ff);
    header.set(phoneBytes, 4);
    view.setUint16(10, serial);
    const content = concatBytes(header, msgBody);
    return concatBytes(
      new Uint8Array([FLAG]),
      escape(concatBytes(content, new Uint8Array([xorChecksum(content)]))),
      new Uint8Array([FLAG]),
    );
  }

  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null {
    const phone = session.deviceId;
    if (!phone) return null;
    const serial = session.serverSerial++;
    const wrap = (msgId: number, body: Uint8Array, description: string): EncodedCommand => ({
      transport: "tcp",
      payload: this.wrap(msgId, body, phone, serial),
      description,
    });

    switch (command.type) {
      case "locate":
        return wrap(0x8201, new Uint8Array(0), "JT808 query location 0x8201");
      case "reboot":
        return wrap(0x8105, new Uint8Array([0x04]), "JT808 terminal reset 0x8105");
      case "setInterval": {
        // 0x8103 param 0x0001: wakeup/report interval in seconds.
        const param = new Uint8Array(4);
        new DataView(param.buffer).setUint32(0, command.seconds);
        const body = new Uint8Array(1 + 1 + 4 + param.length);
        body[0] = 1; // param count
        const view = new DataView(body.buffer);
        view.setUint32(1, 0x0001);
        body[5] = param.length;
        body.set(param, 6);
        return wrap(0x8103, body, `JT808 set report interval ${command.seconds}s`);
      }
      case "setServer": {
        // 0x8103 param 0x0013: server "APN,dial,user,pass,address,tcpPort,udpPort,id1,id2,id3"
        const addr = asciiBytesJt(`${command.host},${command.port},0,0,0,0,0,0`);
        const strParam = new Uint8Array(1 + addr.length);
        strParam[0] = addr.length;
        strParam.set(addr, 1);
        const body = new Uint8Array(1 + 1 + 4 + strParam.length);
        body[0] = 1;
        const view = new DataView(body.buffer);
        view.setUint32(1, 0x0013);
        body[5] = strParam.length;
        body.set(strParam, 6);
        return wrap(0x8103, body, `JT808 set server ${command.host}:${command.port}`);
      }
      case "custom":
        return wrap(0x8300, Uint8Array.from([0x01, ...asciiBytesJt(command.payload)]), `JT808 text: ${command.payload}`);
      // engineStop/Resume are vendor-specific in JT808 — no standard
      // message id; OEMs implement oil-cut via custom commands.
      default:
        return null;
    }
  }
}

function asciiBytesJt(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i) & 0xff);
  return out;
}
