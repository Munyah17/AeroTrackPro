"use client";

import { useMemo, useState } from "react";
import { FileCheck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLegalDocuments } from "@/hooks/use-platform-data";
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
import { cn } from "@/lib/utils";

type TermsStatus = "draft" | "published" | "archived";

const STATUS_META: Record<TermsStatus, { label: string; tone: "muted" | "info" | "success" }> = {
  draft: { label: "Draft", tone: "muted" },
  published: { label: "Published", tone: "success" },
  archived: { label: "Archived", tone: "info" },
};

const DOC_TITLES = ["Platform Terms of Service", "Partner Agreement", "Privacy Policy", "Reseller Agreement"];

export default function AdminTermsPage() {
  const { rows: docs, live, loading, insert, update, remove } = useLegalDocuments();
  const [statusFilter, setStatusFilter] = useState<"all" | TermsStatus>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: DOC_TITLES[0], version: "", effectiveAt: "", content: "" });

  const filtered = useMemo(
    () => docs.filter((t) => statusFilter === "all" || t.status === statusFilter),
    [docs, statusFilter],
  );

  const published = docs.filter((t) => t.status === "published").length;

  const addVersion = async () => {
    if (!form.title.trim() || !form.version.trim()) return toast.error("Title and version are required");
    setSaving(true);
    const ok = await insert({
      title: form.title.trim(),
      version: form.version.trim(),
      effective_at: form.effectiveAt || null,
      content: form.content.trim() || null,
    });
    setSaving(false);
    if (!ok) return toast.error("Could not save — a document with that title and version may already exist");
    toast.success(`Saved ${form.title} ${form.version} as draft`);
    setForm({ title: DOC_TITLES[0], version: "", effectiveAt: "", content: "" });
    setAddOpen(false);
  };

  const setStatus = async (id: string, status: TermsStatus, label: string) => {
    const ok = await update(id, { status });
    if (ok) toast.success(`${label} ${status === "published" ? "published" : status === "archived" ? "archived" : "reverted to draft"}`);
    else toast.error("Could not update document");
  };

  return (
    <PageContainer className="max-w-[1000px]">
      <PageHeader
        title="Terms & Conditions"
        subtitle="Legal documents clients and partners agree to — versioned, with effective dates"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> New Version
          </Button>
        }
      />

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileCheck className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Documents</h3>
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {(["all", "draft", "published", "archived"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {s === "all" ? "All" : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border/50">
          {filtered.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/40">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">
                  {t.title} <span className="ml-1 font-mono text-[12px] text-muted-foreground">{t.version}</span>
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  Updated {shortDate(t.updatedAt)}{t.createdBy ? ` by ${t.createdBy}` : ""}
                  {t.effectiveAt && ` · effective ${shortDate(t.effectiveAt)}`}
                </div>
              </div>
              <Pill tone={STATUS_META[t.status].tone}>{STATUS_META[t.status].label}</Pill>
              {t.status === "draft" && (
                <>
                  <Button size="sm" className="rounded-xl" onClick={() => setStatus(t.id, "published", `${t.title} ${t.version}`)}>
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl text-destructive hover:text-destructive"
                    onClick={async () => {
                      const ok = await remove(t.id);
                      if (ok) toast.success(`Deleted ${t.title} ${t.version}`);
                      else toast.error("Could not delete document");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
              {t.status === "published" && (
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setStatus(t.id, "archived", `${t.title} ${t.version}`)}>
                  Archive
                </Button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-muted-foreground">
              {loading
                ? "Loading documents…"
                : live
                  ? "No documents with this status."
                  : "Legal documents unavailable — sign in as a platform admin."}
            </div>
          )}
        </div>
      </Panel>

      <p className="mt-3 text-[12px] text-muted-foreground">
        {published} document{published === 1 ? "" : "s"} currently published. Clients and partners must accept the latest published version on next login.
      </p>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Document Version</DialogTitle>
            <DialogDescription>
              Draft a new version of a legal document. Publish it when it is ready to take effect.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="t-title">Document</Label>
              <select
                id="t-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {DOC_TITLES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="t-version">Version</Label>
                <Input
                  id="t-version"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  placeholder="v2.5"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="t-effective">Effective date</Label>
                <Input
                  id="t-effective"
                  type="date"
                  value={form.effectiveAt}
                  onChange={(e) => setForm({ ...form, effectiveAt: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-content">Content (optional)</Label>
              <Textarea
                id="t-content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Paste the document text…"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={addVersion} disabled={saving} className="gap-2">
              <Plus className="size-4" /> {saving ? "Saving…" : "Save Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
