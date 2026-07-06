"use client";

import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { tenants } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { shortDate } from "@/lib/format";

const SUBS = [
  { name: "Alpha Fleet", parent: "SpeedTrack Ltd", admin: "alpha@speedtrack.co.zw", status: "active", created: 60 },
  { name: "Beta Logistics", parent: "SpeedTrack Ltd", admin: "beta@speedtrack.co.zw", status: "active", created: 55 },
  { name: "Gamma Transport", parent: "Metro GPS Solutions", admin: "gamma@metrogps.com", status: "suspended", created: 43 },
  { name: "Delta Movers", parent: "SafeFleet Systems", admin: "delta@safefleet.com", status: "active", created: 31 },
  { name: "Epsilon Couriers", parent: "Guardian Tracking", admin: "ops@epsilon.co.zw", status: "active", created: 12 },
];

export default function SubAccountsPage() {
  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="Sub-Accounts"
        subtitle="Fleet customers nested under each client organization"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => toast.info("Create sub-account under a parent organization")}>
            <Plus className="size-4" /> Add Sub-Account
          </Button>
        }
      />

      <Panel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Sub-Account</TableHead>
              <TableHead>Parent Organization</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SUBS.map((s) => (
              <TableRow key={s.name}>
                <TableCell className="pl-5">
                  <span className="flex items-center gap-2.5 text-[13.5px] font-semibold">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Users className="size-4" />
                    </span>
                    {s.name}
                  </span>
                </TableCell>
                <TableCell className="text-[13px]">{s.parent}</TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{s.admin}</TableCell>
                <TableCell><Pill tone={s.status === "active" ? "success" : "danger"}>{s.status}</Pill></TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">
                  {shortDate(new Date(Date.now() - s.created * 86400000).toISOString())}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-border/60 px-5 py-3 text-[12px] text-muted-foreground">
          {SUBS.length} sub-accounts across {tenants.length} organizations
        </div>
      </Panel>
    </PageContainer>
  );
}
