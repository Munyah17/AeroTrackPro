/**
 * Adaptive fuel-anomaly detection for tank-level probes (capacitive,
 * ultrasonic, resistive) and Bluetooth flow meters.
 *
 * A single 8%-jump rule (what Traccar-style pipelines usually ship) misses the
 * two patterns dishonest drivers actually use:
 *
 *   skimming        many small drains (< noise threshold each) spread over a
 *                   stop — siphoned jerry-cans for resale.
 *   abnormal rate   consumption %/h far above the vehicle's learned baseline —
 *                   draining while "driving" with the tap open.
 *
 * This module keeps a tiny per-device model (FuelProfile, persisted on
 * devices.fuel_profile) that learns:
 *
 *   baselinePctH    EWMA of the consumption rate while the vehicle is moving.
 *   devPctH         EWMA of |rate - baseline| — a robust sigma for the vehicle.
 *   noisePct        EWMA of stationary reading deltas — probe noise + sloshing.
 *   skimAccumPct    unexplained stationary drop accumulated over a rolling
 *                   window, so sub-noise drains still trigger.
 *
 * The detector is pure: callers feed each reading and persist the returned
 * profile back onto the device row. Both the native TCP ingest service and the
 * Traccar forwarding route share it so behaviour is identical on both paths.
 */

export interface FuelProfile {
  /** Learned consumption rate while moving, % of tank per hour (EWMA). */
  baselinePctH?: number;
  /** EWMA of |rate - baseline| — dispersion around the baseline, %/h. */
  devPctH?: number;
  /** Learned probe noise amplitude, % (stationary reading jitter). */
  noisePct?: number;
  /** Moving-rate samples used for learning (cold-start guard). */
  samples?: number;
  /** Unexplained stationary drop accumulated in the current skim window, %. */
  skimAccumPct?: number;
  /** ISO timestamp when the current skim window opened. */
  skimSince?: string;
}

export type FuelEventKind = "refill" | "theft" | "consumption";

export interface FuelEvent {
  kind: FuelEventKind;
  /** Which detector fired: refill | rapid-drop | skim | abnormal-rate | flow. */
  reason:
    | "refill"
    | "rapid-drop"
    | "skim"
    | "abnormal-rate"
    | "flow-stationary"
    | "flow";
  /** % of tank lost or gained (absolute value). */
  deltaPct?: number;
  /** Litres from a cumulative flow-meter delta. */
  deltaL?: number;
  levelAfterPct: number | null;
  /** Minutes over which the loss accumulated (skim / abnormal-rate). */
  windowMin?: number;
}

export interface FuelReadingInput {
  /** ISO timestamp of this fix. */
  at: string;
  /** Probe level % (0-100) on this fix, null when the frame carries none. */
  levelPct: number | null;
  /** Previous probe % (devices.last_fuel_level), null on first reading. */
  prevLevelPct: number | null;
  /** ISO timestamp of the previous probe reading (devices.last_fuel_at). */
  prevAt: string | null;
  /** Cumulative flow-meter litres on this fix, null when absent. */
  usedLitres: number | null;
  /** Previous cumulative litres (devices.last_fuel_used_l). */
  prevUsedLitres: number | null;
  speedKmh: number;
  /** ACC state when known — a flow delta with ignition off is never consumption. */
  ignitionOff?: boolean;
  /** Persisted model state, null on first read. */
  profile: FuelProfile | null;
}

export interface FuelAnalysis {
  events: FuelEvent[];
  /** Updated model — persist back to devices.fuel_profile. */
  profile: FuelProfile;
}

/** Probe-level attribute keys seen across protocols (incl. Teltonika BLE io72/io90). */
export const FUEL_LEVEL_KEYS = [
  "fuel",
  "fuel1",
  "fuelLevel",
  "fuel_level",
  "fuelLevel1",
  "io72",
  "io90",
  "can_fuel",
];
/** Cumulative-consumption attribute keys (Bluetooth / CAN flow meters). */
export const FUEL_USED_KEYS = [
  "fuelUsed",
  "fuelConsumption",
  "fuel_used",
  "fuelCounter",
  "totalFuelUsed",
];
/** Absolute tank-volume attribute keys (litres). Used when a probe reports
    volume instead of percent — EUROSENS Dominator "Fuel Frequency" (AVL 306)
    and wired LLS/Modbus routes land here. */
