create table public.subject_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  source_project_id uuid,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (source_project_id, user_id) references public.subject_projects(id, user_id)
);

alter table public.work_logs add column subject_project_id uuid;
alter table public.work_logs add foreign key (subject_project_id, user_id) references public.subject_projects(id, user_id);
alter table public.work_logs add check (subject_project_id is null or category::text = 'subject');
create index work_logs_subject_project on public.work_logs (subject_project_id) where subject_project_id is not null;

create unique index saved_work_logs_id_owner on public.saved_work_logs(id, user_id);
create table public.subject_project_saved_logs (
  saved_log_id uuid primary key,
  project_id uuid not null,
  user_id uuid not null,
  foreign key (saved_log_id, user_id) references public.saved_work_logs(id, user_id) on delete cascade,
  foreign key (project_id, user_id) references public.subject_projects(id, user_id) on delete cascade
);
create index subject_project_saved_logs_project on public.subject_project_saved_logs(project_id);

alter table public.subject_projects enable row level security;
alter table public.subject_project_saved_logs enable row level security;
revoke all on public.subject_projects, public.subject_project_saved_logs from anon, authenticated;
grant select, insert on public.subject_projects, public.subject_project_saved_logs to authenticated;
grant all on public.subject_projects, public.subject_project_saved_logs to service_role;
create policy subject_projects_select_own on public.subject_projects for select to authenticated using ((select auth.uid()) = user_id);
create policy subject_projects_insert_own on public.subject_projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy subject_project_saved_logs_select_own on public.subject_project_saved_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy subject_project_saved_logs_insert_own on public.subject_project_saved_logs for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.saved_work_logs log where log.id = saved_log_id and log.user_id = (select auth.uid()) and log.category = 'subject'
  )
);

create function public.import_subject_plan_project(p_id uuid, p_title text, p_drafts jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  draft jsonb;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if jsonb_typeof(p_drafts) is distinct from 'array' or jsonb_array_length(p_drafts) not between 1 and 100 then
    raise exception 'INVALID_SUBJECT_PLAN' using errcode = '22023';
  end if;

  insert into public.subject_projects(id, user_id, title)
    values (p_id, owner_id, btrim(p_title)) on conflict (id) do nothing;
  if not exists (
    select 1 from public.subject_projects where id = p_id and user_id = owner_id and title = btrim(p_title) and source_project_id is null
  ) then raise exception 'WORK_LOG_CONFLICT' using errcode = 'P0001'; end if;

  for draft in select value from jsonb_array_elements(p_drafts) loop
    if nullif(btrim(draft->>'scope_key'), '') is null
      or jsonb_typeof(draft->'data'->'students') is distinct from 'array'
      or jsonb_array_length(draft->'data'->'students') not between 1 and 40
      or jsonb_typeof(draft->'data'->'globalConfig'->'assessments') is distinct from 'array'
      or jsonb_array_length(draft->'data'->'globalConfig'->'assessments') = 0 then
      raise exception 'INVALID_SUBJECT_PLAN' using errcode = '22023';
    end if;
    insert into public.work_logs(user_id, category, scope_key, scope_label, data, schema_version, subject_project_id)
      values (owner_id, 'subject', draft->>'scope_key', draft->>'scope_label', draft->'data', 2, p_id)
      on conflict (user_id, category, scope_key) do nothing;
    if not exists (
      select 1 from public.work_logs where user_id = owner_id and category = 'subject'
        and scope_key = draft->>'scope_key' and subject_project_id = p_id
    ) then raise exception 'WORK_LOG_CONFLICT' using errcode = 'P0001'; end if;
  end loop;

  return p_id;
end;
$$;

create function public.save_subject_project(p_source_id uuid, p_id uuid, p_title text) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  draft public.work_logs;
  saved_id uuid;
  saved_count integer := 0;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.subject_projects where id = p_source_id and user_id = owner_id and source_project_id is null
  ) then raise exception 'WORK_LOG_NOT_FOUND' using errcode = 'P0002'; end if;

  insert into public.subject_projects(id, user_id, title, source_project_id)
    values (p_id, owner_id, btrim(p_title), p_source_id) on conflict (id) do nothing;
  if not found then
    if not exists (
      select 1 from public.subject_projects where id = p_id and user_id = owner_id
        and title = btrim(p_title) and source_project_id = p_source_id
    ) then raise exception 'WORK_LOG_CONFLICT' using errcode = 'P0001'; end if;
    return (select count(*)::integer from public.subject_project_saved_logs where project_id = p_id and user_id = owner_id);
  end if;

  for draft in select * from public.work_logs where user_id = owner_id and category = 'subject'
    and subject_project_id = p_source_id order by created_at, scope_key
  loop
    insert into public.saved_work_logs(user_id, category, title, data, source_scope_key)
      values (owner_id, 'subject', left(coalesce(nullif(btrim(draft.scope_label), ''), '교과'), 120), draft.data, draft.scope_key)
      returning id into saved_id;
    insert into public.subject_project_saved_logs(saved_log_id, project_id, user_id) values (saved_id, p_id, owner_id);
    saved_count := saved_count + 1;
  end loop;
  if saved_count = 0 then raise exception 'WORK_LOG_NOT_FOUND' using errcode = 'P0002'; end if;

  return saved_count;
end;
$$;
revoke all on function public.import_subject_plan_project(uuid,text,jsonb), public.save_subject_project(uuid,uuid,text) from public, anon;
grant execute on function public.import_subject_plan_project(uuid,text,jsonb), public.save_subject_project(uuid,uuid,text) to authenticated;
notify pgrst, 'reload schema';
