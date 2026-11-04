-- Use an application error rather than SQL serialization failure, which database gateways retry.
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
    if new.revision<>old.revision+1 then raise exception 'WORK_LOG_CONFLICT' using errcode='P0001'; end if;
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
    if result.data is distinct from p_data or result.title<>btrim(p_title) or result.category<>p_category then raise exception 'WORK_LOG_CONFLICT' using errcode='P0001'; end if;
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
  if not found then raise exception 'WORK_LOG_CONFLICT' using errcode='P0001'; end if;
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
  if not found then raise exception 'WORK_LOG_CONFLICT' using errcode='P0001'; end if;
  return to_jsonb(result);
end;
$$;
notify pgrst,'reload schema';
