'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..'),release=fs.readFileSync(path.join(root,'sw.js'),'utf8').match(/const CACHE = '([^']+)'/)[1],events={},calls=[];let oldShell=false;
const cache={
 async addAll(requests){calls.push({type:'precache',requests});},
 async match(request){calls.push({type:'cache',url:String(request.url||request)});const url=new URL(String(request.url||request),'https://example.test/fuel/'),file=url.pathname.split('/').pop();if(file==='config.js')return new Response("window.FUELLOG_CONFIG={appCacheId:'"+(oldShell?'fuellog-v42-languages':release)+"'};");if(file==='app.js')return new Response("const APP_BUILD_ID = '"+release+"';");return new Response('<html data-app-version="'+release+'">installed release HTML</html>');},
 async put(){}
};
let skipped=0;
const location=new URL('https://example.test/fuel/sw.js');
const context=vm.createContext({URL,Request,Response,Promise,console,self:{location,registration:{scope:'https://example.test/fuel/'},addEventListener(type,fn){events[type]=fn},skipWaiting(){skipped++;return Promise.resolve()},clients:{claim(){return Promise.resolve()}}},caches:{async open(){return cache},async keys(){return []},async delete(){return true},async match(){throw new Error('must not mix release caches')}},fetch:async request=>{calls.push({type:'network',request});return new Response('network release HTML')}});
vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),context);
(async()=>{
 let installing;events.install({waitUntil(p){installing=p}});await installing;
 const precache=calls.find(c=>c.type==='precache');assert.ok(precache.requests.every(r=>r instanceof Request&&r.cache==='reload'),'precache must bypass stale browser HTTP cache');
 assert.equal(skipped,1,'activate only after complete precache');
 let result;calls.length=0;events.fetch({request:{url:'https://example.test/fuel/',method:'GET',mode:'navigate'},respondWith(p){result=p}});assert.ok((await (await result).text()).includes('installed release HTML'));assert.ok(!calls.some(c=>c.type==='network'),'navigation must use installed HTML with its installed scripts');
 calls.length=0;events.fetch({request:new Request('https://example.test/fuel/sw.js',{cache:'no-store'}),respondWith(p){result=p}});await result;assert.equal(calls.find(c=>c.type==='network').request.cache,'no-store','update metadata always bypasses HTTP cache');assert.ok(!calls.some(c=>c.type==='cache'),'never serve sw.js update checks from cached shell');
 let reply;events.message({data:{type:'GET_VERSION',requestId:'test'},source:{postMessage(value){reply=value}}});assert.equal(reply.requestId,'test');assert.equal(reply.cacheId,vm.runInContext('CACHE',context));
 oldShell=true;skipped=0;events.install({waitUntil(p){installing=p}});await assert.rejects(installing,/release/i);assert.equal(skipped,0,'old files returning 200 cannot activate a new release');oldShell=false;
 cache.addAll=async()=>{throw new Error('missing asset')};skipped=0;events.install({waitUntil(p){installing=p}});await assert.rejects(installing,/missing asset/);assert.equal(skipped,0,'incomplete release cannot activate');
 console.log('fresh precache, coherent navigation, uncached update checks, worker version and failed-install checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
