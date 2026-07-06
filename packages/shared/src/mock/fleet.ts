/**
 * Deterministic mock fleet data — Zimbabwe-flavoured (Harare / Bulawayo /
 * Mutare corridors). Frontend-first development runs entirely on this data;
 * the API layer will later replace it with Supabase queries behind the same
 * shapes.
 */

import type {
  Driver,
  FleetAlert,
  FuelRecord,
  Geofence,
  DeviceHealth,
  MaintenanceItem,
  Trip,
  Vehicle,
  VehicleGroup,
} from "../types";

export const TENANT_ID = "tn-speedtrack";

/** Deterministic PRNG so mock data is stable across reloads. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260706);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const between = (min: number, max: number) => min + rand() * (max - min);
const int = (min: number, max: number) => Math.floor(between(min, max + 1));

/** Harare CBD anchor. */
export const MAP_CENTER: [number, number] = [31.0522, -17.8292];

const HARARE_SPOTS: { name: string; lng: number; lat: number }[] = [
  { name: "Samora Machel Ave, Harare CBD", lng: 31.0496, lat: -17.8277 },
  { name: "Borrowdale Rd, Borrowdale", lng: 31.0906, lat: -17.7594 },
  { name: "Seke Rd, Graniteside", lng: 31.0587, lat: -17.8564 },
  { name: "Willowvale Industrial Area", lng: 30.9877, lat: -17.8709 },
  { name: "Msasa Industrial Park", lng: 31.1191, lat: -17.8465 },
  { name: "Robert Mugabe Rd, Harare", lng: 31.0553, lat: -17.8318 },
  { name: "Chitungwiza Rd", lng: 31.0761, lat: -17.9939 },
  { name: "Avondale Shopping Centre", lng: 31.0374, lat: -17.8003 },
  { name: "Westgate, Harare", lng: 30.9852, lat: -17.7823 },
  { name: "Mabvuku Turnoff, Mutare Rd", lng: 31.1553, lat: -17.8419 },
  { name: "Harare Airport Rd (RGM Intl)", lng: 31.0928, lat: -17.9231 },
  { name: "Norton, Bulawayo Rd", lng: 30.7008, lat: -17.8833 },
  { name: "Ruwa Growth Point", lng: 31.2447, lat: -17.8897 },
  { name: "Epworth, Harare", lng: 31.1472, lat: -17.8900 },
  { name: "Mt Pleasant, Harare", lng: 31.0333, lat: -17.7667 },
];

const DEVICE_IDS = [
  "sinotrack-st901",
  "coban-tk103b",
  "sinotrack-st905",
  "jimi-gt06n",
  "coban-tk303g",
  "sinotrack-st902",
  "wanway-gs10g",
  "eelink-tk116",
  "queclink-gl300",
  "sinotrack-st906",
  "coban-tk403a",
  "seeworld-r12l",
  "topflytech-tlw212b",
  "meitrack-t366",
  "jimi-jmvl03",
  "gf07",
  "gf09",
  "seeworld-s5l",
  "wanway-ev02",
  "thinkrace-vt200",
] as const;

interface VehicleSeed {
  name: string;
  plate: string;
  kind: Vehicle["kind"];
  make: string;
  model: string;
  status: Vehicle["status"];
}

