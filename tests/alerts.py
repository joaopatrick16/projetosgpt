"""Alert center, permission, calendar and shortcuts; no messages sent."""
import json,os,datetime
from playwright.sync_api import sync_playwright,expect
now=datetime.date.today();today=now.isoformat()
data={'version':1,'budgets':[],'goals':[],'bills':[{'id':'one','name':'Conta hoje','date':today,'cents':10000,'paid':False},{'id':'two','name':'Conta futura','date':(now+datetime.timedelta(days=3)).isoformat(),'cents':5000,'paid':False}]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844},service_workers='block')
 ctx.route('**/config.js',lambda r:r.fulfill(content_type='application/javascript',body="export const cloudConfig={url:'',publishableKey:''};"))
 ctx.add_init_script('localStorage.setItem("serimora.planning.v1.local",'+json.dumps(json.dumps(data))+');window.notified=[];window.Notification=class {static permission="granted";static requestPermission(){return Promise.resolve("granted")}constructor(title,options){window.notified.push({title,options})}};')
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(os.environ.get('SALDO_TEST_URL','http://127.0.0.1:8110'));page.locator('#local-mode').click();expect(page.locator('#alerts-count')).to_have_text('2');expect(page.locator('#next-step-title')).to_have_text('Há contas vencendo hoje');assert page.locator('#quick-pdf').count()==0;assert page.locator('#view-description').count()==0
 page.locator('#alerts-open').click();expect(page.locator('#alerts-list')).to_contain_text('Conta hoje');page.locator('#alerts-device').click();expect(page.locator('#alerts-device')).to_contain_text('Desativar');assert page.evaluate('window.notified.length')==1
 page.evaluate("document.dispatchEvent(new Event('visibilitychange'))");assert page.evaluate('window.notified.length')==1
 with page.expect_download() as download:page.locator('#alerts-calendar').click()
 assert download.value.suggested_filename.endswith('.ics');content=open(download.value.path()).read();assert 'BEGIN:VALARM' in content
 page.locator('#alerts-email').click();expect(page.locator('#alerts-status')).to_contain_text('Entre na sua conta')
 page.locator('#alerts-planning').click();expect(page.locator('#planning')).to_be_visible();page.on('dialog',lambda d:d.accept());page.locator('#bill-list .planning-item').filter(has_text='Conta hoje').get_by_role('button',name='Marcar como paga').click();expect(page.locator('#alerts-count')).to_have_text('1')
 page.locator('#mobile-menu-toggle').click();page.locator('#nav-assistant').click();expect(page.locator('#assistant-dialog')).to_be_visible();page.locator('#assistant-close').click();page.locator('#mobile-menu-toggle').click();page.locator('#nav-transactions').click();expect(page.locator('#reports')).to_be_visible()
 for width in [320,390,856,1440]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
 assert not errors,errors
 print('PASS: alertas reais de vencimento, sininho, baixa remove alerta, notificação com permissão e sem repetição, calendário, atalhos e larguras 320–1440.')
 b.close()
