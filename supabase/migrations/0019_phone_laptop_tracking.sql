-- 0019: phone & laptop tracking.
--
-- Phones report through the Traccar Client app (OsmAnd HTTP protocol) and
-- laptops through the AeroTrack desktop agent; both land in the same
-- positions pipeline as hardware trackers. Two additions make that work:
--
--   vehicles.kind      — distinguishes cars/trucks from phones/laptops so
--                        the UI can group and icon them correctly. The
--                        vehicles table is the platform's tracked-asset
--                        table; non-vehicle assets reuse it.
--   devices.ingest_token — per-device secret for HTTP ingest. The OsmAnd
--                        endpoint accepts ?key=<ingest_token> so each
--                        tenant's phones authenticate independently of the
--                        global TRACCAR_FORWARD_SECRET.

alter table vehicles
  add column if not exists kind text not null default 'car';

alter table vehicles
  drop constraint if exists vehicles_kind_check;

alter table vehicles
  add constraint vehicles_kind_check check (kind in (
    'car', 'suv', 'pickup', 'motorcycle', 'truck', 'trailer', 'bus',
    'construction', 'generator', 'container', 'parcel', 'pet', 'child',
    'senior', 'livestock', 'bag', 'equipment', 'phone', 'laptop'
  ));

alter table devices
  add column if not exists ingest_token text;

-- Partial unique index: only software trackers carry a token.
create unique index if not exists idx_devices_ingest_token
  on devices(ingest_token) where ingest_token is not null;
