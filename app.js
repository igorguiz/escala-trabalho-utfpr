import {YEAR,WEEKDAYS,MONTHS,PEOPLE,CALENDAR,DATES_2026,defaultState,sanitizeState,formatShortDate,weekdayIndex,getStatus} from './data.js';
import {generateSchedule,validateSchedule} from './scheduler.js';
import {downloadPDF} from './pdf.js';
import {isShared,getLocal,saveLocal,fetchShared,saveSharedPerson,saveSharedRotation,downloadJSON} from './sync.js';

const root=document.getElementById('view-root');
const toastEl=document.getElementById('toast');
const fileEl=document.getElementById('import-file');
const navText={escala:'Escala de trabalho',disponibilidade:'Disponibilidades',resumo:'Resumo anual',calendario:'Calendário administrativo'};
let state=getLocal();
let schedule=generateSchedule(state);
let nav='escala';
let display={mode:'month',month:10,week:'2026-11-09',date:'2026-11-12'};
let personId='leticia';
let draft=null;let dirty=false;
const weekStarts=Array.from(new Set(DATES_2026.filter(d=>d.day<5).map(d=>{
 const dt=new Date(`${d.iso}T12:00:00Z`);dt.setUTCDate(dt.getUTCDate()-d.day);return dt.toISOString().slice(0,10);
})));
if(!weekStarts.includes(display.week))display.week=weekStarts[0];
let currentStatus=isShared?'Conectando...':'Dados neste navegador';
let statusError=false;
let toastTimer;

