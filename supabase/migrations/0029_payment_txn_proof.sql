-- 0029: manual-payment proof fields on payments.
-- bank_transfer / direct_transfer applications submit the EcoCash or bank
-- transaction ID (txn_reference); EcoCash P2P also submits the sender name so
-- ops can match the mobile-money notification.
alter table public.payments
  add column if not exists txn_reference text,
  add column if not exists sender_name   text;
