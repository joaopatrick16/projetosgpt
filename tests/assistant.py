"""Review-first assistant flow; mock AI and auth, no real API usage."""
import json,os
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
ID='11111111-1111-4111-8111-111111111111'
CAT='44444444-4444-4444-8444-444444444444'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844},service_workers='block')
 ctx.route('**/config.js',lambda r:r.fulfill(content_type='application/javascript',body="export const cloudConfig={url:'https://backend.test',publishableKey:'public-key'};"))
 rows=[];requests=[]
 def backend(route):
  req=route.request;path=urlsplit(req.url).path
  if path.endswith('/token'):data={'access_token':'user-token','refresh_token':'refresh','expires_in':3600,'user':{'id':ID,'email':'admin@example.com'}}
  elif path.endswith('/profiles'):data=[{'id':ID,'display_name':'Admin','role':'super_admin','avatar_path':None,'contact_email':'admin@example.com','email_verified':True}]
  elif path.endswith('/transactions'):
   if req.method=='POST':rows.extend(req.post_data_json);data=None
   else:data=rows
  elif path.endswith('/categories'):data=[{'id':CAT,'name':'Alimentação','active':True}]
  elif path.endswith('/app_settings'):data=[{'id':1,'app_name':'Serimora','accent':'#7bbde8'}]
  else:data={}
  route.fulfill(content_type='application/json',body=json.dumps(data) if data is not None else '',status=200 if data is not None else 204)
 ctx.route('https://backend.test/**',backend)
 def ai(route):
  requests.append(route.request.post_data_json)
  assert route.request.headers['authorization']=='Bearer user-token'
  route.fulfill(content_type='application/json',body=json.dumps({'draft':{'description':'Mercado','cents':10000,'date':'2026-10-15','category':'Alimentação','direction':'expense','payment_method':None,'installments':3,'notes':'Informe a forma de pagamento.'}}))
 ctx.route('**/.netlify/functions/assistant',ai)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('SALDO_TEST_URL','http://127.0.0.1:8110'));page.locator('#email').fill('admin@example.com');page.locator('#password').fill('password123');page.locator('#auth-submit').click();expect(page.locator('#workspace')).to_be_visible();page.locator('#admin-scope').select_option('all')
 page.locator('#assistant-open').click();page.locator('#assistant-text').fill('Mercado 100 reais hoje em 3 vezes');page.locator('#assistant-interpret').click();expect(page.locator('#assistant-review')).to_be_visible();assert not rows
 page.locator('#assistant-confirm').click();assert not rows
 page.locator('#assistant-cancel').click();assert not rows
 page.locator('#assistant-open').click();page.locator('#assistant-text').fill('Mercado 100 reais hoje em 3 vezes');page.locator('#assistant-interpret').click();expect(page.locator('#assistant-review')).to_be_visible();page.locator('#ai-payment').select_option('debit');page.locator('#ai-description').fill('Mercado revisado');page.locator('#assistant-confirm').click();expect(page.locator('#assistant-status')).to_contain_text('3 parcelas salvas');assert len(rows)==3;assert sum(r['cents'] for r in rows)==10000;assert all(r['user_id']==ID for r in rows);assert len(set(r['id'] for r in rows))==3
 assert page.locator('#assistant-dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
 page.locator('#assistant-close').click();page.locator('#assistant-open').click();expect(page.locator('#assistant-review')).to_be_hidden();page.locator('#assistant-demo').click();expect(page.locator('#assistant-source')).to_have_text('Demonstração sem IA');assert len(rows)==3
 page.evaluate("dispatchEvent(new Event('saldo:session-changed'))");expect(page.locator('#assistant-dialog')).not_to_be_visible();expect(page.locator('#auth-screen')).to_be_visible();assert len(rows)==3;assert not errors,errors
 print('PASS: revisão editável, pagamento obrigatório, cancelar não grava, parcelas por confirmação, escopo próprio do admin e limpeza na saída.')
 b.close()
