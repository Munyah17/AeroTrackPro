-- 0014_hero_slides_install_steps.sql
-- 1) hero_slides: landing-page hero carousel, managed from Master Portal.
-- 2) vehicle_profiles.install_steps: optional per-model step-by-step install
--    guide override (when null, the profile page composes a guide from the
--    existing fusebox/cutoff/accessory notes).

create table if not exists public.hero_slides (
  id          uuid primary key default gen_random_uuid(),
  sort_order  int not null default 0,
  title       text not null,
  description text not null,
  cta_label   text not null default 'Get Started',
  cta_href    text not null default '/register',
  image_url   text not null,
  is_published boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.hero_slides enable row level security;

drop policy if exists hero_slides_public_read on public.hero_slides;
create policy hero_slides_public_read on public.hero_slides
  for select using (is_published = true);

drop policy if exists hero_slides_auth_write on public.hero_slides;
create policy hero_slides_auth_write on public.hero_slides
  for all to authenticated using (true) with check (true);

insert into public.hero_slides (sort_order, title, description, cta_label, cta_href, image_url)
values
  (1, 'Every vehicle on one live map',
   'Real-time positions, route replay and instant alerts for your whole fleet — from one screen, on any device.',
   'Start Tracking', '/register', 'https://picsum.photos/seed/aerotrack-fleet/1600/900'),
  (2, 'Fuel theft caught the same day',
   'Fuel-level sensors and negotiated coupons flag every litre — drains, phantom fills and over-spend show up instantly.',
   'Protect Your Fuel', '/register', 'https://picsum.photos/seed/aerotrack-fuel/1600/900'),
  (3, 'Cut the engine from anywhere',
   'Remote immobilisation by app or SMS — stop a stolen or unauthorised vehicle and restore it when it is safe.',
   'Get Immobilised', '/register', 'https://picsum.photos/seed/aerotrack-cutoff/1600/900'),
  (4, 'We run your transport department',
   'Corporate & industrial fleets: we fit the hardware, watch the alerts, book the services and bill you once a month.',
   'Talk To Us', '#apply', 'https://picsum.photos/seed/aerotrack-corporate/1600/900'),
  (5, 'Bring the trackers you already own',
   'Ten wire protocols decoded natively — SinoTrack, Teltonika, GT06, JT808 and more plug straight into AeroTrack.',
   'See Supported Devices', '/supported-vehicles', 'https://picsum.photos/seed/aerotrack-devices/1600/900')
on conflict do nothing;

alter table public.vehicle_profiles
  add column if not exists install_steps jsonb;
