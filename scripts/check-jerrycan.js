'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');const window={};
['js/data.js','js/import/bplist.js','js/import/jerrycan.js'].forEach(f=>vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),{window,Date,ArrayBuffer,Uint8Array,DataView}));
const b=fs.readFileSync(process.argv[2]||path.join(__dirname,'fixtures/jerrycan/history.jerrycan'));const root=window.FuelLogBplist.decode(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));const J=window.FuelLogJerrycan;
const opts={distanceUnit:'km',volumeUnit:'litre',fuelId:'DIESEL_B7'};const data=J.normalize(root,opts);
assert.equal(data.errors.length,0);assert.equal(data.fillups.length,root.Records.length);assert.equal(data.vehicle.currency,'EUR');
if(!process.argv[2]){
assert.equal(data.fillups[0].cityPercentage,0);assert.equal(data.fillups[0].stationLocation.externalIds.jerrycan,'test-station');assert.equal(data.fillups[0].date,'2026-01-01T12:00:00.000Z');assert.equal(data.vehicle.vin,undefined);
const reversed=J.normalize({Car:root.Car,Records:root.Records.slice().reverse()},opts);assert.equal(data.fillups[0].source.key,reversed.fillups[3].source.key);
assert.throws(()=>J.normalize(root,{}),/units/i);
const converted=J.normalize(root,{distanceUnit:'mile',volumeUnit:'us-gallon'});assert.equal(converted.fillups[0].litres,60*3.785411784);assert.equal(converted.fillups[0].source.key,data.fillups[0].source.key);
const bad=Object.assign({},root.Records[0],{FullTank:9});assert.equal(J.normalize({Car:root.Car,Records:[bad]},opts).errors.length,1);
const foreign=Object.assign({},root.Records[0],{Currency:'USD',PricePerLiter:4});const f=J.normalize({Car:root.Car,Records:[foreign]},opts).fillups[0];assert.equal(f.currency,'EUR');assert.equal(f.pricePerLitre,2);assert.equal(f.source.original.PricePerLiter,4);
const invalidDate=Object.assign({},root.Records[0],{Date:'2026-02-30T12:00:00Z'});assert.equal(J.normalize({Car:root.Car,Records:[invalidDate]},opts).errors.length,1,'invalid qualified dates must be rejected');
assert.equal(data.fillups[0].source.original.DatePlistSeconds,root.Records[0].Date.plistSeconds);
let tree={leaf:'x'};for(let i=0;i<20;i++)tree={a:tree,b:tree};assert.throws(()=>J.normalize({Car:Object.assign({},root.Car,{extra:tree}),Records:root.Records},opts),/metadata/i,'source metadata must not expand a shared object graph without a budget');
}else{assert.equal(data.fillups.length,88);assert.equal(data.summary.full,58);assert.equal(data.summary.partial,30);assert.equal(data.summary.locations,74)}
console.log('Jerrycan checks passed:',JSON.stringify(data.summary));
