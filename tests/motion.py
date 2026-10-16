"""Interaction-only motion checks with local financial fixtures, no external accounts.
SALDO_TEST_URL=http://127.0.0.1:8100 python3 tests/motion.py
"""
import os,json,time
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('SALDO_TEST_URL','http://127.0.0.1:8000');month=time.strftime('%Y-%m')
entries=[{'id':'expense','description':'Aluguel','category':'Moradia','cents':150000,'date':month+'-01','type':'fixed','direction':'expense','recurring':False,'payment_method':'debit'}, {'id':'income','description':'Salário','category':'Outros','cents':300000,'date':month+'-01','type':'fixed','direction':'income','recurring':False,'payment_method':'transfer'}]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000},service_workers='block')
 context.route('**/config.js',lambda r:r.fulfill(content_type='application/javascript',body="export const cloudConfig={url:'',publishableKey:''};"))
 context.add_init_script('localStorage.setItem("saldo.expenses.v1",'+json.dumps(json.dumps(entries))+');')
 page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(BASE);assert page.evaluate('document.getAnimations().length')==0
 page.locator('#local-mode').click()
 page.wait_for_function('document.getAnimations().length===0')
 expect(page.locator('#total')).to_contain_text('1.500,00')
 # Action-triggered entrance, counters and graph growth.
 page.locator('.nav-item[data-view=reports]').click()
 page.wait_for_function('document.getAnimations().length===0')
 page.locator('.nav-item[data-view=dashboard]').click()
 page.wait_for_function('document.querySelector("#total[data-counting]")!==null')
 assert page.locator('#total').get_attribute('aria-label').endswith('1.500,00')
 assert page.evaluate('document.getAnimations().some(a=>a.effect.target.classList.contains("bar"))')
 assert page.evaluate('document.getAnimations().some(a=>a.effect.target.id==="category-chart")')
 page.wait_for_function('document.getAnimations().length===0 && !document.querySelector("[data-counting]")')
 expect(page.locator('#total')).to_contain_text('1.500,00')
 # The selected menu marker is independently animated, without moving labels.
 page.locator('.nav-item[data-view=reports]').click()
 assert page.evaluate('document.getAnimations().some(a=>a.effect.target.classList.contains("nav-active-indicator"))')
 page.locator('.nav-item[data-view=dashboard]').click()
 page.wait_for_function('document.getAnimations().length===0 && !document.querySelector("[data-counting]")')
 bar=page.locator('.bar[data-tooltip]').last
 assert page.locator('#chart, #chart *').evaluate_all('(els)=>els.every(el=>getComputedStyle(el).cursor==="default")')
 bar.hover();expect(page.locator('#interaction-tooltip')).to_be_visible()
 assert 'Variáveis' in page.locator('#interaction-tooltip').inner_text()
 page.keyboard.press('Escape');expect(page.locator('#interaction-tooltip')).to_be_hidden()
 bar.focus();expect(page.locator('#interaction-tooltip')).to_be_visible()
 page.locator('[data-chart=pie]').click();expect(page.locator('#chart-center')).to_be_hidden()
 page.wait_for_function('document.getAnimations().length===0')
 page.locator('[data-chart=donut]').click();expect(page.locator('#chart-center')).to_be_visible()
 page.wait_for_function('document.getAnimations().length===0')
 chart=page.locator('#category-chart');chart.scroll_into_view_if_needed();box=chart.bounding_box()
 chart.hover(position={'x':box['width']*.8,'y':box['height']*.25})
 expect(page.locator('#interaction-tooltip')).to_contain_text('Moradia')
 chart.hover(position={'x':box['width']/2,'y':box['height']/2})
 expect(page.locator('#interaction-tooltip')).to_be_hidden()
 # Fast page switching cancels old counters and always leaves exact final values.
 for view in ['reports','dashboard','settings','dashboard']:
  page.locator(f'.nav-item[data-view={view}]').click()
 page.wait_for_function('document.getAnimations().length===0 && !document.querySelector("[data-counting]")')
 expect(page.locator('#total')).to_contain_text('1.500,00');expect(page.locator('#income')).to_contain_text('3.000,00')
 assert page.locator('.interaction-ripple').count()==0
 # Reducing motion halfway through finishes counters instead of leaving partial money.
 page.locator('.nav-item[data-view=reports]').click();page.locator('.nav-item[data-view=dashboard]').click()
 page.emulate_media(reduced_motion='reduce')
 page.wait_for_function('document.getAnimations().length===0 && !document.querySelector("[data-counting]")')
 expect(page.locator('#total')).to_contain_text('1.500,00')
 page.locator('.nav-item[data-view=reports]').click();assert page.evaluate('document.getAnimations().length')==0
 page.locator('.nav-item[data-view=dashboard]').click();assert page.evaluate('document.getAnimations().length')==0
 # Touch/keyboard tooltips remain available when motion is disabled.
 page.set_viewport_size({'width':390,'height':844})
 page.locator('.bar[data-tooltip]').last.click()
 expect(page.locator('#interaction-tooltip')).to_be_visible()
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 print('PASS: entrada sequencial, contagem exata, barras e rosca animadas, menu deslizante, dicas por cursor/teclado, interrupções rápidas, limpeza em repouso e movimento reduzido.')
 context.close();browser.close()
