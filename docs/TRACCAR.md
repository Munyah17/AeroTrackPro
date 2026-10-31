# Traccar ↔ AeroTrack Integration Reference

AeroTrack infra = **Vercel + Supabase + one small TCP host running our own
`apps/ingest`** (Fly.io — see `fly.toml`). Traccar is used the way an open-
source supplier should be (Apache-2.0): we **mine its codebase** for protocol
decoders/port maps (already ported into `@aerotrack/protocols`), and its
**hosted instance can be borrowed per-device** for a protocol we haven't
decoded yet — point that unit at Traccar, set its `forward.url` device
attribute to our `/api/telemetry`, done. No Traccar server is ours.

Each side reaches the other only through the contract surfaces below; neither
reads or writes the other's database, and neither duplicates the other's job
for a given device.

---

## 1. Ownership matrix

| Concern | Owner | The other side must NOT… |
|---|---|---|
| Device sockets (TCP listeners, ports 5000+) | **`apps/ingest`** (Fly.io) — default | Traccar only owns sockets for units we deliberately point at it (unhandled protocols); never the same unit on both |
| Wire-protocol decode (h02, gt06, teltonika…) | `@aerotrack/protocols` | Traccar's decoders are a porting reference, not a runtime dependency |
| Position storage, retention, history | AeroTrack (`positions`, `devices` tables) | Traccar's own DB copy is treated as transient cache — never queried |
| Command UX, validation, audit trail | AeroTrack (`device_commands` table) | Traccar's own command history is ignored; its DB is not the record of truth |
| Command → wire-byte translation | Traccar | AeroTrack sends abstract types only; never writes raw bytes for Traccar-managed devices |
| Device identity | AeroTrack (`devices.imei`, `devices.traccar_id`) | Traccar's `uniqueId`/`id` mirror our values, never the source of truth |
| Tenancy, users, billing | AeroTrack (Supabase) | Traccar has exactly one service account — no customer data |
| Customer notifications | AeroTrack (`lib/notify.ts` → in-app/Resend/Twilio) | Traccar notificators only for the optional Traccar-Manager-app path (§8) |
| Forwarded-data delivery | Traccar (its forwarder) | AeroTrack only exposes HTTP endpoints; it never polls Traccar |
| Outbound-command delivery | AeroTrack initiates | Traccar only executes + queues; it never initiates commands |

### Boundary rules

1. **Traccar → AeroTrack** exclusively via `POST /api/telemetry` +
   `POST /api/webhooks/status` with the shared secret. Never direct DB access.
2. **AeroTrack → Traccar** exclusively via the REST API (`/api/commands/send`,
   `/api/devices`, `/api/commands/types`). Never touches Traccar's DB or sockets.
3. **Secrets pair one-to-one**: `TRACCAR_FORWARD_SECRET` guards inbound;
   `TRACCAR_TOKEN`/credentials guard outbound. Neither side reuses the other's secret.
4. **Failures are recorded, not retried across the boundary**: Traccar retries
   forwarding itself (`forward.retry.*`); AeroTrack audits command failures in
   `device_commands` and lets humans re-send.
5. **Commands pick a transport once, at insert time** (`transport` column):
   `traccar` = linked device via Traccar REST; `ingest` = unlinked device,
   drained by apps/ingest over its live TCP socket; `sms`/`none` = no path yet.
   Each dispatcher only drains its own rows — no cross-transport stealing.

---

## 2. Data flow + contract surfaces

```
PRIMARY (native):                                          SUPABASE
TRACKER ──TCP──> apps/ingest (Fly.io) ──positions/devices──>     ▲
                       ▲                                     device_commands
   command downlink ◄──┘  (drains transport='ingest' queue)       ▲
                                                                  │
UI / REST v1 ──> /api/commands → recordAndDispatch ─insert─────────┘
                                        │
BORROWED (per-device, optional):        └─ transport='traccar' ──POST /api/commands/send──> TRACCAR hosted ──> tracker
TRACKER ──TCP──> TRACCAR hosted ──forward.url──> POST /api/telemetry    (+ event.forward → /api/webhooks/status)

HTTP devices/phones ────────────> GET|POST /api/ingest/osmand (Vercel, direct to Supabase)
```

