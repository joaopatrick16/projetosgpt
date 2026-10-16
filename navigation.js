import {animateFeedback,animateView,cancelWithin,animateSelection} from './interactions.js';
const names={notifications:'Notificações',planning:'Planejamento',dashboard:'Dashboard',reports:'Relatórios',users:'Usuários',settings:'Configurações',profile:'Meu perfil',export:'Exportar PDF'};
export function createNavigation({canAccess,onNavigate}) {
 const shell=document.getElementById('workspace'),sidebar=document.getElementById('app-sidebar'),content=document.querySelector('.app-content');
 const mobile=matchMedia('(max-width: 760px)');
 const toggle=document.getElementById('menu-toggle'),mobileToggle=document.getElementById('mobile-menu-toggle'),backdrop=document.getElementById('sidebar-backdrop');
 let collapsed=false,open=false,view='dashboard';
 const trail=[],backButton=document.getElementById('back-button'),backNavigation=document.getElementById('back-navigation');
 function updateBack(){while(trail.length&&!canAccess(trail.at(-1)))trail.pop();const target=trail.at(-1)||'dashboard';backNavigation.hidden=!trail.length&&view==='dashboard';backButton.setAttribute('aria-label',`Voltar para ${names[target]}`);backButton.title=`Voltar para ${names[target]}`;document.getElementById('back-destination').textContent=names[target];}
 const nav=sidebar.querySelector('nav'),indicator=document.createElement('div');indicator.className='nav-active-indicator';indicator.setAttribute('aria-hidden','true');nav.prepend(indicator);
 function positionIndicator(animate=false){const button=nav.querySelector('[aria-current=page]');if(!button||!button.getClientRects().length){indicator.hidden=true;return;}indicator.hidden=false;const oldTop=parseFloat(indicator.style.top)||0;const top=button.offsetTop;indicator.style.top=top+'px';indicator.style.height=button.offsetHeight+'px';if(animate)animateSelection(indicator,oldTop,top);}
 try{collapsed=localStorage.getItem('saldo.menu.collapsed')==='true';}catch{}
 function updateMenu(){shell.classList.toggle('sidebar-collapsed',collapsed);shell.classList.toggle('mobile-menu-open',open&&mobile.matches);sidebar.inert=mobile.matches&&!open;content.inert=mobile.matches&&open;backdrop.hidden=!(open&&mobile.matches);toggle.setAttribute('aria-expanded',String(mobile.matches?open:!collapsed));mobileToggle.setAttribute('aria-expanded',String(open&&mobile.matches));toggle.setAttribute('aria-label',mobile.matches?'Fechar menu':collapsed?'Expandir menu':'Recolher menu');document.body.classList.toggle('menu-open',open&&mobile.matches);}
 function closeMenu(focus=false){const wasOpen=open;open=false;updateMenu();if(focus&&wasOpen&&mobile.matches)mobileToggle.focus();}
 function navigate(name,{animate=false,focus=false,remember=true}={}){
  if(!names[name]||!canAccess(name))return false;
  if(remember&&name!==view)trail.push(view);
  const previous=document.querySelector(`[data-page="${view}"]`);cancelWithin(previous);view=name;
  for(const section of document.querySelectorAll('[data-page]'))section.hidden=section.dataset.page!==name;
  for(const button of document.querySelectorAll('.nav-item[data-view]')){if(button.dataset.view===name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  document.getElementById('page-title').textContent=names[name];
  updateBack();positionIndicator(animate);closeMenu();onNavigate?.(name);
  const section=document.querySelector(`[data-page="${name}"]`);
  if(animate)animateView(section);
  if(focus){document.getElementById('page-title').focus({preventScroll:true});window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  return true;
 }
 backButton.onclick=()=>{let target;while(trail.length){const candidate=trail.pop();if(candidate!==view&&canAccess(candidate)){target=candidate;break;}}navigate(target||'dashboard',{animate:true,focus:true,remember:false});};
 document.addEventListener('click',event=>{const button=event.target.closest?.('[data-view]');if(button&&!button.disabled)navigate(button.dataset.view,{animate:true,focus:true});});
 toggle.onclick=()=>{if(mobile.matches){closeMenu(true);return;}collapsed=!collapsed;try{localStorage.setItem('saldo.menu.collapsed',String(collapsed));}catch{}updateMenu();positionIndicator();animateFeedback(content,'reveal');};
 mobileToggle.onclick=()=>{open=!open;updateMenu();if(open){positionIndicator();toggle.focus();}};backdrop.onclick=()=>closeMenu(true);
 document.addEventListener('keydown',event=>{if(!mobile.matches||!open)return;if(event.key==='Escape'){event.preventDefault();closeMenu(true);}if(event.key==='Tab'){const focusable=[...sidebar.querySelectorAll('button:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
 mobile.addEventListener('change',()=>{open=false;updateMenu();});
 updateMenu();navigate('dashboard');
 return {navigate,reset(){trail.length=0;closeMenu();navigate('dashboard',{remember:false});},refreshAccess(){for(const button of document.querySelectorAll('.nav-item[data-view]'))button.hidden=!canAccess(button.dataset.view);if(!canAccess(view))navigate('dashboard',{remember:false});updateBack();positionIndicator();}};
}
