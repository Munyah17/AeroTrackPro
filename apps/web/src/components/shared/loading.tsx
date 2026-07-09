import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn(
        "animate-spin text-primary",
        size === "sm" && "size-4",
        size === "md" && "size-6",
        size === "lg" && "size-8",
        className,
      )}
    />
  );
}

export function LoadingPage() {
  return (
    <div className="flex min-h-[600px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border bg-card">
      <LoadingSpinner />
    </div>
  );
}