| Surface | Direction | Payload | AeroTrack handler | Traccar side |
|---|---|---|---|---|
| Position forward | Traccar → AT | `{position, device}` (also `{positions[],devices[]}` or bare position) | `app/api/telemetry/route.ts` | `forward.type=json` + `forward.url` |
| Event webhook | Traccar → AT | `{event, device}` JSON | `app/api/webhooks/status/route.ts` | `event.forward.url` |
| Command dispatch | AT → Traccar | `{deviceId, type, description, textChannel, attributes}` | `lib/traccar.ts sendTraccarCommand` | `POST /api/commands/send` |
| Command capabilities | AT → Traccar | `?deviceId=&textChannel=` | `getTraccarCommandTypes()` | `GET /api/commands/types` |
| Device provisioning | AT → Traccar | `{uniqueId, name}` / `?uniqueId=` | `ensureTraccarDevice`/`findTraccarDevice` | `POST/GET /api/devices` |
| Auth (outbound) | AT → Traccar | Bearer token or JSESSIONID | `traccarFetch()` | `/api/session`, `/api/session/token` |

**Inbound auth** — all three accepted by `verifyForwardSecret`:
`?key=`/`?token=` query param · `Authorization: Bearer` · `x-forward-key` header.
Unset `TRACCAR_FORWARD_SECRET` = open dev mode (logs a warning once).

---

## 3. Inbound field map (Traccar → AeroTrack)

### Position fix → `positions` row + `devices` stamps

| Traccar field | AeroTrack target | Transform |
|---|---|---|
| `position.deviceId` | resolve `devices` row | `traccar_id` match → else `device.uniqueId`→`devices.imei` match (then **learns + persists** `traccar_id`) |
| `latitude`, `longitude` | `positions.latitude/.longitude` | direct |
| `speed` | `positions.speed` | **knots × 1.852 → km/h** |
| `fixTime` / `deviceTime` / `serverTime` | `positions.timestamp` family | ISO timestamps |
| `altitude`, `course`, `accuracy`, `valid`, `address` | matching `positions` columns | direct |
| `protocol`, `attributes` | `positions.raw_data` | `{source:'traccar', protocol, attributes}` |
| `attributes.batteryLevel`, signal attrs | `devices.battery_level`, `signal_strength` | extracted |
| (any fix received) | `devices.last_position_at`, `last_seen_at`, `connection_status='online'` | stamped on every fix |

### Event → `devices` status + notifications

| Traccar event | AeroTrack effect |
|---|---|
| `deviceOnline` | `devices.connection_status='online'`, `last_seen_at`, fires `device_online` notify event |
| `deviceOffline` | `connection_status='offline'`, fires `device_offline` notify event |
| other types | HTTP 200 ack, ignored — alarm attrs arrive on positions and route through `mapTraccarAlarm` |

---

## 4. Outbound map (AeroTrack → Traccar → tracker)

### Entry points → same dispatch path

| Entry | Route | Auth | Then |
|---|---|---|---|
| `/commands` UI | `POST /api/commands` | session cookie | `recordAndDispatch()` |
| REST API | `POST /api/v1/devices/:id/commands` | `atk_` key, `write` scope | `recordAndDispatch()` |

`recordAndDispatch` (`lib/device-commands.ts`): **insert audit row → dispatch
→ stamp outcome**. `commandSchema` = full `DeviceCommand` union (Zod).

### Traccar response → audit status

| `POST /commands/send` result | `device_commands.status` | `dispatch.kind` | Meaning |
|---|---|---|---|
| `200` | `sent` (+`sent_at`, `response`) | `sent` | Delivered to device channel now |
| `202` | stays `pending` (+`queued` response, error note) | `queued`/`device_offline` | Device offline; Traccar holds for next connect |
| non-2xx | `failed` (+`error`, `response`) | `failed` | Traccar refused (HTTP status recorded) |
| — | `pending` | `queued`/`traccar_unconfigured` | No Traccar env configured |
| — | `pending` | `queued`/`device_not_linked` | Device has no `traccar_id` yet |
| thrown error | `failed` (+`error`) | `failed` | Network/transport exception |

### `DeviceCommand` → Traccar type

