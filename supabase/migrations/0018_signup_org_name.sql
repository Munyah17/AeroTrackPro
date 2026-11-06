-- Use the organisation name collected at registration as the tenant name.
-- 0001's trigger always created "<display_name>'s Fleet" and the submitted
-- company name was discarded at signup; now signUpWithEmail sends org_name
-- in raw_user_meta_data and the trigger honours it, falling back to the
-- legacy placeholder only when metadata is absent (admin-created users).
create or replace function handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  new_tenant_id uuid;
  display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));

  insert into tenants (name, slug)
  values (
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'org_name'), ''), display_name || '''s Fleet'),
    regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9]+', '-', 'g') || '-' || substr(new.id::text, 1, 8)
  )
  returning id into new_tenant_id;

  insert into users (tenant_id, auth_id, email, full_name, role)
  values (new_tenant_id, new.id, new.email, display_name, 'admin');

  return new;
end;
$$;
