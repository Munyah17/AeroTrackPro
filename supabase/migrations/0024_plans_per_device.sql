-- Per-device platform pricing: $3.50 per device per month.
-- Replaces the legacy tiered plans (Basic/Standard/Pro/Enterprise) with a
-- single "Platform Access" plan billed per device.

alter table plans add column if not exists billing_unit text not null default 'month';

update plans set active = false
where id in (
  '00000000-0000-4000-8000-00000000b001', -- Basic
  '00000000-0000-4000-8000-00000000b002', -- Standard
  '00000000-0000-4000-8000-00000000b004'  -- Enterprise
);

update plans set
  name = 'Platform Access',
  price_monthly_usd = 3.50,
  max_vehicles = null,
  max_users = null,
  billing_unit = 'device',
  features = '{Live tracking & alerts,Trip history & reports,Geofencing,Fuel monitoring,White-label branding,API access,Driver behavior,$3.50 per device per month}',
  sort = 1
where id = '00000000-0000-4000-8000-00000000b003'; -- Pro → Platform Access

-- Plan names are now dynamic (plans table); the legacy enum check is obsolete.
alter table tenants drop constraint if exists tenants_plan_check;

update tenants set plan = 'platform-access' where plan = 'pro';
