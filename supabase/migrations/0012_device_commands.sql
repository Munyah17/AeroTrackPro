-- 0012: device command audit log.
--
-- Every remote command (immobilize, locate, interval, reboot, ...) issued
-- from the app UI or the REST API is persisted here before dispatch. The
-- row doubles as the audit trail ("who cut the engine on AFD 5555, when,
-- and did the tracker accept it") — legally important for immobilization.
--
-- Writers: /api/commands (session), /api/v1/devices/:id/commands (API key)
-- — both via the service role. Traccar dispatch happens inline in those
-- routes; status flows pending -> sent | failed, and 'acked' once the
-- device's command-result frame is correlated by the ingest path.

create table if not exists device_commands (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  device_id         uuid not null references devices(id) on delete cascade,
  vehicle_id        uuid references vehicles(id) on delete set null,
  command           jsonb not null,          -- normalized DeviceCommand union
  channel           text not null default 'gprs'
                    check (channel in ('gprs', 'sms')),
  transport         text not null default 'traccar'
                    check (transport in ('traccar', 'ingest', 'sms', 'none')),
  status            text not null default 'pending'
                    check (status in ('pending', 'sent', 'acked', 'failed', 'expired', 'cancelled')),
  requested_by      uuid references users(id) on delete set null,
  requested_by_name text,                    -- display-name snapshot for the audit log
  traccar_type      text,                    -- mapped Traccar command type actually sent
  response          jsonb,                   -- transport response body (Traccar JSON / error)
  error             text,
  sent_at           timestamptz,
  acked_at          timestamptz,
  created_at        timestamptz not null default now()
);

-- The audit columns below were added after the first cut of this table;
-- add-column-if-not-exists keeps this file safe to re-run there.
alter table device_commands add column if not exists vehicle_id uuid references vehicles(id) on delete set null;
alter table device_commands add column if not exists channel text not null default 'gprs';
alter table device_commands add column if not exists transport text not null default 'traccar';
alter table device_commands add column if not exists requested_by_name text;
alter table device_commands add column if not exists traccar_type text;
alter table device_commands add column if not exists response jsonb;

alter table device_commands drop constraint if exists device_commands_status_check;
alter table device_commands add constraint device_commands_status_check
  check (status in ('pending', 'sent', 'acked', 'failed', 'expired', 'cancelled'));
alter table device_commands drop constraint if exists device_commands_channel_check;
alter table device_commands add constraint device_commands_channel_check
  check (channel in ('gprs', 'sms'));
alter table device_commands drop constraint if exists device_commands_transport_check;
alter table device_commands add constraint device_commands_transport_check
  check (transport in ('traccar', 'ingest', 'sms', 'none'));

create index if not exists idx_device_commands_tenant
  on device_commands(tenant_id, created_at desc);
create index if not exists idx_device_commands_device
  on device_commands(device_id, created_at desc);

alter table device_commands enable row level security;

-- Tenant members can read their fleet's command history and queue commands;
-- status transitions are written by the service role (RLS bypass), so no
-- update/delete policies for app users.
drop policy if exists device_commands_select on device_commands;
create policy device_commands_select on device_commands
  for select using (tenant_id = auth_tenant_id());
drop policy if exists device_commands_insert on device_commands;
create policy device_commands_insert on device_commands
  for insert with check (tenant_id = auth_tenant_id());
