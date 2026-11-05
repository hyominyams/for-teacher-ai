-- 100 credits = $1; one integer unit = $0.000000001 (one nanodollar).
create table public.credit_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);
create table public.credit_wallets (
    user_id uuid primary key references auth.users(id) on delete cascade,
    balance_units bigint not null default 0 check (balance_units >= 0),
    reserved_units bigint not null default 0 check (reserved_units >= 0 and reserved_units <= balance_units),
    updated_at timestamptz not null default now()
);
create table public.credit_jobs (
    user_id uuid not null references auth.users(id) on delete cascade,
    request_id uuid not null,
    owner_token uuid not null,
    fingerprint text not null,
    operation text not null check (operation in ('generate','standard','subject_plan','polish')),
    status text not null check (status in ('running','completed','failed','uncertain')),
    reserved_units bigint not null check (reserved_units > 0),
    actual_units bigint not null default 0 check (actual_units >= 0),
    charged_units bigint not null default 0 check (charged_units >= 0),
    result jsonb,
    result_expires_at timestamptz,
    error_code text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, request_id)
);
create table public.credit_usage (
    user_id uuid not null,
    request_id uuid not null,
    call_index integer not null check (call_index between 0 and 4),
    model text not null,
    response_id text not null,
    price_version text not null,
    usage jsonb not null,
    cost_units bigint not null check (cost_units >= 0),
    created_at timestamptz not null default now(),
    primary key (user_id, request_id, call_index),
    foreign key (user_id, request_id) references public.credit_jobs(user_id, request_id) on delete cascade
);
create table public.credit_ledger (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    kind text not null check (kind in ('welcome','usage','admin_grant','admin_revoke')),
    delta_units bigint not null,
    balance_after bigint not null,
    request_id uuid,
    actor_id uuid references auth.users(id),
    reason text not null,
    created_at timestamptz not null default now()
);
create unique index credit_welcome_once on public.credit_ledger(user_id) where kind = 'welcome';
create unique index credit_ledger_request_once on public.credit_ledger(user_id, request_id) where request_id is not null;
create index on public.credit_jobs(user_id, created_at desc);
create index on public.credit_ledger(user_id, created_at desc);
create index on public.credit_jobs(status, updated_at);
alter table public.credit_admins enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_jobs enable row level security;
alter table public.credit_usage enable row level security;
alter table public.credit_ledger enable row level security;
revoke all on public.credit_admins, public.credit_wallets, public.credit_jobs, public.credit_usage, public.credit_ledger from public, anon, authenticated;
grant all on public.credit_admins, public.credit_wallets, public.credit_jobs, public.credit_usage, public.credit_ledger to service_role;

create function public.ensure_credit_wallet(p_user_id uuid)
returns public.credit_wallets language plpgsql security definer set search_path = '' as $$
declare w public.credit_wallets;
begin
    if not exists (select 1 from auth.users where id = p_user_id and (email_confirmed_at is not null or phone_confirmed_at is not null)) then
        raise exception using message = 'CREDIT_VERIFICATION_REQUIRED', errcode = 'PT403';
    end if;
    insert into public.credit_wallets(user_id, balance_units) values (p_user_id, 300000000) on conflict do nothing returning * into w;
    if found then
        insert into public.credit_ledger(user_id, kind, delta_units, balance_after, reason) values(p_user_id,'welcome',300000000,300000000,'최초 기본 지급 30크레딧');
    end if;
    select * into w from public.credit_wallets where user_id = p_user_id for update;
    return w;
end;
$$;

create function public.reserve_credit_job(p_user_id uuid, p_request_id uuid, p_owner_token uuid, p_fingerprint text, p_operation text, p_reserve_units bigint)
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
    if (select count(*) from public.credit_jobs where user_id=p_user_id and created_at > now()-interval '5 minutes') >= 180 then raise exception using message='CREDIT_RATE_LIMIT',errcode='PT429'; end if;
    if (select count(*) from public.credit_jobs where user_id=p_user_id and status='running' and created_at > now()-interval '10 minutes') >= 6 then raise exception using message='CREDIT_BUSY',errcode='PT429'; end if;
    if w.balance_units-w.reserved_units < p_reserve_units then raise exception using message='CREDIT_INSUFFICIENT',errcode='PT402'; end if;
    update public.credit_wallets set reserved_units=reserved_units+p_reserve_units,updated_at=now() where user_id=p_user_id;
    insert into public.credit_jobs(user_id,request_id,owner_token,fingerprint,operation,status,reserved_units)
      values(p_user_id,p_request_id,p_owner_token,p_fingerprint,p_operation,'running',p_reserve_units) returning * into j;
    return jsonb_build_object('created',true,'job',to_jsonb(j));
