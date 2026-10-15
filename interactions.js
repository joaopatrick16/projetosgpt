// Short, interaction-only effects. No animation loop, timers or framework.
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const active=new WeakMap();
export function animateFeedback(element,type='success') {
  if(!element || element.hidden || reducedMotion.matches || !element.animate)return;
  active.get(element)?.cancel();
  const frames=type==='error'
    ? [{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}]
    : type==='reveal'
      ? [{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}]
      : [{boxShadow:'0 0 0 0 #7bbde860'},{boxShadow:'0 0 0 7px #7bbde800'}];
  const animation=element.animate(frames,{duration:type==='reveal'?240:300,easing:'cubic-bezier(.2,.8,.2,1)',iterations:1});
  active.set(element,animation);
  animation.finished.then(()=>{if(active.get(element)===animation)active.delete(element);}).catch(()=>{});
}
document.addEventListener('click',event=>{
  const button=event.target.closest?.('button');
  if(!button || button.disabled || reducedMotion.matches || !button.animate)return;
  button.querySelector('.interaction-ripple')?.remove();
  const bounds=button.getBoundingClientRect(),ripple=document.createElement('span');
  ripple.className='interaction-ripple';ripple.setAttribute('aria-hidden','true');
  ripple.style.left=`${event.detail?event.clientX-bounds.left:bounds.width/2}px`;
  ripple.style.top=`${event.detail?event.clientY-bounds.top:bounds.height/2}px`;
  button.append(ripple);
  const wave=ripple.animate([{transform:'scale(.1)',opacity:.7},{transform:`scale(${Math.max(bounds.width,bounds.height)/45})`,opacity:0}],{duration:420,easing:'ease-out',iterations:1});
  wave.finished.then(()=>ripple.remove()).catch(()=>ripple.remove());
  animateFeedback(button);
},true);
document.addEventListener('click',event=>{
  const button=event.target.closest?.('button');
  const panels={'open-profile':'profile-panel','admin-toggle':'admin-panel','toggle-signup':'signup-name-label'};
  if(button && panels[button.id])animateFeedback(document.getElementById(panels[button.id]),'reveal');
});
document.addEventListener('change',event=>{
  if(['month','filter','admin-scope'].includes(event.target.id)) {
    for(const element of document.querySelectorAll('.cards article,.flow-cards article'))animateFeedback(element);
  }
  if(['type','direction','payment-method','category'].includes(event.target.id))animateFeedback(event.target);
});
reducedMotion.addEventListener('change',event=>{if(event.matches){for(const animation of document.getAnimations())animation.cancel();document.querySelectorAll('.interaction-ripple').forEach(el=>el.remove());}});
