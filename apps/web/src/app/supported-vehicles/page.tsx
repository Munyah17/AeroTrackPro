"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Car,
  CarFront,
  ChevronRight,
  CircleAlert,
  Search,
  Truck,
  Zap,
} from "lucide-react";
import {
  DIFFICULTY_LABEL,
  INSTALL_DISCLAIMER,
  VEHICLE_CATEGORIES,
  fetchVehicleProfiles,
  yearsLabel,
  type VehicleProfile,
} from "@/lib/vehicle-profiles";
import { SiteHeader } from "@/components/marketing/site-header";

const CATEGORY_ICON: Partial<Record<VehicleProfile["category"], typeof Car>> = {
  truck: Truck,
  bus: Truck,
  minibus: Truck,
  kei: CarFront,
};

export default function SupportedVehiclesPage() {
  const [profiles, setProfiles] = useState<VehicleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [make, setMake] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    fetchVehicleProfiles().then((rows) => {
      setProfiles(rows);
      setLoading(false);
    });
  }, []);

  const makes = useMemo(
    () => [...new Set(profiles.map((p) => p.make))].sort(),
    [profiles],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      if (make !== "all" && p.make !== make) return false;
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return `${p.make} ${p.model} ${p.variant ?? ""}`.toLowerCase().includes(q);
    });
  }, [profiles, make, category, query]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Vehicle Installation Guide
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Step-by-step tracker fitting instructions for the vehicles we see
            most — power, ignition detection, remote engine cut-off, fuel
            sensing and accessories, with wiring diagrams per model.
          </p>
        </div>

        {/* disclaimer */}
        <div className="mt-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <p className="text-[13px] leading-relaxed text-amber-900">
            <b>Educational content — use at your own risk.</b>{" "}
            {INSTALL_DISCLAIMER}
          </p>
        </div>

        {/* filters */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search make or model — e.g. Vitz, Actros, HOWO…"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <select
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-600"
          >
            <option value="all">All makes</option>
            {makes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-600"
          >
            <option value="all">All categories</option>
            {VEHICLE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* grid */}
        {loading ? (
          <div className="mt-12 text-center text-sm text-slate-500">
            Loading vehicle database…
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <p className="text-sm text-slate-500">
              No vehicles match. Try a different search &mdash; or{" "}
              <Link href="/" className="font-medium text-cyan-700 underline">
                contact us
              </Link>{" "}
              to have your model assessed.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const Icon = CATEGORY_ICON[p.category] ?? Car;
              return (
                <Link
                  key={p.slug}
                  href={`/supported-vehicles/${p.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-cyan-500 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Icon className="mt-0.5 size-5 shrink-0 text-slate-400 group-hover:text-cyan-600" />
                    <div className="flex items-center gap-1.5">
                      {p.hybrid_or_ev && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10.5px] font-semibold text-orange-700">
                          <Zap className="size-3" /> Hybrid/EV
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          p.difficulty === "easy"
                            ? "bg-emerald-100 text-emerald-700"
                            : p.difficulty === "advanced"
                              ? "bg-red-100 text-red-700"
                              : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {DIFFICULTY_LABEL[p.difficulty]}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2.5 text-[15px] font-bold">
                    {p.make} {p.model}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-slate-500">
                    {[p.variant, yearsLabel(p), p.voltage, p.market]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[12.5px] font-medium text-cyan-700">
                    View install profile
                    <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-10 flex items-start gap-2 text-[12px] text-slate-500">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Can&rsquo;t find your vehicle? The list grows continuously &mdash; most cars
            follow the same wiring pattern as their platform siblings, and our
            installers can assess any model on request.
          </p>
        </div>
      </main>
    </div>
  );
}
