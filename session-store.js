// Session tokens only. Passwords are never persisted by the app.
export function createSessionStore({key,local,tab}) {
  const preferenceKey=key+':remembered-user';
  let remembered=false;
  const read=(storage,name)=>{try{return JSON.parse(storage?.getItem(name)||'null');}catch{return null;}};
  const remove=(storage,name)=>{try{storage?.removeItem(name);}catch{}};
  const valid=value=>value&&typeof value.access_token==='string'&&typeof value.refresh_token==='string'&&Number.isFinite(value.expires_at);
  function load(){const temporary=read(tab,key),persistent=read(local,key);if(valid(temporary)){remembered=false;return temporary;}if(valid(persistent)){remembered=true;return persistent;}return null;}
  function latest(){const value=read(remembered?local:tab,key);return valid(value)?value:null;}
  function save(value,remember=remembered){
    // Whitelist fields instead of storing the entire authentication response.
    const data={access_token:value.access_token,refresh_token:value.refresh_token,expires_at:value.expires_at,...(value.user?{user:{id:value.user.id,email:value.user.email}}:{})};
    if(remember){try{if(!local)throw Error();local.setItem(key,JSON.stringify(data));}catch{throw Error('Não foi possível lembrar sua sessão neste navegador. Desmarque a opção para entrar apenas nesta aba.');}remove(tab,key);}
    else{try{tab?.setItem(key,JSON.stringify(data));}catch{/* Temporary session remains in memory. */}remove(local,key);}
    remembered=remember;return data;
  }
  function rememberUser(email,enabled){if(!enabled){remove(local,preferenceKey);return;}try{local?.setItem(preferenceKey,JSON.stringify({email}));}catch{}}
  function preference(){const value=read(local,preferenceKey);return typeof value?.email==='string'&&value.email.length<=254?value.email:'';}
  function clear(){remove(local,key);remove(tab,key);remembered=false;}
  return {load,latest,save,clear,rememberUser,preference,isRemembered:()=>remembered};
}
