"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BatteryCharging,
  Camera,
  Fuel,
  KeyRound,
  MapPin,
  Radio,
  ShieldAlert,
  Wrench,
  Zap,
} from "lucide-react";
import {
  DIFFICULTY_LABEL,
  INSTALL_DISCLAIMER,
  fetchVehicleProfile,
  profileTitle,
  type VehicleProfile,
} from "@/lib/vehicle-profiles";
import { buildInstallSteps, VehicleWiringDiagram } from "@/components/vehicle/install-guide";
import { SiteHeader } from "@/components/marketing/site-header";

const CATEGORY_LABEL: Record<VehicleProfile["category"], string> = {
  kei: "Kei car",
  compact: "Compact",
  sedan: "Sedan",
  suv: "SUV / Crossover",
  pickup: "Pickup / Bakkie",
  van: "Van",
  minibus: "Minibus / Kombi",
  bus: "Bus",
  truck: "Truck",
  other: "Other",
};

export default function VehicleProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<VehicleProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicleProfile(slug).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <p className="text-slate-600">Vehicle profile not found.</p>
        <Link href="/supported-vehicles" className="text-sm font-medium text-cyan-700 underline">
          Back to the vehicle database
        </Link>
      </div>
    );
  }

  const steps = buildInstallSteps(profile);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-5 py-10">
        <Link
          href="/supported-vehicles"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" /> Installation Guide
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{profileTitle(profile)}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-[11.5px] font-semibold">
              <span className="rounded-full bg-slate-200 px-2.5 py-1">{CATEGORY_LABEL[profile.category]}</span>
              {profile.market && (
                <span className="rounded-full bg-slate-200 px-2.5 py-1">{profile.market}</span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-700">
                <BatteryCharging className="size-3.5" /> {profile.voltage}
              </span>
              {profile.hybrid_or_ev && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-orange-700">
                  <Zap className="size-3.5" /> Hybrid / EV
                </span>
              )}
              {profile.canbus && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-purple-700">
                  <Radio className="size-3.5" /> CAN bus
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-1 ${
                  profile.difficulty === "easy"
                    ? "bg-emerald-100 text-emerald-700"
                    : profile.difficulty === "advanced"
                      ? "bg-red-100 text-red-700"
                      : "bg-sky-100 text-sky-700"
                }`}
              >
                {DIFFICULTY_LABEL[profile.difficulty]}
              </span>
            </div>
          </div>
        </div>

        {/* risk disclaimer — always on top */}
        <div className="mt-6 flex gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 size-6 shrink-0 text-amber-600" />
          <div>
            <div className="text-[14px] font-bold text-amber-900">
              Educational content — at your own risk
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-amber-900">
              {INSTALL_DISCLAIMER}
            </p>
          </div>
        </div>

        {profile.hybrid_or_ev && (
          <div className="mt-4 flex gap-3 rounded-xl border-2 border-red-400 bg-red-50 p-4">
            <Zap className="mt-0.5 size-6 shrink-0 text-red-600" />
            <div>
              <div className="text-[14px] font-bold text-red-900">
                Hybrid / EV high-voltage warning
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-red-900">
                This vehicle has high-voltage traction systems (orange cables —
                hundreds of volts). Hybrid ECUs can restart the engine or drive
                the vehicle on battery alone, so a fuel cut may NOT immobilise
                it. Never cut or tap orange cabling. Hybrid/EV installs should
                only be done by someone trained on high-voltage systems.
              </p>
            </div>
          </div>
        )}

        {/* wiring diagram */}
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <KeyRound className="size-4.5 text-cyan-700" /> Wiring diagram
          </h2>
          <p className="mt-1 text-[12.5px] text-slate-500">
            Tracker harness + relay cut-off — wire codes (RD/BK/YL/OR/WH) are the harness colours, NOT the vehicle&apos;s. Verify with a multimeter.
          </p>
          <div className="mt-4 overflow-x-auto">
            <VehicleWiringDiagram voltage={profile.voltage} />
          </div>
        </section>

        {/* step-by-step install guide */}
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <Wrench className="size-4.5 text-cyan-700" />
            Installation — step by step
          </h2>
          <ol className="mt-4 space-y-0">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className={`relative flex gap-4 pb-5 last:pb-0 ${
                  s.warn ? "rounded-xl border border-red-200 bg-red-50 p-3.5" : ""
                }`}
              >
                {!s.warn && <div className="absolute left-[13px] top-7 bottom-0 w-px bg-slate-200 last:hidden" />}
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                    s.warn ? "bg-red-600 text-white" : "bg-cyan-700 text-white"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className={`text-[14px] font-semibold ${s.warn ? "text-red-800" : ""}`}>{s.title}</div>
                  <p className={`mt-1 text-[13px] leading-relaxed ${s.warn ? "text-red-800/90" : "text-slate-600"}`}>
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* reference notes */}
        <div className="mt-4 space-y-4">
          {[
            { icon: ShieldAlert, title: "Engine cut-off guidance", body: profile.cutoff_notes, danger: profile.hybrid_or_ev },
            { icon: Fuel, title: "Fuel level sensor", body: profile.fuel_sensor_notes },
            { icon: Camera, title: "Accessories (RFID, cameras, alarms)", body: profile.accessories_notes },
            { icon: MapPin, title: "Zimbabwe market notes", body: profile.zimbabwe_notes },
          ]
            .filter((s) => s.body)
            .map((s) => (
              <section
                key={s.title}
                className={`rounded-xl border bg-white p-5 ${
                  s.danger ? "border-red-300" : "border-slate-200"
                }`}
              >
                <h2 className="flex items-center gap-2 text-[15px] font-bold">
                  <s.icon className={`size-4.5 ${s.danger ? "text-red-600" : "text-cyan-700"}`} />
                  {s.title}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-700">
                  {s.body}
                </p>
              </section>
            ))}
        </div>

        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5 text-[13px] leading-relaxed text-slate-600">
          <b className="text-slate-800">One last reminder:</b> fuse layouts,
          wire colours and modules change between model years and markets
          (JDM vs UK vs ZA spec). Always confirm with a multimeter before you
          cut. If this profile helped you fit a tracker, let us know — your
          field notes improve the next installer&rsquo;s experience.
        </div>
      </main>
    </div>
  );
}
