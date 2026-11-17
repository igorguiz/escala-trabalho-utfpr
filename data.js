/* Sugestões iniciais de dias, todas livremente editáveis pelo usuário. */
export const YEAR = 2026;
export const WEEKDAYS = ['Segunda','Terça','Quarta','Quinta','Sexta'];
export const WEEKDAYS_FULL = WEEKDAYS.map(s => s + '-feira');
export const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export const PEOPLE = [
  {id:'igor',name:'Igor',dept:'DEPRO',days:[3]},
  {id:'vanessa',name:'Vanessa',dept:'DEPRO',days:[0,1]},
  {id:'leticia',name:'Letícia',dept:'DEPRO',days:[3,4]},
  {id:'marcelo',name:'Marcelo',dept:'DEMAP',days:[0,1,2,3,4]},
  {id:'kelly',name:'Kelly',dept:'DEMAP',days:[1,3]},
  {id:'fabio',name:'Fábio',dept:'DEMAP',days:[0,4]},
  {id:'fernando',name:'Fernando',dept:'DEOFI',days:[0,1,2,3]},
  {id:'adilson',name:'Adilson',dept:'DEOFI',days:[0,2,4]},
];
// Tipos: feriado, recesso, local, especial. Fins de semana sem expediente automaticamente.
const DATES = [
 ['01-01','feriado','Confraternização Universal'],['01-02','recesso','Recesso administrativo'],['01-03','recesso','Recesso administrativo'],
 ['02-16','recesso','Recesso administrativo'],['02-17','feriado','Carnaval'],['02-18','recesso','Cinzas / recesso administrativo'],
 ['04-03','feriado','Sexta-feira Santa'],['04-04','recesso','Recesso administrativo'],['04-05','feriado','Páscoa'],
 ['04-20','recesso','Recesso administrativo'],['04-21','feriado','Tiradentes'],
 ['05-01','feriado','Dia do Trabalho'],['05-02','recesso','Recesso administrativo'],
 ['06-04','feriado','Corpus Christi'],['06-05','recesso','Recesso administrativo'],['06-06','recesso','Recesso administrativo'],
 ['06-12','local','Padroeiro'],['06-13','local','Recesso local'],
 ['09-07','feriado','Independência do Brasil'],
 ['10-12','feriado','Padroeira do Brasil'],['10-28','recesso','Dia do Servidor Público'],
 ['11-02','feriado','Finados'],['11-15','feriado','Proclamação da República'],
 ['11-20','feriado','Dia Nacional de Zumbi e da Consciência Negra'],['11-21','recesso','Recesso administrativo'],
 ['12-10','local','Aniversário de Londrina'],['12-11','local','Recesso local'],['12-12','local','Recesso local'],
 ['12-25','feriado','Natal'],
];
export const CALENDAR = Object.fromEntries(DATES.map(([md,type,label])=>[`2026-${md}`,{type,label}]));
for(let d=21;d<=31;d++) {
  const key=`2026-12-${String(d).padStart(2,'0')}`;
  if(!CALENDAR[key]) CALENDAR[key]={type:'especial',label:'Horário especial de funcionamento - fora da escala ordinária'};
}
export function getDate(iso){ return new Date(`${iso}T12:00:00Z`); }
export function weekdayIndex(iso){ return (getDate(iso).getUTCDay()+6)%7; }
export function dateISO(date){return date.toISOString().slice(0,10);}
export function formatShortDate(iso){ const [y,m,d]=iso.split('-');return `${d}/${m}/${y}`; }
export function getStatus(iso){
  const day=weekdayIndex(iso);
  if(day>4)return {type:'fimdesemana',label:'Fim de semana'};
  return CALENDAR[iso]||{type:'util',label:'Expediente regular'};
}
export function allDates(){
 const dates=[];
 for(let stamp=Date.UTC(YEAR,0,1); stamp<Date.UTC(YEAR+1,0,1);stamp+=86400000){
  const iso=dateISO(new Date(stamp)); dates.push({iso,day:weekdayIndex(iso),month:Number(iso.slice(5,7))-1,status:getStatus(iso)});
 }
 return dates;
}
export const DATES_2026=allDates();
export function defaultState(){return {schema:3,year:YEAR,people:PEOPLE.map(p=>({...p,days:[...p.days],exceptions:{}})),savedAt:null};}
export function sanitizeState(raw){
 const out=defaultState();
 if(!raw || typeof raw!=='object')return out;
 if(!Array.isArray(raw.people))return out;
 for(const person of out.people){
  const other=raw.people.find(p=>p?.id===person.id);
  if(!other)continue;
  if(Array.isArray(other.days))person.days=[...new Set(other.days.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=4))].sort();
  if(other.exceptions && typeof other.exceptions==='object'){
   for(const [date,value] of Object.entries(other.exceptions)){
    if(/^2026-\d\d-\d\d$/.test(date) && getDate(date).toString()!=='Invalid Date' && dateISO(getDate(date))===date && ['on','off'].includes(value))person.exceptions[date]=value;
   }
  }
 }
 if(typeof raw.savedAt==='string')out.savedAt=raw.savedAt;
 return out;
}
