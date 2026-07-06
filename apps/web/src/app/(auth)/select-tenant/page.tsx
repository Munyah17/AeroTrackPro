"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { tenants } from "@aerotrack/shared";
import { Pill } from "@/components/shared/status";

export default function SelectTenantPage() {
  const router = useRouter();
  const mine = tenants.slice(0, 3);

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Choose a workspace</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your account belongs to {mine.length} organizations
      </p>

      <div className="mt-7 flex flex-col gap-2.5">
        {mine.map((t, i) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => {
              toast.success(`Signed in to ${t.name}`);
              router.push("/dashboard");
            }}
            className="group flex w-full items-center gap-3.5 rounded-2xl border border-border/70 bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover"
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white"
              style={{ background: t.primaryColor }}
            >
              {t.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">{t.name}</div>
              <div className="text-[12px] text-muted-foreground">
                {t.vehicleCount} vehicles · {t.userCount} users
              </div>
            </div>
            <Pill tone={t.status === "active" ? "success" : t.status === "trial" ? "info" : "danger"}>{t.status}</Pill>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </motion.button>
        ))}

        <button
          onClick={() => toast.info("Organization setup wizard: company details → plan → first devices")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-4 text-[13.5px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus className="size-4" /> Create new organization
        </button>
      </div>
    </div>
  );
}
