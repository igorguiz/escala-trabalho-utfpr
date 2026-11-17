import assert from 'node:assert/strict';
import {defaultState,sanitizeState} from '../data.js';
import {generateSchedule,validateSchedule} from '../scheduler.js';

const weekdays = [0,1,2,3,4];
for (let rotation = 0; rotation < 5; rotation++) {
  const s = defaultState();
  s.rotationDay = rotation;
  // All 5 weekdays are available and no personal restriction is enforced.
  for(const p of s.people) {p.days = [...weekdays]; p.exceptions = {};}
  const r = generateSchedule(s);
  assert.equal(r.regularDays,233);
  assert.equal(r.filled,466,`Rodízio ${rotation}`);
  assert.deepEqual(validateSchedule(r,s),[],`Rodízio ${rotation}`);
  assert.ok(r.rotationTotal.igor >= 0);
  console.log(`Rodízio ${rotation}: preenchido ${r.filled}, participação Igor ${r.total.igor}.`);
}
{
 const s=defaultState();
 for(const p of s.people){p.days=[];p.exceptions={};}
 const r=generateSchedule(s);
 assert.equal(r.filled,0);
 assert.ok(r.warnings.length);
}
{
 const s=defaultState();
 for(const p of s.people) {p.days=[0,1,2,3,4];p.exceptions={};}
 s.people.find(p=>p.id==='igor').days=[0];
 s.people.find(p=>p.id==='vanessa').days=[2];
 const r=generateSchedule(s);
 const igorDays=r.records.filter(rec=>rec.people.some(p=>p.id==='igor'));
 const vanessaDays=r.records.filter(rec=>rec.people.some(p=>p.id==='vanessa'));
 assert.ok(igorDays.length>0);
 assert.ok(igorDays.every(rec=>rec.day===0),'Igor deve poder segunda, mas não outros dias não marcados');
 assert.ok(vanessaDays.length>0);
 assert.ok(vanessaDays.every(rec=>rec.day===2),'Vanessa deve poder quarta, mas não outros dias não marcados');
 assert.deepEqual(validateSchedule(r,s),[]);
}
{
 const s=defaultState();
 const person=s.people.find(p=>p.id==='igor'); person.days=[0,2,4];
 const saved=sanitizeState(s);assert.deepEqual(saved.people.find(p=>p.id==='igor').days,[0,2,4]);
 const v=s.people.find(p=>p.id==='vanessa');v.days=[2];
 assert.deepEqual(sanitizeState(s).people.find(p=>p.id==='vanessa').days,[2]);
}
{
 const s=defaultState();
 for(const p of s.people){p.days=[];p.exceptions={};}
 s.people.find(p=>p.id==='igor').exceptions['2026-01-05']='on';
 s.people.find(p=>p.id==='kelly').exceptions['2026-01-05']='on';
 const r=generateSchedule(s);
 const people=r.byDate['2026-01-05'].people.map(p=>p.id);
 assert.deepEqual(people.sort(),['igor','kelly']);
}
console.log('Todos os testes de seleção livre passaram.');
