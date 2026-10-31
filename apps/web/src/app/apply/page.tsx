import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, LocateFixed, ArrowLeft } from "lucide-react";
import { ApplyForm } from "@/components/marketing/apply-form";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Apply for Tracking",
  description:
    "Apply for GPS tracking, fuel monitoring, engine cut-off and fleet services — hardware, installation and activation included. Pay with EcoCash, OneMoney, InnBucks or bank transfer.",
};

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to home
        </Link>

        <div className="mt-6 grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Get fitted</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Apply for tracking today
            </h1>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Pick your services, pay with EcoCash, OneMoney, InnBucks or bank
              transfer, and we schedule your installation. Hardware and fitting
              are always included.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Instant mobile-money approval on your phone",
                "Bank transfer options with clear instructions",
                "Our team confirms every application the same day",
                "Professional installation at your location",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <ApplyForm />
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-6 py-8">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary">
            <LocateFixed className="size-4 text-white" />
          </span>
          <span className="text-sm font-semibold">AeroTrack Pro</span>
        </div>
      </footer>
    </div>
  );
}
