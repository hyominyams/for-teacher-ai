-- Saved snapshots are independent of mutable workspace drafts in work_logs.
create table if not exists public.saved_work_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('behavior','subject','creative','docs')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  source_scope_key text not null default 'default',
  legacy_work_log_id uuid unique,
  revision integer not null default 1 check (revision > 0),
  student_count integer not null default 0,
  completed_count integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent, lossless import; source drafts are never changed or deleted.
insert into public.saved_work_logs(id,user_id,category,title,data,source_scope_key,legacy_work_log_id,student_count,completed_count,created_at,updated_at)
select id,user_id,category::text,
  left(coalesce(nullif(scope_label,''),case category::text when 'behavior' then '행동특성' when 'creative' then '창의적 체험활동' when 'subject' then '교과' else '문서' end) || ' · ' || to_char(updated_at at time zone 'Asia/Seoul','YYYY.MM.DD HH24:MI'),120),
  data,scope_key,id,
  case when jsonb_typeof(data->'students')='array' then jsonb_array_length(data->'students') else 0 end,
  (select count(*) from jsonb_array_elements(case when jsonb_typeof(data->'students')='array' then data->'students' else '[]'::jsonb end) s where btrim(coalesce(s->>'aiResult',''))<>''),
  created_at,updated_at
from public.work_logs w where not exists (select 1 from public.saved_work_logs s where s.id=w.id) on conflict(id) do nothing;

create index if not exists saved_work_logs_owner_updated on public.saved_work_logs(user_id,updated_at desc,id desc);
create index if not exists saved_work_logs_owner_archive on public.saved_work_logs(user_id,archived_at,category);
alter table public.saved_work_logs enable row level security;
revoke all on public.saved_work_logs from anon,authenticated;
grant select,insert,update on public.saved_work_logs to authenticated;
grant all on public.saved_work_logs to service_role;
drop policy if exists saved_logs_select_own on public.saved_work_logs;
create policy saved_logs_select_own on public.saved_work_logs for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists saved_logs_insert_own on public.saved_work_logs;
create policy saved_logs_insert_own on public.saved_work_logs for insert to authenticated with check ((select auth.uid())=user_id and archived_at is null and revision=1 and legacy_work_log_id is null);
drop policy if exists saved_logs_update_own on public.saved_work_logs;
create policy saved_logs_update_own on public.saved_work_logs for update to authenticated using ((select auth.uid())=user_id and archived_at is null) with check ((select auth.uid())=user_id);

create or replace function public.guard_saved_work_log() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op <> 'INSERT' and old.archived_at is not null then
    raise exception 'WORK_LOG_ARCHIVED' using errcode='55000';
  end if;
  if tg_op='DELETE' then return old; end if;
  if tg_op='INSERT' then
    if new.archived_at is not null or new.revision<>1 then raise exception 'INVALID_WORK_LOG' using errcode='22023'; end if;
  else
    if new.id<>old.id or new.user_id<>old.user_id or new.category<>old.category or new.created_at<>old.created_at or new.source_scope_key<>old.source_scope_key or new.legacy_work_log_id is distinct from old.legacy_work_log_id then
      raise exception 'WORK_LOG_IDENTITY_IMMUTABLE' using errcode='22023';
    end if;
    if new.revision<>old.revision+1 then raise exception 'WORK_LOG_CONFLICT' using errcode='40001'; end if;
    if new.archived_at is not null then
      if new.data is distinct from old.data or new.title is distinct from old.title then raise exception 'ARCHIVE_MUST_PRESERVE_CONTENT' using errcode='22023'; end if;
      new.archived_at=clock_timestamp();
    end if;
  end if;
  if jsonb_typeof(new.data->'students') is distinct from 'array' or jsonb_array_length(new.data->'students')>40 then
    raise exception 'INVALID_WORK_LOG_DATA' using errcode='22023';
  end if;
  new.student_count=jsonb_array_length(new.data->'students');
  select count(*) into new.completed_count from jsonb_array_elements(new.data->'students') s where btrim(coalesce(s->>'aiResult',''))<>'';
  new.updated_at=clock_timestamp();
  return new;
end;
$$;
drop trigger if exists guard_saved_work_log on public.saved_work_logs;
create trigger guard_saved_work_log before insert or update or delete on public.saved_work_logs for each row execute function public.guard_saved_work_log();

create or replace function public.create_saved_work_log(p_id uuid,p_category text,p_title text,p_data jsonb,p_source_scope_key text default 'default') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result public.saved_work_logs;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  insert into public.saved_work_logs(id,user_id,category,title,data,source_scope_key)
    values(p_id,auth.uid(),p_category,btrim(p_title),p_data,p_source_scope_key) on conflict(id) do nothing returning * into result;
  if not found then
    select * into result from public.saved_work_logs where id=p_id and user_id=auth.uid();
    if not found then raise exception 'WORK_LOG_NOT_FOUND' using errcode='P0002'; end if;
    if result.data is distinct from p_data or result.title<>btrim(p_title) or result.category<>p_category then raise exception 'WORK_LOG_CONFLICT' using errcode='40001'; end if;
  end if;
  return to_jsonb(result);
end;
$$;

create or replace function public.update_saved_work_log(p_id uuid,p_revision integer,p_title text,p_data jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result public.saved_work_logs;
begin
  select * into result from public.saved_work_logs where id=p_id and user_id=auth.uid();
  if not found then raise exception 'WORK_LOG_NOT_FOUND' using errcode='P0002'; end if;
  if result.archived_at is not null then raise exception 'WORK_LOG_ARCHIVED' using errcode='55000'; end if;
  update public.saved_work_logs set title=btrim(p_title),data=p_data,revision=p_revision+1 where id=p_id and user_id=auth.uid() and revision=p_revision and archived_at is null returning * into result;
  if not found then raise exception 'WORK_LOG_CONFLICT' using errcode='40001'; end if;
  return to_jsonb(result);
end;
$$;

create or replace function public.archive_saved_work_log(p_id uuid,p_revision integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result public.saved_work_logs;
begin
  select * into result from public.saved_work_logs where id=p_id and user_id=auth.uid();
  if not found then raise exception 'WORK_LOG_NOT_FOUND' using errcode='P0002'; end if;
  if result.archived_at is not null then return to_jsonb(result); end if;
  update public.saved_work_logs set archived_at=now(),revision=p_revision+1 where id=p_id and user_id=auth.uid() and revision=p_revision and archived_at is null returning * into result;
  if not found then raise exception 'WORK_LOG_CONFLICT' using errcode='40001'; end if;
  return to_jsonb(result);
end;
$$;
revoke all on function public.guard_saved_work_log() from public,anon,authenticated;
revoke all on function public.create_saved_work_log(uuid,text,text,jsonb,text) from public,anon;
revoke all on function public.update_saved_work_log(uuid,integer,text,jsonb) from public,anon;
revoke all on function public.archive_saved_work_log(uuid,integer) from public,anon;
grant execute on function public.create_saved_work_log(uuid,text,text,jsonb,text) to authenticated;
grant execute on function public.update_saved_work_log(uuid,integer,text,jsonb) to authenticated;
grant execute on function public.archive_saved_work_log(uuid,integer) to authenticated;
notify pgrst,'reload schema';
