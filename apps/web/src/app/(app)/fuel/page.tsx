"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Droplets, Fuel as FuelIcon, Settings2, Ticket, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useFuelRecords, useTrips } from "@/hooks/use-live-data";
import { refreshAllLiveData } from "@/hooks/use-live-data";
import { useFleet } from "@/hooks/use-fleet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { shortDateTime, timeAgo, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

export default function FuelPage() {
  const [vehicleId, setVehicleId] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsVehicle, setSettingsVehicle] = useState("");
  const [capacity, setCapacity] = useState("");
  const [saving, setSaving] = useState(false);
  const { rows: fuelRecords } = useFuelRecords();
  const { rows: trips } = useTrips();
  const { vehicles } = useFleet();

  const now = Date.now();

  const rows = useMemo(
    () => fuelRecords.filter((r) => r.vehicleId === vehicleId || vehicleId === "all").slice(0, 14),
    [fuelRecords, vehicleId],
  );

  const records30d = useMemo(
    () => fuelRecords.filter((r) => now - new Date(r.at).getTime() < 30 * DAY_MS),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a per-render timestamp
    [fuelRecords],
  );

  const usedL = records30d.filter((r) => r.kind === "consumption").reduce((n, r) => n + r.liters, 0);
  const cost = records30d.filter((r) => r.kind === "refill").reduce((n, r) => n + (r.costUsd ?? 0), 0);
  const theft = records30d.filter((r) => r.kind === "theftSuspected").length;

  /* Real consumption: trip distance ÷ fuel consumed over the same window. */
  const trips30dKm = trips
    .filter((t) => now - new Date(t.startAt).getTime() < 30 * DAY_MS)
    .reduce((n, t) => n + t.distanceKm, 0);
  const avgKml = usedL > 0 ? trips30dKm / usedL : undefined;

  /* Vehicles reporting a live fuel level (probe / flow meter on the device). */
  const fuelVehicles = vehicles
    .filter((v) => v.fuelLevelPct != null)
    .sort((a, b) => (a.fuelLevelPct ?? 0) - (b.fuelLevelPct ?? 0));

  const openSettings = (vid?: string) => {
    const v = vehicles.find((x) => x.id === (vid ?? settingsVehicle)) ?? vehicles[0];
    if (v) {
      setSettingsVehicle(v.id);
      setCapacity(v.fuelCapacityL != null ? String(v.fuelCapacityL) : "");
    }
    setSettingsOpen(true);
  };

  const saveCapacity = async () => {
    if (!settingsVehicle) return toast.error("Choose a vehicle");
    const litres = Number(capacity);
    if (!Number.isFinite(litres) || litres <= 0) return toast.error("Enter a tank capacity in litres");
    setSaving(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase
        .from("vehicles")
        .update({ fuel_capacity_liters: litres })
        .eq("id", settingsVehicle);
      if (error) throw error;
      toast.success("Tank capacity saved");
      setSettingsOpen(false);
      refreshAllLiveData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Fuel Monitoring"
        subtitle="Levels, consumption, refills and theft detection"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button render={<a href="/fuel/coupons" />} variant="outline" className="gap-2 rounded-xl">
              <Ticket className="size-4" /> Fuel Coupons
            </Button>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" className="gap-2 rounded-xl" onClick={() => openSettings()}>
                    <Settings2 className="size-4" /> Fuel Settings
                  </Button>
                }
              />
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Fuel settings</DialogTitle>
                  <DialogDescription>
                    Set each vehicle&apos;s tank capacity — the platform uses it to convert probe
                    percentages into litres. Theft detection is automatic: the system learns every
                    vehicle&apos;s consumption baseline and flags abnormal drops.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Vehicle</Label>
                    <Select value={settingsVehicle} onValueChange={(v) => v && openSettings(v)}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Choose vehicle" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name || v.plate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tank capacity (litres)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="e.g. 80"
                      className="rounded-lg"
                    />
                  </div>
                  <Button onClick={() => void saveCapacity()} disabled={saving} className="w-full rounded-xl">
                    {saving ? "Saving…" : "Save"}
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
                {vehicles.slice(0, 12).map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name || v.plate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Fuel Used (30d)" value={usedL} suffix="L" icon={FuelIcon} />
        <StatCard label="Fuel Cost (30d)" value={cost} suffix="USD" icon={Droplets} delay={0.05} />
        <StatCard
          label="Avg Consumption"
          value={avgKml ?? 0}
          decimals={1}
          suffix="km/L"
          icon={TrendingDown}
          delay={0.1}
          footer={avgKml == null ? "No consumption recorded yet" : undefined}
        />
        <StatCard
          label="Theft Alerts (30d)"
          value={theft}
          icon={AlertTriangle}
          iconClassName="bg-destructive/10 text-destructive"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel className="p-5 xl:col-span-3">
          <h3 className="text-[15px] font-semibold">Current Fuel Levels</h3>
          {fuelVehicles.length === 0 ? (
            <p className="mt-6 text-center text-[13px] text-muted-foreground">
              No fuel-probe readings yet — levels appear once a device with a fuel sensor reports.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {fuelVehicles.map((v) => {
                const pctLeft = Math.round(v.fuelLevelPct ?? 0);
                const litresLeft =
                  v.fuelCapacityL != null ? Math.round(((v.fuelLevelPct ?? 0) / 100) * v.fuelCapacityL) : null;
                return (
                  <div key={v.id}>
                    <div className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="min-w-0 truncate font-medium">{v.name || v.plate}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {pctLeft}%{litresLeft != null ? ` · ~${litresLeft} L` : ""}
                        {v.fuelCapacityL != null ? ` / ${v.fuelCapacityL} L` : ""}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pctLeft <= 15 ? "bg-destructive" : pctLeft <= 35 ? "bg-warning" : "bg-success",
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, pctLeft))}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10.5px] text-muted-foreground/80">
                      Updated {timeAgo(v.lastSeenAt ?? v.position.updatedAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-[13px] text-muted-foreground">
                      No fuel events recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => {
                  const v = vehicles.find((x) => x.id === r.vehicleId);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="pl-4 text-[12.5px] font-medium">{v?.name || v?.plate || "—"}</TableCell>
                      <TableCell>
                        <Pill tone={r.kind === "refill" ? "success" : r.kind === "theftSuspected" ? "danger" : "muted"}>
                          {r.kind === "theftSuspected" ? "theft?" : r.kind}
                        </Pill>
                      </TableCell>
                      <TableCell className="text-right text-[12.5px] tabular-nums">
                        {r.kind === "consumption" || r.kind === "theftSuspected" ? "-" : "+"}
                        {r.liters} L
                        {r.costUsd ? <span className="block text-[10.5px] text-muted-foreground">{usd(r.costUsd)}</span> : null}
                      </TableCell>
                      <TableCell className="text-right text-[11.5px] text-muted-foreground">{shortDateTime(r.at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
