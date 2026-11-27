create function public.copy_subject_work_logs(
  p_id uuid, p_current_id uuid, p_title text, p_scope_key text,
  p_source_project_id uuid, p_source_log_id uuid, p_current_data jsonb, p_current_title text
) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  source_id uuid := p_source_project_id;
  entry record;
  copied_id uuid;
  copied_current boolean := false;
  copied_count integer := 0;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if p_source_log_id is not null then
    select link.project_id into source_id
    from public.subject_project_saved_logs link
    join public.saved_work_logs log on log.id = link.saved_log_id and log.user_id = link.user_id
    where link.saved_log_id = p_source_log_id and link.user_id = owner_id and log.category = 'subject';
    if not found then raise exception 'WORK_LOG_NOT_FOUND' using errcode = 'P0002'; end if;
  end if;

  insert into public.subject_projects(id, user_id, title, source_project_id)
    values (p_id, owner_id, btrim(p_title), source_id) on conflict (id) do nothing;
  if not found then
    if not exists (
      select 1 from public.subject_projects project
      join public.subject_project_saved_logs link on link.project_id = project.id and link.user_id = project.user_id
      where project.id = p_id and project.user_id = owner_id and project.title = btrim(p_title)
        and project.source_project_id is not distinct from source_id and link.saved_log_id = p_current_id
    ) then raise exception 'WORK_LOG_CONFLICT' using errcode = 'P0001'; end if;
    return (select count(*)::integer from public.subject_project_saved_logs where project_id = p_id and user_id = owner_id);
  end if;

  for entry in
    select draft.scope_key, draft.scope_label as title, draft.data, draft.created_at, draft.scope_key = p_scope_key as is_current
    from public.work_logs draft
    where p_source_log_id is null and draft.user_id = owner_id and draft.category = 'subject'
      and draft.subject_project_id is not distinct from source_id
    union all
    select log.source_scope_key, log.title, log.data, log.created_at, log.id = p_source_log_id
    from public.saved_work_logs log
    join public.subject_project_saved_logs link on link.saved_log_id = log.id and link.user_id = log.user_id
    where p_source_log_id is not null and log.user_id = owner_id and log.category = 'subject'
      and log.archived_at is null and link.project_id = source_id
    order by created_at, scope_key
  loop
    copied_id := case when entry.is_current then p_current_id else gen_random_uuid() end;
    insert into public.saved_work_logs(id, user_id, category, title, data, source_scope_key)
      values (
        copied_id, owner_id, 'subject',
        left(coalesce(case when entry.is_current then nullif(btrim(p_current_title), '') end, nullif(btrim(entry.title), ''), '교과'), 120),
        case when entry.is_current then p_current_data else entry.data end,
        entry.scope_key
      );
    insert into public.subject_project_saved_logs(saved_log_id, project_id, user_id) values (copied_id, p_id, owner_id);
    copied_current := copied_current or entry.is_current;
    copied_count := copied_count + 1;
  end loop;

  if not copied_current then raise exception 'WORK_LOG_NOT_FOUND' using errcode = 'P0002'; end if;
  return copied_count;
end;
$$;

revoke all on function public.copy_subject_work_logs(uuid,uuid,text,text,uuid,uuid,jsonb,text) from public, anon;
grant execute on function public.copy_subject_work_logs(uuid,uuid,text,text,uuid,uuid,jsonb,text) to authenticated;
notify pgrst, 'reload schema';
