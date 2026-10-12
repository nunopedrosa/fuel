'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const settings={},writes=[],button={disabled:false};
const context=vm.createContext({window:{},Date,Intl,console,navigator:{languages:['pt-PT','en-US'],language:'pt-PT',userAgent:''},document:{querySelector(selector){return selector==='#languageButton'?button:null}},FuelDB:{async all(){return []},async get(store,key){return settings[key]||null},async put(store,record){writes.push({store,record});settings[record.key]=record}}});
require('./i18n-test-helper.cjs')(context);
const I=context.window.FuelLogI18n;
assert.equal(typeof I.resolve,'function','language selection must resolve device preferences when no app choice is saved');
[
 [undefined,['pt-PT'],'pt'],[null,['pt-BR'],'pt'],['',['PT_br'],'pt'],
 [null,['es-ES','pt-PT','en-US'],'pt'],[null,['en-US','pt-PT'],'en'],
 [null,['fr-FR','es-ES'],'en'],[null,[],'en'],[null,undefined,'en'],
 ['en',['pt-PT'],'en'],['pt',['en-US'],'pt'],['unknown',['pt-PT'],'en']
].forEach(([saved,preferred,expected])=>assert.equal(I.resolve(saved,preferred),expected,JSON.stringify([saved,preferred])));
vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').replace(/init\(\)\.catch[\s\S]*$/,''),context);
const run=source=>vm.runInContext(source,context);
run('closeLanguageChoices=function(){};captureLanguageDraft=function(){return {}};render=function(){};');
(async()=>{
 settings.priceCountry={key:'priceCountry',value:'ES'};
 await run('refresh()');assert.equal(I.current(),'pt');assert.equal(run('state.settings.language'),null);assert.equal(writes.length,0,'automatic detection is not a saved choice');assert.equal(run('state.settings.priceCountry'),'ES');
 context.navigator.languages=['en-US'];context.navigator.language='en-US';await run('refresh()');assert.equal(I.current(),'en','device changes apply while no manual choice exists');
 context.navigator.languages=[];context.navigator.language='pt-BR';await run('refresh()');assert.equal(I.current(),'pt','navigator.language works when language list is missing or empty');
 await run("changeLanguage('pt')");assert.equal(settings.language.value,'pt','selecting the detected/current language must save an explicit choice');assert.equal(button.disabled,false);
 context.navigator.languages=['en-US'];context.navigator.language='en-US';await run('refresh()');assert.equal(I.current(),'pt','saved selection wins over changed device language');assert.equal(run('state.settings.priceCountry'),'ES');
 await run("changeLanguage('en')");context.navigator.languages=['pt-PT'];await run('refresh()');assert.equal(I.current(),'en');assert.equal(settings.language.value,'en');
 const before=writes.length;await run("changeLanguage('en')");assert.equal(writes.length,before,'an already saved identical choice does not need rewriting');
 delete settings.language;delete context.navigator.languages;context.navigator.language='pt-PT';await run('refresh()');assert.equal(I.current(),'pt','older browser language property fallback');
 console.log('device-language defaults, regional matching, manual lock, current-choice save and country independence passed');
})().catch(error=>{console.error(error);process.exitCode=1});
