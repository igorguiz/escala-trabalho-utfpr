import {DATES_2026,PEOPLE,WEEKDAYS,weekdayIndex,getStatus,formatShortDate} from './data.js';

function mondayISO(iso){const dt=new Date(`${iso}T12:00:00Z`);dt.setUTCDate(dt.getUTCDate()-weekdayIndex(iso));return dt.toISOString().slice(0,10);}
function allowed(person,day,state){
 if(day.status.type!=='util')return false;
 // Exceções por data prevalecem sobre disponibilidade habitual e rodízio.
 const specific=person.exceptions?.[day.iso];
 if(specific==='off')return false;
 // Restrições absolutas preservadas.
 if(person.id==='igor')return day.day===3;
 if(person.id==='vanessa' && day.day===2)return false;
 if(specific==='on')return true;
 if(day.day===state.rotationDay)return true; // Rodízio permite participação fora dos dias habituais.
 if(person.id==='leticia' && state.rotationDay===2 && day.day===1)return true;
 return person.days.includes(day.day);
}
function candidates(day,state){
 const arr=state.people.map((p,i)=>({p,i})).filter(({p})=>allowed(p,day,state));
 const pairs=[];
 for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){
  if(arr[i].p.dept!==arr[j].p.dept)pairs.push([arr[i].i,arr[j].i]);
 }
 // Igor é fixo nas quintas-feiras úteis, quando não bloqueado por exceção.
 if(day.day===3){
   const fixed=state.people.findIndex(p=>p.id==='igor');
   if(fixed>=0 && allowed(state.people[fixed],day,state)){
     const forced=pairs.filter(pair=>pair.includes(fixed));
     if(forced.length)return forced;
   }
 }
 if(pairs.length)return pairs;
 if(arr.length)return arr.map(v=>[v.i,-1]);
 return [[-1,-1]];
}
function fitsLeticiaSpecial(mask,week,rotationDay){
 if(rotationDay!==2)return true;
 const pairs=[];
 for(let i=0;i<week.length;i++)if(mask&(1<<i))pairs.push(week[i].day);
 return pairs.length<=1 || (!pairs.some(d=>d===2)) || (pairs.length===2 && pairs.includes(1) && pairs.includes(2));
}
function solveWeek(week,state,countsTotal,rotationTotals,pairTotals,maxPerWeek){
 let states=new Map([['0,0,0,0,0,0,0,0|0',{counts:[0,0,0,0,0,0,0,0],lMask:0,score:0,picks:[]}]]);
 const leticiaIdx=state.people.findIndex(p=>p.id==='leticia');
 for(let di=0;di<week.length;di++){
  const day=week[di], choices=candidates(day,state), next=new Map();
  for(const old of states.values())for(const pair of choices){
   if(pair.some(i=>i!==-1 && old.counts[i]>=maxPerWeek))continue;
   const nowCounts=old.counts.slice();
   let newScore=old.score;
   let mask=old.lMask;
   for(const i of pair){
    if(i===-1){newScore-=5000;continue;}
    const before=nowCounts[i];
    nowCounts[i]++;
    newScore+=before===0?1250:before===1?-55:-550;
    // Distribuição anual: menor carga acumulada é favorecida.
    const prior=countsTotal[state.people[i].id]||0;
    newScore-=90.0*(prior+before);
    if(day.day===state.rotationDay && state.people[i].id!=='igor'){
      newScore-=160*(rotationTotals[state.people[i].id]||0);
    }
    if(i===leticiaIdx)mask|=(1<<di);
   }
   if(state.rotationDay===2 && !fitsLeticiaSpecial(mask,week,state.rotationDay))continue;
   if(pair[0]!==-1 && pair[1]!==-1){
     const key=[state.people[pair[0]].id,state.people[pair[1]].id].sort().join('|');
     newScore-=1.5*(pairTotals[key]||0);
   }
   const key=nowCounts.join(',')+(state.rotationDay===2?`|${mask}`:'');
   const saved=next.get(key);
   if(!saved || newScore>saved.score){next.set(key,{counts:nowCounts,lMask:mask,score:newScore,picks:[...old.picks,pair]});}
  }
  states=next;
  if(!states.size)return null;
 }
 let best=null;
 for(const item of states.values()){
  if(!fitsLeticiaSpecial(item.lMask,week,state.rotationDay))continue;
  const unique=item.counts.filter(x=>x>0).length;
  const score=item.score+unique*100000;
  if(!best||score>best.finalScore)best={...item,finalScore:score,unique};
 }
 return best;
}

