import type {
  DeviceHealth,
  Driver,
  FleetAlert,
  FuelRecord,
  Geofence,
  MaintenanceItem,
  Trip,
} from "@aerotrack/shared";
import type { DriverEvent, IgnitionEvent } from "@/hooks/use-live-data";

/**
 * Report catalog — each definition turns live/mock datasets into a flat
 * column/row table ready for preview and export. Modeled on the classic
 * fleet-suite "Available reports" grouping.
 */

export interface VehicleRef {
  id: string;
  name: string;
  plate: string;
  driverId?: string | null;
  groupId?: string | null;
  groupName?: string | null;
}

export interface InsurancePolicyRef {
  id: string;
  vehicleId: string;
  policyNumber: string;
  provider: string;
  coverage?: string;
  premiumUsd?: number;
  startDate?: string;
  expiryDate: string;
  status: string;
}

export interface EngineRef {
  vehicleId: string;
  deviceId: string;
  /** Cumulative ACC-on minutes persisted on the device row. */
  engineHoursMin: number;
  engineCut: boolean;
  ignition: boolean | null;
}

export interface ReportInput {
  from: Date;
  to: Date;
  vehicleIds?: Set<string>;
  driverIds?: Set<string>;
  vehicles: VehicleRef[];
  drivers: Driver[];
  trips: Trip[];
  driverEvents: DriverEvent[];
  ignitionEvents: IgnitionEvent[];
  engines: EngineRef[];
  fuelRecords: FuelRecord[];
  geofences: Geofence[];
  alerts: FleetAlert[];
  maintenance: MaintenanceItem[];
  policies: InsurancePolicyRef[];
  deviceHealth: DeviceHealth[];
}

export interface ReportResult {
  columns: string[];
  rows: (string | number | null)[][];
}

export interface ReportDef {
  id: string;
  name: string;
  description: string;
  /** Which scope pickers make sense for this report. */
  scopes: ("vehicles" | "drivers")[];
  run: (input: ReportInput) => ReportResult;
}

export interface ReportCategory {
  id: string;
  label: string;
  reports: ReportDef[];
}

const inRange = (iso: string | undefined, from: Date, to: Date) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
};

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "");
const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const n1 = (v?: number) => (v == null ? "" : Math.round(v * 10) / 10);

function vehicleName(input: ReportInput, id?: string | null) {
  const v = input.vehicles.find((x) => x.id === id);
  return v ? `${v.name} (${v.plate})` : "—";
}
function driverName(input: ReportInput, id?: string | null) {
  return input.drivers.find((x) => x.id === id)?.name ?? "—";
}
function inVehicleScope(input: ReportInput, vehicleId?: string | null) {
  return !input.vehicleIds || !vehicleId || input.vehicleIds.has(vehicleId);
}
function inDriverScope(input: ReportInput, driverId?: string | null) {
  return !input.driverIds || !driverId || input.driverIds.has(driverId);
}

/* driver_events CHECK allows harsh_braking/harsh_acceleration/harsh_cornering;
   keep the legacy/Traccar-style spellings too so imported data still matches. */
const HARSH_TYPES = new Set([
  "harsh_braking", "harsh_acceleration", "harsh_cornering",
  "harsh_brake", "harsh_accel", "harsh_corner",
  "harshBraking", "harshAcceleration",
]);
const SECURITY_TYPES = new Set(["sos", "powerCut", "batteryDisconnected", "crash", "fuelTheft", "deviceOffline"]);

/* ------------------------- derived stop periods ------------------------- */

export interface StopPeriod {
  vehicleId: string;
  from: string;
  to?: string;
  ongoing: boolean;
  minutes: number;
  location: string;
}

/** Parking periods = gaps between consecutive trips, plus the edges of the
 *  report range (parked before the first trip / still parked after the last). */
