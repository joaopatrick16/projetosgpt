"""Responsive navigation/chart checks against local fixtures. No real accounts or emails.
SALDO_TEST_URL=http://127.0.0.1:8030 python3 tests/navigation.py
"""
import os,json,time
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('SALDO_TEST_URL','http://127.0.0.1:8000')
month=time.strftime('%Y-%m')
entries=[]
y,m=map(int,month.split('-'))
for i in range(6):
 absolute=y*12+m-1-i;yy,mm=divmod(absolute,12);date=f'{yy:04d}-{mm+1:02d}-05'
 for j,(category,cents,kind) in enumerate([('Moradia',150000+i*1200,'fixed'),('Alimentação',75000+i*2500,'variable'),('Transporte',35000+i*1000,'variable'),('Lazer',25000+i*2000,'variable')]):
  entries.append({'id':f'{i}-{j}','description':category,'date':date,'cents':cents,'type':kind,'category':category,'recurring':False,'direction':'expense','payment_method':'credit' if j==1 else 'debit'})
 entries.append({'id':f'{i}-income','description':'Salário','date':date,'cents':450000,'type':'fixed','category':'Outros','recurring':False,'direction':'income','payment_method':'transfer'})
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1080},service_workers='block',locale='pt-BR')
 context.route('**/config.js',lambda r:r.fulfill(content_type='application/javascript',body="export const cloudConfig={url:'',publishableKey:''};"))
 context.add_init_script('if(!localStorage.getItem("saldo.expenses.v1")) localStorage.setItem("saldo.expenses.v1",'+json.dumps(json.dumps(entries))+');')
 page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(BASE);page.locator('#local-mode').click();page.evaluate('document.fonts.ready')
 expect(page.locator('#page-title')).to_have_text('Dashboard')
 assert page.locator('#chart .bar').count()==12
 assert 'Moradia' in page.locator('#category-chart').get_attribute('aria-label')
 expect(page.locator('#chart-center')).to_be_visible()
 page.screenshot(path='/tmp/saldo-dashboard-desktop.png',full_page=True)
 expect(page.locator('#back-navigation')).to_be_hidden()
 page.locator('.nav-item[data-view=reports]').click()
 expect(page.locator('#back-button')).to_have_attribute('aria-label','Voltar para Dashboard')
 page.locator('.nav-item[data-view=settings]').click()
 expect(page.locator('#back-button')).to_have_attribute('aria-label','Voltar para Relatórios')
 page.locator('#back-button').click();expect(page.locator('#reports')).to_be_visible()
 page.locator('#back-button').click();expect(page.locator('#dashboard')).to_be_visible()
 expect(page.locator('#back-navigation')).to_be_hidden()
 page.locator('.nav-item[data-view=dashboard]').click()
 expect(page.locator('#back-navigation')).to_be_hidden()
 original_width=page.locator('.sidebar').bounding_box()['width']
 page.locator('#menu-toggle').click()
 expect(page.locator('#menu-toggle')).to_have_attribute('aria-expanded','false')
 assert page.locator('.sidebar').bounding_box()['width']<original_width
 page.locator('.nav-item[data-view=reports]').click()
 expect(page.locator('#reports')).to_be_visible()
 assert page.locator('#report-comparison tr').count()==6
 assert page.locator('#report-category-bars .progress-track').count()==4
 page.locator('[data-report-view=categories][data-mode=stacked]').click()
 expect(page.locator('#report-category-bars')).to_be_hidden()
 assert page.locator('#report-categories-stacked .stacked-segment').count()==4
 widths=page.locator('#report-categories-stacked .stacked-segment').evaluate_all('(els)=>els.map(el=>parseFloat(el.style.width))')
 assert abs(sum(widths)-100)<0.001
 assert abs(widths[0]-150000/285000*100)<0.001
 expect(page.locator('#report-payments')).to_be_visible()
 page.locator('[data-report-view=payments][data-mode=stacked]').click()
 assert page.locator('#report-payments-stacked .stacked-segment').count()==2
 page.reload();page.locator('#local-mode').click()
 expect(page.locator('#menu-toggle')).to_have_attribute('aria-expanded','false')
 page.locator('.nav-item[data-view=reports]').click()
 expect(page.locator('[data-report-view=categories][data-mode=stacked]')).to_have_attribute('aria-pressed','true')
 expect(page.locator('#report-payments-stacked')).to_be_visible()
 page.locator('[data-report-view=categories][data-mode=indicators]').click()
 expect(page.locator('#report-category-bars')).to_be_visible()
 page.locator('#back-button').click()
 page.locator('#menu-toggle').click()
 page.locator('[data-chart=pie]').click()
 expect(page.locator('#chart-center')).to_be_hidden()
 page.reload();page.locator('#local-mode').click()
 expect(page.locator('[data-chart=pie]')).to_have_attribute('aria-pressed','true')
 page.locator('[data-chart=donut]').click()
 page.set_viewport_size({'width':390,'height':844})
 expect(page.locator('#mobile-menu-toggle')).to_be_visible()
 assert page.locator('#app-sidebar').evaluate('(el)=>el.inert')
 page.locator('#mobile-menu-toggle').click()
 assert page.locator('.app-content').evaluate('(el)=>el.inert')
 assert page.locator('#menu-toggle').evaluate('(el)=>el===document.activeElement')
 page.keyboard.press('Shift+Tab')
 assert page.locator('#open-login').evaluate('(el)=>el===document.activeElement')
 page.keyboard.press('Escape')
 assert not page.locator('.app-content').evaluate('(el)=>el.inert')
 expect(page.locator('#mobile-menu-toggle')).to_be_focused()
 page.locator('#mobile-menu-toggle').click()
 page.locator('#sidebar-backdrop').click(position={'x':375,'y':400})
 expect(page.locator('#mobile-menu-toggle')).to_have_attribute('aria-expanded','false')
 page.locator('#mobile-menu-toggle').click()
 page.locator('.nav-item[data-view=export]').click()
 expect(page.locator('#export')).to_be_visible()
 assert page.locator('#back-button').is_visible()
 assert page.locator('#back-button').bounding_box()['height']>=44
 expect(page.locator('#mobile-menu-toggle')).to_have_attribute('aria-expanded','false')
 with page.expect_download() as download:page.locator('#pdf').click()
 assert download.value.suggested_filename.endswith('.pdf')
 page.locator('#mobile-menu-toggle').click();page.locator('.nav-item[data-view=dashboard]').click()
 page.wait_for_function('document.getAnimations().length===0')
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 assert page.locator('.metric-card strong').evaluate_all('(els)=>els.every(el=>el.scrollWidth<=el.clientWidth+1)')
 page.screenshot(path='/tmp/saldo-dashboard-mobile.png',full_page=True)
 for width in [320,768,1024,1280]:
  page.set_viewport_size({'width':width,'height':900})
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),width
 page.emulate_media(reduced_motion='reduce')
 page.set_viewport_size({'width':1440,'height':1080})
 page.locator('#menu-toggle').click()
 assert page.evaluate('document.getAnimations().length')==0
 assert not errors,errors
 print('PASS: menu recolhível e persistente; gaveta mobile, foco e Esc; abas reais; pizza/rosca persistente; barras proporcionais; PDF; larguras 320/390/768/1024/1280/1440; movimento reduzido.')
 context.close();browser.close()