export function generateSchedule(state){
 const open=DATES_2026.filter(d=>d.status.type==='util');
 const weeksMap=new Map();
 for(const day of open){const monday=mondayISO(day.iso); if(!weeksMap.has(monday))weeksMap.set(monday,[]); weeksMap.get(monday).push(day);}
 const all=[],weeks=[],warnings=[];
 const total=Object.fromEntries(state.people.map(p=>[p.id,0]));
 const rotationTotal=Object.fromEntries(state.people.map(p=>[p.id,0]));
 const pairTotals={};
 for(const [start,days] of weeksMap){
  let chosen=solveWeek(days,state,total,rotationTotal,pairTotals,2);
  let usedCap=2;
  if(!chosen){chosen=solveWeek(days,state,total,rotationTotal,pairTotals,3);usedCap=3;}
  if(!chosen){chosen=solveWeek(days,state,total,rotationTotal,pairTotals,5);usedCap=5;}
  const records=[];
  if(!chosen){
   for(const day of days){records.push({...day,people:[],issue:'Não foi possível compor a escala'});warnings.push(`${formatShortDate(day.iso)}: não foi possível compor a escala.`);}
  }else{
   for(let i=0;i<days.length;i++){
    const pair=chosen.picks[i];const people=pair.filter(v=>v>=0).map(v=>state.people[v]);
    const day=days[i];const issue=people.length<2?'Vaga sem cobertura':null;
    const record={...day,people,issue,rotation:day.day===state.rotationDay};
    records.push(record);
    if(issue)warnings.push(`${formatShortDate(day.iso)}: ${issue}.`);
    for(const person of people){total[person.id]++;if(record.rotation && person.id!=='igor')rotationTotal[person.id]++;}
    if(people.length===2){const key=people.map(p=>p.id).sort().join('|');pairTotals[key]=(pairTotals[key]||0)+1;}
   }
   if(usedCap>2)warnings.push(`Semana de ${formatShortDate(start)}: disponibilidade restrita, com até ${usedCap} comparecimentos de um servidor.`);
   const eligibleIds=new Set();
   for(const day of days)for(const p of state.people)if(allowed(p,day,state))eligibleIds.add(p.id);
   const possibleCount=Math.min(eligibleIds.size,days.length*2);
   if(chosen.unique<possibleCount){warnings.push(`Semana de ${formatShortDate(start)}: ${chosen.unique} servidores distintos em ${days.length} dias úteis; verifique as disponibilidades.`);}
  }
  weeks.push({start,days:records,counts:Object.fromEntries(state.people.map(p=>[p.id,records.reduce((n,r)=>n+r.people.some(q=>q.id===p.id),0)]))});
  all.push(...records);
 }
 const byDate=Object.fromEntries(all.map(x=>[x.iso,x]));
 const slots=all.length*2;
 return {year:2026,records:all,weeks,byDate,total,rotationTotal,warnings,regularDays:all.length,slots,filled:all.reduce((n,r)=>n+r.people.length,0)};
}
export function validateSchedule(result,state){
 const problems=[];
 for(const row of result.records){
  if(row.people.length!==2)problems.push(`${row.iso}: ${row.people.length} servidor(es)`);
  if(row.people.length===2 && row.people[0].dept===row.people[1].dept)problems.push(`${row.iso}: departamentos repetidos`);
  for(const p of row.people){
   if(p.id==='igor'&&row.day!==3)problems.push(`${row.iso}: Igor fora da quinta`);
   if(p.id==='vanessa'&&row.day===2)problems.push(`${row.iso}: Vanessa na quarta`);
   if(!allowed(p,row,state))problems.push(`${row.iso}: ${p.name} sem disponibilidade`);
  }
 }
 return problems;
}
