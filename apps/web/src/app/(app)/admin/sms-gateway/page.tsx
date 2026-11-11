"use client";

import { useState } from "react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSmsGateways } from "@/hooks/use-platform-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { usd } from "@/lib/format";

const PROVIDERS = ["Twilio", "Africa's Talking", "Econet Bulk SMS", "Vonage", "Clickatell"];

export default function SmsGatewayPage() {
  const { rows: gateways, live, loading, insert, update, remove } = useSmsGateways();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", provider: PROVIDERS[0], senderId: "" });

  const add = async () => {
    if (!form.name.trim()) return toast.error("Gateway name is required");
    setSaving(true);
    const ok = await insert({
      name: form.name.trim(),
      provider: form.provider,
      sender_id: form.senderId.trim() || null,
      is_default: gateways.length === 0,
    });
    setSaving(false);
    if (!ok) return toast.error("Could not add gateway — check your connection");
    toast.success(`${form.name.trim()} added${gateways.length === 0 ? " and set as default" : ""}`);
    setForm({ name: "", provider: PROVIDERS[0], senderId: "" });
    setAddOpen(false);
  };

  const setDefault = async (id: string, name: string) => {
    /* Unset every other gateway first, then set this one. */
    const others = gateways.filter((g) => g.id !== id && g.isDefault);
    for (const g of others) await update(g.id, { is_default: false });
    const ok = await update(id, { is_default: true });
    if (ok) toast.success(`${name} is now the default gateway`);
    else toast.error("Could not set default gateway");
  };

  const toggleActive = async (id: string, active: boolean, name: string) => {
    const ok = await update(id, { status: active ? "active" : "inactive" });
    if (ok) toast.success(`${name} ${active ? "enabled" : "disabled"}`);
    else toast.error("Could not update gateway");
  };

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="SMS Gateway"
        subtitle="Gateways for alert SMS and device command fallback"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add Gateway
          </Button>
        }
      />

      <Panel className="divide-y divide-border/50">
        {gateways.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold">
                {g.name}
                {g.isDefault && <Pill tone="primary">Default</Pill>}
              </div>
              <div className="text-[11.5px] text-muted-foreground">
                {g.provider}
                {g.senderId && ` · Sender ${g.senderId}`}
                {g.balanceUsd != null && ` · Balance ${usd(g.balanceUsd)}`}
              </div>
            </div>
            <Pill tone={g.status === "active" ? "success" : "muted"}>{g.status}</Pill>
            <div className="flex items-center gap-3">
              <Switch
                checked={g.isDefault}
                onCheckedChange={(c) => {
                  if (c) void setDefault(g.id, g.name);
                  else void toggleActive(g.id, false, g.name);
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg text-destructive hover:text-destructive"
                onClick={async () => {
                  const ok = await remove(g.id);
                  if (ok) toast.success(`${g.name} removed`);
                  else toast.error("Could not remove gateway");
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {gateways.length === 0 && (
          <div className="px-5 py-10 text-center text-muted-foreground">
            {loading
              ? "Loading gateways…"
              : live
                ? "No gateways configured — add one to start sending alerts."
                : "SMS gateways unavailable — sign in as a platform admin."}
          </div>
        )}
      </Panel>

      <Panel className="mt-4 p-5 text-[12.5px] leading-relaxed text-muted-foreground">
        Routing: SOS and power-cut alerts always use the default gateway. Device SMS commands route through the
        gateway matching the SIM&apos;s network where configured (e.g. Econet SIMs → Econet Bulk SMS) to reduce cost.
      </Panel>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Gateway</DialogTitle>
            <DialogDescription>
              Register an SMS provider. Credentials go into your env config — this stores routing metadata.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="g-name">Gateway name</Label>
              <Input
                id="g-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Twilio Primary"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="g-provider">Provider</Label>
              <select
                id="g-provider"
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="g-sender">Sender ID (optional)</Label>
              <Input
                id="g-sender"
                value={form.senderId}
                onChange={(e) => setForm({ ...form, senderId: e.target.value })}
                placeholder="AEROTRACK"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={add} disabled={saving} className="gap-2">
              <Plus className="size-4" /> {saving ? "Saving…" : "Add Gateway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
