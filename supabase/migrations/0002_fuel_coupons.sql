-- AeroTrack Pro: Digital fuel coupons
-- Organisations issue QR fuel coupons to drivers; any participating fuel
-- station can redeem them by scanning, freeing the org from a single supplier.

-- ==================== FUEL COUPONS ====================
create table fuel_coupons (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null unique,                       -- opaque code embedded in the QR
  amount_usd numeric(10,2),                         -- fixed monetary value, or
  litres numeric(8,2),                              -- fixed volume (one of the two)
  fuel_type text not null default 'diesel' check (fuel_type in ('diesel','petrol','any')),
  driver_id uuid,                                  -- drivers table not yet in schema
  vehicle_id uuid references vehicles(id) on delete set null,
  issued_by uuid references users(id) on delete set null,
  status text not null default 'active'
    check (status in ('active','redeemed','expired','void')),
  expires_at timestamp,
  notes text,
  -- redemption details, filled on redeem
  redeemed_at timestamp,
  redeemed_station text,
  redeemed_litres numeric(8,2),
  redeemed_amount_usd numeric(10,2),
  redeemed_ref text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index idx_fuel_coupons_tenant on fuel_coupons(tenant_id, created_at desc);
create index idx_fuel_coupons_status on fuel_coupons(tenant_id, status);
create unique index idx_fuel_coupons_code on fuel_coupons(code);

-- Participating fuel stations (optional allow-list per tenant)
create table fuel_stations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  brand text,
  town text,
  active boolean default true,
  created_at timestamp default now()
);

create index idx_fuel_stations_tenant on fuel_stations(tenant_id);

-- updated_at trigger reuse (function defined in 0001)
create trigger set_fuel_coupons_updated_at
  before update on fuel_coupons
  for each row execute function set_updated_at();

-- ==================== RLS ====================
alter table fuel_coupons enable row level security;
alter table fuel_stations enable row level security;

-- Tenant members manage their own coupons
create policy "coupons_tenant_all" on fuel_coupons
  for all using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

create policy "stations_tenant_all" on fuel_stations
  for all using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- ==================== PUBLIC REDEMPTION RPC ====================
-- A fuel station scans the QR and calls this to redeem. SECURITY DEFINER so it
-- works without a tenant login; it validates the code and marks it redeemed
-- atomically. Returns the coupon row as jsonb, or raises on invalid/used codes.
create or replace function redeem_fuel_coupon(
  p_code text,
  p_station text,
  p_litres numeric default null,
  p_amount numeric default null,
  p_ref text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c fuel_coupons;
begin
  select * into c from fuel_coupons where code = p_code for update;

  if not found then
    raise exception 'invalid_code' using errcode = 'P0002';
  end if;

  if c.status = 'redeemed' then
    raise exception 'already_redeemed' using errcode = 'P0001';
  end if;

  if c.status <> 'active' then
    raise exception 'not_active' using errcode = 'P0001';
  end if;

  if c.expires_at is not null and c.expires_at < now() then
    update fuel_coupons set status = 'expired' where id = c.id;
    raise exception 'expired' using errcode = 'P0001';
  end if;

  update fuel_coupons
     set status = 'redeemed',
         redeemed_at = now(),
         redeemed_station = p_station,
         redeemed_litres = coalesce(p_litres, litres),
         redeemed_amount_usd = coalesce(p_amount, amount_usd),
         redeemed_ref = p_ref
   where id = c.id
   returning * into c;

  return to_jsonb(c);
end;
$$;

-- Allow anonymous + authenticated callers to redeem (the code is the secret).
grant execute on function redeem_fuel_coupon(text, text, numeric, numeric, text) to anon, authenticated;

-- Realtime for the admin redemption console
alter publication supabase_realtime add table fuel_coupons;
