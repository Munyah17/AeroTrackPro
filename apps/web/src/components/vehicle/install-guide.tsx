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

/**
 * Monochrome single-line schematic (ISO-sheet style) of the tracker harness +
 * relay engine cut-off. Wire colours are carried as code labels (RD/BK/YL/OR/WH)
 * so the drawing prints like an AutoCAD sheet. Vehicle-side wiring varies —
 * verify every connection with a multimeter.
 */
export function VehicleWiringDiagram({ voltage }: { voltage: VehicleProfile["voltage"] }) {
  const is24 = voltage === "24V";
  const vLabel = is24 ? "24V" : "12V";
  const ink = "#0f172a";
  const note = "#64748b";
  return (
    <svg
      viewBox="0 0 460 300"
      className="w-full max-w-3xl"
      role="img"
      aria-label="Tracker wiring schematic"
      style={{ fontFamily: "Consolas,monospace" }}
    >
      {/* ============ sheet border + zone marks ============ */}
      <rect x="3" y="3" width="454" height="294" fill="#ffffff" stroke={ink} strokeWidth="2" />
      <rect x="16" y="16" width="428" height="268" fill="none" stroke={ink} strokeWidth="0.8" />
      {[123, 230, 337].map((x) => (
        <g key={`zv${x}`}>
          <line x1={x} y1="11" x2={x} y2="16" stroke={ink} strokeWidth="0.8" />
          <line x1={x} y1="284" x2={x} y2="289" stroke={ink} strokeWidth="0.8" />
        </g>
      ))}
      {[83, 150, 217].map((y) => (
        <g key={`zh${y}`}>
          <line x1="11" y1={y} x2="16" y2={y} stroke={ink} strokeWidth="0.8" />
          <line x1="444" y1={y} x2="449" y2={y} stroke={ink} strokeWidth="0.8" />
        </g>
      ))}
      {[70, 177, 284, 391].map((x, i) => (
        <g key={`zn${x}`}>
          <text x={x} y="12.5" fontSize="6" fill={ink} textAnchor="middle">{i + 1}</text>
          <text x={x} y="293" fontSize="6" fill={ink} textAnchor="middle">{i + 1}</text>
        </g>
      ))}
      {[52, 119, 186, 253].map((y, i) => (
        <g key={`zl${y}`}>
          <text x="9" y={y} fontSize="6" fill={ink} textAnchor="middle">{"ABCD"[i]}</text>
          <text x="451" y={y} fontSize="6" fill={ink} textAnchor="middle">{"ABCD"[i]}</text>
        </g>
      ))}

      <text x="24" y="30" fontSize="9" fontWeight="700" fill={ink}>
        TRACKER HARNESS + ENGINE CUT-OFF — {vLabel} SYSTEM
      </text>
      <text x="436" y="30" textAnchor="end" fontSize="6" fill={note}>SINGLE-LINE DIAGRAM</text>

      {/* ============ B1 vehicle battery ============ */}
      <text x="51" y="50" textAnchor="middle" fontSize="7" fontWeight="700" fill={ink}>B1</text>
      <text x="51" y="59" textAnchor="middle" fontSize="5.5" fill={note}>BATTERY {vLabel} DC</text>
      <line x1="44" y1="66" x2="44" y2="82" stroke={ink} strokeWidth="2.5" />
      <line x1="48" y1="70" x2="48" y2="78" stroke={ink} strokeWidth="1" />
      <line x1="54" y1="66" x2="54" y2="82" stroke={ink} strokeWidth="2.5" />
      <line x1="58" y1="70" x2="58" y2="78" stroke={ink} strokeWidth="1" />
      <text x="64" y="72" fontSize="8" fontWeight="700" fill={ink}>+</text>
      <line x1="58" y1="74" x2="96" y2="74" stroke={ink} strokeWidth="1.5" />

      {/* ============ RD: battery + → pin 1 (fused F1) ============ */}
      <path d="M96,74 L120,74 L120,140 L180,140" stroke={ink} strokeWidth="1.5" fill="none" />
      <circle cx="180" cy="140" r="2" fill={ink} />
      <text x="104" y="68" fontSize="6" fontWeight="700" fill={ink}>RD +B</text>
      <rect x="113" y="96" width="14" height="18" fill="#ffffff" stroke={ink} strokeWidth="1.2" />
      <line x1="120" y1="96" x2="120" y2="114" stroke={ink} strokeWidth="1" />
      <text x="130" y="108" fontSize="6" fill={ink}>F1 2A</text>

      {/* ============ BK: pin 2 → chassis ground ============ */}
      <path d="M180,160 L150,160 L150,250 L70,250 L70,254" stroke={ink} strokeWidth="1.5" fill="none" />
      <circle cx="180" cy="160" r="2" fill={ink} />
      <text x="80" y="244" fontSize="6" fontWeight="700" fill={ink}>BK GND</text>
      <line x1="62" y1="254" x2="78" y2="254" stroke={ink} strokeWidth="2" />
      <line x1="65" y1="258" x2="75" y2="258" stroke={ink} strokeWidth="1.4" />
      <line x1="68" y1="262" x2="72" y2="262" stroke={ink} strokeWidth="0.9" />

      {/* ============ YL: pin 3 → ignition sense ============ */}
      <path d="M290,140 L330,140 L330,78 L392,78" stroke={ink} strokeWidth="1.5" fill="none" />
      <circle cx="290" cy="140" r="2" fill={ink} />
      <circle cx="392" cy="78" r="2" fill={ink} />
      <text x="336" y="72" fontSize="6" fontWeight="700" fill={ink}>YL ACC</text>
      <rect x="384" y="56" width="56" height="44" fill="none" stroke={ink} strokeWidth="0.8" strokeDasharray="5 3" />
      <circle cx="394" cy="78" r="2" fill="none" stroke={ink} strokeWidth="1.2" />
      <circle cx="414" cy="78" r="2" fill="none" stroke={ink} strokeWidth="1.2" />
      <line x1="394" y1="78" x2="410" y2="68" stroke={ink} strokeWidth="1.3" />
      <text x="412" y="94" textAnchor="middle" fontSize="5.5" fill={note}>S1 IGN SWITCH</text>
      <text x="412" y="50" textAnchor="middle" fontSize="6" fontWeight="700" fill={ink}>ACC LINE</text>

      {/* ============ OR: pin 4 → K1 coil (hops over feed) ============ */}
      <path d="M290,160 L305,160 L305,203 A8,8 0 0 0 305,219 L305,235 L310,235" stroke={ink} strokeWidth="1.5" fill="none" />
      <circle cx="290" cy="160" r="2" fill={ink} />
      <text x="300" y="152" fontSize="6" fontWeight="700" fill={ink} textAnchor="middle">OR CUT-OUT</text>

      {/* ============ pump feed: fused source → CUT → K1 → M1 ============ */}
      <rect x="24" y="196" width="72" height="30" fill="#ffffff" stroke={ink} strokeWidth="1.5" />
      <text x="60" y="210" textAnchor="middle" fontSize="6.5" fontWeight="700" fill={ink}>FUSED +12V</text>
      <text x="60" y="219" textAnchor="middle" fontSize="5" fill={note}>PUMP FEED</text>
      <line x1="96" y1="211" x2="160" y2="211" stroke={ink} strokeWidth="1.5" />
      <text x="102" y="203" fontSize="6" fontWeight="700" fill={ink}>RD PUMP FEED</text>
      <line x1="164" y1="205" x2="164" y2="217" stroke={ink} strokeWidth="1.5" />
      <line x1="170" y1="205" x2="170" y2="217" stroke={ink} strokeWidth="1.5" />
      <text x="167" y="200" textAnchor="middle" fontSize="6" fontWeight="700" fill={ink}>CUT</text>
      <line x1="172" y1="211" x2="310" y2="211" stroke={ink} strokeWidth="1.5" />

      {/* ============ K1 relay ============ */}
      <rect x="310" y="188" width="130" height="58" fill="none" stroke={ink} strokeWidth="1" strokeDasharray="6 3" />
      <text x="434" y="207" textAnchor="end" fontSize="6.5" fontWeight="700" fill={ink}>K1 RELAY</text>
      <text x="434" y="215" textAnchor="end" fontSize="5" fill={note}>30A AUTOMOTIVE · SPDT</text>
      {/* terminal 30 (splice point 1) */}
      <circle cx="310" cy="211" r="1.8" fill={ink} />
      <text x="315" y="206" fontSize="5" fill={note}>30 · SPL1</text>
      <line x1="310" y1="211" x2="340" y2="211" stroke={ink} strokeWidth="1.5" />
      {/* contact arm — closed on NC at rest */}
      <circle cx="340" cy="211" r="2.5" fill={ink} />
      <line x1="340" y1="211" x2="362" y2="203" stroke={ink} strokeWidth="1.5" />
      <circle cx="368" cy="201" r="2.5" fill="none" stroke={ink} strokeWidth="1.1" />
      <text x="372" y="195" fontSize="5" fill={ink}>87a (NC)</text>
      <circle cx="364" cy="218" r="2.5" fill="none" stroke={ink} strokeWidth="1.1" />
      <line x1="366" y1="218" x2="378" y2="218" stroke={ink} strokeWidth="0.9" />
      <text x="382" y="221" fontSize="5" fill={note}>87 (NO) UNUSED</text>
      {/* NC out → pump (splice point 2) */}
      <line x1="370" y1="201" x2="390" y2="201" stroke={ink} strokeWidth="1.5" />
      <line x1="390" y1="201" x2="390" y2="188" stroke={ink} strokeWidth="1.5" />
      <circle cx="390" cy="188" r="1.8" fill={ink} />
      <text x="396" y="193" fontSize="5" fill={note}>SPL2</text>
      <line x1="390" y1="188" x2="390" y2="156" stroke={ink} strokeWidth="1.5" />
      {/* coil + pins 85/86 */}
      <rect x="358" y="228" width="34" height="14" fill="none" stroke={ink} strokeWidth="1.1" />
      <text x="375" y="238" textAnchor="middle" fontSize="5.5" fill={ink}>COIL</text>
      <line x1="310" y1="235" x2="358" y2="235" stroke={ink} strokeWidth="1.5" />
      <text x="330" y="231" fontSize="5" fill={note}>85</text>
      <line x1="392" y1="235" x2="405" y2="235" stroke={ink} strokeWidth="1.5" />
      <line x1="405" y1="235" x2="405" y2="188" stroke={ink} strokeWidth="1.5" />
      <circle cx="405" cy="188" r="1.8" fill={ink} />
      <text x="398" y="231" fontSize="5" fill={note}>86</text>
      {/* WH: pin 86 → chassis ground */}
      <line x1="405" y1="188" x2="405" y2="112" stroke={ink} strokeWidth="1.5" />
      <text x="416" y="115" fontSize="6" fontWeight="700" fill={ink}>WH GND</text>
      <line x1="397" y1="112" x2="413" y2="112" stroke={ink} strokeWidth="2" />
      <line x1="400" y1="116" x2="410" y2="116" stroke={ink} strokeWidth="1.4" />
      <line x1="403" y1="120" x2="407" y2="120" stroke={ink} strokeWidth="0.9" />

      {/* ============ M1 pump ============ */}
      <rect x="340" y="128" width="60" height="28" fill="#ffffff" stroke={ink} strokeWidth="1.5" />
      <text x="370" y="142" textAnchor="middle" fontSize="6.5" fontWeight="700" fill={ink}>M1 PUMP</text>
      <text x="370" y="151" textAnchor="middle" fontSize="5" fill={note}>FUEL/CRANK</text>

      {/* ============ X1 tracker ============ */}
      <rect x="180" y="118" width="110" height="60" fill="#ffffff" stroke={ink} strokeWidth="1.8" />
      <text x="235" y="134" textAnchor="middle" fontSize="10" fontWeight="700" fill={ink}>ST-901A</text>
      <text x="235" y="143" textAnchor="middle" fontSize="5" fill={note}>X1 GPS TRACKER</text>
      <circle cx="215" cy="155" r="3" fill="none" stroke={ink} strokeWidth="0.9" />
      <circle cx="235" cy="155" r="3" fill="none" stroke={ink} strokeWidth="0.9" />
      <circle cx="255" cy="155" r="3" fill="none" stroke={ink} strokeWidth="0.9" />
      <text x="215" y="170" textAnchor="middle" fontSize="4.5" fill={note}>PWR</text>
      <text x="235" y="170" textAnchor="middle" fontSize="4.5" fill={note}>GSM</text>
      <text x="255" y="170" textAnchor="middle" fontSize="4.5" fill={note}>GPS</text>
      <line x1="174" y1="140" x2="180" y2="140" stroke={ink} strokeWidth="1" />
      <line x1="174" y1="160" x2="180" y2="160" stroke={ink} strokeWidth="1" />
      <line x1="290" y1="140" x2="296" y2="140" stroke={ink} strokeWidth="1" />
      <line x1="290" y1="160" x2="296" y2="160" stroke={ink} strokeWidth="1" />
      <text x="186" y="143" fontSize="5" fill={ink}>1 +B</text>
      <text x="186" y="163" fontSize="5" fill={ink}>2 GND</text>
      <text x="284" y="143" fontSize="5" fill={ink} textAnchor="end">3 ACC</text>
      <text x="284" y="163" fontSize="5" fill={ink} textAnchor="end">4 OUT</text>

      {/* ============ legend + notes ============ */}
      <text x="170" y="66" fontSize="5.5" fill={note}>
        WIRE CODES: RD=RED · BK=BLACK · YL=YELLOW · OR=ORANGE · WH=WHITE
      </text>
      <text x="24" y="270" fontSize="5.5" fill={note}>
        K1 = OPTIONAL CUT-OFF RELAY · CONTACTS SHOWN DE-ENERGISED (NC): PUMP RUNS
      </text>
      <text x="24" y="278" fontSize="5.5" fill={note}>
        UNTIL THE CUT COMMAND ENERGISES THE COIL · SPL = SPLICE CUT ENDS ONTO 30/87a
      </text>

      {/* ============ title block (ISO 7200) ============ */}
      <rect x="252" y="250" width="192" height="34" fill="#ffffff" stroke={ink} strokeWidth="1" />
      <line x1="252" y1="267" x2="444" y2="267" stroke={ink} strokeWidth="0.8" />
      <line x1="378" y1="250" x2="378" y2="267" stroke={ink} strokeWidth="0.8" />
      <line x1="368" y1="267" x2="368" y2="284" stroke={ink} strokeWidth="0.8" />
      <text x="256" y="256" fontSize="5" fill={note}>TITLE</text>
      <text x="256" y="264" fontSize="7" fontWeight="700" fill={ink}>HARNESS + CUT-OFF {vLabel}</text>
      <text x="382" y="256" fontSize="5" fill={note}>SCALE</text>
      <text x="382" y="264" fontSize="7" fill={ink}>NTS</text>
      <text x="256" y="274" fontSize="5" fill={note}>DWG NO.</text>
      <text x="256" y="281" fontSize="6.5" fontWeight="700" fill={ink}>AEROTRACK-GENERIC-001</text>
      <text x="372" y="274" fontSize="5" fill={note}>SHEET</text>
      <text x="372" y="281" fontSize="6.5" fill={ink}>1 OF 1</text>
    </svg>
  );
}
