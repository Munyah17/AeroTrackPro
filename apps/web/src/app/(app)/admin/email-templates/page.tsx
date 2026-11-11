"use client";

import { useState } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEmailTemplates, useTenants, type EmailTemplate } from "@/hooks/use-platform-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { shortDate } from "@/lib/format";

const KINDS = ["system", "alert", "billing", "digest"] as const;
const KIND_LABEL: Record<EmailTemplate["kind"], string> = {
  system: "System",
  alert: "Alert",
  billing: "Billing",
  digest: "Digest",
};

interface TemplateForm {
  id: string | null;
  name: string;
  kind: EmailTemplate["kind"];
  subject: string;
  body: string;
}

const EMPTY: TemplateForm = { id: null, name: "", kind: "system", subject: "", body: "" };

export default function EmailTemplatesPage() {
  const { rows: templates, live, loading, insert, update, remove } = useEmailTemplates();
  const { rows: tenants } = useTenants();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TemplateForm>(EMPTY);

  const openEdit = (t: EmailTemplate) =>
    setForm({ id: t.id, name: t.name, kind: t.kind, subject: t.subject, body: t.body });

  const save = async () => {
    if (!form.name.trim()) return toast.error("Template name is required");
    setSaving(true);
    const ok = form.id
      ? await update(form.id, {
          name: form.name.trim(),
          kind: form.kind,
          subject: form.subject,
          body: form.body,
        })
      : await insert({
          name: form.name.trim(),
          kind: form.kind,
          subject: form.subject,
          body: form.body,
        });
    setSaving(false);
    if (!ok) return toast.error("Could not save template — a template with this name may already exist");
    toast.success(`"${form.name.trim()}" ${form.id ? "updated" : "created"}`);
    setForm(EMPTY);
    setEditOpen(false);
  };

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Email Templates"
        subtitle="Branded transactional and alert emails — per organization overrides supported"
        actions={
          <Button
            className="gap-2 rounded-xl shadow-card"
            onClick={() => {
              setForm(EMPTY);
              setEditOpen(true);
            }}
          >
            <Plus className="size-4" /> New Template
          </Button>
        }
      />

      <Panel className="divide-y divide-border/50">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">
                {t.name}
                {t.tenantId && (
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                    ({tenants.find((x) => x.id === t.tenantId)?.name ?? "org"} override)
                  </span>
                )}
              </div>
              <div className="text-[11.5px] text-muted-foreground">
                {t.subject ? `"${t.subject.slice(0, 60)}" · ` : ""}Updated {shortDate(t.updatedAt)}
              </div>
            </div>
            <Pill tone={t.kind === "system" ? "muted" : t.kind === "alert" ? "warning" : t.kind === "billing" ? "primary" : "info"}>
              {KIND_LABEL[t.kind]}
            </Pill>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                openEdit(t);
                setEditOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-destructive hover:text-destructive"
              onClick={async () => {
                const ok = await remove(t.id);
                if (ok) toast.success(`"${t.name}" deleted`);
                else toast.error("Could not delete template");
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="px-5 py-10 text-center text-muted-foreground">
            {loading
              ? "Loading templates…"
              : live
                ? "No email templates yet — create the platform defaults."
                : "Email templates unavailable — sign in as a platform admin."}
          </div>
        )}
      </Panel>

      <p className="mt-3 text-[12px] text-muted-foreground">
        Variables like {"{{vehicle.plate}}"}, {"{{user.name}}"} and {"{{org.name}}"} are substituted at send time.
      </p>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? `Edit ${form.name}` : "New Template"}</DialogTitle>
            <DialogDescription>
              Platform-default template — organizations can add their own overrides.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="et-name">Name</Label>
                <Input
                  id="et-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Overspeed Alert"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="et-kind">Kind</Label>
                <select
                  id="et-kind"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value as EmailTemplate["kind"] })}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>{KIND_LABEL[k]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="et-subject">Subject line</Label>
              <Input
                id="et-subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. {{vehicle.plate}} exceeded the speed limit"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="et-body">Body</Label>
              <Textarea
                id="et-body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={6}
                placeholder="Email body — variables in {{curly braces}} are replaced at send time."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : form.id ? "Save Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
