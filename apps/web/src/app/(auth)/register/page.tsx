"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signUpWithEmail } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    company: z.string().min(2, "Enter your company name"),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirm: z.string(),
    terms: z.boolean().refine((v) => v, "You must accept the terms"),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { terms: false } });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    const { data, error } = await signUpWithEmail(values.email, values.password, values.name);
    if (error) {
      toast.error("Sign up failed", { description: error.message });
      setLoading(false);
      return;
    }
    if (!data.user) {
      toast.error("No user returned");
      setLoading(false);
      return;
    }
    toast.success("Account created", { description: `Please confirm your email at ${values.email}` });
    router.push("/login");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Start tracking your fleet in minutes</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[13px]">Full name</Label>
            <Input placeholder="Munya M." className="h-11 rounded-xl" {...register("name")} />
            {errors.name && <p className="text-[12px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">Company</Label>
            <Input placeholder="SpeedTrack Ltd" className="h-11 rounded-xl" {...register("company")} />
            {errors.company && <p className="text-[12px] text-destructive">{errors.company.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px]">Work email</Label>
          <Input type="email" placeholder="you@company.com" className="h-11 rounded-xl" {...register("email")} />
          {errors.email && <p className="text-[12px] text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px]">Password</Label>
          <Input type="password" placeholder="••••••••" className="h-11 rounded-xl" {...register("password")} />
          {errors.password && <p className="text-[12px] text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px]">Confirm password</Label>
          <Input type="password" placeholder="••••••••" className="h-11 rounded-xl" {...register("confirm")} />
          {errors.confirm && <p className="text-[12px] text-destructive">{errors.confirm.message}</p>}
        </div>

        <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
          <Checkbox
            checked={watch("terms")}
            onCheckedChange={(c) => setValue("terms", c === true, { shouldValidate: true })}
            className="mt-0.5"
          />
          <span>
            I agree to the <span className="font-medium text-primary">Terms of Service</span> and{" "}
            <span className="font-medium text-primary">Privacy Policy</span>
          </span>
        </label>
        {errors.terms && <p className="text-[12px] text-destructive">{errors.terms.message}</p>}

        <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl text-[14px] shadow-card">
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
