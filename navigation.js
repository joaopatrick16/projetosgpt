import {animateFeedback} from './interactions.js';
const names={dashboard:'Dashboard',reports:'Relatórios',users:'Usuários',settings:'Configurações',profile:'Meu perfil',export:'Exportar PDF'};
const descriptions={dashboard:'Uma visão completa das suas finanças.',reports:'Compare períodos e acompanhe cada lançamento.',users:'Perfis e gastos gerais, em um só lugar.',settings:'Seu aplicativo, do seu jeito.',profile:'Sua identidade e seus dados de contato.',export:'Um relatório claro para guardar e compartilhar.'};
export function createNavigation({canAccess,onNavigate}) {
 const shell=document.getElementById('workspace'),sidebar=document.getElementById('app-sidebar'),content=document.querySelector('.app-content');
 const mobile=matchMedia('(max-width: 760px)');
 const toggle=document.getElementById('menu-toggle'),mobileToggle=document.getElementById('mobile-menu-toggle'),backdrop=document.getElementById('sidebar-backdrop');
 let collapsed=false,open=false,view='dashboard';
 try{collapsed=localStorage.getItem('saldo.menu.collapsed')==='true';}catch{}
 function updateMenu(){shell.classList.toggle('sidebar-collapsed',collapsed);shell.classList.toggle('mobile-menu-open',open&&mobile.matches);sidebar.inert=mobile.matches&&!open;content.inert=mobile.matches&&open;backdrop.hidden=!(open&&mobile.matches);toggle.setAttribute('aria-expanded',String(mobile.matches?open:!collapsed));mobileToggle.setAttribute('aria-expanded',String(open&&mobile.matches));toggle.setAttribute('aria-label',mobile.matches?'Fechar menu':collapsed?'Expandir menu':'Recolher menu');document.body.classList.toggle('menu-open',open&&mobile.matches);}
 function closeMenu(focus=false){const wasOpen=open;open=false;updateMenu();if(focus&&wasOpen&&mobile.matches)mobileToggle.focus();}
 function navigate(name,{animate=false,focus=false}={}){
  if(!names[name]||!canAccess(name))return false;
  view=name;
  for(const section of document.querySelectorAll('[data-page]'))section.hidden=section.dataset.page!==name;
  for(const button of document.querySelectorAll('.nav-item[data-view]')){if(button.dataset.view===name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  document.getElementById('page-title').textContent=names[name];document.getElementById('view-description').textContent=descriptions[name];
  closeMenu();onNavigate?.(name);
  const section=document.querySelector(`[data-page="${name}"]`);
  if(animate)animateFeedback(section,'reveal');
  if(focus){document.getElementById('page-title').focus({preventScroll:true});window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  return true;
 }
 document.addEventListener('click',event=>{const button=event.target.closest?.('[data-view]');if(button&&!button.disabled)navigate(button.dataset.view,{animate:true,focus:true});});
 toggle.onclick=()=>{if(mobile.matches){closeMenu(true);return;}collapsed=!collapsed;try{localStorage.setItem('saldo.menu.collapsed',String(collapsed));}catch{}updateMenu();};
 mobileToggle.onclick=()=>{open=!open;updateMenu();if(open)toggle.focus();};backdrop.onclick=()=>closeMenu(true);
 document.addEventListener('keydown',event=>{if(!mobile.matches||!open)return;if(event.key==='Escape'){event.preventDefault();closeMenu(true);}if(event.key==='Tab'){const focusable=[...sidebar.querySelectorAll('button:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
 mobile.addEventListener('change',()=>{open=false;updateMenu();});
 updateMenu();navigate('dashboard');
 return {navigate,reset(){closeMenu();navigate('dashboard');},refreshAccess(){for(const button of document.querySelectorAll('.nav-item[data-view]'))button.hidden=!canAccess(button.dataset.view);if(!canAccess(view))navigate('dashboard');}};
}