const VEHICLE_SEEDS: VehicleSeed[] = [
  { name: "Delivery Van 01", plate: "AEC 4521", kind: "car", make: "Toyota", model: "HiAce", status: "moving" },
  { name: "Delivery Van 02", plate: "AEF 7830", kind: "car", make: "Toyota", model: "HiAce", status: "moving" },
  { name: "Freight Truck 01", plate: "ADQ 9902", kind: "truck", make: "Mercedes-Benz", model: "Actros", status: "moving" },
  { name: "Freight Truck 02", plate: "AFC 1187", kind: "truck", make: "Scania", model: "R450", status: "stopped" },
  { name: "Exec SUV", plate: "AGH 2001", kind: "suv", make: "Toyota", model: "Fortuner", status: "moving" },
  { name: "Sales Pickup 01", plate: "ADR 5566", kind: "pickup", make: "Isuzu", model: "D-Max", status: "idle" },
  { name: "Sales Pickup 02", plate: "AEB 3412", kind: "pickup", make: "Ford", model: "Ranger", status: "moving" },
  { name: "Courier Bike 01", plate: "AFM 880", kind: "motorcycle", make: "Honda", model: "XR150", status: "moving" },
  { name: "Courier Bike 02", plate: "AFM 881", kind: "motorcycle", make: "Honda", model: "XR150", status: "stopped" },
  { name: "Staff Bus", plate: "AEK 6644", kind: "bus", make: "Yutong", model: "ZK6116D", status: "parked" },
  { name: "School Coach", plate: "AFP 2210", kind: "bus", make: "Scania", model: "Marcopolo", status: "moving" },
  { name: "Excavator CAT-320", plate: "PLANT 07", kind: "construction", make: "Caterpillar", model: "320D", status: "idle" },
  { name: "Site Generator", plate: "GEN 015", kind: "generator", make: "Cummins", model: "C150D5", status: "parked" },
  { name: "Container MSKU-77", plate: "MSKU 7741208", kind: "container", make: "Maersk", model: "40ft HC", status: "moving" },
  { name: "Fuel Tanker", plate: "ADT 7008", kind: "truck", make: "MAN", model: "TGS 33.440", status: "moving" },
  { name: "Cold Chain Truck", plate: "AGJ 4190", kind: "truck", make: "Isuzu", model: "FVR900", status: "moving" },
  { name: "Pool Car 01", plate: "AEA 1029", kind: "car", make: "Mazda", model: "BT-3", status: "offline" },
  { name: "Pool Car 02", plate: "AEA 1030", kind: "car", make: "Honda", model: "Fit", status: "stopped" },
  { name: "Trailer 40T", plate: "TRL 3307", kind: "trailer", make: "Henred", model: "Tri-Axle", status: "parked" },
  { name: "Rex (Boerboel)", plate: "PET-REX", kind: "pet", make: "GF-09", model: "Collar", status: "moving" },
  { name: "Parcel #88214", plate: "PCL-88214", kind: "parcel", make: "Queclink", model: "GL300", status: "moving" },
  { name: "Tino (School Run)", plate: "KID-TINO", kind: "child", make: "GF-07", model: "Bag Tag", status: "moving" },
  { name: "Herd Tracker A12", plate: "LSK-A12", kind: "livestock", make: "Topflytech", model: "Solar Tag", status: "idle" },
  { name: "Camera Kit Case", plate: "EQP-204", kind: "equipment", make: "SinoTrack", model: "ST-905", status: "stopped" },
];

