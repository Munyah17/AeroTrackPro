# Traccar Integration Reference

AeroTrack uses **Traccar as a headless hardware engine**: it owns the device
TCP/UDP sockets and 200-protocol decoding, and forwards parsed data to us.
AeroTrack keeps the UI, sessions, business logic, notifications, and its own
native decoder pipeline (`apps/ingest`) as a parallel/alternative path.

---

## 1. Architecture

```
TRACKER ──TCP/UDP──> TRACCAR ──forward.url (JSON)────> POST /api/telemetry
                     (VPS)     ──event.forward (JSON)─> POST /api/webhooks/status

UI / REST v1 ──> /api/commands → recordAndDispatch ──POST /api/commands/send──> TRACCAR ──> tracker
```

- **Inbound** (`apps/web`): `/api/telemetry` handles all three `forward.json`
  shapes (`{position,device}`, `{positions[],devices[]}`, bare position).
  `/api/webhooks/status` handles `deviceOnline`/`deviceOffline`.
  Both verify a shared secret: `?key=` / `?token=` query, `Authorization: Bearer`,
  or `x-forward-key` header (`verifyForwardSecret` in `lib/traccar.ts`).
- **Outbound**: `lib/traccar.ts` (`traccarFetch`, `sendTraccarCommand`,
  `getTraccarCommandTypes`) + `lib/device-commands.ts` (`recordAndDispatch` —
  audit row first, then dispatch, status `pending|sent|failed`).
- **Device binding**: `devices.imei` ↔ Traccar `uniqueId`; the learned
  `devices.traccar_id` is persisted on first forwarded fix.

---

## 2. Hosting decision — NO VPS yet

Traccar (or `apps/ingest`) needs an **always-on TCP host**; serverless can't
hold device sockets.

| Option | Cost | Caveats |
|---|---|---|
| **demo.traccar.org** | Free | All protocol ports open + REST API works — commands testable today. **No config access → no `forward.url` → positions can't reach AeroTrack.** Good for command-path testing only. |
| **Traccar subscription** (traccar.org managed) | Paid | Ask them whether `forward.url`/`event.forward.url` config is available before paying. |
| **Oracle Cloud Always Free ARM VM** | Free | Real VM, runs Traccar well; slightly more setup. Best production path. |
| **Hetzner / Contabo / DO / Vultr** | ~$4–6/mo | Same — Traccar installs via one `.sh`/`.deb` package. |
| **Traccar on this PC** | Free | Full local dev/testing (REST + `pnpm sim:traccar`); real devices can't reach `localhost` without a TCP tunnel (ngrok TCP / Cloudflare). |

---

## 3. Traccar server config (`conf/traccar.xml` on the host)

Template: `deploy/traccar.xml.example`. Key points:

```xml
<entry key='forward.type'>json</entry>        <!-- NOT forward.enable/forward.json — legacy, ignored on 6.x -->
<entry key='forward.url'>https://APP/api/telemetry?key=SECRET</entry>
<entry key='forward.retry.enable'>true</entry> <!-- backoff from 100ms, 10 tries, 100-position buffer -->
<entry key='event.forward.url'>https://APP/api/webhooks/status?key=SECRET</entry>
<entry key='web.port'>8082</entry>
```

- `forward.header` / `event.forward.header` can carry `Authorization: Bearer SECRET` instead of `?key=`.
- `forward.url` is also a **per-device attribute** — scope forwarding per unit later if needed.
- `server.forward` mirrors raw protocol bytes to a second listener (e.g. feed `apps/ingest` too).
- `protocols.enable` narrows open sockets to our 10 protocols.
- Env overrides: `CONFIG_USE_ENVIRONMENT_VARIABLES=true`, dots→`_`, uppercase (`forward.url`→`FORWARD_URL`).
- Optional `notificator.traccar.key` block (see §6) — key lives only on the host, never in git.

---

## 4. AeroTrack env vars (`apps/web/.env.local`)

| Var | Source |
|---|---|
| `TRACCAR_BASE_URL` | `http://<host>:8082` (Traccar `web.port`) |
| `TRACCAR_TOKEN` | `curl -X POST "<BASE>/api/session/token?email=E&password=P"` → returns token. **Preferred auth.** |
| `TRACCAR_EMAIL` + `TRACCAR_PASSWORD` | Alternative — JSESSIONID login with auto re-auth on 401 |
| `TRACCAR_FORWARD_SECRET` | Invented by us (random string); must match `?key=`/header in `traccar.xml`. **Unset = open dev mode.** |

