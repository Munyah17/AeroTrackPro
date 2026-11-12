-- Separate "device is alive" from "device has a valid GPS fix".
-- last_seen_at        → any frame/position received (incl. invalid fixes)
-- last_valid_fix_at   → last position with a valid GPS fix
-- last_position_at    → timestamp of last persisted position (valid fixes only)
-- last_gps_valid      → whether the most recent fix was valid
alter table devices
  add column if not exists last_valid_fix_at timestamptz,
  add column if not exists last_gps_valid boolean;

-- Backfill: devices whose last_position_at exists had valid fixes persisted.
update devices
set last_valid_fix_at = last_position_at,
    last_gps_valid = true
where last_position_at is not null
  and last_valid_fix_at is null;
