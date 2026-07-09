"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Bluetooth, Droplets, Fuel as FuelIcon, Settings2, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fuelRecords, vehicles, vehicleById } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const [sensorDialogOpen, setSensorDialogOpen] = useState(false);
  const [sensorType, setSensorType] = useState<"probe" | "bluetooth" | "can">("probe");

  const rows = useMemo(
    () => fuelRecords.filter((r) => r.vehicleId === vehicleId || vehicleId === "all").slice(0, 14),
    [vehicleId],
  );

  const refills = fuelRecords.filter((r) => r.kind === "refill");
  const usedL = fuelRecords.filter((r) => r.kind === "consumption").reduce((n, r) => n + r.liters, 0);
  const cost = refills.reduce((n, r) => n + (r.costUsd ?? 0), 0);
  const theft = fuelRecords.filter((r) => r.kind === "theftSuspected").length;

  const handleSaveSensor = () => {
    toast.success("Fuel sensor configured successfully");
    setSensorDialogOpen(false);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Fuel Monitoring"
        subtitle="Levels, consumption, refills and theft detection"
        actions={
          <div className="flex gap-2">
            <Dialog open={sensorDialogOpen} onOpenChange={setSensorDialogOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" className="gap-2 rounded-xl">
                    <Settings2 className="size-4" /> Configure Sensor
                  </Button>
                }
              />
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Configure Fuel Sensor</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Sensor type</Label>
                    <RadioGroup value={sensorType} onValueChange={(v) => setSensorType(v as typeof sensorType)}>
                      <div className="flex items-center space-x-2 rounded-lg border border-border/60 p-3">
                        <RadioGroupItem value="probe" id="probe" />
                        <Label htmlFor="probe" className="flex-1 cursor-pointer text-sm">
                          Fuel probe (wired)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-lg border border-border/60 p-3">
                        <RadioGroupItem value="bluetooth" id="bluetooth" />
                        <Label htmlFor="bluetooth" className="flex-1 cursor-pointer text-sm">
                          <Bluetooth className="mr-1.5 inline size-3.5" />
                          Bluetooth fuel sensor
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-lg border border-border/60 p-3">
                        <RadioGroupItem value="can" id="can" />
                        <Label htmlFor="can" className="flex-1 cursor-pointer text-sm">
                          CAN bus (built-in)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tank capacity (L)</Label>
                      <Input type="number" defaultValue="80" className="rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Calibration offset</Label>
                      <Input type="number" defaultValue="0" step="0.1" className="rounded-lg" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Theft detection threshold</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" defaultValue="10" step="1" className="rounded-lg" />
                      <span className="text-sm text-muted-foreground">liters</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Alert if fuel drops by this amount while ignition is off
                    </p>
                  </div>

                  <Button onClick={handleSaveSensor} className="w-full rounded-xl">
                    Save Configuration
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
          </div>
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
