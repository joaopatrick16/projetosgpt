-- Execute uma vez no SQL Editor antes de ativar a função no Netlify.
-- Bucket privado, sem políticas para usuários do app: acesso só pelo servidor.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('weekly-backups','weekly-backups',false,20971520,array['application/json'])
on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=array['application/json'];
