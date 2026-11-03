"use client";

import {
  type ActivityLog,
  type Announcement,
  type ApiKey,
  type Database,
  type Invoice,
  type Plan,
  type PlatformUser,
  type SupportTicket,
  type Tenant,
} from "@aerotrack/shared";
import { type ResellerClient } from "@/lib/reseller";
import { useTenantTable } from "./use-live-data";

type Tables = Database["public"]["Tables"];
type Row<T extends keyof Tables> = Tables[T]["Row"];

/* ------------------------------------------------------------------ */
/* Row → domain mappers                                                */
/* ------------------------------------------------------------------ */

const toTenant = (r: Row<"tenants">): Tenant => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  contactEmail: r.contact_email ?? "",
  plan: r.plan === "starter" ? "basic" : r.plan,
  status: r.status === "cancelled" ? "suspended" : r.status,
  primaryColor: r.primary_color,
  logoUrl: r.logo_url ?? undefined,
  customDomain: r.custom_domain ?? undefined,
  domainStatus: r.custom_domain ? r.domain_status : undefined,
  userCount: r.user_limit,
  vehicleCount: r.vehicle_limit,
  createdAt: r.created_at,
  mrrUsd: r.mrr_usd,
});

const ROLE_MAP: Record<string, PlatformUser["role"]> = {
  super_admin: "superAdmin",
  admin: "admin",
  manager: "manager",
  dispatcher: "dispatcher",
  driver: "driver",
  viewer: "viewer",
  user: "viewer",
};

const toPlatformUser = (r: Row<"users">): PlatformUser => ({
  id: r.id,
  tenantId: r.tenant_id,
  name: r.full_name ?? r.email.split("@")[0] ?? r.email,
  email: r.email,
  role: ROLE_MAP[r.role] ?? "viewer",
  status: r.status === "active" ? "active" : "inactive",
  lastActive: r.last_seen_at ?? r.created_at,
  avatarSeed: (r.full_name ?? r.email).split(" ")[0]!.toLowerCase(),
});

const toPlan = (r: Row<"plans">): Plan => ({
  id: r.id,
  name: r.name,
  priceMonthlyUsd: r.price_monthly_usd,
  maxVehicles: r.max_vehicles,
  features: r.features,
  active: r.active,
});

const toInvoice = (r: Row<"invoices">): Invoice => ({
  id: r.id,
  tenantId: r.tenant_id,
  number: r.number,
  amountUsd: r.amount_usd,
  status: r.status === "void" ? "failed" : r.status,
  issuedAt: r.issued_at,
  paidAt: r.paid_at ?? undefined,
});

const TICKET_STATUS: Record<string, SupportTicket["status"]> = {
  open: "open",
  in_progress: "inProgress",
  resolved: "closed",
  closed: "closed",
};

const toTicket = (r: Row<"support_tickets">): SupportTicket => ({
  id: r.id,
  tenantId: r.tenant_id,
  subject: r.subject,
  status: TICKET_STATUS[r.status] ?? "open",
  priority: r.priority,
  createdAt: r.created_at,
  lastReplyAt: r.last_reply_at ?? r.created_at,
});

const toApiKey = (r: Row<"api_keys">): ApiKey => ({
  id: r.id,
  tenantId: r.tenant_id,
  name: r.name,
  prefix: `atk_…${r.key_hash.slice(0, 8)}`,
  scopes: r.scopes,
  createdAt: r.created_at,
  lastUsedAt: r.last_used_at ?? undefined,
  status: r.status,
});

const toActivity = (r: Row<"activity_logs">): ActivityLog => ({
  id: r.id,
  tenantId: r.tenant_id,
  userName: r.user_name,
  action: r.action,
  module: r.module,
  at: r.created_at,
  ip: r.ip ?? "",
});

const toAnnouncement = (r: Row<"announcements">): Announcement => ({
  id: r.id,
  title: r.title,
  audience: r.audience === "all" ? "allTenants" : "specific",
  status: r.status,
  publishedAt: r.published_at ?? undefined,
});

export interface TenantAddon {
  id: string;
  module: string;
  active: boolean;
}

const toAddon = (r: Row<"tenant_addons">): TenantAddon => ({
  id: r.id,
  module: r.module,
  active: r.active,
});

/* ------------------------------------------------------------------ */
/* Domain hooks                                                        */
/* ------------------------------------------------------------------ */

/** Tenants visible under RLS (own tenant; all tenants for super admins). */
export const useTenants = () =>
  useTenantTable("tenants", { map: toTenant, order: "created_at" });

export const usePlatformUsers = () =>
  useTenantTable("users", { map: toPlatformUser, order: "created_at" });

export const usePlans = () =>
  useTenantTable("plans", { map: toPlan, order: "sort", ascending: true, tenantScoped: false });

export const useInvoices = () =>
  useTenantTable("invoices", { map: toInvoice, order: "issued_at" });

export const useSupportTickets = () =>
  useTenantTable("support_tickets", { map: toTicket, order: "created_at" });

export const useApiKeys = () =>
  useTenantTable("api_keys", { map: toApiKey, order: "created_at" });

export const useActivityLogs = () =>
  useTenantTable("activity_logs", { map: toActivity, order: "created_at" });

export const useAnnouncements = () =>
  useTenantTable("announcements", {
    map: toAnnouncement,
    fallback: [],
    order: "created_at",
    tenantScoped: false,
  });

export const useTenantAddons = () =>
  useTenantTable("tenant_addons", { map: toAddon, fallback: [], order: "created_at" });

/**
 * Reseller downline: child `client` tenants under the signed-in reseller.
 * Under tenant RLS only what the session can read is returned, so for a
 * normal reseller login this may be empty; for platform/super-admin the
 * full client list is visible.
 */
export const useResellerClients = () => {
  const table = useTenantTable<"tenants", ResellerClient & { accountKind?: string }>("tenants", {
    map: (r: Row<"tenants">) => ({
      id: r.id,
      name: r.name,
      contact: r.contact_email ?? "—",
      devices: r.vehicle_limit,
      activeDevices: r.vehicle_limit,
      joinedAt: r.created_at,
      status: (r.status === "trial" ? "trial" : r.status === "active" ? "active" : "suspended") as
        | "trial"
        | "active"
        | "suspended",
      accountKind: r.account_kind,
    }),
    order: "created_at",
  });
  /* In live mode keep only actual client tenants. */
  const rows = table.live
    ? table.rows.filter((c) => c.accountKind === "client")
    : table.rows;
  return { ...table, rows };
};
