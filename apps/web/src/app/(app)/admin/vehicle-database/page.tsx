"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Car, Plus, Search, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  DIFFICULTY_LABEL,
  VEHICLE_CATEGORIES,
  fetchAllVehicleProfiles,
  yearsLabel,
  type VehicleProfile,
} from "@/lib/vehicle-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";

const EMPTY_FORM = {
  slug: "", make: "", model: "", variant: "", year_from: "", year_to: "",
  category: "compact", market: "", voltage: "12V", difficulty: "easy",
  hybrid_or_ev: false, canbus: false,
  fusebox_notes: "", cutoff_notes: "", fuel_sensor_notes: "",
  accessories_notes: "", install_notes: "", zimbabwe_notes: "",
};

export default function VehicleDatabasePage() {
  const [rows, setRows] = useState<VehicleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const reload = useCallback(async () => {
    setRows(await fetchAllVehicleProfiles());
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.make} ${r.model} ${r.variant ?? ""}`.toLowerCase().includes(q),
    );
  }, [rows, query]);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!form.slug || !form.make || !form.model) {
      toast.error("slug, make and model are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vehicle_profiles").insert({
      slug: form.slug.trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      variant: form.variant || null,
      year_from: form.year_from ? Number(form.year_from) : null,
      year_to: form.year_to ? Number(form.year_to) : null,
      category: form.category as VehicleProfile["category"],
      market: form.market || null,
      voltage: form.voltage as VehicleProfile["voltage"],
      difficulty: form.difficulty as VehicleProfile["difficulty"],
      hybrid_or_ev: form.hybrid_or_ev,
      canbus: form.canbus,
      fusebox_notes: form.fusebox_notes || null,
      cutoff_notes: form.cutoff_notes || null,
      fuel_sensor_notes: form.fuel_sensor_notes || null,
      accessories_notes: form.accessories_notes || null,
      install_notes: form.install_notes || null,
      zimbabwe_notes: form.zimbabwe_notes || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("authenticated") || error.code === "42501"
        ? "Sign in with an admin account to add profiles"
        : `Save failed: ${error.message}`);
      return;
    }
    toast.success(`${form.make} ${form.model} added`);
    setForm(EMPTY_FORM);
    setShowForm(false);
    reload();
  }

  async function togglePublished(p: VehicleProfile) {
    const { error } = await supabase
      .from("vehicle_profiles")
      .update({ is_published: !p.is_published })
      .eq("id", p.id);
    if (error) { toast.error(`Update failed: ${error.message}`); return; }
    setRows((r) => r.map((x) => (x.id === p.id ? { ...x, is_published: !p.is_published } : x)));
  }

  async function removeProfile(p: VehicleProfile) {
    const { error } = await supabase.from("vehicle_profiles").delete().eq("id", p.id);
    if (error) { toast.error(`Delete failed: ${error.message}`); return; }
    setRows((r) => r.filter((x) => x.id !== p.id));
    toast.success(`${p.make} ${p.model} removed`);
  }

  return (
    <PageContainer className="max-w-[1100px]">
      <PageHeader
        title="Vehicle Database"
        subtitle="Compatibility profiles powering the public /supported-vehicles page"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setShowForm((s) => !s)}>
            <Plus className="size-4" /> {showForm ? "Close Form" : "Add Profile"}
          </Button>
        }
      />

      {showForm && (
        <Panel className="mb-4 p-5">
          <h3 className="text-[15px] font-semibold">New vehicle profile</h3>
          <form onSubmit={saveProfile} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><Label className="text-xs">Slug (unique)</Label>
              <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="toyota-vitz-yp130" className="mt-1" /></div>
            <div><Label className="text-xs">Make</Label>
              <Input value={form.make} onChange={(e) => set("make", e.target.value)} placeholder="Toyota" className="mt-1" /></div>
            <div><Label className="text-xs">Model</Label>
              <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Vitz / Yaris" className="mt-1" /></div>
            <div><Label className="text-xs">Variant / generation</Label>
              <Input value={form.variant} onChange={(e) => set("variant", e.target.value)} placeholder="XP130" className="mt-1" /></div>
            <div><Label className="text-xs">Year from</Label>
              <Input value={form.year_from} onChange={(e) => set("year_from", e.target.value)} placeholder="2010" className="mt-1" /></div>
            <div><Label className="text-xs">Year to (blank = current)</Label>
              <Input value={form.year_to} onChange={(e) => set("year_to", e.target.value)} placeholder="2019" className="mt-1" /></div>
            <div><Label className="text-xs">Category</Label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {VEHICLE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select></div>
            <div><Label className="text-xs">Market</Label>
              <Input value={form.market} onChange={(e) => set("market", e.target.value)} placeholder="JDM import" className="mt-1" /></div>
            <div><Label className="text-xs">Voltage</Label>
              <select value={form.voltage} onChange={(e) => set("voltage", e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {["12V", "24V", "hybrid", "EV"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select></div>
            <div><Label className="text-xs">Difficulty</Label>
              <select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {["easy", "moderate", "advanced"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select></div>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input type="checkbox" checked={form.hybrid_or_ev}
                onChange={(e) => set("hybrid_or_ev", e.target.checked)} /> Hybrid / EV
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input type="checkbox" checked={form.canbus}
                onChange={(e) => set("canbus", e.target.checked)} /> CAN bus
            </label>
            {(
              [
                ["fusebox_notes", "Power & fuse box notes"],
                ["cutoff_notes", "Engine cut-off guidance"],
                ["fuel_sensor_notes", "Fuel level sensor notes"],
                ["accessories_notes", "Accessories notes"],
                ["install_notes", "Installer's notes"],
                ["zimbabwe_notes", "Zimbabwe market notes"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="sm:col-span-3">
                <Label className="text-xs">{label}</Label>
                <textarea
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div className="sm:col-span-3">
              <Button type="submit" disabled={saving} className="rounded-xl">
                {saving ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by make or model…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="shrink-0 text-[12px] text-muted-foreground">
            {filtered.length} profile{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Vehicle</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Electrical</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No profiles. Add one above, or apply migration 0013 to load the seed catalogue.
                </TableCell></TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-2 text-[13px] font-semibold">
                      <Car className="size-4 text-primary" />
                      {p.make} {p.model}
                    </div>
                    <div className="mt-0.5 pl-6 text-[11.5px] text-muted-foreground">
                      {[p.variant, yearsLabel(p), p.market].filter(Boolean).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell className="text-[12.5px] capitalize">{p.category}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-[12.5px]">
                      {p.voltage}
                      {p.hybrid_or_ev && <Zap className="size-3.5 text-orange-500" />}
                      {p.canbus && <span className="text-[10.5px] text-muted-foreground">CAN</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Pill tone={p.difficulty === "easy" ? "success" : p.difficulty === "advanced" ? "danger" : "info"}>
                      {DIFFICULTY_LABEL[p.difficulty].split(" —")[0]}
                    </Pill>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => togglePublished(p)}
                      className="text-left"
                      title="Toggle public visibility"
                    >
                      <Pill tone={p.is_published ? "success" : "muted"}>
                        {p.is_published ? "Public" : "Hidden"}
                      </Pill>
                    </button>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeProfile(p)}
                      title="Delete profile">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
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
