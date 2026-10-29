-- Traccar bridge: live connectivity + Traccar-side device correlation.
--
-- devices.status is the tenant-managed lifecycle flag (active/lost/...),
-- so online/offline state gets its own column driven by Traccar's
-- deviceOnline / deviceOffline webhooks. traccar_id is Traccar's numeric
-- device id, needed to address /api/commands/send without a lookup round-trip.

alter table devices
  add column if not exists connection_status text not null default 'unknown'
    check (connection_status in ('online', 'offline', 'unknown'));

alter table devices
  add column if not exists traccar_id bigint;

create unique index if not exists idx_devices_traccar_id
  on devices(traccar_id) where traccar_id is not null;
