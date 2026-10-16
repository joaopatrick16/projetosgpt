"""Remember-me integration with simulated auth, never real credentials.
SALDO_TEST_URL=http://127.0.0.1:8090 python3 tests/remember.py
"""
import os,json,time
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('SALDO_TEST_URL','http://127.0.0.1:8000')
UID='11111111-1111-4111-8111-111111111111';EMAIL='remember@example.com'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},service_workers='block')
 context.route('**/config.js',lambda r:r.fulfill(content_type='application/javascript',body="export const cloudConfig={url:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'};"))
 refreshes=[0]
 def mock(route):
  req=route.request;url=urlsplit(req.url);query=parse_qs(url.query);path=url.path
  if path.endswith('/token'):
   if query.get('grant_type')==['refresh_token']:refreshes[0]+=1
   data={'access_token':UID,'refresh_token':'fixture-refresh-'+str(refreshes[0]),'expires_in':3600,'user':{'id':UID,'email':EMAIL}}
  elif path=='/auth/v1/user':data={'id':UID,'email':EMAIL}
  elif path.endswith('/profiles'):data=[{'id':UID,'display_name':'Maria Teste','role':'user','avatar_path':None,'contact_email':EMAIL,'email_verified':True}]
  elif path.endswith('/categories'):data=[{'id':'22222222-2222-4222-8222-222222222222','name':'Moradia','active':True}]
  elif path.endswith('/transactions'):data=[]
  elif path.endswith('/app_settings'):data=[{'id':1,'app_name':'Saldo','accent':'#7bbde8'}]
  elif path=='/auth/v1/logout':data={}
  else:raise AssertionError(path)
  route.fulfill(content_type='application/json',body=json.dumps(data))
 context.route('https://fixture.supabase.co/**',mock)
 errors=[]
 def new_page():
  page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)));page.goto(BASE);return page
 page=new_page()
 assert page.locator('#email').get_attribute('autocomplete')=='username'
 assert page.locator('#password').get_attribute('autocomplete')=='current-password'
 assert page.locator('#auth-form').get_attribute('method')=='post'
 assert not page.locator('#remember-user').is_checked()
 page.locator('#email').fill(EMAIL);page.locator('#password').fill('fixture-long-password')
 page.locator('#remember-user').check();page.locator('#auth-submit').click()
 expect(page.locator('#workspace')).to_be_visible()
 page.get_by_text('Dados sincronizados',exact=True).wait_for()
 assert not page.evaluate('JSON.stringify(localStorage)').__contains__('fixture-long-password')
 # Browser restarts restore localStorage, but do not restore sessionStorage.
 restarted=browser.new_context(storage_state=context.storage_state(),service_workers='block')
 restarted.route('**/config.js',lambda r:r.fulfill(content_type='application/javascript',body="export const cloudConfig={url:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'};"))
 restarted.route('https://fixture.supabase.co/**',mock)
 restart_page=restarted.new_page();restart_page.goto(BASE);expect(restart_page.locator('#workspace')).to_be_visible();restarted.close()
 reopened=new_page();expect(reopened.locator('#workspace')).to_be_visible();reopened.get_by_text('Dados sincronizados',exact=True).wait_for()
 assert reopened.locator('#email').input_value()==EMAIL
 # Concurrent tabs coordinate refresh with Web Locks.
 page.evaluate('''()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('saldo.session.v1:')&&!k.endsWith(':remembered-user'));const s=JSON.parse(localStorage.getItem(key));s.expires_at=0;localStorage.setItem(key,JSON.stringify(s));}''')
 other=context.new_page();other.on('pageerror',lambda error:errors.append(str(error)))
 first=context.new_page();first.on('pageerror',lambda error:errors.append(str(error)))
 other.goto(BASE,wait_until='domcontentloaded');first.goto(BASE,wait_until='domcontentloaded')
 expect(other.locator('#workspace')).to_be_visible();expect(first.locator('#workspace')).to_be_visible()
 assert refreshes[0]==1
 # Sign-out in one remembered tab also clears the other tabs' views.
 reopened.locator('#mobile-menu-toggle').click();reopened.locator('#logout').click()
 expect(reopened.locator('#auth-screen')).to_be_visible();expect(page.locator('#auth-screen')).to_be_visible();expect(other.locator('#auth-screen')).to_be_visible()
 expect(page.locator('#workspace')).to_be_hidden()
 assert reopened.locator('#email').input_value()==EMAIL
 # A new visit retains the e-mail only, never an authenticated session after logout.
 signedout=new_page();expect(signedout.locator('#auth-screen')).to_be_visible();assert signedout.locator('#email').input_value()==EMAIL
 signedout.locator('#remember-user').uncheck();signedout.locator('#password').fill('fixture-long-password');signedout.locator('#auth-submit').click();expect(signedout.locator('#workspace')).to_be_visible()
 temporary=new_page();expect(temporary.locator('#auth-screen')).to_be_visible();assert temporary.locator('#email').input_value()==''
 assert not temporary.locator('#remember-user').is_checked()
 assert not errors,errors
 print('PASS: nova aba restaura sessão lembrada, renovação compartilhada única, logout limpa outras abas, e-mail lembrado sem senha, modo temporário isolado, atributos de preenchimento automático.')
 context.close();browser.close()
