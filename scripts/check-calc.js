'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const window = {};
const context = vm.createContext({
  window: window,
  Date: Date,
  Intl: Intl,
  URL: URL,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  navigator: { userAgent: '' },
  document: { querySelector: function () { return null; } },
  FuelDB: { async put() {}, async all() { return []; }, async get() { return null; } },
  FuelLogFuels: { LIST: [], guess: function () { return null; }, label: function () { return ''; }, present: function () { return ''; } },
  FuelProviders: {}
});
require('./i18n-test-helper.cjs')(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8'), context);
context.FuelLogData = window.FuelLogData;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8').replace(/init\(\)\.catch[\s\S]*$/, ''), context);
const run = function (code) { return vm.runInContext(code, context); };

const seriesFills = [
  { date: '2026-01-01', odometer: 100000, litres: 60, fullTank: true, totalCost: 100, currency: 'EUR' },
  { date: '2026-01-02', odometer: 100300, litres: 25, fullTank: false, totalCost: 40, currency: 'EUR' },
  { date: '2026-01-03', odometer: 100550, litres: 20, fullTank: false, totalCost: 32, currency: 'EUR' },
  { date: '2026-01-04', odometer: 100800, litres: 35, fullTank: true, totalCost: 56, currency: 'EUR' }
];
run("state.vehicles=[{id:'car',name:'Car',currency:'EUR'}];state.fillups=" + JSON.stringify(seriesFills.map(function (f, i) {
  return Object.assign({ id: 'f' + i, vehicleId: 'car' }, f);
})) + ";state.settings={activeVehicle:'car'};");
const metrics = run("calcMetrics({id:'car'})");
assert.equal(metrics.avg, 10, 'dashboard avg must use full-tank intervals only');
assert.equal(metrics.distance, 800);
assert.equal(run("consumptionSeries('car').length"), 1);
assert.equal(run("consumptionSeries('car')[0].y"), 10);

const endRow = run("fillRow(state.fillups[3], fillIntervalEndMap('car'))");
assert.ok(endRow.indexOf('ui.odometer') < 0, 'completed full-tank rows must not label odometer');
assert.ok(endRow.indexOf('100,800 km') >= 0, 'fill rows must always show total mileage');
assert.ok(endRow.indexOf('800 km') >= 0, 'interval distance should appear with consumption');
assert.equal(run("calcRecentMetrics({id:'car'},10).avg"), 10);
assert.ok(endRow.indexOf('10 L/100 km') >= 0, 'interval consumption should be shown');
assert.ok(endRow.indexOf('/km') >= 0, 'interval cost per km should be shown');
const partialRow = run("fillRow(state.fillups[1], fillIntervalEndMap('car'))");
assert.ok(partialRow.indexOf('100,300 km') >= 0, 'partial rows keep the odometer reading');

assert.equal(run("flexDate('01/02/2026 08:30')").slice(0, 16), '2026-02-01T08:30');
assert.equal(run("flexNum('1.234,56')"), 1234.56);
assert.equal(run("guessDelimiter('a;b;c\\nd;e;f')"), ';');
const rows = run("parseDelimited('date,odometer,litres,cost\\n2026-01-01,1,2,4\\n\"2026,01,02\",3,4,8', ',')");
assert.equal(rows.length, 2);
assert.equal(rows[1].date, '2026,01,02');

console.log('calc and parser checks passed');
