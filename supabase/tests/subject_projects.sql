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
  math_scope text := gen_random_uuid()::text;
  korean_scope text := gen_random_uuid()::text;
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
  perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  if exists(select 1 from subject_projects where id in (import_id,snapshot_id)) then raise exception 'RLS exposed another user project'; end if;
  if exists(select 1 from subject_project_saved_logs where project_id=snapshot_id) then raise exception 'RLS exposed another user membership'; end if;
  begin
    perform save_subject_project(import_id,gen_random_uuid(),'외부 저장');
    raise exception 'Save allowed another user project';
  exception when no_data_found then null;
  end;
end
$$;
rollback;
