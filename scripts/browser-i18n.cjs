// Optional real-browser language and offline flow check. Uses an isolated synthetic log.
const {chromium}=require(process.env.FUELLOG_QA_PLAYWRIGHT||'playwright');
const assert=require('assert');
async function openReadyApp(page,url){
 // Install the actual offline shell from a non-app document so its initial
 // controller-change reload cannot interrupt the first UI assertions.
 await page.goto(new URL('config.js',url).href);
 await page.evaluate(async()=>{await navigator.serviceWorker.register(new URL('sw.js',location.href).href);await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await page.goto(url);
 await page.waitForFunction(()=>state.vehicles.length>0&&!document.querySelector('#app').classList.contains('startup-loading'));
}

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.FUELLOG_QA_CHROMIUM||undefined});
 try{
  const context=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message)});
  await openReadyApp(page,process.env.FUELLOG_QA_URL||'http://127.0.0.1:8765');
  assert.equal(await page.locator('#languageButton').count(),1,'flag language selector must exist in the header');
  async function language(code){await page.locator('#languageButton').click();await page.locator('[data-language="'+code+'"]').click();await page.waitForFunction(c=>FuelLogI18n.current()===c,code);}
  await page.evaluate(async()=>{await setSetting('priceCountry','ES');await setSetting('suggestBtn',false);render();});
  await language('pt');assert.equal(await page.locator('html').getAttribute('lang'),'pt-PT');
  assert.equal(await page.locator('#languageButton').innerText(),'🇵🇹');assert.ok(await page.locator('#suggestBtn').isHidden());
  assert.equal(await page.evaluate(()=>state.settings.priceCountry),'ES');
  assert.equal(await page.locator('[data-route="history"] small').innerText(),'Histórico');
  for(const width of [375,320]){await page.setViewportSize({width,height:667});const box=await page.locator('#languageButton').boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.ok(box.x+box.width<=width);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.locator('.bottom-nav [data-route="add"]').click();
  await page.locator('#fillForm [name="litres"]').fill('23.456');await page.locator('#fillForm [name="pricePerLitre"]').fill('1.789');
  await page.locator('#fillForm [name="totalCost"]').fill('42.1234');await page.locator('#fillForm [name="odometer"]').fill('250');await page.locator('#fillNotes').fill('Home · Find <script>never translate me</script>');
  await page.locator('#fillFullTank').uncheck();
  await page.locator('#fillUrbanMissing').uncheck();await page.locator('#fillUrban').fill('37');
  await language('en');assert.equal(await page.locator('#fillNotes').inputValue(),'Home · Find <script>never translate me</script>');assert.equal(await page.locator('#fillForm [name="totalCost"]').inputValue(),'42.1234');assert.equal(await page.locator('#fillForm [name="litres"]').inputValue(),'23.456');assert.ok(!await page.locator('#fillFullTank').isChecked());assert.equal(await page.locator('#fillUrban').inputValue(),'37');
  await language('pt');await page.getByRole('button',{name:'Guardar abastecimento',exact:true}).click();
  await page.waitForFunction(()=>state.fillups.length===1);assert.equal(await page.evaluate(()=>state.fillups[0].cityPercentage),0.37);assert.equal(await page.evaluate(()=>state.fillups[0].totalCost),42.1234);assert.equal(await page.evaluate(()=>state.fillups[0].notes),'Home · Find <script>never translate me</script>');
  await page.evaluate(async()=>{const fill=state.fillups[0];fill.cityPercentage=0.3333333333333333;delete fill.cityPercentageSource;fill.source={format:'jerrycan',key:'qa-source',original:{FullTank:false,Date:'original source date'}};fill.stationLocation={address:'Original road',latitude:38.7,longitude:-9.1,externalIds:{jerrycan:'source-station'}};fill.date='2026-10-12T10:00:12.345Z';await FuelDB.put('fillups',fill);await refresh();route('history');});
  await page.locator('[data-edit]').click();await language('en');await language('pt');await page.getByRole('button',{name:'Atualizar abastecimento',exact:true}).click();await page.waitForFunction(()=>state.route==='dashboard');
  const preserved=await page.evaluate(()=>state.fillups[0]);assert.equal(preserved.cityPercentage,0.3333333333333333);assert.equal(preserved.cityPercentageSource,undefined);assert.equal(preserved.date,'2026-10-12T10:00:12.345Z');assert.equal(preserved.source.key,'qa-source');assert.equal(preserved.source.original.Date,'original source date');assert.equal(preserved.stationLocation.externalIds.jerrycan,'source-station');
  await page.evaluate(async()=>{await setSetting('suggestBtn',true);render();});assert.ok(await page.locator('#suggestBtn').isVisible());const flagBox=await page.locator('#languageButton').boundingBox(),feedbackBox=await page.locator('#suggestBtn').boundingBox();assert.ok(flagBox.x+flagBox.width<=feedbackBox.x);assert.ok(feedbackBox.x+feedbackBox.width<=320);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('.bottom-nav [data-route="history"]').click();await page.locator('#historySearch').fill('no matching marker');await language('en');assert.equal(await page.locator('#historyList .row').count(),0,'restored search must filter the list');await language('pt');await page.locator('#historySearch').fill('');
  await page.locator('.bottom-nav [data-route="settings"]').click();await page.locator('#addVehicle').click();await page.locator('#vehicleForm [name="name"]').fill('Draft vehicle');await language('en');assert.equal(await page.locator('#vehicleForm [name="name"]').inputValue(),'Draft vehicle');await page.locator('#vehicleCancel').click();
  await page.locator('#addPromo').click();await page.locator('#promoForm [name="brand"]').fill('Draft brand');await language('pt');assert.equal(await page.locator('#promoForm [name="brand"]').inputValue(),'Draft brand');await page.locator('#promoCancel').click();
  await page.locator('.bottom-nav [data-route="prices"]').click();await page.locator('#findPrices').waitFor();await page.waitForFunction(()=>state.priceFuels.length>0);
  assert.equal(await page.locator('#priceCountry').inputValue(),'ES');assert.equal(await page.locator('#findPrices').innerText(),'');assert.ok(await page.locator('#findPrices svg').count());
  await page.locator('#radius').selectOption('20');await language('en');await page.waitForFunction(()=>document.querySelector('#radius').value==='20');assert.equal(await page.locator('#priceCountry').inputValue(),'ES');
  await language('pt');
  await page.evaluate(()=>{FuelProviders.referenceProvider('NL').referencePrices=async()=>({prices:[{label:'Petrol 95',canonical:'PETROL_95',value:1.8,validFrom:'2026-10-01'}],ts:Date.now(),stale:false});});
  await page.locator('#priceCountry').selectOption('NL');await page.locator('#stationList .station').waitFor();await language('en');await page.locator('#stationList .station').waitFor({timeout:10000});assert.equal(await page.locator('#stationList .station').count(),1,'reference prices must survive language changes');await language('pt');await page.locator('#stationList .station').waitFor({timeout:10000});assert.equal(await page.locator('#stationList .station').count(),1);await page.locator('#priceCountry').selectOption('ES');
  await page.locator('.bottom-nav [data-route="dashboard"]').click();await page.waitForFunction(()=>!!window.FuelLogAnalysisUI);
  assert.equal(await page.locator('[data-analysis-tab="consumption"]').innerText(),'Consumo');await language('en');assert.equal(await page.locator('[data-analysis-tab="consumption"]').innerText(),'Consumption');await language('pt');
  await page.screenshot({path:'/tmp/fuellog-i18n-pt.png',fullPage:true});await page.locator('#languageButton').click();await page.screenshot({path:'/tmp/fuellog-i18n-menu.png'});await page.keyboard.press('Escape');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await context.setOffline(true);await page.reload();await page.waitForFunction(()=>state.vehicles.length>0).catch(async e=>{console.error(await page.locator('body').innerText());throw e;});
  assert.equal(await page.locator('#languageButton').innerText(),'🇵🇹');assert.equal(await page.evaluate(()=>state.settings.priceCountry),'ES');await language('en');await language('pt');
  assert.deepEqual(errors,[]);console.log('375/320px flag selector, independent country, drafts/imported precision, History filters, reference prices, charts and offline persistence passed');
  const automatic=await browser.newContext({locale:'pt-BR',viewport:{width:375,height:667},isMobile:true,hasTouch:true});
  // Simulate an OS language change on subsequent launches without altering the app setting.
  await automatic.addInitScript(()=>{const language=localStorage.getItem('qa-device-language')||'pt-BR';Object.defineProperty(navigator,'language',{get:()=>language});Object.defineProperty(navigator,'languages',{get:()=>[language]});});
  const autoPage=await automatic.newPage();autoPage.on('pageerror',e=>errors.push(e.message));
  const url=process.env.FUELLOG_QA_URL||'http://127.0.0.1:8765';
  async function readyAuto(){await autoPage.waitForFunction(async()=>state.vehicles.length>0&&navigator.serviceWorker.controller&&!swReloading&&!document.querySelector('#app').classList.contains('startup-loading')&&await requestWorkerVersion(navigator.serviceWorker.controller)===appCacheId());}
  await openReadyApp(autoPage,url);await readyAuto();
  assert.equal(await autoPage.locator('#languageButton').innerText(),'🇵🇹');assert.equal(await autoPage.evaluate(()=>state.settings.language),null);assert.ok(await autoPage.evaluate(async()=>!(await FuelDB.get('settings','language'))));
  await autoPage.evaluate(async()=>{await setSetting('priceCountry','ES');localStorage.setItem('qa-device-language','en-US');});await autoPage.reload();await readyAuto();
  assert.equal(await autoPage.locator('#languageButton').innerText(),'🇬🇧');assert.equal(await autoPage.evaluate(()=>state.settings.language),null);assert.equal(await autoPage.evaluate(()=>state.settings.priceCountry),'ES');
  await autoPage.evaluate(()=>localStorage.setItem('qa-device-language','pt-PT'));await autoPage.reload();await readyAuto();
  await autoPage.locator('#languageButton').click();await autoPage.locator('[data-language="pt"]').click();await autoPage.waitForFunction(()=>state.settings.language==='pt');
  assert.equal(await autoPage.evaluate(async()=>(await FuelDB.get('settings','language')).value),'pt');
  await autoPage.evaluate(()=>localStorage.setItem('qa-device-language','en-US'));await automatic.setOffline(true);await autoPage.reload();await readyAuto();
  assert.equal(await autoPage.locator('#languageButton').innerText(),'🇵🇹');assert.equal(await autoPage.evaluate(()=>state.settings.priceCountry),'ES');
  await autoPage.locator('#languageButton').click();await autoPage.locator('[data-language="en"]').click();await autoPage.waitForFunction(()=>state.settings.language==='en');
  await autoPage.evaluate(()=>localStorage.setItem('qa-device-language','pt-PT'));await autoPage.reload();await readyAuto();assert.equal(await autoPage.locator('#languageButton').innerText(),'🇬🇧');
  const unsupported=await browser.newContext({locale:'fr-FR'}),fallbackPage=await unsupported.newPage();fallbackPage.on('pageerror',e=>errors.push(e.message));await openReadyApp(fallbackPage,url);await fallbackPage.waitForFunction(()=>state.vehicles.length>0&&navigator.serviceWorker.controller&&!swReloading&&!document.querySelector('#app').classList.contains('startup-loading'));assert.equal(await fallbackPage.locator('#languageButton').innerText(),'🇬🇧');assert.equal(await fallbackPage.evaluate(()=>state.settings.language),null);
  assert.deepEqual(errors,[]);console.log('device defaults, unsupported-language fallback, current-language explicit choice, changed-device override and offline persistence passed');

 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
