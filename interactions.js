// Native, finite animations: no library and no work running while the UI is idle.
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const running=new Set(),channels=new WeakMap(),counters=new Map();
let counterFrame=0;
const easing='cubic-bezier(.2,.8,.2,1)';
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
function visible(element){return element&&!element.hidden&&element.getClientRects().length>0;}
function play(element,frames,{duration=380,delay=0,channel='feedback'}={}){
 if(reducedMotion.matches||!visible(element)||!element.animate)return null;
 let own=channels.get(element);if(!own){own=new Map();channels.set(element,own);}own.get(channel)?.cancel();
 const animation=element.animate(frames,{duration,delay,easing,iterations:1});own.set(channel,animation);
 const record={element,animation};running.add(record);
 const clean=()=>{running.delete(record);if(own.get(channel)===animation)own.delete(channel);};animation.finished.then(clean,clean);return animation;
}
function completeCounter(element,state){element.textContent=money.format(state.to/100);element.removeAttribute('data-counting');element.removeAttribute('aria-label');counters.delete(element);}
function tickCounters(time){counterFrame=0;for(const [element,state] of counters){if(!element.isConnected||!visible(element)){completeCounter(element,state);continue;}const progress=Math.min((time-state.start)/state.duration,1),eased=1-(1-progress)**3;element.textContent=money.format(Math.round(state.from+(state.to-state.from)*eased)/100);if(progress>=1)completeCounter(element,state);}if(counters.size)counterFrame=requestAnimationFrame(tickCounters);}
export function animateNumber(element,{fromZero=false}={}){if(!element)return;const to=Number(element.dataset.cents),from=fromZero?0:Number(element.dataset.previousCents||0);if(!Number.isFinite(to)||!Number.isFinite(from)||from===to||reducedMotion.matches||!visible(element))return;counters.set(element,{from,to,start:performance.now(),duration:580});element.dataset.counting='true';element.setAttribute('aria-label',money.format(to/100));if(!counterFrame)counterFrame=requestAnimationFrame(tickCounters);}
export function cancelWithin(root){if(!root)return;for(const record of running){if(root.contains(record.element))record.animation.cancel();}for(const [element,state] of counters){if(root.contains(element))completeCounter(element,state);}if(!counters.size&&counterFrame){cancelAnimationFrame(counterFrame);counterFrame=0;}hideTooltip();}
export function animateFeedback(element,type='success'){
 const frames=type==='error'?[{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}]:type==='reveal'?[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}]:[{boxShadow:'0 0 0 0 #7bbde860'},{boxShadow:'0 0 0 7px #7bbde800'}];
 return play(element,frames,{duration:type==='reveal'?340:300,channel:type});
}
let sweepSupported=false;
try{if(globalThis.CSS?.registerProperty){CSS.registerProperty({name:'--chart-sweep',syntax:'<angle>',inherits:false,initialValue:'360deg'});sweepSupported=true;}}catch{/* A reloaded module may find the property already registered. */}
export function animateChart(chart=document.getElementById('category-chart')){
 if(sweepSupported)play(chart,[{'--chart-sweep':'0deg'},{'--chart-sweep':'360deg'}],{duration:680,channel:'sweep'});
 else play(chart,[{opacity:.2,transform:'scale(.92) rotate(-8deg)'},{opacity:1,transform:'scale(1) rotate(0deg)'}],{duration:480,channel:'chart'});
 const center=document.getElementById('chart-center');if(center&&!center.hidden)animateFeedback(center,'reveal');
}
export function animateList(root){if(!visible(root))return;const items=[...root.querySelectorAll('.expense,.profile-summary,.manager-row,tbody tr')].slice(0,10);items.forEach((item,index)=>play(item,[{opacity:.15,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,delay:index*25,channel:'row'}));}
export function animateView(root,{fromZero=true}={}){
 if(!visible(root)||reducedMotion.matches)return;hideTooltip();
 const candidates=[...root.querySelectorAll('.metric-card,.panel,.report-preview')];const panels=candidates.filter(element=>!candidates.some(parent=>parent!==element&&parent.contains(element))).slice(0,12);
 if(panels.length)panels.forEach((panel,index)=>play(panel,[{opacity:.1,transform:'translateY(18px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:430,delay:Math.min(index*35,175),channel:'entrance'}));else animateFeedback(root,'reveal');
 [...root.querySelectorAll('.bar,.progress-fill')].slice(0,48).forEach((bar,index)=>{const vertical=bar.classList.contains('bar');play(bar,[{transform:vertical?'scaleY(0)':'scaleX(0)'},{transform:vertical?'scaleY(1)':'scaleX(1)'}],{duration:540,delay:Math.min(index*23,160),channel:'growth'});});
 root.querySelectorAll('[data-cents]').forEach(element=>animateNumber(element,{fromZero}));
 const chart=root.querySelector('#category-chart');if(chart)animateChart(chart);
 animateList(root);
}
export function animateSelection(indicator,previousTop,nextTop){play(indicator,[{transform:`translateY(${previousTop-nextTop}px)`},{transform:'translateY(0)'}],{duration:330,channel:'selection'});}
let tooltip=null,tooltipTarget=null,tooltipWidth=240,tooltipHeight=60;
function hideTooltip(){if(tooltip)tooltip.hidden=true;tooltipTarget=null;}
function moveTooltip(x,y){if(!tooltip||tooltip.hidden)return;const left=Math.max(8,Math.min(x+14,innerWidth-tooltipWidth-8));const top=y+18+tooltipHeight>innerHeight?Math.max(8,y-tooltipHeight-12):y+18;tooltip.style.left=left+'px';tooltip.style.top=top+'px';}
function showTooltip(target,x,y,label=target.dataset.tooltip){if(!label)return;if(!tooltip){tooltip=document.createElement('div');tooltip.id='interaction-tooltip';tooltip.className='interaction-tooltip';tooltip.setAttribute('role','tooltip');document.body.append(tooltip);}const changed=tooltipTarget!==target||tooltip.textContent!==label;tooltipTarget=target;tooltip.textContent=label;tooltip.hidden=false;tooltipWidth=tooltip.offsetWidth;tooltipHeight=tooltip.offsetHeight;moveTooltip(x,y);if(changed)play(tooltip,[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,channel:'tooltip'});}
const sliceCache=new WeakMap();
function chartTooltip(chart,x,y){const rect=chart.getBoundingClientRect(),dx=x-rect.left-rect.width/2,dy=y-rect.top-rect.height/2,radius=rect.width/2,distance=Math.hypot(dx,dy);if(distance>radius||(chart.classList.contains('donut')&&distance<radius*.56)){hideTooltip();return;}const source=chart.dataset.slices||'[]';let cache=sliceCache.get(chart);if(cache?.source!==source){try{cache={source,slices:JSON.parse(source)};}catch{cache={source,slices:[]};}sliceCache.set(chart,cache);}const position=(Math.atan2(dx,-dy)*180/Math.PI+360)%360/3.6;const slice=cache.slices.find(part=>position>=part.start&&position<=part.end);if(!slice){hideTooltip();return;}showTooltip(chart,x,y,`${slice.name}: ${money.format(slice.amount/100)} · ${slice.percentage.toFixed(1).replace('.',',')}% das saídas`);}
document.addEventListener('pointerover',event=>{const chart=event.target.closest?.('#category-chart');if(chart){chartTooltip(chart,event.clientX,event.clientY);return;}const target=event.target.closest?.('[data-tooltip]');if(target)showTooltip(target,event.clientX,event.clientY);});
document.addEventListener('pointermove',event=>{const chart=event.target.closest?.('#category-chart');if(chart)chartTooltip(chart,event.clientX,event.clientY);else if(tooltipTarget)moveTooltip(event.clientX,event.clientY);},{passive:true});
document.addEventListener('pointerout',event=>{if(tooltipTarget&&!tooltipTarget.contains(event.relatedTarget))hideTooltip();});
document.addEventListener('focusin',event=>{const target=event.target.closest?.('[data-tooltip]');if(target){const rect=target.getBoundingClientRect();showTooltip(target,rect.left,rect.top);}});
document.addEventListener('focusout',hideTooltip);document.addEventListener('scroll',hideTooltip,{capture:true,passive:true});
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideTooltip();});
document.addEventListener('click',event=>{
 const button=event.target.closest?.('button');
 if(!event.target.closest?.('[data-tooltip],#category-chart'))hideTooltip();
 if(!button||button.disabled||reducedMotion.matches||!button.animate||button.id==='sidebar-backdrop')return;
 button.querySelector('.interaction-ripple')?.remove();const bounds=button.getBoundingClientRect(),ripple=document.createElement('span');ripple.className='interaction-ripple';ripple.setAttribute('aria-hidden','true');ripple.style.left=`${event.detail?event.clientX-bounds.left:bounds.width/2}px`;ripple.style.top=`${event.detail?event.clientY-bounds.top:bounds.height/2}px`;button.append(ripple);
 const wave=play(ripple,[{transform:'scale(.1)',opacity:.7},{transform:`scale(${Math.max(bounds.width,bounds.height)/45})`,opacity:0}],{duration:420,channel:'wave'});const remove=()=>ripple.remove();if(wave)wave.finished.then(remove,remove);else remove();
 play(button,[{scale:'1'},{scale:'.965',offset:.3},{scale:'1'}],{duration:230,channel:'press'});
},true);
document.addEventListener('click',event=>{const button=event.target.closest?.('button');if(button?.id==='toggle-signup')animateFeedback(document.getElementById('signup-name-label'),'reveal');});
document.addEventListener('change',event=>{if(['type','direction','payment-method','category'].includes(event.target.id))animateFeedback(event.target);});
reducedMotion.addEventListener('change',event=>{if(event.matches){for(const record of running)record.animation.cancel();for(const [element,state] of counters)completeCounter(element,state);if(counterFrame)cancelAnimationFrame(counterFrame);counterFrame=0;document.querySelectorAll('.interaction-ripple').forEach(element=>element.remove());hideTooltip();}});
