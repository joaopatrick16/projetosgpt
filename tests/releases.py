"""Production builds A/B, real service worker, update, offline and data preservation.
No external accounts, production writes or paid services.
"""
import ast,hashlib,http.server,json,os,re,shutil,subprocess,tempfile,threading
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix='serimora-releases-') as tmp:
 temp=Path(tmp);repo=temp/'repo';repo.mkdir()
 build_source=(ROOT/'scripts/build.mjs').read_text()
 files=ast.literal_eval(re.search(r'const files=(\[[^\n]+\]);',build_source)[1])
 for name in files+['sw.js','scripts/build.mjs']:
  target=repo/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,target)
 for name in ['assets','fonts']:shutil.copytree(ROOT/name,repo/name)
 (repo/'config.js').write_text("export const cloudConfig={url:'',publishableKey:''};")
 def build(label):
  subprocess.run(['node','scripts/build.mjs'],cwd=repo,check=True,capture_output=True)
  dest=temp/label;shutil.copytree(repo/'dist',dest);version=json.loads((dest/'version.json').read_text());html=(dest/'index.html').read_text();assert version['release']+'/app.js' in html;assert version['release']+'/style.css' in html
  worker=(dest/'sw.js').read_text();hashes=json.loads(re.search(r'const DIGESTS=(\{[^\n]+\});',worker)[1]);assert len(hashes)>20
  for path,digest in hashes.items():assert hashlib.sha256((dest/('index.html' if path=='./' else path[2:])).read_bytes()).hexdigest()==digest,path
  for file in (dest/version['release']).glob('*.js'):
   for dependency in re.findall(r"from\s+['\"](\./[^'\"]+)['\"]",file.read_text()):assert (file.parent/dependency).exists(),dependency
  return dest,version
 a,va=build('A');(repo/'dashboard.js').write_text((repo/'dashboard.js').read_text().replace('#19d3c5','#ffbd59'))
 b,vb=build('B');assert va['id']!=vb['id'];active={'dir':a}
 class Server(http.server.SimpleHTTPRequestHandler):
  def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(active['dir']),**kwargs)
  def end_headers(self):
   self.send_header('Cache-Control','public, max-age=31536000, immutable' if self.path.startswith('/releases/') else 'no-store')
   super().end_headers()
  def log_message(self,*args):pass
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Server);threading.Thread(target=server.serve_forever,daemon=True).start();base='http://127.0.0.1:'+str(server.server_port)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base);page.locator('#local-mode').click();page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller!==null');assert page.locator('meta[name=serimora-build]').get_attribute('content')==va['id']
  page.locator('#description').fill('Compra preservada');page.locator('#amount').fill('25');page.locator('#expense-form button[type=submit]').click();expect(page.locator('#message')).to_contain_text('salvo')
  page.evaluate('localStorage.setItem("serimora.planning.v1.local",JSON.stringify({version:1,bills:[],budgets:[],goals:[{id:"keep",name:"Meta preservada",saved:100,target:10000}]}))')
  page.locator('#description').fill('Formulário ainda não salvo')
  page.locator('.nav-item[data-view=settings]').click();expect(page.locator('#app-build-version')).to_have_text(va['id'])
  # New production deploy while A remains open. Never replace fields automatically.
  active['dir']=b;page.locator('#app-update-check').click();expect(page.locator('.app-update-banner')).to_be_visible();assert page.locator('#description').input_value()=='Formulário ainda não salvo';assert page.locator('meta[name=serimora-build]').get_attribute('content')==va['id']
  page.locator('.app-update-banner button.primary').click();expect(page.locator('meta[name=serimora-build]')).to_have_attribute('content',vb['id']);page.locator('#local-mode').click();page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller.scriptURL.endsWith("sw.js")');assert 'Compra preservada' in page.evaluate('localStorage.getItem("saldo.expenses.v1")');assert 'Meta preservada' in page.evaluate('localStorage.getItem("serimora.planning.v1.local")')
  script=page.locator('script[type=module]').get_attribute('src');assert vb['release'] in script
  # All loaded versioned modules belong to B; no A module reused under a shared name.
  modules=page.evaluate('performance.getEntriesByType("resource").filter(r=>r.name.includes("/releases/")&&r.name.endsWith(".js")).map(r=>r.name)');assert modules and all(vb['release'] in m for m in modules),modules
  # Validate worker B finished installing and has its verified offline snapshot.
  page.wait_for_function('(id)=>navigator.serviceWorker.getRegistration().then(async r=>r.active&&caches.has("serimora-"+id))',arg=vb['id']);page.wait_for_function('()=>navigator.serviceWorker.getRegistration().then(r=>!r.installing&&!r.waiting)')
  context.set_offline(True);page.reload();expect(page.locator('meta[name=serimora-build]')).to_have_attribute('content',vb['id']);page.locator('#local-mode').click();expect(page.locator('#workspace')).to_be_visible();assert 'Compra preservada' in page.evaluate('localStorage.getItem("saldo.expenses.v1")');context.set_offline(False)
  # A fresh phone-sized session gets the same production version B.
  phone=browser.new_context(viewport={'width':390,'height':844},service_workers='block');mobile=phone.new_page();mobile.goto(base);assert mobile.locator('meta[name=serimora-build]').get_attribute('content')==vb['id'];mobile.locator('#local-mode').click();assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  # Corrupt a third release: its worker must refuse activation and keep B usable.
  (repo/'dashboard.js').write_text((repo/'dashboard.js').read_text()+'\n// release C\n')
  c,vc=build('C');bad=c/vc['release']/'dashboard.js';bad.write_text(bad.read_text()+'\n// bytes inconsistent with the published manifest\n');active['dir']=c
  state=page.evaluate("""async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();const w=r.installing;if(!w)return 'none';if(['activated','redundant'].includes(w.state))return w.state;return new Promise(resolve=>w.addEventListener('statechange',()=>{if(['activated','redundant'].includes(w.state))resolve(w.state)}));}""")
  assert state=='redundant',state;assert not page.evaluate('(id)=>caches.has("serimora-"+id)',vc['id']);assert page.locator('meta[name=serimora-build]').get_attribute('content')==vb['id'];assert 'Compra preservada' in page.evaluate('localStorage.getItem("saldo.expenses.v1")')
  browser.close()
 server.shutdown()
 print('PASS: builds versionados A/B; imports e hashes consistentes; atualização sem apagar dados; sessão antiga avisada; offline; mesma versão em desktop e celular; publicação incompleta rejeitada sem perder dados.')
