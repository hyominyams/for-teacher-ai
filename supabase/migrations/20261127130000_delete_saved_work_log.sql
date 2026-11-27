create function public.delete_saved_work_log(p_id uuid, p_revision integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_revision integer;
  archived_time timestamptz;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select revision, archived_at into current_revision, archived_time
  from public.saved_work_logs where id = p_id and user_id = owner_id for update;
  if not found then raise exception 'WORK_LOG_NOT_FOUND' using errcode = 'P0002'; end if;
  if archived_time is not null then raise exception 'WORK_LOG_ARCHIVED' using errcode = '55000'; end if;
  if current_revision is distinct from p_revision then raise exception 'WORK_LOG_CONFLICT' using errcode = 'P0001'; end if;

  delete from public.saved_work_logs where id = p_id and user_id = owner_id;
end;
$$;

revoke all on function public.delete_saved_work_log(uuid,integer) from public, anon;
grant execute on function public.delete_saved_work_log(uuid,integer) to authenticated;
notify pgrst, 'reload schema';