end;
$$;

create function public.record_credit_usage(p_user_id uuid,p_request_id uuid,p_owner_token uuid,p_call_index integer,p_model text,p_response_id text,p_price_version text,p_usage jsonb,p_cost_units bigint)
returns void language plpgsql security invoker set search_path = '' as $$
declare j public.credit_jobs; u public.credit_usage;
begin
    perform 1 from public.credit_wallets where user_id=p_user_id for update;
    select * into j from public.credit_jobs where user_id=p_user_id and request_id=p_request_id for update;
    if not found or j.owner_token <> p_owner_token then raise exception using message='CREDIT_REQUEST_CONFLICT',errcode='PT409'; end if;
    select * into u from public.credit_usage where user_id=p_user_id and request_id=p_request_id and call_index=p_call_index;
    if found then
        if u.response_id <> p_response_id or u.cost_units <> p_cost_units or u.usage <> p_usage then raise exception using message='CREDIT_REQUEST_CONFLICT',errcode='PT409'; end if;
        return;
    end if;
    if j.status not in ('running','uncertain') or p_cost_units is null or p_cost_units < 0 or j.actual_units+p_cost_units > j.reserved_units then raise exception using message='CREDIT_SETTLEMENT_REQUIRED',errcode='PT409'; end if;
    insert into public.credit_usage(user_id,request_id,call_index,model,response_id,price_version,usage,cost_units)
      values(p_user_id,p_request_id,p_call_index,p_model,p_response_id,p_price_version,p_usage,p_cost_units);
    update public.credit_jobs set actual_units=actual_units+p_cost_units,updated_at=now() where user_id=p_user_id and request_id=p_request_id;
end;
$$;

