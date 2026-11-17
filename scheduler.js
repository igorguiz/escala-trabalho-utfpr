/* Escala UTFPR — sem rodízio. Cada dia recebe 0, 1 ou 2 pessoas conforme disponibilidades.
   Havendo ao menos uma dupla de departamentos distintos, o dia recebe duas pessoas.
   Pessoas disponíveis do mesmo departamento nunca formam dupla. */
import {DATES_2026,weekdayIndex,formatShortDate} from './data.js?v=0.4.0';

function mondayISO(iso){
 const dt=new Date(`${iso}T12:00:00Z`);
 dt.setUTCDate(dt.getUTCDate()-weekdayIndex(iso));
 return dt.toISOString().slice(0,10);
}
export function available(person,day){
 if(day.status.type!=='util')return false;
 const specific=person.exceptions?.[day.iso];
 if(specific==='off')return false;
 if(specific==='on')return true;
 return person.days.includes(day.day);
}
function choicesFor(day,state){
 const eligible=state.people.map((p,i)=>({p,i})).filter(({p})=>available(p,day));
 const pairs=[];
 for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){
  if(eligible[i].p.dept!==eligible[j].p.dept)pairs.push([eligible[i].i,eligible[j].i]);
 }
 // Quando uma dupla é possível, NÃO há opção de deixar um posto vazio.
 // Se nenhum par for válido, escolha um único servidor (ou nenhum, se não houver candidatos).
 return {eligibleCount:eligible.length,choices:pairs.length?pairs:eligible.length?eligible.map(({i})=>[i]):[[]],sameDeptOnly:eligible.length>1&&!pairs.length};
}
function solveWeek(days,state,totals,pairTotals,cap){
 const n=state.people.length;
 let states=new Map([['0'.repeat(n),{counts:Array(n).fill(0),score:0,picks:[]}]]);
 for(const day of days){
  const next=new Map();
  const options=choicesFor(day,state).choices;
  for(const old of states.values())for(const picks of options){
   if(picks.some(i=>old.counts[i]>=cap))continue;
   const counts=old.counts.slice();let score=old.score;
   for(const i of picks){
    const priorWeek=counts[i];counts[i]++;
    // Distribuição entre os elegíveis, sem prejudicar preenchimento diário.
    score+=priorWeek===0?1250:priorWeek===1?-50:-500;
    score-=90*((totals[state.people[i].id]||0)+priorWeek);
   }
   if(picks.length===2){
    const k=picks.map(i=>state.people[i].id).sort().join('|');
    score-=2*(pairTotals[k]||0);
   }
   const key=counts.join(',');
   const prev=next.get(key);
   if(!prev||score>prev.score)next.set(key,{counts,score,picks:[...old.picks,picks]});
  }
  states=next;
  if(!states.size)return null;
 }
 let best=null;
 for(const candidate of states.values()){
  const unique=candidate.counts.filter(x=>x>0).length;
  const rating=candidate.score+unique*100000;
  if(!best||rating>best.rating)best={...candidate,rating};
 }
 return best;
}
export function generateSchedule(state){
 const open=DATES_2026.filter(d=>d.status.type==='util');
 const grouped=new Map();
 for(const day of open){const start=mondayISO(day.iso);if(!grouped.has(start))grouped.set(start,[]);grouped.get(start).push(day);}
 const all=[],weeks=[],warnings=[];
 const total=Object.fromEntries(state.people.map(p=>[p.id,0]));
 const pairTotals={};
 for(const [start,days] of grouped){
  let solution=null;
  for(const cap of [1,2,3,4,5]){
   solution=solveWeek(days,state,total,pairTotals,cap);
   if(solution)break;
  }
  if(!solution)throw new Error(`Falha interna no planejamento da semana ${start}`);
  const records=[];
  for(let di=0;di<days.length;di++){
   const day=days[di];
   const choices=choicesFor(day,state);
   const people=solution.picks[di].map(i=>state.people[i]);
   const issue=people.length===0?'Nenhum servidor disponível':null;
   const note=choices.sameDeptOnly?'Disponíveis do mesmo departamento':null;
   const record={...day,people,issue,note,eligibleCount:choices.eligibleCount};
   records.push(record);
   if(issue)warnings.push(`${formatShortDate(day.iso)}: nenhum servidor disponível.`);
   // A restrição de departamento pode impedir um segundo nome, mas não é erro de escala.
   for(const person of people)total[person.id]++;
   if(people.length===2){const k=people.map(p=>p.id).sort().join('|');pairTotals[k]=(pairTotals[k]||0)+1;}
  }
  weeks.push({start,days:records,counts:Object.fromEntries(state.people.map(p=>[p.id,records.filter(r=>r.people.some(q=>q.id===p.id)).length]))});
  all.push(...records);
 }
 const byDate=Object.fromEntries(all.map(r=>[r.iso,r]));
 const daysWithTwo=all.filter(r=>r.people.length===2).length;
 const daysWithOne=all.filter(r=>r.people.length===1).length;
 const daysWithNone=all.filter(r=>r.people.length===0).length;
 return {year:2026,records:all,weeks,byDate,total,warnings,regularDays:all.length,
  daysWithTwo,daysWithOne,daysWithNone,filled:daysWithTwo*2+daysWithOne};
}
export function validateSchedule(result,state){
 const problems=[];
 for(const day of result.records){
  if(day.people.length>2)problems.push(`${day.iso}: mais de duas pessoas`);
  if(day.people.length===2&&day.people[0].dept===day.people[1].dept)problems.push(`${day.iso}: departamentos iguais`);
  if(new Set(day.people.map(p=>p.id)).size!==day.people.length)problems.push(`${day.iso}: servidor repetido`);
  for(const person of day.people)if(!available(person,day))problems.push(`${day.iso}: ${person.name} sem disponibilidade`);
  const eligible=state.people.filter(p=>available(p,day));
  const hasPair=eligible.some((p,i)=>eligible.slice(i+1).some(q=>q.dept!==p.dept));
  const expected=hasPair?2:eligible.length?1:0;
  if(day.people.length!==expected)problems.push(`${day.iso}: esperado ${expected} pessoa(s), encontrado ${day.people.length}`);
 }
 return problems;
}
