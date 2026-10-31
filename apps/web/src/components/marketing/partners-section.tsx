import { Building2 } from "lucide-react";
import { fetchPartnerLogos, type PartnerLogo } from "@/lib/partner-logos";

function LogoItem({ logo }: { logo: PartnerLogo }) {
  return (
    <div className="flex h-16 shrink-0 items-center gap-3 rounded-xl border border-border bg-card px-6 shadow-card">
      {logo.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo.logo_url}
          alt={logo.name}
          className="max-h-8 max-w-[140px] object-contain"
          loading="lazy"
        />
      ) : (
        <Building2 className="size-4.5 text-primary" />
      )}
      <span className="whitespace-nowrap text-[13.5px] font-semibold tracking-tight">
        {logo.name}
      </span>
    </div>
  );
}

export async function PartnersSection() {
  const logos = await fetchPartnerLogos();
  const row = [...logos, ...logos]; // duplicate for a seamless loop

  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Trusted fleet partners
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">Our Partners</h2>
          <p className="mt-3 text-muted-foreground">
            The fleets we run and the hardware we fit — enterprise customers and
            the tracker brands we install or accept.
          </p>
        </div>

        <div className="relative overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max items-center gap-4 animate-marquee hover:[animation-play-state:paused]">
            {row.map((l, i) => (
              <LogoItem key={`${l.id}-${i}`} logo={l} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
