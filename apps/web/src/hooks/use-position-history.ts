"use client";

import { useEffect, useState } from "react";
import type { Database } from "@aerotrack/shared";

export type PositionRow = Database["public"]["Tables"]["positions"]["Row"];

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/**
 * Fetches a vehicle's recorded positions for a trailing time window,
 * oldest → newest, capped at 5000 fixes. `rangeMs = 0` disables the query.
 */
export function usePositionHistory(vehicleId: string | undefined, rangeMs: number) {
  const [points, setPoints] = useState<PositionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicleId || !rangeMs || !isConfigured) {
      setPoints([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const from = new Date(Date.now() - rangeMs).toISOString();
    void import("@/lib/supabase")
      .then(({ supabase }) =>
        supabase
          .from("positions")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .gte("recorded_at", from)
          .order("recorded_at", { ascending: true })
          .limit(5000),
      )
      .then(({ data }) => {
        if (cancelled) return;
        setPoints(data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleId, rangeMs]);

  return { points, loading };
}
