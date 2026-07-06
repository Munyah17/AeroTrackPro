/**
 * Device registry — every hardware model AeroTrack Pro supports, mapped to
 * its wire protocol and capability matrix. The UI uses this to drive device
 * binding, quick commands and health displays; the ingest tier uses it to
 * route TCP listeners.
 */

export type ProtocolKey =
  | "gt06"
  | "h02"
  | "gps103"
  | "eelink"
  | "queclink"
  | "meitrack"
  | "topflytech"
  | "vt200";

export type DeviceCategory = "vehicle" | "asset" | "personal" | "obd";

export interface DeviceCapabilities {
  gps: boolean;
  lbs: boolean;
  wifi?: boolean;
  engineCut?: boolean;
  sos?: boolean;
  voiceMonitor?: boolean;
  fuelSensor?: boolean;
  temperature?: boolean;
  gSensor?: boolean;
  obd?: boolean;
  rfid?: boolean;
  solar?: boolean;
  magneticMount?: boolean;
  internalBatteryDays?: number;
  network: ("2G" | "3G" | "4G")[];
  ota?: boolean;
  antiJamming?: boolean;
  drivingBehavior?: boolean;
}

export interface DeviceModel {
  id: string;
  vendor: string;
  model: string;
  protocol: ProtocolKey;
  /** Vendor dialect hint passed to the decoder session. */
  variant?: string;
  category: DeviceCategory;
  description: string;
  smsPasswordDefault?: string;
  capabilities: DeviceCapabilities;
}

