'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

let batch;
const context = vm.createContext({
  window: {},
  Date: Date,
  Intl: Intl,
  URL: URL,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  navigator: { userAgent: '' },
  document: { querySelector: function () { return null; } },
  FuelDB: { async commitImport(b) { batch = b; } },
  FuelLogFuels: { LIST: [], guess: function () { return null; }, label: function () { return ''; }, present: function () { return ''; } },
  FuelProviders: {}
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8'), context);
context.FuelLogData = context.window.FuelLogData;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8').replace(/init\(\)\.catch[\s\S]*$/, ''), context);
vm.runInContext('appDialog=async function(){return this.dialogResults.shift()};toast=function(){};', context);
context.dialogResults = [true];
const run = function (code) { return vm.runInContext(code, context); };

(async function () {
  assert.equal(run('extractRowsFromJson({fillups:[{a:1}]})').length, 1);
  assert.equal(run('extractRowsFromJson({records:[{a:2}]})').length, 1);
  assert.equal(run('extractRowsFromJson({entries:[{a:3}]})').length, 1);
  assert.equal(run('extractRowsFromJson({data:[{a:4}]})').length, 1);
  assert.equal(run('extractRowsFromJson([{a:5}])').length, 1);

  const existing = {
    id: 'same', vehicleId: 'car', date: '2026-01-01T00:00:00.000Z', odometer: 1, litres: 2,
    totalCost: 4, currency: 'EUR', fullTank: true, fuelId: 'PETROL_95_ADDITIVATED', receiptFuelType: 'PRIO TOP 95'
  };
  await run('state.vehicles=[{id:"car",name:"Car",currency:"EUR"}];state.fillups=[' + JSON.stringify(existing) + '];state.settings={activeVehicle:"car"};state.promos=[]');
  batch = null;
  context.dialogResults = [true];
  await run('importFuelLogBackup({format:"FuelLog",version:4,vehicles:[{id:"car",name:"Car",currency:"EUR"}],fillups:[' + JSON.stringify(existing) + ']},false)');
  assert.equal(batch.fillups.length, 0, 'identical fill-up on merge must be skipped');
  context.dialogResults = [true];
  await run('importFuelLogBackup(' + JSON.stringify({format: 'FuelLog', version: 4, vehicles: [{id: 'car', name: 'Car', currency: 'EUR'}], fillups: [existing]}) + ',true)');
  assert.equal(batch.fillups[0].receiptFuelType, 'PRIO TOP 95', 'JSON restore preserves original receipt fuel description');
  assert.equal(batch.fillups[0].fuelId, 'PETROL_95_ADDITIVATED');

  batch = null;
  context.dialogResults = [true];
  await run('importFuelLogBackup({format:"FuelLog",version:4,vehicles:[{id:"car",name:"Car",currency:"EUR"}],fillups:[{id:"same",vehicleId:"car",date:"2026-01-01T00:00:00.000Z",odometer:9,litres:2,totalCost:4,fullTank:true,currency:"EUR"}]},false)');
  assert.equal(batch.fillups.length, 1);
  assert.notEqual(batch.fillups[0].id, 'same', 'conflicting fill-up content must get a new id');

  await run('state.promos=[{id:"old",brand:"X",type:"litre",amount:0.01,active:true}];state.fillups=[];state.vehicles=[{id:"v",name:"V"}];state.settings={activeVehicle:"v"}');
  batch = null;
  context.dialogResults = [true];
  await run('importFuelLogBackup({format:"FuelLog",version:4,vehicles:[{id:"v",name:"V"}],fillups:[],promos:[{id:"p1",brand:"Galp",type:"litre",amount:0.03,active:true}],settings:[{key:"activeVehicle",value:"v"}]},true)');
  assert.equal(batch.replace, true);
  assert.equal(batch.promos.length, 1);
  assert.equal(batch.promos[0].id, 'p1', 'replace must restore backup promos');

  context.dialogResults = [false];
  batch = null;
  await run('importFuelLogBackup({format:"FuelLog",version:4,vehicles:[{id:"v",name:"V"}],fillups:[{id:"x",vehicleId:"v",date:"2026-01-01",odometer:1,litres:2,totalCost:4,fullTank:true}]},false)');
  assert.equal(batch, null, 'cancelled backup import must not commit');

  console.log('import backup checks passed');
})().catch(function (e) { console.error(e); process.exitCode = 1; });
