"use client";

import { useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAnnouncements } from "@/hooks/use-platform-data";
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

export default function AnnouncementsPage() {
  const { rows: announcements, live, loading, insert, update, remove } = useAnnouncements();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", audience: "all" as "all" | "resellers" });

  const publish = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    setSaving(true);
    const ok = await insert({
      title: form.title.trim(),
      body: form.body.trim() || null,
      audience: form.audience,
      status: "published",
      published_at: new Date().toISOString(),
    });
    setSaving(false);
    if (!ok) return toast.error("Could not publish announcement — check your connection");
    toast.success(`"${form.title.trim()}" published to ${form.audience === "all" ? "all clients" : "resellers"}`);
    setForm({ title: "", body: "", audience: "all" });
    setAddOpen(false);
  };

  const withdraw = async (id: string, title: string) => {
    const ok = await update(id, { status: "draft" });
    if (ok) toast.success(`"${title}" withdrawn to drafts`);
    else toast.error("Could not withdraw announcement");
  };

  const republish = async (id: string, title: string) => {
    const ok = await update(id, { status: "published", published_at: new Date().toISOString() });
    if (ok) toast.success(`"${title}" republished`);
    else toast.error("Could not publish announcement");
  };

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Announcements"
        subtitle="Broadcast updates to all client organizations and their users"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> New Announcement
          </Button>
        }
      />

      <div className="flex flex-col gap-2.5">
        {announcements.map((a) => (
          <Panel key={a.id} hover className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Megaphone className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">{a.title}</div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                {a.audience === "allTenants" ? "All clients" : "Resellers only"}
                {a.publishedAt && ` · published ${shortDate(a.publishedAt)}`}
              </div>
            </div>
            <Pill tone={a.status === "published" ? "success" : "muted"}>{a.status}</Pill>
            {a.status === "published" ? (
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => withdraw(a.id, a.title)}>
                Withdraw
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => republish(a.id, a.title)}>
                Publish
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-destructive hover:text-destructive"
              onClick={async () => {
                const ok = await remove(a.id);
                if (!ok) toast.error("Could not delete announcement");
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </Panel>
        ))}
        {announcements.length === 0 && (
          <Panel className="px-5 py-10 text-center text-muted-foreground">
            {loading
              ? "Loading announcements…"
              : live
                ? "No announcements yet — publish one for all clients."
                : "Announcements unavailable — sign in as a platform admin."}
          </Panel>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>
              Broadcast a message — it appears in the portal for every organization in the audience.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="a-title">Title</Label>
              <Input
                id="a-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Scheduled maintenance — Sunday 02:00 UTC"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="a-audience">Audience</Label>
              <select
                id="a-audience"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value as "all" | "resellers" })}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="all">All client organizations</option>
                <option value="resellers">Resellers only</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="a-body">Message (optional)</Label>
              <Textarea
                id="a-body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Details for your clients…"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={publish} disabled={saving} className="gap-2">
              <Megaphone className="size-4" /> {saving ? "Publishing…" : "Publish Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
