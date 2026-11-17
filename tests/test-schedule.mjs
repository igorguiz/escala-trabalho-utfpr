import assert from 'node:assert/strict';
import {defaultState,DATES_2026} from '../data.js';
import {generateSchedule,validateSchedule} from '../scheduler.js';

function run(s,label){
 const r=generateSchedule(s);const problems=validateSchedule(r,s);
 assert.deepEqual(problems,[],`${label}: ${problems.slice(0,5)}`);
 assert.equal(r.regularDays,233);
 assert.equal(r.daysWithOne+r.daysWithTwo+r.daysWithNone,r.regularDays);
 assert.equal(r.filled,r.daysWithOne+2*r.daysWithTwo);
 for(const day of r.records)assert.ok(day.people.length<=2);
 console.log(`${label}: ${r.daysWithTwo} dias com 2 / ${r.daysWithOne} com 1 / ${r.daysWithNone} sem ninguém; ${r.filled} comparecimentos`);
 return r;
}

const original=defaultState();
const baseline=run(original,'Disponibilidades iniciais');
assert.equal(baseline.daysWithTwo,233);

const solo=defaultState();
for(const p of solo.people)p.days=[];
solo.people[0].days=[0];
const r1=run(solo,'Somente Igor na segunda');
assert.ok(r1.records.filter(d=>d.day===0).every(d=>d.people.length===1&&d.people[0].id==='igor'));
assert.ok(r1.records.filter(d=>d.day!==0).every(d=>d.people.length===0));

const duo=defaultState();
for(const p of duo.people)p.days=[];
duo.people.find(p=>p.id==='vanessa').days=[1];
duo.people.find(p=>p.id==='kelly').days=[1];
const r2=run(duo,'Dupla de departamentos distintos na terça');
assert.ok(r2.records.filter(d=>d.day===1).every(d=>d.people.length===2));

const same=defaultState();
for(const p of same.people)p.days=[];
same.people.find(p=>p.id==='igor').days=[2];
same.people.find(p=>p.id==='vanessa').days=[2];
const r3=run(same,'Dois DEPRO na quarta');
assert.ok(r3.records.filter(d=>d.day===2).every(d=>d.people.length===1&&d.note));

const three=defaultState();
for(const p of three.people)p.days=[];
three.people.find(p=>p.id==='igor').days=[3];
three.people.find(p=>p.id==='vanessa').days=[3];
three.people.find(p=>p.id==='fernando').days=[3];
const r4=run(three,'Três elegíveis, com DEPRO duplicado');
assert.ok(r4.records.filter(d=>d.day===3).every(d=>d.people.length===2));

const exception=defaultState();
for(const p of exception.people)p.days=[];
const firstMonday=DATES_2026.find(d=>d.status.type==='util'&&d.day===0).iso;
exception.people.find(p=>p.id==='igor').exceptions[firstMonday]='on';
const r5=run(exception,'Exceção pontual disponível');
assert.deepEqual(r5.byDate[firstMonday].people.map(p=>p.id),['igor']);
console.log('Todos os testes de consistência passaram.');
