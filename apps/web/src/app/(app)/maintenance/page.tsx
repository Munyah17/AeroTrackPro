"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CircleCheck, Clock4, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useMaintenanceItems } from "@/hooks/use-live-data";
import { useFleet } from "@/hooks/use-fleet";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { shortDate, usd } from "@/lib/format";

type Tab = "upcoming" | "overdue" | "completed";

/** UI select values → DB check-constraint values. */
const TYPE_MAP: Record<string, "oil" | "tyres" | "brakes" | "service" | "inspection" | "other"> = {
  oil_change: "oil",
  tire_rotation: "tyres",
  brake_check: "brakes",
  filter_replace: "service",
  inspection: "inspection",
  other: "other",
};
const RECUR_MONTHS: Record<string, number | null> = {
  none: null,
  monthly: 1,
  "3months": 3,
  "6months": 6,
  yearly: 12,
};

const emptyForm = {
  vehicleId: "",
  type: "oil_change",
  title: "",
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  cost: "",
  notes: "",
  recurring: "none",
};

export default function MaintenancePage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { rows: maintenance, insert, update } = useMaintenanceItems();
  const { vehicles } = useFleet();
  const [form, setForm] = useState(emptyForm);

  const rows = useMemo(() => maintenance.filter((m) => m.status === tab), [maintenance, tab]);
  const counts = {
    upcoming: maintenance.filter((m) => m.status === "upcoming").length,
    overdue: maintenance.filter((m) => m.status === "overdue").length,
    completed: maintenance.filter((m) => m.status === "completed").length,
  };
  const totalCost = maintenance.reduce((n, m) => n + (m.costUsd ?? 0), 0);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Please enter a maintenance title");
      return;
    }
    const vehicleId = form.vehicleId || vehicles[0]?.id || "";
    setSaving(true);
    const ok = await insert({
      vehicle_id: vehicleId,
      title: form.title.trim(),
      type: TYPE_MAP[form.type] ?? "other",
      due_date: form.dueDate.toISOString().slice(0, 10),
      due_odometer_km: null,
      repeat_every_km: null,
      repeat_every_months: RECUR_MONTHS[form.recurring] ?? null,
      cost_usd: form.cost ? Number(form.cost) : null,
      provider: null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (ok) toast.success("Maintenance scheduled successfully");
    else toast.info("Demo mode — sign in to persist schedules");
    setDialogOpen(false);
    setForm(emptyForm);
  };

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Maintenance"
        subtitle="Schedules, alerts and service history"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (o) setForm((f) => ({ ...f, vehicleId: vehicles[0]?.id ?? "" })); }}>
            <DialogTrigger
              render={
                <Button className="gap-2 rounded-xl shadow-card">
                  <Plus className="size-4" /> Schedule Maintenance
                </Button>
              }
            />
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule Maintenance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Vehicle</Label>
                    <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v ?? "" })}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {vehicles.slice(0, 20).map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.plate}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Maintenance type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? form.type })}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="oil_change">Oil change</SelectItem>
                        <SelectItem value="tire_rotation">Tire rotation</SelectItem>
                        <SelectItem value="brake_check">Brake check</SelectItem>
                        <SelectItem value="filter_replace">Filter replacement</SelectItem>
                        <SelectItem value="inspection">Annual inspection</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Service description</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. 10,000 km oil change"
                    className="rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due date</Label>
                    <DatePicker
                      value={form.dueDate}
                      onChange={(d) => d && setForm({ ...form, dueDate: d })}
                      minDate={new Date()}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Estimated cost (USD)</Label>
                    <Input
                      type="number"
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: e.target.value })}
                      placeholder="0.00"
                      className="rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Recurring schedule</Label>
                  <Select value={form.recurring} onValueChange={(v) => setForm({ ...form, recurring: v ?? form.recurring })}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none">One-time</SelectItem>
                      <SelectItem value="monthly">Every month</SelectItem>
                      <SelectItem value="3months">Every 3 months</SelectItem>
                      <SelectItem value="6months">Every 6 months</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional details..."
                    className="rounded-lg resize-none"
                    rows={3}
                  />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
                  {saving ? "Saving…" : "Schedule Maintenance"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Upcoming" value={counts.upcoming} icon={CalendarClock} />
        <StatCard label="Overdue" value={counts.overdue} icon={Clock4} iconClassName="bg-destructive/10 text-destructive" delay={0.05} />
        <StatCard label="Completed" value={counts.completed} icon={CircleCheck} iconClassName="bg-success/10 text-success" delay={0.1} />
        <StatCard label="Total Cost" value={totalCost} suffix="USD" icon={Wrench} delay={0.15} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="mb-4 h-10 rounded-xl p-1">
          {(["upcoming", "overdue", "completed"] as const).map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-lg px-4 text-[13px] capitalize">
              {t} ({counts[t]})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2.5">
        {rows.map((m) => {
          const v = vehicles.find((x) => x.id === m.vehicleId);
          return (
            <Panel key={m.id} hover className="flex flex-wrap items-center gap-4 p-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wrench className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{v?.plate}</span>
                  <span className="text-[13.5px]">{m.title}</span>
                  <Pill tone={m.status === "overdue" ? "danger" : m.status === "completed" ? "success" : "info"}>
                    {m.status}
                  </Pill>
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {m.status === "completed" ? "Completed" : "Due"} {shortDate(m.dueDate)}
                  {m.costUsd ? ` · Est. ${usd(m.costUsd)}` : ""}
                  {m.notes ? ` · ${m.notes}` : ""}
                </div>
              </div>
              {m.status !== "completed" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={async () => {
                    const ok = await update(m.id, { status: "completed", completed_at: new Date().toISOString() });
                    if (ok) toast.success(`${m.title} marked complete`);
                    else toast.info("Demo mode — sign in to persist changes");
                  }}
                >
                  Mark complete
                </Button>
              )}
            </Panel>
          );
        })}
        {rows.length === 0 && (
          <Panel className="p-12 text-center text-sm text-muted-foreground">Nothing here.</Panel>
        )}
      </div>
    </PageContainer>
  );
}
