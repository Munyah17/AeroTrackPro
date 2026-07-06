/** Mock data for the white-label admin and super-admin sections. */

import type {
  ActivityLog,
  Announcement,
  ApiKey,
  Invoice,
  Plan,
  PlatformUser,
  SupportTicket,
  Tenant,
} from "../types";

const now = Date.now();
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();

export const tenants: Tenant[] = [
  { id: "tn-speedtrack", name: "SpeedTrack Ltd", slug: "speedtrack", contactEmail: "info@speedtrack.co.zw", plan: "pro", status: "active", primaryColor: "#1E40FF", customDomain: "gps.speedtrack.co.zw", domainStatus: "active", userCount: 12, vehicleCount: 24, createdAt: iso(420), mrrUsd: 199 },
  { id: "tn-metrogps", name: "Metro GPS Solutions", slug: "metrogps", contactEmail: "contact@metrogps.com", plan: "pro", status: "active", primaryColor: "#7c3aed", customDomain: "track.metrogps.com", domainStatus: "active", userCount: 8, vehicleCount: 41, createdAt: iso(365), mrrUsd: 199 },
  { id: "tn-safefleet", name: "SafeFleet Systems", slug: "safefleet", contactEmail: "hello@safefleet.com", plan: "enterprise", status: "active", primaryColor: "#059669", customDomain: "live.safefleet.com", domainStatus: "active", userCount: 15, vehicleCount: 208, createdAt: iso(300), mrrUsd: 499 },
  { id: "tn-trackline", name: "TrackLine Services", slug: "trackline", contactEmail: "admin@trackline.com", plan: "basic", status: "suspended", primaryColor: "#dc2626", customDomain: "app.trackline.com", domainStatus: "pending", userCount: 5, vehicleCount: 9, createdAt: iso(200), mrrUsd: 19 },
  { id: "tn-guardian", name: "Guardian Tracking", slug: "guardian", contactEmail: "support@guardian.co.zw", plan: "pro", status: "active", primaryColor: "#0891b2", userCount: 10, vehicleCount: 66, createdAt: iso(150), mrrUsd: 199 },
  { id: "tn-deltamovers", name: "Delta Movers", slug: "deltamovers", contactEmail: "ops@deltamovers.co.zw", plan: "standard", status: "trial", primaryColor: "#d97706", userCount: 3, vehicleCount: 14, createdAt: iso(12), mrrUsd: 0 },
];

const NAMES = ["John Moyo", "Mary Wanjiku", "Peter Ochieng", "David Kimani", "Grace Mutare", "Samuel Ndlovu", "Alice Chuma", "Brian Gatsi"];
export const users: PlatformUser[] = NAMES.map((name, i) => ({
  id: `usr-${i + 1}`,
  tenantId: tenants[i % tenants.length]!.id,
  name,
  email: `${name.toLowerCase().replace(/\s+/g, ".")}@${tenants[i % tenants.length]!.slug}.com`,
  role: (["admin", "manager", "dispatcher", "viewer", "admin", "manager", "driver", "admin"] as const)[i]!,
  status: i === 3 ? "inactive" : i === 6 ? "invited" : "active",
  lastActive: iso(i * 0.4),
  avatarSeed: name.split(" ")[0]!.toLowerCase(),
}));

export const plans: Plan[] = [
  { id: "pln-basic", name: "Basic", priceMonthlyUsd: 19, maxVehicles: 10, features: ["Live tracking", "Trip history (30 days)", "Email alerts", "2 users"], active: true },
  { id: "pln-standard", name: "Standard", priceMonthlyUsd: 49, maxVehicles: 50, features: ["Everything in Basic", "Geofencing", "Fuel monitoring", "Reports", "10 users"], active: true },
  { id: "pln-pro", name: "Pro", priceMonthlyUsd: 199, maxVehicles: 200, features: ["Everything in Standard", "White-label branding", "Custom domain", "API access", "Driver behavior", "Unlimited users"], active: true },
  { id: "pln-enterprise", name: "Enterprise", priceMonthlyUsd: 499, maxVehicles: null, features: ["Everything in Pro", "Dedicated support", "SLA 99.9%", "Custom integrations", "Insurance API"], active: true },
];

export const invoices: Invoice[] = tenants.flatMap((t, ti) =>
  Array.from({ length: 3 }, (_, i) => ({
    id: `inv-${ti * 3 + i + 1}`,
    tenantId: t.id,
    number: `INV-${String(ti * 3 + i + 1).padStart(4, "0")}`,
    amountUsd: t.mrrUsd || 49,
    status: (i === 0 && t.status === "suspended" ? "overdue" : i === 0 && t.status === "trial" ? "pending" : "paid") as Invoice["status"],
    issuedAt: iso(i * 30 + 2),
    paidAt: i > 0 ? iso(i * 30) : undefined,
  })),
);

