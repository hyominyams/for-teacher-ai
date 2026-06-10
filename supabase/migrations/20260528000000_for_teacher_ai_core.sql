-- for-teacher-ai: Core PostgreSQL schema for Supabase
-- Scope:
-- 1) profiles: auth 연동 유저 정보
-- 2) work_logs: 카테고리별 최종 작업본 저장(마이페이지 조회 기준)
-- 3) RLS and trigger-based lifecycle

create extension if not exists pgcrypto;

-- 카테고리 코드(고정값)
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

-- 1) profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  user_id uuid generated always as (id) stored not null,
  full_name text,
  school_name text,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_user_id_unique unique (user_id)
);

comment on table public.profiles is 'Supabase Auth 사용자 기준 프로필 정보';
comment on column public.profiles.id is 'auth.users.id와 동일';
comment on column public.profiles.user_id is '호환성용 별칭(id와 동일)';

create index if not exists idx_profiles_user_id on public.profiles (user_id);

-- 2) work_logs: 카테고리별 최신 한 건(마이페이지: 최신값 사용)
create table if not exists public.work_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category public.workspace_category not null,
  data jsonb not null default '{}'::jsonb,
  schema_version smallint not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, category)
);

comment on table public.work_logs is '카테고리별 최신 사용자 작업 로그';
comment on column public.work_logs.category is 'behavior | subject | creative | docs';
comment on column public.work_logs.data is '학생 입력/생성 데이터(JSON)';
comment on column public.work_logs.schema_version is '임시저장/저장 데이터 스키마 버전';

-- 기본 형식 검증(너무 강하게 막지 않기 위해 경량 제약만 둠)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'work_logs_data_is_object'
      AND conrelid = 'public.work_logs'::regclass
  ) THEN
    ALTER TABLE public.work_logs
      ADD CONSTRAINT work_logs_data_is_object check (jsonb_typeof(data) = 'object');
  END IF;
END $$;

create index if not exists idx_work_logs_user_id on public.work_logs (user_id);
create index if not exists idx_work_logs_category on public.work_logs (category);
create index if not exists idx_work_logs_user_category on public.work_logs (user_id, category);
create index if not exists idx_work_logs_updated_at on public.work_logs (updated_at desc);

-- 3) updated_at 갱신
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

-- 4) Auth 가입 시 profiles 동기화
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

drop trigger if exists trg_on_auth_user_created_profiles on auth.users;
create trigger trg_on_auth_user_created_profiles
after insert on auth.users
for each row execute function public.sync_profile_on_signup();

-- 5) 기존 auth.users를 기준으로 profiles 보강(운영 마이그레이션 이후 1회성)
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

-- 6) RLS
alter table public.profiles enable row level security;
alter table public.work_logs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "work_logs_select_own" on public.work_logs;
create policy "work_logs_select_own"
on public.work_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "work_logs_insert_own" on public.work_logs;
create policy "work_logs_insert_own"
on public.work_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "work_logs_update_own" on public.work_logs;
create policy "work_logs_update_own"
on public.work_logs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "work_logs_delete_own" on public.work_logs;
create policy "work_logs_delete_own"
on public.work_logs
for delete
to authenticated
using (auth.uid() = user_id);

-- 7) 로컬 데이터와 서버 병합을 위한 조회 헬퍼(선택 사용)
create or replace view public.v_my_latest_work_logs as
select
  user_id,
  category,
  data,
  schema_version,
  updated_at
from public.work_logs;
