'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
function setup(reg,online){
 let timers=[],messages=[],reloaded=0;const listeners=[],button={textContent:'Update app',innerHTML:'Update app',disabled:false};
 const context=vm.createContext({window:{FUELLOG_CONFIG:{appCacheId:'fuellog-v43-atomic-updates'},location:{reload(){reloaded++}}},Date,Intl,URL,console,document:{querySelector(s){return s==='#appUpdateBtn'?button:null}},navigator:{onLine:online!==false,userAgent:'',serviceWorker:{async getRegistration(){return reg},addEventListener(type,fn){if(type==='message')listeners.push(fn)},removeEventListener(type,fn){const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1)}}},setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){}});
 require('./i18n-test-helper.cjs')(context);
 vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/init\(\)\.catch[\s\S]*$/,''),context);
 context.notice=message=>messages.push(message);vm.runInContext('toast=this.notice;updateSettingsVersionUi=function(){};',context);
 return {context,button,messages,run:s=>vm.runInContext(s,context),timeout(){timers.forEach(fn=>fn())},reply(data,source){listeners.slice().forEach(fn=>fn({data,source}))},reloaded:()=>reloaded};
}
const tick=()=>new Promise(setImmediate);
(async()=>{
 let sent=[],changed=[],worker={state:'installing',addEventListener(type,fn){changed.push(fn)},removeEventListener(type,fn){changed=changed.filter(f=>f!==fn)},postMessage(data){sent.push(data)}},reg={installing:worker,waiting:null,active:null,async update(){}};
 let test=setup(reg),updating=test.run('applyPwaUpdate()');await tick();
 worker.state='installed';reg.installing=null;reg.waiting=worker;changed.slice().forEach(fn=>fn());await tick();
 assert.ok(sent.some(m=>m.type==='SKIP_WAITING'),'update must track the worker after registration.installing becomes null');await updating;assert.equal(test.button.disabled,false);
 sent=[];reg={waiting:{postMessage(data){sent.push(data)}},installing:null,active:null,async update(){throw new Error('offline')}};test=setup(reg,false);await test.run('applyPwaUpdate()');assert.ok(sent.some(m=>m.type==='SKIP_WAITING'),'already downloaded update must activate offline without a network update');
 reg={waiting:null,installing:null,active:{postMessage(data){test.reply({type:'FUELLOG_VERSION',requestId:data.requestId,cacheId:'fuellog-v44-test'},this)}},async update(){}};test=setup(reg);test.run("state.swUpdate.latestId='fuellog-v44-test'");await test.run('applyPwaUpdate()');assert.equal(test.reloaded(),1,'an already-active newer worker must reload a stale page');
 changed=[];worker={state:'installing',addEventListener(type,fn){changed.push(fn)},removeEventListener(type,fn){changed=changed.filter(f=>f!==fn)}};reg={waiting:null,installing:worker,active:null,async update(){}};test=setup(reg);updating=test.run('applyPwaUpdate()');await tick();worker.state='redundant';reg.installing=null;changed.slice().forEach(fn=>fn());await updating;assert.ok(test.messages.includes('Update failed'),'failed install is reported');assert.equal(test.button.disabled,false);assert.equal(changed.length,0,'failed worker listener is removed');
 console.log('update worker transitions, offline activation, stale-page reload and failed-install feedback passed');
})().catch(e=>{console.error(e);process.exitCode=1});
