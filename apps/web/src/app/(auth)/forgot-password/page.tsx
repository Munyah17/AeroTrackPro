"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 800);
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
          <MailCheck className="size-7" />
        </div>
        <h2 className="mt-5 text-2xl font-bold tracking-tight">Check your inbox</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a
          password reset link. It expires in 30 minutes.
        </p>
        <Button render={<Link href="/reset-password" />} className="mt-6 h-11 w-full rounded-xl shadow-card">
          I have the link — reset now
        </Button>
        <Link href="/login" className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Forgot your password?</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <Label className="text-[13px]">Email</Label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-11 rounded-xl"
          />
        </div>
        <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-[14px] shadow-card">
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Send Reset Link"}
        </Button>
      </form>

      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        <ArrowLeft className="size-3.5" /> Back to sign in
      </Link>
    </div>
  );
}