export const FUEL_LEVEL_LITERS_KEYS = [
  "fuelLevelLiters",
  "fuel_level_liters",
  "tankLiters",
  "tank_liters",
  "fuelVolumeLiters",
  "fuel_volume_liters",
];

const STATIONARY_KMH = 3;
/** Skim window: drops older than this stop counting toward one drain. */
const SKIM_WINDOW_MS = 6 * 60 * 60_000;
/** Minimum gap between readings for a reliable %/h rate estimate. */
const MIN_RATE_GAP_MS = 4 * 60_000;
/** Prior consumption rate before learning kicks in — ~10%/h of tank, generous
    for trucks so early false alarms are rare. */
const DEFAULT_BASELINE_PCT_H = 12;
/** Learning only trusts rates below this cap — everything above is anomaly data. */
const MAX_PLAUSIBLE_PCT_H = 30;
const EWMA = 0.15;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function numAttr(attrs: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = attrs[k];
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Tank level % from probe attributes (values outside 0-100 treated as raw — ignored).
    When no percent attribute is present but an absolute litre reading is,
    `capacityLitres` converts it to percent. */
export function fuelLevelPct(
  attrs: Record<string, unknown>,
  capacityLitres?: number | null,
): number | null {
  const v = numAttr(attrs, FUEL_LEVEL_KEYS);
  if (v != null && v >= 0 && v <= 100) return v;
  const litres = fuelLevelLitres(attrs);
  if (litres != null && capacityLitres != null && capacityLitres > 0) {
    const pct = (litres / capacityLitres) * 100;
    return pct >= 0 && pct <= 100 ? pct : null;
  }
  return null;
}

/** Absolute tank volume in litres from probe attributes. */
export function fuelLevelLitres(attrs: Record<string, unknown>): number | null {
  const v = numAttr(attrs, FUEL_LEVEL_LITERS_KEYS);
  return v != null && v >= 0 ? v : null;
}

/** Cumulative litres burned from a flow-meter attribute. */
export function fuelUsedLitres(attrs: Record<string, unknown>): number | null {
  const v = numAttr(attrs, FUEL_USED_KEYS);
  return v != null && v >= 0 ? v : null;
}

/** Coerce an unknown jsonb blob into a FuelProfile. */
export function asFuelProfile(raw: unknown): FuelProfile | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as FuelProfile;
}

/**
 * Analyse one reading. Returns zero or more events plus the updated profile.
 * At most one level event and one flow event fire per reading; theft-style
 * reasons take precedence over consumption.
 */
