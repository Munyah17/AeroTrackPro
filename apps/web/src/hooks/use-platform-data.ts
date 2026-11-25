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
import { type ResellerClient, RESELLER_PRICING, modulesWithPrices, type AddonModule } from "@/lib/reseller";
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
  accountKind: r.account_kind,
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
  maxUsers: r.max_users,
  features: r.features,
  active: r.active,
  billingUnit: r.billing_unit === "device" ? "device" : "month",
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

export interface Quotation {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string | null;
  kind: "client" | "partner";
  amountUsd: number;
  currency: string;
  status: "draft" | "sent" | "accepted" | "declined" | "expired";
  notes: string | null;
  validUntil: string | null;
  sentAt: string | null;
  createdAt: string;
}

const toQuotation = (r: Row<"quotations">): Quotation => ({
  id: r.id,
  number: r.number,
  clientName: r.client_name,
  clientEmail: r.client_email,
  kind: r.kind,
  amountUsd: r.amount_usd,
  currency: r.currency,
  status: r.status,
  notes: r.notes,
  validUntil: r.valid_until,
  sentAt: r.sent_at,
  createdAt: r.created_at,
});

export type DocType = "invoice" | "receipt" | "statement" | "boq" | "bom" | "waybill" | "checkout" | "transfer";
export type DocStatus =
  | "draft" | "sent" | "issued" | "paid" | "completed"
  | "in_transit" | "delivered" | "pending" | "accepted" | "void" | "cancelled";

export interface GeneratedDocument {
  id: string;
  docType: DocType;
  number: string;
  partyName: string;
  partyContact: string | null;
  counterpartyName: string | null;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  details: string | null;
  status: DocStatus;
  notes: string | null;
  createdAt: string;
}

const toGeneratedDocument = (r: Row<"generated_documents">): GeneratedDocument => ({
  id: r.id,
  docType: r.doc_type,
  number: r.number,
  partyName: r.party_name,
  partyContact: r.party_contact,
  counterpartyName: r.counterparty_name,
  amount: Number(r.amount),
  currency: r.currency,
  issueDate: r.issue_date,
  dueDate: r.due_date,
  periodStart: r.period_start,
  periodEnd: r.period_end,
  details: r.details,
  status: r.status as DocStatus,
  notes: r.notes,
  createdAt: r.created_at,
});

const toAddon = (r: Row<"tenant_addons">): TenantAddon => ({
  id: r.id,
  module: r.module,
  active: r.active,
});

export interface Partner {
  id: string;
  name: string;
  kind: "installer" | "reseller";
  contactEmail: string | null;
  country: string | null;
  status: "application" | "approved" | "active" | "suspended";
  notes: string | null;
  appliedAt: string;
  approvedAt: string | null;
}

const toPartner = (r: Row<"partners">): Partner => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  contactEmail: r.contact_email,
  country: r.country,
  status: r.status,
  notes: r.notes,
  appliedAt: r.applied_at,
  approvedAt: r.approved_at,
});

export interface FeedbackItem {
  id: string;
  tenantId: string | null;
  authorName: string;
  authorEmail: string | null;
  category: "bug" | "feature" | "praise" | "complaint";
  message: string;
  rating: number | null;
  status: "new" | "reviewed" | "actioned" | "closed";
  createdAt: string;
}

const toFeedback = (r: Row<"feedback">): FeedbackItem => ({
  id: r.id,
  tenantId: r.tenant_id,
  authorName: r.author_name,
  authorEmail: r.author_email,
  category: r.category,
  message: r.message,
  rating: r.rating,
  status: r.status,
  createdAt: r.created_at,
});

export interface LegalDocument {
  id: string;
  title: string;
  version: string;
  status: "draft" | "published" | "archived";
  content: string | null;
  effectiveAt: string | null;
  createdBy: string | null;
  updatedAt: string;
}

const toLegalDocument = (r: Row<"legal_documents">): LegalDocument => ({
  id: r.id,
  title: r.title,
  version: r.version,
  status: r.status,
  content: r.content,
  effectiveAt: r.effective_at,
  createdBy: r.created_by,
  updatedAt: r.updated_at,
});

export interface FleetDelegate {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: "user" | "reseller";
  createdAt: string;
}

const toFleetDelegate = (r: Row<"fleet_delegates">): FleetDelegate => ({
  id: r.id,
  name: r.name,
  email: r.email,
  organization: r.organization,
  role: r.role,
  createdAt: r.created_at,
});

export interface DeviceGroup {
  id: string;
  tenantId: string | null;
  name: string;
  color: string;
  deviceCount: number;
}

const toDeviceGroup = (r: Row<"device_groups">): DeviceGroup => ({
  id: r.id,
  tenantId: r.tenant_id,
  name: r.name,
  color: r.color,
  deviceCount: 0,
});

export interface SmsGateway {
  id: string;
  name: string;
  provider: string;
  senderId: string | null;
  isDefault: boolean;
  status: "active" | "inactive";
  balanceUsd: number | null;
}

const toSmsGateway = (r: Row<"sms_gateways">): SmsGateway => ({
  id: r.id,
  name: r.name,
  provider: r.provider,
  senderId: r.sender_id,
  isDefault: r.is_default,
  status: r.status,
  balanceUsd: r.balance_usd,
});

