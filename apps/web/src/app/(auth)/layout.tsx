import { LocateFixed, Radio, ShieldCheck, Zap } from "lucide-react";

/**
 * Split-screen auth layout: royal-blue brand panel left, form right.
 * On a white-label domain this panel swaps to the tenant's branding.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-white lg:flex">
        {/* Decorative route line */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
          viewBox="0 0 800 900"
          preserveAspectRatio="none"
        >
          <path
            d="M -40 620 C 180 520, 260 700, 430 580 S 700 380, 860 470"
            stroke="white"
            strokeWidth="3"
            strokeDasharray="12 10"
            fill="none"
          />
          <circle cx="430" cy="580" r="10" fill="#4ade80" />
          <circle cx="430" cy="580" r="22" fill="rgba(74,222,128,0.25)" />
          <circle cx="150" cy="565" r="9" fill="#f87171" />
          <circle cx="690" cy="435" r="9" fill="#fbbf24" />
        </svg>
        <div className="absolute -right-32 -top-32 size-96 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/15">
            <LocateFixed className="size-6" />
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-tight">AeroTrack Pro</div>
            <div className="text-[12px] text-white/60">GPS Tracking · Fleet · Telematics</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight">
            Know where every vehicle is. Always.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">
            Live tracking, geofencing, fuel monitoring, driver behavior and remote
            immobilization — one mission-control platform for your entire fleet.
          </p>
          <div className="mt-8 flex flex-col gap-3.5">
            {[
              { icon: Zap, text: "Real-time positions every few seconds" },
              { icon: Radio, text: "20+ supported devices across 8 protocols" },
              { icon: ShieldCheck, text: "Bank-grade security with full audit trails" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-[13.5px] text-white/85">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/12">
                  <f.icon className="size-4" />
                </span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-[12px] text-white/50">
          © 2026 AeroTrack Pro · Trusted by logistics companies, insurers and fleet operators
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-6 md:p-10">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
