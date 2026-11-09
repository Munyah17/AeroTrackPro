"use client";

import { useMemo, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { shortDate, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

type QuotationStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

interface Quotation {
  id: string;
  number: string;
  client: string;
  kind: "client" | "partner";
  amountUsd: number;
  status: QuotationStatus;
  validUntil: string;
  createdAt: string;
}

const STATUS_META: Record<QuotationStatus, { label: string; tone: "muted" | "info" | "success" | "danger" | "warning" }> = {
  draft: { label: "Draft", tone: "muted" },
  sent: { label: "Sent", tone: "info" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  expired: { label: "Expired", tone: "warning" },
};

const DEMO_QUOTATIONS: Quotation[] = [
  { id: "q-1", number: "QT-2026-014", client: "Delta Beverages", kind: "client", amountUsd: 1740, status: "sent", validUntil: "2026-11-20", createdAt: "2026-11-05" },
  { id: "q-2", number: "QT-2026-013", client: "TrackRight Installers", kind: "partner", amountUsd: 4200, status: "accepted", validUntil: "2026-11-15", createdAt: "2026-11-01" },
  { id: "q-3", number: "QT-2026-012", client: "Harare City Cabs", kind: "client", amountUsd: 2870, status: "accepted", validUntil: "2026-11-10", createdAt: "2026-10-28" },
  { id: "q-4", number: "QT-2026-011", client: "GPS Masters SA", kind: "partner", amountUsd: 1850, status: "sent", validUntil: "2026-11-18", createdAt: "2026-10-25" },
  { id: "q-5", number: "QT-2026-010", client: "Zimgold Distribution", kind: "client", amountUsd: 960, status: "declined", validUntil: "2026-11-05", createdAt: "2026-10-20" },
  { id: "q-6", number: "QT-2026-009", client: "AutoGuard Distributors", kind: "partner", amountUsd: 3100, status: "expired", validUntil: "2026-10-30", createdAt: "2026-10-12" },
  { id: "q-7", number: "QT-2026-008", client: "Croco Motors", kind: "client", amountUsd: 1210, status: "draft", validUntil: "2026-11-25", createdAt: "2026-11-07" },
];

export default function AdminQuotationsPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | QuotationStatus>("all");

  const filtered = useMemo(
    () => DEMO_QUOTATIONS.filter((q) => statusFilter === "all" || q.status === statusFilter),
    [statusFilter],
  );

  const stats = useMemo(() => {
    const open = DEMO_QUOTATIONS.filter((q) => q.status === "sent" || q.status === "draft");
    const accepted = DEMO_QUOTATIONS.filter((q) => q.status === "accepted");
    return {
      open: open.length,
      openValue: open.reduce((n, q) => n + q.amountUsd, 0),
      accepted: accepted.length,
      acceptedValue: accepted.reduce((n, q) => n + q.amountUsd, 0),
    };
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Quotations"
        subtitle="Price proposals for new clients and partners before they become invoices"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Quotation composer: client, line items, devices, add-ons, validity period")}>
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
            {(["all", "draft", "sent", "accepted", "declined", "expired"] as const).map((s) => (
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
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((q) => (
                <tr key={q.id} className="transition-colors hover:bg-accent/40">
                  <td className="px-5 py-3 font-mono text-[12.5px] font-semibold">{q.number}</td>
                  <td className="px-3 py-3 font-medium">{q.client}</td>
                  <td className="px-3 py-3">
                    <Pill tone={q.kind === "partner" ? "info" : "muted"}>{q.kind}</Pill>
                  </td>
                  <td className="px-3 py-3 tabular-nums font-semibold">{usd(q.amountUsd)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{shortDate(q.validUntil)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{shortDate(q.createdAt)}</td>
                  <td className="px-5 py-3">
                    <Pill tone={STATUS_META[q.status].tone}>{STATUS_META[q.status].label}</Pill>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    No quotations with this status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageContainer>
  );
}
