import {parseExpenseText} from './assistant-parser.js';
import {amountToCents,validEntries} from './finance.js';
import {installments} from './planning-core.js';
const $=id=>document.getElementById(id);
export function createAssistant({context,save}){
 const dialog=$('assistant-dialog');let identity=null,version=0,draftId=null,busy=false;
 const message=value=>$('assistant-status').textContent=value;
 function reset(){version++;draftId=null;$('assistant-review').hidden=true;$('assistant-text').value='';$('assistant-source').textContent='';message('');}
 function syncIdentity(){if(identity!==context().identity){identity=context().identity;reset();if(dialog.open)dialog.close();}}
 function review(draft,source){draftId=crypto.randomUUID();$('assistant-source').textContent=source;$('ai-description').value=draft.description||'';$('ai-amount').value=draft.cents?(draft.cents/100).toFixed(2):'';$('ai-date').value=draft.date||'';$('ai-category').value=draft.category||'';$('ai-direction').value=draft.direction||'';$('ai-payment').value=draft.payment_method||'';$('ai-count').value=draft.installments??'';$('assistant-review').hidden=false;message(draft.notes||'Confira todos os campos antes de confirmar.');$('ai-description').focus();}
 $('assistant-open').onclick=()=>{syncIdentity();reset();$('ai-category').replaceChildren(new Option('Selecione',''));for(const category of context().categories)$('ai-category').add(new Option(category,category));dialog.showModal();$('assistant-text').focus();};
 $('assistant-close').onclick=()=>dialog.close();$('assistant-cancel').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{reset();$('assistant-open').focus();});
 $('assistant-text').oninput=()=>{version++;draftId=null;$('assistant-review').hidden=true;$('assistant-source').textContent='';message('');};
 $('assistant-demo').onclick=()=>{if(busy)return;version++;$('assistant-text').value='Gastei 85 reais no mercado hoje, no cartão de débito.';review({description:'Mercado',cents:8500,date:context().today,category:context().categories.includes('Alimentação')?'Alimentação':null,direction:'expense',payment_method:'debit',installments:1,notes:'Este é um exemplo preenchido sem IA. Se confirmar, ele será um lançamento real na SUA conta.'},'Demonstração sem IA');};
 $('assistant-ask').onsubmit=async event=>{event.preventDefault();if(busy)return;syncIdentity();const current=++version,owner=identity;draftId=null;$('assistant-review').hidden=true;busy=true;$('assistant-interpret').disabled=true;message('Interpretando… Nenhum lançamento foi salvo.');try{const draft=parseExpenseText($('assistant-text').value,context().today,context().categories);if(current===version&&identity===owner&&dialog.open)review(draft,'Leitura por regras · revise antes de salvar');}catch(error){if(current===version&&identity===owner&&dialog.open)message(error.message);}finally{busy=false;$('assistant-interpret').disabled=false;}};
 $('assistant-review').onsubmit=async event=>{event.preventDefault();if(busy||!draftId)return;syncIdentity();if(!draftId)return;const owner=identity,current=version;busy=true;$('assistant-confirm').disabled=true;try{const cents=amountToCents($('ai-amount').value);if(!cents)throw Error('Informe um valor total positivo válido.');const category=$('ai-category').value;if(!context().categories.includes(category))throw Error('Escolha uma categoria disponível.');const entry={id:draftId,description:$('ai-description').value.trim(),date:$('ai-date').value,cents,category,direction:$('ai-direction').value,payment_method:$('ai-payment').value,type:'variable',recurring:false};if(!validEntries([entry]))throw Error('Complete e confira os campos.');const count=Number($('ai-count').value);const rows=installments(entry,count);
 // Stable IDs also make a retry after an interrupted response safe.
 for(let i=0;i<rows.length;i++)rows[i].id=count===1?draftId:derivedId(draftId,i);
 if(identity!==owner||current!==version)throw Error('Sua conta ou o rascunho mudou. Abra novamente.');await save(rows);if(identity===owner&&current===version){draftId=null;$('assistant-review').hidden=true;$('assistant-source').textContent='';message(count>1?`${count} parcelas salvas na sua conta.`:'Lançamento salvo na sua conta.');}
 }catch(error){if(identity===owner&&current===version)message(error.message);}finally{busy=false;$('assistant-confirm').disabled=false;}};
 return {syncIdentity};
}
function derivedId(id,index){return id.slice(0,-4)+(index+1).toString(16).padStart(4,'0');}
