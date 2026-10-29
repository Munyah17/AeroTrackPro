/**
 * Notification event catalog — shared by the settings UI (client) and the
 * dispatch layer (server). Keep this file free of Node/server-only imports.
 */

export interface NotifyEventDef {
  id: string;
  label: string;
  description: string;
  /** Sensible default channel set when the user has no saved preference. */
  defaultEmail: boolean;
  defaultSms: boolean;
}

export const NOTIFY_EVENTS: NotifyEventDef[] = [
  {
    id: "sos",
    label: "SOS / Emergency",
    description: "SOS button or panic alarm from a tracker",
    defaultEmail: true,
    defaultSms: true,
  },
  {
    id: "overspeed",
    label: "Overspeed alerts",
    description: "Tracker reports an overspeed alarm",
    defaultEmail: true,
    defaultSms: false,
  },
  {
    id: "geofence",
    label: "Geofence violations",
    description: "Vehicle enters or leaves a geofenced area",
    defaultEmail: true,
    defaultSms: false,
  },
  {
    id: "power_cut",
    label: "Power disconnect",
    description: "Tracker power cut or main battery disconnected",
    defaultEmail: false,
    defaultSms: false,
  },
  {
    id: "device_offline",
    label: "Device goes offline",
    description: "A tracker stops reporting (Traccar deviceOffline)",
    defaultEmail: false,
    defaultSms: false,
  },
  {
    id: "device_online",
    label: "Device back online",
    description: "An offline tracker resumes reporting",
    defaultEmail: false,
    defaultSms: false,
  },
  {
    id: "fuel_alert",
    label: "Fuel anomalies",
    description: "Suspected fuel theft or abnormal fuel events",
    defaultEmail: true,
    defaultSms: false,
  },
  {
    id: "coupon_redeemed",
    label: "Coupon redeemed",
    description: "A fuel coupon is redeemed at a station",
    defaultEmail: true,
    defaultSms: false,
  },
  {
    id: "maintenance_due",
    label: "Maintenance due",
    description: "Service, inspection or license renewals approaching",
    defaultEmail: true,
    defaultSms: false,
  },
  {
    id: "insurance_expiry",
    label: "Insurance expiring",
    description: "Insurance policy expiry warnings",
    defaultEmail: true,
    defaultSms: false,
  },
  {
    id: "report_ready",
    label: "Report ready",
    description: "Scheduled or requested report is available",
    defaultEmail: true,
    defaultSms: false,
  },
];

export type NotifyEventType = (typeof NOTIFY_EVENTS)[number]["id"];

const EVENT_IDS = new Set<string>(NOTIFY_EVENTS.map((e) => e.id));

export function isNotifyEvent(id: string): id is NotifyEventType {
  return EVENT_IDS.has(id);
}

export function eventDef(id: string): NotifyEventDef | undefined {
  return NOTIFY_EVENTS.find((e) => e.id === id);
}

/**
 * Map a Traccar position `attributes.alarm` string to a notify event.
 * Returns null for alarms we don't surface (vibration, movement, etc.).
 */
export function mapTraccarAlarm(alarm: string): NotifyEventType | null {
  const a = alarm.toLowerCase();
  if (a.includes("sos") || a.includes("emergency") || a.includes("panic")) return "sos";
  if (a.includes("overspeed") || a.includes("speeding")) return "overspeed";
  if (a.includes("geofence")) return "geofence";
  if (a.includes("powercut") || a.includes("power_cut") || a.includes("poweroff")) return "power_cut";
  if (a.includes("fuel")) return "fuel_alert";
  return null;
}

export interface ChannelPrefs {
  in_app_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
}

/** Default channel set for an event when no preference row exists. */
export function defaultPrefs(id: string): ChannelPrefs {
  const def = eventDef(id);
  return {
    in_app_enabled: true,
    email_enabled: def?.defaultEmail ?? false,
    sms_enabled: def?.defaultSms ?? false,
  };
}
