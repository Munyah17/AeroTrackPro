-- AeroTrack Pro: Multi-tenant GPS tracking platform
-- Core schema, RLS, realtime and helper functions

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==================== TENANTS ====================
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  primary_color text not null default '#1E40FF',
  custom_domain text,
  plan text not null default 'starter' check (plan in ('starter', 'pro', 'enterprise')),
  status text not null default 'trial' check (status in ('trial', 'active', 'suspended', 'cancelled')),
  vehicle_limit integer not null default 10,
  user_limit integer not null default 5,
  mrr_usd numeric(10,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==================== USERS ====================
create table users (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  auth_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('super_admin', 'admin', 'manager', 'driver', 'viewer', 'user')),
  permissions jsonb not null default '[]'::jsonb,
  phone text,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  last_seen_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, email)
);

create index idx_users_auth_id on users(auth_id);

-- ==================== DEVICES ====================
create table devices (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  imei text not null,
  protocol text not null,
  device_model text not null,
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'lost', 'maintenance')),
  serial_number text,
  phone_number text,
  sim_number text,
  battery_level integer,
  signal_strength integer,
  server_ip text,
  server_port integer,
  last_position_at timestamptz,
  last_seen_at timestamptz,
  firmware_version text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, imei)
);

-- Ingest looks devices up by bare IMEI
create index idx_devices_imei on devices(imei);

-- ==================== VEHICLES ====================
create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  plate text not null,
  name text not null,
  make text,
  model text,
  year integer,
  vin text,
  status text not null default 'active' check (status in ('active', 'inactive', 'maintenance', 'sold')),
  color text,
  group_name text,
  fuel_type text,
  fuel_capacity_liters numeric(8,2),
  odometer_km numeric(10,2),
  speed_limit_kmh integer,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, plate)
);

-- ==================== POSITIONS (GPS Points) ====================
create table positions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  lng numeric(10,7) not null,
  lat numeric(10,7) not null,
  speed_kmh numeric(5,1),
  course integer,
  altitude integer,
  accuracy integer,
  event_type text default 'position',
  raw_data jsonb,
  recorded_at timestamptz not null,
  created_at timestamptz default now()
);

-- Index for time-series queries
create index idx_positions_device_recorded on positions(device_id, recorded_at desc);
create index idx_positions_vehicle_recorded on positions(vehicle_id, recorded_at desc);
create index idx_positions_tenant_recorded on positions(tenant_id, recorded_at desc);

-- ==================== GEOFENCES ====================
create table geofences (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('circle', 'polygon')),
  -- [lng, lat] for circles
  center numeric(10,7)[],
  radius_m integer,
  -- [[lng, lat], ...] ring for polygons
  points jsonb,
  color text default '#1E40FF',
  active boolean default true,
  alert_on_enter boolean default true,
  alert_on_exit boolean default true,
  alert_users uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (kind <> 'circle' or (center is not null and radius_m is not null)),
  check (kind <> 'polygon' or points is not null)
);

