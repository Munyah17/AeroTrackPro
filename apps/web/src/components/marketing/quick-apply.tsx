"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Zap,
} from "lucide-react";
import { SERVICES, type ServiceKey } from "@/lib/pricing";

const OPTIONS = (Object.keys(SERVICES) as ServiceKey[]).map((k) => ({
  key: k,
  ...SERVICES[k],
}));

type Phase = "form" | "submitting" | "done" | "error";

const FIELD =
  "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none ring-ring/30 placeholder:text-muted-foreground/70 focus:ring-2";

/**
 * Lead card — right of the hero on desktop, directly under it on mobile.
 * Submits a manual-review application (no payment push); /apply handles the
 * full payment flow.
 */
export function QuickApply() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [fleetSize, setFleetSize] = useState("");
  const [service, setService] = useState<ServiceKey>("tracking");
  const [phase, setPhase] = useState<Phase>("form");
  const [detail, setDetail] = useState("");

  const price = SERVICES[service].price;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || phone.trim().length < 7) {
      setDetail("Name and a valid phone number are required.");
      setPhase("error");
      return;
    }
    setPhase("submitting");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name, phone, company,
          fleetSize: fleetSize ? Number(fleetSize) : undefined,
          services: [service],
          payment: { method: "bank_transfer" },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setDetail(data.error ?? "Submission failed — try again.");
        setPhase("error");
        return;
      }
      setDetail(data.reference ?? "");
      setPhase("done");
    } catch {
      setDetail("Network error — please try again.");
      setPhase("error");
    }
  }

  return (
    <div className="w-full rounded-2xl border border-white/15 bg-card/95 p-6 shadow-float backdrop-blur-md sm:p-7">
      {phase === "done" ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto size-11 text-success" />
          <h3 className="mt-3.5 text-lg font-bold">Application received</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Our team will call you shortly to arrange fitting and payment.
            {detail && (
              <>
                <br />
                Reference <span className="font-semibold">{detail}</span>
              </>
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wider text-primary">
              <Zap className="size-4" /> Quick Apply
            </p>
            {price > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11.5px] font-bold text-primary">
                From ${price}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            Fitted and live on the platform in days — hardware included.
          </p>

          <div className="mt-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name *"
              className={FIELD}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone / WhatsApp *"
              className={FIELD}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company"
                className={FIELD}
              />
              <input
                type="number"
                min={1}
                value={fleetSize}
                onChange={(e) => setFleetSize(e.target.value)}
                placeholder="Fleet size"
                className={FIELD}
              />
            </div>
            <select
              value={service}
              onChange={(e) => setService(e.target.value as ServiceKey)}
              className={FIELD}
            >
              {OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.name} {o.price > 0 ? `— $${o.price}` : "— quote"}
                </option>
              ))}
            </select>
          </div>

          {phase === "error" && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
              <CircleAlert className="size-3.5 shrink-0" /> {detail}
            </p>
          )}

          <button
            type="submit"
            disabled={phase === "submitting"}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {phase === "submitting" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>Apply now <ArrowRight className="size-4" /></>
            )}
          </button>

          <div className="mt-3.5 space-y-1.5">
            {["Same-day confirmation", "Pay on confirmation — no card needed"].map((t) => (
              <p key={t} className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <BadgeCheck className="size-3.5 shrink-0 text-success" /> {t}
              </p>
            ))}
          </div>

          <Link
            href="/apply"
            className="mt-3 block text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Full application & payment options →
          </Link>
        </form>
      )}
    </div>
  );
}
