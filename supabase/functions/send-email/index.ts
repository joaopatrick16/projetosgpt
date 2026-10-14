// Credenciais permanecem nos secrets da Edge Function, nunca no front-end.
const environment = (name: string) => Deno.env.get(name) || '';
function cors(origin: string) {
  return {'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
}
Deno.serve(async (req: Request) => {
  const allowed=environment('APP_ORIGIN'),origin=req.headers.get('origin')||'';
  const headers={...cors(allowed),'Content-Type':'application/json'};
  const result=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers});
  if(!allowed || (origin && origin!==allowed))return result(403,'Origem não autorizada.');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return result(405,'Método inválido.');
  const jwt=req.headers.get('authorization');
  if(!jwt?.startsWith('Bearer '))return result(401,'Entre na sua conta.');
  const url=environment('SUPABASE_URL'),key=environment('SUPABASE_ANON_KEY');
  const authHeaders={apikey:key,Authorization:jwt,'Content-Type':'application/json'};
  try {
    const userResponse=await fetch(`${url}/auth/v1/user`,{headers:authHeaders,signal:AbortSignal.timeout(10000)});
    if(!userResponse.ok)return result(401,'Sessão inválida.');
    const user=await userResponse.json();
    const roleResponse=await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role`,{headers:authHeaders,signal:AbortSignal.timeout(10000)});
    if(!roleResponse.ok || (await roleResponse.json())[0]?.role!=='super_admin')return result(403,'Acesso exclusivo do super admin.');
    const raw=await req.text();if(raw.length>1600000)return result(413,'Mensagem grande demais.');
    const payload=JSON.parse(raw),{recipientId,subject,message,attachment}=payload;
    if(typeof recipientId!=='string'||!/^[0-9a-f-]{36}$/i.test(recipientId)||typeof subject!=='string'||!subject.trim()||subject.length>120||/[\r\n]/.test(subject)||typeof message!=='string'||!message.trim()||message.length>5000)return result(400,'Dados inválidos.');
    if(attachment && (typeof attachment.filename!=='string'||!/^saldo-extrato-\d{4}-\d{2}\.pdf$/.test(attachment.filename)||typeof attachment.content!=='string'||attachment.content.length>1400000||!/^JVBERi0[A-Za-z0-9+/=]*$/.test(attachment.content)))return result(400,'Anexo inválido.');
    const recipientResponse=await fetch(`${url}/rest/v1/profiles?id=eq.${recipientId}&select=contact_email,email_verified`,{headers:authHeaders,signal:AbortSignal.timeout(10000)});
    if(!recipientResponse.ok)return result(400,'Destinatário indisponível.');
    const recipient=(await recipientResponse.json())[0];
    if(!recipient?.email_verified||!recipient.contact_email)return result(400,'O destinatário precisa confirmar o e-mail.');
    const token=environment('RESEND_API_KEY'),from=environment('MAIL_FROM');
    if(!token||!from)return result(503,'O serviço de e-mail ainda não foi configurado.');
    const reservation=await fetch(`${url}/rest/v1/rpc/reserve_email`,{method:'POST',headers:authHeaders,body:JSON.stringify({target_id:recipientId}),signal:AbortSignal.timeout(10000)});
    if(!reservation.ok)return result(429,'Limite de envio atingido. Aguarde antes de tentar novamente.');
    const reservationId=await reservation.json();
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','Idempotency-Key':reservationId},body:JSON.stringify({from,to:[recipient.contact_email],subject,text:message,...(attachment?{attachments:[attachment]}:{})}),signal:AbortSignal.timeout(20000)});
    if(!response.ok)return result(502,'O provedor recusou o envio. Confira o remetente e as configurações.');
    return result(200,'E-mail aceito pelo provedor.');
  } catch {return result(500,'Não foi possível enviar. Verifique a configuração e tente novamente.');}
});
