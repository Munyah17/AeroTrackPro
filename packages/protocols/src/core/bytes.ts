/** Byte/BCD/checksum helpers used by the binary protocol decoders. */

export function toHex(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function ascii(data: Uint8Array): string {
  let s = "";
  for (const b of data) s += String.fromCharCode(b);
  return s;
}

export function asciiBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

export function u16(data: Uint8Array, offset: number): number {
  return ((data[offset]! << 8) | data[offset + 1]!) >>> 0;
}

export function u32(data: Uint8Array, offset: number): number {
  return (
    ((data[offset]! << 24) |
      (data[offset + 1]! << 16) |
      (data[offset + 2]! << 8) |
      data[offset + 3]!) >>>
    0
  );
}

/** Read BCD-coded digits, e.g. IMEI in GT06 login packets. */
export function bcd(data: Uint8Array, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    const b = data[offset + i]!;
    s += ((b >> 4) & 0x0f).toString(10) + (b & 0x0f).toString(10);
  }
  return s;
}

/** CRC-ITU (X.25 / CRC-16-CCITT reversed) used by GT06 family. */
export function crcItu(data: Uint8Array, from: number, to: number): number {
  let crc = 0xffff;
  for (let i = from; i < to; i++) {
    crc ^= data[i]!;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >> 1) ^ 0x8408 : crc >> 1;
    }
  }
  return ~crc & 0xffff;
}

/** XOR checksum used by Meitrack ($$...*hh) style ASCII protocols. */
export function xorChecksum(text: string): number {
  let sum = 0;
  for (let i = 0; i < text.length; i++) sum ^= text.charCodeAt(i);
  return sum;
}

/** Additive checksum (sum of bytes, low byte) used by Meitrack. */
export function sumChecksum(text: string): number {
  let sum = 0;
  for (let i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return sum & 0xff;
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Coordinate helper: ddmm.mmmm (NMEA style) to decimal degrees. */
export function nmeaToDecimal(value: number, hemisphere: string): number {
  const degrees = Math.floor(value / 100);
  const minutes = value - degrees * 100;
  const decimal = degrees + minutes / 60;
  return hemisphere === "S" || hemisphere === "W" ? -decimal : decimal;
}

/** Parse ddmmyy + hhmmss (UTC) into a Date. */
export function parseDdmmyyHhmmss(date: string, time: string): Date {
  const dd = +date.slice(0, 2);
  const mm = +date.slice(2, 4);
  const yy = 2000 + +date.slice(4, 6);
  const h = +time.slice(0, 2);
  const m = +time.slice(2, 4);
  const s = +time.slice(4, 6);
  return new Date(Date.UTC(yy, mm - 1, dd, h, m, s));
}

/** Parse yymmdd + hhmmss (UTC) into a Date (GT06 style, from bytes). */
export function dateFromBytes(d: Uint8Array, offset: number): Date {
  return new Date(
    Date.UTC(
      2000 + d[offset]!,
      d[offset + 1]! - 1,
      d[offset + 2]!,
      d[offset + 3]!,
      d[offset + 4]!,
      d[offset + 5]!,
    ),
  );
}