-- ==================== ALERTS ====================
create table alerts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  alert_type text not null,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text,
  status text not null default 'active' check (status in ('active', 'acknowledged', 'resolved')),
  position jsonb,
  acknowledged_by uuid references users(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_alerts_vehicle_status on alerts(vehicle_id, status);
create index idx_alerts_device_created on alerts(device_id, created_at desc);
create index idx_alerts_tenant_status on alerts(tenant_id, status, created_at desc);

-- ==================== TRIPS ====================
create table trips (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz,
  start_address text,
  end_address text,
  distance_km numeric(8,2),
  duration_min integer,
  max_speed_kmh integer,
  avg_speed_kmh numeric(5,1),
  idle_time_min integer,
  -- [[lng, lat], ...] simplified path
  path jsonb not null default '[]'::jsonb,
  completed boolean default false,
  created_at timestamptz default now()
);

create index idx_trips_vehicle_start on trips(vehicle_id, start_at desc);

-- ==================== API KEYS ====================
create table api_keys (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  scopes text[] not null default '{"read"}',
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- ==================== WEBHOOKS ====================
create table webhooks (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  url text not null,
  events text[] not null,
  active boolean default true,
  secret text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==================== DEVICE COMMANDS ====================
-- Queue written by the REST API / web app, drained by the ingest service
-- which encodes and delivers commands over the device's live TCP socket.
create table device_commands (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  -- normalized DeviceCommand JSON, e.g. {"type":"engineStop"}
  command jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'acked', 'failed', 'expired')),
  requested_by uuid references users(id) on delete set null,
  error text,
  sent_at timestamptz,
  acked_at timestamptz,
  created_at timestamptz default now()
);

create index idx_device_commands_pending on device_commands(device_id, status) where status = 'pending';

-- ==================== updated_at TRIGGER ====================
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['tenants','users','devices','vehicles','geofences','alerts','webhooks']
  loop
    execute format(
      'create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ==================== RLS HELPERS ====================
-- security definer avoids the recursive-policy problem when policies on
-- `users` (and every other table) need the caller's tenant.
create or replace function auth_tenant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from users where auth_id = auth.uid() limit 1
$$;

create or replace function auth_user_role() returns text
language sql stable security definer set search_path = public as $$
  select role from users where auth_id = auth.uid() limit 1
$$;

-- ==================== RLS POLICIES ====================
alter table tenants enable row level security;
alter table users enable row level security;
alter table devices enable row level security;
alter table vehicles enable row level security;
alter table positions enable row level security;
alter table geofences enable row level security;
alter table alerts enable row level security;
alter table trips enable row level security;
alter table api_keys enable row level security;
alter table webhooks enable row level security;
alter table device_commands enable row level security;

-- Tenants: members can read their own tenant; admins can update branding etc.
create policy tenants_select on tenants
  for select using (id = auth_tenant_id());
create policy tenants_update on tenants
  for update using (id = auth_tenant_id() and auth_user_role() in ('super_admin', 'admin'));

-- Users
create policy users_select on users
  for select using (tenant_id = auth_tenant_id());
create policy users_insert on users
  for insert with check (tenant_id = auth_tenant_id() and auth_user_role() in ('super_admin', 'admin'));
create policy users_update on users
  for update using (
    tenant_id = auth_tenant_id()
    and (auth_id = auth.uid() or auth_user_role() in ('super_admin', 'admin'))
  );
create policy users_delete on users
  for delete using (tenant_id = auth_tenant_id() and auth_user_role() in ('super_admin', 'admin'));

-- Tenant-scoped CRUD for fleet tables
do $$
declare t text;
begin
  foreach t in array array['devices','vehicles','geofences','alerts','trips','webhooks','device_commands']
  loop
    execute format('create policy %I_select on %I for select using (tenant_id = auth_tenant_id())', t, t);
    execute format('create policy %I_insert on %I for insert with check (tenant_id = auth_tenant_id())', t, t);
    execute format('create policy %I_update on %I for update using (tenant_id = auth_tenant_id())', t, t);
    execute format('create policy %I_delete on %I for delete using (tenant_id = auth_tenant_id() and auth_user_role() in (''super_admin'', ''admin'', ''manager''))', t, t);
  end loop;
end;
$$;

-- Positions: read-only from the app; only the ingest service (service role) writes.
create policy positions_select on positions
  for select using (tenant_id = auth_tenant_id());

-- API keys: personal
create policy api_keys_select on api_keys
  for select using (user_id = (select id from users where auth_id = auth.uid() limit 1));
create policy api_keys_insert on api_keys
  for insert with check (
    tenant_id = auth_tenant_id()
    and user_id = (select id from users where auth_id = auth.uid() limit 1)
  );
create policy api_keys_update on api_keys
  for update using (user_id = (select id from users where auth_id = auth.uid() limit 1));
create policy api_keys_delete on api_keys
  for delete using (user_id = (select id from users where auth_id = auth.uid() limit 1));

-- ==================== SIGNUP TRIGGER ====================
-- Creates a tenant + membership when a new auth user signs up,
-- so the app is usable immediately after email confirmation.
create or replace function handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  new_tenant_id uuid;
  display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));

  insert into tenants (name, slug)
  values (
    display_name || '''s Fleet',
    regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9]+', '-', 'g') || '-' || substr(new.id::text, 1, 8)
  )
  returning id into new_tenant_id;

  insert into users (tenant_id, auth_id, email, full_name, role)
  values (new_tenant_id, new.id, new.email, display_name, 'admin');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ==================== REALTIME ====================
alter publication supabase_realtime add table positions;
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table device_commands;
