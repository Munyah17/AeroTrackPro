/** Shared domain models for AeroTrack Pro (frontend + backend + mobile). */

export type VehicleStatus = "moving" | "stopped" | "idle" | "offline" | "parked";

export type AssetKind =
  | "car"
  | "suv"
  | "pickup"
  | "motorcycle"
  | "truck"
  | "trailer"
  | "bus"
  | "construction"
  | "generator"
  | "container"
  | "parcel"
  | "pet"
  | "child"
  | "senior"
  | "livestock"
  | "bag"
  | "equipment";

export interface Vehicle {
  id: string;
  tenantId: string;
  name: string;
  plate: string;
  kind: AssetKind;
  make: string;
  model: string;
  year: number;
  color: string;
  status: VehicleStatus;
  deviceModelId: string; // links to protocols DeviceModel
  imei: string;
  simMsisdn: string;
  driverId?: string;
  groupId?: string;
  position: LivePosition;
  odometerKm: number;
  engineHours: number;
  fuelLevelPct?: number;
  fuelCapacityL?: number;
  batteryVoltage?: number;
  externalVoltage?: number;
  gsmSignal: number; // 0-100
  satellites: number;
  ignition: boolean;
  blocked: boolean; // immobilizer engaged
  healthScore: number; // 0-100
  insuranceExpiry?: string; // ISO date
  licenseExpiry?: string;
  favourite?: boolean;
}

export interface LivePosition {
  lat: number;
  lng: number;
  speedKmh: number;
  course: number;
  address: string;
  updatedAt: string; // ISO
}

export interface VehicleGroup {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  vehicleIds: string[];
}

export interface Driver {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: "active" | "inactive" | "suspended";
  assignedVehicleId?: string;
  behaviorScore: number; // 0-100
  riskLevel: "low" | "medium" | "high";
  tripsThisMonth: number;
  distanceThisMonthKm: number;
  avatarSeed: string;
}

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface FleetAlert {
  id: string;
  tenantId: string;
  vehicleId: string;
  type:
    | "overspeed"
    | "lowFuel"
    | "geofenceEnter"
    | "geofenceExit"
    | "maintenanceDue"
    | "harshBraking"
    | "harshAcceleration"
    | "batteryDisconnected"
    | "lowBattery"
    | "sos"
    | "powerCut"
    | "deviceOffline"
    | "insuranceExpiry"
    | "crash"
    | "idle"
    | "temperature"
    | "fuelTheft";
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
}

export interface Trip {
  id: string;
  vehicleId: string;
  driverId?: string;
  startAt: string;
  endAt: string;
  startAddress: string;
  endAddress: string;
  distanceKm: number;
  durationMin: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  fuelUsedL?: number;
  path: [number, number][]; // [lng, lat]
  events: { type: string; at: string; lat: number; lng: number }[];
}

export interface Geofence {
  id: string;
  tenantId: string;
  name: string;
  kind: "circle" | "polygon" | "route";
  color: string;
  active: boolean;
  center?: [number, number];
  radiusM?: number;
  points?: [number, number][];
  alertOnEnter: boolean;
  alertOnExit: boolean;
  dwellMinutes?: number;
}

export interface MaintenanceItem {
  id: string;
  vehicleId: string;
  title: string;
  type: "service" | "inspection" | "tyres" | "battery" | "brakes" | "oil" | "other";
  dueDate: string;
  dueOdometerKm?: number;
  status: "upcoming" | "overdue" | "completed";
  costUsd?: number;
  notes?: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  at: string;
  kind: "refill" | "consumption" | "theftSuspected";
  liters: number;
  costUsd?: number;
  odometerKm: number;
  levelAfterPct: number;
}

export interface DeviceHealth {
  vehicleId: string;
  online: boolean;
  lastSeen: string;
  batteryVoltage?: number;
  backupBatteryPct?: number;
  charging: boolean;
  simStatus: "active" | "expired" | "lowCredit" | "unknown";
  signal: number;
  gpsAccuracyM: number;
  satellites: number;
  firmware: string;
  healthScore: number;
}

/* ---------- White label / multi-tenant ---------- */

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  plan: "basic" | "standard" | "pro" | "enterprise";
  status: "active" | "suspended" | "trial";
  primaryColor: string;
  logoUrl?: string;
  customDomain?: string;
  domainStatus?: "pending" | "active" | "failed";
  userCount: number;
  vehicleCount: number;
  createdAt: string;
  mrrUsd: number;
}

export interface PlatformUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: "superAdmin" | "admin" | "manager" | "dispatcher" | "driver" | "viewer";
  status: "active" | "inactive" | "invited";
  lastActive: string;
  avatarSeed: string;
}

export interface Plan {
  id: string;
  name: string;
  priceMonthlyUsd: number;
  maxVehicles: number | null;
  features: string[];
  active: boolean;
}

export interface Invoice {
  id: string;
  tenantId: string;
  number: string;
  amountUsd: number;
  status: "paid" | "pending" | "overdue" | "failed";
  issuedAt: string;
  paidAt?: string;
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  subject: string;
  status: "open" | "inProgress" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
  lastReplyAt: string;
}

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  status: "active" | "revoked";
}

export interface ActivityLog {
  id: string;
  tenantId: string;
  userName: string;
  action: string;
  module: string;
  at: string;
  ip: string;
}

export interface Announcement {
  id: string;
  title: string;
  audience: "allTenants" | "specific";
  status: "published" | "draft";
  publishedAt?: string;
}
