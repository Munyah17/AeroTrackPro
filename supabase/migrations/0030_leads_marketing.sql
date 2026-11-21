-- 0030: Leads & Marketing console + lead-hunter bot storage.
-- Run in Supabase Dashboard > SQL Editor.

-- Super admins may read/update leads and read payments from the admin UI.
drop policy if exists leads_sadmin_all on leads;
create policy leads_sadmin_all on leads for all
  using (is_super_admin()) with check (is_super_admin());

drop policy if exists payments_sadmin_select on payments;
create policy payments_sadmin_select on payments for select
  using (is_super_admin());

-- Bot runs: one row per issued command (written via service role only).
create table if not exists marketing_runs (
  id           uuid primary key default gen_random_uuid(),
  command      text not null,
  status       text not null default 'queued',  -- queued|running|done|failed
  run_secret   text not null,                    -- shared with the spawned session for ingest auth
  session_id   text,
  session_url  text,
  summary      text,
  prospect_count int not null default 0,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

-- Bot-hunted prospects, plus a status pipeline for the team.
create table if not exists marketing_prospects (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid references marketing_runs(id) on delete set null,
  company        text not null,
  contact_name   text,
  phone          text,
  email          text,
  whatsapp       text,
  location       text,
  industry       text,
  fleet_estimate int,
  intent         text not null default 'warm',   -- hot|warm|cold
  source         text,                           -- where the bot found them
  notes          text,
  status         text not null default 'new',    -- new|contacted|qualified|converted|disqualified
  created_at     timestamptz not null default now()
);

create index if not exists marketing_prospects_run_idx on marketing_prospects(run_id);
create index if not exists marketing_prospects_status_idx on marketing_prospects(status);

alter table marketing_runs enable row level security;
alter table marketing_prospects enable row level security;

drop policy if exists marketing_runs_sadmin_all on marketing_runs;
create policy marketing_runs_sadmin_all on marketing_runs for all
  using (is_super_admin()) with check (is_super_admin());

drop policy if exists marketing_prospects_sadmin_all on marketing_prospects;
create policy marketing_prospects_sadmin_all on marketing_prospects for all
  using (is_super_admin()) with check (is_super_admin());
