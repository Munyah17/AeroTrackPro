-- 0027_platform_settings.sql
-- Global platform configuration owned by the super admin.
-- Key/value store (jsonb) for settings that must be readable by every
-- signed-in portal (e.g. reseller add-on pricing shown on billing pages)
-- but writable only by super admins.
--
-- Seeded keys:
--   reseller_pricing  {"setupFeeUsd":50,"baseTrackingPerDeviceUsd":2.5}
--   addon_prices      {"insurance":0.5,"maintenance":0.5,"fuel":0.4,
--                      "behavior":0.4,"dashcam":1.5,"rfid":0.3}

create table if not exists platform_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table platform_settings enable row level security;

-- Every signed-in user may READ platform settings (pricing is public to
-- tenants); only super admins may write.
create policy platform_settings_select on platform_settings
  for select using (auth.uid() is not null);
create policy platform_settings_sadmin_all on platform_settings
  for all using (is_super_admin()) with check (is_super_admin());

insert into platform_settings (key, value) values
  ('reseller_pricing', '{"setupFeeUsd":50,"baseTrackingPerDeviceUsd":2.5}'::jsonb),
  ('addon_prices', '{"insurance":0.5,"maintenance":0.5,"fuel":0.4,"behavior":0.4,"dashcam":1.5,"rfid":0.3}'::jsonb)
on conflict (key) do nothing;
