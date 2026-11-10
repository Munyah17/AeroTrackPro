-- 0021: master-admin console tables.
-- partners          — installer/reseller onboarding pipeline
-- feedback          — client & partner feedback inbox
-- legal_documents   — versioned terms/policies
-- fleet_delegates   — corporate fleet access granted by Master Admin
-- All platform-level: managed by super admins only.

-- ==================== PARTNER PIPELINE ====================
create table if not exists partners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null check (kind in ('installer', 'reseller')),
  contact_email text,
  country     text,
  status      text not null default 'application'
              check (status in ('application', 'approved', 'active', 'suspended')),
  notes       text,
  applied_at  timestamptz not null default now(),
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists partners_status_idx on partners(status);

-- ==================== FEEDBACK ====================
create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete set null,
  user_id     uuid references users(id) on delete set null,
  author_name text not null,
  author_email text,
  category    text not null default 'feature'
              check (category in ('bug', 'feature', 'praise', 'complaint')),
  message     text not null,
  rating      smallint check (rating between 1 and 5),
  status      text not null default 'new'
              check (status in ('new', 'reviewed', 'actioned', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists feedback_status_idx on feedback(status);

-- ==================== LEGAL DOCUMENTS ====================
create table if not exists legal_documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,               -- Platform Terms of Service / Partner Agreement / Privacy Policy
  version     text not null,               -- e.g. v2.5
  status      text not null default 'draft'
              check (status in ('draft', 'published', 'archived')),
  content     text,
  effective_at date,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (title, version)
);

-- ==================== FLEET DELEGATES ====================
-- People Master Admin granted corporate fleet-management access to.
-- Role recorded is their portal tier (user | reseller); super_admin grants
-- are pointless and rejected by CHECK.
create table if not exists fleet_delegates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  organization text not null,
  role        text not null check (role in ('user', 'reseller')),
  granted_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create unique index if not exists fleet_delegates_email_idx on fleet_delegates(lower(email));

-- ==================== updated_at TRIGGERS ====================
do $$
declare t text;
begin
  foreach t in array array['partners','feedback','legal_documents']
  loop
    execute format(
      'create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ==================== RLS ====================
alter table partners enable row level security;
alter table feedback enable row level security;
alter table legal_documents enable row level security;
alter table fleet_delegates enable row level security;

-- Platform-owner artifacts: super admins manage.
create policy partners_sadmin_all on partners
  for all using (is_super_admin()) with check (is_super_admin());
create policy legal_documents_sadmin_all on legal_documents
  for all using (is_super_admin()) with check (is_super_admin());
create policy fleet_delegates_sadmin_all on fleet_delegates
  for all using (is_super_admin()) with check (is_super_admin());
-- Delegates can read their own grant row (matched on their users.email).
create policy fleet_delegates_own_select on fleet_delegates
  for select using (
    lower(email) = lower((select u.email from users u where u.auth_id = auth.uid()))
  );

-- Published legal documents are readable by every signed-in user.
create policy legal_documents_select on legal_documents
  for select using (status = 'published' and auth.uid() is not null);

-- Feedback: any signed-in user may submit; authors and their tenant can
-- read their own items; super admins read and triage everything.
create policy feedback_insert on feedback
  for insert with check (auth.uid() is not null and tenant_id = auth_tenant_id());
create policy feedback_select on feedback
  for select using (tenant_id = auth_tenant_id() or is_super_admin());
create policy feedback_sadmin_all on feedback
  for all using (is_super_admin()) with check (is_super_admin());
