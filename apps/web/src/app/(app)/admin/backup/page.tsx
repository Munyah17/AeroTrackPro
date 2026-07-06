"use client";

import { DatabaseBackup, HardDrive, History, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const HISTORY = [
  { at: "Jul 6, 2026 02:00", size: "4.2 GB", status: "success" },
  { at: "Jul 5, 2026 02:00", size: "4.2 GB", status: "success" },
  { at: "Jul 4, 2026 02:00", size: "4.1 GB", status: "success" },
  { at: "Jul 3, 2026 02:00", size: "4.1 GB", status: "failed" },
  { at: "Jul 2, 2026 02:00", size: "4.0 GB", status: "success" },
];

export default function BackupPage() {
  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader title="Backup & Restore" subtitle="Platform data protection and disaster recovery" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel className="p-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <DatabaseBackup className="size-4.5 text-primary" /> Backups
          </h3>
          <div className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last backup</span>
              <span className="font-medium">Today, 02:00 AM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next scheduled</span>
              <span className="font-medium">Tomorrow, 02:00 AM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Retention</span>
              <span className="font-medium">30 daily · 12 monthly</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <span className="font-medium">Automatic backups</span>
              <Switch defaultChecked onCheckedChange={(c) => toast.success(`Automatic backups ${c ? "enabled" : "disabled"}`)} />
            </div>
          </div>
          <Button
            className="mt-5 w-full gap-2 rounded-xl shadow-card"
            onClick={() => toast.success("Backup started", { description: "Positions, tenants, configs and media — you'll be notified when complete." })}
          >
            <Play className="size-4" /> Create Backup Now
          </Button>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
            <History className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Backup History</h3>
          </div>
          <div className="divide-y divide-border/50">
            {HISTORY.map((h) => (
              <div key={h.at} className="flex items-center gap-3 px-5 py-3">
                <HardDrive className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{h.at}</div>
                  <div className="text-[11.5px] text-muted-foreground">{h.size}</div>
                </div>
                <Pill tone={h.status === "success" ? "success" : "danger"}>{h.status}</Pill>
                {h.status === "success" && (
                  <Button size="xs" variant="outline" className="rounded-lg" onClick={() => toast.warning("Restore requires super-admin 2FA confirmation")}>
                    Restore
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
