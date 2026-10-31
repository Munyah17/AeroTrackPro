-- 0015_partner_logos.sql
-- Partner/customer + device logos for the landing-page "Our Partners" marquee,
-- managed from Master Portal → Site Content.

create table if not exists public.partner_logos (
  id           uuid primary key default gen_random_uuid(),
  sort_order   int  not null default 0,
  name         text not null,
  logo_url     text not null default '',
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.partner_logos enable row level security;

drop policy if exists partner_logos_public_read on public.partner_logos;
create policy partner_logos_public_read on public.partner_logos
  for select using (is_published = true);

drop policy if exists partner_logos_auth_write on public.partner_logos;
create policy partner_logos_auth_write on public.partner_logos
  for all to authenticated using (true) with check (true);

insert into public.partner_logos (sort_order, name, logo_url) values
  (1, 'SinoTrack', ''),
  (2, 'Teltonika', ''),
  (3, 'Concox', ''),
  (4, 'Queclink', ''),
  (5, 'Xexun', ''),
  (6, 'Coban', ''),
  (7, 'Meitrack', '')
on conflict do nothing;
