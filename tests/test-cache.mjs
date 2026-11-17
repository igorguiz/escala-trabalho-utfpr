import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const listeners = {};
const buckets = new Map();
let offline = false;
let networkCalls = 0;
const urlOf = v => (v instanceof Request ? v.url : new URL(String(v),'https://exemplo.github.io/escala-trabalho-utfpr/').href);
const norm=(x,ignoreSearch=false)=>{const url=new URL(urlOf(x));if(ignoreSearch)url.search='';return url.href};
const cacheAdapter=name=>({
 async put(req,res){buckets.get(name).set(norm(req),res.clone())},
 async match(req,opts={}){const entries=buckets.get(name);if(!opts.ignoreSearch)return entries.get(norm(req))?.clone();for(const [key,res] of entries){if(norm(key,true)===norm(req,true))return res.clone();}return undefined;}
});
const caches={
 async open(name){if(!buckets.has(name))buckets.set(name,new Map());return cacheAdapter(name)},
 async keys(){return [...buckets.keys()]},
 async delete(name){return buckets.delete(name)}
};
const self={
 location:{origin:'https://exemplo.github.io'},
 registration:{scope:'https://exemplo.github.io/escala-trabalho-utfpr/'},
 addEventListener(name,listener){listeners[name]=listener},
 async skipWaiting(){},clients:{async claim(){}}
};
const ctx={self,caches,Request,Response,URL,console,fetch:async req=>{
 networkCalls++;
 if(offline)throw new Error('sem rede');
 return new Response('atual-'+networkCalls,{status:200});
}};
vm.runInNewContext(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),ctx);
async function event(name,params={}){let awaited=null, response=null;listeners[name]({...params,waitUntil(p){awaited=p},respondWith(p){response=p}});if(awaited)await awaited;return response?await response:null;}
buckets.set('escala-utfpr-beta-v02',new Map());buckets.set('unrelated-app-cache',new Map());
await event('install');
await event('activate');
assert(!buckets.has('escala-utfpr-beta-v02'),'versão anterior deveria ser removida');
assert(buckets.has('unrelated-app-cache'),'não pode apagar caches de outros apps');
const req=new Request('https://exemplo.github.io/escala-trabalho-utfpr/app.js?v=0.3.0');
const one=await event('fetch',{request:req});const first=await one.text();
const two=await event('fetch',{request:req});const second=await two.text();
assert.notEqual(first,second,'online deve buscar a rede, não cache antigo');
offline=true;
const fallback=await event('fetch',{request:req});
assert.equal(await fallback.text(),second,'offline usa última versão salva');
console.log('Service Worker: rede primeiro, fallback offline e limpeza seletiva — OK.');
