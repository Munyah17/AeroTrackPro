"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function strength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-destructive", "bg-destructive", "bg-warning", "bg-success", "bg-success"];
  return { score, label: labels[score]!, color: colors[score]! };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const s = strength(password);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (s.score < 3) {
      toast.error("Choose a stronger password");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success("Password updated — sign in with your new password");
      router.push("/login");
    }, 800);
  };

  return (
    <div>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <ShieldCheck className="size-6" />
      </div>
      <h2 className="mt-5 text-2xl font-bold tracking-tight">Set a new password</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your new password must be different from previous passwords.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <Label className="text-[13px]">New password</Label>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-11 rounded-xl"
          />
          {password && (
            <div className="pt-1">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={cn("h-1.5 flex-1 rounded-full bg-muted", i < s.score && s.color)} />
                ))}
              </div>
              <div className="mt-1.5 text-[11.5px] text-muted-foreground">{s.label}</div>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px]">Confirm password</Label>
          <Input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className="h-11 rounded-xl"
          />
        </div>
        <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-[14px] shadow-card">
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Update Password"}
        </Button>
      </form>
    </div>
  );
}
