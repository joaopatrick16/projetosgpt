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
export function createReport(entries,month,{appName="Saldo"}={}) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Mês inválido');
  const pages=[]; let commands=[],y=0;
  const text=(value,x,top,size=11,bold=false,color='0.16 0.20 0.28')=>commands.push(`BT /${bold?'F2':'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${842-top} Tm (${pdfText(value)}) Tj ET`);
  const line=top=>commands.push(`0.87 0.89 0.93 RG 0.5 w 48 ${842-top} m 547 ${842-top} l S`);
  const newPage=()=>{if(commands.length)pages.push(commands.join('\n'));commands=[];commands.push('0.06 0.09 0.16 rg 0 728 595 114 re f');text(String(appName).slice(0,32).toUpperCase(),48,46,12,true,'0.53 0.71 1');text('Seu panorama financeiro',48,77,24,true,'1 1 1');text(monthName(month),48,99,11,false,'0.75 0.82 0.94');y=145;};
  const ensure=height=>{if(y+height>770)newPage();};
  const heading=value=>{ensure(55);y+=12;text(value,48,y,15,true);y+=25;};
  const row=(label,value)=>{ensure(28);text(label,48,y);text(value,410,y,11,true);y+=13;line(y);y+=15;};
  newPage();const current=cashflow(entries,month),previous=totals(entries,shiftMonth(month,-1));
  text('TOTAL DO MÊS',48,y,10,true);y+=34;text(currency(current.total),48,y,32,true);y+=28;
  const change=current.total-previous.total;
  const comparison=previous.total ? `${Math.abs(change/previous.total*100).toFixed(1).replace('.',',')}% ${change>0?'a mais':change<0?'a menos':'de variação'} que no mês anterior (${currency(previous.total)}).` : 'Mês anterior sem gastos registrados para comparação.';
  text(comparison,48,y,11);y+=32;row('Gastos fixos',currency(current.fixed));row('Gastos variáveis',currency(current.variable));row('Entradas (créditos)',currency(current.income));row('Saldo do mês',currency(current.balance));
  heading('Sua evolução nos últimos seis meses');
  for(let i=-5;i<=0;i++){const m=shiftMonth(month,i);row(monthName(m),currency(totals(entries,m).total));}
  heading('Onde seu dinheiro foi');const selected=expensesForMonth(entries,month).filter(e=>e.direction!=='income'),categories=new Map();
  selected.forEach(e=>categories.set(e.category,(categories.get(e.category)||0)+e.cents));
  if(!selected.length){text('Nenhum gasto registrado neste mês.',48,y);y+=25;}
  for(const [category,cents] of [...categories].sort((a,b)=>b[1]-a[1])){const names=wrap(category,45);ensure(names.length*16+30);for(const name of names){text(name,48,y);y+=16;}text(`${currency(cents)}  (${(cents/current.total*100).toFixed(1).replace('.',',')}%)`,375,y-16,10,true);line(y);y+=16;}
  heading('Gastos do mês, por categoria');
  for(const [category] of [...categories].sort((a,b)=>b[1]-a[1])) {
    const categoryLines=wrap(category,60);ensure(categoryLines.length*18+85);for(const name of categoryLines){text(name,48,y,12,true,'0.20 0.36 0.65');y+=18;}
    for(const expense of selected.filter(e=>e.category===category).sort((a,b)=>a.date.localeCompare(b.date))){const descriptions=wrap(expense.description,54);ensure(descriptions.length*16+42);for(const description of descriptions){text(description,48,y,11,true);y+=16;}text(currency(expense.cents),440,y-16,11,true);const payments={credit:'Cartão de crédito',debit:'Débito',cash:'Dinheiro',transfer:'Transferência'};const detail=`${payments[expense.payment_method]||'Débito'} · ${expense.type==='fixed'?'Fixo':'Variável'} · ${expense.recurring?'Recorrente desde ':''}${expense.date.split('-').reverse().join('/')}`;text(detail,48,y,10,false,'0.42 0.46 0.52');y+=14;line(y);y+=18;}
  }
  const credits=expensesForMonth(entries,month).filter(e=>e.direction==='income');
  if(credits.length){heading('Entradas de dinheiro');for(const entry of credits){const lines=wrap(entry.description,54);ensure(lines.length*16+38);for(const description of lines){text(description,48,y,11,true);y+=16;}text(currency(entry.cents),440,y-16,11,true);text(`${entry.date.split('-').reverse().join('/')} · ${entry.category}`,48,y,10);y+=14;line(y);y+=18;}}
  ensure(70);y+=12;for(const note of wrap('Este relatório reúne despesas registradas e compromissos fixos recorrentes. Não confirma pagamentos nem representa seu saldo bancário.',80)){text(note,48,y,9,false,'0.42 0.46 0.52');y+=14;}
  pages.push(commands.join('\n'));
  const objects=[];const add=value=>{objects.push(value);return objects.length;};
  add('');add('');const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const ids=pages.map((content,index)=>{content+=`\nBT /F1 9 Tf 0.42 0.46 0.52 rg 1 0 0 1 48 35 Tm (${pdfText(String(appName).slice(0,32).toUpperCase()+'  |  Relatório pessoal')}) Tj ET`;content+=`\nBT /F1 9 Tf 1 0 0 1 475 35 Tm (${index+1} / ${pages.length}) Tj ET`;const stream=add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);return add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> /Contents ${stream} 0 R >>`);});
  objects[0]='<< /Type /Catalog /Pages 2 0 R >>';objects[1]=`<< /Type /Pages /Count ${ids.length} /Kids [${ids.map(id=>`${id} 0 R`).join(' ')}] >>`;
  let output='%PDF-1.4\n',offsets=[0];objects.forEach((object,index)=>{offsets.push(output.length);output+=`${index+1} 0 obj\n${object}\nendobj\n`;});const xref=output.length;output+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([output],{type:'application/pdf'});
}
