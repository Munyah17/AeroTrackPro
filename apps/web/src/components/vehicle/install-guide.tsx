import type { VehicleProfile } from "@/lib/vehicle-profiles";

interface Step { title: string; body: string; warn?: boolean }

/**
 * Build the numbered install sequence for a profile. Vehicle-specific data
 * (fusebox location, cut point, sender access) is spliced into the universal
 * procedure so one guide works for every profile.
 */
export function buildInstallSteps(p: VehicleProfile): Step[] {
  const v = p.voltage === "24V" ? "24V" : "12V";
  const steps: Step[] = [
    {
      title: "Prepare & test the SIM",
      body: "Put a SIM with airtime + data in a phone first. Remove the PIN, confirm it sends SMS and browses, then note the number.",
    },
    {
      title: "Kill the vehicle power",
      body: "Ignition OFF, key out. For extra safety on CAN-bus vehicles, disconnect the negative battery terminal while you work.",
    },
    {
      title: `Locate power (${v} system)`,
      body: p.fusebox_notes ??
        `Identify a constant ${v} fused feed and an ACC-switched feed at the fuse box. Confirm each with a multimeter before touching anything.`,
    },
    {
      title: "Wire constant power — RED wire",
      body: `Connect the tracker's RED wire to the constant ${v} feed (battery or a permanent fuse). Add the inline fuse holder within 30 cm of the tap point.`,
    },
    {
      title: "Wire ground — BLACK wire",
      body: "Connect BLACK to a clean chassis ground bolt (paint scraped to bare metal) or the battery negative. Confirm 0 Ω continuity to battery −.",
    },
    {
      title: "Wire ignition sense — YELLOW wire",
      body: "Connect YELLOW to a line that is 0 V with key OFF and battery voltage with key ON (the ACC/CIG fuse works on most models). This gives ignition on/off alerts.",
    },
    {
      title: "Remote engine cut-off — ORANGE wire + relay",
      body: p.cutoff_notes ??
        "Cut the fuel-pump positive feed; splice each end to the relay's two GREEN contact wires. Relay YELLOW → tracker ORANGE, relay WHITE → chassis ground. When the cut command fires, the coil opens the contacts and the pump loses power.",
      warn: p.hybrid_or_ev,
    },
    {
      title: "Fuel monitoring (optional)",
      body: p.fuel_sensor_notes ??
        "Tap the fuel-sender signal wire at the tank-top connector or splice in a capacitive probe; calibrate empty → full in the platform.",
    },
    {
      title: "Accessories (optional)",
      body: p.accessories_notes ??
        "SOS button, mic, RFID reader, siren or cameras mount under the dash — cameras take their own fused feed, never power them through the tracker.",
    },
    {
      title: "Mount, reconnect & commission",
      body: `Mount the tracker antenna-side up, away from metal. Reconnect power, confirm the GSM and GPS LEDs settle, then SMS the setup sequence (APN → server 149.248.215.167 5013 → GPRS mode → RCONF readback) and watch it appear on the map.`,
    },
  ];
  if (p.hybrid_or_ev) {
    steps.splice(6, 0, {
      title: "HYBRID / EV — extra caution",
      body: "This vehicle can drive on battery power with the engine off. A fuel cut alone may NOT immobilise it — the ECU can restart the engine at will. Cut a starter-inhibit or ignition-sense line AND verify the vehicle cannot drive off on battery. NEVER touch orange high-voltage cables (hundreds of volts).",
      warn: true,
    });
  }
  return steps;
}

