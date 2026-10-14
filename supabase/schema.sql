-- Execute no SQL Editor do seu projeto Supabase. Não coloque senhas neste arquivo.
begin;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Usuário' check(length(trim(display_name)) between 1 and 80),
 avatar_path text,
 role text not null default 'user' check(role in ('user','super_admin')),
 created_at timestamptz not null default now(),
 constraint own_avatar check (avatar_path is null or avatar_path = id::text || '/avatar.jpg')
);
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;
create or replace function public.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id, display_name) values(new.id, coalesce(nullif(left(trim(new.raw_user_meta_data->>'display_name'),80),''),'Usuário'));
 return new;
end;
$$;
revoke all on function public.create_profile() from public;
drop trigger if exists saldo_create_profile on auth.users;
create trigger saldo_create_profile after insert on auth.users for each row execute function public.create_profile();
insert into public.profiles(id,display_name)
select id,coalesce(nullif(left(trim(raw_user_meta_data->>'display_name'),80),''),'Usuário') from auth.users on conflict(id) do nothing;
-- E-mail sincronizado pelo serviço de autenticação, nunca editável por REST.
alter table public.profiles add column if not exists contact_email text;
alter table public.profiles add column if not exists email_verified boolean not null default false;
create or replace function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 update public.profiles set contact_email=new.email,email_verified=(new.email_confirmed_at is not null) where id=new.id;
 return new;
end;
$$;
revoke all on function public.sync_profile_email() from public;
drop trigger if exists saldo_sync_email on auth.users;
create trigger saldo_sync_email after insert or update of email,email_confirmed_at on auth.users for each row execute function public.sync_profile_email();
update public.profiles p set contact_email=u.email,email_verified=(u.email_confirmed_at is not null) from auth.users u where p.id=u.id;
create table if not exists public.categories (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 80),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create unique index if not exists categories_name_unique on public.categories(lower(trim(name)));
insert into public.categories(name) values('Moradia'),('Alimentação'),('Transporte'),('Saúde'),('Lazer'),('Educação'),('Assinaturas'),('Outros') on conflict do nothing;
create table if not exists public.app_settings (
 id integer primary key default 1 check(id = 1),
 app_name text not null default 'Saldo' check(length(trim(app_name)) between 1 and 32),
 accent text not null default '#91b2ff' check(accent ~ '^#[0-9A-Fa-f]{6}$')
);
insert into public.app_settings(id) values(1) on conflict do nothing;
create table if not exists public.transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 description text not null check(length(trim(description)) between 1 and 80),
 cents bigint not null check(cents between 1 and 1000000000000),
 date date not null,
 type text not null check(type in ('fixed','variable')),
 recurring boolean not null default false check(not recurring or type='fixed'),
 direction text not null default 'expense' check(direction in ('expense','income')),
 payment_method text not null default 'debit' check(payment_method in ('credit','debit','cash','transfer')),
 category_id uuid references public.categories(id) on delete set null,
 category_label text not null default 'Outros' check(length(trim(category_label)) between 1 and 80),
 created_at timestamptz not null default now()
);
create index if not exists transactions_user_date on public.transactions(user_id,date desc);
create index if not exists transactions_date on public.transactions(date desc);
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.app_settings enable row level security;
alter table public.transactions enable row level security;
-- Revogação explícita: o usuário jamais pode editar sua própria função administrativa.
revoke all on public.profiles,public.categories,public.app_settings,public.transactions from anon,authenticated;
grant select on public.profiles to authenticated;
grant update(display_name,avatar_path) on public.profiles to authenticated;
grant select,insert,update,delete on public.categories to authenticated;
grant select,update on public.app_settings to authenticated;
grant select,insert,update,delete on public.transactions to authenticated;
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_super_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to authenticated using(true);
drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select to authenticated using(true);
drop policy if exists settings_admin on public.app_settings;
create policy settings_admin on public.app_settings for update to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
drop policy if exists transactions_read on public.transactions;
create policy transactions_read on public.transactions for select to authenticated using(user_id=auth.uid() or public.is_super_admin());
drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions for insert to authenticated with check(user_id=auth.uid());
drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions for delete to authenticated using(user_id=auth.uid());
-- Fotos privadas: somente o dono e o super admin podem lê-las.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',false,524288,array['image/jpeg']) on conflict(id) do update set public=false,file_size_limit=524288,allowed_mime_types=array['image/jpeg'];
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select to authenticated using(bucket_id='avatars' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_super_admin()));
drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and name=auth.uid()::text||'/avatar.jpg');
drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update to authenticated using(bucket_id='avatars' and name=auth.uid()::text||'/avatar.jpg') with check(bucket_id='avatars' and name=auth.uid()::text||'/avatar.jpg');
drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and name=auth.uid()::text||'/avatar.jpg');
-- Reserva de envio: limite global de 20 por hora e de um por destinatário/minuto.
create table if not exists public.email_dispatches (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 sender_id uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
alter table public.email_dispatches enable row level security;
revoke all on public.email_dispatches from anon,authenticated;
create or replace function public.reserve_email(target_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare dispatch_id uuid;
begin
 if not public.is_super_admin() then raise exception 'Acesso restrito'; end if;
 perform pg_advisory_xact_lock(736251);
 if not exists(select 1 from public.profiles where id=target_id and email_verified and contact_email is not null) then raise exception 'E-mail não confirmado'; end if;
 if exists(select 1 from public.email_dispatches where recipient_id=target_id and created_at>now()-interval '1 minute') then raise exception 'Aguarde um minuto para reenviar'; end if;
 if (select count(*) from public.email_dispatches where created_at>now()-interval '1 hour')>=20 then raise exception 'Limite de envios atingido'; end if;
 delete from public.email_dispatches where created_at<now()-interval '30 days';
 insert into public.email_dispatches(recipient_id,sender_id) values(target_id,auth.uid()) returning id into dispatch_id;
 return dispatch_id;
end;
$$;
revoke all on function public.reserve_email(uuid) from public;
grant execute on function public.reserve_email(uuid) to authenticated;
commit;
-- Depois de criar sua conta no app, execute SEPARADAMENTE com seu e-mail:
-- update public.profiles set role='super_admin'
-- where id=(select id from auth.users where email='SEU_EMAIL');
