export function installAppUpdates(){
 const build=document.querySelector('meta[name="serimora-build"]')?.content||'source';
 const versionText=document.getElementById('app-build-version'),originText=document.getElementById('app-build-origin'),result=document.getElementById('app-update-status'),checkButton=document.getElementById('app-update-check');
 if(versionText)versionText.textContent=build==='source'?'Desenvolvimento (arquivos de origem)':build;if(originText)originText.textContent=location.origin;
 let pending=null,deferred=null,checking=null,registration=null;
 const banner=document.createElement('aside');banner.className='app-update-banner';banner.hidden=true;banner.setAttribute('role','status');const label=document.createElement('span');label.textContent='Nova versão disponível. Salve os formulários antes de atualizar.';const update=document.createElement('button');update.type='button';update.className='primary';update.textContent='Atualizar agora';const later=document.createElement('button');later.type='button';later.className='secondary';later.textContent='Depois';banner.append(label,update,later);document.body.append(banner);
 function announce(version){pending=version;banner.hidden=false;if(result)result.textContent=`Nova versão disponível: ${version.id}. Salve os formulários antes de atualizar.`;}
 async function check(manual=false){if(checking)return checking;if(build==='source'){if(manual&&result)result.textContent='Esta página está executando arquivos de origem, fora da publicação versionada.';return;}
 checking=(async()=>{try{const url=new URL('version.json',location.href);url.search='check='+Date.now();const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();const version=await response.json();if(version.schema!==1||!/^[a-f0-9]{16}$/.test(version.id)||version.release!==`releases/${version.id}`)throw Error();if(version.id!==build){if(manual||deferred!==version.id)announce(version);}else if(manual&&result)result.textContent=`Versão atualizada: ${build}.`;return version;}catch{if(manual&&result)result.textContent='Não foi possível verificar a publicação. Confira sua conexão; seus dados foram preservados.';}finally{checking=null;}})();return checking;
 }
 later.onclick=()=>{deferred=pending?.id;banner.hidden=true;};
 async function readyVersion(id){
  if(!('serviceWorker' in navigator))return;
  registration=registration||await navigator.serviceWorker.getRegistration();if(!registration)return;
  await registration.update().catch(()=>{});
  await new Promise((resolve,reject)=>{let finished=false;const deadline=setTimeout(()=>finish(new Error('A versão ainda está sendo preparada. Tente atualizar novamente.')),15000);
   function finish(error){if(finished)return;finished=true;clearTimeout(deadline);navigator.serviceWorker.removeEventListener('controllerchange',probe);error?reject(error):resolve();}
   function probe(){const controller=navigator.serviceWorker.controller;if(!controller)return;const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();channel.port2.close();},1500);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();channel.port2.close();if(event.data?.build===id)finish();};controller.postMessage({type:'SERIMORA_GET_VERSION'},[channel.port2]);}
   navigator.serviceWorker.addEventListener('controllerchange',probe);probe();
  });
 }
 update.onclick=async()=>{update.disabled=true;try{const latest=await check(true);if(!latest)throw Error('Não foi possível verificar a publicação. Tente com conexão.');label.textContent='Preparando a nova versão…';await readyVersion(latest.id);location.reload();}catch(error){label.textContent=error.message;update.disabled=false;}};
 if(checkButton)checkButton.onclick=()=>check(true);
 if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(value=>{registration=value;return value.update();}).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>check());}
 const onVisible=()=>{if(!document.hidden){check();registration?.update().catch(()=>{});}};document.addEventListener('visibilitychange',onVisible);window.addEventListener('online',onVisible);let timer=setInterval(onVisible,60000);window.addEventListener('pagehide',()=>{clearInterval(timer);timer=null;});window.addEventListener('pageshow',()=>{if(!timer)timer=setInterval(onVisible,60000);});check();
 return {build,check};
}
