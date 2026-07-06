"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { signInWithEmail } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    const { data, error } = await signInWithEmail(values.email, values.password);
    if (error) {
      toast.error("Sign in failed", { description: error.message });
      setLoading(false);
      return;
    }
    if (!data.user) {
      toast.error("No user returned");
      setLoading(false);
      return;
    }
    toast.success(`Welcome back`, { description: values.email });
    router.push("/select-tenant");
  };

  return (
    <div>
      <div className="mb-8 lg:hidden">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary">
          <LocateFixed className="size-6 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your fleet console</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13px]">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            className="h-11 rounded-xl"
            {...register("email")}
          />
          {errors.email && <p className="text-[12px] text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[13px]">Password</Label>
            <Link href="/forgot-password" className="text-[12.5px] font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="h-11 rounded-xl pr-11"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && <p className="text-[12px] text-destructive">{errors.password.message}</p>}
        </div>

        <label className="flex items-center gap-2.5 text-[13px]">
          <Checkbox defaultChecked /> Remember me for 30 days
        </label>

        <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-[14px] shadow-card">
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign In"}
        </Button>
      </form>

      <p className="mt-7 text-center text-[13px] text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