---

## 5. REST API notes (verified against 6.16 OpenAPI)

- **Auth**: Bearer token, JSESSIONID cookie, or HTTP basic — `traccarFetch` handles all.
- **`POST /api/commands/send`**: `200` = sent now, **`202` = queued (device offline, Traccar holds it)**.
  Body: `{deviceId, type, description, textChannel, attributes}`.
  `textChannel:true` → SMS delivery instead of GPRS (ours: `channel:"sms"`).
  `recordAndDispatch` maps 202 → row stays `pending`, dispatch reason `device_offline`.
- **`GET /api/commands/types?deviceId=&textChannel=`** → supported types per device/protocol — `getTraccarCommandTypes()` wraps it (only meaningful after first connect).
- **Legacy**: `POST /api/commands` fallback kept for 404/405 (older builds).
- **Devices**: `GET /api/devices?uniqueId=` lookup, `POST /api/devices` provision — `findTraccarDevice`/`ensureTraccarDevice`.
- **WebSocket** `/api/socket` (session cookie) — streams `devices`/`positions`/`events`; not used yet.

### Our `DeviceCommand` → Traccar type map

| Ours | Traccar |
|---|---|
| `engineStop` / `engineResume` | `engineStop` / `engineResume` |
| `locate` | `positionSingle` |
| `setInterval` | `positionPeriodic` `{data: seconds}` |
| `setTimezone` | `setTimezone` `{timezone}` |
| `reboot` | `rebootDevice` |
| `arm` / `disarm` | `alarmArm` / `alarmDisarm` |
| `sosNumber` | `sosNumber` `{index, phone}` |
| `setApn`, `setServer`, `setOverspeed`, `factoryReset`, `listen`, `custom` | `custom` `{data}` — wire string via `@aerotrack/protocols` `encodeCommand` |

---

## 6. Notifications — two independent stacks

- **AeroTrack** (`lib/notify.ts`): in-app + Resend email + Twilio SMS per-user prefs — this is our product channel.
- **Traccar push** (optional): `notificator.types=...,traccar` + `notificator.traccar.key` in `traccar.xml` delivers native push to the **official Traccar Manager apps** via Traccar's relay. Key obtained at traccar.org/my-account. Requires per-user notification rules in Traccar. Only useful if users also carry Traccar Manager. Direct Firebase (`notificator.firebase.serviceAccount`) is the alternative for a future custom app.
- Traccar's push key **never goes in git or .env** — host-side `traccar.xml` only.

---

## 7. OsmAnd protocol (HTTP ingest — port 5055)

Traccar's simplest ingest: a GET/POST becomes a fix. Params: `id`/`deviceid`
(required), `lat`, `lon`, `timestamp`, `valid`, `speed` (knots), `bearing`,
`altitude`, `accuracy`, `hdop`, `batt`, `charge`, `driverUniqueId`, `cell`,
`wifi`; extras → position attributes.

```
GET http://demo.traccar.org:5055/?id=8160528336&lat=-17.82&lon=31.05&timestamp=1609459200000&speed=15&batt=75
```

Uses: Traccar Client phone app (non-vehicle assets — parcels, pets, field
staff), curl-based simulation, and a candidate native endpoint for
`apps/ingest` (HTTP devices reaching AeroTrack directly, no Traccar needed).

---

## 8. Current test path (no VPS)

1. Register on **demo.traccar.org**; add device `uniqueId=8160528336`.
2. Point ST-901A at it (SMS, pwd `0000`): `8030000 <apn>` → `8040000 144.91.97.245 5013` → `7100000` → `8960000E00` → `8050000 <sec>` → `RCONF`.
3. Set `TRACCAR_BASE_URL=https://demo.traccar.org`, `TRACCAR_EMAIL`, `TRACCAR_PASSWORD` in `.env.local`.
4. Verify: device positions appear in Traccar UI; AeroTrack `/commands` page sends real commands via `POST /api/commands/send` (202→queued if offline).
5. Positions won't flow back into AeroTrack until a host with `forward.url` exists (§2).

Dev scripts: `pnpm dev` (port **3001**, never 3000) · `pnpm sim:traccar` ·
`pnpm sim:st901a` (in `apps/ingest`).
