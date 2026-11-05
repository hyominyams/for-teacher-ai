\set ON_ERROR_STOP on
do $$ begin if current_database()<>'ftai_credits_test' then raise exception 'Use a disposable LOCAL ftai_credits_test database'; end if; end $$;
create schema auth;
create table auth.users(id uuid primary key,email varchar(255),email_confirmed_at timestamptz,phone_confirmed_at timestamptz,created_at timestamptz default now());
create table public.profiles(id uuid primary key,full_name text);
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000001','admin@example.test',now()),
 ('00000000-0000-4000-8000-000000000002','teacher@example.test',now()),
 ('00000000-0000-4000-8000-000000000003','parallel@example.test',now()),
 ('00000000-0000-4000-8000-000000000004','unverified@example.test',null);
\ir ../supabase/migrations/20261105120000_token_credits.sql
\ir ../supabase/migrations/20261105123000_credit_request_ids.sql
\ir ../supabase/migrations/20261105124500_credit_member_types.sql
insert into public.credit_admins(user_id) values('00000000-0000-4000-8000-000000000001');

begin;
create function pg_temp.must_fail(statement text,expected text) returns void language plpgsql as $$
begin begin execute statement;exception when others then if position(expected in sqlerrm)>0 then return;end if;raise;end;raise exception 'Expected rejection: %',statement;end;
$$;
do $$ begin
    assert (select count(*) from public.credit_wallets)=3,'verified members only';
    assert (select min(balance_units) from public.credit_wallets)=300000000,'welcome is 30 credits';
end $$;
select public.ensure_credit_wallet('00000000-0000-4000-8000-000000000002');
select public.ensure_credit_wallet('00000000-0000-4000-8000-000000000002');
do $$ begin assert (select count(*) from public.credit_ledger where user_id='00000000-0000-4000-8000-000000000002' and kind='welcome')=1,'welcome only once';end $$;
select pg_temp.must_fail($s$select public.ensure_credit_wallet('00000000-0000-4000-8000-000000000004')$s$,'CREDIT_VERIFICATION_REQUIRED');
select pg_temp.must_fail($s$select public.reserve_credit_job('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',repeat('a',64),'generate',300000001)$s$,'CREDIT_INSUFFICIENT');
select public.reserve_credit_job('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',repeat('a',64),'generate',100000000);
-- Duplicate reservation cannot consume another 10 credits or steal its owner token.
select public.reserve_credit_job('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',repeat('a',64),'generate',100000000);
do $$ begin assert (select reserved_units from public.credit_wallets where user_id='00000000-0000-4000-8000-000000000002')=100000000;end $$;
select pg_temp.must_fail($s$select public.reserve_credit_job('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',repeat('b',64),'generate',100000000)$s$,'CREDIT_REQUEST_CONFLICT');
select public.record_credit_usage('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',0,'gpt-6-luna','response-test','test','{"input":100}',10000000);
select public.record_credit_usage('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',0,'gpt-6-luna','response-test','test','{"input":100}',10000000);
select pg_temp.must_fail($s$select public.finish_credit_job('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','completed','{"result":"forged"}')$s$,'CREDIT_REQUEST_CONFLICT');
select public.finish_credit_job('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','completed','{"result":"first result"}');
select public.finish_credit_job('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','completed','{"result":"duplicate must not replace"}');
do $$ begin
    assert (select balance_units from public.credit_wallets where user_id='00000000-0000-4000-8000-000000000002')=290000000,'charge actual once';
    assert (select reserved_units from public.credit_wallets where user_id='00000000-0000-4000-8000-000000000002')=0,'release unused reservation';
    assert (select result->>'result' from public.credit_jobs where request_id='10000000-0000-4000-8000-000000000001')='first result','stable retry output';
end $$;
-- Failed generation refunds its entire reservation, including known provider cost.
select public.reserve_credit_job('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',repeat('a',64),'polish',100000000);
select public.record_credit_usage('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',0,'gpt-6-luna','response-failed','test','{"input":100}',10000000);
select public.finish_credit_job('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','failed',null,'AI_INCOMPLETE');
do $$ begin assert (select balance_units from public.credit_wallets where user_id='00000000-0000-4000-8000-000000000002')=290000000;end $$;
-- No one can grant themselves credits by claiming an admin role in client input.
select pg_temp.must_fail($s$select public.adjust_credit_balance('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',300000000,'forged grant')$s$,'CREDIT_ADMIN_REQUIRED');
select public.adjust_credit_balance('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',300000000,'test grant');
select public.adjust_credit_balance('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',300000000,'test grant');
do $$ begin assert (select balance_units from public.credit_wallets where user_id='00000000-0000-4000-8000-000000000002')=590000000;end $$;
select pg_temp.must_fail($s$select public.adjust_credit_balance('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002',-590000001,'excessive revoke')$s$,'CREDIT_INSUFFICIENT');
-- Uncertain calls retain holds until an administrator explicitly resolves them.
select public.reserve_credit_job('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001',repeat('a',64),'generate',100000000);
select public.finish_credit_job('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','uncertain');
select pg_temp.must_fail($s$select public.release_uncertain_credit_job('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','checked usage')$s$,'CREDIT_STILL_RUNNING');
update public.credit_jobs set created_at=now()-interval '15 minutes' where request_id='10000000-0000-4000-8000-000000000003';
select public.release_uncertain_credit_job('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','checked usage');
do $$ begin assert (select reserved_units from public.credit_wallets where user_id='00000000-0000-4000-8000-000000000002')=0;end $$;
set local role authenticated;
do $$ begin
    begin perform * from public.credit_wallets;raise exception 'unexpected wallet access';exception when insufficient_privilege then null;end;
    begin perform public.ensure_credit_wallet('00000000-0000-4000-8000-000000000002');raise exception 'unexpected RPC access';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role service_role;
select public.ensure_credit_wallet('00000000-0000-4000-8000-000000000002');
select * from public.admin_credit_members('00000000-0000-4000-8000-000000000001');
reset role;
rollback;
\echo Credit database checks passed. Initial fixture wallets remain for concurrency tests.
