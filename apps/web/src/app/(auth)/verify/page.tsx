"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LENGTH = 6;

export default function VerifyPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (i: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < LENGTH - 1) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) submit(next.join(""));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array(LENGTH).fill("").map((_, i) => text[i] ?? "");
    setDigits(next);
    refs.current[Math.min(text.length, LENGTH - 1)]?.focus();
    if (text.length === LENGTH) submit(text);
  };

  const submit = (code: string) => {
    setLoading(true);
    setTimeout(() => {
      toast.success(`Code ${code} verified`);
      router.push("/select-tenant");
    }, 700);
  };

  return (
    <div className="text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Smartphone className="size-7" />
      </div>
      <h2 className="mt-5 text-2xl font-bold tracking-tight">Two-factor authentication</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Enter the 6-digit code sent to <span className="font-medium text-foreground">+263 78• ••• •41</span>
      </p>

      <div className="mt-8 flex justify-center gap-2.5" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              "size-12 rounded-xl border bg-card text-center text-xl font-bold shadow-card outline-none transition-all",
              "focus:border-primary focus:ring-3 focus:ring-primary/20",
              d && "border-primary/50",
            )}
          />
        ))}
      </div>

      <Button
        disabled={loading || digits.some((d) => !d)}
        onClick={() => submit(digits.join(""))}
        className="mt-7 h-11 w-full rounded-xl text-[14px] shadow-card"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
      </Button>

      <p className="mt-5 text-[13px] text-muted-foreground">
        Didn&apos;t receive a code?{" "}
        {cooldown > 0 ? (
          <span>Resend in {cooldown}s</span>
        ) : (
          <button
            className="font-semibold text-primary hover:underline"
            onClick={() => {
              setCooldown(30);
              toast.success("New code sent");
            }}
          >
            Resend code
          </button>
        )}
      </p>
    </div>
  );
}