export function analyzeFuelReading(input: FuelReadingInput): FuelAnalysis {
  const p: FuelProfile = { ...(input.profile ?? {}) };
  const events: FuelEvent[] = [];
  const noise = clamp(p.noisePct ?? 2, 0.5, 8);
  const stationary = input.speedKmh < STATIONARY_KMH;
  const atMs = Date.parse(input.at);
  const prevMs = input.prevAt ? Date.parse(input.prevAt) : NaN;
  const dtMs =
    Number.isFinite(atMs) && Number.isFinite(prevMs) && atMs > prevMs
      ? atMs - prevMs
      : NaN;
  const dtH = Number.isFinite(dtMs) ? dtMs / 3_600_000 : NaN;

  /* Expire an old skim window before accumulating into it. */
  if (
    p.skimSince != null &&
    Number.isFinite(atMs) &&
    atMs - Date.parse(p.skimSince) > SKIM_WINDOW_MS
  ) {
    p.skimAccumPct = 0;
    p.skimSince = undefined;
  }

  /* ------------------------- tank-level probe ------------------------- */
  if (input.levelPct != null && input.prevLevelPct != null) {
    const delta = input.levelPct - input.prevLevelPct;
    const drop = -delta;
    const refillThresh = Math.max(6, noise * 3);
    const theftThresh = Math.max(4, noise * 3);
    const skimThresh = Math.max(3, noise * 2);

    if (delta >= refillThresh) {
      events.push({
        kind: "refill",
        reason: "refill",
        deltaPct: delta,
        levelAfterPct: input.levelPct,
      });
      p.skimAccumPct = 0;
      p.skimSince = undefined;
    } else if (delta >= noise) {
      /* Small unexplained rise — partial refill or slosh. Either way a running
         skim accumulation no longer means anything. */
      p.skimAccumPct = 0;
      p.skimSince = undefined;
    } else if (drop > 0) {
      if (stationary) {
        /* Learn noise from small stationary deltas. */
        if (drop < theftThresh) {
          p.noisePct = clamp(noise * (1 - EWMA) + drop * EWMA, 0.5, 8);
        }
        if (drop >= theftThresh) {
          events.push({
            kind: "theft",
            reason: "rapid-drop",
            deltaPct: drop,
            levelAfterPct: input.levelPct,
          });
          p.skimAccumPct = 0;
          p.skimSince = undefined;
        } else {
          /* Sub-threshold stationary drop — accumulate for skimming. */
          p.skimAccumPct = (p.skimAccumPct ?? 0) + drop;
          if (p.skimSince == null) p.skimSince = input.at;
          if (p.skimAccumPct >= skimThresh) {
            events.push({
              kind: "theft",
              reason: "skim",
              deltaPct: p.skimAccumPct,
              levelAfterPct: input.levelPct,
              windowMin:
                Number.isFinite(dtMs) && p.skimSince
                  ? Math.round((atMs - Date.parse(p.skimSince)) / 60_000)
                  : undefined,
            });
            p.skimAccumPct = 0;
            p.skimSince = undefined;
          }
        }
      } else {
        /* Moving: compare drop rate against the learned baseline. */
        p.skimAccumPct = 0;
        p.skimSince = undefined;
        const baseline = clamp(p.baselinePctH ?? DEFAULT_BASELINE_PCT_H, 2, MAX_PLAUSIBLE_PCT_H);
        const dev = Math.max(p.devPctH ?? baseline * 0.4, 1);
        const anomalyThresh = Math.max(baseline * 3, baseline + 4 * dev, 20);

        if (drop >= theftThresh) {
          /* A big single-jump drop while driving is never normal burn. */
          events.push({
            kind: "theft",
            reason: "rapid-drop",
            deltaPct: drop,
            levelAfterPct: input.levelPct,
          });
        } else if (Number.isFinite(dtH) && dtMs >= MIN_RATE_GAP_MS) {
          const rate = drop / dtH;
          if (rate > anomalyThresh) {
            events.push({
              kind: "theft",
              reason: "abnormal-rate",
              deltaPct: drop,
              levelAfterPct: input.levelPct,
              windowMin: Math.round(dtMs / 60_000),
            });
          } else if (rate <= Math.max(baseline * 2, MAX_PLAUSIBLE_PCT_H)) {
            /* Plausible burn — learn it. */
            p.baselinePctH = baseline * (1 - EWMA) + rate * EWMA;
            p.devPctH = dev * (1 - EWMA) + Math.abs(rate - baseline) * EWMA;
            p.samples = (p.samples ?? 0) + 1;
            if (drop >= Math.max(2, noise)) {
              events.push({
                kind: "consumption",
                reason: "flow",
                deltaPct: drop,
                levelAfterPct: input.levelPct,
              });
            }
          }
          /* Rates between plausible and anomalous are neither learned nor
             reported — ambiguous samples shouldn't poison the baseline. */
        } else if (drop >= Math.max(4, noise * 2)) {
          /* Gap too short for a reliable rate but the drop is real. */
          events.push({
            kind: "consumption",
            reason: "flow",
            deltaPct: drop,
            levelAfterPct: input.levelPct,
          });
        }
      }
    } else if (stationary) {
      /* Flat stationary reading — level unchanged within noise: decay noise
         EWMA slightly toward zero jitter so the model stays honest. */
      p.noisePct = clamp(noise * (1 - EWMA) + Math.abs(delta) * EWMA, 0.5, 8);
    }
  }

  /* ------------------------- flow meter ------------------------- */
  if (input.usedLitres != null && input.prevUsedLitres != null) {
    const deltaL = input.usedLitres - input.prevUsedLitres;
    if (deltaL > 0) {
      if (stationary && input.ignitionOff) {
        events.push({
          kind: "theft",
          reason: "flow-stationary",
          deltaL,
          levelAfterPct: input.levelPct,
        });
      } else {
        events.push({
          kind: "consumption",
          reason: "flow",
          deltaL,
          levelAfterPct: input.levelPct,
        });
      }
    }
  }

  return { events, profile: p };
}
