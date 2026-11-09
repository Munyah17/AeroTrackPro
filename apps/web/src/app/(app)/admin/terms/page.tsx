"use client";

import { useMemo, useState } from "react";
import { FileCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type TermsStatus = "draft" | "published" | "archived";

interface TermsVersion {
  id: string;
  version: string;
  title: string;
  status: TermsStatus;
  updatedAt: string;
  updatedBy: string;
  effectiveAt?: string;
}

const STATUS_META: Record<TermsStatus, { label: string; tone: "muted" | "info" | "success" }> = {
  draft: { label: "Draft", tone: "muted" },
  published: { label: "Published", tone: "success" },
  archived: { label: "Archived", tone: "info" },
};

const DEMO_TERMS: TermsVersion[] = [
  { id: "tm-1", version: "v2.4", title: "Platform Terms of Service", status: "published", updatedAt: "2026-10-01", updatedBy: "Grace Ndlovu", effectiveAt: "2026-10-15" },
  { id: "tm-2", version: "v2.3", title: "Partner Agreement", status: "published", updatedAt: "2026-08-20", updatedBy: "Tendai Moyo", effectiveAt: "2026-09-01" },
  { id: "tm-3", version: "v2.5", title: "Platform Terms of Service", status: "draft", updatedAt: "2026-11-06", updatedBy: "Brian Chikafu" },
  { id: "tm-4", version: "v2.2", title: "Privacy Policy", status: "archived", updatedAt: "2026-06-10", updatedBy: "Grace Ndlovu", effectiveAt: "2026-06-20" },
  { id: "tm-5", version: "v2.4", title: "Privacy Policy", status: "published", updatedAt: "2026-10-01", updatedBy: "Grace Ndlovu", effectiveAt: "2026-10-15" },
];

export default function AdminTermsPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | TermsStatus>("all");

  const filtered = useMemo(
    () => DEMO_TERMS.filter((t) => statusFilter === "all" || t.status === statusFilter),
    [statusFilter],
  );

  const published = DEMO_TERMS.filter((t) => t.status === "published").length;

  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="Terms & Conditions"
        subtitle="Legal documents clients and partners agree to — versioned, with effective dates"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("New terms version: pick a document, edit, set effective date")}>
            <Plus className="size-4" /> New Version
          </Button>
        }
      />

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileCheck className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Documents</h3>
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {(["all", "draft", "published", "archived"] as const).map((s) => (
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

        <div className="divide-y divide-border/50">
          {filtered.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/40">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">
                  {t.title} <span className="ml-1 font-mono text-[12px] text-muted-foreground">{t.version}</span>
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  Updated {shortDate(t.updatedAt)} by {t.updatedBy}
                  {t.effectiveAt && ` · effective ${shortDate(t.effectiveAt)}`}
                </div>
              </div>
              <Pill tone={STATUS_META[t.status].tone}>{STATUS_META[t.status].label}</Pill>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toast.info(`Editing ${t.title} ${t.version}`)}>
                Edit
              </Button>
              {t.status === "draft" && (
                <Button size="sm" className="rounded-xl" onClick={() => toast.success(`Published ${t.title} ${t.version}`)}>
                  Publish
                </Button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-muted-foreground">No documents with this status.</div>
          )}
        </div>
      </Panel>

      <p className="mt-3 text-[12px] text-muted-foreground">
        {published} document{published === 1 ? "" : "s"} currently published. Clients and partners must accept the latest published version on next login.
      </p>
    </PageContainer>
  );
}
