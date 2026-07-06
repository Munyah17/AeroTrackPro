-- AeroTrack Pro: Multi-tenant GPS tracking platform
-- Phase 3: Database foundation

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
  created_at timestamp default now(),
  updated_at timestamp default now()
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
  last_seen_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(tenant_id, email)
);

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
  last_position_at timestamp,
  last_seen_at timestamp,
  firmware_version text,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(tenant_id, imei)
);

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
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now(),
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
  recorded_at timestamp not null,
  created_at timestamp default now()
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
  center numeric(10,7)[] when (kind = 'circle'),
  radius_m integer when (kind = 'circle'),
  points numeric(10,7)[][] when (kind = 'polygon'),
  color text default '#1E40FF',
  active boolean default true,
  alert_on_enter boolean default true,
  alert_on_exit boolean default true,
  alert_users uuid[] default '{}',
  created_at timestamp default now(),
  updated_at timestamp default now()
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
  acknowledged_at timestamp,
  resolved_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index idx_alerts_vehicle_status on alerts(vehicle_id, status);
create index idx_alerts_device_created on alerts(device_id, created_at desc);

-- ==================== TRIPS ====================
create table trips (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  start_at timestamp not null,
  end_at timestamp,
  start_address text,
  end_address text,
  distance_km numeric(8,2),
  duration_min integer,
  max_speed_kmh integer,
  avg_speed_kmh numeric(5,1),
  idle_time_min integer,
  path numeric(10,7)[][] not null default '{}',
  completed boolean default false,
  created_at timestamp default now()
);

create index idx_trips_vehicle_start on trips(vehicle_id, start_at desc);

-- ==================== API KEYS ====================
create table api_keys (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  scopes text[] not null default '{"vehicles:read"}',
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_used_at timestamp,
  expires_at timestamp,
  created_at timestamp default now()
);

-- ==================== WEBHOOKS ====================
create table webhooks (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  url text not null,
  events text[] not null,
  active boolean default true,
  secret text not null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

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

-- Tenants: users see only their own tenant
create policy "users_see_own_tenant" on tenants
  for select using (
    exists (
      select 1 from users
      where users.tenant_id = tenants.id
        and users.auth_id = auth.uid()
    )
  );

-- Users: see users in own tenant
create policy "users_see_own_tenant_users" on users
  for select using (
    tenant_id = (
      select tenant_id from users
      where auth_id = auth.uid()
      limit 1
    )
  );

-- Vehicles: see vehicles in own tenant
create policy "users_see_own_tenant_vehicles" on vehicles
  for select using (
    tenant_id = (
      select tenant_id from users
      where auth_id = auth.uid()
      limit 1
    )
  );

-- Devices: see devices in own tenant
create policy "users_see_own_tenant_devices" on devices
  for select using (
    tenant_id = (
      select tenant_id from users
      where auth_id = auth.uid()
      limit 1
    )
  );

-- Positions: see positions in own tenant
create policy "users_see_own_tenant_positions" on positions
  for select using (
    tenant_id = (
      select tenant_id from users
      where auth_id = auth.uid()
      limit 1
    )
  );

-- Geofences: see geofences in own tenant
create policy "users_see_own_tenant_geofences" on geofences
  for select using (
    tenant_id = (
      select tenant_id from users
      where auth_id = auth.uid()
      limit 1
    )
  );

-- Alerts: see alerts in own tenant
create policy "users_see_own_tenant_alerts" on alerts
  for select using (
    tenant_id = (
      select tenant_id from users
      where auth_id = auth.uid()
      limit 1
    )
  );

-- Trips: see trips in own tenant
create policy "users_see_own_tenant_trips" on trips
  for select using (
    tenant_id = (
      select tenant_id from users
      where auth_id = auth.uid()
      limit 1
    )
  );

-- API Keys: users see only their own keys
create policy "users_see_own_api_keys" on api_keys
  for select using (
    user_id = (
      select id from users
      where auth_id = auth.uid()
      limit 1
    )
  );

-- Webhooks: see webhooks in own tenant
create policy "users_see_own_tenant_webhooks" on webhooks
  for select using (
    tenant_id = (
      select tenant_id from users
      where auth_id = auth.uid()
      limit 1
    )
  );