| Ours | Traccar `type` | Attributes |
|---|---|---|
| `engineStop` / `engineResume` | `engineStop` / `engineResume` | — |
| `locate` | `positionSingle` | — |
| `setInterval` | `positionPeriodic` | `{data: seconds}` |
| `setTimezone` | `setTimezone` | `{timezone: utcOffsetMinutes}` |
| `reboot` | `rebootDevice` | — |
| `arm` / `disarm` | `alarmArm` / `alarmDisarm` | — |
| `sosNumber` | `sosNumber` | `{index: slot, phone}` |
| `setApn`, `setServer`, `setOverspeed`, `factoryReset`, `listen`, `custom` | `custom` | `{data}` — pre-encoded wire string from `@aerotrack/protocols` `encodeCommand` |

Channel: `channel:"sms"` → payload `textChannel:true` (SMS instead of GPRS).
Legacy `POST /api/commands` fallback kept for 404/405 (older builds).

---

## 5. Identity binding (same device, three names)

| Side | Field | Value |
|---|---|---|
| Tracker sticker / SIM | — | e.g. `8160528336` (10-digit ID, not IMEI) |
| Traccar | `uniqueId` (+internal `id`) | `8160528336` / learned integer |
| AeroTrack | `devices.imei` + `devices.traccar_id` | `8160528336` / `bigint` learned on first fix |

Flow: onboarding → `ensureTraccarDevice(imei)` registers uniqueId if absent →
tracker reports → `/api/telemetry` resolves `traccar_id`→imei→persists
`traccar_id` → all later lookups O(1). Commands require `traccar_id` — first
fix must arrive before outbound dispatch works.

---

## 6. Config pairs (each secret maps exactly once)

| AeroTrack side (`.env.local`) | Traccar side (`conf/traccar.xml`) | Relationship |
|---|---|---|
| `TRACCAR_BASE_URL` | `web.port` 8082 + public address | points AT → Traccar REST |
| `TRACCAR_TOKEN` | generated via `POST /api/session/token` | preferred outbound auth |
| `TRACCAR_EMAIL`+`TRACCAR_PASSWORD` | Traccar service account | fallback auth (auto re-login on 401) |
| `TRACCAR_FORWARD_SECRET` | `?key=` on `forward.url`/`event.forward.url`, or `forward.header`/`event.forward.header` `Authorization: Bearer` | guards inbound |
| — | `notificator.traccar.key` | host-only, optional Traccar-Manager push |

---

## 7. Traccar-side config — via attributes, not files

We don't touch `traccar.xml` (no server of ours to put it on). On a managed
Traccar server the same keys are set as **attributes** through their web UI
(Settings → Server → Attributes) or REST (`PUT /api/server`, `PUT /api/devices/{id}`):

| Key | Level | Value |
|---|---|---|
| `forward.url` | server or per-device | `https://APP/api/telemetry?key=SECRET` |
| `forward.header` | server (global url only) | `Authorization: Bearer SECRET` (alternative to `?key=`) |
| `forward.type` | config only — default `url` | **must be `json` for our JSON handler — verify the managed server uses `forward.type=json`, or our `/api/telemetry` must also accept url-mode forwards** |
| `event.forward.url` | server | `https://APP/api/webhooks/status?key=SECRET` |

Per-device `forward.url` is the escape hatch when server attributes are
locked — set it on each device via `PUT /api/devices/{id}` `attributes` and
each unit forwards to its own URL (can even carry the secret per-device).

`deploy/traccar.xml.example` stays in the repo purely as the config reference
for anyone who does run a dedicated Traccar (not our plan).

- `server.forward` mirrors raw protocol bytes to a second listener (could feed `apps/ingest`).
- WebSocket `/api/socket` (session cookie) streams `devices`/`positions`/`events` — not consumed yet.

---

## 8. Notifications — parallel stacks, no crosstalk

| Stack | Channel | Trigger | Audience |
|---|---|---|---|
| **AeroTrack** `lib/notify.ts` | in-app + Resend email + Twilio SMS | `/api/telemetry` alarm attrs, `/api/webhooks/status` online/offline, coupon/business events | tenant users (per-user prefs) |
| **Traccar notificator** (optional) | push to official Traccar Manager apps | Traccar-internal notification rules per user/device | whoever carries Traccar Manager |

