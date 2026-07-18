-- VaultPi — 05: enable Realtime for auto-sync across devices
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.folders;
