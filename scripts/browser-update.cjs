// Reproduce a real upgrade using an isolated origin and long-lived HTTP cache.
// The old releases are taken from Git; user data is synthetic and stays local.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{execFileSync}=require('child_process');
const {chromium}=require(process.env.FUELLOG_QA_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..'),oldRef=process.env.FUELLOG_QA_OLD_REF||'f7979bd',old={},broken={};
['sw.js','index.html','app.js','config.js','styles.css'].forEach(file=>{old[file]=execFileSync('git',['show',oldRef+':'+file],{cwd:root});broken[file]=execFileSync('git',['show','9ae345c:'+file],{cwd:root});});
const currentId=fs.readFileSync(path.join(root,'config.js'),'utf8').match(/appCacheId:\s*'([^']+)'/)[1],nextId='fuellog-v44-test';
let phase='old',failAsset=false,requests=[];
const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=url.pathname==='/'?'index.html':url.pathname.slice(1);
 requests.push({phase,file,url:req.url});
 if(file.includes('..')){res.writeHead(403).end();return;}
 if(failAsset===true&&file==='js/i18n/pt.js'){res.writeHead(503).end();return;}
 let data;
 try{data=phase==='old'&&old[file]?old[file]:phase==='broken'&&broken[file]?broken[file]:fs.readFileSync(path.join(root,file));if(phase==='future'&&['sw.js','index.html','config.js','app.js'].includes(file))data=Buffer.from(data.toString().split(currentId).join(nextId));if(phase==='future'&&failAsset==='old-shell'&&['index.html','config.js','app.js'].includes(file))data=broken[file];}catch(e){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 res.setHeader('Cache-Control',file==='index.html'||file==='sw.js'?'no-cache':'public, max-age=2592000');
 res.writeHead(200).end(data);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.FUELLOG_QA_CHROMIUM||undefined});
 try{
  const context=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base);await page.waitForFunction(()=>navigator.serviceWorker.controller&&state.vehicles.length>0&&!document.querySelector('#app').classList.contains('startup-loading'));
  await page.waitForFunction(()=>navigator.serviceWorker.controller&&state.vehicles.length>0&&!swReloading&&!document.querySelector('#app').classList.contains('startup-loading'));
  assert.equal(await page.evaluate(()=>appCacheId()).catch(async e=>{if(!/Execution context was destroyed/.test(e.message))throw e;await page.waitForFunction(()=>state.vehicles.length>0&&!document.querySelector('#app').classList.contains('startup-loading'));return page.evaluate(()=>appCacheId());}),'fuellog-v41-deferred-startup');
  await page.evaluate(async()=>{const vehicle=state.vehicles[0];await FuelDB.put('fillups',{id:'upgrade-test',vehicleId:vehicle.id,date:'2026-10-01T08:01:02.345Z',litres:23.456,odometer:100,totalCost:42.1234,currency:'USD',fullTank:false,notes:'Preserve local data',source:{format:'qa',original:{untouched:true}}});await setSetting('priceCountry','ES');await refresh();});
  phase='broken';await page.reload();await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();}).catch(e=>{if(!/Execution context was destroyed/.test(e.message))throw e;});
  await page.waitForFunction(async()=>{const keys=await caches.keys();return keys.includes('fuellog-v42-languages')&&!keys.includes('fuellog-v41-deferred-startup')&&!swReloading&&!document.querySelector('#app').classList.contains('startup-loading');});
  const brokenState=await page.evaluate(()=>({version:appCacheId(),flag:!!document.querySelector('#languageButton'),wired:!!(document.querySelector('#languageButton')||{}).onclick}));assert.equal(brokenState.version,'fuellog-v41-deferred-startup');assert.equal(brokenState.flag,true);assert.equal(brokenState.wired,false);console.log('Reproduced poisoned v42 cache: v41 app with inert language flag');
  phase='current';
  // Old worker returns fresh HTML and cached old scripts; upgrade precache must
  // bypass the HTTP cache before its controller takes over.
  await page.reload();
  await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();}).catch(e=>{if(!/Execution context was destroyed/.test(e.message))throw e;});
  await page.waitForFunction(()=>window.FUELLOG_CONFIG.appCacheId!=='fuellog-v41-deferred-startup'&&!document.querySelector('#app').classList.contains('startup-loading'),null,{timeout:20000}).catch(async e=>{console.error('Upgrade diagnostic:',await page.evaluate(async()=>({version:appCacheId(),flag:!!document.querySelector('#languageButton'),flagWired:!!(document.querySelector('#languageButton')||{}).onclick,caches:await caches.keys(),htmlVersion:document.documentElement.getAttribute('data-app-version')})));throw e;});
  let expected=currentId;
  await page.waitForFunction(async id=>(await caches.keys()).includes(id)&&!(await caches.keys()).includes('fuellog-v42-languages')&&!swReloading&&await requestWorkerVersion(navigator.serviceWorker.controller)===id,expected);
  assert.equal(await page.evaluate(()=>appCacheId()),expected);
  await page.locator('#languageButton').click();await page.locator('[data-language="pt"]').click();await page.waitForFunction(()=>window.FuelLogI18n.current()==='pt');
  assert.equal(await page.evaluate(()=>state.settings.priceCountry),'ES');
  const record=await page.evaluate(()=>state.fillups[0]);assert.equal(record.id,'upgrade-test');assert.equal(record.totalCost,42.1234);assert.equal(record.date,'2026-10-01T08:01:02.345Z');assert.equal(record.source.original.untouched,true);
  // A failed next release must keep the current HTML/scripts intact and show a
  // useful error when Update app is pressed, rather than looping silently.
  phase='future';failAsset=true;
  await page.locator('.bottom-nav [data-route="settings"]').click();await page.locator('#appUpdateBtn').waitFor();await page.locator('#appUpdateBtn').click();
  await page.waitForFunction(()=>state.swUpdate.error&&document.querySelector('#appUpdateBtn').disabled===false);
  assert.ok((await page.locator('#appVersionStatus').innerText()).includes('Não foi possível transferir'));
  await page.reload();await page.waitForFunction(()=>state.vehicles.length>0&&!document.querySelector('#app').classList.contains('startup-loading'));if(await page.evaluate(()=>appCacheId())!==expected){console.error('Partial-update diagnostic',await page.evaluate(async()=>({build:appCacheId(),config:window.FUELLOG_CONFIG.appCacheId,html:document.documentElement.getAttribute('data-app-version'),controller:await requestWorkerVersion(navigator.serviceWorker.controller),caches:await Promise.all((await caches.keys()).map(async key=>{const c=await caches.open(key),r=await c.match('index.html');return{key,html:r?(await r.text()).match(/data-app-version="([^"]+)/):null}}))})),requests.slice(-35));}assert.equal(await page.evaluate(()=>appCacheId()),expected);assert.equal(await page.locator('html').getAttribute('data-app-version'),expected);
  failAsset='old-shell';await page.locator('.bottom-nav [data-route="settings"]').click();await page.locator('#appUpdateBtn').waitFor();await page.locator('#appUpdateBtn').click();await page.waitForFunction(()=>state.swUpdate.error&&document.querySelector('#appUpdateBtn').disabled===false);
  await page.reload();await page.waitForFunction(()=>state.vehicles.length>0&&!document.querySelector('#app').classList.contains('startup-loading'));if(await page.evaluate(()=>appCacheId())!==expected){console.error('Partial-update diagnostic',await page.evaluate(async()=>({build:appCacheId(),config:window.FUELLOG_CONFIG.appCacheId,html:document.documentElement.getAttribute('data-app-version'),controller:await requestWorkerVersion(navigator.serviceWorker.controller),caches:await Promise.all((await caches.keys()).map(async key=>{const c=await caches.open(key),r=await c.match('index.html');return{key,html:r?(await r.text()).match(/data-app-version="([^"]+)/):null}}))})),requests.slice(-35));}assert.equal(await page.evaluate(()=>appCacheId()),expected);assert.equal(await page.locator('html').getAttribute('data-app-version'),expected);assert.ok(!(await page.evaluate(()=>caches.keys())).includes(nextId),'inconsistent release cache must be discarded');
  failAsset=false;
  await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();}).catch(e=>{if(!/Execution context was destroyed/.test(e.message))throw e;});
  await page.waitForFunction(id=>appCacheId()===id&&!swReloading&&!document.querySelector('#app').classList.contains('startup-loading'),nextId,{timeout:20000});expected=nextId;
  assert.equal(await page.locator('html').getAttribute('data-app-version'),expected);assert.equal(await page.evaluate(()=>state.fillups[0].source.original.untouched),true);
  await context.setOffline(true);await page.reload();await page.waitForFunction(()=>state.fillups.length===1);assert.equal(await page.evaluate(()=>appCacheId()),expected);assert.equal(await page.locator('#languageButton').innerText(),'🇵🇹');
  assert.deepEqual(errors,[]);console.log('poisoned v42 recovery, incomplete-release rejection/retry, update feedback and data/offline preservation passed');
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
