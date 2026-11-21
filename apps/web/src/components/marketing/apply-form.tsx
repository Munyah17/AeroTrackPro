"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, CircleAlert, Landmark, Loader2, Send, Smartphone } from "lucide-react";
import { SERVICES, type ServiceKey } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentMethod = "paynow" | "stripe_card" | "bank_transfer" | "direct_transfer";

const MANUAL_METHODS: PaymentMethod[] = ["bank_transfer", "direct_transfer"];
const WHATSAPP_POP = "263718560128";

type Phase =
  | { step: "form" }
  | { step: "submitting" }
  | { step: "awaiting"; reference: string; instructions: string }
  | { step: "done"; reference: string; instructions: string }
  | { step: "error"; message: string };

export function ApplyForm() {
  const [phase, setPhase] = useState<Phase>({ step: "form" });
  const [services, setServices] = useState<ServiceKey[]>(["tracking"]);
  const [method, setMethod] = useState<PaymentMethod>("paynow");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [txnReference, setTxnReference] = useState("");
  const [senderName, setSenderName] = useState("");
  const [fleetSize, setFleetSize] = useState("");
  const [message, setMessage] = useState("");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { total, quoted } = useMemo(() => {
    let t = 0;
    const q: string[] = [];
    for (const k of services) {
      const s = SERVICES[k];
      if (s.price > 0) t += s.price;
      else q.push(s.name);
    }
    return { total: t, quoted: q };
  }, [services]);

  const toggleService = (key: ServiceKey, on: boolean) =>
    setServices((prev) => (on ? [...new Set([...prev, key])] : prev.filter((s) => s !== key)));

  const pollStatus = (reference: string, attempt = 0) => {
    if (attempt > 24) {
      setPhase({
        step: "done",
        reference,
        instructions:
          "We haven't received confirmation yet — if you approved the payment it will be reconciled shortly. Keep your reference: " +
          reference,
      });
      return;
    }
    pollTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/payments/status?ref=${encodeURIComponent(reference)}`);
        const data = await res.json();
        if (data.status === "paid") {
          setPhase({ step: "done", reference, instructions: "Payment received — thank you! Our team will contact you to schedule installation." });
          return;
        }
        if (data.status === "failed" || data.status === "cancelled") {
          setPhase({ step: "done", reference, instructions: "The mobile payment was not completed. You can retry with another method — your application is saved." });
          return;
        }
      } catch {
        /* keep polling */
      }
      pollStatus(reference, attempt + 1);
    }, 5000);
  };

  const reportFailure = (detail: string) =>
    fetch("/api/ops-event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "apply_submit_failed", detail }),
    }).catch(() => {});

  const submit = async () => {
    if (services.length === 0) return setPhase({ step: "error", message: "Select at least one service." });
    if (!name.trim() || !phone.trim()) return setPhase({ step: "error", message: "Name and phone are required." });
    const isManual = MANUAL_METHODS.includes(method);
    if (isManual && !txnReference.trim())
      return setPhase({ step: "error", message: "Enter the transaction reference from your payment receipt." });
    if (method === "direct_transfer" && !senderName.trim())
      return setPhase({ step: "error", message: "Enter the sender name shown on the mobile money transfer." });

    setPhase({ step: "submitting" });
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name, company, email, phone,
          fleetSize: fleetSize ? Number(fleetSize) : undefined,
          services,
          message,
          payment: {
            method,
            txnReference: txnReference || undefined,
            senderName: senderName || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const msg = data.error ?? "submission failed";
        reportFailure(`${name} <${email || phone}> — ${msg}`);
        setPhase({ step: "error", message: msg });
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.status === "awaiting_customer") {
        setPhase({ step: "awaiting", reference: data.reference, instructions: data.instructions });
        pollStatus(data.reference);
      } else {
        setPhase({ step: "done", reference: data.reference, instructions: data.instructions });
      }
    } catch {
      reportFailure(`${name} <${email || phone}> — network error`);
      setPhase({ step: "error", message: "Network error — please try again." });
    }
  };

  if (phase.step === "awaiting" || phase.step === "done") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        {phase.step === "awaiting" ? (
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        ) : (
          <CheckCircle2 className="mx-auto size-8 text-success" />
        )}
        <h3 className="mt-3 text-lg font-bold">
          {phase.step === "awaiting" ? "Approve the payment on your phone" : "Application received"}
        </h3>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Reference {phase.reference}
        </p>
        <p className="mx-auto mt-3 max-w-md whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {phase.instructions}
        </p>
        {phase.step === "done" && MANUAL_METHODS.includes(method) && (
          <Button className="mt-5 rounded-xl" onClick={() => {
            const text = `Proof of payment — ${phase.reference}\nName: ${name}\nEmail: ${email || "—"}\nPhone: ${phone}\nTransaction ref: ${txnReference}`;
            window.open(`https://wa.me/${WHATSAPP_POP}?text=${encodeURIComponent(text)}`, "_blank");
          }}>
            Send PoP on WhatsApp
          </Button>
        )}
        {phase.step === "done" && (
          <Button variant="outline" className="mt-5 rounded-xl" onClick={() => setPhase({ step: "form" })}>
            Submit another application
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
      {/* services */}
      <p className="text-sm font-semibold">What do you need?</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(Object.keys(SERVICES) as ServiceKey[]).map((key) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 px-3.5 py-3 text-sm transition-colors hover:border-primary/50"
          >
            <Checkbox
              checked={services.includes(key)}
              onCheckedChange={(c) => toggleService(key, c === true)}
            />
            <span className="flex-1">{SERVICES[key].name}</span>
            <span className="text-xs font-semibold text-primary">
              {SERVICES[key].price > 0 ? `$${SERVICES[key].price}` : "Quote"}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">Due now</span>
        <span className="text-lg font-bold">${total}</span>
      </div>
      {quoted.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {quoted.join(", ")} priced per installation — we&rsquo;ll include it in your quote.
        </p>
      )}

      {/* contact */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[13px]">Full name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Munya M." className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px]">Company</Label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="SpeedTrack Ltd" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px]">Phone / WhatsApp *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+263 77 000 0000" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px]">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px]">Fleet size</Label>
          <Input type="number" min={1} value={fleetSize} onChange={(e) => setFleetSize(e.target.value)} placeholder="e.g. 12" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px]">Notes</Label>
          <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Anything we should know?" className="h-11 rounded-xl" />
        </div>
      </div>

      {/* payment */}
      <p className="mt-6 flex items-center gap-2 text-sm font-semibold">
        <Smartphone className="size-4 text-primary" /> How will you pay?
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMethod("paynow")}
          aria-pressed={method === "paynow"}
          className={`overflow-hidden rounded-xl border bg-white transition-all ${
            method === "paynow"
              ? "border-primary ring-2 ring-primary/40"
              : "border-border/70 hover:border-primary/50"
          }`}
        >
          <img src="/paynow-banner.png" alt="Paynow — EcoCash, ZIPIT, InnBucks, O'mari, Visa and Mastercard" className="w-full" />
        </button>
        <button
          type="button"
          onClick={() => setMethod("stripe_card")}
          aria-pressed={method === "stripe_card"}
          className={`overflow-hidden rounded-xl border bg-white transition-all ${
            method === "stripe_card"
              ? "border-primary ring-2 ring-primary/40"
              : "border-border/70 hover:border-primary/50"
          }`}
        >
          <img src="/stripe-banner.png" alt="Stripe — Visa, Mastercard, American Express, Apple Pay and Google Pay" className="w-full" />
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {method === "paynow" && "EcoCash, InnBucks, O'mari, ZIPIT & cards — you'll be redirected to Paynow's secure checkout."}
        {method === "stripe_card" && "Visa, Mastercard, Amex, Apple Pay & Google Pay — you'll be redirected to Stripe's secure card checkout."}
      </p>
      <div className="mt-2 grid gap-2">
        {(
          [
            { id: "bank_transfer", icon: Landmark, label: "Bank transfer — FBC Bank", hint: "manual confirmation" },
            { id: "direct_transfer", icon: Send, label: "EcoCash / InnBucks direct transfer", hint: "send to our number" },
          ] as const
        ).map((m) => (
          <div
            key={m.id}
            className={`overflow-hidden rounded-xl border transition-all ${
              method === m.id
                ? "border-primary ring-2 ring-primary/40"
                : "border-border/70 hover:border-primary/50"
            }`}
          >
            <button
              type="button"
              onClick={() => setMethod(m.id)}
              aria-expanded={method === m.id}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left text-sm"
            >
              <m.icon className="size-4 shrink-0 text-primary" />
              <span className="flex-1 font-medium">{m.label}</span>
              <span className="text-xs text-muted-foreground">{m.hint}</span>
              <ChevronDown
                className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                  method === m.id ? "rotate-180" : ""
                }`}
              />
            </button>
            {method === m.id && (
              <div className="border-t border-border/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {m.id === "bank_transfer" ? `Transfer $${total.toFixed(2)} to` : `Send $${total.toFixed(2)} via EcoCash or InnBucks to`}
                </p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {m.id === "bank_transfer" ? (
                    <>
                      <dt className="text-muted-foreground">Account Name</dt><dd className="font-medium">Solabliss Zimbabwe Pvt Ltd</dd>
                      <dt className="text-muted-foreground">Bank</dt><dd className="font-medium">FBC Bank</dd>
                      <dt className="text-muted-foreground">Branch</dt><dd className="font-medium">FBC Center Branch</dd>
                      <dt className="text-muted-foreground">USD Account</dt><dd className="font-medium">6870465460146</dd>
                    </>
                  ) : (
                    <>
                      <dt className="text-muted-foreground">Number</dt><dd className="font-medium">+263 77 390 9307</dd>
                      <dt className="text-muted-foreground">Name</dt><dd className="font-medium">Munyaradzi J Muzvidziwa</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Amount</dt><dd className="font-medium">${total.toFixed(2)}</dd>
                </dl>
                <div className="mt-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Transaction reference *</Label>
                    <Input
                      value={txnReference}
                      onChange={(e) => setTxnReference(e.target.value)}
                      placeholder="e.g. the EcoCash / bank transaction ID from your receipt"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  {m.id === "direct_transfer" && (
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Sender name (EcoCash / InnBucks) *</Label>
                      <Input
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Name of the person, agent or organisation that sent the money"
                        className="h-11 rounded-xl"
                      />
                      <p className="text-xs text-muted-foreground">Must match the sender name shown on the mobile money transfer.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {phase.step === "error" && (
        <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" /> {phase.message}
        </p>
      )}

      <Button
        onClick={submit}
        disabled={phase.step === "submitting"}
        className="mt-6 h-12 w-full rounded-xl text-[15px] font-semibold shadow-card"
      >
        {phase.step === "submitting" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : MANUAL_METHODS.includes(method) ? (
          `I've sent $${total.toFixed(2)} — continue`
        ) : total > 0 ? (
          `Apply & pay $${total}`
        ) : (
          "Request quotation"
        )}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Manual payments: send the transfer first, then paste your transaction reference.
      </p>
    </div>
  );
}
