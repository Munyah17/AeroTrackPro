import {
  BadgeDollarSign,
  Bell,
  Building2,
  Car,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Navigation,
  Palette,
  PanelsTopLeft,
  Radio,
  Receipt,
  Route,
  Settings,
  Smartphone,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { ADMIN_NAV, FLEET_NAV, type NavSection } from "./nav";

/**
 * Account tiers.
 *  - super_admin: Master Admin (the founder). Platform portal, plus the
 *    reseller portal and corporate fleet management.
 *  - reseller: sells vehicle tracking. Admin dashboard only — clients,
 *    devices, billing, branding. No fleet-management console unless delegated.
 *  - user: the end customer. Live tracking for the vehicles assigned to them.
 *
 * Corporate fleet management (fuel, drivers, maintenance, insurance, reports,
 * geofences, commands) is a partnership product. Master Admin always has it.
 * Everyone else needs an explicit grant from Master Admin.
 */
export type Role = "super_admin" | "reseller" | "user";

/** Which surface the sidebar is showing. */
export type Portal = "master" | "reseller" | "fleet" | "tracking";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Master Admin",
  reseller: "Reseller",
  user: "User",
};

/** Display identity for the demo account switcher. */
export const ROLE_IDENTITY: Record<Role, { name: string; initials: string }> = {
  super_admin: { name: "Munya M.", initials: "MM" },
  reseller: { name: "Tariro N.", initials: "TN" },
  user: { name: "Alex Moyo", initials: "AM" },
};

export const MASTER_NAV = ADMIN_NAV;

