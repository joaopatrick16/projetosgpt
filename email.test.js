import test from 'node:test';
import assert from 'node:assert/strict';
const ID='11111111-1111-4111-8111-111111111111';
const environment={APP_ORIGIN:'https://example.github.io',SUPABASE_URL:'https://backend.test',SUPABASE_ANON_KEY:'anon',RESEND_API_KEY:'test-server-secret',MAIL_FROM:'Saldo <saldo@example.com>'};
let handler;
globalThis.Deno={env:{get:name=>environment[name]},serve:callback=>{handler=callback;}};
await import('./supabase/functions/send-email/index.ts');
const originalFetch=globalThis.fetch;
let role='super_admin',verified=true,rateLimited=false,deliveries=[],authValid=true;
globalThis.fetch=async(url,options={})=>{
 if(url.endsWith('/auth/v1/user'))return Response.json({id:ID},{status:authValid?200:401});
 if(url.includes('select=role'))return Response.json([{role}]);
 if(url.includes('select=contact_email'))return Response.json([{contact_email:'verified@example.com',email_verified:verified}]);
 if(url.endsWith('/rpc/reserve_email'))return Response.json(ID,{status:rateLimited?400:200});
 if(url==='https://api.resend.com/emails'){deliveries.push(JSON.parse(options.body));return Response.json({id:'provider-id'});}
 throw Error('Unexpected fetch '+url);
};
const request=(payload,extra={})=>new Request('https://backend.test/functions/v1/send-email',{method:'POST',headers:{origin:'https://example.github.io',authorization:'Bearer user-token','content-type':'application/json',...extra},body:JSON.stringify(payload)});
const message={recipientId:ID,subject:'Seu extrato',message:'Olá, segue o relatório.'};
test('envio usa destinatário confirmado do banco, não endereço arbitrário do cliente',async()=>{deliveries=[];const response=await handler(request({...message,to:'attacker@example.com'}));assert.equal(response.status,200);assert.deepEqual(deliveries[0].to,['verified@example.com']);assert.equal(deliveries[0].text,message.message);});
test('usuário comum, sessão inválida e origem estranha não enviam',async()=>{deliveries=[];role='user';assert.equal((await handler(request(message))).status,403);role='super_admin';authValid=false;assert.equal((await handler(request(message))).status,401);authValid=true;assert.equal((await handler(request(message,{origin:'https://other.test'}))).status,403);assert.equal(deliveries.length,0);});
test('e-mail sem confirmação e limite excedido bloqueiam envio',async()=>{deliveries=[];verified=false;assert.equal((await handler(request(message))).status,400);verified=true;rateLimited=true;assert.equal((await handler(request(message))).status,429);rateLimited=false;assert.equal(deliveries.length,0);});
test('falha de configuração, assunto injetado e anexo inválido são rejeitados',async()=>{deliveries=[];const secret=environment.RESEND_API_KEY;environment.RESEND_API_KEY='';assert.equal((await handler(request(message))).status,503);environment.RESEND_API_KEY=secret;assert.equal((await handler(request({...message,subject:'Subject\r\nBcc: bad@example.com'}))).status,400);assert.equal((await handler(request({...message,attachment:{filename:'malware.html',content:'bad'}}))).status,400);assert.equal(deliveries.length,0);});
test.after(()=>{globalThis.fetch=originalFetch;delete globalThis.Deno;});
