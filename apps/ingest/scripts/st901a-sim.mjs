/**
 * SinoTrack ST-901A bench simulator.
 *
 * Opens a TCP connection to the ingest service on the H02 port (5013) and
 * transmits frames exactly as the device would — a V1 position report every
 * INTERVAL_MS plus a B0 keep-alive — so the full pipeline
 * (socket → decoder → positions table → realtime → web UI) can be tested
 * before real hardware arrives.
 *
 * Usage:
 *   pnpm sim:st901a                              # defaults below
 *   TRACKER_ID=8160528336 PORT=5013 HOST=127.0.0.1 INTERVAL_MS=30000 node scripts/st901a-sim.mjs
 *
 * Point a real unit at the same listener via SMS:
 *   8040000 <public-ip-or-domain> 5013   (server + port)
 *   8030000 <apn>                      (carrier APN)
 *   7100000                            (enable GPRS mode)
 *   8960000E00                         (UTC)
 *   RCONF                              (read back config)
 */

import net from "net";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 5013);
const TRACKER_ID = process.env.TRACKER_ID ?? "8160528336";
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 15_000);

// A small loop around Harare CBD so consecutive fixes move realistically.
const ROUTE = [
  [31.0522, -17.8292], // Harare Depot geofence centre
  [31.0580, -17.8250],
  [31.0650, -17.8220],
  [31.0720, -17.8300],
  [31.0810, -17.8150],
  [31.0900, -17.8200],
];

let step = 0;

/** ddmm.mmmm NMEA encoding, exactly like the ST-901A emits. */
function nmeaCoord(decimal, isLat) {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minutes = (abs - deg) * 60;
  const degDigits = isLat ? 2 : 3;
  return `${String(deg).padStart(degDigits, "0")}${minutes.toFixed(4).padStart(7, "0")}`;
}

function utcStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    time: `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`,
    date: `${pad(d.getUTCDate())}${pad(d.getUTCMonth() + 1)}${String(d.getUTCFullYear()).slice(2)}`,
  };
}

/** *HQ,id,V1,hhmmss,A,lat,N,lon,E,speed(kn),course,ddmmyy,FFFFFBFF# */
function v1Frame(lng, lat, speedKmh, course) {
  const { time, date } = utcStamp();
  const speedKn = (speedKmh / 1.852).toFixed(2).padStart(5, "0");
  const crs = String(Math.round(course)).padStart(3, "0");
  return `*HQ,${TRACKER_ID},V1,${time},A,${nmeaCoord(lat, true)},${lat < 0 ? "S" : "N"},${nmeaCoord(lng, false)},${lng < 0 ? "W" : "E"},${speedKn},${crs},${date},FFFFFBFF#`;
}

/** *HQ,id,B0,hhmmss,ddmmyy,...# keep-alive with battery/GSM on newer firmware. */
function b0Frame() {
  const { time, date } = utcStamp();
  return `*HQ,${TRACKER_ID},B0,${time},${date},4.14,95#`;
}

const socket = new net.Socket();
let timer = null;

socket.connect(PORT, HOST, () => {
  console.log(`[st901a-sim] Connected to ${HOST}:${PORT} as tracker ${TRACKER_ID}`);
  const send = () => {
    const [lng, lat] = ROUTE[step % ROUTE.length];
    const speed = step % 5 === 0 ? 0 : 40 + (step % 3) * 15;
    const course = step % 5 === 0 ? 0 : (step * 60) % 360;
    const frame = step % 4 === 3 ? b0Frame() : v1Frame(lng, lat, speed, course);
    socket.write(frame);
    console.log(`[st901a-sim] -> ${frame}`);
    step += 1;
  };
  send();
  timer = setInterval(send, INTERVAL_MS);
});

socket.on("data", (data) => {
  // Server downlink commands (e.g. S20 oil cut) land here.
  console.log(`[st901a-sim] <- ${data.toString("latin1")}`);
});

socket.on("close", () => {
  console.log("[st901a-sim] Disconnected, exiting");
  if (timer) clearInterval(timer);
  process.exit(0);
});

socket.on("error", (err) => {
  console.error(`[st901a-sim] Socket error: ${err.message}`);
  process.exit(1);
});
