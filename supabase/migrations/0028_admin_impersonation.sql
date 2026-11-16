-- ==================== ADMIN TENANT IMPERSONATION ====================
-- Master Admin can "log into" a client tenant for support/maintenance.
-- An open row in admin_impersonations makes auth_tenant_id() return the
-- impersonated tenant and is_super_admin() return false, so EVERY RLS
-- policy (tenant-scoped reads/writes AND the cross-tenant sadmin policies)
-- automatically scopes the session to that tenant. Ending the session
-- (ended_at) restores the admin's own tenant and platform powers.
--
-- Audit: rows are never deleted — started_at/ended_at record every session.

create table if not exists admin_impersonations (
  id uuid primary key default uuid_generate_v4(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  reason text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index idx_admin_impersonations_tenant on admin_impersonations(tenant_id, started_at desc);
-- One open session per admin at a time.
create unique index admin_impersonations_one_open
  on admin_impersonations(admin_user_id) where ended_at is null;

alter table admin_impersonations enable row level security;

-- Raw platform-admin check — NOT impersonation-aware, so the impersonation
-- table itself stays manageable while a session is open.
create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from users where auth_id = auth.uid() and role = 'super_admin')
$$;

create policy admin_impersonations_select on admin_impersonations
  for select using (is_platform_admin());
create policy admin_impersonations_insert on admin_impersonations
  for insert with check (is_platform_admin() and admin_user_id = auth.uid());
create policy admin_impersonations_update on admin_impersonations
  for update using (is_platform_admin()) with check (is_platform_admin());
-- No delete policy: the audit trail is permanent.

-- ==================== IMPERSONATION-AWARE HELPERS ====================

-- Effective tenant: the impersonated tenant while a session is open,
-- otherwise the caller's own tenant. Only platform admins can impersonate.
create or replace function auth_tenant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select i.tenant_id from admin_impersonations i
      where i.admin_user_id = auth.uid()
        and i.ended_at is null
        and is_platform_admin()
      order by i.started_at desc limit 1),
    (select tenant_id from users where auth_id = auth.uid() limit 1)
  )
$$;

-- Platform powers are suspended while impersonating: the cross-tenant
-- sadmin policies stop matching and only tenant-scoped policies remain.
create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select is_platform_admin() and not exists (
    select 1 from admin_impersonations i
    where i.admin_user_id = auth.uid() and i.ended_at is null
  )
$$;
