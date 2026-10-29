/**
 * Corporate fleet-management grants.
 * Stored locally for the demo switcher. A production login would read the
 * same shape from the signed-in user's row.
 */
export interface FleetDelegate {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: "reseller" | "user";
  grantedAt: string;
}

export const FLEET_DELEGATES_KEY = "at-fleet-delegates";
export const ACTIVE_DELEGATE_KEY = "at-delegate";

export function readDelegates(): FleetDelegate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FLEET_DELEGATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FleetDelegate[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d) =>
        !!d &&
        typeof d.id === "string" &&
        typeof d.email === "string" &&
        (d.role === "reseller" || d.role === "user"),
    );
  } catch {
    return [];
  }
}

export function writeDelegates(list: FleetDelegate[]) {
  localStorage.setItem(FLEET_DELEGATES_KEY, JSON.stringify(list));
}
