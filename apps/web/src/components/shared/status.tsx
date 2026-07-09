import { cn } from "@/lib/utils";
import { LIVE_STATUS, liveStatusOf } from "@/lib/live-status";
import type { AlertSeverity, AlertStatus, VehicleStatus } from "@aerotrack/shared";

export function VehicleStatusChip({ status, className }: { status: VehicleStatus; className?: string }) {
  const live = liveStatusOf(status);
  const s = LIVE_STATUS[live];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
        s.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot, live === "online" && "animate-pulse")} />
      {s.label}
    </span>
  );
}

export function SeverityChip({ severity }: { severity: AlertSeverity }) {
  const styles: Record<AlertSeverity, string> = {
    critical: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning-foreground",
    info: "bg-info/10 text-info",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold capitalize", styles[severity])}>
      {severity}
    </span>
  );
}

export function AlertStatusChip({ status }: { status: AlertStatus }) {
  const styles: Record<AlertStatus, string> = {
    active: "bg-destructive/10 text-destructive",
    acknowledged: "bg-warning/15 text-warning-foreground",
    resolved: "bg-success/10 text-success",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold capitalize", styles[status])}>
      {status}
    </span>
  );
}

/** Generic pill for arbitrary label/tone pairs (admin tables). */
export function Pill({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "info" | "muted" | "primary";
  children: React.ReactNode;
}) {
  const tones = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
