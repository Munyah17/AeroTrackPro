/**
 * Demo-mode adapters: reshape the mock fleet into the public API's DB-row
 * contract so integrations can be developed before a database is provisioned.
 */

import { alerts, geofences, trips, vehicles, TENANT_ID } from "@aerotrack/shared";

const now = () => new Date().toISOString();

export function demoVehicles() {
  return vehicles.map((v) => ({
    id: v.id,
    tenant_id: TENANT_ID,
    device_id: `dev-${v.id}`,
    plate: v.plate,
    name: v.name,
    make: v.make,
    model: v.model,
    year: v.year,
    vin: null,
    status: "active" as const,
    color: v.color,
    group_name: v.groupId ?? null,
    fuel_type: null,
    fuel_capacity_liters: v.fuelCapacityL ?? null,
    odometer_km: v.odometerKm,
    speed_limit_kmh: 120,
    notes: null,
    created_at: now(),
    updated_at: now(),
    last_position: demoPositionFor(v.id),
  }));
}

function demoPositionFor(vehicleId: string) {
  const v = vehicles.find((x) => x.id === vehicleId);
  if (!v) return null;
  return {
    id: `pos-${v.id}`,
    tenant_id: TENANT_ID,
    device_id: `dev-${v.id}`,
    vehicle_id: v.id,
    lng: v.position.lng,
    lat: v.position.lat,
    speed_kmh: v.position.speedKmh,
    course: v.position.course,
    altitude: null,
    accuracy: null,
    event_type: "position",
    raw_data: null,
    recorded_at: v.position.updatedAt,
    created_at: v.position.updatedAt,
  };
}

export function demoLatestPositions() {
  return vehicles.map((v) => demoPositionFor(v.id)!);
}

export function demoPositionHistory(vehicleId: string, limit: number) {
  const trip = trips.find((t) => t.vehicleId === vehicleId) ?? trips[0];
  if (!trip) return [];
  const start = new Date(trip.startAt).getTime();
  const end = new Date(trip.endAt).getTime();
  return trip.path.slice(0, limit).map(([lng, lat], i) => ({
    id: `pos-${vehicleId}-${i}`,
    tenant_id: TENANT_ID,
    device_id: `dev-${vehicleId}`,
    vehicle_id: vehicleId,
    lng,
    lat,
    speed_kmh: trip.avgSpeedKmh,
    course: 0,
    altitude: null,
    accuracy: null,
    event_type: "position",
    raw_data: null,
    recorded_at: new Date(start + ((end - start) * i) / Math.max(trip.path.length - 1, 1)).toISOString(),
    created_at: now(),
  }));
}

export function demoTrips() {
  return trips.map((t) => ({
    id: t.id,
    tenant_id: TENANT_ID,
    vehicle_id: t.vehicleId,
    device_id: `dev-${t.vehicleId}`,
    start_at: t.startAt,
    end_at: t.endAt,
    start_address: t.startAddress,
    end_address: t.endAddress,
    distance_km: t.distanceKm,
    duration_min: t.durationMin,
    max_speed_kmh: t.maxSpeedKmh,
    avg_speed_kmh: t.avgSpeedKmh,
    idle_time_min: null,
    path: t.path,
    completed: true,
    created_at: t.endAt,
  }));
}

export function demoGeofences() {
  return geofences.map((g) => ({
    id: g.id,
    tenant_id: TENANT_ID,
    name: g.name,
    kind: g.kind === "route" ? "polygon" : g.kind,
    center: g.center ?? null,
    radius_m: g.radiusM ?? null,
    points: g.points ?? null,
    color: g.color,
    active: g.active,
    alert_on_enter: g.alertOnEnter,
    alert_on_exit: g.alertOnExit,
    alert_users: [] as string[],
    created_at: now(),
    updated_at: now(),
  }));
}

export function demoAlerts() {
  return alerts.map((a) => ({
    id: a.id,
    tenant_id: TENANT_ID,
    device_id: `dev-${a.vehicleId}`,
    vehicle_id: a.vehicleId,
    alert_type: a.type,
    severity: a.severity,
    title: a.title,
    message: a.message,
    status: a.status,
    position: null,
    acknowledged_by: null,
    acknowledged_at: a.status === "acknowledged" ? now() : null,
    resolved_at: a.status === "resolved" ? now() : null,
    created_at: a.createdAt,
    updated_at: a.createdAt,
  }));
}

export function demoDevices() {
  return vehicles.map((v) => ({
    id: `dev-${v.id}`,
    tenant_id: TENANT_ID,
    imei: v.imei,
    protocol: "gt06",
    device_model: v.deviceModelId,
    name: `${v.plate} tracker`,
    status: "active" as const,
    serial_number: null,
    phone_number: v.simMsisdn,
    sim_number: v.simMsisdn,
    battery_level: Math.round(60 + (v.gsmSignal % 40)),
    signal_strength: v.gsmSignal,
    server_ip: null,
    server_port: null,
    last_position_at: v.position.updatedAt,
    last_seen_at: v.position.updatedAt,
    firmware_version: null,
    notes: null,
    created_at: now(),
    updated_at: now(),
  }));
}
