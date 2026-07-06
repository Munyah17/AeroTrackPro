/**
 * Core types shared by every protocol module.
 *
 * A protocol module converts raw device frames (TCP/UDP payloads or SMS text)
 * into normalized {@link DecodedMessage}s, and encodes platform commands back
 * into device-specific wire format.
 */

export type TransportKind = "tcp" | "udp" | "sms";

/** Normalized GPS fix produced by any protocol decoder. */
export interface Position {
  /** Device identifier as reported on the wire (IMEI or vendor ID). */
  deviceId: string;
  /** Fix timestamp in UTC. */
  timestamp: Date;
  latitude: number;
  longitude: number;
  /** Whether the GPS fix is valid (A) or dead-reckoned/last-known (V). */
  valid: boolean;
  /** Speed in km/h. */
  speedKmh: number;
  /** Course over ground in degrees (0-360). */
  course: number;
  altitudeM?: number;
  satellites?: number;
  hdop?: number;
  /** Raw odometer reading in meters, if the device reports one. */
  odometerM?: number;
  attributes: PositionAttributes;
}

/** Optional telemetry attached to a position report. */
export interface PositionAttributes {
  ignition?: boolean;
  motion?: boolean;
  batteryLevel?: number; // percent 0-100
  batteryVoltage?: number; // volts
  externalVoltage?: number; // volts (vehicle battery)
  charging?: boolean;
  gsmSignal?: number; // 0-100 normalized
  rssi?: number; // raw RSSI/CSQ
  fuelLevel?: number; // percent or liters depending on sensor config
  temperatureC?: number;
  humidity?: number;
  door?: boolean;
  armed?: boolean;
  blocked?: boolean; // engine cut / immobilizer active
  alarm?: AlarmType;
  event?: string; // vendor-specific event code
  driverUniqueId?: string; // RFID / iButton / fingerprint driver id
  gSensor?: { x: number; y: number; z: number };
  lbs?: LbsInfo;
  raw?: string; // hex or text of the original frame, for auditing
  [key: string]: unknown;
}

/** Cell-tower info for LBS-only fixes (GF-07/GF-09 and indoor fallback). */
export interface LbsInfo {
  mcc: number;
  mnc: number;
  lac: number;
  cellId: number;
}

export type AlarmType =
  | "sos"
  | "overspeed"
  | "powerCut"
  | "lowBattery"
  | "vibration"
  | "movement"
  | "geofenceEnter"
  | "geofenceExit"
  | "hardAcceleration"
  | "hardBraking"
  | "hardCornering"
  | "crash"
  | "tow"
  | "tamper"
  | "door"
  | "jamming"
  | "fatigueDriving"
  | "idle"
  | "temperature"
  | "fuelTheft"
  | "accOn"
  | "accOff"
  | "offline"
  | "unknown";

/** Everything a decoder can yield from one inbound frame. */
export type DecodedMessage =
  | { kind: "position"; position: Position }
  | { kind: "positions"; positions: Position[] }
  | { kind: "login"; deviceId: string; response?: Uint8Array | string }
  | { kind: "heartbeat"; deviceId?: string; response?: Uint8Array | string }
  | { kind: "commandResult"; deviceId?: string; command: string; result: string }
  | { kind: "ack"; response: Uint8Array | string }
  | { kind: "ignored"; reason: string };

/** Commands the platform can send to devices, normalized across vendors. */
export type DeviceCommand =
  | { type: "engineStop" } // immobilize / fuel cut
  | { type: "engineResume" }
  | { type: "locate" } // request single position
  | { type: "setInterval"; seconds: number } // upload interval
  | { type: "setOverspeed"; kmh: number }
  | { type: "setTimezone"; utcOffsetMinutes: number }
  | { type: "setApn"; apn: string; user?: string; password?: string }
  | { type: "setServer"; host: string; port: number }
  | { type: "reboot" }
  | { type: "factoryReset" }
  | { type: "arm" }
  | { type: "disarm" }
  | { type: "sosNumber"; slot: 1 | 2 | 3; phone: string }
  | { type: "listen"; callbackPhone: string } // voice monitor (ST-906, GF-07/09)
  | { type: "custom"; payload: string };

export interface EncodedCommand {
  transport: TransportKind;
  /** Bytes for TCP/UDP, text for SMS. */
  payload: Uint8Array | string;
  /** Human-readable form for audit logs. */
  description: string;
}

/**
 * A protocol module. Implementations are pure and stateless where possible;
 * per-connection state (e.g. IMEI learned at login) lives in `Session`.
 */
export interface ProtocolDecoder {
  /** Stable protocol key, e.g. "gt06", "h02". */
  readonly protocol: string;
  /** Default TCP listener port, following Traccar port conventions. */
  readonly defaultPort: number;
  /**
   * Extract complete frames from a rolling buffer. Returns consumed byte
   * count and the frames found, so the pipeline can handle TCP fragmentation.
   */
  splitFrames(buffer: Uint8Array): { consumed: number; frames: Uint8Array[] };
  /** Decode one complete frame within a connection session. */
  decode(frame: Uint8Array, session: Session): DecodedMessage;
  /** Encode a platform command for this protocol, if supported. */
  encodeCommand(command: DeviceCommand, session: Session): EncodedCommand | null;
}

/** Per-connection state shared across frames. */
export interface Session {
  /** IMEI/device id learned from login frame; undefined until identified. */
  deviceId?: string;
  /** Vendor variant hint from the device registry (e.g. "seeworld"). */
  variant?: string;
  /** Server serial counter for protocols that need it (GT06 responses). */
  serverSerial: number;
}

export function createSession(variant?: string): Session {
  return { variant, serverSerial: 1 };
}
