const CACHE='saldo-v9';
const FILES=['./','./index.html','./style.css','./fonts/inter-latin-variable.woff2','./app.js','./interactions.js','./navigation.js','./dashboard.js','./finance.js','./report.js','./cloud.js','./config.js','./manifest.webmanifest','./icon.svg','./assets/serimora-logo.png','./icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('saldo-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(cached=>cached || (event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));});
