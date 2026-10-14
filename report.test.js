import test from 'node:test';
import assert from 'node:assert/strict';
import {createReport} from './report.js';
const base={id:'1',description:'Aluguel (casa)',date:'2026-01-01',cents:125090,category:'Moradia',type:'fixed',recurring:true};
test('PDF válido estruturalmente, com totais recorrentes, escape e xref correto',async()=>{const pdf=createReport([base],'2026-02');assert.equal(pdf.type,'application/pdf');const content=await pdf.text();assert.ok(content.startsWith('%PDF-1.4'));assert.ok(content.includes('R$ 1.250,90'));assert.ok(content.includes('Aluguel \\050casa\\051'));const position=Number(content.match(/startxref\n(\d+)/)[1]);assert.equal(content.slice(position,position+4),'xref');assert.ok([...content].every(c=>c.charCodeAt(0)<128));});
test('relatório longo cria várias páginas e vazio continua exportável',async()=>{const entries=Array.from({length:100},(_,i)=>({...base,id:String(i),description:'Mercado '+i}));const content=await createReport(entries,'2026-02').text();assert.ok(Number(content.match(/\/Type \/Pages \/Count (\d+)/)[1])>1);assert.ok((await createReport([],'2026-02').text()).includes('Nenhum gasto'));assert.throws(()=>createReport([],'2026-13'));});