export interface EmailTemplate {
  id: string;
  name: string;
  kind: "system" | "alert" | "billing" | "digest";
  subject: string;
  body: string;
  tenantId: string | null;
  updatedAt: string;
}

const toEmailTemplate = (r: Row<"email_templates">): EmailTemplate => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  subject: r.subject,
  body: r.body,
  tenantId: r.tenant_id,
  updatedAt: r.updated_at,
});

/* ------------------------------------------------------------------ */
/* Domain hooks                                                        */
/* ------------------------------------------------------------------ */

/** Tenants visible under RLS (own tenant; all tenants for super admins). */
export const useTenants = () =>
  useTenantTable("tenants", { map: toTenant, order: "created_at" });

export interface DeviceLite {
  id: string;
  tenantId: string;
  status: string;
}

const toDeviceLite = (r: Row<"devices">): DeviceLite => ({
  id: r.id,
  tenantId: r.tenant_id,
  status: r.status,
});

/** All devices visible under RLS (super admins see every tenant). */
export const useDevices = () =>
  useTenantTable("devices", { map: toDeviceLite, order: "created_at" });

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

/** Platform-owner quotations (super-admin RLS; not tenant-scoped). */
export const useQuotations = () =>
  useTenantTable("quotations", {
    map: toQuotation,
    fallback: [],
    order: "created_at",
    tenantScoped: false,
  });

/** Platform-owner generated business documents (super-admin RLS; not tenant-scoped). */
export const useGeneratedDocuments = () =>
  useTenantTable("generated_documents", {
    map: toGeneratedDocument,
    fallback: [],
    order: "created_at",
    tenantScoped: false,
  });

/** Installer/reseller onboarding pipeline (super-admin RLS). */
export const usePartners = () =>
  useTenantTable("partners", {
    map: toPartner,
    fallback: [],
    order: "applied_at",
    tenantScoped: false,
  });

export interface PlatformSetting {
  key: string;
  value: unknown;
}

const toPlatformSetting = (r: Row<"platform_settings">): PlatformSetting => ({
  key: r.key,
  value: r.value,
});

/**
 * Global platform settings (platform_settings table). Readable by every
 * signed-in user; writes are super-admin only (RLS). `save` upserts by key.
 */
export function usePlatformSettings() {
  const table = useTenantTable("platform_settings", {
    map: toPlatformSetting,
    fallback: [],
    order: "key",
    tenantScoped: false,
  });

  const save = async (key: string, value: unknown): Promise<boolean> => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ key, value: value as never, updated_at: new Date().toISOString() });
      if (error) return false;
      table.refresh();
      return true;
    } catch {
      return false;
    }
  };

  return { ...table, save };
}

/** Client & partner feedback inbox (authors see own tenant; admins see all). */
export const useFeedback = () =>
  useTenantTable("feedback", {
    map: toFeedback,
    fallback: [],
    order: "created_at",
    tenantScoped: false,
  });

/** Versioned terms/policies managed by the platform owner. */
export const useLegalDocuments = () =>
  useTenantTable("legal_documents", {
    map: toLegalDocument,
    fallback: [],
    order: "created_at",
    tenantScoped: false,
  });

/** Corporate fleet-access grants issued by Master Admin. */
export const useFleetDelegates = () =>
  useTenantTable("fleet_delegates", {
    map: toFleetDelegate,
    fallback: [],
    order: "created_at",
    tenantScoped: false,
  });

/** Device groups (platform-wide + tenant-scoped rows for super admin). */
export const useDeviceGroups = () =>
  useTenantTable("device_groups", {
    map: toDeviceGroup,
    fallback: [],
    order: "created_at",
    tenantScoped: false,
  });

/** SMS gateways — platform-owner managed. */
export const useSmsGateways = () =>
  useTenantTable("sms_gateways", {
    map: toSmsGateway,
    fallback: [],
    order: "created_at",
    tenantScoped: false,
  });

/** Email templates — platform defaults + per-tenant overrides. */
export const useEmailTemplates = () =>
  useTenantTable("email_templates", {
    map: toEmailTemplate,
    fallback: [],
    order: "updated_at",
    tenantScoped: false,
  });

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

export interface ResellerPricing {
  setupFeeUsd: number;
  baseTrackingPerDeviceUsd: number;
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/**
 * Global reseller pricing — platform_settings rows override the static
 * defaults in lib/reseller. Falls back to defaults until settings load.
 */
export function useResellerPricing() {
  const { rows, live } = usePlatformSettings();

  const pricingRow = rows.find((r) => r.key === "reseller_pricing");
  const addonRow = rows.find((r) => r.key === "addon_prices");

  const pricing: ResellerPricing = {
    setupFeeUsd: num(asRecord(pricingRow?.value).setupFeeUsd, RESELLER_PRICING.setupFeeUsd),
    baseTrackingPerDeviceUsd: num(
      asRecord(pricingRow?.value).baseTrackingPerDeviceUsd,
      RESELLER_PRICING.baseTrackingPerDeviceUsd,
    ),
  };

  const overrides = Object.fromEntries(
    Object.entries(asRecord(addonRow?.value)).map(([k, v]) => [k, num(v, NaN)]),
  );
  const modules: AddonModule[] = modulesWithPrices(
    Object.fromEntries(Object.entries(overrides).filter(([, v]) => Number.isFinite(v))),
  );

  return { pricing, modules, live };
}
