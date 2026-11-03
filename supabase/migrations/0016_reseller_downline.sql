-- 0016_reseller_downline.sql
-- Reseller downline visibility: a reseller tenant can READ its direct client
-- tenants and those tenants' tracking assets. Read-only — clients' own data
-- stays client-owned; the reseller manages/bills the relationship.
-- Without these policies a reseller's /reseller/clients and /reseller/devices
-- pages are empty under RLS (tenant_id = auth_tenant_id() only sees own rows).

-- The signed-in reseller sees its direct client organisations.
drop policy if exists tenants_downline_select on public.tenants;
create policy tenants_downline_select on public.tenants
  for select using (
    account_kind = 'client'
    and parent_tenant_id = auth_tenant_id()
  );

-- Devices belonging to the reseller's client tenants.
drop policy if exists devices_downline_select on public.devices;
create policy devices_downline_select on public.devices
  for select using (
    tenant_id in (
      select id from public.tenants
      where parent_tenant_id = auth_tenant_id() and account_kind = 'client'
    )
  );

-- Vehicles belonging to the reseller's client tenants.
drop policy if exists vehicles_downline_select on public.vehicles;
create policy vehicles_downline_select on public.vehicles
  for select using (
    tenant_id in (
      select id from public.tenants
      where parent_tenant_id = auth_tenant_id() and account_kind = 'client'
    )
  );

-- Live positions for the downline's devices (map view on the reseller portal).
drop policy if exists positions_downline_select on public.positions;
create policy positions_downline_select on public.positions
  for select using (
    tenant_id in (
      select id from public.tenants
      where parent_tenant_id = auth_tenant_id() and account_kind = 'client'
    )
  );
