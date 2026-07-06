"use client";

import { Gauge, Route, TrendingUp, TriangleAlert } from "lucide-react";
import { drivers, trips, vehicleById, driverById } from "@aerotrack/shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { km, kmh, shortDateTime } from "@/lib/format";

const BREAKDOWN = [
  { label: "Speeding", value: 20 },
  { label: "Harsh Acceleration", value: 30 },
  { label: "Harsh Braking", value: 15 },
  { label: "Sharp Turning", value: 25 },
  { label: "Idle Time", value: 10 },
];

export default function BehaviorPage() {
  const fleetScore = Math.round(drivers.reduce((n, d) => n + d.behaviorScore, 0) / drivers.length);
  const leaderboard = [...drivers].sort((a, b) => b.behaviorScore - a.behaviorScore);
  const riskyTrips = trips.filter((t) => t.maxSpeedKmh > 110).slice(0, 6);

  return (
    <PageContainer>
      <PageHeader title="Driving Behavior" subtitle="Scoring, events and risk analysis for safer roads and lower premiums" />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Fleet Score" value={fleetScore} suffix="/100" icon={Gauge} />
        <StatCard label="Trips Analyzed" value={trips.length * 5} icon={Route} delay={0.05} />
        <StatCard label="Distance Analyzed" value={4250} suffix="km" icon={TrendingUp} delay={0.1} />
        <StatCard label="Risky Trips" value={riskyTrips.length * 3} icon={TriangleAlert} iconClassName="bg-warning/15 text-warning-foreground" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Breakdown */}
        <Panel className="p-5">
          <h3 className="text-[15px] font-semibold">Behavior Breakdown</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Share of negative events this month</p>
          <div className="mt-5 flex flex-col gap-4">
            {BREAKDOWN.map((b) => (
              <div key={b.label}>
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="font-medium">{b.label}</span>
                  <span className="text-muted-foreground tabular-nums">{b.value}%</span>
                </div>
                <Progress value={b.value} className="h-2" />
              </div>
            ))}
          </div>
        </Panel>

        {/* Leaderboard */}
        <Panel className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Driver Leaderboard</h3>
          </div>
          <div className="max-h-[420px] divide-y divide-border/50 overflow-y-auto scrollbar-thin">
            {leaderboard.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-5 text-center text-[13px] font-bold text-muted-foreground">{i + 1}</span>
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">
                    {d.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{d.name}</div>
                  <div className="text-[11px] text-muted-foreground">{d.tripsThisMonth} trips</div>
                </div>
                <Pill tone={d.riskLevel === "low" ? "success" : d.riskLevel === "medium" ? "warning" : "danger"}>
                  {d.behaviorScore}
                </Pill>
              </div>
            ))}
          </div>
        </Panel>

        {/* Risky trips */}
        <Panel className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="text-[15px] font-semibold">Recent Risky Trips</h3>
          </div>
          <div className="divide-y divide-border/50">
            {riskyTrips.map((t) => {
              const d = driverById(t.driverId);
              return (
                <div key={t.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold">{vehicleById(t.vehicleId)?.plate}</span>
                    <Pill tone="danger">max {kmh(t.maxSpeedKmh)}</Pill>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {d?.name ?? "Unassigned"} · {km(t.distanceKm)} · {shortDateTime(t.startAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
