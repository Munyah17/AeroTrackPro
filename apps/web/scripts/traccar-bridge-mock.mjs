/**
 * Simulates Traccar's position forwarding + event webhooks against a running
 * AeroTrack app — validates /api/telemetry and /api/webhooks/status writes
 * before a live Traccar instance is deployed.
 *
 *   node scripts/traccar-bridge-mock.mjs
 *   BASE_URL=http://localhost:3001 KEY=secret node scripts/traccar-bridge-mock.mjs
 *
 * UNIQUE_ID defaults to the seeded ST-901A tracker id ('8160528336').
 * KINGWO_UNIQUE_ID targets a second device row (skipped cleanly if absent).
 */

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3001").replace(/\/+$/, "");
const KEY = process.env.KEY ?? "";
const SINO_UNIQUE_ID = process.env.UNIQUE_ID ?? "8160528336";
const KINGWO_UNIQUE_ID = process.env.KINGWO_UNIQUE_ID ?? "864180123456789";

const auth = KEY ? `?key=${KEY}` : "";
const TRACCAR_SINO_ID = 101; // fake numeric traccar device ids — resolver
const TRACCAR_KINGWO_ID = 102; // binds them to our devices.traccar_id

const now = () => new Date().toISOString();

/** Traccar h02 (SinoTrack) position — knots for speed, attributes flat. */
const sinotrackForward = {
  position: {
    id: 9001,
    deviceId: TRACCAR_SINO_ID,
    protocol: "h02",
    fixTime: now(),
    deviceTime: now(),
    serverTime: now(),
    latitude: -17.8216 + Math.random() * 0.01,
    longitude: 31.0492 + Math.random() * 0.01,
    altitude: 1520,
    speed: 24.3, // ~45 km/h
    course: 87.4,
    accuracy: 5,
    valid: true,
    attributes: {
      ignition: true,
      motion: true,
      batteryLevel: 92,
      rssi: 78,
      odometer: 41250,
      protocol: "V1",
    },
  },
  device: {
    id: TRACCAR_SINO_ID,
    uniqueId: SINO_UNIQUE_ID,
    name: "SinoTrack ST-901A",
    status: "online",
  },
};

/** Traccar gt06 (Kingwo) position — same wrapper shape, vendor attrs. */
const kingwoForward = {
  position: {
    id: 9002,
    deviceId: TRACCAR_KINGWO_ID,
    protocol: "gt06",
    fixTime: now(),
    deviceTime: now(),
    serverTime: now(),
    latitude: -17.8302,
    longitude: 31.0517,
    altitude: 1490,
    speed: 0,
    course: 0,
    accuracy: 8,
    valid: true,
    attributes: {
      ignition: false,
      power: 12.4,
      battery: 4,
      rssi: 65,
      alarm: "vibration",
    },
  },
  device: {
    id: TRACCAR_KINGWO_ID,
    uniqueId: KINGWO_UNIQUE_ID,
    name: "Kingwo NTK20",
    status: "online",
  },
};

const onlineEvent = (id, uniqueId, name) => ({
  event: { id: Math.floor(Math.random() * 1e6), type: "deviceOnline", deviceId: id, eventTime: now() },
  device: { id, uniqueId, name },
});
const offlineEvent = (id, uniqueId, name) => ({
  event: { id: Math.floor(Math.random() * 1e6), type: "deviceOffline", deviceId: id, eventTime: now() },
  device: { id, uniqueId, name },
});

async function post(path, payload) {
  const res = await fetch(`${BASE_URL}${path}${auth}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

const steps = [
  ["deviceOnline  (SinoTrack)", "/api/webhooks/status", onlineEvent(TRACCAR_SINO_ID, SINO_UNIQUE_ID, "SinoTrack ST-901A")],
  ["position      (SinoTrack h02)", "/api/telemetry", sinotrackForward],
  ["deviceOnline  (Kingwo)", "/api/webhooks/status", onlineEvent(TRACCAR_KINGWO_ID, KINGWO_UNIQUE_ID, "Kingwo NTK20")],
  ["position      (Kingwo gt06)", "/api/telemetry", kingwoForward],
  ["deviceOffline (SinoTrack)", "/api/webhooks/status", offlineEvent(TRACCAR_SINO_ID, SINO_UNIQUE_ID, "SinoTrack ST-901A")],
];

let failures = 0;
for (const [label, path, payload] of steps) {
  const { status, json } = await post(path, payload);
  const okFlag = status >= 200 && status < 300;
  if (!okFlag) failures++;
  console.log(`${okFlag ? "PASS" : "FAIL"} ${status}  ${label} -> ${JSON.stringify(json)}`);
}
console.log(failures === 0 ? "\nAll mock forwards accepted." : `\n${failures} step(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
