-- ==================== DEVICE SHARING ("CLONING / BINDING") ====================
-- Lets a privileged account (Master Admin, tenant Admin/Manager, or a
-- Reseller) share one of their devices with another tenant, so that tenant's
-- users see the device, its vehicle and its live positions WITHOUT sharing
-- credentials. End users (role 'user' in a client tenant) cannot share —
-- they must request it.
--
-- Access is additive: the shared-select policies below OR with the existing
-- tenant-scoped policies, so the grantee's normal queries just start
-- returning the shared rows.

create table if not exists device_shares (
  id uuid primary key default uuid_generate_v4(),
  device_id uuid not null references devices(id) on delete cascade,
  from_tenant_id uuid not null references tenants(id) on delete cascade,
  to_tenant_id uuid not null references tenants(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (device_id, to_tenant_id),
  check (from_tenant_id <> to_tenant_id)
);

create index idx_device_shares_device on device_shares(device_id);
create index idx_device_shares_to on device_shares(to_tenant_id);

alter table device_shares enable row level security;

-- Who may share: platform admins, tenant admins/managers, and anyone in a
-- reseller tenant (resellers configure bindings for their downline).
create or replace function can_share_devices() returns boolean
language sql stable security definer set search_path = public as $$
  select auth_user_role() in ('super_admin', 'admin', 'manager')
     or exists (
       select 1 from tenants t
       where t.id = auth_tenant_id() and t.account_kind = 'reseller'
     )
$$;

-- ---- device_shares policies ----
create policy device_shares_select on device_shares
  for select using (
    from_tenant_id = auth_tenant_id()
    or to_tenant_id = auth_tenant_id()
    or is_super_admin()
  );

create policy device_shares_insert on device_shares
  for insert with check (
    from_tenant_id = auth_tenant_id()
    and can_share_devices()
    and to_tenant_id <> auth_tenant_id()
    and exists (
      select 1 from devices d
      where d.id = device_id and d.tenant_id = auth_tenant_id()
    )
  );

-- Owner can revoke; grantee can also drop a share they received.
create policy device_shares_delete on device_shares
  for delete using (
    (from_tenant_id = auth_tenant_id() and can_share_devices())
    or to_tenant_id = auth_tenant_id()
  );

-- ---- shared read access on the fleet tables ----
create policy devices_shared_select on devices
  for select using (
    exists (
      select 1 from device_shares s
      where s.device_id = devices.id and s.to_tenant_id = auth_tenant_id()
    )
  );

create policy vehicles_shared_select on vehicles
  for select using (
    vehicles.device_id is not null
    and exists (
      select 1 from device_shares s
      where s.device_id = vehicles.device_id and s.to_tenant_id = auth_tenant_id()
    )
  );

create policy positions_shared_select on positions
  for select using (
    positions.device_id is not null
    and exists (
      select 1 from device_shares s
      where s.device_id = positions.device_id and s.to_tenant_id = auth_tenant_id()
    )
  );

-- ---- tenant picker for the share dialog ----
-- Sharers may list potential target tenants: super admins see everyone,
-- tenant admins/managers see every tenant except their own, resellers see
-- their client downline (parent_tenant_id = their tenant).
create policy tenants_share_targets_select on tenants
  for select using (
    id <> auth_tenant_id()
    and can_share_devices()
    and (
      auth_user_role() = 'super_admin'
      or (
        auth_user_role() in ('admin', 'manager')
        and not exists (
          select 1 from tenants me
          where me.id = auth_tenant_id() and me.account_kind = 'reseller'
        )
      )
      or exists (
        select 1 from tenants me
        where me.id = auth_tenant_id()
          and me.account_kind = 'reseller'
          and tenants.parent_tenant_id = me.id
      )
    )
  );
