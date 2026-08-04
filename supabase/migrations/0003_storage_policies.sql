-- =========================================================
-- 0003_storage_policies.sql
-- La RLS des tables ne couvre pas Supabase Storage : storage.objects
-- a besoin de ses propres policies. Les fichiers sont stockés en
-- "{user_id}/{uuid}.pdf" -> le 1er segment du chemin sert de vérification.
-- =========================================================

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

create policy "invoices_storage_select_own" on storage.objects for select
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "invoices_storage_insert_own" on storage.objects for insert
  with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "invoices_storage_update_own" on storage.objects for update
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "invoices_storage_delete_own" on storage.objects for delete
  using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);
