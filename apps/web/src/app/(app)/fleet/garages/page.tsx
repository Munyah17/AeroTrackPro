"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone, Plus, Search, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

/**
 * Garages — the customer's directory of service points and partner garages.
 * No server table yet: entries persist to localStorage so the list is real
 * per browser; a `garages` table can replace this store unchanged later.
 */

interface Garage {
  id: string;
  name: string;
  area: string;
  phone: string;
  services: string; // comma separated
}

const LS_KEY = "at-fleet-garages";

const SEED: Garage[] = [
  { id: "g1", name: "Borrowdale Auto Services", area: "Borrowdale, Harare", phone: "+263 242 885 100", services: "Service, Tyres, Diagnostics" },
  { id: "g2", name: "Msasa Motor Works", area: "Msasa, Harare", phone: "+263 242 486 200", services: "Engine, Gearbox, Panel beating" },
  { id: "g3", name: "City Tyre & Fitment", area: "CBD, Harare", phone: "+263 77 123 4567", services: "Tyres, Alignment, Batteries" },
];

function load(): Garage[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  return SEED;
}

export default function FleetGaragesPage() {
  const [garages, setGarages] = useState<Garage[]>(SEED);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", area: "", phone: "", services: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setGarages(load());
  }, []);

  const persist = (next: Garage[]) => {
    setGarages(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const add = () => {
    if (!form.name.trim()) return toast.error("Garage name is required");
    persist([
      ...garages,
      { id: `g${Date.now()}`, name: form.name.trim(), area: form.area.trim(), phone: form.phone.trim(), services: form.services.trim() },
    ]);
    setForm({ name: "", area: "", phone: "", services: "" });
    setAdding(false);
    toast.success("Garage added");
  };

  const remove = (id: string) => {
    persist(garages.filter((g) => g.id !== id));
    toast.success("Garage removed");
  };

  const filtered = garages.filter(
    (g) =>
      !query ||
      g.name.toLowerCase().includes(query.toLowerCase()) ||
      g.area.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <PageContainer>
      <PageHeader
        title="Garages"
        subtitle="Service points and partner garages your fleet uses"
        actions={
          <Button className="gap-2 rounded-xl shadow-card" onClick={() => setAdding((a) => !a)}>
            <Plus className="size-4" /> Add Garage
          </Button>
        }
      />

      {adding && (
        <Panel className="mb-4 grid grid-cols-1 gap-3 p-5 sm:grid-cols-5">
          <Input placeholder="Garage name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
          <Input placeholder="Area / suburb" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded-xl" />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
          <Input placeholder="Services (comma separated)" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} className="rounded-xl" />
          <Button onClick={add} className="rounded-xl">Save</Button>
        </Panel>
      )}

      <div className="relative mb-4 w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search garages..."
          className="h-10 rounded-xl bg-card pl-9 text-[13px] shadow-card"
        />
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border/60 bg-accent/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Services</th>
              <th className="px-5 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  Garages not found
                </td>
              </tr>
            )}
            {filtered.map((g) => (
              <tr key={g.id} className="transition-colors hover:bg-accent/30">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-2 font-medium">
                    <Wrench className="size-4 shrink-0 text-muted-foreground" /> {g.name}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{g.area || "—"}</span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Phone className="size-3.5" />{g.phone || "—"}</span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{g.services || "—"}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => remove(g.id)} className="text-muted-foreground transition-colors hover:text-danger" aria-label="Remove garage">
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="border-t border-border/60 px-5 py-2.5 text-[11.5px] text-muted-foreground">
          Total: {filtered.length}
        </div>
      </Panel>
    </PageContainer>
  );
}
