"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeResellerBill } from "@/lib/reseller";
import { downloadCsv } from "@/lib/export";
import { usd } from "@/lib/format";

const MONTHS = ["Jul 2026", "Jun 2026", "May 2026", "Apr 2026", "Mar 2026", "Feb 2026"];

export default function ResellerInvoicesPage() {
  const bill = computeResellerBill();
  const invoices = MONTHS.map((m, i) => ({
    number: `RSL-${String(1042 - i).padStart(4, "0")}`,
    period: m,
    amount: bill.monthlyTotal * (1 - i * 0.03),
    status: i === 0 ? ("pending" as const) : ("paid" as const),
  }));

  const exportAll = () => {
    downloadCsv(
      "reseller-invoices",
      ["Invoice", "Period", "Amount (USD)", "Status"],
      invoices.map((v) => [v.number, v.period, v.amount.toFixed(2), v.status]),
    );
    toast.success("Invoices exported");
  };

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Invoices"
        subtitle="Your monthly platform invoices"
        actions={
          <Button variant="outline" className="gap-2 rounded-xl" onClick={exportAll}>
            <Download className="size-4" /> Export
          </Button>
        }
      />
      <Panel className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Invoice</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((v) => (
              <TableRow key={v.number}>
                <TableCell className="pl-5 font-mono text-[12.5px]">{v.number}</TableCell>
                <TableCell className="text-[13px]">{v.period}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{usd(v.amount)}</TableCell>
                <TableCell>
                  <Pill tone={v.status === "paid" ? "success" : "warning"}>{v.status}</Pill>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => toast.success(`${v.number} downloaded`)}>
                    <Download className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </PageContainer>
  );
}