create function public.finish_credit_job(p_user_id uuid,p_request_id uuid,p_owner_token uuid,p_status text,p_result jsonb default null,p_error_code text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare j public.credit_jobs; w public.credit_wallets; charge bigint;
begin
    select * into w from public.credit_wallets where user_id=p_user_id for update;
    select * into j from public.credit_jobs where user_id=p_user_id and request_id=p_request_id for update;
    if not found or j.owner_token <> p_owner_token then raise exception using message='CREDIT_REQUEST_CONFLICT',errcode='PT409'; end if;
    if j.status in ('completed','failed') then return to_jsonb(j); end if;
    if p_status='uncertain' then
        update public.credit_jobs set status='uncertain',error_code='CREDIT_SETTLEMENT_REQUIRED',updated_at=now() where user_id=p_user_id and request_id=p_request_id returning * into j;
        return to_jsonb(j);
    end if;
    if p_status not in ('completed','failed') or (p_status='completed' and (p_result is null or not exists(select 1 from public.credit_usage where user_id=p_user_id and request_id=p_request_id))) then raise exception using message='CREDIT_INVALID_REQUEST',errcode='PT400'; end if;
    charge := case when p_status='completed' then j.actual_units else 0 end;
    if charge > j.reserved_units then raise exception using message='CREDIT_SETTLEMENT_REQUIRED',errcode='PT409'; end if;
    update public.credit_wallets set balance_units=balance_units-charge,reserved_units=reserved_units-j.reserved_units,updated_at=now() where user_id=p_user_id returning * into w;
    if charge>0 then insert into public.credit_ledger(user_id,kind,delta_units,balance_after,request_id,reason) values(p_user_id,'usage',-charge,w.balance_units,p_request_id,j.operation); end if;
    update public.credit_jobs set status=p_status,charged_units=charge,result=p_result,result_expires_at=case when p_result is null then null else now()+interval '24 hours' end,error_code=p_error_code,updated_at=now() where user_id=p_user_id and request_id=p_request_id returning * into j;
    return to_jsonb(j);
end;
$$;

create function public.adjust_credit_balance(p_actor_id uuid,p_user_id uuid,p_request_id uuid,p_delta_units bigint,p_reason text)
returns public.credit_wallets language plpgsql security invoker set search_path = '' as $$
declare w public.credit_wallets; l public.credit_ledger;
begin
    if not exists(select 1 from public.credit_admins where user_id=p_actor_id) then raise exception using message='CREDIT_ADMIN_REQUIRED',errcode='PT403'; end if;
    if p_delta_units is null or p_delta_units=0 or abs(p_delta_units)>1000000000000 or length(trim(p_reason)) not between 2 and 200 then raise exception using message='CREDIT_INVALID_REQUEST',errcode='PT400'; end if;
    w := public.ensure_credit_wallet(p_user_id);
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

create function public.release_uncertain_credit_job(p_actor_id uuid,p_user_id uuid,p_request_id uuid,p_reason text)
returns void language plpgsql security invoker set search_path = '' as $$
declare j public.credit_jobs;
begin
    if not exists(select 1 from public.credit_admins where user_id=p_actor_id) then raise exception using message='CREDIT_ADMIN_REQUIRED',errcode='PT403'; end if;
    if length(trim(p_reason)) not between 2 and 200 then raise exception using message='CREDIT_INVALID_REQUEST',errcode='PT400'; end if;
    perform 1 from public.credit_wallets where user_id=p_user_id for update;
    select * into j from public.credit_jobs where user_id=p_user_id and request_id=p_request_id for update;
    if not found then raise exception using message='CREDIT_NOT_FOUND',errcode='PT404'; end if;
    if j.status in ('completed','failed') then return; end if;
    if j.created_at>now()-interval '10 minutes' then raise exception using message='CREDIT_STILL_RUNNING',errcode='PT409'; end if;
    perform public.finish_credit_job(p_user_id,p_request_id,j.owner_token,'failed',null,'ADMIN_RELEASED');
    insert into public.credit_ledger(user_id,kind,delta_units,balance_after,actor_id,reason)
      select p_user_id,'admin_grant',0,balance_units,p_actor_id,'미확정 예약 해제: '||p_reason from public.credit_wallets where user_id=p_user_id;
end;
$$;

create function public.maintain_credit_jobs()
returns void language sql security invoker set search_path = '' as $$
    update public.credit_jobs set status='uncertain',error_code='CREDIT_SETTLEMENT_REQUIRED' where status='running' and created_at<now()-interval '10 minutes';
    update public.credit_jobs set result=null where result is not null and result_expires_at<now();
$$;

create function public.admin_credit_members(p_actor_id uuid,p_query text default '',p_limit integer default 50,p_offset integer default 0)
returns table(user_id uuid,email text,full_name text,balance_units bigint,reserved_units bigint,verified boolean,is_admin boolean)
language plpgsql security definer set search_path = '' as $$
begin
    if not exists(select 1 from public.credit_admins a where a.user_id=p_actor_id) then raise exception using message='CREDIT_ADMIN_REQUIRED',errcode='PT403'; end if;
    return query select u.id,u.email,p.full_name,coalesce(w.balance_units,0),coalesce(w.reserved_units,0),
      (u.email_confirmed_at is not null or u.phone_confirmed_at is not null),exists(select 1 from public.credit_admins a where a.user_id=u.id)
      from auth.users u left join public.profiles p on p.id=u.id left join public.credit_wallets w on w.user_id=u.id
      where coalesce(p_query,'')='' or position(lower(p_query) in lower(coalesce(u.email,'')||' '||coalesce(p.full_name,'')))>0
      order by u.created_at desc,u.id limit greatest(1,least(p_limit,100)) offset greatest(0,p_offset);
end;
$$;

-- No client-side caller can supply a user ID, amount, or admin identity to these RPCs.
revoke all on function public.ensure_credit_wallet(uuid), public.reserve_credit_job(uuid,uuid,uuid,text,text,bigint), public.record_credit_usage(uuid,uuid,uuid,integer,text,text,text,jsonb,bigint), public.finish_credit_job(uuid,uuid,uuid,text,jsonb,text), public.adjust_credit_balance(uuid,uuid,uuid,bigint,text), public.release_uncertain_credit_job(uuid,uuid,uuid,text), public.maintain_credit_jobs() from public,anon,authenticated;
grant execute on function public.ensure_credit_wallet(uuid), public.reserve_credit_job(uuid,uuid,uuid,text,text,bigint), public.record_credit_usage(uuid,uuid,uuid,integer,text,text,text,jsonb,bigint), public.finish_credit_job(uuid,uuid,uuid,text,jsonb,text), public.adjust_credit_balance(uuid,uuid,uuid,bigint,text), public.release_uncertain_credit_job(uuid,uuid,uuid,text), public.maintain_credit_jobs() to service_role;
revoke all on function public.admin_credit_members(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_credit_members(uuid,text,integer,integer) to service_role;

-- Existing verified members receive exactly the same one-time grant as new members.
do $$ declare uid uuid; begin
    for uid in select id from auth.users where email_confirmed_at is not null or phone_confirmed_at is not null loop
        perform public.ensure_credit_wallet(uid);
    end loop;
end $$;
