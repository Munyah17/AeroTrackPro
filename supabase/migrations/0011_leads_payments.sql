-- 0011: public applications (leads) + payments for fix & supply services.
-- Written by the /api/apply, /api/payments/* routes via the service role —
-- no anon/auth RLS policies; the table is private by default.

create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text not null,
  company     text,
  fleet_size  int,
  services    text[] not null default '{}',  -- tracking|fuel|engine_cutoff|speed_governor|dashcam
  message     text,
  status      text not null default 'new',   -- new|contacted|converted|closed
  created_at  timestamptz not null default now()
);

create table if not exists payments (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references leads(id) on delete set null,
  reference     text not null unique,        -- AT-YYYYMMDD-xxxx customer-facing ref
  amount        numeric not null,
  method        text not null,               -- ecocash|onemoney|innbucks|bank_transfer|direct_transfer
  channel       text not null default 'online', -- online (gateway) | manual
  status        text not null default 'initiated',
                -- initiated|awaiting_customer|pending_review|paid|failed|cancelled
  payer_phone   text,
  poll_url      text,                        -- gateway poll URL for mobile pushes
  instructions  text,                        -- what we showed the customer
  gateway_status text,                       -- raw provider status string
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists payments_lead_idx on payments(lead_id);
create index if not exists payments_status_idx on payments(status);

alter table leads enable row level security;
alter table payments enable row level security;
-- no policies: service role bypasses RLS; clients never touch these tables.
