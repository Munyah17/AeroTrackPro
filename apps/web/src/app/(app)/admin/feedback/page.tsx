"use client";

import { useMemo, useState } from "react";
import { MessageSquareHeart, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type FeedbackStatus = "new" | "reviewed" | "actioned" | "closed";
type FeedbackCategory = "bug" | "feature" | "praise" | "complaint";

interface FeedbackItem {
  id: string;
  from: string;
  tenant: string;
  category: FeedbackCategory;
  message: string;
  rating?: number;
  status: FeedbackStatus;
  createdAt: string;
}

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

const DEMO_FEEDBACK: FeedbackItem[] = [
  { id: "fb-1", from: "Tendai Moyo", tenant: "Delta Beverages", category: "feature", message: "Please add fuel-theft alerts to the mobile app push notifications — our drivers keep missing them.", rating: 4, status: "new", createdAt: "2026-11-09T13:20:00Z" },
  { id: "fb-2", from: "Rutendo Moyo", tenant: "Harare City Cabs", category: "bug", message: "Trip history shows duplicate entries when a vehicle crosses a geofence boundary twice in one minute.", rating: 2, status: "new", createdAt: "2026-11-09T10:05:00Z" },
  { id: "fb-3", from: "Brian Chikafu", tenant: "Croco Motors", category: "praise", message: "The new driving-behavior scoring is brilliant — our insurance broker noticed the improvement immediately.", rating: 5, status: "reviewed", createdAt: "2026-11-08T15:40:00Z" },
  { id: "fb-4", from: "Grace Ndlovu", tenant: "Zimgold Distribution", category: "complaint", message: "Invoice PDF layout is broken on mobile — amounts overlap the client address block.", rating: 2, status: "actioned", createdAt: "2026-11-07T09:12:00Z" },
  { id: "fb-5", from: "Simba Dube", tenant: "MoveTrack Solutions", category: "feature", message: "Would love a WhatsApp channel for alerts — SMS costs are adding up for our clients.", rating: 4, status: "reviewed", createdAt: "2026-11-06T14:55:00Z" },
  { id: "fb-6", from: "Chipo Moyo", tenant: "AutoGuard Distributors", category: "praise", message: "Onboarding a new installer took under 10 minutes. The partner portal is exactly what we needed.", rating: 5, status: "closed", createdAt: "2026-11-04T11:30:00Z" },
];

export default function AdminFeedbackPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>("all");

  const filtered = useMemo(
    () => DEMO_FEEDBACK.filter((f) => statusFilter === "all" || f.status === statusFilter),
    [statusFilter],
  );

  const stats = useMemo(() => {
    const fresh = DEMO_FEEDBACK.filter((f) => f.status === "new").length;
    const avg = DEMO_FEEDBACK.reduce((n, f) => n + (f.rating ?? 0), 0) / DEMO_FEEDBACK.length;
    const bugs = DEMO_FEEDBACK.filter((f) => f.category === "bug").length;
    return { fresh, avg, bugs, total: DEMO_FEEDBACK.length };
  }, []);

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
                  <span className="text-[13.5px] font-semibold">{f.from}</span>
                  <span className="text-[12px] text-muted-foreground">· {f.tenant}</span>
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
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toast.info(`Marked reviewed: ${f.id}`)}>
                      Review
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => toast.info(`Replying to ${f.from}`)}>
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-muted-foreground">No feedback with this status.</div>
          )}
        </div>
      </Panel>
    </PageContainer>
  );
}
