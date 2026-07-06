"use client";

import { Mail, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const TEMPLATES = [
  { name: "Welcome Email", type: "System", updated: "May 30, 2026" },
  { name: "Password Reset", type: "System", updated: "May 18, 2026" },
  { name: "Low Battery Alert", type: "Alert", updated: "May 15, 2026" },
  { name: "Geofence Alert", type: "Alert", updated: "May 12, 2026" },
  { name: "Overspeed Alert", type: "Alert", updated: "May 12, 2026" },
  { name: "Invoice Issued", type: "Billing", updated: "Apr 28, 2026" },
  { name: "Maintenance Reminder", type: "Alert", updated: "Apr 20, 2026" },
  { name: "Weekly Fleet Summary", type: "Digest", updated: "Apr 12, 2026" },
];

export default function EmailTemplatesPage() {
  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Email Templates"
        subtitle="Branded transactional and alert emails — per organization overrides supported"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Template editor with variables like {{vehicle.plate}} and live preview")}>
            <Plus className="size-4" /> New Template
          </Button>
        }
      />

      <Panel className="divide-y divide-border/50">
        {TEMPLATES.map((t) => (
          <div key={t.name} className="flex items-center gap-4 px-5 py-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">{t.name}</div>
              <div className="text-[11.5px] text-muted-foreground">Updated {t.updated}</div>
            </div>
            <Pill tone={t.type === "System" ? "muted" : t.type === "Alert" ? "warning" : t.type === "Billing" ? "primary" : "info"}>
              {t.type}
            </Pill>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toast.info(`Editing ${t.name}`)}>
              Edit
            </Button>
          </div>
        ))}
      </Panel>
    </PageContainer>
  );
}
