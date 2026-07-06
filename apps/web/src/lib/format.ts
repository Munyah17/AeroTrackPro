import { formatDistanceToNowStrict, format } from "date-fns";

export function timeAgo(isoDate: string): string {
  return formatDistanceToNowStrict(new Date(isoDate), { addSuffix: true });
}

export function shortDate(isoDate: string): string {
  return format(new Date(isoDate), "MMM d, yyyy");
}

export function shortDateTime(isoDate: string): string {
  return format(new Date(isoDate), "MMM d, HH:mm");
}

export function timeOnly(isoDate: string): string {
  return format(new Date(isoDate), "HH:mm");
}

export function km(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;
}

export function kmh(value: number): string {
  return `${Math.round(value)} km/h`;
}

export function usd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function pct(value: number): string {
  return `${Math.round(value)}%`;
}

export function coords(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** External map links — no SDKs, no billing, just deep links. */
export const mapLinks = {
  google: (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`,
  waze: (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  apple: (lat: number, lng: number) => `https://maps.apple.com/?ll=${lat},${lng}&q=Tracked%20Location`,
};
