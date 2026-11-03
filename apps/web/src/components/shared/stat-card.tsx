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
  compact = false,
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
  /** Tighter padding + smaller type — use for dense stat rows. */
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      <Panel hover className={cn("h-full", compact ? "p-3 sm:p-3.5" : "p-4 sm:p-5")}>
        <div className={cn("flex items-start", compact ? "gap-2.5" : "gap-3 sm:gap-4")}>
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
              compact ? "size-9" : "size-11",
              iconClassName,
            )}
          >
            <Icon className={compact ? "size-4.5" : "size-5"} />
          </div>
          <div className="min-w-0">
            <div className={cn("font-medium text-muted-foreground", compact ? "text-[12px]" : "text-[13px]")}>{label}</div>
            <div className={cn("mt-0.5 font-bold tracking-tight tabular-nums", compact ? "text-lg sm:text-xl" : "text-xl sm:text-[26px]")}>
              <AnimatedNumber value={value} decimals={decimals} />
              {suffix && <span className={cn("ml-1 font-semibold text-muted-foreground", compact ? "text-sm" : "text-lg")}>{suffix}</span>}
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
