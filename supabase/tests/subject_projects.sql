begin;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims',jsonb_build_object(
  'sub',(select id from auth.users where email='demo@forteacher.ai' limit 1),
  'role','authenticated'
)::text,true);
set local role authenticated;

do $$
declare
  owner_id uuid := auth.uid();
  import_id uuid := gen_random_uuid();
  snapshot_id uuid := gen_random_uuid();
  copy_id uuid := gen_random_uuid();
  copied_math_id uuid := gen_random_uuid();
  grouped_draft_copy_id uuid := gen_random_uuid();
  grouped_draft_math_id uuid := gen_random_uuid();
  loose_copy_id uuid := gen_random_uuid();
  loose_math_id uuid := gen_random_uuid();
  failed_copy_id uuid := gen_random_uuid();
  math_scope text := gen_random_uuid()::text;
  korean_scope text := gen_random_uuid()::text;
  loose_math_scope text := gen_random_uuid()::text;
  loose_korean_scope text := gen_random_uuid()::text;
  saved_math_id uuid;
  saved_korean_id uuid;
  ungrouped_count integer;
  edited_math jsonb := '{"students":[{"id":1,"aiResult":"수정한 수학 문장","subjectData":{"individualNote":"수정한 수학 메모"},"polishHistory":[{"original":"수학 원문"}]}],"globalConfig":{"subjectName":"수학","assessments":[{"id":"math"}]}}';
  drafts jsonb := jsonb_build_array(
    jsonb_build_object('scope_key',math_scope,'scope_label','수학','data',
      '{"students":[{"id":1,"aiResult":"수학 문장","subjectData":{"individualNote":"수학 메모"}}],"globalConfig":{"subjectName":"수학","assessments":[{"id":"math"}]}}'::jsonb),
    jsonb_build_object('scope_key',korean_scope,'scope_label','국어','data',
      '{"students":[{"id":1,"aiResult":"국어 문장","subjectData":{"individualNote":"국어 메모"}}],"globalConfig":{"subjectName":"국어","assessments":[{"id":"korean"}]}}'::jsonb)
  );
