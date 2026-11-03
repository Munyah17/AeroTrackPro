================================================================================
 AEROTRACK PRO
 Enterprise GPS tracking, fleet management & telematics SaaS platform
================================================================================

--------------------------------------------------------------------------------
1. WHAT THIS SYSTEM IS
--------------------------------------------------------------------------------

AeroTrack Pro is a white-label B2B fleet management platform. Organisations
outsource their transport/logistics operations to AeroTrack and keep a single
Transport Manager; AeroTrack handles the hardware, monitoring, maintenance,
insurance, fuel and security of the fleet.

Core service scope:

  - Live vehicle & asset tracking (map, position history, trips)
  - Alarms & notifications (SOS, overspeed, geofence, power cut, offline)
  - Remote device commands (immobilise/restore engine, intervals, reboot)
  - Fuel coupons negotiated at partner stations, with redemption tracking
  - Insurance delivery & lapse monitoring, maintenance scheduling
  - Reports (distance, trips, alerts) and tenant-scoped REST API access
  - Non-vehicle assets too: laptops, parcels, stock, pets, children, bags

There is also a reseller/installer track: third-party tracker installers pay a
per-device monthly platform fee and bring whatever hardware they already fit.

--------------------------------------------------------------------------------
2. ARCHITECTURE — Vercel + Supabase + Traccar (no own servers)
--------------------------------------------------------------------------------

We deliberately do NOT run any sockets or servers of our own:

  DEVICES → TRACCAR (hosted service) → AEROTRACK (Vercel) → SUPABASE (Postgres)

  - Traccar owns the TCP/UDP device sockets and 200+ protocol decoders.
    Devices report to a managed Traccar server (demo.traccar.org or a paid
    subscription); Traccar forwards every fix to AeroTrack as JSON.
  - AeroTrack (this repo, apps/web) is a Next.js app on Vercel that owns the
    UI, business logic, REST API, command dispatch and notifications.
  - Supabase provides Postgres, Auth, Storage and Realtime. All tenant data,
    audit tables and API keys live there.

Inbound  : Traccar → POST /api/telemetry          (position/alarm JSON forward)
           Traccar → POST /api/webhooks/status    (device online/offline events)
           Guarded by TRACCAR_FORWARD_SECRET (?key= / ?token= / Bearer /
           x-forward-key). Unset = open, dev only.
Outbound : AeroTrack → Traccar REST (/api/commands/send etc.) → device socket,
           with SMS as a fallback channel for GPRS-offline trackers.

Every command is written to the device_commands audit table before dispatch,
then stamped sent/queued/failed — nothing is lost or faked.

--------------------------------------------------------------------------------
3. REPOSITORY LAYOUT
--------------------------------------------------------------------------------

  apps/web          Next.js 15 (App Router, Turbopack, Tailwind) — the whole
                    product: dashboard, map, fleet, alerts, geofences, fuel
                    coupons, commands, reports, settings, REST API v1.
                    Deployed to Vercel → aero-track-pro-web.vercel.app

  apps/ingest       Optional standalone TCP ingest (Node/tsx). Used in the lab
                    for direct device connections and the ST-901A simulator.
                    NOT needed in production — Traccar does this job.
                    Scripts: pnpm dev | start | sim:st901a

  packages/protocols   Wire-protocol decoders/encoders + device model registry.
                       Implemented: eelink, gps103, gt06, h02, meitrack, queclink,
                       topflytech, vt200, teltonika, jt808.
                       Primary PoC protocol: h02 (SinoTrack H-series).

  packages/shared      Shared types + mock data for UI rendering.

  supabase/migrations  PostgreSQL schema (applied via Supabase Management API).
  supabase/seed.sql    Idempotent demo tenant seed ('SpeedTrack Logistics').

  docs/API.md          REST API v1 reference (atk_ bearer keys).
  docs/TRACCAR.md      Traccar boundary contract (field maps, forward config).
  docs/SINOTRACK-ST901A-SETUP.md  Device configuration handbook (PoC device).

  vercel.json          Deployment config.  fly.toml — legacy, unused.

--------------------------------------------------------------------------------
4. PREREQUISITES
--------------------------------------------------------------------------------

  - Node.js >= 20
  - pnpm (workspace install)
  - A Supabase project (URL + anon key + service-role key)
  - A Traccar account (demo.traccar.org is free for PoC; managed paid for prod)
  - Optional: Resend (email), Twilio (SMS) for notification delivery

