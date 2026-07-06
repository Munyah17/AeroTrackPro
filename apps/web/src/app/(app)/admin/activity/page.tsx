"use client";

import { History } from "lucide-react";
import { activityLogs, tenantById } from "@aerotrack/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { timeAgo } from "@/lib/format";

export default function ActivityPage() {
  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader title="Activity Logs" subtitle="Full audit trail of actions across the platform" />

      <Panel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>IP</TableHead>
              <TableHead className="text-right pr-5">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activityLogs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="pl-5 text-[13px] font-medium">{l.userName}</TableCell>
                <TableCell className="text-[13px]">{l.action}</TableCell>
                <TableCell><Pill tone="muted">{l.module}</Pill></TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{tenantById(l.tenantId)?.name}</TableCell>
                <TableCell className="font-mono text-[11.5px] text-muted-foreground">{l.ip}</TableCell>
                <TableCell className="pr-5 text-right text-[12px] text-muted-foreground">{timeAgo(l.at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center gap-2 border-t border-border/60 px-5 py-3 text-[12px] text-muted-foreground">
          <History className="size-3.5" /> Logs are retained for 12 months
        </div>
      </Panel>
    </PageContainer>
  );
}
