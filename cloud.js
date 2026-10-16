import {cloudConfig} from './config.js';
import {createSessionStore} from './session-store.js';
export const configured = Boolean(cloudConfig.url && cloudConfig.publishableKey);
const storageKey=`saldo.session.v1:${cloudConfig.url}`;
let local,tab;
try{local=globalThis.localStorage;}catch{}
try{tab=globalThis.sessionStorage;}catch{}
const sessionStore=createSessionStore({key:storageKey,local,tab});
let session=sessionStore.load(),sessionEpoch=0;
export const rememberedEmail=()=>sessionStore.preference();
export function forgetRememberedEmail(){sessionStore.rememberUser('',false);}
const base=cloudConfig.url.replace(/\/$/,'');
if(configured && (!/^https:\/\/[a-z0-9.-]+$/i.test(base) || cloudConfig.publishableKey.startsWith('sb_secret_'))) throw Error('Configuração pública inválida.');
if(configured && cloudConfig.publishableKey.split('.').length===3){try{const encoded=cloudConfig.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const payload=JSON.parse(atob(encoded));if(payload.role!=='anon')throw Error();}catch{throw Error('Use apenas a chave publicável ou anon. Chaves administrativas são proibidas no aplicativo.');}}
function keep(value,remember=sessionStore.isRemembered()){if(value)session=sessionStore.save(value,remember);else{session=null;sessionStore.clear();}}
function keepTokens(value,remember=sessionStore.isRemembered()){keep({...value,expires_at:Math.floor(Date.now()/1000)+(value.expires_in||3600)},remember);}
function endSession(){sessionEpoch++;keep(null);}
function notifySessionChange(){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('saldo:session-changed'));}
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key!==storageKey||!sessionStore.isRemembered())return;const oldId=session?.user?.id;session=sessionStore.latest();if(!session||session.user?.id!==oldId){sessionEpoch++;notifySessionChange();}});
export function friendly(error,status) {
 const code=error.code||error.error_code;
 if(['refresh_token_not_found','refresh_token_already_used','refresh_token_expired','session_not_found','session_expired'].includes(code))return 'Sua sessão expirou. Entre novamente.';
 if(code==='invalid_credentials')return 'E-mail ou senha incorretos.';
 if(code==='email_not_confirmed')return 'Confirme seu e-mail antes de entrar.';
 if(code==='over_email_send_rate_limit')return 'O limite de e-mails de confirmação foi atingido. Aguarde antes de tentar novamente. Se persistir, o responsável precisa configurar o SMTP no Supabase.';
 if(code==='email_address_not_authorized')return 'O serviço de e-mail ainda não está autorizado a enviar para esse endereço. O responsável precisa configurar o SMTP no Supabase.';
 if(code==='email_address_invalid')return 'Confira o endereço de e-mail informado.';
 if(code==='user_already_exists' || code==='email_exists')return 'Já existe uma conta com esse e-mail. Use Entrar ou Esqueci minha senha.';
 if(code==='signup_disabled')return 'O cadastro de novas contas está desativado no Supabase.';
 if(/database error saving new user/i.test(error.msg||error.message||''))return 'O banco não conseguiu criar seu perfil. O responsável precisa verificar o registro de autenticação e a configuração das tabelas no Supabase.';
 if(status===429)return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.';
 if(code==='23505')return 'Esse registro já existe. Use outro nome.';
 if(status===401)return 'Sua sessão expirou. Entre novamente.';
 if(status===403 || code==='42501')return 'Você não tem permissão para essa ação.';
 if(code==='weak_password')return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.';
 const reference=typeof code==='string'&&/^[a-z0-9_]{1,60}$/i.test(code)?code:`HTTP ${status}`;
 return `Não foi possível concluir a ação (${reference}). Informe essa referência ao responsável para verificar o serviço.`;
}
async function request(path,{method='GET',body,authenticated=true,headers={},blob=false,expectedUser=null}={}) {
 if(!configured)throw Error('As contas ainda precisam ser conectadas ao banco de dados.');
 if(authenticated){await refresh();if(!session)throw Error('Entre na sua conta para continuar.');if(expectedUser&&session.user?.id!==expectedUser)throw Error('Sua conta mudou. Tente novamente.');}
 const requestHeaders={apikey:cloudConfig.publishableKey,...headers};
 if(authenticated)requestHeaders.Authorization=`Bearer ${session.access_token}`;
 if(body!==undefined && !(body instanceof Blob)){requestHeaders['Content-Type']='application/json';body=JSON.stringify(body);}
 let response;try {response=await fetch(base+path,{method,body,headers:requestHeaders,cache:'no-store',signal:AbortSignal.timeout(25000)});}catch{throw Error('Não foi possível conectar. Confira sua internet e tente novamente.');}
 if(!response.ok){const error=await response.json().catch(()=>({}));if(authenticated&&response.status===401){endSession();notifySessionChange();}const failure=Error(path.startsWith('/functions/v1/') && typeof error.message==='string'?error.message:friendly(error,response.status));failure.status=response.status;throw failure;}
 if(blob)return response.blob();
 if(response.status===204 || response.headers.get('content-length')==='0')return null;
 return response.text().then(value=>value?JSON.parse(value):null);
}
let refreshing=null;
async function refresh(){
 if(!session)return;
 if(sessionStore.isRemembered()){
  const latest=sessionStore.latest();
  if(!latest||latest.user?.id!==session.user?.id){endSession();notifySessionChange();throw Error('Sua sessão mudou. Entre novamente.');}
  session=latest;
 }
 if(session.expires_at>Date.now()/1000+60)return;
 if(!refreshing){const epoch=sessionEpoch;const run=async()=>{
  if(epoch!==sessionEpoch||!session)return;
  // Another tab may have already renewed the same saved session.
  if(sessionStore.isRemembered())session=sessionStore.latest();
  if(!session||session.expires_at>Date.now()/1000+60)return;
  try{const result=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token},authenticated:false});if(epoch===sessionEpoch)keepTokens(result);}
  catch(error){if(error.status===400||error.status===401||error.message.includes('sessão')||error.message.includes('permissão')){endSession();notifySessionChange();}throw error;}
 };
 const lock=globalThis.navigator?.locks;
 refreshing=(lock?lock.request('saldo-session-refresh:'+base,run):run()).finally(()=>{refreshing=null;});
 }
 return refreshing;
}
export const currentUser=()=>session?.user || null;
export async function restoreSession(){if(!session)return null;const epoch=sessionEpoch;const user=await request('/auth/v1/user');if(epoch!==sessionEpoch||!session)return null;keep({...session,user});return user;}
export async function login(email,password,{remember=false}={}){const result=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},authenticated:false});sessionEpoch++;keepTokens(result,remember);sessionStore.rememberUser(email,remember);return result.user;}
export async function signup(email,password,name,{remember=false}={}){const result=await request('/auth/v1/signup',{method:'POST',body:{email,password,data:{display_name:name}},authenticated:false});if(result.access_token){sessionEpoch++;keepTokens(result,remember);sessionStore.rememberUser(email,remember);}return Boolean(result.access_token);}
export async function logout(){try{await request('/auth/v1/logout',{method:'POST'});}finally{endSession();}}
export const resetPassword=email=>request(`/auth/v1/recover?redirect_to=${encodeURIComponent(location.href.split('#')[0])}`,{method:'POST',body:{email},authenticated:false});
export const changeEmail=email=>request(`/auth/v1/user?redirect_to=${encodeURIComponent(location.href.split('#')[0])}`,{method:'PUT',body:{email}});
export const sendEmail=body=>request('/functions/v1/send-email',{method:'POST',body});
export const changePassword=password=>request('/auth/v1/user',{method:'PUT',body:{password}});
export async function acceptRecovery(){const hash=new URLSearchParams(location.hash.slice(1));if(!hash.get('access_token'))return false;const recovery=hash.get('type')==='recovery';sessionEpoch++;keepTokens({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_in:Number(hash.get('expires_in'))||3600},false);history.replaceState(null,'',location.pathname+location.search);await restoreSession();return recovery;}
export const table=(name,query='',options={})=>request(`/rest/v1/${name}${query?'?'+query:''}`,options);
export async function allRows(name,query){const rows=[];for(let offset=0;;offset+=500){const batch=await table(name,`${query}&limit=500&offset=${offset}`);rows.push(...batch);if(batch.length<500)return rows;if(rows.length>=100000)throw Error('Volume muito grande para esta visualização. Reduza o período.');}}
export async function uploadAvatar(blob){const path=`${currentUser().id}/avatar.jpg`;await request(`/storage/v1/object/avatars/${path}`,{method:'POST',body:blob,headers:{'Content-Type':'image/jpeg','x-upsert':'true'}});return path;}
export const getAvatar=path=>request(`/storage/v1/object/authenticated/avatars/${path}`,{blob:true});

export async function checkReminderEmail(){await refresh();if(!session)throw Error('Entre na sua conta para ativar e-mail.');const response=await fetch('/.netlify/functions/reminder-config',{headers:{Authorization:`Bearer ${session.access_token}`},signal:AbortSignal.timeout(15000)});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.message||'Serviço de e-mail indisponível neste endereço.');}
export const syncBillReminders=(items,expectedUser)=>table('rpc/sync_bill_reminders','',{method:'POST',body:{items},expectedUser});
