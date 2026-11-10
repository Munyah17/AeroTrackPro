-- 0020: quotations — price proposals issued by the platform owner to
-- prospective clients and partners, before they become invoices.
-- Platform-level table (no tenant_id): managed by super admins only.

create sequence if not exists quotation_number_seq;

create table if not exists quotations (
  id           uuid primary key default gen_random_uuid(),
  number       text not null unique
               default ('QT-' || to_char(now(), 'YYYY') || '-' ||
                        lpad(nextval('quotation_number_seq')::text, 4, '0')),
  client_name  text not null,
  client_email text,
  kind         text not null default 'client' check (kind in ('client', 'partner')),
  amount_usd   numeric(10,2) not null default 0,
  currency     text not null default 'USD',
  status       text not null default 'draft'
               check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  notes        text,
  valid_until  date,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists quotations_status_idx on quotations(status);
create index if not exists quotations_created_idx on quotations(created_at desc);

create trigger trg_quotations_updated_at before update on quotations
  for each row execute function set_updated_at();

alter table quotations enable row level security;

-- Quotations are a platform-owner artifact: only super admins read/write.
create policy quotations_sadmin_all on quotations
  for all using (is_super_admin()) with check (is_super_admin());
