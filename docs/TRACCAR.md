# Traccar ↔ AeroTrack Integration Reference

Two systems, strict separation of duties. **Traccar** is a consumed service
(their hosted servers, e.g. demo.traccar.org or a paid subscription) — it owns
device TCP/UDP sockets and 200-protocol decoding so we never re-implement the
protocol grind. **AeroTrack** is Vercel + Supabase only — identity, tenancy,
storage, UI, business logic, customer notifications. Each side reaches the
other only through the contract surfaces below; neither reads or writes the
other's database, and neither duplicates the other's job.

We do NOT self-host Traccar. Everything Traccar-side is configured through
their REST API or web UI (`forward.url`/`forward.header` are per-device
attributes, not just config keys) — see §10.

---

## 1. Ownership matrix

| Concern | Owner | The other side must NOT… |
|---|---|---|
| Device sockets (TCP/UDP listeners, ports 5000+) | Traccar | AeroTrack ingest never binds the same ports for the same device — run native decoders **or** Traccar per unit, not both |
| Wire-protocol decode (h02, gt06, teltonika…) | Traccar | AeroTrack doesn't re-decode Traccar-managed traffic; `apps/ingest` is a *separate* pipeline for devices not on Traccar |
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

---

## 2. Data flow + contract surfaces

```
TRACKER ──TCP/UDP──> TRACCAR ──forward.url (JSON)────> POST /api/telemetry
                     (host)    ──event.forward (JSON)─> POST /api/webhooks/status

UI / REST v1 ──> /api/commands → recordAndDispatch ──POST /api/commands/send──> TRACCAR ──> tracker
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

```
GET http://demo.traccar.org:5055/?id=8160528336&lat=-17.82&lon=31.05&timestamp=1609459200000&speed=15&batt=75
```

Uses: Traccar Client phone app (non-vehicle assets — parcels, pets, staff),
curl simulation, candidate native `apps/ingest` endpoint (HTTP devices into
AeroTrack with no Traccar hop).

---

## 10. Where the pieces run

| Piece | Runs on | Notes |
|---|---|---|
| AeroTrack app + REST API + inbound webhooks | **Vercel** | serverless — HTTP in/out only |
| AeroTrack DB + auth | **Supabase** | Postgres + RLS |
| Device sockets + protocol decode + REST API | **Traccar hosted** (demo.traccar.org free, or paid managed) | the only thing that must hold always-on TCP; NOT our infra |
| `apps/ingest` native decoders | wherever a TCP host exists later | parallel path for devices not on Traccar; can't run on Vercel either |

So the "hosting question" reduces to **which Traccar instance**:

| Option | Cost | Positions → AeroTrack? | Commands? |
|---|---|---|---|
| **demo.traccar.org** | free | try: `forward.url` as device attribute (per §7) — worth testing | ✓ |
| **Traccar paid subscription** (traccar.org) | ~small | ask whether `forward.url`/`event.forward.url` server attributes are allowed | ✓ |
| Self-hosted Traccar (Oracle free VM / $5 droplet) | free–$5 | ✓ full `traccar.xml` control | ✓ |

Only pick the self-hosted row if managed forwarding turns out to be blocked —
it's the fallback, not the plan.

---

## 11. Current test path

1. Register on **demo.traccar.org**; add device `uniqueId=8160528336`.
2. Point ST-901A at it (SMS, pwd `0000`): `8030000 <apn>` → `8040000 144.91.97.245 5013` → `7100000` → `8960000E00` → `8050000 <sec>` → `RCONF`.
3. `.env.local`: `TRACCAR_BASE_URL=https://demo.traccar.org`, `TRACCAR_EMAIL`, `TRACCAR_PASSWORD`.
4. Verify: fixes appear in Traccar UI; `/commands` page dispatches real commands (202→queued when offline).
5. **Bridge test**: try `PUT /api/devices/{id}` on demo with
   `attributes: { "forward.url": "https://APP/api/telemetry?key=SECRET" }` —
   if the demo forwarder honors per-device URLs, positions flow into AeroTrack
   without any self-hosting. Fall back to paid subscription if it doesn't.

Dev: `pnpm dev` → **port 3001** (never 3000) · `pnpm sim:traccar` · `pnpm sim:st901a` (`apps/ingest`).
