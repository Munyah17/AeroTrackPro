/**
 * Alert rules evaluated on every decoded position: device-reported alarms
 * (SOS, power cut, ...) and platform-side overspeed detection.
 */

import type { AlarmType, Position } from "@aerotrack/protocols";
import { db, type DeviceRecord } from "./db";
import { dispatchWebhooks } from "./webhooks";

const ALARM_SEVERITY: Partial<Record<AlarmType, "info" | "warning" | "critical">> = {
  sos: "critical",
  crash: "critical",
  powerCut: "critical",
  fuelTheft: "critical",
  jamming: "critical",
  tamper: "warning",
  overspeed: "warning",
  lowBattery: "warning",
  vibration: "warning",
  tow: "warning",
  door: "info",
  movement: "info",
  idle: "info",
};

const ALARM_TITLES: Partial<Record<AlarmType, string>> = {
  sos: "SOS button pressed",
  crash: "Crash detected",
  powerCut: "Device power disconnected",
  fuelTheft: "Possible fuel theft",
  jamming: "GPS/GSM jamming detected",
  tamper: "Device tamper detected",
  overspeed: "Overspeed reported by device",
  lowBattery: "Device battery low",
  vibration: "Vibration detected",
  tow: "Possible tow-away",
  door: "Door opened",
  movement: "Unexpected movement",
  idle: "Excessive idling",
};

/** Per-device debounce so a sustained condition doesn't flood alerts. */
const lastAlertAt = new Map<string, number>();
const DEBOUNCE_MS = 10 * 60_000;

function shouldRaise(deviceId: string, type: string): boolean {
  const key = `${deviceId}:${type}`;
  const last = lastAlertAt.get(key) ?? 0;
  if (Date.now() - last < DEBOUNCE_MS) return false;
  lastAlertAt.set(key, Date.now());
  return true;
}

async function insertAlert(
  device: DeviceRecord,
  position: Position,
  alertType: string,
  severity: "info" | "warning" | "critical",
  title: string,
  message: string,
) {
  const { data, error } = await db()
    .from("alerts")
    .insert({
      tenant_id: device.tenant_id,
      device_id: device.id,
      vehicle_id: device.vehicle_id,
      alert_type: alertType,
      severity,
      title,
      message,
      position: {
        lat: position.latitude,
        lng: position.longitude,
        speed_kmh: position.speedKmh,
        recorded_at: position.timestamp.toISOString(),
      },
    })
    .select()
    .single();

  if (error) {
    console.error(`[alerts] Failed to insert ${alertType} alert:`, error.message);
    return;
  }

  console.log(`[alerts] ${severity.toUpperCase()} ${alertType} for device ${position.deviceId}`);
  void dispatchWebhooks(device.tenant_id, "alert.created", data);
}

export async function evaluateAlerts(device: DeviceRecord, position: Position) {
  // 1. Device-reported alarm flags
  const alarm = position.attributes.alarm;
  if (alarm && alarm !== "unknown" && shouldRaise(device.id, `alarm:${alarm}`)) {
    await insertAlert(
      device,
      position,
      alarm,
      ALARM_SEVERITY[alarm] ?? "warning",
      ALARM_TITLES[alarm] ?? `Device alarm: ${alarm}`,
      `Reported at ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`,
    );
  }

  // 2. Platform-side overspeed against the vehicle's configured limit
  const limit = device.speed_limit_kmh;
  if (limit && position.speedKmh > limit && shouldRaise(device.id, "overspeed")) {
    await insertAlert(
      device,
      position,
      "overspeed",
      "warning",
      "Vehicle overspeeding",
      `${Math.round(position.speedKmh)} km/h in a ${limit} km/h configured limit`,
    );
  }
}
