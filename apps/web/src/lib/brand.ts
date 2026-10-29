/**
 * Reseller white-label brand, stored in this browser the same way the demo
 * role switcher is. A production tenant resolves the same shape from the
 * request host (custom domain or {slug}.aerotrack.app).
 */

export const BRAND_KEY = "at-brand";
export const PLATFORM_NAME = "AeroTrack Pro";
export const PLATFORM_PRIMARY = "#1E40FF";
export const EDGE_HOST = "edge.aerotrack.app";

export type LandingTemplateId =
  | "fleet-command"
  | "tracker-store"
  | "operations-desk"
  | "simple-sign-in";

export type DomainStatus = "pending" | "active";

export interface CustomDomain {
  host: string;
  status: DomainStatus;
  ssl: "pending" | "valid";
  addedAt: string;
}

export type SmsProvider = "twilio" | "africastalking" | "econet" | "smsportal";

export interface SmsGateway {
  id: string;
  provider: SmsProvider;
  name: string;
  senderId: string;
  apiKey: string;
  active: boolean;
  isDefault: boolean;
}

export interface LoginStyle {
  welcome: string;
  subtitle: string;
  headline: string;
  backgroundDataUrl: string | null;
  layout: "split" | "centered";
  showPoweredBy: boolean;
  allowPasswordReset: boolean;
}

export interface BrandConfig {
  name: string;
  tagline: string;
  primary: string;
  logoDataUrl: string | null;
  faviconDataUrl: string | null;
  slug: string;
  domains: CustomDomain[];
  login: LoginStyle;
  template: LandingTemplateId;
  sms: SmsGateway[];
}

export const SMS_PROVIDERS: { id: SmsProvider; label: string }[] = [
  { id: "twilio", label: "Twilio" },
  { id: "africastalking", label: "Africa's Talking" },
  { id: "econet", label: "Econet Bulk SMS" },
  { id: "smsportal", label: "SMSPortal" },
];

export const LANDING_TEMPLATES: { id: LandingTemplateId; name: string; blurb: string }[] = [
  {
    id: "fleet-command",
    name: "Fleet Command",
    blurb: "Dark operations hero for logistics companies and fleet managers.",
  },
  {
    id: "tracker-store",
    name: "Tracker Store",
    blurb: "A shop-style page for selling trackers to drivers and families.",
  },
  {
    id: "operations-desk",
    name: "Operations Desk",
    blurb: "Light desk layout with live stats and the jobs your clients run.",
  },
  {
    id: "simple-sign-in",
    name: "Simple Sign-in",
    blurb: "A short pitch beside a sign-in card. The usual GPS portal home.",
  },
];

const TEMPLATE_IDS = new Set<string>(LANDING_TEMPLATES.map((t) => t.id));
const SMS_IDS = new Set<string>(SMS_PROVIDERS.map((p) => p.id));

export const DEFAULT_LOGIN: LoginStyle = {
  welcome: "Welcome back",
  subtitle: "Sign in to your fleet console",
  headline: "Know where every vehicle is. Always.",
  backgroundDataUrl: null,
  layout: "split",
  showPoweredBy: false,
  allowPasswordReset: true,
};

export const DEFAULT_BRAND: BrandConfig = {
  name: PLATFORM_NAME,
  tagline: "GPS Tracking · Fleet · Telematics",
  primary: PLATFORM_PRIMARY,
  logoDataUrl: null,
  faviconDataUrl: null,
  slug: "track",
  domains: [],
  login: DEFAULT_LOGIN,
  template: "fleet-command",
  sms: [],
};

export function normalizeHex(value: string): string | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match) return null;
  return `#${match[1].toUpperCase()}`;
}

export function isCustomColor(hex: string) {
  return normalizeHex(hex) !== PLATFORM_PRIMARY;
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "track";
}

export function isHostname(value: string) {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(value.trim());
}

export function subdomainHost(slug: string) {
  return `${slugify(slug)}.aerotrack.app`;
}

export function providerLabel(id: SmsProvider) {
  return SMS_PROVIDERS.find((p) => p.id === id)?.label ?? id;
}

export function defaultSms(brand: BrandConfig) {
  return brand.sms.find((gateway) => gateway.isDefault && gateway.active) ?? null;
}

export function maskSecret(value: string) {
  if (!value) return "Not set";
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

function cleanText(value: unknown, fallback: string, max: number) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, max);
  return trimmed || fallback;
}

function isDataImage(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/") && value.length < 1_200_000;
}

function hexToRgb(hex: string) {
  const n = hex.replace("#", "");
  return {
    r: Number.parseInt(n.slice(0, 2), 16),
    g: Number.parseInt(n.slice(2, 4), 16),
    b: Number.parseInt(n.slice(4, 6), 16),
  };
}

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function darken(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const scale = 1 - amount;
  const to = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c * scale)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Sidebar ink. Light brand colors are pulled further down so white type stays readable. */
export function sidebarColor(hex: string) {
  return darken(hex, luminance(hex) > 0.4 ? 0.72 : 0.46);
}

const THEME_PROPS = [
  "--primary",
  "--sidebar",
  "--sidebar-accent",
  "--sidebar-border",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--ring",
  "--sidebar-ring",
] as const;

export function clearBrandTheme() {
  const root = document.documentElement;
  for (const prop of THEME_PROPS) root.style.removeProperty(prop);
}

