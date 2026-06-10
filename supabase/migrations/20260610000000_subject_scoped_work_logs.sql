-- Allow multiple saved work logs under the same category.
-- subject uses one row per selected subject; other categories keep the default scope.

alter table public.work_logs
  add column if not exists scope_key text not null default 'default',
  add column if not exists scope_label text;

update public.work_logs
set
  scope_key = coalesce(nullif(scope_key, ''), 'default'),
  scope_label = case
    when category = 'subject' then coalesce(scope_label, data #>> '{globalConfig,subjectName}', '교과')
    else scope_label
  end
where scope_key is null
   or scope_key = ''
   or (category = 'subject' and scope_label is null);

alter table public.work_logs
  drop constraint if exists work_logs_user_id_category_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'work_logs_user_category_scope_key_unique'
      and conrelid = 'public.work_logs'::regclass
  ) then
    alter table public.work_logs
      add constraint work_logs_user_category_scope_key_unique unique (user_id, category, scope_key);
  end if;
end $$;

comment on column public.work_logs.scope_key is '카테고리 내 저장본 구분 키. subject는 교과별 키, 그 외는 default';
comment on column public.work_logs.scope_label is '사용자에게 표시할 저장본 이름. subject는 교과명';

create index if not exists idx_work_logs_user_category_scope
  on public.work_logs (user_id, category, scope_key);

drop view if exists public.v_my_latest_work_logs;
create or replace view public.v_my_latest_work_logs as
select
  user_id,
  category,
  scope_key,
  scope_label,
  data,
  schema_version,
  updated_at
from public.work_logs;
