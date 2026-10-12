"use strict";
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const card={innerHTML:''};
const context=vm.createContext({window:{},Blob,Intl,Date,console,navigator:{},document:{querySelector(s){return s==='#storageDetails'?card:null}},FuelDB:{async all(store){assert.equal(store,'settings');return [{key:'future',value:'á'}]}}});
require('./i18n-test-helper.cjs')(context);
vm.runInContext(fs.readFileSync('app.js','utf8').replace(/init\(\)\.catch[\s\S]*$/,''),context);
const run=s=>vm.runInContext(s,context);
(async()=>{
 assert.equal(run('typeof savedLogStorage'),'function','saved log size estimator is required');
 // UTF-8: {"note":"á"} has 13 bytes, including the two-byte accent.
 const size=run('savedLogStorage([{note:"á"}],[],[],[])');
 assert.equal(size.bytes,13);assert.equal(size.count,1);assert.equal(size.average,13);
 assert.equal(run('savedLogStorage([],[],[],[]).average'),null);
 run('state.fillups=[{note:"á"}];state.vehicles=[];state.promos=[]');
 await run('wireSettingsStorage()');
 assert.ok(card.innerHTML.includes('Available capacity unknown'));
 assert.ok(card.innerHTML.includes('42 B'),'all stored settings, including unknown keys, are counted');
 context.navigator.storage={estimate:async()=>({usage:130,quota:260})};
 await run('wireSettingsStorage()');
 assert.ok(card.innerHTML.includes('130 B'));assert.ok(card.innerHTML.includes('10'),'130 / 13 = 10 additional records');
 context.navigator.storage.estimate=async()=>({usage:300,quota:260});
 await run('wireSettingsStorage()');assert.ok(card.innerHTML.includes('0 B'));
 for(const estimate of [()=>Promise.reject(new Error('denied')),()=>({usage:NaN,quota:260}),()=>({usage:0}),()=>({usage:-1,quota:260})]){
  context.navigator.storage.estimate=estimate;await run('wireSettingsStorage()');assert.ok(card.innerHTML.includes('Available capacity unknown'));
 }
 run('state.fillups=[]');context.navigator.storage.estimate=async()=>({usage:0,quota:260});
 await run('wireSettingsStorage()');assert.ok(card.innerHTML.includes('Add a fill-up'));
 context.window.FuelLogI18n.use('pt');await run('wireSettingsStorage()');assert.ok(card.innerHTML.includes('Espaço disponível'));
 console.log('Storage size, UTF-8 metadata, quota, unavailable/error fallback, empty log and translations passed');
})().catch(e=>{console.error(e);process.exitCode=1});
