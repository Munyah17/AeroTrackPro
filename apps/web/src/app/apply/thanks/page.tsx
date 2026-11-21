"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";

type State = "loading" | "checking" | "paid" | "open" | "failed" | "missing";

/**
 * Return URL for hosted payment flows — Paynow's returnurl and Stripe's
 * success_url both land here. We poll /api/payments/status until the row
 * reaches a terminal state.
 */
function ThanksBody() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get("ref") ?? "";
  const [state, setState] = useState<State>(reference ? "checking" : "missing");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!reference) return;
    let attempt = 0;
    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/status?ref=${encodeURIComponent(reference)}`);
        const data = await res.json();
        if (data.status === "paid") return setState("paid");
        if (data.status === "failed" || data.status === "cancelled") return setState("failed");
      } catch {
        /* keep polling */
      }
      if (++attempt < 30) timer.current = setTimeout(poll, 4000);
      else setState("open");
    };
    poll();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reference]);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
      {state === "checking" && <Loader2 className="mx-auto size-10 animate-spin text-primary" />}
      {state === "paid" && <CheckCircle2 className="mx-auto size-10 text-success" />}
      {(state === "failed" || state === "missing") && <CircleAlert className="mx-auto size-10 text-destructive" />}
      {state === "open" && <CheckCircle2 className="mx-auto size-10 text-primary" />}

      <h1 className="mt-4 text-xl font-bold">
        {state === "checking" && "Confirming your payment…"}
        {state === "paid" && "Payment received — thank you!"}
        {state === "open" && "Application received"}
        {state === "failed" && "Payment not completed"}
        {state === "missing" && "No payment reference"}
      </h1>

      {reference && (
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Reference {reference}
        </p>
      )}
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {state === "checking" && "Hang tight — we're confirming with the payment provider."}
        {state === "paid" && "Our team will contact you shortly to schedule installation."}
        {state === "open" &&
          "We're still awaiting confirmation from the payment provider. If you completed the payment it will be reconciled automatically — keep your reference."}
        {state === "failed" &&
          "The payment was cancelled or failed. Your application is saved — go back and choose another payment method to try again."}
        {state === "missing" && "This link is incomplete — if you paid, keep your reference and contact us."}
      </p>

      <div className="mt-6 flex justify-center gap-2">
        <Link
          href="/apply"
          className="inline-flex h-8 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Back to application
        </Link>
        <Button className="rounded-xl" onClick={() => router.push("/")}>
          Home
        </Button>
      </div>
    </div>
  );
}

export default function ThanksPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="px-4 py-16 sm:py-24">
        <Suspense
          fallback={
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
              <Loader2 className="mx-auto size-10 animate-spin text-primary" />
            </div>
          }
        >
          <ThanksBody />
        </Suspense>
      </main>
    </div>
  );
}
