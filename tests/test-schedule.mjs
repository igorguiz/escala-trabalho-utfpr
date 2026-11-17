import {defaultState,PEOPLE,DATES_2026} from '../data.js';
import {generateSchedule,validateSchedule} from '../scheduler.js';
for(let rot=0;rot<5;rot++){
  const state=defaultState();state.rotationDay=rot;
  console.time('rotation '+rot);
  const result=generateSchedule(state);console.timeEnd('rotation '+rot);
  console.log('rodizio',rot,'days',result.regularDays,'filled',result.filled,'warnings',result.warnings.length,'stats',result.total,'rot',result.rotationTotal);
  const p=validateSchedule(result,state);if(p.length)console.log('BAD',p.slice(0,15));
  if(result.filled!==466||p.length)process.exitCode=1;
}
