-- Configure uma vez no SQL Editor antes de ativar o e-mail.
begin;
create table if not exists public.bill_reminders(
 user_id uuid not null references public.profiles(id) on delete cascade,
 bill_id uuid not null,
 name text not null check(length(trim(name)) between 1 and 80),
 due_date date not null,
 cents bigint not null check(cents between 1 and 1000000000000),
 primary key(user_id,bill_id)
);
alter table public.bill_reminders enable row level security;
revoke all on public.bill_reminders from anon,authenticated;
grant select,insert,delete on public.bill_reminders to authenticated;
drop policy if exists reminders_own on public.bill_reminders;
create policy reminders_own on public.bill_reminders for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create table if not exists public.reminder_deliveries(
 user_id uuid not null references public.profiles(id) on delete cascade,
 day date not null,
 sent_at timestamptz not null default now(),
 primary key(user_id,day)
);
alter table public.reminder_deliveries enable row level security;
revoke all on public.reminder_deliveries from anon,authenticated;
create or replace function public.sync_bill_reminders(items jsonb) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if items is null or jsonb_typeof(items)<>'array' or jsonb_array_length(items)>1000 then raise exception 'Invalid reminder list';end if;
 delete from public.bill_reminders where user_id=auth.uid();
 insert into public.bill_reminders(user_id,bill_id,name,due_date,cents)
 select auth.uid(),x.id,x.name,x.date,x.cents
 from jsonb_to_recordset(items) as x(id uuid,name text,date date,cents bigint);
end;
$$;
revoke all on function public.sync_bill_reminders(jsonb) from public,anon;
grant execute on function public.sync_bill_reminders(jsonb) to authenticated;
commit;
