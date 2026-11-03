-- 0017_master_admin_protection.sql
-- The platform owner's account is load-bearing: every other admin/reseller
-- chain depends on the master tenant existing and this user staying
-- super_admin + active. Hard-block delete and demotion at the DB level so
-- no API/UI path can remove it. (Applied to the live DB via
-- scripts/provision-master-admin.mjs.)

create or replace function protect_master_admin() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and lower(old.email) = 'munyamuzvidziwa19@gmail.com' then
    raise exception 'master admin account cannot be deleted';
  end if;
  if tg_op = 'UPDATE' and lower(old.email) = 'munyamuzvidziwa19@gmail.com'
     and (new.role <> 'super_admin' or new.status <> 'active') then
    raise exception 'master admin role/status cannot be changed';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_protect_master_admin on public.users;
create trigger trg_protect_master_admin
  before delete or update on public.users
  for each row execute function protect_master_admin();
