"use client";

import { Download, Receipt } from "lucide-react";
import { toast } from "sonner";
import { invoices, tenantById } from "@aerotrack/shared";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { shortDate, usd } from "@/lib/format";

export default function PaymentsPage() {
  const paid = invoices.filter((i) => i.status === "paid");
  const revenue = paid.reduce((n, i) => n + i.amountUsd, 0);

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Payment History"
        subtitle="Invoices and transactions across all client organizations"
        actions={
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => toast.success("Statement exported — payments.csv")}>
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Collected (90d)" value={revenue} suffix="USD" icon={Receipt} iconClassName="bg-success/10 text-success" />
        <StatCard label="Invoices Paid" value={paid.length} icon={Receipt} delay={0.05} />
        <StatCard label="Pending" value={invoices.filter((i) => i.status === "pending").length} icon={Receipt} iconClassName="bg-warning/15 text-warning-foreground" delay={0.1} />
        <StatCard label="Overdue" value={invoices.filter((i) => i.status === "overdue").length} icon={Receipt} iconClassName="bg-destructive/10 text-destructive" delay={0.15} />
      </div>

      <Panel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Invoice</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="pl-5 font-mono text-[12.5px] font-medium">{i.number}</TableCell>
                <TableCell className="text-[13px]">{tenantById(i.tenantId)?.name}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{usd(i.amountUsd)}</TableCell>
                <TableCell>
                  <Pill tone={i.status === "paid" ? "success" : i.status === "pending" ? "warning" : "danger"}>{i.status}</Pill>
                </TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{shortDate(i.issuedAt)}</TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{i.paidAt ? shortDate(i.paidAt) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </PageContainer>
  );
}