export function applyBrandTheme(brand: BrandConfig) {
  if (!isCustomColor(brand.primary)) {
    clearBrandTheme();
    return;
  }
  const side = sidebarColor(brand.primary);
  const accent = darken(brand.primary, luminance(brand.primary) > 0.4 ? 0.55 : 0.28);
  const root = document.documentElement;
  root.style.setProperty("--primary", brand.primary);
  root.style.setProperty("--sidebar", side);
  root.style.setProperty("--sidebar-accent", accent);
  root.style.setProperty("--sidebar-border", `${side}99`);
  root.style.setProperty("--sidebar-primary", "#ffffff");
  root.style.setProperty("--sidebar-primary-foreground", side);
  root.style.setProperty("--ring", brand.primary);
  root.style.setProperty("--sidebar-ring", brand.primary);
}

const FAVICON_ID = "at-brand-favicon";

export function applyFavicon(dataUrl: string | null) {
  const existing = document.getElementById(FAVICON_ID);
  if (!dataUrl) {
    existing?.remove();
    return;
  }
  const link = existing instanceof HTMLLinkElement ? existing : document.createElement("link");
  link.id = FAVICON_ID;
  link.rel = "icon";
  link.href = dataUrl;
  if (!existing) document.head.appendChild(link);
}

/** Marketing home and the fuel-coupon desk stay on the platform brand. */
export function isPlatformSurface(pathname: string) {
  return pathname === "/" || pathname.startsWith("/redeem");
}

function normalizeDomain(value: Partial<CustomDomain>): CustomDomain | null {
  if (typeof value.host !== "string" || !isHostname(value.host)) return null;
  const host = value.host.trim().toLowerCase();
  if (host === "aerotrack.app" || host.endsWith(".aerotrack.app")) return null;
  return {
    host,
    status: value.status === "active" ? "active" : "pending",
    ssl: value.ssl === "valid" ? "valid" : "pending",
    addedAt: typeof value.addedAt === "string" ? value.addedAt : new Date(0).toISOString(),
  };
}

function normalizeGateway(value: Partial<SmsGateway>, index: number): SmsGateway | null {
  if (typeof value.senderId !== "string" || !value.senderId.trim()) return null;
  const provider = SMS_IDS.has(String(value.provider)) ? (value.provider as SmsProvider) : "twilio";
  return {
    id: typeof value.id === "string" && value.id ? value.id : `sms-${index}`,
    provider,
    name: cleanText(value.name, providerLabel(provider), 40),
    senderId: value.senderId.trim().slice(0, 11),
    apiKey: typeof value.apiKey === "string" ? value.apiKey.slice(0, 128) : "",
    active: value.active !== false,
    isDefault: !!value.isDefault,
  };
}

export function normalizeBrand(input: Partial<BrandConfig> | null | undefined): BrandConfig {
  const login = input?.login;
  const domains = Array.isArray(input?.domains)
    ? input.domains
        .map((domain) => normalizeDomain(domain))
        .filter((domain): domain is CustomDomain => !!domain)
    : [];
  const sms = Array.isArray(input?.sms)
    ? input.sms
        .map((gateway, index) => normalizeGateway(gateway, index))
        .filter((gateway): gateway is SmsGateway => !!gateway)
    : [];
  const defaultIndex = sms.findIndex((gateway) => gateway.isDefault);
  const gateways = sms.map((gateway, index) => ({
    ...gateway,
    isDefault: defaultIndex === -1 ? index === 0 : index === defaultIndex,
  }));

  return {
    name: cleanText(input?.name, DEFAULT_BRAND.name, 48),
    tagline: cleanText(input?.tagline, DEFAULT_BRAND.tagline, 80),
    primary: normalizeHex(typeof input?.primary === "string" ? input.primary : "") ?? DEFAULT_BRAND.primary,
    logoDataUrl: isDataImage(input?.logoDataUrl) ? input.logoDataUrl : null,
    faviconDataUrl: isDataImage(input?.faviconDataUrl) ? input.faviconDataUrl : null,
    slug: slugify(typeof input?.slug === "string" ? input.slug : DEFAULT_BRAND.slug),
    domains,
    login: {
      welcome: cleanText(login?.welcome, DEFAULT_LOGIN.welcome, 60),
      subtitle: cleanText(login?.subtitle, DEFAULT_LOGIN.subtitle, 90),
      headline: cleanText(login?.headline, DEFAULT_LOGIN.headline, 100),
      backgroundDataUrl: isDataImage(login?.backgroundDataUrl) ? login.backgroundDataUrl : null,
      layout: login?.layout === "centered" ? "centered" : "split",
      showPoweredBy: !!login?.showPoweredBy,
      allowPasswordReset: login?.allowPasswordReset !== false,
    },
    template: TEMPLATE_IDS.has(String(input?.template))
      ? (input?.template as LandingTemplateId)
      : DEFAULT_BRAND.template,
    sms: gateways,
  };
}

export function readBrand(): BrandConfig {
  try {
    const raw = localStorage.getItem(BRAND_KEY);
    if (!raw) return DEFAULT_BRAND;
    return normalizeBrand(JSON.parse(raw) as Partial<BrandConfig>);
  } catch {
    return DEFAULT_BRAND;
  }
}

export function writeBrand(brand: BrandConfig) {
  localStorage.setItem(BRAND_KEY, JSON.stringify(normalizeBrand(brand)));
}