begin
  if owner_id is null then raise exception 'Test account missing'; end if;
  if import_subject_plan_project(import_id,'교과 프로젝트 검증',drafts) <> import_id then raise exception 'Wrong project'; end if;
  perform import_subject_plan_project(import_id,'교과 프로젝트 검증',drafts);
  if (select count(*) from work_logs where subject_project_id=import_id) <> 2 then raise exception 'Import replay duplicated drafts'; end if;
  if save_subject_project(import_id,snapshot_id,'학기 프로젝트 검증') <> 2 then raise exception 'Group save failed'; end if;
  if save_subject_project(import_id,snapshot_id,'학기 프로젝트 검증') <> 2 then raise exception 'Group save replay failed'; end if;
  if (select count(*) from subject_project_saved_logs where project_id=snapshot_id) <> 2 then raise exception 'Invalid membership count'; end if;
  if exists (
    select 1 from subject_project_saved_logs link
    join saved_work_logs saved on saved.id=link.saved_log_id
    join work_logs original on original.scope_key=saved.source_scope_key and original.subject_project_id=import_id
    where link.project_id=snapshot_id and original.data is distinct from saved.data
  ) then raise exception 'Saved student data changed'; end if;

  select saved.id into strict saved_math_id from subject_project_saved_logs link join saved_work_logs saved on saved.id=link.saved_log_id
    where link.project_id=snapshot_id and saved.source_scope_key=math_scope;
  select saved.id into strict saved_korean_id from subject_project_saved_logs link join saved_work_logs saved on saved.id=link.saved_log_id
    where link.project_id=snapshot_id and saved.source_scope_key=korean_scope;
  if copy_subject_work_logs(copy_id,copied_math_id,'저장본 복사',math_scope,null,saved_math_id,edited_math,'수학 변경 제목') <> 2
    then raise exception 'Full saved project copy failed'; end if;
  if copy_subject_work_logs(copy_id,copied_math_id,'저장본 복사',math_scope,null,saved_math_id,edited_math,'수학 변경 제목') <> 2
    then raise exception 'Full copy replay failed'; end if;
  if not exists (
    select 1 from subject_project_saved_logs link join saved_work_logs saved on saved.id=link.saved_log_id
    where link.project_id=copy_id and saved.id=copied_math_id and saved.data=edited_math and saved.title='수학 변경 제목'
  ) then raise exception 'The copy lost current edits'; end if;
  if (select data from saved_work_logs where id=saved_math_id) is distinct from (drafts->0->'data')
    then raise exception 'The copy changed its original'; end if;
  if not exists (
    select 1 from subject_project_saved_logs link join saved_work_logs saved on saved.id=link.saved_log_id
    where link.project_id=copy_id and saved.source_scope_key=korean_scope and saved.data=(drafts->1->'data')
  ) then raise exception 'Other subjects did not survive the copy'; end if;
  perform update_saved_work_log(saved_math_id,1,'수학',edited_math);
  if (select project_id from subject_project_saved_logs where saved_log_id=saved_math_id) <> snapshot_id
    or (select data from saved_work_logs where id=saved_math_id) is distinct from edited_math
    or (select data from saved_work_logs where id=saved_korean_id) is distinct from (drafts->1->'data')
    then raise exception 'Saving changes moved a subject or changed another subject'; end if;

  select count(*) into ungrouped_count from work_logs where user_id=owner_id and category='subject' and subject_project_id is null;
  insert into work_logs(user_id,category,scope_key,scope_label,data)
    values (owner_id,'subject',loose_math_scope,'수학',drafts->0->'data'),
           (owner_id,'subject',loose_korean_scope,'국어',drafts->1->'data');
  if copy_subject_work_logs(grouped_draft_copy_id,grouped_draft_math_id,'초안 프로젝트 복사',math_scope,import_id,null,edited_math,null) <> 2
    then raise exception 'Grouped drafts did not stay in their project scope'; end if;
  if copy_subject_work_logs(loose_copy_id,loose_math_id,'미분류 교과 복사',loose_math_scope,null,null,edited_math,null) <> ungrouped_count + 2
    then raise exception 'Ungrouped drafts included other projects'; end if;
  if not exists (
    select 1 from subject_project_saved_logs link join saved_work_logs saved on saved.id=link.saved_log_id
    where link.project_id=loose_copy_id and saved.id=loose_math_id and saved.data=edited_math and saved.source_scope_key=loose_math_scope
  ) then raise exception 'Wrong current ungrouped draft copied'; end if;
  begin
    perform copy_subject_work_logs(failed_copy_id,gen_random_uuid(),'실패해야 하는 복사',loose_math_scope,import_id,null,edited_math,null);
    raise exception 'Copy accepted a current draft outside the project';
  exception when no_data_found then null;
  end;
  if exists (select 1 from subject_projects where id=failed_copy_id) then raise exception 'A failed copy left a project behind'; end if;

  perform archive_saved_work_log(saved_korean_id,1);
  if copy_subject_work_logs(gen_random_uuid(),gen_random_uuid(),'편집 가능한 저장본만 복사',math_scope,null,saved_math_id,edited_math,null) <> 1
    then raise exception 'A copy included an archived subject'; end if;
  perform delete_saved_work_log(copied_math_id,1);
  if exists (select 1 from subject_project_saved_logs where saved_log_id=copied_math_id)
    or (select count(*) from subject_project_saved_logs where project_id=copy_id) <> 1
    or not exists (select 1 from saved_work_logs where id=saved_math_id)
    or not exists (select 1 from work_logs where subject_project_id=import_id and scope_key=math_scope)
    then raise exception 'Deleting a copied subject affected its source or another project member'; end if;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  if exists(select 1 from subject_projects where id in (import_id,snapshot_id)) then raise exception 'RLS exposed another user project'; end if;
  if exists(select 1 from subject_project_saved_logs where project_id=snapshot_id) then raise exception 'RLS exposed another user membership'; end if;
  begin
    perform save_subject_project(import_id,gen_random_uuid(),'외부 저장');
    raise exception 'Save allowed another user project';
  exception when no_data_found then null;
  end;
  begin
    perform copy_subject_work_logs(gen_random_uuid(),gen_random_uuid(),'외부 복사',math_scope,null,saved_math_id,edited_math,null);
    raise exception 'Copy allowed another user project';
  exception when no_data_found then null;
  end;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  perform delete_saved_work_log(saved_math_id,2);
  if exists (select 1 from saved_work_logs where id=saved_math_id)
    or exists (select 1 from subject_project_saved_logs where saved_log_id=saved_math_id)
    then raise exception 'Deleted subject or its membership remains'; end if;
  if (select count(*) from subject_project_saved_logs where project_id=snapshot_id) <> 1
    or not exists (
      select 1 from subject_project_saved_logs link join saved_work_logs saved on saved.id=link.saved_log_id
      where link.project_id=snapshot_id and saved.id=saved_korean_id and saved.data=(drafts->1->'data')
    )
    or (select count(*) from work_logs where subject_project_id=import_id) <> 2
    then raise exception 'Deletion changed another subject or a draft'; end if;
end
$$;
rollback;
