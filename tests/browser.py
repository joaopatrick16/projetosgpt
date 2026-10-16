"""UI smoke tests. Supabase is mocked; RLS is tested separately in security.mjs.
Run against a local server: SALDO_TEST_URL=http://127.0.0.1:8010 python3 tests/browser.py
Requires Playwright and Chromium; no runtime app dependency.
"""
import os,json,base64,time
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('SALDO_TEST_URL','http://127.0.0.1:8000')
ROOT=Path(__file__).resolve().parent.parent
ALICE='11111111-1111-4111-8111-111111111111'
BOB='22222222-2222-4222-8222-222222222222'
ADMIN='33333333-3333-4333-8333-333333333333'
CAT='44444444-4444-4444-8444-444444444444'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,service_workers='block')
    context.route('**/config.js',lambda r:r.fulfill(content_type='application/javascript',body="export const cloudConfig={url:'',publishableKey:''};"))
    def open_menu(page):
        if page.locator('#mobile-menu-toggle').is_visible() and page.locator('#app-sidebar').evaluate('(el)=>el.inert'):
            page.locator('#mobile-menu-toggle').click()
    def navigate(page, view):
        open_menu(page)
        page.locator(f'.nav-item[data-view="{view}"]').click()
        expect(page.locator(f'[data-page="{view}"]')).to_be_visible()
    page=context.new_page(); errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.locator('#local-mode').click()
    for description,amount,direction in [('Salário','3000','income'),('Aluguel','1200','expense')]:
        page.locator('#description').fill(description);page.locator('#amount').fill(amount)
        page.locator('#direction').select_option(direction);page.locator('#expense-form button').click()
        page.get_by_text('Lançamento salvo.',exact=True).wait_for()
        page.wait_for_function('!document.querySelector("[data-counting]")')
    assert '1.800,00' in page.locator('#balance').inner_text()
    navigate(page,'export')
    with page.expect_download() as download:page.locator('#pdf').click()
    assert download.value.suggested_filename.endswith('.pdf')
    page.reload();page.locator('#local-mode').click()
    navigate(page,'reports')
    assert 'Salário' in page.locator('#list').inner_text()
    navigate(page,'dashboard')
    page.locator('[data-chart=pie]').click()
    expect(page.locator('[data-chart=pie]')).to_have_attribute('aria-pressed','true')
    expect(page.locator('#chart-center')).to_be_hidden()
    page.locator('[data-chart=donut]').click()
    expect(page.locator('#chart-center')).to_be_visible()
    page.screenshot(path='/tmp/saldo-reference-mobile.png',full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors,errors
    context.close()

    # Cloud UI against deterministic fixtures, with no external email requests.
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,service_workers='block')
    people=[{'id':ALICE,'display_name':'Alice','role':'user','avatar_path':None,'contact_email':'alice@example.com','email_verified':True}, {'id':BOB,'display_name':'Bob','role':'user','avatar_path':None,'contact_email':'bob@example.com','email_verified':True}, {'id':ADMIN,'display_name':'Admin','role':'super_admin','avatar_path':None,'contact_email':'admin@example.com','email_verified':True}]
    categories=[{'id':CAT,'name':'Moradia','active':True}]
    settings={'id':1,'app_name':'Saldo','accent':'#91b2ff'}
    month=time.strftime('%Y-%m');date=month+'-01'
    transactions=[{'id':'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','user_id':ALICE,'description':'Casa Alice','cents':100000,'date':date,'type':'fixed','recurring':False,'direction':'expense','payment_method':'debit','category_id':CAT,'category_label':'Moradia'}, {'id':'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','user_id':BOB,'description':'Casa Bob','cents':70000,'date':date,'type':'fixed','recurring':False,'direction':'expense','payment_method':'credit','category_id':CAT,'category_label':'Moradia'}]
    sent=[];profile_writes=[]
    def mock(route):
        request=route.request;path=urlsplit(request.url).path;query=parse_qs(urlsplit(request.url).query)
        body=request.post_data_json if 'application/json' in request.headers.get('content-type','') else None
        user_id=request.headers.get('authorization','Bearer '+ALICE).removeprefix('Bearer ')
        if path.endswith('/token'):
            user_id=ADMIN if body['email']=='admin@example.com' else ALICE
            data={'access_token':user_id,'refresh_token':'test-refresh','expires_in':3600,'user':{'id':user_id,'email':body['email']}}
        elif path=='/auth/v1/user':data={'id':user_id,'email':next(p['contact_email'] for p in people if p['id']==user_id)}
        elif path in ['/auth/v1/logout','/auth/v1/recover']:data={}
        elif path.endswith('/profiles'):
            selected=[person for person in people if person['id']==user_id or user_id==ADMIN]
            if 'id' in query:selected=[person for person in selected if person['id']==query['id'][0].removeprefix('eq.')]
            if request.method=='PATCH':
                assert set(body)<= {'display_name','avatar_path'}
                selected[0].update(body);profile_writes.append(body);data=None
            else:data=selected
        elif path.endswith('/transactions'):
            if request.method=='POST':transactions.extend(body if isinstance(body,list) else [body]);data=None
            else:
                data=[e for e in transactions if e['user_id']==user_id or user_id==ADMIN]
                if 'user_id' in query:data=[e for e in data if e['user_id']==query['user_id'][0].removeprefix('eq.')]
        elif path.endswith('/categories'):
            if request.method=='POST':categories.append({'id':'55555555-5555-4555-8555-555555555555','active':True,**body});data=None
            elif request.method=='PATCH':next(c for c in categories if c['id']==query['id'][0].removeprefix('eq.')).update(body);data=None
            elif request.method=='DELETE':categories[:]=[c for c in categories if c['id']!=query['id'][0].removeprefix('eq.')];data=None
            else:data=categories
        elif path.endswith('/app_settings'):
            if request.method=='PATCH':settings.update(body);data=None
            else:data=[settings]
        elif '/object/authenticated/avatars/' in path:
            route.fulfill(status=200,content_type='image/png',body=(ROOT/'icon.png').read_bytes());return
        elif '/object/avatars/' in path:
            assert request.headers.get('content-type')=='image/jpeg'
            data={'Key':'avatars/'+user_id+'/avatar.jpg'}
        elif path.endswith('/send-email'):sent.append(body);data={'message':'accepted'}
        else:raise AssertionError(path)
        route.fulfill(status=200,content_type='application/json',body=json.dumps(data))
    context.route('**/config.js',lambda r:r.fulfill(content_type='application/javascript',body="export const cloudConfig={url:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'};"))
    context.route('https://fixture.supabase.co/**',mock)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE)
    page.locator('#email').fill('alice@example.com');page.locator('#password').fill('password123');page.locator('#auth-submit').click()
    page.get_by_text('Dados sincronizados.',exact=True).wait_for()
    assert 'Casa Alice' in page.locator('#list').inner_text() and 'Casa Bob' not in page.locator('#list').inner_text()
    assert page.locator('#admin-toggle').is_hidden()
    expect(page.locator('#account-label')).to_have_text('Bem-vindo, Alice')
    assert page.locator('#account-label').evaluate('(el)=>getComputedStyle(el).fontSize')==page.get_by_role('heading',name='Visão do mês').evaluate('(el)=>getComputedStyle(el).fontSize')
    navigate(page,'profile')
    assert page.locator('#profile-email').input_value()=='alice@example.com'
    page.locator('#profile-name').fill('Alice Nova');page.locator('#profile-form button').click()
    page.get_by_text('Perfil atualizado.',exact=True).wait_for()
    expect(page.locator('#account-label')).to_have_text('Bem-vindo, Alice Nova')
    page.locator('#photo').set_input_files(str(ROOT/'icon.png'))
    page.get_by_text('Foto atualizada.',exact=True).wait_for()
    assert page.locator('#avatar').is_visible()
    assert page.locator('#welcome-avatar').is_visible()
    assert page.locator('#welcome-avatar').get_attribute('src')==page.locator('#avatar').get_attribute('src')
    open_menu(page)
    page.locator('#logout').click();page.locator('#auth-screen').wait_for(state='visible')
    assert page.locator('#workspace').is_hidden()
    assert page.locator('#welcome-avatar').get_attribute('src') is None
    page.locator('#email').fill('admin@example.com');page.locator('#password').fill('password123');page.locator('#auth-submit').click()
    page.get_by_text('Dados sincronizados.',exact=True).wait_for();navigate(page,'users')
    page.locator('#admin-scope').select_option('all')
    navigate(page,'dashboard')
    page.wait_for_function('!document.querySelector("[data-counting]")')
    assert '1.700,00' in page.locator('#total').inner_text()
    navigate(page,'reports')
    assert 'Casa Alice' in page.locator('#list').inner_text() and 'Casa Bob' in page.locator('#list').inner_text()
    assert page.locator('#list .delete').count()==0
    navigate(page,'settings')
    page.locator('#category-name').fill('Viagens');page.locator('#category-form button').click()
    page.get_by_text('Dados sincronizados.',exact=True).wait_for()
    expect(page.locator('#category-manager')).to_contain_text('Viagens')
    page.locator('#app-name').fill('Meu Saldo');page.locator('#settings-form button').click()
    page.get_by_text('Aparência salva para todos os perfis.',exact=True).wait_for()
    assert 'MEU SALDO' in page.locator('.sidebar .brand').text_content()
    navigate(page,'users')
    page.locator('#email-recipient').select_option(BOB);page.locator('#email-body').fill('Olá! Segue seu extrato.')
    page.once('dialog',lambda dialog:dialog.accept())
    page.locator('#email-send-form button').click()
    page.get_by_text('E-mail aceito pelo serviço de envio.',exact=False).wait_for()
    assert len(sent)==1 and sent[0]['recipientId']==BOB
    pdf=base64.b64decode(sent[0]['attachment']['content'])
    assert pdf.startswith(b'%PDF') and b'Casa Bob' in pdf and b'Casa Alice' not in pdf
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors,errors
    page.screenshot(path='/tmp/saldo-admin-v3.png',full_page=True)
    context.close();browser.close()
    print('PASS: UI mobile local e cloud simulada, login/logout, painel por função, foto comprimida, e-mail confirmado, categorias, tema e extrato restrito ao destinatário. Nenhum e-mail real enviado.')
