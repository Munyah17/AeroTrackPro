"use client";

import { LifeBuoy, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ResellerSupportPage() {
  return (
    <PageContainer className="max-w-[800px]">
      <PageHeader title="Support" subtitle="Get help from the platform team" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: Mail, label: "Email", value: "support@aerotrack.pro" },
          { icon: MessageSquare, label: "Live chat", value: "Mon–Fri, 8am–6pm CAT" },
          { icon: LifeBuoy, label: "Priority SLA", value: "Included in your plan" },
        ].map((c) => (
          <Panel key={c.label} className="p-4">
            <c.icon className="size-5 text-primary" />
            <div className="mt-2 text-[13px] font-semibold">{c.label}</div>
            <div className="text-[12px] text-muted-foreground">{c.value}</div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-4 p-6">
        <h3 className="text-[15px] font-semibold">Open a ticket</h3>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Subject</Label>
            <Input className="rounded-xl" placeholder="Brief summary" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Details</Label>
            <Textarea rows={4} className="resize-none rounded-xl" placeholder="Describe the issue..." />
          </div>
          <Button onClick={() => toast.success("Ticket submitted — we'll reply by email")} className="rounded-xl">
            Submit Ticket
          </Button>
        </div>
      </Panel>
    </PageContainer>
  );
}
