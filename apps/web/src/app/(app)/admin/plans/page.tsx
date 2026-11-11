"use client";

import { useState } from "react";
import { BadgeCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { usePlans, useTenants } from "@/hooks/use-platform-data";
import type { Plan } from "@aerotrack/shared";
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
import { cn } from "@/lib/utils";

interface PlanForm {
  id: string | null;
  name: string;
  price: string;
  maxVehicles: string;
  maxUsers: string;
  features: string;
}

const EMPTY: PlanForm = { id: null, name: "", price: "", maxVehicles: "", maxUsers: "", features: "" };

export default function PlansPage() {
  const { rows: plans, live, loading, insert, update } = usePlans();
  const { rows: tenants } = useTenants();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PlanForm>(EMPTY);

  /* Match by plan slug/name — DB plan ids are uuids, tenants store plan text. */
  const subscribers = (planId: string) =>
    tenants.filter((t) => `pln-${t.plan}` === planId || t.plan === planId).length;

  const openEdit = (p: Plan) =>
    setForm({
      id: p.id,
      name: p.name,
      price: String(p.priceMonthlyUsd),
      maxVehicles: p.maxVehicles != null ? String(p.maxVehicles) : "",
      maxUsers: p.maxUsers != null ? String(p.maxUsers) : "",
      features: p.features.join("\n"),
    });

  const save = async () => {
    if (!form.name.trim()) return toast.error("Plan name is required");
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return toast.error("Enter a valid monthly price");
    const maxVehicles = form.maxVehicles.trim() ? Number(form.maxVehicles) : null;
    const maxUsers = form.maxUsers.trim() ? Number(form.maxUsers) : null;
    const features = form.features.split("\n").map((f) => f.trim()).filter(Boolean);
    setSaving(true);
    const ok = form.id
      ? await update(form.id, {
          name: form.name.trim(),
          price_monthly_usd: price,
          max_vehicles: maxVehicles,
          max_users: maxUsers,
          features,
        })
      : await insert({
          name: form.name.trim(),
          price_monthly_usd: price,
          max_vehicles: maxVehicles,
          max_users: maxUsers,
          features,
          sort: plans.length + 1,
        });
    setSaving(false);
    if (!ok) return toast.error("Could not save plan — check your connection");
    toast.success(`"${form.name.trim()}" ${form.id ? "updated" : "created"}`);
    setForm(EMPTY);
    setEditOpen(false);
  };

  return (
    <PageContainer className="max-w-[1200px]">
      <PageHeader
        title="Plans & Billing"
        subtitle="Subscription plans available to your client organizations"
        actions={
          <Button
            className="gap-2 rounded-xl shadow-card"
            onClick={() => {
              setForm(EMPTY);
              setEditOpen(true);
            }}
          >
            <Plus className="size-4" /> Add Plan
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const highlight = p.id === "pln-pro" || p.name.toLowerCase() === "pro";
          return (
            <Panel
              key={p.id}
              hover
              className={cn("relative flex flex-col p-6", highlight && "ring-2 ring-primary")}
            >
              {highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10.5px] font-bold text-white">
                  MOST POPULAR
                </span>
              )}
              <div className="text-[15px] font-semibold">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-[32px] font-bold tracking-tight tabular-nums">${p.priceMonthlyUsd}</span>
                <span className="text-[13px] text-muted-foreground">/month</span>
              </div>
              <div className="mt-1 text-[12.5px] text-muted-foreground">
                {p.maxVehicles ? `Up to ${p.maxVehicles} vehicles` : "Unlimited vehicles"}
              </div>
              <div className="my-4 h-px bg-border/70" />
              <ul className="flex flex-1 flex-col gap-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px]">
                    <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between">
                <Pill tone="muted">{subscribers(p.id)} subscribers</Pill>
                <Button
                  size="sm"
                  variant={highlight ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => {
                    openEdit(p);
                    setEditOpen(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            </Panel>
          );
        })}
        {!loading && plans.length === 0 && (
          <Panel className="col-span-full px-5 py-10 text-center text-muted-foreground">
            {live ? "No plans defined yet." : "Plans unavailable — sign in as a platform admin."}
          </Panel>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? `Edit ${form.name}` : "Add Plan"}</DialogTitle>
            <DialogDescription>
              Plan changes apply to organizations on their next renewal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pl-name">Plan name</Label>
              <Input
                id="pl-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Growth"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pl-price">$ /month</Label>
                <Input
                  id="pl-price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="49"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pl-vehicles">Max vehicles</Label>
                <Input
                  id="pl-vehicles"
                  type="number"
                  min="0"
                  value={form.maxVehicles}
                  onChange={(e) => setForm({ ...form, maxVehicles: e.target.value })}
                  placeholder="∞"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pl-users">Max users</Label>
                <Input
                  id="pl-users"
                  type="number"
                  min="0"
                  value={form.maxUsers}
                  onChange={(e) => setForm({ ...form, maxUsers: e.target.value })}
                  placeholder="∞"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pl-features">Features (one per line)</Label>
              <textarea
                id="pl-features"
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                rows={5}
                className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                placeholder={"Live tracking\nAlerts & geofences\nReports"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : form.id ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
