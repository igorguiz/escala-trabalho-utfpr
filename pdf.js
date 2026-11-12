/* Exportação PDF nativa, sem CDN: formato PDF 1.4, fontes padrão Helvetica. */
import {DATES_2026,MONTHS,WEEKDAYS,formatShortDate,getStatus} from './data.js';

const PAGE_W=595.28,PAGE_H=841.89;
const latinMap={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
function asLatin1(s){return [...String(s??'')].map(c=>{const n=c.codePointAt(0);return String.fromCharCode(n<=255?n:(latinMap[c]??63));}).join('');}
function esc(s){return asLatin1(s).replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)');}
function rgb(hex){const h=hex.replace('#','');return [0,2,4].map(n=>(parseInt(h.slice(n,n+2),16)/255).toFixed(3)).join(' ');}
function rect(x,y,w,h,color){return `${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;}
function line(x1,y1,x2,y2,color='#E3E7EC',width=0.5){return `${rgb(color)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;}
function txt(str,x,y,size=10,bold=false,color='#31373E'){
 return `${rgb(color)} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${esc(str)}) Tj ET\n`;
}
function shorten(text,length){const t=String(text||'');return t.length<=length?t:t.slice(0,length-3)+'...';}
function basePage(title,subtitle,page,amount){
 let c='';
 c+=rect(0,PAGE_H-15,PAGE_W,15,'#FECB29');
 c+=txt('UTFPR   |   CAMPUS LONDRINA',38,PAGE_H-48,11,true,'#373435');
 c+=txt('ESCALA DE TRABALHO - 2026',38,PAGE_H-71,17,true);
 c+=txt(title,38,PAGE_H-95,12,true,'#575D66');
 c+=txt(shorten(subtitle,100),38,PAGE_H-112,8,false,'#737B86');
 c+=line(38,48,PAGE_W-38,48);
 c+=txt('Escala gerada no PWA - versão beta | conferência administrativa necessária',38,33,7,false,'#737B86');
 c+=txt(`Página ${page} de ${amount}`,PAGE_W-103,33,7,false,'#737B86');
 return c;
}
function dayRows(rows,result){
 let c='';const cols=[38,96,171,284,397,557];
 let y=PAGE_H-146;
 c+=rect(38,y-24,519,24,'#373435');
 const heads=['Data','Dia','Servidor 1','Servidor 2','Situação'];
 for(let i=0;i<heads.length;i++)c+=txt(heads[i],cols[i]+6,y-16,8,true,'#FFFFFF');
 y-=24;
 for(let idx=0;idx<rows.length;idx++){
  const d=rows[idx],found=result.byDate[d.iso];
  const isOpen=d.status.type==='util';
  const first=found?.people[0],second=found?.people[1];
  const rowH=23;
  if(d.day===result.rotationDay && isOpen)c+=rect(38,y-rowH,519,rowH,'#FFF4D1');
  else if(!isOpen)c+=rect(38,y-rowH,519,rowH,'#F3F4F6');
  else if(idx%2===1)c+=rect(38,y-rowH,519,rowH,'#FAFAFB');
  const values=[formatShortDate(d.iso).slice(0,5),WEEKDAYS[d.day]||'',first?`${first.name} (${first.dept})`:'-',second?`${second.name} (${second.dept})`:'-',!isOpen?shorten(d.status.label,25):found?.issue?'PENDÊNCIA':d.day===result.rotationDay?'Rodízio':'Regular'];
  for(let i=0;i<values.length;i++)c+=txt(shorten(values[i],i===2||i===3?24:i===4?24:13),cols[i]+6,y-15.5,7.6,(i===4&&!isOpen),!isOpen?'#7E8792':'#31373E');
  c+=line(38,y-rowH,557,y-rowH);
  y-=rowH;
 }
 return {content:c,y};
}
function makeMonth(month,result,rotationDay,pagenum,allPages){
 const days=DATES_2026.filter(d=>d.month===month && d.day<5);
 const title=MONTHS[month].toUpperCase()+' / 2026';
 const subtitle=`Rodízio: ${WEEKDAYS[rotationDay]} | 2 servidores de setores distintos | Calendário administrativo`;
 let content=basePage(title,subtitle,pagenum,allPages);
 content+=dayRows(days,{...result,rotationDay}).content;
 return content;
}
function makeWeek(weekStart,result,rotationDay,page,allPages){
 const start=new Date(`${weekStart}T12:00:00Z`);
 const dates=[];
 for(let i=0;i<5;i++){const dt=new Date(start);dt.setUTCDate(start.getUTCDate()+i);const iso=dt.toISOString().slice(0,10);const d=DATES_2026.find(x=>x.iso===iso);if(d)dates.push(d);}
 let content=basePage(`SEMANA DE ${formatShortDate(weekStart)}`,`Rodízio: ${WEEKDAYS[rotationDay]} | Semana de referência: segunda a sexta`,page,allPages);
 content+=dayRows(dates,{...result,rotationDay}).content;
 return content;
}
function makeDay(date,result,rotationDay,page,allPages){
 const d=DATES_2026.find(x=>x.iso===date);
 let c=basePage(`DIA ${formatShortDate(date)}`,`Rodízio: ${WEEKDAYS[rotationDay]} | Consulta diária`,page,allPages);
 if(d)c+=dayRows([d],{...result,rotationDay}).content;
 return c;
}
function makeSummary(result,rotationDay,page,allPages){
 let c=basePage('RESUMO ANUAL E CRITÉRIOS',`Rodízio: ${WEEKDAYS[rotationDay]} | Estatísticas de 2026`,page,allPages);
 let y=PAGE_H-160;
 const metrics=[['Dias de expediente regular',result.regularDays],['Posições previstas (2 por dia)',result.slots],['Posições preenchidas',result.filled],['Vagas sem cobertura',result.slots-result.filled],['Alertas de distribuição',result.warnings.length]];
 for(const [label,value] of metrics){c+=txt(label,46,y,10,false);c+=txt(String(value),440,y,10,true);y-=27;}
 y-=20;c+=rect(38,y-27,519,27,'#373435');c+=txt('SERVIDOR',46,y-17,9,true,'#FFFFFF');c+=txt('DEPARTAMENTO',235,y-17,9,true,'#FFFFFF');c+=txt('TOTAL',396,y-17,9,true,'#FFFFFF');c+=txt('RODÍZIOS',468,y-17,9,true,'#FFFFFF');y-=27;
 for(const [i,p] of result.people.entries()){
  if(i%2===1)c+=rect(38,y-27,519,27,'#F6F7F8');
  c+=txt(p.name,46,y-18,9);c+=txt(p.dept,235,y-18,9);c+=txt(String(result.total[p.id]),403,y-18,9,true);c+=txt(String(result.rotationTotal[p.id]),480,y-18,9,true);y-=27;
 }
 y-=28;
 c+=txt('Atenção: preferências públicas e configuração do rodízio podem alterar o resultado.',42,y,8,false,'#747A82');
 c+=txt('Situações sem cobertura são exibidas como PENDÊNCIA, não como alocações fictícias.',42,y-16,8,false,'#747A82');
 return c;
}
function compilePDF(contents){
 const objects=[null];
 const add=s=>{objects.push(s);return objects.length-1;};
 const catalogId=add('');const pagesId=add('');const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const kids=[];
 for(const content of contents){
  const stream=add(`<< /Length ${asLatin1(content).length} >>\nstream\n${content}endstream`);
  const page=add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> /Contents ${stream} 0 R >>`);
  kids.push(page);
 }
 objects[catalogId]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
 objects[pagesId]=`<< /Type /Pages /Kids [${kids.map(k=>`${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
 let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const offsets=[0];
 for(let i=1;i<objects.length;i++){
  offsets[i]=out.length;out+=`${i} 0 obj\n${objects[i]}\nendobj\n`;
 }
 const xref=out.length;
 out+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
 for(let i=1;i<objects.length;i++)out+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
 out+=`trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 const bytes=Uint8Array.from(out,c=>c.charCodeAt(0)&255);
 return new Blob([bytes],{type:'application/pdf'});
}
export function generatePDF(result,state,view){
 const contents=[];
 const rotate=state.rotationDay;
 if(view.mode==='year'){
  for(let i=0;i<12;i++)contents.push(makeMonth(i,{...result,people:state.people},rotate,i+1,13));
  contents.push(makeSummary({...result,people:state.people},rotate,13,13));
 } else if(view.mode==='month')contents.push(makeMonth(view.month,result,rotate,1,1));
 else if(view.mode==='week')contents.push(makeWeek(view.week,result,rotate,1,1));
 else contents.push(makeDay(view.date,result,rotate,1,1));
 return compilePDF(contents);
}
export function downloadPDF(result,state,view){
 const file=generatePDF(result,state,view);
 const part=view.mode==='year'?'Anual':view.mode==='month'?MONTHS[view.month]:view.mode==='week'?`Semana_${view.week}`:`Dia_${view.date}`;
 const name=`Escala_UTFPR_2026_${part.replaceAll(' ','_')}.pdf`;
 const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
