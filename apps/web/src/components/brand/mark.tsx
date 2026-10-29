import { LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ logo, className }: { logo: string | null; className?: string }) {
  if (logo) {
    return <img src={logo} alt="" className={cn("object-contain", className)} />;
  }
  return <LocateFixed className={className} />;
}
