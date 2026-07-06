"use client";

import { Megaphone, Plus } from "lucide-react";
import { toast } from "sonner";
import { announcements } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { shortDate } from "@/lib/format";

export default function AnnouncementsPage() {
  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Announcements"
        subtitle="Broadcast updates to all client organizations and their users"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Composer: title, rich body, audience, schedule")}>
            <Plus className="size-4" /> New Announcement
          </Button>
        }
      />

      <div className="flex flex-col gap-2.5">
        {announcements.map((a) => (
          <Panel key={a.id} hover className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Megaphone className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">{a.title}</div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                {a.audience === "allTenants" ? "All clients" : "Selected clients"}
                {a.publishedAt && ` · published ${shortDate(a.publishedAt)}`}
              </div>
            </div>
            <Pill tone={a.status === "published" ? "success" : "muted"}>{a.status}</Pill>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toast.info(`Editing "${a.title}"`)}>
              Edit
            </Button>
          </Panel>
        ))}
      </div>
    </PageContainer>
  );
}
