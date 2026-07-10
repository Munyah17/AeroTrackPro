import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Building2,
  Car,
  CreditCard,
  Database,
  Fuel,
  Gauge,
  Globe,
  Hexagon,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  Mail,
  Navigation,
  Package,
  Palette,
  Radio,
  Receipt,
  Route,
  Settings,
  Shield,
  ShieldCheck,
  Ticket,
  Users,
  UserCog,
  Wallet,
  Wrench,
} from "lucide-react";
import { ADMIN_NAV, FLEET_NAV, type NavSection } from "./nav";

/**
 * The three account tiers.
 *  - super_admin: platform owner (us). Master platform portal + the ability
 *    to switch into a Reseller portal (we also resell). Only this role can
 *    switch portals.
 *  - reseller: GPS tracking service providers. Manage their own clients and
 *    devices, view all their clients' devices in tracking, see what they owe
 *    the platform.
 *  - client: end customer. Tracking dashboard only, scoped to devices
 *    assigned to them.
 */
export type Role = "super_admin" | "reseller" | "client";

/** Which portal surface a super_admin is currently viewing. */
export type Portal = "master" | "reseller";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Platform Owner",
  reseller: "Reseller",
  client: "Client",
};

/** Master (platform owner) portal — the existing full admin surface. */
export const MASTER_NAV = ADMIN_NAV;

/** Reseller portal — manage their downline of clients, devices and billing. */
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
    label: "Workspace",
    items: [
      { label: "Branding", href: "/reseller/branding", icon: Palette },
      { label: "Team", href: "/reseller/team", icon: Users },
      { label: "Support", href: "/reseller/support", icon: LifeBuoy },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

/** Client portal — tracking and fleet operations for their own vehicles. */
export const CLIENT_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Live Tracking", href: "/tracking", icon: Navigation },
      { label: "Vehicles", href: "/vehicles", icon: Car },
      { label: "Trips", href: "/trips", icon: Route },
      { label: "Alerts", href: "/alerts", icon: Bell },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Geofences", href: "/geofences", icon: Hexagon },
      { label: "Drivers", href: "/drivers", icon: Users },
      { label: "Fuel & Coupons", href: "/fuel", icon: Fuel },
      { label: "Maintenance", href: "/maintenance", icon: Wrench },
      { label: "Insurance", href: "/insurance", icon: ShieldCheck },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Telematics",
    items: [
      { label: "Driving Behavior", href: "/behavior", icon: Gauge },
      { label: "Device Health", href: "/device-health", icon: Activity },
      { label: "Commands", href: "/commands", icon: Lock },
    ],
  },
  {
    label: "Workspace",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

/** Resolve which nav a user sees, given role + (for super_admin) active portal. */
export function navFor(role: Role, portal: Portal): NavSection[] {
  if (role === "super_admin") return portal === "master" ? MASTER_NAV : RESELLER_NAV;
  if (role === "reseller") return RESELLER_NAV;
  return CLIENT_NAV;
}

/** Only the platform owner may switch portals. */
export function canSwitchPortal(role: Role): boolean {
  return role === "super_admin";
}

// Re-export icons used elsewhere to keep a single import surface.
export {
  BadgeDollarSign,
  Building2,
  CreditCard,
  Database,
  Globe,
  KeyRound,
  Mail,
  Package,
  Shield,
  Ticket,
  UserCog,
  FLEET_NAV,
};
