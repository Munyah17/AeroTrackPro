"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Droplets, Fuel as FuelIcon, TrendingDown } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fuelRecords, vehicles, vehicleById } from "@aerotrack/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { shortDateTime, usd } from "@/lib/format";

const fuelTrend = [
  { day: "May 20", level: 96 },
  { day: "May 21", level: 84 },
  { day: "May 22", level: 71 },
  { day: "May 23", level: 60 },
  { day: "May 24", level: 47 },
  { day: "May 25", level: 38 },
  { day: "May 26", level: 26 },
];

export default function FuelPage() {
  const [vehicleId, setVehicleId] = useState(vehicles[0]!.id);
  const rows = useMemo(
    () => fuelRecords.filter((r) => r.vehicleId === vehicleId || vehicleId === "all").slice(0, 14),
    [vehicleId],
  );

  const refills = fuelRecords.filter((r) => r.kind === "refill");
  const usedL = fuelRecords.filter((r) => r.kind === "consumption").reduce((n, r) => n + r.liters, 0);
  const cost = refills.reduce((n, r) => n + (r.costUsd ?? 0), 0);
  const theft = fuelRecords.filter((r) => r.kind === "theftSuspected").length;

  return (
    <PageContainer>
      <PageHeader
        title="Fuel Monitoring"
        subtitle="Levels, consumption, refills and theft detection"
        actions={
          <Select value={vehicleId} onValueChange={(v) => setVehicleId(v ?? "all")}>
            <SelectTrigger className="w-56 rounded-xl bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All vehicles</SelectItem>
              {vehicles.filter((v) => v.fuelLevelPct !== undefined).slice(0, 12).map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.plate} — {v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Fuel Used (30d)" value={usedL} suffix="L" icon={FuelIcon} />
        <StatCard label="Fuel Cost (30d)" value={cost} suffix="USD" icon={Droplets} delay={0.05} />
        <StatCard label="Avg Consumption" value={8.5} decimals={1} suffix="km/L" icon={TrendingDown} delay={0.1} />
        <StatCard
          label="Theft Alerts"
          value={theft}
          icon={AlertTriangle}
          iconClassName="bg-destructive/10 text-destructive"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel className="p-5 xl:col-span-3">
          <h3 className="text-[15px] font-semibold">Fuel Level (7 days)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={fuelTrend}>
                <defs>
                  <linearGradient id="fuelFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis axisLine={false} tickLine={false} fontSize={11} width={34} unit="%" stroke="var(--muted-foreground)" />
                <ChartTooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="level"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#fuelFill)"
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="overflow-hidden xl:col-span-2">
          <div className="border-b border-border/60 px-4 py-3.5">
            <h3 className="text-[14px] font-semibold">Recent Fuel Events</h3>
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Vehicle</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Liters</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4 text-[12.5px] font-medium">{vehicleById(r.vehicleId)?.plate}</TableCell>
                    <TableCell>
                      <Pill tone={r.kind === "refill" ? "success" : r.kind === "theftSuspected" ? "danger" : "muted"}>
                        {r.kind === "theftSuspected" ? "theft?" : r.kind}
                      </Pill>
                    </TableCell>
                    <TableCell className="text-right text-[12.5px] tabular-nums">
                      {r.kind === "consumption" ? "-" : r.kind === "theftSuspected" ? "-" : "+"}
                      {r.liters} L
                      {r.costUsd ? <span className="block text-[10.5px] text-muted-foreground">{usd(r.costUsd)}</span> : null}
                    </TableCell>
                    <TableCell className="text-right text-[11.5px] text-muted-foreground">{shortDateTime(r.at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