export const DEVICE_MODELS: DeviceModel[] = [
  {
    id: "sinotrack-st901",
    vendor: "SinoTrack",
    model: "ST-901",
    protocol: "h02",
    category: "vehicle",
    description: "Waterproof hardwired vehicle tracker (12V/24V), relay-ready fuel cut.",
    smsPasswordDefault: "0000",
    capabilities: { gps: true, lbs: true, engineCut: true, sos: false, network: ["2G", "4G"] },
  },
  {
    id: "sinotrack-st902",
    vendor: "SinoTrack",
    model: "ST-902",
    protocol: "h02",
    category: "obd",
    description: "OBD2 plug-and-play tracker for quick diagnostic-slot installation.",
    smsPasswordDefault: "0000",
    capabilities: { gps: true, lbs: true, obd: true, network: ["2G", "4G"] },
  },
  {
    id: "sinotrack-st905",
    vendor: "SinoTrack",
    model: "ST-905",
    protocol: "h02",
    category: "asset",
    description: "Magnetic asset tracker with large battery — up to 60 days per charge.",
    smsPasswordDefault: "0000",
    capabilities: { gps: true, lbs: true, magneticMount: true, internalBatteryDays: 60, network: ["2G", "4G"] },
  },
  {
    id: "sinotrack-st906",
    vendor: "SinoTrack",
    model: "ST-906",
    protocol: "h02",
    category: "vehicle",
    description: "Advanced hardwired tracker with SOS button and audio monitoring.",
    smsPasswordDefault: "0000",
    capabilities: { gps: true, lbs: true, engineCut: true, sos: true, voiceMonitor: true, network: ["2G", "4G"] },
  },
  {
    id: "coban-tk103b",
    vendor: "Coban",
    model: "TK103B",
    protocol: "gps103",
    category: "vehicle",
    description: "Classic fleet tracker with remote control and fuel cut-off relay.",
    smsPasswordDefault: "123456",
    capabilities: { gps: true, lbs: true, engineCut: true, sos: true, voiceMonitor: true, fuelSensor: true, network: ["2G"] },
  },
  {
    id: "coban-tk303g",
    vendor: "Coban",
    model: "TK303G",
    protocol: "gps103",
    category: "vehicle",
    description: "Compact waterproof unit for motorcycles and scooters.",
    smsPasswordDefault: "123456",
    capabilities: { gps: true, lbs: true, engineCut: true, network: ["2G", "3G"] },
  },
  {
    id: "coban-tk403a",
    vendor: "Coban",
    model: "TK403A",
    protocol: "gps103",
    category: "vehicle",
    description: "Modern 4G LTE tracker with OTA firmware updates.",
    smsPasswordDefault: "123456",
    capabilities: { gps: true, lbs: true, engineCut: true, ota: true, network: ["4G"] },
  },
  {
    id: "jimi-gt06n",
    vendor: "Jimi IoT",
    model: "GT06N",
    protocol: "gt06",
    category: "vehicle",
    description: "The world's most cloned telematics architecture; relay cut, SOS, mic.",
    capabilities: { gps: true, lbs: true, engineCut: true, sos: true, voiceMonitor: true, network: ["2G"] },
  },
  {
    id: "jimi-jmvl03",
    vendor: "Jimi IoT",
    model: "JM-VL03",
    protocol: "gt06",
    variant: "jimi-vl03",
    category: "vehicle",
    description: "Discreet 4G LTE tracker with driving-behavior analytics.",
    capabilities: { gps: true, lbs: true, engineCut: true, gSensor: true, drivingBehavior: true, network: ["4G"], ota: true },
  },
  {
    id: "gf07",
    vendor: "Generic",
    model: "GF-07",
    protocol: "gt06",
    variant: "gf07",
    category: "personal",
    description: "Ultra-cheap micro LBS/GPS locator for keys, bags and valuables.",
    smsPasswordDefault: "123456",
    capabilities: { gps: false, lbs: true, sos: true, voiceMonitor: true, magneticMount: true, network: ["2G"] },
  },
  {
    id: "gf09",
    vendor: "Generic",
    model: "GF-09",
    protocol: "gt06",
    variant: "gf09",
    category: "personal",
    description: "Voice-activated recording tracker using Wi-Fi + LBS alongside GPS.",
    smsPasswordDefault: "123456",
    capabilities: { gps: true, lbs: true, wifi: true, sos: true, voiceMonitor: true, network: ["2G"] },
  },
  {
    id: "wanway-gs10g",
    vendor: "WanWay Tech",
    model: "GS10G",
    protocol: "gt06",
    variant: "wanway",
    category: "vehicle",
    description: "Wide-voltage 4G LTE tracker optimized for large fleets.",
    capabilities: { gps: true, lbs: true, engineCut: true, network: ["4G"], ota: true },
  },
  {
    id: "wanway-ev02",
    vendor: "WanWay Tech",
    model: "EV02",
    protocol: "gt06",
    variant: "wanway",
    category: "vehicle",
    description: "Entry-level tracker for electric bikes and scooters.",
    capabilities: { gps: true, lbs: true, network: ["2G", "4G"] },
  },
  {
    id: "eelink-tk116",
    vendor: "Eelink",
    model: "TK116",
    protocol: "eelink",
    category: "vehicle",
    description: "High-accuracy tracker with internal G-sensor crash detection.",
    capabilities: { gps: true, lbs: true, gSensor: true, sos: true, network: ["2G", "4G"] },
  },
  {
    id: "queclink-gl300",
    vendor: "Queclink",
    model: "GL300",
    protocol: "queclink",
    category: "asset",
    description: "Premium portable asset tracker trusted by international logistics.",
    capabilities: { gps: true, lbs: true, sos: true, gSensor: true, internalBatteryDays: 14, network: ["2G", "3G"] },
  },
  {
    id: "seeworld-r12l",
    vendor: "Seeworld",
    model: "R12L",
    protocol: "gt06",
    variant: "seeworld",
    category: "vehicle",
    description: "High-efficiency 4G fleet terminal with anti-jamming safeguards.",
    capabilities: { gps: true, lbs: true, engineCut: true, antiJamming: true, network: ["4G"] },
  },
  {
    id: "seeworld-s5l",
    vendor: "Seeworld",
    model: "S5L",
    protocol: "gt06",
    variant: "seeworld",
    category: "vehicle",
    description: "Fleet tracker with dedicated external fuel-sensor interfaces.",
    capabilities: { gps: true, lbs: true, engineCut: true, fuelSensor: true, temperature: true, network: ["4G"] },
  },
  {
    id: "topflytech-tlw212b",
    vendor: "Topflytech",
    model: "TLW2-12B",
    protocol: "topflytech",
    category: "asset",
    description: "Solar-powered asset tracker for shipping containers and trailers.",
    capabilities: { gps: true, lbs: true, solar: true, internalBatteryDays: 90, temperature: true, network: ["4G"] },
  },
  {
    id: "meitrack-t366",
    vendor: "Meitrack",
    model: "T366",
    protocol: "meitrack",
    category: "vehicle",
    description: "Rugged IP67 tracker for marine craft and heavy construction equipment.",
    capabilities: { gps: true, lbs: true, engineCut: true, fuelSensor: true, temperature: true, rfid: true, network: ["2G", "4G"] },
  },
  {
    id: "thinkrace-vt200",
    vendor: "ThinkRace",
    model: "VT200",
    protocol: "vt200",
    category: "obd",
    description: "Advanced OBDII tracker with driving diagnostics and WiFi hotspot.",
    capabilities: { gps: true, lbs: true, obd: true, wifi: true, drivingBehavior: true, network: ["3G", "4G"] },
  },
];

export function getDeviceModel(id: string): DeviceModel | undefined {
  return DEVICE_MODELS.find((m) => m.id === id);
}

export function modelsByProtocol(protocol: ProtocolKey): DeviceModel[] {
  return DEVICE_MODELS.filter((m) => m.protocol === protocol);
}