/** Colour-coded tracker + relay wiring diagram, adapted from the booklet art. */
export function VehicleWiringDiagram({ voltage }: { voltage: VehicleProfile["voltage"] }) {
  const is24 = voltage === "24V";
  const vLabel = is24 ? "24V" : "12V";
  return (
    <svg viewBox="0 0 470 265" className="w-full max-w-2xl" role="img" aria-label="Tracker wiring diagram">
      <style>{`.t{font-family:ui-sans-serif,system-ui;font-size:9.5px}`}</style>
      {/* battery */}
      <rect x="18" y="90" width="46" height="60" rx="5" fill="#e2e8f0" stroke="#64748b"/>
      <text x="41" y="112" textAnchor="middle" className="t" fontWeight="700">BAT</text>
      <text x="41" y="126" textAnchor="middle" className="t" fontSize="8">{vLabel}</text>
      <text x="41" y="155" textAnchor="middle" fill="#dc2626" fontSize="11" fontWeight="700">+</text>
      {/* ground symbol */}
      <line x1="22" y1="200" x2="60" y2="200" stroke="#334155" strokeWidth="2"/>
      <line x1="30" y1="205" x2="52" y2="205" stroke="#334155" strokeWidth="2"/>
      <line x1="38" y1="210" x2="44" y2="210" stroke="#334155" strokeWidth="2"/>

      {/* tracker */}
      <rect x="185" y="95" width="120" height="58" rx="8" fill="#0f172a"/>
      <text x="245" y="120" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">TRACKER</text>
      <text x="245" y="135" textAnchor="middle" fill="#94a3b8" fontSize="8">ST-901A / GT06 class</text>

      {/* red */}
      <path d="M210,95 C210,45 64,45 64,90" stroke="#dc2626" strokeWidth="3" fill="none"/>
      <text x="115" y="40" fill="#dc2626" className="t" fontWeight="700">RED → battery +</text>
      {/* black */}
      <path d="M222,153 C222,215 41,225 41,212" stroke="#334155" strokeWidth="3" fill="none"/>
      <text x="115" y="240" fill="#334155" className="t" fontWeight="700">BLACK → chassis ground</text>
      {/* yellow ACC */}
      <path d="M262,95 C262,50 345,50 345,80" stroke="#eab308" strokeWidth="3" fill="none"/>
      <text x="330" y="40" fill="#a16207" className="t" fontWeight="700">YELLOW → ACC ignition</text>
      <rect x="322" y="80" width="52" height="30" rx="4" fill="#e2e8f0" stroke="#64748b"/>
      <text x="348" y="98" textAnchor="middle" className="t" fontSize="8">KEY / ACC</text>

      {/* orange to relay */}
      <path d="M285,153 C285,195 335,195 335,180" stroke="#ea580c" strokeWidth="3" fill="none"/>
      <text x="290" y="225" fill="#ea580c" className="t" fontWeight="700">ORANGE → relay coil (cut-off)</text>

      {/* relay */}
      <rect x="310" y="150" width="80" height="70" rx="6" fill="#fff7ed" stroke="#ea580c" strokeWidth="2"/>
      <text x="350" y="165" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ea580c">RELAY</text>
      <line x1="310" y1="185" x2="336" y2="185" stroke="#16a34a" strokeWidth="2.5"/>
      <line x1="336" y1="185" x2="360" y2="176" stroke="#16a34a" strokeWidth="2"/>
      <line x1="362" y1="185" x2="390" y2="185" stroke="#16a34a" strokeWidth="2.5"/>
      <text x="350" y="200" textAnchor="middle" fontSize="7.5" fill="#16a34a">2×GREEN = pump line</text>
      <text x="350" y="212" textAnchor="middle" fontSize="7.5" fill="#64748b">WHT→ground</text>

      {/* pump */}
      <line x1="390" y1="185" x2="430" y2="185" stroke="#dc2626" strokeWidth="2.5"/>
      <rect x="418" y="170" width="48" height="30" rx="4" fill="#fee2e2" stroke="#dc2626"/>
      <text x="442" y="188" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#dc2626">PUMP</text>
      <line x1="278" y1="185" x2="310" y2="185" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="4 3"/>
      <text x="294" y="178" textAnchor="middle" fontSize="7.5" fill="#dc2626">from fuse</text>
    </svg>
  );
}