const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function icon(name){
 const shapes={download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',upload:'<path d="M12 21V9m-5 5 5-5 5 5M4 7V3h16v4"/>',refresh:'<path d="M20 11a8 8 0 0 0-14-5L3 9m0-6v6h6M4 13a8 8 0 0 0 14 5l3-3m0 6v-6h-6"/>',check:'<path d="m4 12 5 5L20 6"/>',save:'<path d="M4 3h13l4 4v14H3V3h1m3 0v7h10V3M6 21v-8h12v8"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',settings:'<path d="M12 3v18M3 12h18"/>'};
 return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.check}</svg>`;
}
function notify(msg,isErr=false){toastEl.textContent=msg;toastEl.className=`toast show${isErr?' error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),3600);}
function refreshStatus(){const el=document.getElementById('sync-status');el.className='status'+(statusError?' error':isShared?' shared':'');el.innerHTML=`<span class="status-dot"></span>${esc(currentStatus)}`;}
function calculate(){schedule=generateSchedule(state);saveLocal(state);}
function monthOptions(){return MONTHS.map((name,i)=>`<option value="${i}"${display.month===i?' selected':''}>${name}</option>`).join('');}
function weekOptions(){return weekStarts.map(start=>`<option value="${start}"${display.week===start?' selected':''}>Semana de ${formatShortDate(start)}</option>`).join('');}
function personById(id){return state.people.find(p=>p.id===id);}
function displayPerson(p){return p?`<span class="person">${esc(p.name)}</span><span class="dept-tag ${p.dept}">${p.dept}</span>`:'<span class="muted">—</span>';}
function badges(){return `<div class="legend"><span><i class="regular"></i>Expediente</span><span><i class="rot"></i>Rodízio</span><span><i class="break"></i>Feriado / recesso</span><span><i class="miss"></i>Pendência</span></div>`;}
function labelDay(d){return WEEKDAYS[d.day]||'';}
function renderRows(days){
 return `<div class="table-wrap"><table class="schedule-table"><thead><tr><th>Data</th><th>Dia</th><th>Servidor 1</th><th>Servidor 2</th><th>Situação</th></tr></thead><tbody>${days.map(d=>{
 const row=schedule.byDate[d.iso];const blocked=d.status.type!=='util';const rotation=!blocked && d.day===state.rotationDay;
 let stat=blocked?`<span class="chip chip-gray">${esc(d.status.type==='especial'?'Horário especial':d.status.type==='fimdesemana'?'Fim de semana':d.status.label)}</span>`:row?.issue?'<span class="chip chip-red">Pendência</span>':rotation?'<span class="chip chip-yellow">↻ Rodízio</span>':'<span class="chip">Regular</span>';
 return `<tr class="${blocked?'blocked':row?.issue?'issue':rotation?'rotation':''}"><td><div class="date-primary">${formatShortDate(d.iso)}</div></td><td>${labelDay(d)}</td><td>${blocked?'—':displayPerson(row?.people[0])}</td><td>${blocked?'—':displayPerson(row?.people[1])}</td><td>${stat}</td></tr>`;
 }).join('')}</tbody></table></div>`;
}
function dayCalendarRows(){
 if(display.mode==='month')return DATES_2026.filter(d=>d.month===display.month&&d.day<5);
 if(display.mode==='week'){
  const start=new Date(`${display.week}T12:00:00Z`);
  const ds=[];
  for(let i=0;i<5;i++){const dt=new Date(start);dt.setUTCDate(start.getUTCDate()+i);const iso=dt.toISOString().slice(0,10);const found=DATES_2026.find(d=>d.iso===iso);if(found)ds.push(found);}
  return ds;
 }
 const found=DATES_2026.find(d=>d.iso===display.date);return found?[found]:[];
}
function renderSchedule(){
 const warnings=schedule.warnings;
 const weekLabel=display.mode==='month'?`${MONTHS[display.month]} de 2026`:display.mode==='week'?`Semana de ${formatShortDate(display.week)}`:display.mode==='day'?`Consulta do dia ${formatShortDate(display.date)}`:'Ano de 2026';
 const cards=[
  ['Dias úteis',''+schedule.regularDays,'Conforme calendário administrativo','▦'],
  ['Postos preenchidos',`${schedule.filled} / ${schedule.slots}`,'Dois servidores por dia','◉'],
  ['Terças / rodízio',WEEKDAYS[state.rotationDay],'Dia configurável','↻'],
  ['Pendências',String(schedule.slots-schedule.filled),'Vagas sem cobertura','!']
 ];
 root.innerHTML=`
 <section class="hero"><div><div class="eyebrow">PLANEJAMENTO ANUAL · 2026</div><h1>Escala de trabalho</h1><p>Distribuição inteligente de servidores com respeito às disponibilidades, aos departamentos e ao calendário administrativo.</p></div><div class="hero-btns"><button class="btn" data-action="refresh">${icon('refresh')} Atualizar</button><button class="btn btn-primary" data-action="download-pdf">${icon('download')} Baixar PDF</button></div></section>
 <section class="stats-grid">${cards.map(([label,value,sub,sym])=>`<div class="stat-card"><div class="label">${label}<span class="icon-slab">${sym}</span></div><div class="value">${esc(value)}</div><div class="sub">${sub}</div></div>`).join('')}</section>
 <section class="card"><div class="card-heading"><div><h2>Configuração da escala</h2><p>Altere o dia do rodízio; a escala será recalculada automaticamente.</p></div><span class="chip chip-yellow">Personalizável</span></div><div class="config-grid"><div class="form-field"><label for="rotation-day">Dia do rodízio</label><select class="input" id="rotation-day">${WEEKDAYS.map((x,i)=>`<option value="${i}"${state.rotationDay===i?' selected':''}>${x}-feira</option>`).join('')}</select></div><div class="form-field"><label>Ano da escala</label><input class="input" disabled value="2026" /></div><div class="form-field"><label>Critério diário</label><input class="input" disabled value="2 servidores / dia" /></div><button class="btn" data-action="edit-availability">${icon('settings')} Disponibilidades</button></div><div class="hint-box"><strong>Regras fixas:</strong> Igor apenas às quintas e fora do rodízio; Vanessa nunca às quartas; dois departamentos distintos por dia. No dia de rodízio, os demais servidores podem ser escalados fora de suas disponibilidades habituais, salvo bloqueios específicos. ${state.rotationDay===3?'<br><strong>Atenção:</strong> na quinta-feira de rodízio, Igor mantém seu dia fixo; isso impede a escala de Vanessa ou Letícia com ele (todos do DEPRO).':' '}${state.rotationDay===4?'<br><strong>Atenção:</strong> com rodízio na sexta, a participação de Letícia tende a se concentrar nesse dia, dadas as disponibilidades atuais.':''}</div></section>
 <section class="card"><div class="card-heading"><div><h2>Visualização da escala</h2><p>Consulte o detalhamento diretamente nesta página ou exporte a seleção atual.</p></div><span class="chip">${schedule.filled===schedule.slots?'Todos os postos preenchidos':schedule.slots-schedule.filled+' vagas a conferir'}</span></div>
 <div class="filters"><div class="segmented" role="group" aria-label="Modo de visualização">${[['day','Diária'],['week','Semanal'],['month','Mensal'],['year','Anual']].map(([id,lab])=>`<button data-view="${id}" class="${display.mode===id?'active':''}" aria-pressed="${display.mode===id}">${lab}</button>`).join('')}</div><div class="form-field">${display.mode==='month'?`<label for="select-month">Mês</label><select id="select-month" class="input">${monthOptions()}</select>`:display.mode==='week'?`<label for="select-week">Semana</label><select id="select-week" class="input">${weekOptions()}</select>`:display.mode==='day'?`<label for="select-day">Data</label><input id="select-day" type="date" class="input" min="2026-01-01" max="2026-12-31" value="${display.date}"/>`:'<span class="hint">12 meses · 2026</span>'}</div></div>
 ${badges()}
 <div class="table-header"><div><h2>${weekLabel}</h2><p>Escala por dia, com departamentos e marcação de rodízio.</p></div><button class="btn btn-sm" data-action="download-pdf">${icon('download')} PDF desta visualização</button></div>
 ${display.mode==='year'?MONTHS.map((m,i)=>{const days=DATES_2026.filter(d=>d.month===i && d.day<5);return `<details class="year-month" ${i===10?'open':''}><summary>${m} <span class="count-label">${days.filter(d=>d.status.type==='util').length} dias úteis</span></summary>${renderRows(days)}</details>`;}).join(''):renderRows(dayCalendarRows())}
 <p class="subfoot">As linhas em amarelo correspondem ao dia de rodízio escolhido. Dias sem expediente permanecem visíveis, mas não recebem servidores. O PDF é gerado com os mesmos dados exibidos.</p></section>
 ${warnings.length?`<section class="card"><div class="card-heading"><h2>Avisos da distribuição (${warnings.length})</h2></div><ul class="alert-list">${warnings.slice(0,20).map(w=>`<li>${esc(w)}</li>`).join('')}${warnings.length>20?`<li>E mais ${warnings.length-20} aviso(s).</li>`:''}</ul></section>`:''}
 `;
}
function dayShort(days){return days.length?days.map(d=>WEEKDAYS[d].slice(0,3)).join(' · '):'Nenhum dia definido';}
function getDraft(){return draft||JSON.parse(JSON.stringify(personById(personId)));}
function renderAvailability(){
 const p=getDraft();
 root.innerHTML=`
 <section class="hero"><div><div class="eyebrow">PARTICIPAÇÃO PÚBLICA</div><h1>Disponibilidades</h1><p>Selecione os dias desejados de cada servidor e registre exceções por data. A escala será atualizada após salvar.</p></div><div class="hero-btns"><button class="btn" data-action="export-json">${icon('download')} Exportar JSON</button><button class="btn" data-action="import-json">${icon('upload')} Importar JSON</button></div></section>
 <div class="info-ribbon">${isShared?'Sincronização compartilhada ativa. Todas as pessoas podem consultar e alterar as disponibilidades sem login.':'Modo beta local: as alterações ficam neste navegador. Para compartilhar preferências entre dispositivos, é necessário configurar o banco Supabase conforme o arquivo README.'}</div>
 <h2 class="section-title">Selecione um servidor</h2><div class="people-grid">${state.people.map(person=>`<button type="button" data-person="${person.id}" class="person-card ${personId===person.id?'active':''}"><span class="person-avatar">${person.name.slice(0,2).toUpperCase()}</span><span><strong>${esc(person.name)}</strong><small>${person.dept}</small></span><span class="dayline">${dayShort(person.days)}</span></button>`).join('')}</div>
 <div class="two-col"><section class="card"><div class="card-heading"><div><h2>${esc(p.name)} · ${p.dept}</h2><p>Disponibilidade semanal habitual</p></div></div><div class="weekday-options">${WEEKDAYS.map((name,i)=>{
 const disabled=(p.id==='igor')||(p.id==='vanessa'&&i===2);
 return `<label class="weekday-check"><input type="checkbox" data-weekday="${i}" ${p.days.includes(i)?'checked':''} ${disabled?'disabled':''}/><span>${name.slice(0,3)}</span><i class="checkbox-art"></i></label>`;
 }).join('')}</div><div class="divider"></div><p class="intro-note">O rodízio (${WEEKDAYS[state.rotationDay]}) amplia a disponibilidade dos participantes, exceto Igor. Um bloqueio por data específica sempre prevalece. Vanessa não pode trabalhar às quartas-feiras.</p><div class="divider"></div><button class="btn btn-primary" data-action="save-person">${icon('save')} Salvar disponibilidade</button><span style="margin-left:12px;font-size:11px;color:#9a7d24">${dirty?'Alterações não salvas':''}</span></section>
 <section class="card"><div class="card-heading"><div><h2>Exceções por data</h2><p>Para férias, impedimentos ou disponibilidades pontuais.</p></div></div><div class="date-form"><div class="form-field"><label for="exception-date">Data em 2026</label><input class="input" type="date" id="exception-date" min="2026-01-01" max="2026-12-31" value="2026-11-12"/></div><div class="form-field"><label for="exception-type">Condição</label><select class="input" id="exception-type"><option value="off">Não posso trabalhar</option><option value="on">Estou disponível</option></select></div><button class="btn" data-action="add-exception">+ Adicionar</button></div><div class="exceptions">${Object.entries(p.exceptions).sort(([a],[b])=>a.localeCompare(b)).map(([date,v])=>`<span class="exception-tag ${v}">${formatShortDate(date)} · ${v==='off'?'Indisponível':'Disponível'}<button type="button" aria-label="Remover exceção ${date}" data-remove-exception="${date}">×</button></span>`).join('')||'<p class="hint">Nenhuma exceção cadastrada.</p>'}</div><div class="divider"></div><p class="hint">Adicionar uma exceção não salva automaticamente. Clique em <strong>Salvar disponibilidade</strong> para aplicá-la à escala. Datas de feriado ou recesso não são abertas por exceções.</p></section></div>`;
}
function renderSummary(){
 const max=Math.max(1,...Object.values(schedule.total));
 root.innerHTML=`<section class="hero"><div><div class="eyebrow">DISTRIBUIÇÃO ANUAL</div><h1>Resumo de comparecimentos</h1><p>Avalie a distribuição total e as participações no rodízio ao longo de 2026.</p></div><div class="hero-btns"><button class="btn btn-primary" data-action="download-annual">${icon('download')} PDF anual</button></div></section>
 <section class="stats-grid"><div class="stat-card"><div class="label">Servidores</div><div class="value">${state.people.length}</div><div class="sub">3 departamentos</div></div><div class="stat-card"><div class="label">Dias regulares</div><div class="value">${schedule.regularDays}</div><div class="sub">Conforme o calendário</div></div><div class="stat-card"><div class="label">Comparecimentos</div><div class="value">${schedule.filled}</div><div class="sub">Somatório de todos os servidores</div></div><div class="stat-card"><div class="label">Vagas pendentes</div><div class="value">${schedule.slots-schedule.filled}</div><div class="sub">Sem cobertura</div></div></section>
 <section class="card"><div class="card-heading"><div><h2>Total de comparecimentos por servidor</h2><p>O equilíbrio depende das disponibilidades individuais e do dia de rodízio selecionado.</p></div></div>${state.people.map(p=>`<div class="bar-row"><span class="name">${esc(p.name)}</span><span class="hint">${p.dept}</span><div class="bar-bg"><div class="bar-fill" style="width:${Math.max(0,(schedule.total[p.id]/max)*100).toFixed(1)}%"></div></div><span class="bar-number"><b>${schedule.total[p.id]}</b> dias</span></div>`).join('')}</section>
 <section class="card"><div class="card-heading"><div><h2>Participações no rodízio · ${WEEKDAYS[state.rotationDay]}</h2><p>Igor não integra o rodízio. Vanessa é excluída das quartas-feiras.</p></div></div><div class="table-wrap"><table class="schedule-table"><thead><tr><th>Servidor</th><th>Departamento</th><th>Total anual</th><th>Rodízios</th></tr></thead><tbody>${state.people.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${p.dept}</td><td>${schedule.total[p.id]}</td><td><b>${schedule.rotationTotal[p.id]}</b></td></tr>`).join('')}</tbody></table></div></section>${schedule.warnings.length?`<section class="info-ribbon red"><b>${schedule.warnings.length} aviso(s) de distribuição.</b> Consulte a escala para identificar semanas nas quais nem todos puderam comparecer.</section>`:'<section class="info-ribbon">Nenhum conflito detectado com a configuração atual.</section>'}`;
}
function renderCalendar(){
 const types={feriado:'Feriado',recesso:'Recesso administrativo',local:'Feriado/recesso local',especial:'Horário especial'};
 const entries=DATES_2026.filter(d=>d.status.type!=='util'&&d.status.type!=='fimdesemana');
 root.innerHTML=`<section class="hero"><div><div class="eyebrow">BASE DO PLANEJAMENTO</div><h1>Calendário administrativo</h1><p>Datas transcritas do calendário de 2026 fornecido para a elaboração da escala.</p></div><div class="hero-btns"><button class="btn" data-action="go-schedule">${icon('calendar')} Voltar à escala</button></div></section><section class="stats-grid"><div class="stat-card"><div class="label">Dias de expediente</div><div class="value">${schedule.regularDays}</div><div class="sub">Segunda a sexta-feira</div></div><div class="stat-card"><div class="label">Dias sem escala</div><div class="value">${DATES_2026.filter(d=>d.day<5&&d.status.type!=='util').length}</div><div class="sub">Inclui horário especial</div></div><div class="stat-card"><div class="label">Mês inicial</div><div class="value">JAN</div><div class="sub">2026</div></div><div class="stat-card"><div class="label">Mês final</div><div class="value">DEZ</div><div class="sub">2026</div></div></section><div class="info-ribbon">De 21 a 31 de dezembro há horário especial de funcionamento. Por padrão, esses dias não são incluídos na escala ordinária. A chefia pode definir uma escala específica para esse período.</div><section class="card"><div class="card-heading"><h2>Feriados, recessos e período especial</h2><span class="hint">${entries.length} datas no calendário</span></div><div class="calendar-list">${entries.map(d=>`<div class="calendar-item ${d.status.type}"><span class="cal-day">${formatShortDate(d.iso).slice(0,5)}</span><span class="cal-label"><b>${types[d.status.type]}</b> · ${esc(d.status.label)}</span></div>`).join('')}</div></section>`;
}
function render(){document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===nav));document.getElementById('page-breadcrumb').textContent=navText[nav];refreshStatus();
 if(nav==='escala')renderSchedule();else if(nav==='disponibilidade')renderAvailability();else if(nav==='resumo')renderSummary();else renderCalendar();
}
async function syncRemote(){
 if(!isShared){currentStatus='Dados neste navegador';refreshStatus();return;}
 if(dirty)return;
 try{currentStatus='Sincronizando...';refreshStatus();const loaded=await fetchShared();state=loaded;calculate();statusError=false;currentStatus='Dados compartilhados';render();}
 catch(e){statusError=true;currentStatus='Sem sincronização';refreshStatus();notify(`Acesso ao banco não disponível: ${e.message}`,true);}
}
async function changeRotation(day){
 if(!Number.isInteger(day)||day<0||day>4)return;
 state.rotationDay=day;calculate();render();notify('Escala recalculada para rodízio na '+WEEKDAYS[day].toLowerCase()+'-feira.');
 if(isShared)try{await saveSharedRotation(day);currentStatus='Dados compartilhados';statusError=false;refreshStatus();}catch(e){notify('Alteração aplicada localmente; não foi salva no banco: '+e.message,true);statusError=true;currentStatus='Sem sincronização';refreshStatus();}
}
async function savePerson(){
 if(!draft){notify('Nenhuma alteração pendente.');return;}
 state.people=state.people.map(p=>p.id===draft.id?structuredClone(draft):p);calculate();dirty=false;draft=null;render();notify('Disponibilidade de '+personById(personId).name+' salva. Escala recalculada.');
 if(isShared){try{await saveSharedPerson(personById(personId));currentStatus='Dados compartilhados';statusError=false;refreshStatus();notify('Disponibilidade salva para todos os dispositivos.');}catch(e){statusError=true;currentStatus='Sem sincronização';refreshStatus();notify('Salvo neste navegador, mas falhou o compartilhamento: '+e.message,true);}}
}
function addException(){
 const date=document.getElementById('exception-date')?.value;
 const type=document.getElementById('exception-type')?.value;
 if(!/^2026-\d{2}-\d{2}$/.test(date||'')||!DATES_2026.some(d=>d.iso===date)){notify('Informe uma data válida em 2026.',true);return;}
 const p=getDraft();
 if(p.id==='igor' && weekdayIndex(date)!==3 && type==='on'){notify('Igor só pode ser escalado às quintas-feiras.',true);return;}
 if(p.id==='vanessa' && weekdayIndex(date)===2 && type==='on'){notify('Vanessa não pode ser escalada às quartas-feiras.',true);return;}
 if(getStatus(date).type!=='util'){notify('Esta data não possui expediente regular; a exceção será registrada mas não abrirá a escala.');}
 p.exceptions[date]=type;draft=p;dirty=true;renderAvailability();
}
function changeWeekday(idx,checked){
 const p=getDraft();
 if(p.id==='igor'){notify('Disponibilidade de Igor é fixa nas quintas-feiras.');return;}
 if(p.id==='vanessa'&&idx===2)return;
 const set=new Set(p.days);checked?set.add(idx):set.delete(idx);p.days=[...set].sort();draft=p;dirty=true;renderAvailability();
}
function exportCurrent(){downloadPDF(schedule,state,display);notify('Download do PDF solicitado.');}
function applyImport(file){
 if(!file)return;
 if(isShared){notify('Importar JSON está desabilitado no modo compartilhado para evitar substituir as escolhas coletivas.',true);return;}
 const reader=new FileReader();reader.onload=()=>{
  try{const v=JSON.parse(reader.result);if(v.year!==2026||!Array.isArray(v.people))throw new Error('Estrutura diferente da esperada.');state=sanitizeState(v);calculate();draft=null;dirty=false;render();notify('Configuração importada e escala atualizada.');}
  catch(e){notify('Não foi possível importar: '+e.message,true);}
 };reader.readAsText(file);
}
root.addEventListener('click',e=>{
 const btn=e.target.closest('button');if(!btn)return;
 if(btn.dataset.view){display.mode=btn.dataset.view;renderSchedule();return;}
 if(btn.dataset.person){if(dirty && !window.confirm('Descartar alterações não salvas?'))return;personId=btn.dataset.person;draft=null;dirty=false;renderAvailability();return;}
 if(btn.dataset.removeException){const p=getDraft();delete p.exceptions[btn.dataset.removeException];draft=p;dirty=true;renderAvailability();return;}
 switch(btn.dataset.action){
  case 'download-pdf':exportCurrent();break;
  case 'download-annual':downloadPDF(schedule,state,{mode:'year'});notify('PDF anual solicitado.');break;
  case 'edit-availability':nav='disponibilidade';render();break;
  case 'go-schedule':nav='escala';render();break;
  case 'refresh':isShared?syncRemote():(calculate(),render(),notify('Escala recalculada.'));break;
  case 'save-person':savePerson();break;
  case 'add-exception':addException();break;
  case 'import-json':fileEl.click();break;
  case 'export-json':downloadJSON(state);notify('Configuração JSON exportada.');break;
 }
});
root.addEventListener('change',e=>{
 const el=e.target;
 if(el.id==='rotation-day'){changeRotation(Number(el.value));return;}
 if(el.id==='select-month'){display.month=Number(el.value);renderSchedule();return;}
 if(el.id==='select-week'){display.week=el.value;renderSchedule();return;}
 if(el.id==='select-day'){if(DATES_2026.some(d=>d.iso===el.value)){display.date=el.value;renderSchedule();}else notify('Selecione uma data de 2026.',true);return;}
 if(el.matches('input[data-weekday]')){changeWeekday(Number(el.dataset.weekday),el.checked);return;}
});
fileEl.addEventListener('change',e=>{applyImport(e.target.files?.[0]);fileEl.value='';});
document.getElementById('main-nav').addEventListener('click',e=>{
 const btn=e.target.closest('[data-nav]');if(!btn)return;
 if(dirty && nav==='disponibilidade' && !window.confirm('Descartar alterações não salvas?'))return;
 nav=btn.dataset.nav;draft=null;dirty=false;render();document.querySelector('.sidebar').classList.remove('open');
});
document.getElementById('mobile-menu').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
render();
if(isShared){syncRemote();window.setInterval(()=>{if(!dirty && !document.hidden)syncRemote();},60000);}
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('SW:',err));
// Inspeção automatizada local (não é necessária para usuários do PWA).
window.__escalaBeta={getState:()=>structuredClone(state),getResult:()=>schedule,validate:()=>validateSchedule(schedule,state)};
