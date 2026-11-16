-- Engine/ignition state and derived telemetry support.
--
-- The ingest service derives these from device frames:
--   devices.ignition        last reported ACC state (null = unknown)
--   devices.engine_cut      relay/immobilizer state reported by the device
--   devices.engine_hours_min cumulative ACC-on minutes (incremented via RPC)
--   ignition_events         ACC on/off transition log for ignition reports

alter table devices
  add column if not exists ignition boolean,
  add column if not exists engine_cut boolean not null default false,
  add column if not exists engine_hours_min integer not null default 0;

-- ==================== IGNITION EVENTS ====================
create table if not exists ignition_events (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  driver_id uuid references drivers(id) on delete set null,
  kind text not null check (kind in ('ignition_on', 'ignition_off')),
  position jsonb,                            -- {lat,lng} where it happened
  recorded_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index if not exists idx_ignition_events_device on ignition_events(device_id, recorded_at desc);
create index if not exists idx_ignition_events_tenant on ignition_events(tenant_id, recorded_at desc);

alter table ignition_events enable row level security;

create policy ignition_events_select on ignition_events
  for select using (tenant_id = auth_tenant_id());
create policy ignition_events_insert on ignition_events
  for insert with check (tenant_id = auth_tenant_id());
create policy ignition_events_update on ignition_events
  for update using (tenant_id = auth_tenant_id());
create policy ignition_events_delete on ignition_events
  for delete using (tenant_id = auth_tenant_id() and auth_user_role() in ('super_admin', 'admin', 'manager'));

alter publication supabase_realtime add table ignition_events;

-- Atomic engine-hours accrual — ingest calls this per ACC-on fix pair.
create or replace function increment_engine_hours(p_device_id uuid, p_minutes integer)
returns void
language sql
as $$
  update devices
  set engine_hours_min = engine_hours_min + greatest(p_minutes, 0)
  where id = p_device_id;
$$;
