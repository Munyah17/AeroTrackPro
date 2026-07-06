"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "./page";

/** Animated counter that eases up to `value` when scrolled into view. */
export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 900;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  decimals,
  icon: Icon,
  iconClassName,
  trend,
  trendLabel,
  footer,
  delay = 0,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: number;
  trendLabel?: string;
  footer?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      <Panel hover className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
              iconClassName,
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
            <div className="mt-0.5 text-[26px] font-bold tracking-tight tabular-nums">
              <AnimatedNumber value={value} decimals={decimals} />
              {suffix && <span className="ml-1 text-lg font-semibold text-muted-foreground">{suffix}</span>}
            </div>
            {trend !== undefined ? (
              <div
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-medium",
                  trend >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {trend >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {Math.abs(trend)}% {trendLabel ?? ""}
              </div>
            ) : (
              footer && <div className="mt-1 text-xs text-muted-foreground">{footer}</div>
            )}
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}
