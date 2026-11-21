"use client";

import { useState } from "react";
import { Bot, Download, ExternalLink, MessageCircle, Radar, Send, Target, Users } from "lucide-react";
import { toast } from "sonner";
import { useTenantTable } from "@/hooks/use-live-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { StatCard } from "@/components/shared/stat-card";
import { shortDate, usd } from "@/lib/format";

const LEAD_STATUSES = ["new", "contacted", "converted", "closed"] as const;
const PROSPECT_STATUSES = ["new", "contacted", "qualified", "converted", "disqualified"] as const;
const payTone = (s: string) =>
  s === "paid" ? "success" : s === "failed" || s === "cancelled" ? "danger" : "warning";
const intentTone = (s: string) => (s === "hot" ? "danger" : s === "cold" ? "muted" : "warning");
const runTone = (s: string) =>
  s === "done" ? "success" : s === "running" ? "info" : s === "failed" ? "danger" : "warning";

const waLink = (phone: string | null | undefined, text: string) => {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

async function updateRow(table: "leads" | "marketing_prospects", id: string, status: string) {
  const { supabase } = await import("@/lib/supabase");
  const { error } = await supabase.from(table).update({ status }).eq("id", id);
  if (error) toast.error(error.message);
  else toast.success(`Marked ${status}`);
  return !error;
}

function exportCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return toast.error("Nothing to export");
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
  toast.success(`Exported ${name}`);
}

/* ---------------- Leads tab ---------------- */

