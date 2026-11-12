import {DATES_2026,weekdayIndex,formatShortDate} from './data.js';

function mondayISO(iso){const dt=new Date(`${iso}T12:00:00Z`);dt.setUTCDate(dt.getUTCDate()-weekdayIndex(iso));return dt.toISOString().slice(0,10);}
function allowed(person,day,state){
 if(day.status.type!=='util')return false;
 // Preferência individual prevalece: ninguém é escalado em dia não selecionado.
 // Uma exceção pontual "disponível" pode habilitar a data; "indisponível" a bloqueia.
 const specific=person.exceptions?.[day.iso];
 if(specific==='off')return false;
 if(specific==='on')return true;
 return person.days.includes(day.day);
}
function candidates(day,state){
 const arr=state.people.map((p,i)=>({p,i})).filter(({p})=>allowed(p,day,state));
 const pairs=[];
 for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){
  if(arr[i].p.dept!==arr[j].p.dept)pairs.push([arr[i].i,arr[j].i]);
 }
 if(pairs.length)return pairs;
 if(arr.length)return arr.map(v=>[v.i,-1]);
 return [[-1,-1]];
}
function solveWeek(week,state,countsTotal,rotationTotals,pairTotals,maxPerWeek){
 let states=new Map([['0,0,0,0,0,0,0,0',{counts:[0,0,0,0,0,0,0,0],score:0,picks:[]}]]);

 for(let di=0;di<week.length;di++){
  const day=week[di], choices=candidates(day,state), next=new Map();
  for(const old of states.values())for(const pair of choices){
   if(pair.some(i=>i!==-1 && old.counts[i]>=maxPerWeek))continue;
   const nowCounts=old.counts.slice();
   let newScore=old.score;
   for(const i of pair){
    if(i===-1){newScore-=5000;continue;}
    const before=nowCounts[i];
    nowCounts[i]++;
    newScore+=before===0?1250:before===1?-55:-550;
    // Distribuição anual: menor carga acumulada é favorecida.
    const prior=countsTotal[state.people[i].id]||0;
    newScore-=90.0*(prior+before);
    if(day.day===state.rotationDay){
      newScore-=160*(rotationTotals[state.people[i].id]||0);
    }

   }

   if(pair[0]!==-1 && pair[1]!==-1){
     const key=[state.people[pair[0]].id,state.people[pair[1]].id].sort().join('|');
     newScore-=1.5*(pairTotals[key]||0);
   }
   const key=nowCounts.join(',');
   const saved=next.get(key);
   if(!saved || newScore>saved.score){next.set(key,{counts:nowCounts,score:newScore,picks:[...old.picks,pair]});}
  }
  states=next;
  if(!states.size)return null;
 }
 let best=null;
 for(const item of states.values()){

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
    for(const person of people){total[person.id]++;if(record.rotation)rotationTotal[person.id]++;}
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
   if(!allowed(p,row,state))problems.push(`${row.iso}: ${p.name} sem disponibilidade`);
  }
 }
 return problems;
}
