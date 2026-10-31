"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BatteryCharging,
  Camera,
  ChevronRight,
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

  const sections = [
    { icon: KeyRound, title: "Power & fuse box", body: profile.fusebox_notes },
    { icon: ShieldAlert, title: "Engine cut-off guidance", body: profile.cutoff_notes, danger: profile.hybrid_or_ev },
    { icon: Fuel, title: "Fuel level sensor", body: profile.fuel_sensor_notes },
    { icon: Camera, title: "Accessories (RFID, cameras, alarms)", body: profile.accessories_notes },
    { icon: Wrench, title: "Installer's notes", body: profile.install_notes },
    { icon: MapPin, title: "Zimbabwe market notes", body: profile.zimbabwe_notes },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Aero<span className="text-cyan-600">Track</span>
          </Link>
          <nav className="flex items-center gap-1 text-[13px] text-slate-500">
            <Link href="/supported-vehicles" className="hover:text-slate-900">
              Supported Vehicles
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="font-medium text-slate-800">
              {profile.make} {profile.model}
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <Link
          href="/supported-vehicles"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" /> All vehicles
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

        <div className="mt-8 space-y-4">
          {sections
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
