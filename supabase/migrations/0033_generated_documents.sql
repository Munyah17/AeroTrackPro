-- 0033: generated_documents — business documents issued by the platform
-- owner: invoices, receipts, statements, BOQ, BOM, waybills, checkout and
-- transfer docs. Platform-level table (no tenant_id), super-admin only,
-- same ownership model as quotations (0020).

create sequence if not exists gen_doc_invoice_seq;
create sequence if not exists gen_doc_receipt_seq;
create sequence if not exists gen_doc_statement_seq;
create sequence if not exists gen_doc_boq_seq;
create sequence if not exists gen_doc_bom_seq;
create sequence if not exists gen_doc_waybill_seq;
create sequence if not exists gen_doc_checkout_seq;
create sequence if not exists gen_doc_transfer_seq;

create table if not exists generated_documents (
  id                uuid primary key default gen_random_uuid(),
  doc_type          text not null
                    check (doc_type in ('invoice','receipt','statement','boq','bom','waybill','checkout','transfer')),
  number            text not null unique,
  party_name        text not null,
  party_contact     text,
  counterparty_name text,
  amount            numeric(12,2) not null default 0,
  currency          text not null default 'USD',
  issue_date        date not null default current_date,
  due_date          date,
  period_start      date,
  period_end        date,
  details           text,
  status            text not null default 'draft'
                    check (status in ('draft','sent','issued','paid','completed',
                                      'in_transit','delivered','pending','accepted',
                                      'void','cancelled')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists generated_documents_type_idx on generated_documents(doc_type, created_at desc);
create index if not exists generated_documents_status_idx on generated_documents(status);

-- Per-type sequential numbering: INV-2026-0001, RCT-2026-0001, …
create or replace function generated_doc_number() returns trigger
language plpgsql as $$
declare
  pfx text;
  seq_name text;
begin
  if NEW.number is not null and NEW.number <> '' then
    return NEW;
  end if;
  pfx := case NEW.doc_type
    when 'invoice'   then 'INV'
    when 'receipt'   then 'RCT'
    when 'statement' then 'STM'
    when 'boq'       then 'BOQ'
    when 'bom'       then 'BOM'
    when 'waybill'   then 'WAYB'
    when 'checkout'  then 'CHK'
    when 'transfer'  then 'TRF'
  end;
  seq_name := 'gen_doc_' || NEW.doc_type || '_seq';
  NEW.number := pfx || '-' || to_char(now(), 'YYYY') || '-' ||
    lpad(nextval(seq_name::regclass)::text, 4, '0');
  return NEW;
end $$;

create trigger trg_generated_documents_number
  before insert on generated_documents
  for each row execute function generated_doc_number();

create trigger trg_generated_documents_updated_at before update on generated_documents
  for each row execute function set_updated_at();

alter table generated_documents enable row level security;

-- Platform-owner documents: only super admins read/write.
create policy generated_documents_sadmin_all on generated_documents
  for all using (is_super_admin()) with check (is_super_admin());
