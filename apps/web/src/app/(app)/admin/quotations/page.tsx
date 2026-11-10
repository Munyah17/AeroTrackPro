"use client";

import { useMemo, useState } from "react";
import { FileText, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuotations } from "@/hooks/use-platform-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { shortDate, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

type QuotationStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

const STATUS_META: Record<QuotationStatus, { label: string; tone: "muted" | "info" | "success" | "danger" | "warning" }> = {
  draft: { label: "Draft", tone: "muted" },
  sent: { label: "Sent", tone: "info" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  expired: { label: "Expired", tone: "warning" },
};

const FILTERS: ("all" | QuotationStatus)[] = ["all", "draft", "sent", "accepted", "declined", "expired"];

export default function AdminQuotationsPage() {
  const { rows: quotations, live, loading, insert, update, remove } = useQuotations();
  const [statusFilter, setStatusFilter] = useState<"all" | QuotationStatus>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    kind: "client" as "client" | "partner",
    amount: "",
    validUntil: "",
    notes: "",
  });

  const filtered = useMemo(
    () => quotations.filter((q) => statusFilter === "all" || q.status === statusFilter),
    [quotations, statusFilter],
  );

  const stats = useMemo(() => {
    const open = quotations.filter((q) => q.status === "sent" || q.status === "draft");
    const accepted = quotations.filter((q) => q.status === "accepted");
    return {
      open: open.length,
      openValue: open.reduce((n, q) => n + q.amountUsd, 0),
      accepted: accepted.length,
      acceptedValue: accepted.reduce((n, q) => n + q.amountUsd, 0),
    };
  }, [quotations]);

  const resetForm = () =>
    setForm({ clientName: "", clientEmail: "", kind: "client", amount: "", validUntil: "", notes: "" });

  const handleCreate = async () => {
    const amount = Number(form.amount);
    if (!form.clientName.trim()) return toast.error("Client name is required");
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid amount");
    setSaving(true);
    const ok = await insert({
      client_name: form.clientName.trim(),
      client_email: form.clientEmail.trim() || null,
      kind: form.kind,
      amount_usd: amount,
      valid_until: form.validUntil || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (!ok) return toast.error("Could not save quotation — check your connection");
    toast.success("Quotation created as draft");
    resetForm();
    setComposerOpen(false);
  };

  const handleSend = async (id: string) => {
    const ok = await update(id, { status: "sent", sent_at: new Date().toISOString() });
    if (ok) toast.success("Quotation marked as sent");
    else toast.error("Could not update quotation");
  };

  const handleStatus = async (id: string, status: "accepted" | "declined" | "expired") => {
    const ok = await update(id, { status });
    if (ok) toast.success(`Quotation ${status}`);
    else toast.error("Could not update quotation");
  };

  const handleDelete = async (id: string, number: string) => {
    const ok = await remove(id);
    if (ok) toast.success(`Deleted ${number}`);
    else toast.error("Could not delete quotation");
  };

  return (
    <PageContainer>
      <PageHeader
        title="Quotations"
        subtitle="Price proposals for new clients and partners before they become invoices"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setComposerOpen(true)}>
            <Plus className="size-4" /> New Quotation
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard compact label="Open Quotations" value={stats.open} icon={FileText} />
        <StatCard compact label="Open Value" value={stats.openValue} suffix="USD" icon={FileText} delay={0.05} />
        <StatCard compact label="Accepted" value={stats.accepted} icon={FileText} delay={0.1} />
        <StatCard compact label="Accepted Value" value={stats.acceptedValue} suffix="USD" icon={FileText} delay={0.15} />
      </div>

      <Panel className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-4">
          <h3 className="text-[15px] font-semibold">All Quotations</h3>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {s === "all" ? "All" : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11.5px] uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-3 py-3 font-medium">Client</th>
                <th className="px-3 py-3 font-medium">Kind</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Valid Until</th>
                <th className="px-3 py-3 font-medium">Created</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((q) => (
                <tr key={q.id} className="transition-colors hover:bg-accent/40">
                  <td className="px-5 py-3 font-mono text-[12.5px] font-semibold">{q.number}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{q.clientName}</div>
                    {q.clientEmail && <div className="text-[11.5px] text-muted-foreground">{q.clientEmail}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <Pill tone={q.kind === "partner" ? "info" : "muted"}>{q.kind}</Pill>
                  </td>
                  <td className="px-3 py-3 tabular-nums font-semibold">{usd(q.amountUsd)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{q.validUntil ? shortDate(q.validUntil) : "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{shortDate(q.createdAt)}</td>
                  <td className="px-3 py-3">
                    <Pill tone={STATUS_META[q.status].tone}>{STATUS_META[q.status].label}</Pill>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {q.status === "draft" && (
                        <>
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleSend(q.id)}>
                            <Send className="size-3.5" /> Send
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg text-destructive hover:text-destructive"
                            onClick={() => handleDelete(q.id, q.number)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                      {q.status === "sent" && (
                        <>
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleStatus(q.id, "accepted")}>
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleStatus(q.id, "declined")}>
                            Decline
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleStatus(q.id, "expired")}>
                            Expire
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                    {loading ? "Loading quotations…" : live ? "No quotations with this status." : "Quotations are unavailable — sign in as a platform admin."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Quotation</DialogTitle>
            <DialogDescription>
              Create a price proposal for a prospective client or partner. It starts as a draft.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="q-client">Client name</Label>
              <Input
                id="q-client"
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="e.g. Delta Beverages"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="q-email">Client email (optional)</Label>
              <Input
                id="q-email"
                type="email"
                value={form.clientEmail}
                onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                placeholder="billing@company.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="q-kind">Kind</Label>
                <select
                  id="q-kind"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value as "client" | "partner" })}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="client">Client</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="q-amount">Amount (USD)</Label>
                <Input
                  id="q-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="q-valid">Valid until (optional)</Label>
              <Input
                id="q-valid"
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="q-notes">Notes (optional)</Label>
              <Textarea
                id="q-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Scope, devices, add-ons, terms…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposerOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="gap-2">
              <Plus className="size-4" /> {saving ? "Saving…" : "Create Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
