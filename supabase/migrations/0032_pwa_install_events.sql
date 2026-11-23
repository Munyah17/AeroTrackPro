-- 0032: PWA install/download telemetry.
--
-- Anonymous funnel events for the /download page and the install prompt:
--   page_view      — someone opened the download page
--   install_tap    — someone pressed an install button
--   app_installed  — the browser confirmed the PWA was installed
--
-- Writes happen only through /api/pwa/event with the service role, so the
-- table has no INSERT policy for end users. Master Admin reads aggregates
-- in /admin/downloads via the is_super_admin() select policy.

create table if not exists pwa_install_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null check (event_type in ('page_view', 'install_tap', 'app_installed')),
  platform    text not null default 'unknown'
              check (platform in ('ios', 'android', 'desktop', 'unknown')),
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists pwa_install_events_type_idx
  on pwa_install_events(event_type, created_at desc);
create index if not exists pwa_install_events_created_idx
  on pwa_install_events(created_at desc);

alter table pwa_install_events enable row level security;

drop policy if exists pwa_install_events_sadmin_select on pwa_install_events;
create policy pwa_install_events_sadmin_select on pwa_install_events
  for select using (is_super_admin());
