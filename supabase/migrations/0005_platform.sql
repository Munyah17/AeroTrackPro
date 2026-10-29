-- AeroTrack Pro: platform layer
-- 3-tier account model (platform owner -> reseller -> client), plan catalog,
-- reseller add-on modules, billing, support tickets, announcements, activity
-- log and notifications. Plus super-admin read access across tenant tables.

-- ==================== TENANT TIERS ====================
-- account_kind: 'platform' = the platform owner's own org (super_admins live
-- here), 'reseller' = bills per device across its downline, 'client' = a
-- fleet org under a reseller (parent_tenant_id points up the chain).
alter table tenants add column if not exists account_kind text not null default 'owner'
  check (account_kind in ('platform', 'owner', 'reseller', 'client'));
alter table tenants add column if not exists parent_tenant_id uuid references tenants(id) on delete set null;
alter table tenants add column if not exists contact_email text;
alter table tenants add column if not exists logo_url text;
alter table tenants add column if not exists domain_status text not null default 'pending'
  check (domain_status in ('pending', 'active', 'failed'));
alter table tenants add column if not exists trial_ends_at timestamptz;

create index idx_tenants_parent on tenants(parent_tenant_id) where parent_tenant_id is not null;

-- Align plan values with the plan catalog (mock used basic/standard/pro/enterprise).
alter table tenants drop constraint tenants_plan_check;
alter table tenants add constraint tenants_plan_check
  check (plan in ('starter', 'basic', 'standard', 'pro', 'enterprise'));

-- Dispatcher is a standard fleet role in the UI.
alter table users drop constraint users_role_check;
alter table users add constraint users_role_check
  check (role in ('super_admin', 'admin', 'manager', 'dispatcher', 'driver', 'viewer', 'user'));

-- ==================== SUPER-ADMIN HELPER ====================
-- True for members of the platform-owner org holding the super_admin role;
-- they get read access across tenants for the platform admin console.
create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from users where auth_id = auth.uid() and role = 'super_admin')
$$;

-- ==================== PLANS ====================
create table plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  price_monthly_usd numeric(10,2) not null,
  max_vehicles integer,                    -- null = unlimited
  max_users integer,
  features text[] not null default '{}',
  active boolean not null default true,
  sort smallint not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into plans (id, name, price_monthly_usd, max_vehicles, max_users, features, sort) values
  ('00000000-0000-4000-8000-00000000b001', 'Basic',      19,  10,   2,    '{Live tracking,Trip history (30 days),Email alerts}', 1),
  ('00000000-0000-4000-8000-00000000b002', 'Standard',   49,  50,   10,   '{Everything in Basic,Geofencing,Fuel monitoring,Reports}', 2),
  ('00000000-0000-4000-8000-00000000b003', 'Pro',        199, 200,  null, '{Everything in Standard,White-label branding,Custom domain,API access,Driver behavior,Unlimited users}', 3),
  ('00000000-0000-4000-8000-00000000b004', 'Enterprise', 499, null, null, '{Everything in Pro,Dedicated support,SLA 99.9%,Custom integrations,Insurance API}', 4)
on conflict (id) do nothing;

-- ==================== RESELLER ADD-ON MODULES ====================
-- Which billable feature modules a tenant has enabled (reseller pricing:
-- per-device monthly add-ons on top of base tracking).
create table tenant_addons (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  module text not null,                     -- insurance/maintenance/fuel/behavior/dashcam/rfid
  active boolean not null default true,
  created_at timestamptz default now(),
  unique (tenant_id, module)
);

-- ==================== INVOICES ====================
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  number text not null unique,
  amount_usd numeric(10,2) not null,
  status text not null default 'pending' check (status in ('paid', 'pending', 'overdue', 'failed', 'void')),
  items jsonb not null default '[]'::jsonb, -- [{label, qty, unit_usd, total_usd}]
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create index idx_invoices_tenant on invoices(tenant_id, issued_at desc);

