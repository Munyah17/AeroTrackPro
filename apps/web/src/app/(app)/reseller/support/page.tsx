"use client";

import { useState } from "react";
import { LifeBuoy, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useSupportTickets } from "@/hooks/use-platform-data";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ResellerSupportPage() {
  const { insert } = useSupportTickets();
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    setSending(true);
    const ok = await insert({
      user_id: null,
      subject: details.trim() ? `${subject.trim()} — ${details.trim()}` : subject.trim(),
    });
    setSending(false);
    if (ok) {
      toast.success("Ticket submitted — we'll reply by email");
      setSubject("");
      setDetails("");
    } else {
      toast.info("Demo mode — sign in to submit tickets");
    }
  };

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
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl" placeholder="Brief summary" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Details</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} className="resize-none rounded-xl" placeholder="Describe the issue..." />
          </div>
          <Button onClick={submit} disabled={sending} className="rounded-xl">
            {sending ? "Submitting…" : "Submit Ticket"}
          </Button>
        </div>
      </Panel>
    </PageContainer>
  );
}
