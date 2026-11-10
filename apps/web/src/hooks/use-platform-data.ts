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

/** Platform-owner quotations (super-admin RLS; not tenant-scoped). */
export const useQuotations = () =>
  useTenantTable("quotations", {
    map: toQuotation,
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
