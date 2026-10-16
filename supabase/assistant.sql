-- Execute uma vez no SQL Editor. Limite persistente e individual, em dias UTC.
begin;
create table if not exists public.assistant_usage(
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null default (now() at time zone 'UTC')::date,
 requests integer not null default 1 check(requests between 1 and 20),
 primary key(user_id,day)
);
alter table public.assistant_usage enable row level security;
revoke all on public.assistant_usage from anon,authenticated;
create or replace function public.reserve_assistant() returns boolean
language plpgsql security definer set search_path='' as $$
declare reserved integer;
begin
 if auth.uid() is null then return false; end if;
 insert into public.assistant_usage(user_id,day,requests)
 values(auth.uid(),(now() at time zone 'UTC')::date,1)
 on conflict(user_id,day) do update set requests=public.assistant_usage.requests+1
 where public.assistant_usage.requests<20 returning requests into reserved;
 return reserved is not null;
end;
$$;
revoke all on function public.reserve_assistant() from public,anon;
grant execute on function public.reserve_assistant() to authenticated;
commit;
