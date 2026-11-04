-- Run inside a transaction after the migration; always ROLLBACK afterward.
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from auth.users where email='demo@forteacher.ai' limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare
  item jsonb;
  identifier uuid=gen_random_uuid();
  owner_id uuid=auth.uid();
  body jsonb='{"students":[{"id":1,"aiResult":"원문"}],"studentCount":1,"charLimits":{"behavior":300}}';
begin
  if owner_id is null then raise exception 'Test account missing'; end if;
  item=public.create_saved_work_log(identifier,'behavior','QA 저장본',body,'default');
  if (item->>'revision')::int<>1 then raise exception 'Create failed'; end if;
  perform public.create_saved_work_log(identifier,'behavior','QA 저장본',body,'default');
  if (select count(*) from public.saved_work_logs where id=identifier)<>1 then raise exception 'Idempotency failed'; end if;
  item=public.update_saved_work_log(identifier,1,'QA 수정본',jsonb_set(body,'{students,0,aiResult}','"수정문"'));
  if (item->>'revision')::int<>2 or item#>>'{data,students,0,aiResult}'<>'수정문' then raise exception 'Update failed'; end if;
  begin
    perform public.update_saved_work_log(identifier,1,'오래된 수정',body);
    raise exception 'Stale update accepted';
  exception when raise_exception then if sqlerrm <> 'WORK_LOG_CONFLICT' then raise; end if;
  end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  if exists(select 1 from public.saved_work_logs where id=identifier) then raise exception 'RLS leaked another user row'; end if;
  begin
    perform public.update_saved_work_log(identifier,2,'다른 사용자',body);
    raise exception 'Other user update accepted';
  exception when no_data_found then null;
  end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  begin
    update public.saved_work_logs set title='동시 변경',archived_at=now(),revision=3 where id=identifier;
    raise exception 'Archive changed content';
  exception when invalid_parameter_value then null;
  end;
  item=public.archive_saved_work_log(identifier,2);
  if item->>'archived_at' is null or item#>>'{data,students,0,aiResult}'<>'수정문' then raise exception 'Archive failed'; end if;
  perform public.archive_saved_work_log(identifier,2);
  begin
    perform public.update_saved_work_log(identifier,3,'수정 시도',body);
    raise exception 'Archived update accepted';
  exception when object_not_in_prerequisite_state then null;
  end;
  update public.saved_work_logs set archived_at=null,revision=4 where id=identifier;
  if found then raise exception 'RLS allowed unarchive'; end if;
  begin
    delete from public.saved_work_logs where id=identifier;
    raise exception 'Archived delete accepted';
  exception when insufficient_privilege then null;
  end;
  perform set_config('qa.saved_work_log_id',identifier::text,true);
end;
$$;
reset role;
do $$
declare identifier uuid=current_setting('qa.saved_work_log_id')::uuid;
begin
  begin
    update public.saved_work_logs set title='bypass RLS',revision=revision+1 where id=identifier;
    raise exception 'Privileged update bypassed archive lock';
  exception when object_not_in_prerequisite_state then null;
  end;
  begin
    delete from public.saved_work_logs where id=identifier;
    raise exception 'Privileged delete bypassed archive lock';
  exception when object_not_in_prerequisite_state then null;
  end;
end;
$$;
set local role anon;
do $$
begin
  begin
    perform public.archive_saved_work_log(gen_random_uuid(),1);
    raise exception 'Anonymous execute allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
