"use client";

import { useMemo, useState } from "react";
import { LifeBuoy, Plus } from "lucide-react";
import { toast } from "sonner";
import { useSupportTickets, useTenants } from "@/hooks/use-platform-data";
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
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type TicketStatus = "open" | "inProgress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

const DB_STATUS: Record<TicketStatus, string> = {
  open: "open",
  inProgress: "in_progress",
  resolved: "resolved",
  closed: "closed",
};

const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

export default function TicketsPage() {
  const { rows: tickets, live, loading, insert, update } = useSupportTickets();
  const { rows: tenants } = useTenants();
  const tenantById = (id: string) => tenants.find((t) => t.id === id);
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tenantId: "", subject: "", priority: "medium" as TicketPriority });

  const filtered = useMemo(
    () => tickets.filter((t) => statusFilter === "all" || t.status === statusFilter),
    [tickets, statusFilter],
  );

  const createTicket = async () => {
    if (!form.tenantId) return toast.error("Choose the organization this ticket is for");
    if (!form.subject.trim()) return toast.error("Subject is required");
    setSaving(true);
    const ok = await insert({
      tenant_id: form.tenantId,
      user_id: null,
      subject: form.subject.trim(),
      priority: form.priority,
      status: "open",
    });
    setSaving(false);
    if (!ok) return toast.error("Could not create ticket — check your connection");
    toast.success("Ticket opened");
    setForm({ tenantId: "", subject: "", priority: "medium" });
    setAddOpen(false);
  };

  const setStatus = async (id: string, status: TicketStatus, subject: string) => {
    const ok = await update(id, { status: DB_STATUS[status] as never });
    if (ok) toast.success(`"${subject.slice(0, 40)}" → ${status === "inProgress" ? "in progress" : status}`);
    else toast.error("Could not update ticket");
  };

  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="Support Tickets"
        subtitle="Tickets from all client organizations in one queue"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> New Ticket
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {(["all", "open", "inProgress", "resolved", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
              statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {s === "all" ? "All" : s === "inProgress" ? "In progress" : s}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {filtered.map((t) => (
          <Panel key={t.id} hover className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LifeBuoy className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold">{t.subject}</span>
              </div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                {tenantById(t.tenantId)?.name ?? "Unknown org"} · opened {timeAgo(t.createdAt)}
                {t.lastReplyAt && ` · last reply ${timeAgo(t.lastReplyAt)}`}
              </div>
            </div>
            <Pill tone={t.priority === "urgent" ? "danger" : t.priority === "high" ? "warning" : "muted"}>{t.priority}</Pill>
            <Pill tone={t.status === "open" ? "warning" : t.status === "inProgress" ? "info" : "success"}>
              {t.status === "inProgress" ? "in progress" : t.status}
            </Pill>
            <div className="flex gap-1.5">
              {t.status === "open" && (
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setStatus(t.id, "inProgress", t.subject)}>
                  Pick up
                </Button>
              )}
              {t.status === "inProgress" && (
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setStatus(t.id, "resolved", t.subject)}>
                  Resolve
                </Button>
              )}
              {(t.status === "open" || t.status === "inProgress") && (
                <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setStatus(t.id, "closed", t.subject)}>
                  Close
                </Button>
              )}
            </div>
          </Panel>
        ))}
        {filtered.length === 0 && (
          <Panel className="px-5 py-10 text-center text-muted-foreground">
            {loading
              ? "Loading tickets…"
              : live
                ? "No tickets with this status."
                : "Ticket queue unavailable — sign in as a platform admin."}
          </Panel>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Ticket</DialogTitle>
            <DialogDescription>
              Open a support ticket on behalf of a client organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="t-org">Organization</Label>
              <select
                id="t-org"
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">Choose organization…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-subject">Subject</Label>
              <Input
                id="t-subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Device offline for 6h"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-priority">Priority</Label>
              <select
                id="t-priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={createTicket} disabled={saving} className="gap-2">
              <Plus className="size-4" /> {saving ? "Opening…" : "Open Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
