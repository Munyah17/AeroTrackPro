import { AuthFrame } from "@/components/brand/auth-frame";

/**
 * Auth shell. The panel reads the reseller brand (name, colour, logo, layout).
 * On a white-label domain the same frame is what the client sees.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}
