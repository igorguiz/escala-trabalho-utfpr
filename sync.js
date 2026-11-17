import {defaultState,sanitizeState} from './data.js?v=0.4.0';
export const LOCAL_STORE_KEY='utfpr.escala.2026.beta.v1';
const cfg=window.PWA_CONFIG||{};
const url=(cfg.supabaseUrl||'').trim().replace(/\/$/,'');
const key=(cfg.supabaseAnonKey||'').trim();
export const isShared=Boolean(url && key);
export function getLocal(){try{const raw=localStorage.getItem(LOCAL_STORE_KEY);return raw?sanitizeState(JSON.parse(raw)):defaultState();}catch{return defaultState();}}
export function saveLocal(state){try{localStorage.setItem(LOCAL_STORE_KEY,JSON.stringify(state));return true;}catch{return false;}}
async function query(resource,options={}){
 if(!isShared)throw new Error('Banco compartilhado ainda não configurado.');
 const response=await fetch(`${url}/rest/v1/${resource}`,{
  ...options,headers:{'apikey':key,'Authorization':`Bearer ${key}`,'Content-Type':'application/json','Accept':'application/json',...(options.headers||{})},
  cache:'no-store'
 });
 if(!response.ok){let detail='';try{const j=await response.json();detail=j.message||j.details||'';}catch{}throw new Error(`Supabase HTTP ${response.status}${detail?': '+detail:''}`);}
 if(response.status===204)return null;
 return response.json();
}
export async function fetchShared(){
 const people=await query('escala_pessoas_2026?select=id,days,exceptions');
 const out=defaultState();
 for(const p of out.people){const row=people.find(r=>r.id===p.id);if(row){p.days=row.days;p.exceptions=row.exceptions;}}
 out.savedAt=new Date().toISOString();
 return sanitizeState(out);
}
export async function saveSharedPerson(p){
 return query('escala_pessoas_2026?on_conflict=id',{
  method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},
  body:JSON.stringify([{id:p.id,days:p.days,exceptions:p.exceptions}])
 });
}
export function downloadJSON(state){
 const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
 const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='Escala_UTFPR_2026_configuracao.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);
}
