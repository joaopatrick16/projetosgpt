// Server-side only. Never copy these credentials into config.js or dist/.
const RECIPIENT='joaopatrick1608@gmail.com';
const TABLES=['profiles','transactions','categories','app_settings'];
export async function runBackup(env,request=fetch,now=new Date()) {
 const {SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:key,RESEND_API_KEY:mailKey,MAIL_FROM:from}=env;
 if(!url||!key||!mailKey||!from)throw Error('Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY e MAIL_FROM no Netlify.');
 const headers={apikey:key,Authorization:`Bearer ${key}`};
 const call=(path,options={})=>request(path,{...options,signal:AbortSignal.timeout(8000)});
 const check=async(response,operation)=>{if(!response.ok)throw Error(`${operation}: HTTP ${response.status}`);return response;};
 // One immutable snapshot per UTC day. A retry uses the saved file, not newer data.
 const day=now.toISOString().slice(0,10),path=`weekly/${day}.json`,storage=`${url}/storage/v1/object/weekly-backups/${path}`;
 const existing=await call(storage,{headers});
 let snapshot;
 if(existing.ok){snapshot=await existing.json();if(snapshot.format!=='serimora-cloud-backup'||snapshot.version!==1)throw Error('Formato de backup existente inválido.');}
 else {
  if(existing.status!==404)throw Error(`Consulta do backup: HTTP ${existing.status}`);
  const tables={};
  for(const table of TABLES){tables[table]=[];for(let offset=0;;offset+=1000){
   const response=await check(await call(`${url}/rest/v1/${table}?select=*&order=id.asc&limit=1000&offset=${offset}`,{headers}),'Leitura '+table);
   const rows=await response.json();if(!Array.isArray(rows))throw Error('Resposta de dados inválida.');tables[table].push(...rows);if(rows.length<1000)break;
  }}
  snapshot={format:'serimora-cloud-backup',version:1,created_at:now.toISOString(),scope:'all_users',tables};
  const body=JSON.stringify(snapshot);
  if(new TextEncoder().encode(body).length>20*1024*1024)throw Error('Backup excede 20 MB; configure uma rotina para volumes maiores.');
  const upload=await call(storage,{method:'POST',headers:{...headers,'Content-Type':'application/json','x-upsert':'false'},body});
  // Another execution may already have written this day's immutable snapshot.
  if(upload.status===409){const saved=await check(await call(storage,{headers}),'Recuperação do backup');snapshot=await saved.json();}
  else await check(upload,'Gravação do backup');
 }
 const counts=TABLES.map(table=>`${table}: ${snapshot.tables[table].length}`).join('\n');
 const response=await call('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${mailKey}`,'Content-Type':'application/json','Idempotency-Key':`serimora-weekly-backup-${day}`},body:JSON.stringify({from,to:[RECIPIENT],subject:`Serimora · Backup semanal concluído · ${day}`,text:`Backup de todos os usuários salvo no armazenamento privado do Supabase.\n\nArquivo: weekly-backups/${path}\nCriado em: ${snapshot.created_at}\n${counts}\n\nO arquivo inclui perfis, lançamentos, categorias e configurações. Não inclui senhas, sessões, fotos ou arquivos de autenticação. Acesse o painel Supabase > Storage > weekly-backups para baixar. Os dados financeiros não são anexados a este e-mail.`})});
 await check(response,'Notificação por e-mail');
 return {path,counts};
}
export async function handler(){try{await runBackup(process.env);return {statusCode:200,body:'Backup salvo e notificação aceita pelo provedor.'};}catch(error){console.error('Falha no backup semanal:',error.message);return {statusCode:500,body:'Backup ou notificação falhou. Consulte os logs da função.'};}}
