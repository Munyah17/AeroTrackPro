export * from "./core/types";
export * from "./core/bytes";
export * from "./devices/registry";

export { Gt06Decoder } from "./protocols/gt06/decoder";
export { H02Decoder, SINOTRACK_SMS_COMMANDS } from "./protocols/h02/decoder";
export { Gps103Decoder, COBAN_SMS_COMMANDS } from "./protocols/gps103/decoder";
export { EelinkDecoder } from "./protocols/eelink/decoder";
export { QueclinkDecoder } from "./protocols/queclink/decoder";
export { MeitrackDecoder } from "./protocols/meitrack/decoder";
export { TopflytechDecoder } from "./protocols/topflytech/decoder";
export { Vt200Decoder } from "./protocols/vt200/decoder";

import type { ProtocolDecoder } from "./core/types";
import type { ProtocolKey } from "./devices/registry";
import { Gt06Decoder } from "./protocols/gt06/decoder";
import { H02Decoder } from "./protocols/h02/decoder";
import { Gps103Decoder } from "./protocols/gps103/decoder";
import { EelinkDecoder } from "./protocols/eelink/decoder";
import { QueclinkDecoder } from "./protocols/queclink/decoder";
import { MeitrackDecoder } from "./protocols/meitrack/decoder";
import { TopflytechDecoder } from "./protocols/topflytech/decoder";
import { Vt200Decoder } from "./protocols/vt200/decoder";

/** All decoders keyed by protocol, for the ingest server's listener map. */
export function createDecoders(): Record<ProtocolKey, ProtocolDecoder> {
  return {
    gt06: new Gt06Decoder(),
    h02: new H02Decoder(),
    gps103: new Gps103Decoder(),
    eelink: new EelinkDecoder(),
    queclink: new QueclinkDecoder(),
    meitrack: new MeitrackDecoder(),
    topflytech: new TopflytechDecoder(),
    vt200: new Vt200Decoder(),
  };
}
