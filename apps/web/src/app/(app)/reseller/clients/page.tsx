"use client";

import { useState } from "react";
import { Plus, Search, Radio } from "lucide-react";
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
import { RESELLER_CLIENTS, type ResellerClient } from "@/lib/reseller";

export default function ResellerClientsPage() {
  const [clients, setClients] = useState<ResellerClient[]>(RESELLER_CLIENTS);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", devices: "" });

  const filtered = clients.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.contact.toLowerCase().includes(query.toLowerCase()),
  );

  const addClient = () => {
    if (!form.name.trim()) return toast.error("Client name is required");
    const devices = Math.max(0, parseInt(form.devices || "0"));
    setClients((prev) => [
      {
        id: `cl-${Date.now()}`,
        name: form.name.trim(),
        contact: form.contact.trim() || "—",
        devices,
        activeDevices: devices,
        joinedAt: new Date().toISOString(),
        status: "trial",
      },
      ...prev,
    ]);
    setOpen(false);
    setForm({ name: "", contact: "", devices: "" });
    toast.success(`${form.name} added to your downline`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="My Clients"
        subtitle="Organisations you provide tracking services to"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="gap-2 rounded-xl shadow-card">
                  <Plus className="size-4" /> Add Client
                </Button>
              }
            />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add a client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Organisation name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" placeholder="Acme Logistics" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Contact email</Label>
                  <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="rounded-xl" placeholder="fleet@acme.co.zw" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Initial devices</Label>
                  <Input type="number" value={form.devices} onChange={(e) => setForm({ ...form, devices: e.target.value })} className="rounded-xl" placeholder="0" />
                </div>
                <Button onClick={addClient} className="w-full rounded-xl">Add Client</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

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
