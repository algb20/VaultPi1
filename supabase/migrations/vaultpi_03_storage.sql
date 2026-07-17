-- VaultPi — 03: private storage bucket + per-user policies
insert into storage.buckets (id, name, public, file_size_limit)
values ('vault', 'vault', false, 5368709120)
on conflict (id) do nothing;

create policy vault_select_own on storage.objects for select using (
  bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text );
create policy vault_insert_own on storage.objects for insert with check (
  bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text );
create policy vault_update_own on storage.objects for update using (
  bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text );
create policy vault_delete_own on storage.objects for delete using (
  bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text );
