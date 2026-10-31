"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, Loader2, Zap } from "lucide-react";
import { SERVICES, type ServiceKey } from "@/lib/pricing";

const OPTIONS = (Object.keys(SERVICES) as ServiceKey[]).map((k) => ({
  key: k,
  ...SERVICES[k],
}));

type Phase = "form" | "submitting" | "done" | "error";

/**
 * Compact lead card — sits on the right of the hero on desktop and directly
 * under the hero on mobile. Submits a manual-review application (no payment
 * push); the full form at /apply handles payment choices.
 */
export function QuickApply() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<ServiceKey>("tracking");
  const [phase, setPhase] = useState<Phase>("form");
  const [detail, setDetail] = useState("");

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
          name, phone,
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
    <div className="w-full rounded-2xl border border-white/15 bg-card/95 p-5 shadow-float backdrop-blur-md">
      {phase === "done" ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto size-9 text-success" />
          <h3 className="mt-3 text-[15px] font-bold">Application received</h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Our team will call you shortly to arrange fitting and payment.
            {detail && (
              <>
                <br />Reference <span className="font-semibold">{detail}</span>
              </>
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-primary">
            <Zap className="size-3.5" /> Quick Apply
          </p>
          <div className="mt-3 space-y-2.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none ring-ring/30 focus:ring-2"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone / WhatsApp"
              className="h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none ring-ring/30 focus:ring-2"
            />
            <select
              value={service}
              onChange={(e) => setService(e.target.value as ServiceKey)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-ring/30 focus:ring-2"
            >
              {OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.name} {o.price > 0 ? `— $${o.price}` : "— quote"}
                </option>
              ))}
            </select>
          </div>
          {phase === "error" && (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-destructive">
              <CircleAlert className="size-3.5 shrink-0" /> {detail}
            </p>
          )}
          <button
            type="submit"
            disabled={phase === "submitting"}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {phase === "submitting" ? <Loader2 className="size-4 animate-spin" /> : <>Apply now <ArrowRight className="size-4" /></>}
          </button>
          <Link
            href="/apply"
            className="mt-2 block text-center text-[11.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Full application & payment options
          </Link>
        </form>
      )}
    </div>
  );
}
