"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Loader2, Plus, Search, Radio } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useResellerClients } from "@/hooks/use-platform-data";
import type { ResellerClient } from "@/lib/reseller";

interface ProvisionedLogin {
  email: string;
  tempPassword: string;
}

export default function ResellerClientsPage() {
  const { rows: liveClients, live, refresh } = useResellerClients();
  const [added, setAdded] = useState<ResellerClient[]>([]);
  const clients: ResellerClient[] = [...added, ...liveClients];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", adminName: "", adminEmail: "" });
  const [credentials, setCredentials] = useState<ProvisionedLogin | null>(null);

  const filtered = clients.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.contact.toLowerCase().includes(query.toLowerCase()),
  );

  const resetDialog = () => {
    setForm({ name: "", adminName: "", adminEmail: "" });
    setCredentials(null);
    setBusy(false);
  };

  const copyLogin = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => toast.success("Copied"));
  };

  const addClient = async () => {
    const name = form.name.trim();
    const adminEmail = form.adminEmail.trim();
    if (!name) return toast.error("Organisation name is required");
    if (!adminEmail) return toast.error("Admin email is required — it becomes their login");

    setBusy(true);
    try {
      const r = await fetch("/api/portal/provision-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          adminName: form.adminName.trim() || name,
          adminEmail,
        }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        client?: ResellerClient & { contact: string };
        login?: ProvisionedLogin;
      };

      if (!r.ok || !data.ok) {
        if (r.status === 401) {
          toast.error("Sign in first", {
            description: "A reseller session is required to provision client accounts.",
          });
        } else if (data.error === "provisioning_unavailable") {
          /* demo mode — service role absent: still show the row locally */
          setAdded((prev) => [
            {
              id: `cl-${Date.now()}`,
              name,
              contact: adminEmail,
              devices: 0,
              activeDevices: 0,
              joinedAt: new Date().toISOString(),
              status: "trial",
            },
            ...prev,
          ]);
          toast.info("Demo mode", {
            description: "Service role isn't configured — client shown locally only.",
          });
          setOpen(false);
          resetDialog();
        } else {
          toast.error("Couldn't create the client", { description: data.message ?? `HTTP ${r.status}` });
        }
        setBusy(false);
        return;
      }

      setAdded((prev) => [
        {
          id: data.client?.id ?? `cl-${Date.now()}`,
          name,
          contact: adminEmail,
          devices: 0,
          activeDevices: 0,
          joinedAt: new Date().toISOString(),
          status: "trial",
        },
        ...prev,
      ]);
      setCredentials(data.login ?? null);
      refresh();
      setBusy(false);
    } catch {
      toast.error("Network error", { description: "Could not reach the provisioning API." });
      setBusy(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="My Clients"
        subtitle="Organisations you provide tracking services to"
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) resetDialog();
            }}
          >
            <DialogTrigger
              render={
                <Button className="gap-2 rounded-xl shadow-card">
                  <Plus className="size-4" /> Add Client
                </Button>
              }
            />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{credentials ? "Client account created" : "Add a client"}</DialogTitle>
              </DialogHeader>

              {credentials ? (
                <div className="space-y-4 pt-4">
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-[13px] text-emerald-900">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <p>
                      <b>{form.name}</b> is provisioned. Share these login details with the client —
                      the password is shown once and must be changed on first sign-in.
                    </p>
                  </div>
                  <div className="space-y-2.5 rounded-xl border border-border/70 bg-muted/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-muted-foreground">Login email</div>
                        <div className="font-mono text-[13px] font-semibold">{credentials.email}</div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => copyLogin(credentials.email)}>
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-muted-foreground">Temporary password</div>
                        <div className="font-mono text-[13px] font-semibold">{credentials.tempPassword}</div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => copyLogin(credentials.tempPassword)}>
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-muted-foreground">They sign in at</div>
                        <div className="font-mono text-[13px] font-semibold">/login</div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => copyLogin(`${window.location.origin}/login`)}>
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Button onClick={() => { setOpen(false); resetDialog(); }} className="w-full rounded-xl">Done</Button>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Organisation name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" placeholder="Acme Logistics" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Admin name</Label>
                    <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} className="rounded-xl" placeholder="Tendai Moyo" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Admin email — becomes their login</Label>
                    <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} className="rounded-xl" placeholder="fleet@acme.co.zw" />
                  </div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    Creates a real organisation under your account plus a sign-in for its admin —
                    they land in the tracking portal.
                  </p>
                  <Button onClick={() => void addClient()} disabled={busy} className="w-full rounded-xl">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Create client account"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      {!live && (
        <p className="mb-3 text-[12px] text-muted-foreground">
          Demo data — sign in as a reseller to see your real downline.
        </p>
      )}
      <Panel>
        <div className="border-b border-border/60 p-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients..."
              className="h-9 rounded-xl pl-9 text-[13px]"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Devices</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-5 font-medium">{c.name}</TableCell>
                  <TableCell className="text-[12.5px] text-muted-foreground">{c.contact}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <Radio className="size-3.5 text-muted-foreground" />
                      {c.devices}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.activeDevices}</TableCell>
                  <TableCell>
                    <Pill tone={c.status === "active" ? "success" : c.status === "trial" ? "warning" : "danger"}>
                      {c.status}
                    </Pill>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </PageContainer>
  );
}
