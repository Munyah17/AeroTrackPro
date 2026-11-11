-- AeroTrack Pro: Master Portal wiring, round 2
-- Device groups, SMS gateways, email templates, per-tenant login-page settings,
-- and a super-admin write policy for the branding bucket.

-- ==================== tenants: white-label login page columns ====================
alter table tenants
  add column if not exists login_welcome text default 'Welcome back',
  add column if not exists login_show_powered_by boolean not null default true,
  add column if not exists login_allow_reset boolean not null default true,
  add column if not exists login_2fa boolean not null default false,
  add column if not exists login_bg_url text,
  add column if not exists favicon_url text;

-- ==================== device_groups ====================
create table if not exists device_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name text not null,
  color text not null default '#1E40FF',
  created_at timestamptz not null default now()
);
create index if not exists device_groups_tenant_idx on device_groups(tenant_id);
alter table device_groups enable row level security;
create policy device_groups_tenant_all on device_groups
  for all using (tenant_id = auth_tenant_id() or is_super_admin())
  with check (tenant_id = auth_tenant_id() or is_super_admin());

-- ==================== sms_gateways ====================
create table if not exists sms_gateways (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  sender_id text,
  credentials jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive')),
  balance_usd numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table sms_gateways enable row level security;
create policy sms_gateways_sadmin_all on sms_gateways
  for all using (is_super_admin()) with check (is_super_admin());

-- ==================== email_templates ====================
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'system' check (kind in ('system','alert','billing','digest')),
  subject text not null default '',
  body text not null default '',
  tenant_id uuid references tenants(id) on delete cascade,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (name, tenant_id)
);
alter table email_templates enable row level security;
create policy email_templates_sadmin_all on email_templates
  for all using (is_super_admin()) with check (is_super_admin());
-- Tenants can read their own overrides and the platform defaults (tenant_id null).
create policy email_templates_tenant_read on email_templates
  for select using (tenant_id = auth_tenant_id() or tenant_id is null);

-- updated_at triggers
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists touch_sms_gateways on sms_gateways;
create trigger touch_sms_gateways before update on sms_gateways
  for each row execute function touch_updated_at();
drop trigger if exists touch_email_templates on email_templates;
create trigger touch_email_templates before update on email_templates
  for each row execute function touch_updated_at();

-- ==================== storage: super admin can write any tenant's branding ====================
create policy branding_sadmin_write on storage.objects for insert
  with check (bucket_id = 'branding' and is_super_admin());
create policy branding_sadmin_update on storage.objects for update
  using (bucket_id = 'branding' and is_super_admin());
create policy branding_sadmin_delete on storage.objects for delete
  using (bucket_id = 'branding' and is_super_admin());
