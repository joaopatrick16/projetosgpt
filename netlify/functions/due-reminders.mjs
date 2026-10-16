import {cloudConfig} from '../../config.js';
export async function sendDueReminders(env,request=fetch,now=new Date()){
 const {SUPABASE_SERVICE_ROLE_KEY:key,RESEND_API_KEY:mailKey,MAIL_FROM:from}=env,url=env.SUPABASE_URL||cloudConfig.url;
 if(!key||!mailKey||!from)throw Error('Configure as credenciais privadas de e-mail no Netlify.');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+3);
 const headers={apikey:key,Authorization:`Bearer ${key}`},call=(url,options={})=>request(url,{...options,signal:AbortSignal.timeout(8000)});
 const check=async(response,label)=>{if(!response.ok)throw Error(`${label}: HTTP ${response.status}`);return response;};
 const groups=new Map();
 for(let offset=0;;offset+=500){const response=await check(await call(`${url}/rest/v1/bill_reminders?select=*,profiles(contact_email,email_verified)&due_date=gte.${today}&due_date=lte.${end.toISOString().slice(0,10)}&order=user_id.asc,bill_id.asc&limit=500&offset=${offset}`,{headers}),'Leitura dos lembretes');const rows=await response.json();for(const row of rows){const days=Math.round((Date.parse(row.due_date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);if((days!==0&&days!==3)||!row.profiles?.email_verified||!row.profiles.contact_email)continue;const group=groups.get(row.user_id)||[];group.push(row);groups.set(row.user_id,group);}if(rows.length<500)break;}
 let sent=0,failed=0;
 for(const [user,rows] of groups){try{const logged=await check(await call(`${url}/rest/v1/reminder_deliveries?user_id=eq.${user}&day=eq.${today}&select=user_id`,{headers}),'Consulta de entrega');if((await logged.json()).length)continue;
 const money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100);
 const response=await call('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${mailKey}`,'Content-Type':'application/json','Idempotency-Key':`serimora-due-${user}-${today}`},body:JSON.stringify({from,to:[rows[0].profiles.contact_email],subject:'Serimora · Lembretes de vencimento',text:'Confira suas contas:\n\n'+rows.map(r=>`${r.name} · ${money(Number(r.cents))} · ${r.due_date.split('-').reverse().join('/')} · ${r.due_date===today?'vence hoje':'vence em 3 dias'}`).join('\n')+'\n\nAbra o Serimora para marcar as contas pagas ou desativar os avisos no sininho. Estes avisos seguem as contas que você sincronizou.'})});await check(response,'Envio');await check(await call(`${url}/rest/v1/reminder_deliveries`,{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates'},body:JSON.stringify({user_id:user,day:today})}),'Registro da entrega');sent++;
 }catch{failed++;}}
 if(failed)throw Error(`${failed} destinatário(s) com falha; ${sent} envio(s) aceito(s). Consulte o provedor e tente novamente.`);return {sent};
}
export const handler=async()=>{try{const result=await sendDueReminders(process.env);return {statusCode:200,body:JSON.stringify(result)};}catch(error){console.error('Lembretes:',error.message);return {statusCode:500,body:'Falha nos lembretes; consulte os logs.'};}};
