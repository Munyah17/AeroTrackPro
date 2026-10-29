"use client";

import { useMemo } from "react";
import { Gauge, Leaf, TrendingUp } from "lucide-react";
import { useDriverEvents, useDrivers } from "@/hooks/use-live-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { km } from "@/lib/format";

/**
 * Eco Driving — per-driver scorecard. Behavior score from the drivers table;
 * harsh event counts and speed violations aggregated from driver_events.
 */
const RISK_TONE = { low: "success", medium: "warning", high: "danger" } as const;
const HARSH = new Set(["harsh_brake", "harsh_accel", "harsh_corner", "idle"]);

export default function FleetEcoPage() {
  const { rows: drivers } = useDrivers();
  const { rows: events } = useDriverEvents();

  const cards = useMemo(() => {
    const byDriver = new Map<string, { harsh: number; overspeed: number; total: number }>();
    for (const e of events) {
      if (!e.driverId) continue;
      const agg = byDriver.get(e.driverId) ?? { harsh: 0, overspeed: 0, total: 0 };
      agg.total += 1;
      if (HARSH.has(e.type)) agg.harsh += 1;
      if (e.type === "overspeed") agg.overspeed += 1;
      byDriver.set(e.driverId, agg);
    }
    return drivers
      .map((d) => {
        const agg = byDriver.get(d.id) ?? { harsh: 0, overspeed: 0, total: 0 };
        const perTrip = d.tripsThisMonth > 0 ? agg.harsh / d.tripsThisMonth : agg.harsh;
        // Eco score: base behavior score, docked for harsh-event density.
        const score = Math.max(0, Math.min(100, Math.round(d.behaviorScore - perTrip * 2)));
        return { driver: d, ...agg, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [drivers, events]);

  const fleetAvg = cards.length ? Math.round(cards.reduce((s, c) => s + c.score, 0) / cards.length) : 0;

  return (
    <PageContainer>
      <PageHeader
        title="Eco Driving"
        subtitle="Driver efficiency and safety scorecards"
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Panel className="flex items-center gap-3.5 p-5">
          <span className="grid size-11 place-items-center rounded-xl bg-success/10 text-success">
            <Leaf className="size-5" />
          </span>
          <div>
            <div className="text-[22px] font-bold tabular-nums">{fleetAvg}</div>
            <div className="text-[11.5px] text-muted-foreground">Fleet eco score</div>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3.5 p-5">
          <span className="grid size-11 place-items-center rounded-xl bg-warning/10 text-warning">
            <Gauge className="size-5" />
          </span>
          <div>
            <div className="text-[22px] font-bold tabular-nums">
              {cards.reduce((s, c) => s + c.harsh, 0)}
            </div>
            <div className="text-[11.5px] text-muted-foreground">Harsh events (all drivers)</div>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3.5 p-5">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <div className="text-[22px] font-bold tabular-nums">
              {cards[0]?.driver.name.split(" ")[0] ?? "—"}
            </div>
            <div className="text-[11.5px] text-muted-foreground">Top driver this period</div>
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border/60 bg-accent/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3">Rank</th>
              <th className="px-5 py-3">Driver</th>
              <th className="px-5 py-3">Eco score</th>
              <th className="px-5 py-3">Harsh events</th>
              <th className="px-5 py-3">Overspeed</th>
              <th className="px-5 py-3">Trips / month</th>
              <th className="px-5 py-3">Distance</th>
              <th className="px-5 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {cards.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                  No driver data yet
                </td>
              </tr>
            )}
            {cards.map((c, i) => (
              <tr key={c.driver.id} className="transition-colors hover:bg-accent/30">
                <td className="px-5 py-3 font-semibold tabular-nums">{i + 1}</td>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-2.5 font-medium">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                        {c.driver.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    {c.driver.name}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <Progress value={c.score} className="h-2 w-20" />
                    <span className="font-semibold tabular-nums">{c.score}</span>
                  </div>
                </td>
                <td className="px-5 py-3 tabular-nums">{c.harsh}</td>
                <td className="px-5 py-3 tabular-nums">{c.overspeed}</td>
                <td className="px-5 py-3 tabular-nums">{c.driver.tripsThisMonth}</td>
                <td className="px-5 py-3 tabular-nums">{km(c.driver.distanceThisMonthKm)}</td>
                <td className="px-5 py-3">
                  <Pill tone={RISK_TONE[c.driver.riskLevel]}>{c.driver.riskLevel}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PageContainer>
  );
}
