import {amountToCents} from './finance.js';
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const rules=[['Alimentação',/\b(mercado|supermercado|padaria|restaurante|lanche|ifood|cafe|almoco|jantar)\b/],['Transporte',/\b(uber|99|taxi|onibus|metro|gasolina|combustivel|estacionamento)\b/],['Moradia',/\b(aluguel|condominio|luz|energia|agua|internet)\b/],['Saúde',/\b(farmacia|remedio|consulta|medico|dentista|exame)\b/],['Lazer',/\b(cinema|passeio|show|jogo)\b/],['Educação',/\b(curso|livro|escola|faculdade|mensalidade escolar)\b/],['Assinaturas',/\b(netflix|spotify|assinatura)\b/]];
export function parseExpenseText(input,today,categories=[]){
 if(typeof input!=='string'||!input.trim()||input.length>1500)throw Error('Escreva um único movimento com até 1.500 caracteres.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today)||isNaN(Date.parse(today)))throw Error('Confira a data do aparelho.');
 const original=input.trim(),s=normalize(original),notes=[],masked=s.split('');
 const hide=(start,length)=>{for(let i=start;i<start+length;i++)masked[i]=' ';};
 const dates=[];
 for(const match of s.matchAll(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?)\b/g)){
  hide(match.index,match[0].length);let value=match[0];if(value.includes('/')){const [day,month,year=today.slice(0,4)]=value.split('/');value=`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;if(match[0].split('/').length===2)notes.push('Ano da data sugerido a partir do aparelho.');}dates.push(value);
 }
 for(const match of s.matchAll(/\b(anteontem|ontem|hoje|amanha)\b/g)){hide(match.index,match[0].length);const day=new Date(today+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+({anteontem:-2,ontem:-1,hoje:0,amanha:1}[match[0]]));dates.push(day.toISOString().slice(0,10));}
 let date=dates.length===1?dates[0]:null;
 if(date&&(isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)){date=null;notes.push('A data informada não existe.');}
 if(dates.length>1)notes.push('Há mais de uma data; escolha uma na revisão.');
 const counts=[];
 for(const match of s.matchAll(/\b(?:em\s+)?(\d{1,3})\s*(?:x\b|vezes\b|parcelas?\b)/g)){hide(match.index,match[0].length);counts.push(Number(match[1]));}
 const count=counts.length===0?1:counts.length===1&&counts[0]>=1&&counts[0]<=60?counts[0]:null;
 if(count===null)notes.push('Confira o parcelamento: use de 1 a 60 parcelas.');
 const amounts=[];
 const numeric=/(?<![\w])(?:r\$\s*)?([+-]?\d+(?:[.,]\d+)*)(?:\s*(?:reais|real)\b)?(?![\w]|[.,]\d)/g;
 for(const match of masked.join('').matchAll(numeric)){const raw=match[1];if(raw==='99'&&/\b(?:no|de|pelo)\s+99\b/.test(s)&&match.index===s.indexOf('99'))continue;let value=raw;if(value.includes(',')&&/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(value))value=value.replace(/\./g,'');else if(/^\d{1,3}(?:\.\d{3})+$/.test(value))value=value.replace(/\./g,'');amounts.push(amountToCents(value));hide(match.index,match[0].length);}
 let cents=amounts.length===1?amounts[0]:null;
 if(amounts.length>1)notes.push('Há vários números/valores. Informe só o valor total de um movimento.');
 if(/\b(cada|por parcela|parcelas? de|de entrada|mais juros)\b/.test(s)){cents=null;notes.push('Informe o valor TOTAL da compra na revisão; não calculamos juros ou valor por parcela.');}
 const paymentRules=[['credit',/\bcredito\b/],['debit',/\bdebito\b/],['cash',/\b(dinheiro|especie)\b/],['transfer',/\b(pix|transferencia)\b/]];
 const methods=paymentRules.filter(([,pattern])=>pattern.test(s)).map(([name])=>name);
 const income=/\b(recebi|recebido|salario|receita|rendimento|ganhei)\b/.test(s),expense=/\b(gastei|paguei|comprei|despesa|gasto|compra)\b/.test(s);
 const direction=income&&expense?null:income?'income':/\b(transferi|transferencia entre)\b/.test(s)?null:'expense';
 if(!income&&!expense&&direction==='expense')notes.push('Movimento sugerido como saída; confira.');
 const matches=rules.filter(([,pattern])=>pattern.test(s)).map(([name])=>name).filter(name=>categories.some(c=>normalize(c)===normalize(name)));
 let category=matches.length===1?categories.find(c=>normalize(c)===normalize(matches[0])):null;
 if(income)category=null;
 if(category)notes.push('Categoria sugerida por palavras-chave.');
 // Strip only recognized numeric/date spans and common payment/action phrases.
 let description=original.split('').map((c,i)=>masked[i]===' '&&s[i]!==' '? ' ':c).join('');
 description=description.replace(/\br\$|\breais?\b/gi,' ').replace(/\b(?:gastei|paguei|comprei|recebi|ganhei)\b/gi,' ').replace(/(?:no|na|com|pelo|via|por)?\s*(?:cart[aã]o\s*(?:de\s*)?)?(?:d[eé]bito|cr[eé]dito|dinheiro|esp[eé]cie|pix|transfer[eê]ncia)\b/gi,' ').replace(/^[\s,.:;!-]*(?:no|na|em|de|com|um|uma)\s+/i,'').replace(/\s+/g,' ').replace(/^[\s,.:;!-]+|[\s,.:;!-]+$/g,'').replace(/\s+(?:por|de|em|no|na|com|pelo|via)$/i,'').trim();
 if(description.length>80){description=description.slice(0,80);notes.push('Descrição abreviada para 80 caracteres.');}
 const missing=[];if(!description)missing.push('descrição');if(!cents)missing.push('valor total');if(!date)missing.push('data');if(!category)missing.push('categoria');if(!direction)missing.push('movimento');if(methods.length!==1)missing.push('forma de pagamento');if(count===null)missing.push('parcelas');if(missing.length)notes.push('Complete: '+missing.join(', ')+'.');
 return {description:description?description[0].toLocaleUpperCase('pt-BR')+description.slice(1):null,cents,date,category,direction,payment_method:methods.length===1?methods[0]:null,installments:count,notes:['Leitura por regras, sem IA. Revise antes de salvar.',...notes].join(' ')};
}