--------------------------------------------------------------------------------
5. INSTALL & RUN
--------------------------------------------------------------------------------

  git clone https://github.com/Munyah17/AeroTrackPro.git
  cd AeroTrackPro
  pnpm install
    (registry is flaky: add --fetch-timeout 300000 --fetch-retries 5)

  # create env files — see section 6, then:

  pnpm dev          # web app on http://localhost:3001
  pnpm build        # production build (typecheck + lint + Turbopack build)
  pnpm lint         # eslint across packages
  pnpm typecheck    # tsc --noEmit across packages

  DEV SERVER PORT IS PINNED TO 3001 — port 3000 is owned by another app on
  this machine. If 3001 is busy use 3002+, never 3000.

--------------------------------------------------------------------------------
6. ENVIRONMENT VARIABLES
--------------------------------------------------------------------------------

apps/web/.env.local  (gitignored — never commit)

  NEXT_PUBLIC_SUPABASE_URL        https://<project-ref>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY   public anon key
  SUPABASE_SERVICE_ROLE_KEY       service role (server routes only — secret!)

  TRACCAR_BASE_URL                e.g. https://demo.traccar.org
  TRACCAR_TOKEN                   Bearer token — OR —
  TRACCAR_EMAIL / TRACCAR_PASSWORD  JSESSIONID auth (re-auths on 401)
  TRACCAR_FORWARD_SECRET          shared secret for inbound forwards

  RESEND_API_KEY / RESEND_FROM    email notifications (optional)
  TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER   SMS (optional)

  AUTH_REQUIRED=true              gate app routes behind sign-in (default off)

apps/ingest/.env  (lab/simulator only)
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

Without a configured database, API endpoints return HTTP 503 — the platform
never fabricates data.

--------------------------------------------------------------------------------
7. DATABASE
--------------------------------------------------------------------------------

Schema lives in supabase/migrations (0001 …). Apply in order to the Supabase
project — we push via the Management API (no DB password needed); the CLI is
not used.

Seed: supabase/seed.sql is idempotent — creates demo tenant
'SpeedTrack Logistics' (00000000-0000-4000-8000-000000000001) with a full
fleet, coupons, users, and API keys for testing.

--------------------------------------------------------------------------------
8. DEVICES — CURRENT POC SCOPE: SINOTRACK ONLY
--------------------------------------------------------------------------------

Proof-of-concept hardware is the SinoTrack ST-901A (GSM/GPS tracker, H02
protocol on TCP port 5013). It was chosen to prove the platform end-to-end;
other brands/protocols roll out after the PoC is validated.

ST-901A SIM + wiring + command-reference + onboarding steps:
  → docs/SINOTRACK-ST901A-SETUP.md

Lab simulator (sends real wire-protocol frames over TCP):
  cd apps/ingest
  pnpm sim:st901a
    envs: HOST PORT TRACKER_ID INTERVAL_MS

--------------------------------------------------------------------------------
9. REST API v1
--------------------------------------------------------------------------------

Bearer atk_ keys (hashed in api_keys table), tenant-scoped:

  GET /api/v1/vehicles [/id [/positions]]      devices    positions/latest
  GET /api/v1/trips      geofences    alerts    alerts/:id/acknowledge
  GET/POST /api/v1/coupons      GET/POST /api/v1/coupons/redeem
  POST /api/v1/devices/:id/commands

Full reference: docs/API.md

--------------------------------------------------------------------------------
10. DEPLOYMENT
--------------------------------------------------------------------------------

Push to origin/main → Vercel auto-deploys to aero-track-pro-web.vercel.app.
House rule: after every green `pnpm build`, commit and push immediately.

--------------------------------------------------------------------------------
11. TROUBLESHOOTING (quick)
--------------------------------------------------------------------------------

  Build fails with TurbopackInternalError / "deadline has elapsed"
      Transient worker crash — delete apps/web/.next and rebuild.

  Device offline / no positions
      See the handbook: APN, dotted-IP server, port 5013, GPRS mode 710.

  APIs return 503
      Env vars missing — the platform never serves fake data.
================================================================================
