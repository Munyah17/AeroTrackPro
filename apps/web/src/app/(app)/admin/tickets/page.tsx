"use client";

import { LifeBuoy, Plus } from "lucide-react";
import { toast } from "sonner";
import { tickets, tenantById } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { timeAgo } from "@/lib/format";

export default function TicketsPage() {
  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="Support Tickets"
        subtitle="Tickets from all client organizations in one queue"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("New ticket on behalf of a client")}>
            <Plus className="size-4" /> New Ticket
          </Button>
        }
      />

      <div className="flex flex-col gap-2.5">
        {tickets.map((t) => (
          <Panel key={t.id} hover className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LifeBuoy className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11.5px] text-muted-foreground">{t.id}</span>
                <span className="text-[14px] font-semibold">{t.subject}</span>
              </div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                {tenantById(t.tenantId)?.name} · opened {timeAgo(t.createdAt)} · last reply {timeAgo(t.lastReplyAt)}
              </div>
            </div>
            <Pill tone={t.priority === "urgent" ? "danger" : t.priority === "high" ? "warning" : "muted"}>{t.priority}</Pill>
            <Pill tone={t.status === "open" ? "warning" : t.status === "inProgress" ? "info" : "success"}>
              {t.status === "inProgress" ? "in progress" : t.status}
            </Pill>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toast.info(`Opening thread ${t.id}`)}>
              Open
            </Button>
          </Panel>
        ))}
      </div>
    </PageContainer>
  );
}
