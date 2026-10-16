"""Local pilot flow: no real accounts or emails."""
import os
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},service_workers='block')
 page.route('**/config.js',lambda r:r.fulfill(content_type='application/javascript',body="export const cloudConfig={url:'',publishableKey:''};"))
 page.on('dialog',lambda d:d.accept('25,00') if d.type=='prompt' else d.accept())
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('SALDO_TEST_URL','http://127.0.0.1:8110'));page.locator('#local-mode').click()
 def navigate(view):
  page.locator('#mobile-menu-toggle').click();page.locator(f'.nav-item[data-view={view}]').click()
 navigate('planning')
 page.locator('.planning-tabs [data-planning-view=budget]').click()
 page.locator('#budget-category').select_option(label='Alimentação');page.locator('#budget-amount').fill('100');page.locator('#budget-form button').click();expect(page.locator('#budget-list')).to_contain_text('100,00')
 page.locator('.planning-tabs [data-planning-view=bill]').click()
 page.locator('#bill-name').fill('Conta teste');page.locator('#bill-amount').fill('30');page.locator('#bill-date').fill('2026-10-15');page.locator('#bill-form button').click();page.get_by_role('button',name='Marcar como paga',exact=True).click();expect(page.locator('#bill-list')).to_contain_text('Paga')
 assert len(page.evaluate('JSON.parse(localStorage.getItem("saldo.expenses.v1"))'))==1
 page.locator('.planning-tabs [data-planning-view=goal]').click()
 page.locator('#goal-name').fill('Reserva');page.locator('#goal-target').fill('1000');page.locator('#goal-saved').fill('10');page.locator('#goal-form button').click();page.get_by_role('button',name='Atualizar reservado').click();expect(page.locator('#goal-list')).to_contain_text('25,00')
 page.locator('.planning-tabs [data-planning-view=import]').click()
 paid_date=page.evaluate('JSON.parse(localStorage.getItem("saldo.expenses.v1"))[0].date')
 page.locator('#statement-file').set_input_files({'name':'extrato.csv','mimeType':'text/csv','buffer':f'data;descricao;valor\n{paid_date};Conta teste;-30\n{paid_date};Salario;500'.encode()})
 expect(page.locator('[data-import-index]')).to_have_count(2)
 expect(page.locator('[data-import-index="0"]')).not_to_be_checked();expect(page.locator('[data-import-index="1"]')).to_be_checked()
 page.locator('#statement-save').click();expect(page.locator('#statement-save')).to_be_hidden()
 assert len(page.evaluate('JSON.parse(localStorage.getItem("saldo.expenses.v1"))'))==2
 page.locator('#quick-entry').click();expect(page.locator('#description')).to_be_focused()
 page.locator('#description').fill('Compra parcelada');page.locator('#amount').fill('100');page.locator('#date').fill('2026-01-31');page.locator('#installment-count').select_option('3');page.locator('#expense-form button[type=submit]').click()
 expect(page.locator('#message')).to_contain_text('3 parcelas')
 rows=page.evaluate('JSON.parse(localStorage.getItem("saldo.expenses.v1"))');assert sum(r['cents'] for r in rows if r['description'].startswith('Compra parcelada'))==10000
 page.reload();page.locator('#local-mode').click();navigate('planning');page.locator('.planning-tabs [data-planning-view=goal]').click();expect(page.locator('#goal-list')).to_contain_text('25,00');page.locator('.planning-tabs [data-planning-view=bill]').click();expect(page.locator('#bill-list')).to_contain_text('Paga')
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 print('PASS: orçamento, conta paga, meta, revisão e duplicatas CSV, parcelas, entrada rápida e persistência mobile.')
 browser.close()
