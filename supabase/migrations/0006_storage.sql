-- AeroTrack Pro: storage buckets
-- documents  (private) — insurance policies, maintenance invoices, exports.
-- avatars    (public)  — user/driver profile photos.
-- branding   (public)  — white-label logos & login-page art per tenant.
-- Path convention: <tenant_id>/<file> so RLS can scope by folder prefix.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documents', 'documents', false, 20971520, null),
  ('avatars',   'avatars',   true,  5242880,  '{image/png,image/jpeg,image/webp,image/gif}'),
  ('branding',  'branding',  true,  5242880,  '{image/png,image/jpeg,image/webp,image/svg+xml}')
on conflict (id) do nothing;

-- ==================== documents (private, tenant-scoped) ====================
create policy docs_tenant_read on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth_tenant_id()::text);
create policy docs_tenant_write on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth_tenant_id()::text);
create policy docs_tenant_update on storage.objects for update
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth_tenant_id()::text);
create policy docs_tenant_delete on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_user_role() in ('super_admin', 'admin', 'manager')
  );

-- ==================== avatars (public read, tenant writes) ====================
create policy avatars_tenant_write on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth_tenant_id()::text);
create policy avatars_tenant_update on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth_tenant_id()::text);
create policy avatars_tenant_delete on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_user_role() in ('super_admin', 'admin', 'manager')
  );

-- ==================== branding (public read, admin writes) ====================
create policy branding_admin_write on storage.objects for insert
  with check (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_user_role() in ('super_admin', 'admin')
  );
create policy branding_admin_update on storage.objects for update
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_user_role() in ('super_admin', 'admin')
  );
create policy branding_admin_delete on storage.objects for delete
  using (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = auth_tenant_id()::text
    and auth_user_role() in ('super_admin', 'admin')
  );
