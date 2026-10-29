-- AeroTrack Pro: fleet-operations tables
-- Drivers, vehicle groups, fuel records, maintenance schedules, insurance
-- policies and driver-behavior events. RLS matches 0001 conventions.

-- ==================== DRIVERS ====================
create table drivers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  license_number text,
  license_expiry date,
  rfid_tag text,                                    -- RFID driver-ID cards
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  vehicle_id uuid references vehicles(id) on delete set null,   -- currently assigned
  behavior_score smallint not null default 100 check (behavior_score between 0 and 100),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_drivers_tenant on drivers(tenant_id);
create index idx_drivers_rfid on drivers(rfid_tag) where rfid_tag is not null;

-- fuel_coupons.driver_id existed as a bare uuid (drivers table didn't exist
-- yet in 0002); now that drivers is real, enforce the reference.
alter table fuel_coupons
  add constraint fuel_coupons_driver_id_fkey
  foreign key (driver_id) references drivers(id) on delete set null;

-- ==================== VEHICLE GROUPS ====================
create table vehicle_groups (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  color text default '#1E40FF',
  created_at timestamptz default now(),
  unique (tenant_id, name)
);

-- Vehicles gain driver/group links and document expiry dates tracked by the UI.
alter table vehicles add column if not exists driver_id uuid references drivers(id) on delete set null;
alter table vehicles add column if not exists group_id uuid references vehicle_groups(id) on delete set null;
alter table vehicles add column if not exists insurance_expiry date;
alter table vehicles add column if not exists license_expiry date;

-- ==================== FUEL RECORDS ====================
-- Refills, consumption deductions and suspected thefts (written by ingest for
-- sensor-equipped devices, or manually from the Fuel page).
create table fuel_records (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  device_id uuid references devices(id) on delete set null,
  coupon_id uuid references fuel_coupons(id) on delete set null, -- refill paid by coupon
  kind text not null check (kind in ('refill', 'consumption', 'theft')),
  litres numeric(8,2) not null check (litres > 0),
  cost_usd numeric(10,2),
  odometer_km numeric(10,2),
  level_after_pct smallint check (level_after_pct between 0 and 100),
  station text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index idx_fuel_records_vehicle on fuel_records(vehicle_id, recorded_at desc);
create index idx_fuel_records_tenant on fuel_records(tenant_id, recorded_at desc);

-- ==================== MAINTENANCE ====================
create table maintenance_items (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  title text not null,
  type text not null default 'service'
    check (type in ('service', 'inspection', 'tyres', 'battery', 'brakes', 'oil', 'other')),
  status text not null default 'upcoming' check (status in ('upcoming', 'overdue', 'completed')),
  due_date date,
  due_odometer_km numeric(10,2),
  repeat_every_km integer,                 -- recurring service intervals
  repeat_every_months integer,
  cost_usd numeric(10,2),
  provider text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_maintenance_vehicle on maintenance_items(vehicle_id, due_date);
create index idx_maintenance_tenant_status on maintenance_items(tenant_id, status, due_date);

-- ==================== INSURANCE ====================
create table insurance_policies (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  policy_number text not null,
  provider text not null,
  coverage text,                            -- comprehensive / third-party / etc.
  premium_usd numeric(10,2),
  start_date date,
  expiry_date date not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  document_path text,                       -- storage path in the documents bucket
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, policy_number)
);

create index idx_insurance_expiry on insurance_policies(tenant_id, expiry_date);

-- ==================== DRIVER EVENTS (behavior) ====================
-- Harsh driving events derived from position streams (by ingest) or device
-- alarms; feeds the driver-behavior scoring page.
create table driver_events (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  driver_id uuid references drivers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  device_id uuid references devices(id) on delete set null,
  type text not null check (type in (
    'harsh_braking', 'harsh_acceleration', 'harsh_cornering',
    'overspeed', 'idling', 'crash'
  )),
  speed_kmh numeric(5,1),
  position jsonb,                           -- {lat,lng} where it happened
  recorded_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index idx_driver_events_driver on driver_events(driver_id, recorded_at desc);
create index idx_driver_events_tenant on driver_events(tenant_id, recorded_at desc);

-- ==================== REPORTS ====================
-- History of generated exports so the Reports page can re-download previous runs.
create table reports (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  generated_by uuid references users(id) on delete set null,
  type text not null,                       -- trips / fuel / behavior / maintenance / ...
  params jsonb not null default '{}'::jsonb, -- vehicle ids, date range, filters
  file_path text,                            -- storage path when exported to a file
  created_at timestamptz default now()
);

create index idx_reports_tenant on reports(tenant_id, created_at desc);

-- ==================== updated_at TRIGGERS ====================
do $$
declare t text;
begin
  foreach t in array array['drivers','maintenance_items','insurance_policies']
  loop
    execute format(
      'create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ==================== RLS ====================
do $$
declare t text;
begin
  foreach t in array array[
    'drivers','vehicle_groups','fuel_records','maintenance_items',
    'insurance_policies','driver_events','reports'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_select on %I for select using (tenant_id = auth_tenant_id())', t, t);
    execute format('create policy %I_insert on %I for insert with check (tenant_id = auth_tenant_id())', t, t);
    execute format('create policy %I_update on %I for update using (tenant_id = auth_tenant_id())', t, t);
    execute format('create policy %I_delete on %I for delete using (tenant_id = auth_tenant_id() and auth_user_role() in (''super_admin'', ''admin'', ''manager''))', t, t);
  end loop;
end;
$$;