/** Reseller portal — an admin dashboard for a tracking business. */
export const RESELLER_NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/reseller", icon: LayoutDashboard },
      { label: "My Clients", href: "/reseller/clients", icon: Building2 },
      { label: "Devices", href: "/reseller/devices", icon: Radio },
      { label: "Live Tracking", href: "/tracking", icon: Navigation },
    ],
  },
  {
    label: "Commercial",
    items: [
      { label: "Billing", href: "/reseller/billing", icon: Wallet },
      { label: "Invoices", href: "/reseller/invoices", icon: Receipt },
      { label: "Add-on Features", href: "/reseller/features", icon: BadgeDollarSign },
    ],
  },
  {
    label: "White Label",
    items: [
      { label: "Branding", href: "/reseller/branding", icon: Palette },
      { label: "Login Page", href: "/reseller/login-page", icon: Smartphone },
      { label: "Landing Pages", href: "/reseller/landing", icon: PanelsTopLeft },
      { label: "Domains", href: "/reseller/domains", icon: Globe },
      { label: "SMS Gateway", href: "/reseller/sms", icon: MessageSquare },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Team", href: "/reseller/team", icon: Users },
      { label: "Support", href: "/reseller/support", icon: LifeBuoy },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

/** End-user portal — live tracking and the history that belongs with it. */
export const USER_NAV: NavSection[] = [
  {
    items: [
      { label: "Live Tracking", href: "/tracking", icon: Navigation },
      { label: "My Vehicles", href: "/vehicles", icon: Car },
      { label: "Trip History", href: "/trips", icon: Route },
      { label: "Fleet Management", href: "/fleet", icon: Wrench },
      { label: "Alerts", href: "/alerts", icon: Bell },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

/** Corporate fleet-management console. Gated. */
export const FLEET_PORTAL_NAV = FLEET_NAV;

const FLEET_PREFIXES = [
  "/dashboard",
  "/geofences",
  "/drivers",
  "/fuel",
  "/maintenance",
  "/insurance",
  "/reports",
  "/behavior",
  "/device-health",
  "/devices",
  "/assets",
  "/commands",
];

const TRACKING_PREFIXES = ["/tracking", "/vehicles", "/trips", "/alerts", "/fleet"];

const WORKSPACE_SETTINGS = [
  "/settings/general",
  "/settings/users",
  "/settings/api",
  "/settings/subscription",
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isFleetPath(pathname: string) {
  return FLEET_PREFIXES.some((prefix) => matches(pathname, prefix));
}

export function isRole(value: string | null): value is Role {
  return value === "super_admin" || value === "reseller" || value === "user";
}

export function isPortal(value: string | null): value is Portal {
  return value === "master" || value === "reseller" || value === "fleet" || value === "tracking";
}

/** Older builds stored the end-user tier as "client". */
export function normalizeRole(value: string | null): Role {
  if (value === "client") return "user";
  if (isRole(value)) return value;
  return "super_admin";
}

export function defaultPortal(role: Role): Portal {
  if (role === "super_admin") return "master";
  if (role === "reseller") return "reseller";
  return "tracking";
}

export function hasFleetAccess(role: Role, delegated: boolean) {
  return role === "super_admin" || delegated;
}

export function navFor(role: Role, portal: Portal, fleetAccess: boolean): NavSection[] {
  if (role === "super_admin") {
    if (portal === "fleet") return FLEET_PORTAL_NAV;
    if (portal === "reseller") return RESELLER_NAV;
    return MASTER_NAV;
  }
  if (portal === "fleet" && fleetAccess) return FLEET_PORTAL_NAV;
  if (role === "reseller") return RESELLER_NAV;
  return USER_NAV;
}

export interface PortalLink {
  portal: Portal;
  href: string;
  label: string;
}

/** Portals this account is allowed to move between. */
export function portalLinks(role: Role, fleetAccess: boolean): PortalLink[] {
  if (role === "super_admin") {
    return [
      { portal: "master", href: "/admin", label: "Master Admin" },
      { portal: "reseller", href: "/reseller", label: "Reseller Portal" },
      { portal: "fleet", href: "/dashboard", label: "Fleet Management" },
    ];
  }
  if (!fleetAccess) return [];
  if (role === "reseller") {
    return [
      { portal: "reseller", href: "/reseller", label: "Reseller Portal" },
      { portal: "fleet", href: "/dashboard", label: "Fleet Management" },
    ];
  }
  return [
    { portal: "tracking", href: "/tracking", label: "Live Tracking" },
    { portal: "fleet", href: "/dashboard", label: "Fleet Management" },
  ];
}

export function canSwitchPortal(role: Role, fleetAccess: boolean) {
  return portalLinks(role, fleetAccess).length > 1;
}

export function surfaceLabel(role: Role, portal: Portal) {
  if (portal === "fleet") return "Fleet Management";
  if (role === "super_admin") return "Master Admin";
  if (role === "reseller") return "Reseller Portal";
  return "Live Tracking";
}

export function homeFor(role: Role, portal: Portal, fleetAccess: boolean) {
  if (role === "super_admin") {
    if (portal === "reseller") return "/reseller";
    if (portal === "fleet") return "/dashboard";
    return "/admin";
  }
  if (role === "reseller") {
    return portal === "fleet" && fleetAccess ? "/dashboard" : "/reseller";
  }
  return portal === "fleet" && fleetAccess ? "/dashboard" : "/tracking";
}

/** Whether this account may open the path. Master Admin is never blocked. */
export function canVisit(pathname: string, role: Role, fleetAccess: boolean) {
  if (role === "super_admin") return true;
  if (pathname.startsWith("/admin")) return false;
  if (isFleetPath(pathname)) return fleetAccess;
  if (matches(pathname, "/reseller")) return role === "reseller";
  if (TRACKING_PREFIXES.some((prefix) => matches(pathname, prefix))) return true;
  if (pathname === "/settings" || matches(pathname, "/settings/profile") || matches(pathname, "/settings/notifications")) {
    return true;
  }
  if (WORKSPACE_SETTINGS.some((prefix) => matches(pathname, prefix))) {
    return role === "reseller" || fleetAccess;
  }
  return false;
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/reseller" || href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
