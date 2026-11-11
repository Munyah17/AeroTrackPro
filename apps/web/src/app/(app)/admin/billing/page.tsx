"use client";

import { useState } from "react";
import { CreditCard, Download, Wallet } from "lucide-react";
import { toast } from "sonner";
import { type Database, type Tenant } from "@aerotrack/shared";
import { useInvoices, useTenants } from "@/hooks/use-platform-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { usd } from "@/lib/format";

const PLANS = ["starter", "basic", "standard", "pro", "enterprise"] as const;
const STATUSES = ["trial", "active", "suspended", "cancelled"] as const;

export default function BillingPage() {
  const { rows: tenants, update } = useTenants();
  const { rows: invoices } = useInvoices();
  const mrr = tenants.reduce((n, t) => n + t.mrrUsd, 0);
  const arr = mrr * 12;
  const overdueAmt = invoices.filter((i) => i.status === "overdue").reduce((n, i) => n + i.amountUsd, 0);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ plan: "basic" as string, status: "active" as string, mrr: "" });

  const exportCsv = () => {
    const lines = [
      "organization,plan,status,vehicles,mrr_usd",
      ...tenants.map((t) => `${JSON.stringify(t.name)},${t.plan},${t.status},${t.vehicleCount},${t.mrrUsd}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `aerotrack-billing-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Billing report exported");
  };

  const openEdit = (t: Tenant) => {
    setTarget(t);
    setForm({ plan: t.plan, status: t.status, mrr: String(t.mrrUsd) });
    setEditOpen(true);
  };

  const save = async () => {
    if (!target) return;
    const mrrUsd = Number(form.mrr);
    if (!Number.isFinite(mrrUsd) || mrrUsd < 0) return toast.error("Enter a valid MRR amount");
    setSaving(true);
    const ok = await update(target.id, {
      plan: form.plan as Database["public"]["Tables"]["tenants"]["Row"]["plan"],
      status: form.status as Database["public"]["Tables"]["tenants"]["Row"]["status"],
      mrr_usd: mrrUsd,
    });
    setSaving(false);
    if (!ok) return toast.error("Could not update subscription");
    toast.success(`${target.name} → ${form.plan} @ ${usd(mrrUsd)}/mo (${form.status})`);
    setEditOpen(false);
  };

  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="Billing"
        subtitle="Revenue, subscriptions and collection health"
        actions={
          <Button variant="outline" className="gap-2 rounded-xl" onClick={exportCsv}>
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="MRR" value={mrr} suffix="USD" icon={Wallet} />
        <StatCard label="ARR (run rate)" value={arr} suffix="USD" icon={CreditCard} delay={0.05} />
        <StatCard label="Paying Clients" value={tenants.filter((t) => t.mrrUsd > 0).length} icon={CreditCard} delay={0.1} />
        <StatCard label="Overdue" value={overdueAmt} suffix="USD" icon={CreditCard} iconClassName="bg-destructive/10 text-destructive" delay={0.15} />
      </div>

      <Panel className="divide-y divide-border/50">
        {tenants.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <div
              className="flex size-10 items-center justify-center rounded-xl text-[12px] font-bold text-white"
              style={{ background: t.primaryColor }}
            >
              {t.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">{t.name}</div>
              <div className="text-[11.5px] text-muted-foreground">
                {t.plan} plan · {t.vehicleCount} vehicles · renews monthly
              </div>
            </div>
            <span className="text-[15px] font-bold tabular-nums">{usd(t.mrrUsd)}<span className="text-[11px] font-medium text-muted-foreground">/mo</span></span>
            <Pill tone={t.status === "active" ? "success" : t.status === "trial" ? "info" : "danger"}>{t.status}</Pill>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openEdit(t)}>
              Manage
            </Button>
          </div>
        ))}
        {tenants.length === 0 && (
          <div className="px-5 py-10 text-center text-muted-foreground">No organizations yet.</div>
        )}
      </Panel>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Subscription — {target?.name}</DialogTitle>
            <DialogDescription>
              Change the organization&apos;s plan, billing status and monthly rate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="b-plan">Plan</Label>
              <select
                id="b-plan"
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-status">Status</Label>
              <select
                id="b-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="b-mrr">Monthly rate (USD)</Label>
              <Input
                id="b-mrr"
                type="number"
                min="0"
                value={form.mrr}
                onChange={(e) => setForm({ ...form, mrr: e.target.value })}
                placeholder="99"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