-- ==================== SUPPORT TICKETS ====================
create table support_tickets (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  last_reply_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_support_tickets_tenant on support_tickets(tenant_id, created_at desc);

create table ticket_replies (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz default now()
);

create index idx_ticket_replies_ticket on ticket_replies(ticket_id, created_at);

-- ==================== ANNOUNCEMENTS ====================
create table announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text,
  audience text not null default 'all' check (audience in ('all', 'resellers', 'specific')),
  tenant_ids uuid[] default '{}',           -- used when audience = 'specific'
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==================== ACTIVITY LOG ====================
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  user_name text not null,
  action text not null,
  module text not null,
  ip inet,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index idx_activity_logs_tenant on activity_logs(tenant_id, created_at desc);

-- ==================== NOTIFICATIONS ====================
-- In-app notification center entries (alert digests, billing, announcements).
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,  -- null = whole tenant
  type text not null default 'info',
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index idx_notifications_tenant on notifications(tenant_id, created_at desc);

-- ==================== updated_at TRIGGERS ====================
do $$
declare t text;
begin
  foreach t in array array['plans','support_tickets','announcements']
  loop
    execute format(
      'create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ==================== RLS ====================
alter table plans enable row level security;
alter table tenant_addons enable row level security;
alter table invoices enable row level security;
alter table support_tickets enable row level security;
alter table ticket_replies enable row level security;
alter table announcements enable row level security;
alter table activity_logs enable row level security;
alter table notifications enable row level security;

-- Plans: every signed-in user can read the catalog; only super_admins manage.
create policy plans_select on plans for select using (auth.uid() is not null);
create policy plans_sadmin_all on plans for all using (is_super_admin()) with check (is_super_admin());

-- Announcements: users read published ones (tenant-targeted respected);
-- super_admins manage them.
create policy announcements_select on announcements for select using (
  status = 'published'
  and (
    audience = 'all'
    or (audience = 'resellers' and exists (
      select 1 from tenants t where t.id = auth_tenant_id() and t.account_kind = 'reseller'))
    or (audience = 'specific' and auth_tenant_id() = any(tenant_ids))
  )
  or is_super_admin()
);
create policy announcements_sadmin_all on announcements
  for all using (is_super_admin()) with check (is_super_admin());

-- Tenant-scoped tables: members CRUD their own (standard pattern).
do $$
declare t text;
begin
  foreach t in array array['tenant_addons','support_tickets','activity_logs','notifications']
  loop
    execute format('create policy %I_select on %I for select using (tenant_id = auth_tenant_id())', t, t);
    execute format('create policy %I_insert on %I for insert with check (tenant_id = auth_tenant_id())', t, t);
    execute format('create policy %I_update on %I for update using (tenant_id = auth_tenant_id())', t, t);
    execute format('create policy %I_delete on %I for delete using (tenant_id = auth_tenant_id() and auth_user_role() in (''super_admin'', ''admin'', ''manager''))', t, t);
  end loop;
end;
$$;

-- Invoices: read-only for the billed tenant; platform billing writes via
-- service role. Super admins can correct records.
create policy invoices_select on invoices
  for select using (tenant_id = auth_tenant_id());
create policy invoices_sadmin_all on invoices
  for all using (is_super_admin()) with check (is_super_admin());

-- Ticket replies: reachable through the parent ticket's tenant.
create policy ticket_replies_select on ticket_replies for select using (
  exists (select 1 from support_tickets st
          where st.id = ticket_id and (st.tenant_id = auth_tenant_id() or is_super_admin())));
create policy ticket_replies_insert on ticket_replies for insert with check (
  exists (select 1 from support_tickets st
          where st.id = ticket_id and (st.tenant_id = auth_tenant_id() or is_super_admin())));

-- ==================== SUPER-ADMIN READ ACCESS ====================
-- One additive select policy per tenant-scoped table so the platform console
-- can inspect any organisation. (Existing tenant policies still apply; RLS
-- policies are OR-ed.)
do $$
declare t text;
begin
  foreach t in array array[
    'tenants','users','devices','vehicles','positions','geofences','alerts',
    'trips','api_keys','webhooks','device_commands','fuel_coupons','fuel_stations',
    'drivers','vehicle_groups','fuel_records','maintenance_items',
    'insurance_policies','driver_events','reports','tenant_addons',
    'invoices','support_tickets','activity_logs','notifications'
  ]
  loop
    execute format('create policy %I_sadmin_select on %I for select using (is_super_admin())', t, t);
  end loop;
end;
$$;

-- Super admins can also manage cross-tenant records that the admin console edits.
create policy tenants_sadmin_all on tenants
  for all using (is_super_admin()) with check (is_super_admin());
create policy users_sadmin_all on users
  for all using (is_super_admin()) with check (is_super_admin());
create policy support_tickets_sadmin_all on support_tickets
  for all using (is_super_admin()) with check (is_super_admin());
create policy tenant_addons_sadmin_all on tenant_addons
  for all using (is_super_admin()) with check (is_super_admin());

-- ==================== REALTIME ====================
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table driver_events;