Rules: the push key lives only in host `traccar.xml` (never git/.env); the two
stacks never trigger each other; `web` notificator toasts are irrelevant
headless. Direct Firebase (`notificator.firebase.serviceAccount`) reserved for
a future AeroTrack mobile app.

---

## 9. OsmAnd protocol (HTTP ingest — port 5055)

GET/POST → fix. `id`/`deviceid` required; `lat`,`lon`,`timestamp`,`valid`,
`speed` (knots),`bearing`,`altitude`,`accuracy`,`hdop`,`batt`,`charge`,
`driverUniqueId`,`cell`,`wifi`; extras → attributes.

**Implemented natively**: `GET|POST /api/ingest/osmand` (edge route,
`TRACCAR_FORWARD_SECRET`-guarded, resolves `id`→`devices.imei`, knots→km/h,
stamps device hot-cache columns). Same device-id semantics as the TCP
listeners — an OsmAnd client is just another tracker.

```
GET /api/ingest/osmand?id=8160528336&lat=-17.82&lon=31.05&timestamp=1609459200000&speed=15&batt=75&key=SECRET
```

Uses: Traccar Client phone app (non-vehicle assets — parcels, pets, staff),
curl simulation, any HTTP-capable tracker firmware.

---

## 10. Where the pieces run

| Piece | Runs on | Notes |
|---|---|---|
| AeroTrack app + REST API + inbound webhooks + **OsmAnd ingest** | **Vercel** | serverless — HTTP in/out only |
| AeroTrack DB + auth + command queue | **Supabase** | Postgres + RLS; `device_commands` doubles as the dispatch queue |
| **TCP listeners + decoders + command downlink** | **`apps/ingest` on Fly.io** (`fly.toml` + `apps/ingest/Dockerfile`) | raw TCP can't be serverless — this is the only always-on process we own |
| Protocols we haven't decoded yet | **Traccar hosted** (demo free / paid managed) | borrowed per-device: point unit at Traccar + set `forward.url` device attr → our `/api/telemetry` |

Why the split: trackers speak raw TCP/UDP — no serverless platform holds
those sockets. Everything else already lived on Vercel/Supabase. Fly.io gives
anycast TCP services for free-allowance money; `fly secrets set
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=…` then `fly deploy`.

**Traccar borrow test** (only if a protocol gap forces it): register device on
demo.traccar.org → `PUT /api/devices/{id}` `attributes:{"forward.url":"https://APP/api/telemetry?key=SECRET"}`.
Caveat: `forward.type` defaults to `url` (query params) — if the hosted server
can't be switched to `json`, `/api/telemetry` must also accept url-mode
forwards (pending task).

---

## 11. Bring-up paths

**Native (primary) — ST-901A onto our own ingest:**
1. `fly deploy` ingest; `fly secrets set SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY`.
2. SMS to the tracker (pwd `0000`): `8030000 <apn>` → `8040000 <fly-ip-or-hostname> 5013` → `7100000` → `8960000E00` → `8050000 <sec>` → `RCONF`.
   (Fly assigns a dedicated IPv4 for TCP services — check `fly ips list`; if
   the firmware needs a dotted IP, use the IPv4, not the hostname.)
3. Device row needs `imei=8160528336` + `protocol='h02'` — fixes flow
   immediately; commands queued from `/commands` drain over the live socket.

**Traccar borrow (only for protocols ingest lacks):**
1. demo.traccar.org → add device `uniqueId=<imei>`; point tracker at
   `144.91.97.245` + protocol port.
2. `.env.local`: `TRACCAR_BASE_URL=https://demo.traccar.org`, `TRACCAR_EMAIL`, `TRACCAR_PASSWORD` — `/commands` dispatches via Traccar REST (200 sent / 202 queued).
3. Positions back into AeroTrack need `forward.url` honored per-device (§10).

**OsmAnd (no socket host at all):** phones/HTTP devices →
`GET /api/ingest/osmand?id=<imei>&lat=..&lon=..&timestamp=..&key=<secret>` —
implemented natively on Vercel.

Dev: `pnpm dev` → **port 3001** (never 3000) · `pnpm sim:traccar` · `pnpm sim:st901a` (`apps/ingest`).
