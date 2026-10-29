-- 0009: Out-of-app notification channels.
-- Per-user, per-event opt-in for email and SMS delivery, plus a delivery
-- audit log. In-app notifications already exist; this lets each user choose
-- which events leave the app and by which channel.

create table notification_preferences (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  event_type text not null,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, event_type)
);

create index idx_notification_prefs_user on notification_preferences(user_id);
create index idx_notification_prefs_event on notification_preferences(tenant_id, event_type);

-- Every attempted out-of-app send lands here so delivery failures are
-- diagnosable per user/channel instead of vanishing into provider logs.
create table notification_deliveries (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  event_type text not null,
  channel text not null check (channel in ('in_app', 'email', 'sms')),
  destination text,          -- email address / phone number; null for in_app
  status text not null default 'sent' check (status in ('sent', 'failed')),
  detail text,               -- provider error or message id
  created_at timestamptz default now()
);

create index idx_notification_deliveries_user on notification_deliveries(user_id, created_at desc);
create index idx_notification_deliveries_tenant on notification_deliveries(tenant_id, created_at desc);

create trigger trg_notification_preferences_updated_at
  before update on notification_preferences
  for each row execute function set_updated_at();

-- ==================== RLS ====================
alter table notification_preferences enable row level security;
alter table notification_deliveries enable row level security;

-- Users manage only their own preference rows.
create policy notification_preferences_select on notification_preferences
  for select using (
    user_id in (select id from users where auth_id = auth.uid())
    or is_super_admin()
  );
create policy notification_preferences_insert on notification_preferences
  for insert with check (
    tenant_id = auth_tenant_id()
    and user_id in (select id from users where auth_id = auth.uid())
  );
create policy notification_preferences_update on notification_preferences
  for update using (
    user_id in (select id from users where auth_id = auth.uid())
  );
create policy notification_preferences_delete on notification_preferences
  for delete using (
    user_id in (select id from users where auth_id = auth.uid())
  );

-- Deliveries are written only by the service role (server dispatch path);
-- users can read their own history, tenant admins the whole tenant's.
create policy notification_deliveries_select on notification_deliveries
  for select using (
    user_id in (select id from users where auth_id = auth.uid())
    or (tenant_id = auth_tenant_id() and auth_user_role() in ('super_admin', 'admin', 'manager'))
    or is_super_admin()
  );

-- Super-admin cross-tenant read (same additive pattern as 0005).
create policy notification_preferences_superadmin on notification_preferences
  for select using (is_super_admin());
create policy notification_deliveries_superadmin on notification_deliveries
  for select using (is_super_admin());
