-- Keep admin adjustments and AI jobs in disjoint idempotency namespaces.
create or replace function public.reserve_credit_job(p_user_id uuid, p_request_id uuid, p_owner_token uuid, p_fingerprint text, p_operation text, p_reserve_units bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare w public.credit_wallets; j public.credit_jobs;
begin
    if p_reserve_units is null or p_reserve_units <= 0 or p_reserve_units > 10000000000 or length(p_fingerprint) <> 64 then raise exception using message='CREDIT_INVALID_REQUEST',errcode='PT400'; end if;
    w := public.ensure_credit_wallet(p_user_id);
    select * into j from public.credit_jobs where user_id=p_user_id and request_id=p_request_id;
    if found then
        if j.fingerprint <> p_fingerprint or j.operation <> p_operation then raise exception using message='CREDIT_REQUEST_CONFLICT',errcode='PT409'; end if;
        return jsonb_build_object('created',false,'job',to_jsonb(j));
    end if;
    if exists(select 1 from public.credit_ledger where user_id=p_user_id and request_id=p_request_id) then raise exception using message='CREDIT_REQUEST_CONFLICT',errcode='PT409'; end if;
    if (select count(*) from public.credit_jobs where user_id=p_user_id and created_at > now()-interval '5 minutes') >= 180 then raise exception using message='CREDIT_RATE_LIMIT',errcode='PT429'; end if;
    if (select count(*) from public.credit_jobs where user_id=p_user_id and status='running' and created_at > now()-interval '10 minutes') >= 6 then raise exception using message='CREDIT_BUSY',errcode='PT429'; end if;
    if w.balance_units-w.reserved_units < p_reserve_units then raise exception using message='CREDIT_INSUFFICIENT',errcode='PT402'; end if;
    update public.credit_wallets set reserved_units=reserved_units+p_reserve_units,updated_at=now() where user_id=p_user_id;
    insert into public.credit_jobs(user_id,request_id,owner_token,fingerprint,operation,status,reserved_units)
      values(p_user_id,p_request_id,p_owner_token,p_fingerprint,p_operation,'running',p_reserve_units) returning * into j;
    return jsonb_build_object('created',true,'job',to_jsonb(j));
end;
$$;

create or replace function public.adjust_credit_balance(p_actor_id uuid,p_user_id uuid,p_request_id uuid,p_delta_units bigint,p_reason text)
returns public.credit_wallets language plpgsql security invoker set search_path = '' as $$
declare w public.credit_wallets; l public.credit_ledger;
begin
    if not exists(select 1 from public.credit_admins where user_id=p_actor_id) then raise exception using message='CREDIT_ADMIN_REQUIRED',errcode='PT403'; end if;
    if p_delta_units is null or p_delta_units=0 or abs(p_delta_units)>1000000000000 or length(trim(p_reason)) not between 2 and 200 then raise exception using message='CREDIT_INVALID_REQUEST',errcode='PT400'; end if;
    w := public.ensure_credit_wallet(p_user_id);
    if exists(select 1 from public.credit_jobs where user_id=p_user_id and request_id=p_request_id) then raise exception using message='CREDIT_REQUEST_CONFLICT',errcode='PT409'; end if;
    select * into l from public.credit_ledger where user_id=p_user_id and request_id=p_request_id;
    if found then
        if l.actor_id is distinct from p_actor_id or l.delta_units<>p_delta_units or l.reason<>p_reason then raise exception using message='CREDIT_REQUEST_CONFLICT',errcode='PT409'; end if;
        return w;
    end if;
    if w.balance_units-w.reserved_units+p_delta_units<0 then raise exception using message='CREDIT_INSUFFICIENT',errcode='PT402'; end if;
    update public.credit_wallets set balance_units=balance_units+p_delta_units,updated_at=now() where user_id=p_user_id returning * into w;
    insert into public.credit_ledger(user_id,kind,delta_units,balance_after,request_id,actor_id,reason)
      values(p_user_id,case when p_delta_units>0 then 'admin_grant' else 'admin_revoke' end,p_delta_units,w.balance_units,p_request_id,p_actor_id,p_reason);
    return w;
end;
$$;
