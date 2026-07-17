-- VaultPi — 04: pin search_path on trigger function (Supabase security advisor)
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
