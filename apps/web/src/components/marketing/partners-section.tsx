import {
  Building2,
  BusFront,
  Cpu,
  Fuel,
  Globe2,
  HardDrive,
  Radio,
  Satellite,
  Ship,
  Truck,
  Warehouse,
  Wifi,
} from "lucide-react";

const PARTNERS = [
  { icon: Truck, name: "Metro Freight" },
  { icon: BusFront, name: "CityLink Transit" },
  { icon: Warehouse, name: "Harbour Logistics" },
  { icon: Fuel, name: "PetroLine Energy" },
  { icon: Ship, name: "Delta Cargo" },
  { icon: Globe2, name: "Continental Haulage" },
  { icon: Building2, name: "Apex Industries" },
];

const DEVICES = [
  { icon: Satellite, name: "SinoTrack ST-901A" },
  { icon: Radio, name: "Teltonika FMB920" },
  { icon: Cpu, name: "Concox GT06" },
  { icon: HardDrive, name: "Queclink GV350" },
  { icon: Wifi, name: "Xexun TK103" },
  { icon: Satellite, name: "Coban GPS103" },
  { icon: Radio, name: "Meitrack T399" },
];

function MarqueeRow({ items, reverse }: { items: typeof PARTNERS; reverse?: boolean }) {
  const row = [...items, ...items]; // duplicate for seamless loop
  return (
    <div className="relative overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div
        className={`flex w-max items-center gap-4 animate-marquee ${reverse ? "[animation-direction:reverse]" : ""} hover:[animation-play-state:paused]`}
      >
        {row.map((p, i) => (
          <div
            key={`${p.name}-${i}`}
            className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border bg-card px-5 py-3 shadow-card"
          >
            <p.icon className="size-4.5 text-primary" />
            <span className="whitespace-nowrap text-[13.5px] font-semibold tracking-tight">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PartnersSection() {
  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Trusted fleet partners</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">Our Partners</h2>
          <p className="mt-3 text-muted-foreground">
            The fleets we run and the hardware we fit — enterprise customers and the tracker brands we install or accept.
          </p>
        </div>
        <MarqueeRow items={PARTNERS} />
        <MarqueeRow items={DEVICES} reverse />
      </div>
    </section>
  );
}
