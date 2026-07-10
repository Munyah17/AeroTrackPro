import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Building2,
  Car,
  CreditCard,
  Database,
  Droplets,
  FileText,
  Fuel,
  Gauge,
  Globe,
  HardDrive,
  Hexagon,
  History,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  Mail,
  Map,
  MapPin,
  Megaphone,
  MessageSquare,
  Navigation,
  Package,
  Palette,
  PawPrint,
  Radio,
  Route,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Users,
  UserCog,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

/** Fleet application navigation (tracking-company customer view). */
export const FLEET_NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Live Tracking", href: "/tracking", icon: Navigation },
      { label: "Vehicles", href: "/vehicles", icon: Car },
      { label: "Trips", href: "/trips", icon: Route },
      { label: "Alerts", href: "/alerts", icon: Bell, badge: 7 },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Geofences", href: "/geofences", icon: Hexagon },
      { label: "Drivers", href: "/drivers", icon: Users },
      { label: "Maintenance", href: "/maintenance", icon: Wrench },
      { label: "Fuel", href: "/fuel", icon: Fuel },
      { label: "Insurance", href: "/insurance", icon: ShieldCheck },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Telematics",
    items: [
      { label: "Driving Behavior", href: "/behavior", icon: Gauge },
      { label: "Device Health", href: "/device-health", icon: Activity },
      { label: "Devices", href: "/devices", icon: Radio },
      { label: "Assets & Personal", href: "/assets", icon: PawPrint },
      { label: "Commands", href: "/commands", icon: Lock },
    ],
  },
  {
    label: "Workspace",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

/** White-label admin navigation (tracking-company owner view). */
export const ADMIN_NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Organizations", href: "/admin/organizations", icon: Building2 },
      { label: "Sub-Accounts", href: "/admin/sub-accounts", icon: Users },
    ],
  },
  {
    label: "White Label",
    items: [
      { label: "Branding", href: "/admin/branding", icon: Palette },
      { label: "Login Page", href: "/admin/login-page", icon: Smartphone },
      { label: "Domains", href: "/admin/domains", icon: Globe },
      { label: "Email Templates", href: "/admin/email-templates", icon: Mail },
      { label: "SMS Gateway", href: "/admin/sms-gateway", icon: MessageSquare },
    ],
  },
  {
    label: "Commercial",
    items: [
      { label: "Plans", href: "/admin/plans", icon: BadgeDollarSign },
      { label: "Licenses", href: "/admin/licenses", icon: KeyRound },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Billing", href: "/admin/billing", icon: Wallet },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Devices", href: "/admin/devices", icon: Radio },
      { label: "Device Groups", href: "/admin/device-groups", icon: Package },
      { label: "Users", href: "/admin/users", icon: UserCog },
      { label: "Roles & Permissions", href: "/admin/roles", icon: Shield },
      { label: "API & Integration", href: "/admin/api", icon: Database },
      { label: "Activity Logs", href: "/admin/activity", icon: History },
      { label: "Support Tickets", href: "/admin/tickets", icon: LifeBuoy },
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { label: "Backup & Restore", href: "/admin/backup", icon: HardDrive },
      { label: "System Settings", href: "/admin/system", icon: Settings },
    ],
  },
];

export const NAV_META: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Here's what's happening with your fleet today" },
  "/tracking": { title: "Live Tracking" },
  "/vehicles": { title: "Vehicles", subtitle: "View and manage all vehicles in your fleet" },
  "/trips": { title: "Trip History", subtitle: "Routes, duration and distance for every trip" },
  "/alerts": { title: "Alerts", subtitle: "Monitor alerts and notifications in real time" },
  "/geofences": { title: "Geofences", subtitle: "Create and manage zones to monitor movement" },
  "/drivers": { title: "Drivers", subtitle: "Manage drivers and vehicle assignments" },
  "/maintenance": { title: "Maintenance", subtitle: "Schedules, alerts and service history" },
  "/fuel": { title: "Fuel Monitoring", subtitle: "Levels, consumption, refills and theft detection" },
  "/insurance": { title: "Insurance", subtitle: "Policies, expiry alerts and marketplace" },
  "/reports": { title: "Reports", subtitle: "Generate detailed reports on your fleet" },
  "/behavior": { title: "Driving Behavior", subtitle: "Scoring, events and risk analysis" },
  "/device-health": { title: "Device Health", subtitle: "Connectivity, battery and SIM status" },
  "/devices": { title: "Devices", subtitle: "Tracking hardware, binding and configuration" },
  "/assets": { title: "Assets & Personal", subtitle: "Pets, kids, parcels, livestock and equipment" },
  "/commands": { title: "Remote Commands", subtitle: "Immobilization and device control" },
  "/settings": { title: "Settings" },
  "/admin": { title: "Platform Overview" },
  "/admin/organizations": { title: "Organizations", subtitle: "Manage client organizations on the platform" },
  "/admin/sub-accounts": { title: "Sub-Accounts" },
  "/admin/branding": { title: "White Label Branding" },
  "/admin/login-page": { title: "Login Page Customization" },
  "/admin/domains": { title: "Domain Management" },
  "/admin/email-templates": { title: "Email Templates" },
  "/admin/sms-gateway": { title: "SMS Gateway" },
  "/admin/plans": { title: "Plans & Billing" },
  "/admin/licenses": { title: "License Management" },
  "/admin/payments": { title: "Payment History" },
  "/admin/billing": { title: "Billing" },
  "/admin/devices": { title: "Device Management" },
  "/admin/device-groups": { title: "Device Groups" },
  "/admin/users": { title: "User Management" },
  "/admin/roles": { title: "Roles & Permissions" },
  "/admin/api": { title: "API & Integration" },
  "/admin/activity": { title: "Activity Logs" },
  "/admin/tickets": { title: "Support Tickets" },
  "/admin/announcements": { title: "Announcements" },
  "/admin/backup": { title: "Backup & Restore" },
  "/admin/system": { title: "System Settings" },
};

export { Map, MapPin, AlertTriangle, Droplets, FileText };
