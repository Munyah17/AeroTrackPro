/**
 * Fix & supply service catalog — server-side source of truth for amounts.
 * The client sends service keys only; prices are NEVER trusted from the
 * request body.
 */
export const SERVICES = {
  tracking: { name: "GPS tracking (fix & supply)", price: 70 },
  fuel: { name: "Fuel tracking (fix & supply)", price: 350 },
  engine_cutoff: { name: "Remote engine cut-off", price: 100 },
  speed_governor: { name: "Speed governor", price: 180 },
  dashcam: { name: "Dashcam", price: 0 }, // quoted per installation
} as const;

export type ServiceKey = keyof typeof SERVICES;

export const SERVICE_KEYS = Object.keys(SERVICES) as ServiceKey[];

export interface Quote {
  items: { key: ServiceKey; name: string; price: number }[];
  /** Collectable now — quoted items (dashcam) excluded. */
  total: number;
  /** Services priced by quotation rather than a fixed rate. */
  quotedItems: { key: ServiceKey; name: string }[];
}

export function quoteServices(keys: string[]): Quote {
  const items: Quote["items"] = [];
  const quotedItems: Quote["quotedItems"] = [];
  for (const k of keys) {
    const s = SERVICES[k as ServiceKey];
    if (!s) continue;
    if (s.price > 0) items.push({ key: k as ServiceKey, name: s.name, price: s.price });
    else quotedItems.push({ key: k as ServiceKey, name: s.name });
  }
  return { items, total: items.reduce((sum, i) => sum + i.price, 0), quotedItems };
}
