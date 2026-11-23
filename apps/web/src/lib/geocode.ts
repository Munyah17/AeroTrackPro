"use client";

import { useEffect, useState } from "react";

/**
 * Client-side reverse geocoding for live-tracking summaries.
 *
 * Place names come from BigDataCloud's free reverse-geocode endpoint (no API
 * key, CORS-enabled, built for browser use). Results are cached per ~11 m
 * grid cell so a fleet of vehicles doesn't hammer the API — place names
 * change slowly, so a stale-by-minutes label is fine for a summary card.
 * Raw coordinates stay available on detail pages; summaries show words.
 */

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function cellKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

async function fetchPlaceName(lat: number, lng: number): Promise<string | null> {
  const k = cellKey(lat, lng);
  const hit = cache.get(k);
  if (hit) return hit;

  let p = inflight.get(k);
  if (!p) {
    p = (async () => {
      try {
        const url =
          `https://api.bigdatacloud.net/data/reverse-geocode-client` +
          `?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const d = (await res.json()) as {
          locality?: string;
          city?: string;
          principalSubdivision?: string;
          countryName?: string;
        };
        const name =
          [d.locality, d.city, d.principalSubdivision, d.countryName]
            .filter(Boolean)
            .join(", ") || null;
        if (name) cache.set(k, name);
        return name;
      } catch {
        return null;
      }
    })();
    inflight.set(k, p);
    void p.finally(() => inflight.delete(k));
  }
  return p;
}

/** Place name for a coordinate, or null while loading / on failure. */
export function usePlaceName(lat: number, lng: number): string | null {
  const [name, setName] = useState<string | null>(() =>
    lat === 0 && lng === 0 ? null : (cache.get(cellKey(lat, lng)) ?? null),
  );

  useEffect(() => {
    if (lat === 0 && lng === 0) {
      setName(null);
      return;
    }
    let alive = true;
    void fetchPlaceName(lat, lng).then((n) => {
      if (alive) setName(n);
    });
    return () => {
      alive = false;
    };
  }, [lat, lng]);

  return name;
}
