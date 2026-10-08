'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

function createStores() {
  return { vehicles: {}, fillups: {}, settings: {}, promos: {}, priceCache: {}, mapTiles: {} };
}

function createFuelDb(stores) {
  return {
    async all(name) { return Object.values(stores[name] || {}); },
    async get(name, key) {
      if (name === 'settings') return stores.settings[key] || null;
      return stores[name][key] || null;
    },
    async put(name, val) {
      const key = name === 'settings' ? val.key : (val.id || val.key);
      stores[name][key] = val;
      return val;
    },
    async clear(name) { stores[name] = {}; },
    async commitImport(batch) {
      const names = ['vehicles', 'fillups', 'settings', 'promos'].filter(function (n) { return batch[n] !== undefined; });
      names.forEach(function (name) {
        if (batch.replace && name !== 'settings') stores[name] = {};
        (batch[name] || []).forEach(function (record) {
          const key = name === 'settings' ? record.key : record.id;
          stores[name][key] = record;
        });
      });
    }
  };
}

const stores = createStores();
stores.vehicles.v1 = { id: 'v1', name: 'Car', fuelType: 'Gasóleo', make: '', model: '', registration: '', initialOdometer: 0 };
stores.fillups.f1 = {
  id: 'f1', vehicleId: 'v1', date: '2026-01-01T00:00:00.000Z', odometer: 1000, litres: 40,
  totalCost: 80, pricePerLitre: 2, fullTank: true, fuelType: 'Gasóleo'
};
stores.settings.schemaMigrated = { key: 'schemaMigrated', value: 0 };
stores.settings.fuelTypeId = { key: 'fuelTypeId', value: '2101' };
stores.settings.mapTileProvider = { key: 'mapTileProvider', value: 'legacy' };
stores.mapTiles.old = { key: 'z/1/1', blob: {}, ts: 1, size: 100 };

const window = {};
const context = vm.createContext({
  window: window,
  Date: Date,
  Intl: Intl,
  URL: URL,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  navigator: { userAgent: '', onLine: true },
  document: { querySelector: function () { return null; } },
  FuelDB: createFuelDb(stores),
  indexedDB: { open: function () { throw new Error('unexpected indexedDB'); } }
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/prices/providers.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/prices/fuels.js'), 'utf8'), context);
context.FuelLogData = window.FuelLogData;
context.FuelLogFuels = window.FuelLogFuels;
context.FuelProviders = window.FuelProviders;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8').replace(/init\(\)\.catch[\s\S]*$/, ''), context);
const run = function (code) { return vm.runInContext(code, context); };

(async function () {
  await run('(async function(){ await refresh(); })()');
  assert.equal(run("state.fillups.find(f=>f.id==='f1').currency"), undefined);
  await run('(async function(){ await migrateData(false); })()');
  await run('(async function(){ await refresh(); })()');
  assert.equal(run("state.fillups.find(f=>f.id==='f1').currency"), 'EUR');
  assert.equal(run("state.vehicles.find(v=>v.id==='v1').preferredFuel"), 'DIESEL_B7');
  assert.equal(run("state.fillups.find(f=>f.id==='f1').fuelId"), 'DIESEL_B7');
  assert.equal(stores.settings['priceFuel:PT'].value, '2101');
  assert.equal(stores.settings.schemaMigrated.value, 4);
  assert.equal(Object.keys(stores.mapTiles).length, 0, 'map tile cache must reset on provider change');
  assert.equal(stores.settings.mapTileProvider.value, 'otm-v1');
  console.log('migration checks passed');
})().catch(function (e) { console.error(e); process.exitCode = 1; });
