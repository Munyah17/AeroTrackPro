"use client";

import { useState } from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeviceGroups, useTenants, type DeviceGroup } from "@/hooks/use-platform-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

const COLORS = ["#1E40FF", "#7c3aed", "#059669", "#d97706", "#0891b2", "#dc2626"];

interface GroupForm {
  id: string | null;
  name: string;
  color: string;
  tenantId: string;
}

const EMPTY: GroupForm = { id: null, name: "", color: COLORS[0], tenantId: "" };

export default function DeviceGroupsPage() {
  const { rows: groups, live, loading, insert, update, remove } = useDeviceGroups();
  const { rows: tenants } = useTenants();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<GroupForm>(EMPTY);

  const openEdit = (g: DeviceGroup) =>
    setForm({ id: g.id, name: g.name, color: g.color, tenantId: g.tenantId ?? "" });

  const save = async () => {
    if (!form.name.trim()) return toast.error("Group name is required");
    setSaving(true);
    const ok = form.id
      ? await update(form.id, { name: form.name.trim(), color: form.color })
      : await insert({
          name: form.name.trim(),
          color: form.color,
          tenant_id: form.tenantId || undefined,
        });
    setSaving(false);
    if (!ok) return toast.error("Could not save group — check your connection");
    toast.success(`"${form.name.trim()}" ${form.id ? "updated" : "created"}`);
    setForm(EMPTY);
    setEditOpen(false);
  };

  const tenantName = (id: string | null) =>
    id ? tenants.find((t) => t.id === id)?.name ?? "Unknown org" : "Platform-wide";

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Device Groups"
        subtitle="Organize devices for easier management, permissions and reporting"
        actions={
          <Button
            className="gap-2 rounded-xl shadow-card"
            onClick={() => {
              setForm(EMPTY);
              setEditOpen(true);
            }}
          >
            <Plus className="size-4" /> Add Group
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {groups.map((g) => (
          <Panel key={g.id} hover className="flex items-center gap-4 p-4.5">
            <div
              className="flex size-11 items-center justify-center rounded-xl"
              style={{ background: `${g.color}18`, color: g.color }}
            >
              <Package className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">{g.name}</div>
              <div className="text-[12px] text-muted-foreground">{tenantName(g.tenantId)}</div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              onClick={() => {
                openEdit(g);
                setEditOpen(true);
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg text-destructive"
              onClick={async () => {
                const ok = await remove(g.id);
                if (ok) toast.success(`"${g.name}" deleted`);
                else toast.error("Could not delete group");
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </Panel>
        ))}
      </div>

      {groups.length === 0 && (
        <Panel className="mt-4 px-5 py-10 text-center text-muted-foreground">
          {loading
            ? "Loading groups…"
            : live
              ? "No device groups yet — create one to organize the inventory."
              : "Device groups unavailable — sign in as a platform admin."}
        </Panel>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? `Edit ${form.name}` : "New Device Group"}</DialogTitle>
            <DialogDescription>
              Groups let you filter and report on device subsets across organizations.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="g-name">Group name</Label>
              <Input
                id="g-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Trucks"
              />
            </div>
            {!form.id && (
              <div className="grid gap-1.5">
                <Label htmlFor="g-tenant">Scope</Label>
                <select
                  id="g-tenant"
                  value={form.tenantId}
                  onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">Platform-wide</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className="size-8 rounded-lg border-2 transition-transform hover:scale-110"
                    style={{
                      background: c,
                      borderColor: form.color === c ? "white" : "transparent",
                      outline: form.color === c ? `2px solid ${c}` : "none",
                    }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : form.id ? "Save Group" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