export function deriveStops(i: ReportInput): StopPeriod[] {
  const stops: StopPeriod[] = [];
  const byVehicle = new Map<string, Trip[]>();
  for (const t of i.trips.filter((x) => inVehicleScope(i, x.vehicleId))) {
    const list = byVehicle.get(t.vehicleId) ?? [];
    list.push(t);
    byVehicle.set(t.vehicleId, list);
  }
  const fromMs = i.from.getTime();
  const toMs = i.to.getTime();
  for (const [vid, list] of byVehicle) {
    list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    /* Leading stop: range start → first trip start (only when the first
       trip is fully inside the range, i.e. the vehicle was parked first). */
    const first = list[0];
    if (first && new Date(first.startAt).getTime() > fromMs && new Date(first.startAt).getTime() <= toMs) {
      const minutes = (new Date(first.startAt).getTime() - fromMs) / 60000;
      if (minutes >= 5) {
        stops.push({ vehicleId: vid, from: i.from.toISOString(), to: first.startAt, ongoing: false, minutes, location: first.startAddress });
      }
    }
    for (let k = 0; k < list.length - 1; k++) {
      const end = new Date(list[k].endAt).getTime();
      const start = new Date(list[k + 1].startAt).getTime();
      if (start > end && start >= fromMs && end <= toMs) {
        stops.push({ vehicleId: vid, from: list[k].endAt, to: list[k + 1].startAt, ongoing: false, minutes: (start - end) / 60000, location: list[k].endAddress });
      }
    }
    /* Trailing stop: last trip end → range end — still parked (or parked
       until the period closed). */
    const lastTrip = list[list.length - 1];
    if (lastTrip) {
      const end = new Date(lastTrip.endAt).getTime();
      if (end < toMs && end >= fromMs) {
        const minutes = (toMs - end) / 60000;
        if (minutes >= 5) {
          stops.push({ vehicleId: vid, from: lastTrip.endAt, ongoing: true, minutes, location: lastTrip.endAddress });
        }
      }
    }
  }
  stops.sort((a, b) => a.from.localeCompare(b.from));
  return stops;
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "activity",
    label: "Activity",
    reports: [
      {
        id: "trips",
        name: "Trips",
        description: "Detailed trip history",
        scopes: ["vehicles", "drivers"],
        run: (i) => ({
          columns: ["Start", "End", "Vehicle", "Driver", "From", "To", "Distance (km)", "Duration (min)", "Max speed", "Avg speed", "Fuel used (L)"],
          rows: i.trips
            .filter((t) => inRange(t.startAt, i.from, i.to) && inVehicleScope(i, t.vehicleId) && inDriverScope(i, t.driverId))
            .map((t) => [fmt(t.startAt), fmt(t.endAt), vehicleName(i, t.vehicleId), driverName(i, t.driverId), t.startAddress, t.endAddress, n1(t.distanceKm), Math.round(t.durationMin), Math.round(t.maxSpeedKmh), n1(t.avgSpeedKmh), n1(t.fuelUsedL)]),
        }),
      },
      {
        id: "stops",
        name: "Stops",
        description: "Idle/stop periods between trips",
        scopes: ["vehicles"],
        run: (i) => {
          const rows: ReportResult["rows"] = [];
          for (const stop of deriveStops(i)) {
            rows.push([fmt(stop.from), stop.ongoing ? "ongoing" : fmt(stop.to), Math.round(stop.minutes), vehicleName(i, stop.vehicleId), stop.location]);
          }
          return { columns: ["Stop start", "Stop end", "Duration (min)", "Vehicle", "Location"], rows };
        },
      },
      {
        id: "parking",
        name: "Parking locations",
        description: "Where vehicles park — stops clustered by place",
        scopes: ["vehicles"],
        run: (i) => {
          /* Cluster stops by location key: the endAddress string ("lat, lng")
             rounded to ~110 m so repeat park spots aggregate. */
          const key = (loc: string) => {
            const [lat, lng] = loc.split(",").map((p) => parseFloat(p.trim()));
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return loc || "—";
            return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
          };
          const agg = new Map<string, { vehicleId: string; stops: number; totalMin: number; longestMin: number; last?: string }>();
          for (const s of deriveStops(i)) {
            const k = `${s.vehicleId}|${key(s.location)}`;
            const a = agg.get(k) ?? { vehicleId: s.vehicleId, stops: 0, totalMin: 0, longestMin: 0 };
            a.stops += 1;
            a.totalMin += s.minutes;
            a.longestMin = Math.max(a.longestMin, s.minutes);
            if (!a.last || s.from > a.last) a.last = s.from;
            agg.set(k, a);
          }
          const rows = [...agg.entries()]
            .sort(([, a], [, b]) => b.totalMin - a.totalMin)
            .map(([k, a]) => [vehicleName(i, a.vehicleId), k.split("|")[1], a.stops, n1(a.totalMin / 60), Math.round(a.longestMin), fmt(a.last)]);
          return { columns: ["Vehicle", "Location", "Stops", "Total parked (h)", "Longest (min)", "Last parked"], rows };
        },
      },
      {
        id: "ignition-events",
        name: "Ignition events",
        description: "ACC on/off transitions log",
        scopes: ["vehicles", "drivers"],
        run: (i) => ({
          columns: ["Time", "Vehicle", "Driver", "Event", "Location"],
          rows: i.ignitionEvents
            .filter((e) => inRange(e.recordedAt, i.from, i.to) && inVehicleScope(i, e.vehicleId) && inDriverScope(i, e.driverId))
            .map((e) => [
              fmt(e.recordedAt),
              vehicleName(i, e.vehicleId),
              driverName(i, e.driverId),
              e.kind === "ignition_on" ? "Ignition ON" : "Ignition OFF",
              e.position ? `${e.position.lat.toFixed(5)}, ${e.position.lng.toFixed(5)}` : "",
            ]),
        }),
      },
      {
        id: "engine-hours",
        name: "Engine hours",
        description: "ACC-on time per vehicle — derived from ignition events + cumulative counter",
        scopes: ["vehicles"],
        run: (i) => {
          /* Pair ignition_on→ignition_off inside the range to get period
             ACC-on time; a leading 'on' counts from range start and a
             trailing 'on' counts to range end (or now). */
          const rows: ReportResult["rows"] = [];
          const byVehicle = new Map<string, IgnitionEvent[]>();
          for (const e of i.ignitionEvents.filter((x) => inVehicleScope(i, x.vehicleId))) {
            const list = byVehicle.get(e.vehicleId!) ?? [];
            list.push(e);
            byVehicle.set(e.vehicleId!, list);
          }
          const end = Math.min(i.to.getTime(), Date.now());
          for (const [vid, list] of byVehicle) {
            list.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
            let onMin = 0;
            let onAt = list[0]?.kind === "ignition_off" ? i.from.getTime() : 0;
            for (const e of list) {
              const t = new Date(e.recordedAt).getTime();
              if (e.kind === "ignition_on" && t >= i.from.getTime()) onAt = onAt || t;
              else if (e.kind === "ignition_on") onAt = i.from.getTime();
              if (e.kind === "ignition_off" && onAt) {
                onMin += (Math.min(t, end) - onAt) / 60000;
                onAt = 0;
              }
            }
            if (onAt) onMin += (end - onAt) / 60000;
            const engine = i.engines.find((x) => x.vehicleId === vid);
            rows.push([
              vehicleName(i, vid),
              n1(onMin / 60),
              engine ? n1(engine.engineHoursMin / 60) : "",
              engine?.ignition == null ? "—" : engine.ignition ? "on" : "off",
              engine?.engineCut ? "yes" : "no",
            ]);
          }
          return { columns: ["Vehicle", "ACC-on this period (h)", "Total engine hours", "Ignition now", "Immobilized"], rows };
        },
      },
      {
        id: "mileage",
        name: "Mileage summary",
        description: "Distance and drive time per vehicle per day",
        scopes: ["vehicles"],
        run: (i) => {
          const agg = new Map<string, { trips: number; km: number; min: number; idleMin: number }>();
          for (const t of i.trips.filter((x) => inRange(x.startAt, i.from, i.to) && inVehicleScope(i, x.vehicleId))) {
            const key = `${day(t.startAt)}|${t.vehicleId}`;
            const a = agg.get(key) ?? { trips: 0, km: 0, min: 0, idleMin: 0 };
            a.trips += 1; a.km += t.distanceKm; a.min += t.durationMin; a.idleMin += t.idleTimeMin ?? 0;
            agg.set(key, a);
          }
          const rows = [...agg.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, a]) => {
              const [d, vid] = key.split("|");
              return [d, vehicleName(i, vid), a.trips, n1(a.km), Math.round(a.min), Math.round(a.idleMin)];
            });
          return { columns: ["Date", "Vehicle", "Trips", "Distance (km)", "Drive time (min)", "Idle (min)"], rows };
        },
      },
      {
        id: "driver-log",
        name: "Driver work log",
        description: "Trips and distance aggregated per driver",
        scopes: ["drivers"],
        run: (i) => {
          const agg = new Map<string, { trips: number; km: number; min: number; last?: string }>();
          for (const t of i.trips.filter((x) => inRange(x.startAt, i.from, i.to) && inDriverScope(i, x.driverId))) {
            const id = t.driverId ?? "unassigned";
            const a = agg.get(id) ?? { trips: 0, km: 0, min: 0 };
            a.trips += 1; a.km += t.distanceKm; a.min += t.durationMin;
            a.last = t.endAt > (a.last ?? "") ? t.endAt : a.last;
            agg.set(id, a);
          }
          const rows = [...agg.entries()].map(([id, a]) => [
            id === "unassigned" ? "Unassigned" : driverName(i, id),
            a.trips, n1(a.km), Math.round(a.min), fmt(a.last),
          ]);
          return { columns: ["Driver", "Trips", "Distance (km)", "Drive time (min)", "Last trip ended"], rows };
        },
      },
    ],
  },
  {
    id: "landmarks",
    label: "Landmarks",
    reports: [
      {
        id: "geofence-visits",
        name: "Geofence visits",
        description: "Entry/exit events per geofence",
        scopes: ["vehicles"],
        run: (i) => {
          const rows = i.alerts
            .filter((a) => (a.type === "geofenceEnter" || a.type === "geofenceExit") && inRange(a.createdAt, i.from, i.to) && inVehicleScope(i, a.vehicleId))
            .map((a) => [fmt(a.createdAt), a.type === "geofenceEnter" ? "Entered" : "Exited", vehicleName(i, a.vehicleId), a.title, a.message]);
          return { columns: ["Time", "Direction", "Vehicle", "Geofence", "Detail"], rows };
        },
      },
      {
        id: "geofence-summary",
        name: "Geofence visit count",
        description: "Visits per geofence in the period",
        scopes: ["vehicles"],
        run: (i) => {
          const agg = new Map<string, { in: number; out: number; last?: string }>();
          for (const a of i.alerts.filter((x) => (x.type === "geofenceEnter" || x.type === "geofenceExit") && inRange(x.createdAt, i.from, i.to) && inVehicleScope(i, x.vehicleId))) {
            const a2 = agg.get(a.title) ?? { in: 0, out: 0 };
            if (a.type === "geofenceEnter") a2.in += 1; else a2.out += 1;
            a2.last = a.createdAt > (a2.last ?? "") ? a.createdAt : a2.last;
            agg.set(a.title, a2);
          }
          const rows = [...agg.entries()].map(([g, a]) => [g, a.in, a.out, fmt(a.last)]);
          return { columns: ["Geofence", "Entries", "Exits", "Last activity"], rows };
        },
      },
    ],
  },
  {
    id: "safety",
    label: "Safety & security",
    reports: [
      {
        id: "security-events",
        name: "Car security",
        description: "Alarms, power cut, SOS, tow & crash events",
        scopes: ["vehicles"],
        run: (i) => ({
          columns: ["Time", "Vehicle", "Event", "Severity", "Detail", "Status"],
          rows: i.alerts
            .filter((a) => SECURITY_TYPES.has(a.type) && inRange(a.createdAt, i.from, i.to) && inVehicleScope(i, a.vehicleId))
            .map((a) => [fmt(a.createdAt), vehicleName(i, a.vehicleId), a.title, a.severity, a.message, a.status]),
        }),
      },
      {
        id: "sos",
        name: "Emergency button (SOS)",
        description: "SOS button events log",
        scopes: ["vehicles", "drivers"],
        run: (i) => ({
          columns: ["Time", "Vehicle", "Detail", "Status"],
          rows: i.alerts
            .filter((a) => a.type === "sos" && inRange(a.createdAt, i.from, i.to) && inVehicleScope(i, a.vehicleId))
            .map((a) => [fmt(a.createdAt), vehicleName(i, a.vehicleId), a.message, a.status]),
        }),
      },
      {
        id: "speed-violations",
        name: "Speed violation",
        description: "Speeding instances",
        scopes: ["vehicles", "drivers"],
        run: (i) => {
          const fromEvents = i.driverEvents
            .filter((e) => e.type === "overspeed" && inRange(e.recordedAt, i.from, i.to) && inVehicleScope(i, e.vehicleId) && inDriverScope(i, e.driverId))
            .map((e) => [fmt(e.recordedAt), vehicleName(i, e.vehicleId), driverName(i, e.driverId), e.speedKmh != null ? Math.round(e.speedKmh) : "", e.position ? `${e.position.lat.toFixed(4)}, ${e.position.lng.toFixed(4)}` : ""]);
          const fromAlerts = i.alerts
            .filter((a) => a.type === "overspeed" && inRange(a.createdAt, i.from, i.to) && inVehicleScope(i, a.vehicleId))
            .map((a) => [fmt(a.createdAt), vehicleName(i, a.vehicleId), driverName(i, i.vehicles.find((v) => v.id === a.vehicleId)?.driverId), "", a.message]);
          return { columns: ["Time", "Vehicle", "Driver", "Speed (km/h)", "Location"], rows: [...fromEvents, ...fromAlerts] };
        },
      },
    ],
  },
  {
    id: "fuel",
    label: "Fuel",
    reports: [
      {
        id: "fuel-volume",
        name: "Fuel volume",
        description: "Refills, drains and consumption",
        scopes: ["vehicles"],
        run: (i) => ({
          columns: ["Time", "Vehicle", "Kind", "Litres", "Cost ($)", "Odometer (km)", "Level after (%)"],
          rows: i.fuelRecords
            .filter((f) => inRange(f.at, i.from, i.to) && inVehicleScope(i, f.vehicleId))
            .map((f) => [fmt(f.at), vehicleName(i, f.vehicleId), f.kind, n1(f.liters), f.costUsd != null ? Number(f.costUsd.toFixed(2)) : "", Math.round(f.odometerKm), Math.round(f.levelAfterPct)]),
        }),
      },
      {
        id: "fuel-summary",
        name: "Fuel summary per vehicle",
        description: "Totals: refills, consumption, suspected drains",
        scopes: ["vehicles"],
        run: (i) => {
          const agg = new Map<string, { refills: number; refillL: number; usedL: number; drains: number; drainL: number; cost: number }>();
          for (const f of i.fuelRecords.filter((x) => inRange(x.at, i.from, i.to) && inVehicleScope(i, x.vehicleId))) {
            const a = agg.get(f.vehicleId) ?? { refills: 0, refillL: 0, usedL: 0, drains: 0, drainL: 0, cost: 0 };
            if (f.kind === "refill") { a.refills += 1; a.refillL += f.liters; }
            else if (f.kind === "consumption") a.usedL += f.liters;
            else { a.drains += 1; a.drainL += f.liters; }
            a.cost += f.costUsd ?? 0;
            agg.set(f.vehicleId, a);
          }
          const rows = [...agg.entries()].map(([vid, a]) => [vehicleName(i, vid), a.refills, n1(a.refillL), n1(a.usedL), a.drains, n1(a.drainL), Number(a.cost.toFixed(2))]);
          return { columns: ["Vehicle", "Refills", "Refilled (L)", "Consumed (L)", "Suspected drains", "Drained (L)", "Cost ($)"], rows };
        },
      },
    ],
  },
  {
    id: "driving",
    label: "Driving quality",
    reports: [
      {
        id: "harsh-events",
        name: "Harsh driving events",
        description: "Harsh braking, acceleration and cornering",
        scopes: ["vehicles", "drivers"],
        run: (i) => ({
          columns: ["Time", "Driver", "Vehicle", "Event", "Speed (km/h)", "Location"],
          rows: i.driverEvents
            .filter((e) => HARSH_TYPES.has(e.type) && inRange(e.recordedAt, i.from, i.to) && inVehicleScope(i, e.vehicleId) && inDriverScope(i, e.driverId))
            .map((e) => [fmt(e.recordedAt), driverName(i, e.driverId), vehicleName(i, e.vehicleId), e.type.replace(/_/g, " "), e.speedKmh != null ? Math.round(e.speedKmh) : "", e.position ? `${e.position.lat.toFixed(4)}, ${e.position.lng.toFixed(4)}` : ""]),
        }),
      },
      {
        id: "scorecard",
        name: "Driver scorecard",
        description: "Behavior score, risk and event counts per driver",
        scopes: ["drivers"],
        run: (i) => {
          /* Score computed live from period events — 100 minus penalties.
             The stored behaviorScore is stale; this reflects the range. */
          const events = new Map<string, { harsh: number; overspeed: number; idling: number }>();
          for (const e of i.driverEvents.filter((x) => inRange(x.recordedAt, i.from, i.to))) {
            if (!e.driverId) continue;
            const a = events.get(e.driverId) ?? { harsh: 0, overspeed: 0, idling: 0 };
            if (HARSH_TYPES.has(e.type)) a.harsh += 1;
            if (e.type === "overspeed") a.overspeed += 1;
            if (e.type === "idling") a.idling += 1;
            events.set(e.driverId, a);
          }
          const risk = (score: number) => (score >= 80 ? "low" : score >= 60 ? "medium" : "high");
          const rows = i.drivers
            .filter((d) => inDriverScope(i, d.id))
            .map((d) => {
              const e = events.get(d.id) ?? { harsh: 0, overspeed: 0, idling: 0 };
              const score = Math.max(0, 100 - e.harsh * 3 - e.overspeed * 2 - e.idling);
              return [d.name, score, risk(score), d.tripsThisMonth, n1(d.distanceThisMonthKm), e.harsh, e.overspeed, e.idling];
            })
            .sort((a, b) => (b[1] as number) - (a[1] as number));
          return { columns: ["Driver", "Score", "Risk", "Trips / month", "Distance (km)", "Harsh events", "Overspeed", "Idling"], rows };
        },
      },
    ],
  },
  {
    id: "device",
    label: "Device status",
    reports: [
      {
        id: "device-health",
        name: "Device health",
        description: "Connectivity, battery, SIM and GPS per tracker",
        scopes: ["vehicles"],
        run: (i) => ({
          columns: ["Vehicle", "Online", "Last seen", "Battery (V)", "Backup (%)", "SIM status", "Signal", "Satellites", "Firmware", "Health score"],
          rows: i.deviceHealth
            .filter((h) => inVehicleScope(i, h.vehicleId))
            .map((h) => [vehicleName(i, h.vehicleId), h.online ? "yes" : "no", fmt(h.lastSeen), h.batteryVoltage ?? "", h.backupBatteryPct ?? "", h.simStatus, h.signal, h.satellites, h.firmware, h.healthScore]),
        }),
      },
      {
        id: "offline-log",
        name: "Offline periods",
        description: "Device offline events in the period",
        scopes: ["vehicles"],
        run: (i) => ({
          columns: ["Time", "Vehicle", "Event", "Detail"],
          rows: i.alerts
            .filter((a) => a.type === "deviceOffline" && inRange(a.createdAt, i.from, i.to) && inVehicleScope(i, a.vehicleId))
            .map((a) => [fmt(a.createdAt), vehicleName(i, a.vehicleId), a.title, a.message]),
        }),
      },
    ],
  },
  {
    id: "ops",
    label: "Fleet operations",
    reports: [
      {
        id: "maintenance-schedule",
        name: "Maintenance schedule",
        description: "Upcoming, overdue and completed work items",
        scopes: ["vehicles"],
        run: (i) => ({
          columns: ["Vehicle", "Work item", "Type", "Due date", "Due km", "Cost ($)", "Status"],
          rows: i.maintenance
            .filter((m) => inVehicleScope(i, m.vehicleId))
            .map((m) => [vehicleName(i, m.vehicleId), m.title, m.type, day(m.dueDate), m.dueOdometerKm != null ? Math.round(m.dueOdometerKm) : "", m.costUsd != null ? Number(m.costUsd.toFixed(2)) : "", m.status]),
        }),
      },
      {
        id: "insurance-renewals",
        name: "Insurance renewals",
        description: "Policies with provider, premium and expiry",
        scopes: ["vehicles"],
        run: (i) => ({
          columns: ["Vehicle", "Policy #", "Provider", "Coverage", "Premium ($)", "Start", "Expiry", "Status"],
          rows: i.policies
            .filter((p) => inVehicleScope(i, p.vehicleId))
            .map((p) => [vehicleName(i, p.vehicleId), p.policyNumber, p.provider, p.coverage ?? "", p.premiumUsd ?? "", day(p.startDate), day(p.expiryDate), p.status]),
        }),
      },
    ],
  },
];

export const ALL_REPORTS: ReportDef[] = REPORT_CATEGORIES.flatMap((c) => c.reports);

export function findReport(id: string) {
  return ALL_REPORTS.find((r) => r.id === id);
}
