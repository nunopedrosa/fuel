'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const context=vm.createContext({window:{},Date,Intl,console,navigator:{userAgent:''},document:{querySelector(){return null}},FuelLogFuels:{LIST:[],guess(){return null}},FuelLogPromos:{DEFAULT_FILL_LITRES:40}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').replace(/init\(\)\.catch[\s\S]*$/,''),context);
const run=s=>vm.runInContext(s,context);
const html=run('fillForm()');
assert.ok(html.includes('id="fillUrban"'),'fill-up must offer urban-driving slider');
assert.ok(html.indexOf('name="fuelId"')<html.indexOf('id="fillUrban"'),'slider belongs below Fuel');
function form(original){
 const range={value:original==null?'50':String(Math.round(original*100)),disabled:false,getAttribute(){return original==null?'':String(original)},setAttribute(k,v){this[k]=v}};
 const missing={checked:original==null},output={textContent:''};
 const controls={'#fillUrban':range,'#fillUrbanMissing':missing,'#fillUrbanValue':output};
 context.form={querySelector(s){return controls[s]}};
 const apply=run('wireUrbanProfile(form)');
 return {range,missing,output,apply};
}
let f=form(null),record={notes:'retained'};
f.apply(record);assert.ok(!('cityPercentage' in record),'untouched form must not invent 50%');assert.ok(f.range.disabled);assert.equal(f.output.textContent,'Not specified');
f.missing.checked=false;f.missing.onchange();f.range.value='30';f.range.oninput();f.apply(record);
assert.equal(record.cityPercentage,0.3);assert.equal(record.cityPercentageSource,'user');assert.equal(f.output.textContent,'30% urban · 70% outside urban areas');
for(const value of [0,1,0.3333333333333333]){
 f=form(value);record={cityPercentage:value,source:{format:'jerrycan',key:'keep'},notes:'keep'};
 f.apply(record);assert.strictEqual(record.cityPercentage,value,'untouched imported precision must survive');assert.ok(!record.cityPercentageSource);assert.equal(record.source.key,'keep');assert.ok(!f.range.disabled);
 f.missing.checked=true;f.missing.onchange();f.apply(record);assert.ok(!('cityPercentage' in record));assert.ok(!('cityPercentageSource' in record));assert.equal(record.source.key,'keep');
}
f=form(0.123456);record={cityPercentage:0.123456,source:{format:'jerrycan'}};f.range.value='0';f.range.oninput();f.apply(record);assert.equal(record.cityPercentage,0);assert.equal(record.cityPercentageSource,'user');
assert.ok(!run("importedDetails({cityPercentage:0.3,cityPercentageSource:'user'})").includes('imported estimate'),'manual estimates must not be labelled imported');
console.log('urban profile optionality, precision and provenance checks passed');
