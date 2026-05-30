-- Convergence migration for project ptgrwqmeiksoaqauywgg
-- Brings existing profiles/work_logs schema in line with
-- supabase/migrations/20260528_for_teacher_ai_core.sql while preserving rows.

create extension if not exists pgcrypto;

-- 1) workspace_category enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'workspace_category'
      AND n.nspname = 'public'
      AND t.typtype = 'e'
  ) THEN
    CREATE TYPE public.workspace_category AS ENUM ('behavior', 'subject', 'creative', 'docs');
  END IF;
END $$;

-- 2) profiles: ensure base table, add missing columns
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  school_name text,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.profiles
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- user_id generated alias (id와 동일). 기존 컬럼이 없을 때만 추가.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN user_id uuid GENERATED ALWAYS AS (id) STORED NOT NULL;
  END IF;
END $$;

-- profiles_user_id_unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_id_unique'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

comment on table public.profiles is 'Supabase Auth 사용자 기준 프로필 정보';
comment on column public.profiles.id is 'auth.users.id와 동일';
comment on column public.profiles.user_id is '호환성용 별칭(id와 동일)';

create index if not exists idx_profiles_user_id on public.profiles (user_id);

-- 3) work_logs: ensure base table + add missing columns + enum conversion
create table if not exists public.work_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, category)
);

alter table public.work_logs
  add column if not exists schema_version smallint not null default 1;

alter table public.work_logs
  add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.work_logs
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- category: text -> workspace_category enum (값이 모두 enum 라벨과 일치한다고 사전 확인됨)
DO $$
DECLARE
  v_type text;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'work_logs'
    AND column_name = 'category';

  IF v_type = 'text' THEN
    ALTER TABLE public.work_logs
      ALTER COLUMN category TYPE public.workspace_category
      USING category::public.workspace_category;
  END IF;
END $$;

-- data jsonb_typeof = 'object' check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'work_logs_data_is_object'
      AND conrelid = 'public.work_logs'::regclass
  ) THEN
    ALTER TABLE public.work_logs
      ADD CONSTRAINT work_logs_data_is_object CHECK (jsonb_typeof(data) = 'object');
  END IF;
END $$;

-- (user_id, category) 유니크: 기존에 이미 존재(work_logs_user_id_category_key)하므로 생략

comment on table public.work_logs is '카테고리별 최신 사용자 작업 로그';
comment on column public.work_logs.category is 'behavior | subject | creative | docs';
comment on column public.work_logs.data is '학생 입력/생성 데이터(JSON)';
comment on column public.work_logs.schema_version is '임시저장/저장 데이터 스키마 버전';

create index if not exists idx_work_logs_user_id on public.work_logs (user_id);
create index if not exists idx_work_logs_category on public.work_logs (category);
create index if not exists idx_work_logs_user_category on public.work_logs (user_id, category);
create index if not exists idx_work_logs_updated_at on public.work_logs (updated_at desc);

-- 4) updated_at touch function + triggers
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_work_logs_updated_at on public.work_logs;
create trigger trg_work_logs_updated_at
before update on public.work_logs
for each row
execute function public.touch_updated_at();

-- 5) Auth signup -> profiles upsert. 기존 trigger(on_auth_user_created -> handle_new_user) 제거 후 신규 등록.
create or replace function public.sync_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name, school_name, email, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'school_name',
    new.email,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    school_name = excluded.school_name,
    email = excluded.email,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists trg_on_auth_user_created_profiles on auth.users;
create trigger trg_on_auth_user_created_profiles
after insert on auth.users
for each row execute function public.sync_profile_on_signup();

-- 6) 기존 auth.users 기준 profiles 보강 (멱등)
insert into public.profiles (id, full_name, school_name, email, created_at, updated_at)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data ->> 'school_name',
  u.email,
  timezone('utc', now()),
  timezone('utc', now())
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- 7) RLS + policies (기존 정책 제거 후 표준 정책 적용)
alter table public.profiles enable row level security;
alter table public.work_logs enable row level security;

-- 기존 profiles 정책 제거
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 기존 work_logs 정책 제거
drop policy if exists "Users can view their own work logs" on public.work_logs;
drop policy if exists "Users can insert their own work logs" on public.work_logs;
drop policy if exists "Users can update their own work logs" on public.work_logs;
drop policy if exists "Users can delete their own work logs" on public.work_logs;
drop policy if exists "work_logs_select_own" on public.work_logs;
drop policy if exists "work_logs_insert_own" on public.work_logs;
drop policy if exists "work_logs_update_own" on public.work_logs;
drop policy if exists "work_logs_delete_own" on public.work_logs;

create policy "work_logs_select_own"
on public.work_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "work_logs_insert_own"
on public.work_logs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "work_logs_update_own"
on public.work_logs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "work_logs_delete_own"
on public.work_logs
for delete
to authenticated
using (auth.uid() = user_id);

-- 8) helper view (security_invoker로 work_logs의 RLS를 그대로 적용)
create or replace view public.v_my_latest_work_logs
with (security_invoker = true) as
select
  user_id,
  category,
  data,
  schema_version,
  updated_at
from public.work_logs;
