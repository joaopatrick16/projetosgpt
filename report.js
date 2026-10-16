import {reportLogo} from './report-logo.js';
import {cashflow, totals, expensesForMonth, shiftMonth} from './finance.js';
const currency = cents => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100).replace(/\u00a0/g,' ');
const monthName = month => new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
// PDF uses built-in Helvetica and WinAnsi encoding: no remote fonts or libraries.
function pdfText(value) {
  const replacements = {'€':128,'‘':145,'’':146,'“':147,'”':148,'–':150,'—':151,'•':149};
  return [...String(value)].map(c => {let code=replacements[c] ?? c.charCodeAt(0); if(code>255)code=63; return code<32 || code>126 || '()\\'.includes(c) ? `\\${code.toString(8).padStart(3,'0')}` : c;}).join('');
}
function wrap(value, max=68) {
  const words=String(value).split(/\s+/), lines=[]; let line='';
  for(const word of words) {for(let i=0;i<word.length;i+=max) {const part=word.slice(i,i+max); if(line && line.length+part.length+1>max){lines.push(line);line='';} line+=(line?' ':'')+part;}}
  if(line)lines.push(line);return lines;
}
const widths=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
function textWidth(value,size){return [...String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'')].reduce((sum,c)=>sum+(widths[c.charCodeAt(0)-32]||556),0)*size/1000;}
export const exportDateLabel=date=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(date)+' (Brasília)';
export function createReport(entries,month,{appName="Serimora Finanças",exportedBy="Usuário local",scopeName="Dados deste aparelho",exportedAt=new Date()}={}) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Mês inválido');
  const pages=[]; let commands=[],y=0;
  const text=(value,x,top,size=11,bold=false,color='0.16 0.20 0.28')=>commands.push(`BT /${bold?'F2':'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${842-top} Tm (${pdfText(value)}) Tj ET`);
  const line=top=>commands.push(`0.75 0.85 0.91 RG 0.4 w 48 ${842-top} m 547 ${842-top} l S`);
  const title='Seu panorama financeiro';
  const footerLabels=[`Exportado por: ${String(exportedBy).slice(0,80)}`,`Dados de: ${String(scopeName).slice(0,100)}`,`Período: ${monthName(month)}`,`Exportado em: ${exportDateLabel(exportedAt)}`].flatMap(label=>{const lines=[];let part='';for(const char of label){if(textWidth(part+char,6.5)>300){lines.push(part);part='';}part+=char;}if(part)lines.push(part);return lines;});
  const rightText=(value,top,size=10,color='0.04 0.16 0.26')=>text(value,547-textWidth(value,size),top,size,false,color);
  const newPage=()=>{if(commands.length)pages.push(commands.join('\n'));commands=[];const cover=pages.length===0;commands.push('0.937 0.969 0.988 rg 0 0 595 842 re f');text(String(appName).slice(0,32).toUpperCase()+' /',48,55,8,false,'0.29 0.46 0.62');text('RELATÓRIO MENSAL',48,69,8,false,'0.29 0.46 0.62');commands.push(cover?'q 76 0 0 76 471 726 cm /Logo Do Q':'q 48 0 0 48 499 758 cm /Logo Do Q');text(title,(595-textWidth(title,cover?23:17))/2,cover?164:112,cover?23:17,false,'0 0.114 0.224');y=cover?228:152;};
  const ensure=height=>{if(y+height>710)newPage();};
  const heading=(value,space=100)=>{ensure(space);y+=12;text(value,48,y,12,true,'0 0.114 0.224');y+=25;};
  const row=(label,value,spacing=30)=>{ensure(spacing);text(label,48,y,10,false,'0.18 0.34 0.46');rightText(value,y);y+=13;line(y);y+=spacing-13;};
  newPage();const current=cashflow(entries,month),previous=totals(entries,shiftMonth(month,-1));
  text('TOTAL DE GASTOS',48,y,8,false,'0.18 0.34 0.46');y+=40;text(currency(current.total),48,y,32,true,'0 0.114 0.224');y+=62;
  row('Entradas',currency(current.income),44);row('Fixos',currency(current.fixed),44);row('Variáveis',currency(current.variable),44);row('Saldo',currency(current.balance),44);
  // Keep the first page as a minimal summary; details follow on separate pages.
  newPage();
  const change=current.total-previous.total;
  const comparison=previous.total ? `${Math.abs(change/previous.total*100).toFixed(1).replace('.',',')}% ${change>0?'a mais':change<0?'a menos':'de variação'} que no mês anterior (${currency(previous.total)}).` : 'Mês anterior sem gastos registrados para comparação.';
  text(comparison,48,y,9,false,'0.29 0.46 0.62');y+=26;
  heading('Sua evolução nos últimos seis meses');
  for(let i=-5;i<=0;i++){const m=shiftMonth(month,i);row(monthName(m),currency(totals(entries,m).total));}
  heading('Onde seu dinheiro foi');const selected=expensesForMonth(entries,month).filter(e=>e.direction!=='income'),categories=new Map();
  selected.forEach(e=>categories.set(e.category,(categories.get(e.category)||0)+e.cents));
  if(!selected.length){text('Nenhum gasto registrado neste mês.',48,y);y+=25;}
  for(const [category,cents] of [...categories].sort((a,b)=>b[1]-a[1])){const names=wrap(category,45);ensure(names.length*16+30);for(const name of names){text(name,48,y);y+=16;}text(`${currency(cents)}  (${(cents/current.total*100).toFixed(1).replace('.',',')}%)`,375,y-16,10,true);line(y);y+=16;}
  heading('Gastos do mês, por categoria',180);
  for(const [category] of [...categories].sort((a,b)=>b[1]-a[1])) {
    const categoryLines=wrap(category,60);ensure(categoryLines.length*18+85);for(const name of categoryLines){text(name,48,y,11,true,'0.18 0.34 0.46');y+=18;}
    for(const expense of selected.filter(e=>e.category===category).sort((a,b)=>a.date.localeCompare(b.date))){const descriptions=wrap(expense.description,54);ensure(descriptions.length*16+42);for(const description of descriptions){text(description,48,y,11,true);y+=16;}rightText(currency(expense.cents),y-16,11);const payments={credit:'Cartão de crédito',debit:'Débito',cash:'Dinheiro',transfer:'Transferência'};const detail=`${payments[expense.payment_method]||'Débito'} · ${expense.type==='fixed'?'Fixo':'Variável'} · ${expense.recurring?'Recorrente desde ':''}${expense.date.split('-').reverse().join('/')}`;text(detail,48,y,10,false,'0.42 0.46 0.52');y+=14;line(y);y+=18;}
  }
  const credits=expensesForMonth(entries,month).filter(e=>e.direction==='income');
  if(credits.length){heading('Entradas de dinheiro');for(const entry of credits){const lines=wrap(entry.description,54);ensure(lines.length*16+38);for(const description of lines){text(description,48,y,11,true);y+=16;}rightText(currency(entry.cents),y-16,11);text(`${entry.date.split('-').reverse().join('/')} · ${entry.category}`,48,y,10);y+=14;line(y);y+=18;}}
  pages.push(commands.join('\n'));
  const objects=[];const add=value=>{objects.push(value);return objects.length;};
  add('');add('');const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const logo=add(`<< /Type /XObject /Subtype /Image /Width ${reportLogo.width} /Height ${reportLogo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${reportLogo.hex.length+1} >>\nstream\n${reportLogo.hex}>\nendstream`);
  const ids=pages.map((content,index)=>{let top=810-(footerLabels.length-1)*8;for(const label of footerLabels){content+=`\nBT /F1 6.5 Tf 0.20 0.36 0.50 rg 1 0 0 1 ${547-textWidth(label,6.5)} ${842-top} Tm (${pdfText(label)}) Tj ET`;top+=8;}content+=`\nBT /F1 7 Tf 0.29 0.46 0.62 rg 1 0 0 1 48 32 Tm (${index+1} / ${pages.length}) Tj ET`;const stream=add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);return add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Logo ${logo} 0 R >> /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> /Contents ${stream} 0 R >>`);});
  objects[0]='<< /Type /Catalog /Pages 2 0 R >>';objects[1]=`<< /Type /Pages /Count ${ids.length} /Kids [${ids.map(id=>`${id} 0 R`).join(' ')}] >>`;
  let output='%PDF-1.4\n',offsets=[0];objects.forEach((object,index)=>{offsets.push(output.length);output+=`${index+1} 0 obj\n${object}\nendobj\n`;});const xref=output.length;output+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([output],{type:'application/pdf'});
}
