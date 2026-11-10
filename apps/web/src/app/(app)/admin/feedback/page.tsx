"use client";

import { useMemo, useState } from "react";
import { MessageSquareHeart, Star } from "lucide-react";
import { toast } from "sonner";
import { useFeedback, useTenants } from "@/hooks/use-platform-data";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type FeedbackStatus = "new" | "reviewed" | "actioned" | "closed";
type FeedbackCategory = "bug" | "feature" | "praise" | "complaint";

const STATUS_META: Record<FeedbackStatus, { label: string; tone: "warning" | "info" | "success" | "muted" }> = {
  new: { label: "New", tone: "warning" },
  reviewed: { label: "Reviewed", tone: "info" },
  actioned: { label: "Actioned", tone: "success" },
  closed: { label: "Closed", tone: "muted" },
};

const CATEGORY_META: Record<FeedbackCategory, { label: string; tone: "danger" | "info" | "success" | "warning" }> = {
  bug: { label: "Bug", tone: "danger" },
  feature: { label: "Feature request", tone: "info" },
  praise: { label: "Praise", tone: "success" },
  complaint: { label: "Complaint", tone: "warning" },
};

export default function AdminFeedbackPage() {
  const { rows: feedback, live, loading, update } = useFeedback();
  const { rows: tenants } = useTenants();
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>("all");

  const tenantName = (id: string | null) => tenants.find((t) => t.id === id)?.name ?? null;

  const filtered = useMemo(
    () => feedback.filter((f) => statusFilter === "all" || f.status === statusFilter),
    [feedback, statusFilter],
  );

  const stats = useMemo(() => {
    const fresh = feedback.filter((f) => f.status === "new").length;
    const rated = feedback.filter((f) => f.rating != null);
    const avg = rated.length ? rated.reduce((n, f) => n + (f.rating ?? 0), 0) / rated.length : 0;
    const bugs = feedback.filter((f) => f.category === "bug" && f.status !== "closed").length;
    return { fresh, avg, bugs, total: feedback.length };
  }, [feedback]);

  const setStatus = async (id: string, status: FeedbackStatus) => {
    const ok = await update(id, { status });
    if (!ok) toast.error("Could not update feedback");
  };

  return (
    <PageContainer>
      <PageHeader
        title="Feedback"
        subtitle="What clients and partners are telling us — bugs, feature requests, praise and complaints"
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard compact label="New Items" value={stats.fresh} icon={MessageSquareHeart} iconClassName="bg-warning/15 text-warning-foreground" />
        <StatCard compact label="Avg Rating" value={stats.avg} decimals={1} suffix="/5" icon={Star} delay={0.05} />
        <StatCard compact label="Open Bugs" value={stats.bugs} icon={MessageSquareHeart} delay={0.1} />
        <StatCard compact label="Total Items" value={stats.total} icon={MessageSquareHeart} delay={0.15} />
      </div>

      <Panel className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-4">
          <h3 className="text-[15px] font-semibold">Inbox</h3>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {(["all", "new", "reviewed", "actioned", "closed"] as const).map((s) => (
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
          {filtered.map((f) => (
            <div key={f.id} className="flex flex-wrap items-start gap-4 px-5 py-4 transition-colors hover:bg-accent/40">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold">{f.authorName}</span>
                  {tenantName(f.tenantId) && (
                    <span className="text-[12px] text-muted-foreground">· {tenantName(f.tenantId)}</span>
                  )}
                  {f.rating != null && (
                    <span className="flex items-center gap-0.5 text-[12px] text-warning-foreground">
                      <Star className="size-3.5 fill-current" /> {f.rating}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{f.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill tone={CATEGORY_META[f.category].tone}>{CATEGORY_META[f.category].label}</Pill>
                  <span className="text-[11.5px] text-muted-foreground">{timeAgo(f.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Pill tone={STATUS_META[f.status].tone}>{STATUS_META[f.status].label}</Pill>
                <div className="flex gap-1.5">
                  {f.status === "new" && (
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setStatus(f.id, "reviewed")}>
                      Review
                    </Button>
                  )}
                  {f.status === "reviewed" && (
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setStatus(f.id, "actioned")}>
                      Actioned
                    </Button>
                  )}
                  {f.status !== "closed" && (
                    <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setStatus(f.id, "closed")}>
                      Close
                    </Button>
                  )}
                  {f.authorEmail && (
                    <a href={`mailto:${f.authorEmail}`}>
                      <Button size="sm" variant="ghost" className="rounded-lg">
                        Reply
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-muted-foreground">
              {loading
                ? "Loading feedback…"
                : live
                  ? "No feedback with this status."
                  : "Feedback inbox unavailable — sign in as a platform admin."}
            </div>
          )}
        </div>
      </Panel>
    </PageContainer>
  );
}