function LeadsTab() {
  const { rows: leads, loading } = useTenantTable("leads", { order: "created_at", limit: 500 });
  const { rows: payments } = useTenantTable("payments", { order: "created_at", limit: 500, tenantScoped: false });
  const paidByLead = new Map(payments.filter((p) => p.status === "paid" && p.lead_id).map((p) => [p.lead_id, p]));
  const pendingByLead = new Map(
    payments.filter((p) => p.lead_id && p.status !== "paid" && p.status !== "failed" && p.status !== "cancelled").map((p) => [p.lead_id, p]),
  );
  const [status, setStatus] = useState("all");

  const visible = leads.filter((l) => status === "all" || l.status === status);
  const thisWeek = leads.filter((l) => Date.now() - new Date(l.created_at).getTime() < 7 * 86400e3);

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total leads" value={leads.length} icon={Users} />
        <StatCard label="New this week" value={thisWeek.length} icon={Target} delay={0.05} />
        <StatCard label="Paid" value={paidByLead.size} icon={Target} iconClassName="bg-success/10 text-success" delay={0.1} />
        <StatCard label="Awaiting payment" value={pendingByLead.size} icon={Target} iconClassName="bg-warning/15 text-warning-foreground" delay={0.15} />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant="outline" className="ml-auto gap-2 rounded-xl"
          onClick={() => exportCsv("leads.csv", visible.map((l) => ({
            name: l.name, company: l.company, phone: l.phone, email: l.email,
            fleet_size: l.fleet_size, services: l.services.join(" "), status: l.status, created: l.created_at,
          })))}
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <Panel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Lead</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead className="pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((l) => {
              const pay = paidByLead.get(l.id) ?? pendingByLead.get(l.id);
              const wa = waLink(l.phone, `Hi ${l.name}, this is AeroTrack Pro following up on your tracking application.`);
              return (
                <TableRow key={l.id}>
                  <TableCell className="pl-5">
                    <div className="text-[13px] font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.company ?? "—"} · {l.fleet_size ?? "?"} vehicles</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[12.5px]">{l.phone}</div>
                    <div className="text-xs text-muted-foreground">{l.email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-[12.5px]">{l.services.join(", ") || "—"}</TableCell>
                  <TableCell>
                    {pay ? (
                      <Pill tone={payTone(pay.status)}>{pay.status} · {usd(pay.amount)}</Pill>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select value={l.status} onValueChange={(v) => v && updateRow("leads", l.id, v)}>
                      <SelectTrigger className="h-8 w-32 rounded-lg text-xs capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-[12.5px] text-muted-foreground">{shortDate(l.created_at)}</TableCell>
                  <TableCell className="pr-5">
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" className="text-success hover:opacity-70">
                        <MessageCircle className="size-4" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && !visible.length && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No leads yet — they arrive here when someone applies on the site.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>
    </>
  );
}

/* ---------------- Prospects tab ---------------- */

function ProspectsTab() {
  const { rows: prospects, loading } = useTenantTable("marketing_prospects", { order: "created_at", limit: 500, tenantScoped: false });
  const [intent, setIntent] = useState("all");
  const visible = prospects.filter((p) => intent === "all" || p.intent === intent);
  const hot = prospects.filter((p) => p.intent === "hot");

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Prospects" value={prospects.length} icon={Radar} />
        <StatCard label="Hot intent" value={hot.length} icon={Target} iconClassName="bg-destructive/10 text-destructive" delay={0.05} />
        <StatCard label="Contacted" value={prospects.filter((p) => p.status !== "new").length} icon={Send} delay={0.1} />
        <StatCard label="Converted" value={prospects.filter((p) => p.status === "converted").length} icon={Target} iconClassName="bg-success/10 text-success" delay={0.15} />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Select value={intent} onValueChange={(v) => v && setIntent(v)}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All intent</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline" className="ml-auto gap-2 rounded-xl"
          onClick={() => exportCsv("prospects.csv", visible.map((p) => ({
            company: p.company, contact: p.contact_name, phone: p.phone, whatsapp: p.whatsapp,
            email: p.email, location: p.location, industry: p.industry,
            fleet_estimate: p.fleet_estimate, intent: p.intent, source: p.source, status: p.status,
          })))}
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <Panel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Fleet</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Why they fit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((p) => {
              const wa = waLink(p.whatsapp ?? p.phone, `Hi, this is AeroTrack Pro — we help fleets like ${p.company} with GPS tracking, fuel monitoring and remote cut-off. Worth a chat?`);
              return (
                <TableRow key={p.id}>
                  <TableCell className="pl-5">
                    <div className="text-[13px] font-medium">{p.company}</div>
                    <div className="text-xs text-muted-foreground">{[p.industry, p.location].filter(Boolean).join(" · ") || "—"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[12.5px]">{p.contact_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.phone ?? p.email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-[12.5px]">{p.fleet_estimate ?? "?"}</TableCell>
                  <TableCell><Pill tone={intentTone(p.intent)}>{p.intent}</Pill></TableCell>
                  <TableCell className="max-w-64">
                    <div className="truncate text-xs text-muted-foreground" title={p.notes ?? undefined}>{p.notes ?? "—"}</div>
                    {p.source && (
                      <a href={p.source.startsWith("http") ? p.source : undefined} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                        source
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select value={p.status} onValueChange={(v) => v && updateRow("marketing_prospects", p.id, v)}>
                      <SelectTrigger className="h-8 w-32 rounded-lg text-xs capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROSPECT_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="pr-5">
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" className="text-success hover:opacity-70">
                        <MessageCircle className="size-4" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && !visible.length && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No prospects yet — send the Lead Hunter out from the next tab.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>
    </>
  );
}

/* ---------------- Lead Hunter tab ---------------- */

function HunterTab() {
  const { rows: runs, loading } = useTenantTable("marketing_runs", { order: "created_at", limit: 50, realtime: true, tenantScoped: false });
  const [command, setCommand] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!command.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/marketing/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.status === "failed") {
        toast.error("Hunter could not start — check DEVIN_API_KEY in env");
      } else {
        toast.success("Hunter dispatched — prospects land here as it finds them");
        setCommand("");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Panel className="mb-4 p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-4 text-primary" /> Lead Hunter
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Describe the hunt in plain or technical language — e.g. <em>&quot;find 25 haulage companies in Harare and Bulawayo with 10+ trucks&quot;</em> or <em>&quot;hunt insurers and auto-electricians who could resell trackers&quot;</em>. A cloud agent goes out, researches, and drops prospects into the Prospects tab.
        </p>
        <Textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="e.g. Go find every logistics and cross-border trucking company in Zimbabwe — I want their names, phones, WhatsApp numbers and fleet sizes. Prioritise anyone actively looking for tracking."
          className="min-h-24 rounded-xl"
        />
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={send} disabled={busy || !command.trim()} className="gap-2 rounded-xl">
            {busy ? <Radar className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send the Hunter
          </Button>
          <span className="text-xs text-muted-foreground">Runs in the cloud — usually a few minutes per hunt.</span>
        </div>
      </Panel>

      <Panel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Command</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prospects</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-72 pl-5">
                  <div className="truncate text-[13px]" title={r.command}>{r.command}</div>
                </TableCell>
                <TableCell><Pill tone={runTone(r.status)}>{r.status}</Pill></TableCell>
                <TableCell className="text-[13px] font-semibold tabular-nums">{r.prospect_count || "—"}</TableCell>
                <TableCell className="max-w-72">
                  <div className="truncate text-xs text-muted-foreground" title={r.summary ?? undefined}>{r.summary ?? "—"}</div>
                </TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{shortDate(r.created_at)}</TableCell>
                <TableCell className="pr-5">
                  {r.session_url && (
                    <a href={r.session_url} target="_blank" rel="noreferrer" className="text-primary hover:opacity-70">
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!loading && !runs.length && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No hunts yet — write a command above.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Panel>
    </>
  );
}

export default function MarketingPage() {
  return (
    <PageContainer className="max-w-[1200px]">
      <PageHeader title="Leads & Marketing" subtitle="Applications, hunted prospects and the lead-hunter bot" />
      <Tabs defaultValue="leads">
        <TabsList className="mb-4">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="hunter">Lead Hunter</TabsTrigger>
        </TabsList>
        <TabsContent value="leads"><LeadsTab /></TabsContent>
        <TabsContent value="prospects"><ProspectsTab /></TabsContent>
        <TabsContent value="hunter"><HunterTab /></TabsContent>
      </Tabs>
    </PageContainer>
  );
}
