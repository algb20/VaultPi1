-- VaultPi — 01: core schema (applied to project shsuznbuaxkkykvgbklb)
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  pi_uid          text unique not null,
  username        text not null,
  credits_balance numeric not null default 0,
  storage_used    bigint  not null default 0,
  storage_quota   bigint  not null default 5368709120,
  settings        jsonb   not null default '{"notifications":true,"autoSync":true,"darkMode":true,"biometric":false,"encryptAll":true,"offlineMode":true,"language":"English (US)"}'::jsonb,
  dock_config     jsonb   not null default '{"enabled":true,"side":"right","offset":45,"opacity":0.95,"actions":["upload","note","search","starred"]}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, color text default 'primary',
  parent_id uuid references public.folders(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_folders_updated before update on public.folders
  for each row execute function public.set_updated_at();
create index if not exists idx_folders_user on public.folders(user_id);
create index if not exists idx_folders_parent on public.folders(parent_id);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('photo','video','document','link','audio','archive','other','note')),
  name text not null,
  folder_id uuid references public.folders(id) on delete set null,
  storage_path text, mime_type text, size_bytes bigint not null default 0,
  link_url text, note_content text, thumbnail_path text,
  is_encrypted boolean not null default false,
  is_starred boolean not null default false,
  is_pinned boolean not null default false,
  is_trashed boolean not null default false,
  upload_status text not null default 'ready' check (upload_status in ('uploading','ready')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_items_updated before update on public.items
  for each row execute function public.set_updated_at();
create index if not exists idx_items_user on public.items(user_id);
create index if not exists idx_items_user_kind on public.items(user_id, kind);
create index if not exists idx_items_folder on public.items(folder_id);
create index if not exists idx_items_user_trashed on public.items(user_id, is_trashed);
create index if not exists idx_items_user_starred on public.items(user_id, is_starred) where is_starred;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, color text default 'primary',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists idx_tags_user on public.tags(user_id);

create table if not exists public.item_tags (
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id  uuid not null references public.tags(id) on delete cascade,
  primary key (item_id, tag_id)
);
create index if not exists idx_item_tags_tag on public.item_tags(tag_id);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null, detail text,
  item_id uuid references public.items(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_user on public.activity_log(user_id, created_at desc);