export const tickets: SupportTicket[] = [
  { id: "TKT-1001", tenantId: "tn-speedtrack", subject: "Device not reporting after SIM swap", status: "open", priority: "high", createdAt: iso(0.4), lastReplyAt: iso(0.1) },
  { id: "TKT-1002", tenantId: "tn-metrogps", subject: "Geofence alerts delayed", status: "inProgress", priority: "medium", createdAt: iso(2), lastReplyAt: iso(0.6) },
  { id: "TKT-1003", tenantId: "tn-safefleet", subject: "Billing question — annual invoicing", status: "closed", priority: "low", createdAt: iso(9), lastReplyAt: iso(6) },
  { id: "TKT-1004", tenantId: "tn-guardian", subject: "Request: Teltonika FMB920 support", status: "open", priority: "medium", createdAt: iso(1.2), lastReplyAt: iso(1.2) },
  { id: "TKT-1005", tenantId: "tn-deltamovers", subject: "Trial extension request", status: "inProgress", priority: "urgent", createdAt: iso(0.8), lastReplyAt: iso(0.2) },
];

export const apiKeys: ApiKey[] = [
  { id: "key-1", tenantId: "tn-speedtrack", name: "Fleet Integration", prefix: "atk_live_7f3a", scopes: ["positions:read", "vehicles:read"], createdAt: iso(45), lastUsedAt: iso(0.02), status: "active" },
  { id: "key-2", tenantId: "tn-speedtrack", name: "Mobile App", prefix: "atk_live_c91d", scopes: ["positions:read", "commands:write"], createdAt: iso(30), lastUsedAt: iso(0.01), status: "active" },
  { id: "key-3", tenantId: "tn-safefleet", name: "Insurance Partner (ZimRe)", prefix: "atk_live_e402", scopes: ["behavior:read", "trips:read"], createdAt: iso(90), lastUsedAt: iso(1), status: "active" },
  { id: "key-4", tenantId: "tn-metrogps", name: "Legacy ERP", prefix: "atk_live_11b8", scopes: ["vehicles:read"], createdAt: iso(200), status: "revoked" },
];

export const activityLogs: ActivityLog[] = [
  { id: "log-1", tenantId: "tn-speedtrack", userName: "John Moyo", action: "Login", module: "Authentication", at: iso(0.01), ip: "197.221.34.12" },
  { id: "log-2", tenantId: "tn-metrogps", userName: "Mary Wanjiku", action: "Added device TKD-10041", module: "Devices", at: iso(0.05), ip: "105.178.9.201" },
  { id: "log-3", tenantId: "tn-speedtrack", userName: "Peter Ochieng", action: "Updated vehicle AEC 4521", module: "Vehicles", at: iso(0.2), ip: "197.221.34.12" },
  { id: "log-4", tenantId: "tn-trackline", userName: "David Kimani", action: "Generated trip report", module: "Reports", at: iso(0.4), ip: "41.79.220.8" },
  { id: "log-5", tenantId: "tn-safefleet", userName: "Grace Mutare", action: "Sent engine cut command to AFC 1187", module: "Commands", at: iso(0.5), ip: "196.201.5.44" },
  { id: "log-6", tenantId: "tn-speedtrack", userName: "John Moyo", action: "Created geofence 'Msasa Warehouse'", module: "Geofences", at: iso(1.1), ip: "197.221.34.12" },
  { id: "log-7", tenantId: "tn-guardian", userName: "Samuel Ndlovu", action: "Revoked API key atk_live_11b8", module: "API", at: iso(1.6), ip: "102.132.99.7" },
  { id: "log-8", tenantId: "tn-deltamovers", userName: "Alice Chuma", action: "Invited user b.gatsi@deltamovers.co.zw", module: "Users", at: iso(2.2), ip: "197.155.66.30" },
];

export const announcements: Announcement[] = [
  { id: "ann-1", title: "Scheduled maintenance — Sunday 02:00 UTC", audience: "allTenants", status: "published", publishedAt: iso(3) },
  { id: "ann-2", title: "New feature: Fuel theft detection", audience: "allTenants", status: "published", publishedAt: iso(12) },
  { id: "ann-3", title: "Holiday support hours", audience: "allTenants", status: "published", publishedAt: iso(25) },
  { id: "ann-4", title: "Teltonika protocol beta program", audience: "specific", status: "draft" },
];

export function tenantById(id: string) {
  return tenants.find((t) => t.id === id);
}
