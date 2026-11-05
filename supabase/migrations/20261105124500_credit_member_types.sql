-- Supabase auth.users.email is varchar; return the declared text columns explicitly.
create or replace function public.admin_credit_members(p_actor_id uuid,p_query text default '',p_limit integer default 50,p_offset integer default 0)
returns table(user_id uuid,email text,full_name text,balance_units bigint,reserved_units bigint,verified boolean,is_admin boolean)
language plpgsql security definer set search_path = '' as $$
begin
    if not exists(select 1 from public.credit_admins a where a.user_id=p_actor_id) then raise exception using message='CREDIT_ADMIN_REQUIRED',errcode='PT403'; end if;
    return query select u.id,u.email::text,p.full_name::text,coalesce(w.balance_units,0),coalesce(w.reserved_units,0),
      (u.email_confirmed_at is not null or u.phone_confirmed_at is not null),exists(select 1 from public.credit_admins a where a.user_id=u.id)
      from auth.users u left join public.profiles p on p.id=u.id left join public.credit_wallets w on w.user_id=u.id
      where coalesce(p_query,'')='' or position(lower(p_query) in lower(coalesce(u.email,'')||' '||coalesce(p.full_name,'')))>0
      order by u.created_at desc,u.id limit greatest(1,least(p_limit,100)) offset greatest(0,p_offset);
end;
$$;
