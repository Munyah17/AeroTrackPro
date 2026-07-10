/**
 * Reseller billing model.
 *
 * The platform bills the RESELLER (not their clients). Resellers pay:
 *   - a one-time setup fee, plus
 *   - a monthly base tracking fee per active device, plus
 *   - optional monthly add-on feature modules, priced per device.
 *
 * Clients sit under the reseller like an MLM downline. Clients have no
 * platform plan — the reseller bills every device across all their clients
 * and collects from those clients under whatever terms they agree privately.
 */

export const RESELLER_PRICING = {
  setupFeeUsd: 50,
  baseTrackingPerDeviceUsd: 2.5,
};

export interface AddonModule {
  id: string;
  name: string;
  description: string;
  pricePerDeviceUsd: number;
  status: "available" | "planned";
}

export const ADDON_MODULES: AddonModule[] = [
  { id: "insurance", name: "Insurance Management", description: "Policies, expiry alerts, document vault", pricePerDeviceUsd: 0.5, status: "available" },
  { id: "maintenance", name: "Maintenance & Service", description: "Service schedules, reminders, work orders", pricePerDeviceUsd: 0.5, status: "available" },
  { id: "fuel", name: "Fuel & Digital Coupons", description: "Fuel monitoring, theft alerts, QR fuel coupons", pricePerDeviceUsd: 0.4, status: "available" },
  { id: "behavior", name: "Driver Behavior", description: "Scoring, harsh-event detection, risk reports", pricePerDeviceUsd: 0.4, status: "available" },
  { id: "dashcam", name: "Dashcam Video", description: "Live video, event clips, cloud retention", pricePerDeviceUsd: 1.5, status: "planned" },
  { id: "rfid", name: "RFID Driver ID", description: "Driver identification and authorization", pricePerDeviceUsd: 0.3, status: "planned" },
];

export interface ResellerClient {
  id: string;
  name: string;
  contact: string;
  devices: number;
  activeDevices: number;
  joinedAt: string;
  status: "active" | "trial" | "suspended";
}

const DAY = 86_400_000;
const iso = (d: number) => new Date(Date.now() - d * DAY).toISOString();

/** Demo downline for the reseller portal. */
export const RESELLER_CLIENTS: ResellerClient[] = [
  { id: "cl-1", name: "Nyaradzo Funeral Services", contact: "fleet@nyaradzo.co.zw", devices: 34, activeDevices: 33, joinedAt: iso(220), status: "active" },
  { id: "cl-2", name: "Delta Beverages", contact: "logistics@delta.co.zw", devices: 58, activeDevices: 55, joinedAt: iso(180), status: "active" },
  { id: "cl-3", name: "Croco Motors", contact: "ops@crocomotors.co.zw", devices: 22, activeDevices: 22, joinedAt: iso(120), status: "active" },
  { id: "cl-4", name: "Harare City Cabs", contact: "dispatch@hccabs.co.zw", devices: 41, activeDevices: 38, joinedAt: iso(90), status: "active" },
  { id: "cl-5", name: "Zimgold Distribution", contact: "transport@zimgold.co.zw", devices: 17, activeDevices: 17, joinedAt: iso(45), status: "trial" },
  { id: "cl-6", name: "Pelhams Logistics", contact: "fleet@pelhams.co.zw", devices: 9, activeDevices: 6, joinedAt: iso(15), status: "suspended" },
];

/** Which add-on modules this reseller has enabled (demo). */
export const ENABLED_ADDONS = ["insurance", "maintenance", "fuel"];

export interface ResellerBill {
  totalDevices: number;
  activeDevices: number;
  baseMonthly: number;
  addonsMonthly: number;
  monthlyTotal: number;
  addonBreakdown: { module: AddonModule; monthly: number }[];
}

export function computeResellerBill(
  clients: ResellerClient[] = RESELLER_CLIENTS,
  enabledAddonIds: string[] = ENABLED_ADDONS,
): ResellerBill {
  const totalDevices = clients.reduce((n, c) => n + c.devices, 0);
  const activeDevices = clients.reduce((n, c) => n + c.activeDevices, 0);
  const baseMonthly = activeDevices * RESELLER_PRICING.baseTrackingPerDeviceUsd;

  const addonBreakdown = ADDON_MODULES.filter((m) => enabledAddonIds.includes(m.id)).map((module) => ({
    module,
    monthly: activeDevices * module.pricePerDeviceUsd,
  }));
  const addonsMonthly = addonBreakdown.reduce((n, a) => n + a.monthly, 0);

  return {
    totalDevices,
    activeDevices,
    baseMonthly,
    addonsMonthly,
    monthlyTotal: baseMonthly + addonsMonthly,
    addonBreakdown,
  };
}