const DRIVER_NAMES = [
  "Tendai Moyo",
  "Rudo Chikafu",
  "Tapiwa Ncube",
  "Kudzai Marufu",
  "Farai Dube",
  "Nyasha Gumbo",
  "Blessing Sibanda",
  "Chipo Mutasa",
  "Simba Chirwa",
  "Anesu Mahachi",
  "Tatenda Zhou",
  "Munashe Karimanzira",
];

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export const drivers: Driver[] = DRIVER_NAMES.map((name, i) => {
  const score = int(58, 97);
  return {
    id: `drv-${i + 1}`,
    tenantId: TENANT_ID,
    name,
    phone: `+263 77${int(1, 8)} ${int(100, 999)} ${int(100, 999)}`,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@speedtrack.co.zw`,
    licenseNumber: `ZW${int(100000, 999999)}DL`,
    licenseExpiry: new Date(now + int(30, 900) * DAY).toISOString(),
    status: i === 9 ? "inactive" : "active",
    assignedVehicleId: i < VEHICLE_SEEDS.length ? `veh-${i + 1}` : undefined,
    behaviorScore: score,
    riskLevel: score > 85 ? "low" : score > 70 ? "medium" : "high",
    tripsThisMonth: int(18, 96),
    distanceThisMonthKm: int(800, 6200),
    avatarSeed: name.split(" ")[0]!.toLowerCase(),
  };
});

export const vehicles: Vehicle[] = VEHICLE_SEEDS.map((seed, i) => {
  const spot = HARARE_SPOTS[i % HARARE_SPOTS.length]!;
  const moving = seed.status === "moving";
  const offline = seed.status === "offline";
  const speed = moving ? int(18, 118) : 0;
  const fuelCap = seed.kind === "truck" ? 400 : seed.kind === "bus" ? 300 : 60;
  const isAsset = ["pet", "parcel", "child", "livestock", "equipment", "container", "generator"].includes(seed.kind);
  return {
    id: `veh-${i + 1}`,
    tenantId: TENANT_ID,
    name: seed.name,
    plate: seed.plate,
    kind: seed.kind,
    make: seed.make,
    model: seed.model,
    year: int(2014, 2024),
    color: pick(["White", "Silver", "Blue", "Grey", "Red", "Black"]),
    status: seed.status,
    deviceModelId: DEVICE_IDS[i % DEVICE_IDS.length]!,
    imei: `86${int(1000000000000, 9999999999999)}`,
    simMsisdn: `+263 78${int(1, 9)} ${int(100, 999)} ${int(100, 999)}`,
    driverId: !isAsset && i < drivers.length ? `drv-${i + 1}` : undefined,
    groupId: seed.kind === "truck" || seed.kind === "trailer" ? "grp-heavy" : isAsset ? "grp-assets" : "grp-light",
    position: {
      lat: spot.lat + between(-0.01, 0.01),
      lng: spot.lng + between(-0.01, 0.01),
      speedKmh: speed,
      course: int(0, 359),
      address: spot.name,
      updatedAt: iso(offline ? 26 * HOUR : int(1, 9) * MIN),
    },
    odometerKm: int(12000, 384000),
    engineHours: int(400, 18000),
    fuelLevelPct: isAsset ? undefined : int(8, 98),
    fuelCapacityL: isAsset ? undefined : fuelCap,
    batteryVoltage: isAsset ? undefined : +between(11.6, 14.6).toFixed(1),
    externalVoltage: isAsset ? undefined : +between(12.1, 28.4).toFixed(1),
    gsmSignal: offline ? 0 : int(42, 100),
    satellites: offline ? 0 : int(6, 18),
    ignition: moving || seed.status === "idle",
    blocked: false,
    healthScore: offline ? int(20, 45) : int(62, 100),
    insuranceExpiry: new Date(now + int(-20, 340) * DAY).toISOString(),
    licenseExpiry: new Date(now + int(10, 365) * DAY).toISOString(),
    favourite: i < 4,
  };
});

export const groups: VehicleGroup[] = [
  { id: "grp-light", tenantId: TENANT_ID, name: "Light Fleet", color: "#2563eb", vehicleIds: vehicles.filter((v) => v.groupId === "grp-light").map((v) => v.id) },
  { id: "grp-heavy", tenantId: TENANT_ID, name: "Heavy Fleet", color: "#d97706", vehicleIds: vehicles.filter((v) => v.groupId === "grp-heavy").map((v) => v.id) },
  { id: "grp-assets", tenantId: TENANT_ID, name: "Assets & Personal", color: "#059669", vehicleIds: vehicles.filter((v) => v.groupId === "grp-assets").map((v) => v.id) },
];

const ALERT_SEEDS: [FleetAlert["type"], FleetAlert["title"], string, FleetAlert["severity"], FleetAlert["status"], number][] = [
  ["overspeed", "Overspeed Alert", "exceeded 120 km/h on Mutare Rd", "critical", "active", 12 * MIN],
  ["lowFuel", "Low Fuel", "fuel level below 15%", "warning", "active", 47 * MIN],
  ["geofenceExit", "Geofence Exit", "exited Willowvale Depot zone", "critical", "active", 1.4 * HOUR],
  ["maintenanceDue", "Maintenance Due", "service due in 3 days", "info", "acknowledged", 20 * HOUR],
  ["harshBraking", "Harsh Braking", "harsh braking detected near Seke Rd", "warning", "acknowledged", 22 * HOUR],
  ["batteryDisconnected", "Battery Disconnected", "device main power disconnected", "critical", "resolved", 2 * DAY],
  ["sos", "SOS Button Pressed", "SOS triggered — driver contacted, false alarm", "critical", "resolved", 3 * DAY],
  ["deviceOffline", "Device Offline", "no report for 26 hours", "warning", "active", 2 * HOUR],
  ["lowBattery", "Low Tracker Battery", "asset tracker battery at 8%", "warning", "active", 3.2 * HOUR],
  ["insuranceExpiry", "Insurance Expiring", "policy expires in 7 days", "info", "active", 5 * HOUR],
  ["idle", "Excessive Idling", "idling 34 min at Msasa", "info", "acknowledged", 26 * HOUR],
  ["fuelTheft", "Possible Fuel Theft", "sudden 38L drop while parked", "critical", "active", 6.5 * HOUR],
  ["geofenceEnter", "Geofence Entry", "entered Harare CBD zone", "info", "resolved", 30 * HOUR],
  ["harshAcceleration", "Rapid Acceleration", "rapid acceleration on Borrowdale Rd", "warning", "resolved", 2.2 * DAY],
  ["temperature", "Cold Chain Breach", "reefer temp rose to -8°C (limit -15°C)", "critical", "active", 55 * MIN],
  ["crash", "Possible Crash", "G-sensor impact detected, speed 64→0 km/h", "critical", "resolved", 4 * DAY],
];

export const alerts: FleetAlert[] = ALERT_SEEDS.map(([type, title, msg, severity, status, msAgo], i) => {
  const veh = vehicles[i % vehicles.length]!;
  return {
    id: `alr-${i + 1}`,
    tenantId: TENANT_ID,
    vehicleId: veh.id,
    type,
    title,
    message: `${veh.plate} ${msg}`,
    severity,
    status,
    createdAt: iso(msAgo),
  };
});

/** Build a plausible road-ish path between two spots with jitter. */
function makePath(a: (typeof HARARE_SPOTS)[number], b: (typeof HARARE_SPOTS)[number], n = 26): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const drift = Math.sin(t * Math.PI) * 0.006;
    pts.push([
      a.lng + (b.lng - a.lng) * t + between(-0.0016, 0.0016) + drift,
      a.lat + (b.lat - a.lat) * t + between(-0.0016, 0.0016),
    ]);
  }
  return pts;
}

export const trips: Trip[] = Array.from({ length: 30 }, (_, i) => {
  const veh = vehicles[i % 12]!;
  const a = pick(HARARE_SPOTS);
  let b = pick(HARARE_SPOTS);
  if (b === a) b = HARARE_SPOTS[(HARARE_SPOTS.indexOf(a) + 3) % HARARE_SPOTS.length]!;
  const startMsAgo = int(2, 14) * DAY + int(0, 20) * HOUR;
  const durationMin = int(14, 190);
  const distanceKm = +(durationMin * between(0.45, 0.95)).toFixed(1);
  const maxSpeed = int(60, 132);
  return {
    id: `trip-${i + 1}`,
    vehicleId: veh.id,
    driverId: veh.driverId,
    startAt: iso(startMsAgo),
    endAt: iso(startMsAgo - durationMin * MIN),
    startAddress: a.name,
    endAddress: b.name,
    distanceKm,
    durationMin,
    maxSpeedKmh: maxSpeed,
    avgSpeedKmh: Math.round((distanceKm / durationMin) * 60),
    fuelUsedL: +(distanceKm * between(0.09, 0.16)).toFixed(1),
    path: makePath(a, b),
    events:
      maxSpeed > 118
        ? [{ type: "overspeed", at: iso(startMsAgo - int(4, durationMin) * MIN), lat: a.lat, lng: a.lng }]
        : [],
  };
});

export const geofences: Geofence[] = [
  { id: "gf-1", tenantId: TENANT_ID, name: "Willowvale Depot", kind: "circle", color: "#2563eb", active: true, center: [30.9877, -17.8709], radiusM: 600, alertOnEnter: true, alertOnExit: true },
  { id: "gf-2", tenantId: TENANT_ID, name: "Harare CBD Zone", kind: "polygon", color: "#7c3aed", active: true, points: [[31.0385, -17.8207], [31.0645, -17.8198], [31.0662, -17.8369], [31.0409, -17.8382]], alertOnEnter: true, alertOnExit: false },
  { id: "gf-3", tenantId: TENANT_ID, name: "Msasa Warehouse", kind: "polygon", color: "#059669", active: true, points: [[31.1128, -17.8421], [31.1266, -17.8414], [31.1273, -17.8512], [31.1140, -17.8524]], alertOnEnter: true, alertOnExit: true, dwellMinutes: 20 },
  { id: "gf-4", tenantId: TENANT_ID, name: "Restricted Border Strip", kind: "circle", color: "#dc2626", active: false, center: [31.2447, -17.8897], radiusM: 1200, alertOnEnter: true, alertOnExit: false },
  { id: "gf-5", tenantId: TENANT_ID, name: "School Zone (40 km/h)", kind: "circle", color: "#d97706", active: true, center: [31.0374, -17.8003], radiusM: 350, alertOnEnter: false, alertOnExit: false },
  { id: "gf-6", tenantId: TENANT_ID, name: "RGM Airport Cargo", kind: "polygon", color: "#0891b2", active: true, points: [[31.0862, -17.9174], [31.1017, -17.9166], [31.1029, -17.9297], [31.0871, -17.9305]], alertOnEnter: true, alertOnExit: true },
];

export const maintenance: MaintenanceItem[] = [
  { id: "mnt-1", vehicleId: "veh-1", title: "Engine oil & filter change", type: "oil", dueDate: iso(-5 * DAY), status: "upcoming", costUsd: 120 },
  { id: "mnt-2", vehicleId: "veh-3", title: "General inspection", type: "inspection", dueDate: iso(-10 * DAY), status: "upcoming", costUsd: 80 },
  { id: "mnt-3", vehicleId: "veh-4", title: "Brake system check", type: "brakes", dueDate: iso(2 * DAY), status: "overdue", costUsd: 260 },
  { id: "mnt-4", vehicleId: "veh-6", title: "Tyre rotation", type: "tyres", dueDate: iso(-15 * DAY), status: "upcoming", costUsd: 40 },
  { id: "mnt-5", vehicleId: "veh-10", title: "Battery health check", type: "battery", dueDate: iso(-20 * DAY), status: "upcoming", costUsd: 30 },
  { id: "mnt-6", vehicleId: "veh-2", title: "40,000 km service", type: "service", dueDate: iso(24 * DAY), status: "completed", costUsd: 340, notes: "Done at AutoZone Msasa" },
  { id: "mnt-7", vehicleId: "veh-15", title: "Tanker pressure valve inspection", type: "inspection", dueDate: iso(-3 * DAY), status: "upcoming", costUsd: 150 },
  { id: "mnt-8", vehicleId: "veh-12", title: "Hydraulic hose replacement", type: "other", dueDate: iso(1 * DAY), status: "overdue", costUsd: 520 },
];

export const fuelRecords: FuelRecord[] = Array.from({ length: 40 }, (_, i) => {
  const veh = vehicles[i % 16]!;
  const kind: FuelRecord["kind"] = i % 13 === 7 ? "theftSuspected" : i % 3 === 0 ? "refill" : "consumption";
  return {
    id: `fuel-${i + 1}`,
    vehicleId: veh.id,
    at: iso(int(1, 28) * DAY),
    kind,
    liters: kind === "refill" ? int(25, 320) : kind === "theftSuspected" ? int(20, 60) : int(4, 38),
    costUsd: kind === "refill" ? int(40, 500) : undefined,
    odometerKm: veh.odometerKm - int(100, 4000),
    levelAfterPct: int(10, 100),
  };
});

export const deviceHealth: DeviceHealth[] = vehicles.map((v) => ({
  vehicleId: v.id,
  online: v.status !== "offline",
  lastSeen: v.position.updatedAt,
  batteryVoltage: v.batteryVoltage,
  backupBatteryPct: int(20, 100),
  charging: v.ignition,
  simStatus: v.status === "offline" ? "lowCredit" : "active",
  signal: v.gsmSignal,
  gpsAccuracyM: +between(2.5, 18).toFixed(1),
  satellites: v.satellites,
  firmware: `v${int(1, 4)}.${int(0, 9)}.${int(0, 20)}`,
  healthScore: v.healthScore,
}));

/* ---------- Derived dashboard stats ---------- */

export function fleetStats() {
  const total = vehicles.length;
  const byStatus = (s: Vehicle["status"]) => vehicles.filter((v) => v.status === s).length;
  const moving = byStatus("moving");
  return {
    total,
    moving,
    stopped: byStatus("stopped") + byStatus("parked"),
    idle: byStatus("idle"),
    offline: byStatus("offline"),
    onTrackPct: Math.round((moving / total) * 100),
    activeAlerts: alerts.filter((a) => a.status === "active").length,
    avgDailyDistanceKm: 245.6,
  };
}

export const weeklyDistance = [
  { day: "Mon", km: 182 },
  { day: "Tue", km: 251 },
  { day: "Wed", km: 297 },
  { day: "Thu", km: 284 },
  { day: "Fri", km: 372 },
  { day: "Sat", km: 190 },
  { day: "Sun", km: 286 },
];

export const monthlyDistance = Array.from({ length: 31 }, (_, i) => ({
  date: `May ${i + 1}`,
  km: int(320, 1050),
}));

export function vehicleById(id: string) {
  return vehicles.find((v) => v.id === id);
}
export function driverById(id?: string) {
  return id ? drivers.find((d) => d.id === id) : undefined;
}
