-- VaultPi — 02: RLS policies (per-user isolation; auth.uid() wrapped for perf)
alter table public.profiles     enable row level security;
alter table public.folders      enable row level security;
alter table public.items        enable row level security;
alter table public.tags         enable row level security;
alter table public.item_tags    enable row level security;
alter table public.activity_log enable row level security;

create policy profiles_select_own on public.profiles
  for select using ( id = (select auth.uid()) );
create policy profiles_update_own on public.profiles
  for update using ( id = (select auth.uid()) ) with check ( id = (select auth.uid()) );

create policy folders_select_own on public.folders for select using ( user_id = (select auth.uid()) );
create policy folders_insert_own on public.folders for insert with check ( user_id = (select auth.uid()) );
create policy folders_update_own on public.folders for update using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );
create policy folders_delete_own on public.folders for delete using ( user_id = (select auth.uid()) );

create policy items_select_own on public.items for select using ( user_id = (select auth.uid()) );
create policy items_insert_own on public.items for insert with check ( user_id = (select auth.uid()) );
create policy items_update_own on public.items for update using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );
create policy items_delete_own on public.items for delete using ( user_id = (select auth.uid()) );

create policy tags_select_own on public.tags for select using ( user_id = (select auth.uid()) );
create policy tags_insert_own on public.tags for insert with check ( user_id = (select auth.uid()) );
create policy tags_update_own on public.tags for update using ( user_id = (select auth.uid()) ) with check ( user_id = (select auth.uid()) );
create policy tags_delete_own on public.tags for delete using ( user_id = (select auth.uid()) );

create policy item_tags_select_own on public.item_tags for select using (
  exists (select 1 from public.items i where i.id = item_tags.item_id and i.user_id = (select auth.uid())) );
create policy item_tags_insert_own on public.item_tags for insert with check (
  exists (select 1 from public.items i where i.id = item_tags.item_id and i.user_id = (select auth.uid())) );
create policy item_tags_delete_own on public.item_tags for delete using (
  exists (select 1 from public.items i where i.id = item_tags.item_id and i.user_id = (select auth.uid())) );

create policy activity_select_own on public.activity_log for select using ( user_id = (select auth.uid()) );
create policy activity_insert_own on public.activity_log for insert with check ( user_id = (select auth.uid()) );
