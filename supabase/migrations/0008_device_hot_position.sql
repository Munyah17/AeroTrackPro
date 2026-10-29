-- Hot/cold storage split: cache each device's latest fix on the devices row
-- itself, so the live fleet list reads one row per device instead of scanning
-- the positions history table. positions stays the cold/warm append log.

alter table devices
  add column if not exists last_lat numeric(10,7),
  add column if not exists last_lng numeric(10,7),
  add column if not exists last_speed_kmh numeric(5,1),
  add column if not exists last_course integer;

-- Only "has a known fix" queries benefit; partial index keeps it tiny.
create index if not exists idx_devices_has_fix
  on devices(tenant_id) where last_lng is not null;

-- Publish devices updates so the UI subscribes to hot rows via Supabase
-- Realtime (Device -> Traccar -> Edge -> Supabase -> UI), instead of the
-- high-frequency positions stream.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'devices'
  ) then
    alter publication supabase_realtime add table devices;
  end if;
end $$;
