'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const PROXY_DATASETS = ['pt-dgeg', 'es-minetur'];
const fixtureDir = path.join(__dirname, 'fixtures/providers');

const cache = {};
const FuelDB = {
  async get(store, key) { return cache[store + ':' + key] || null; },
  async put(store, val) { cache[store + ':' + val.key] = val; return val; }
};

const window = {};
const context = vm.createContext({
  window: window,
  FuelDB: FuelDB,
  Date: Date,
  Math: Math,
  URL: URL,
  encodeURIComponent: encodeURIComponent,
  fetch: async function () { throw new Error('unexpected fetch'); },
  navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_5 like Mac OS X)' }
});

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}

load('js/prices/providers.js');
const FP = window.FuelProviders;

assert.equal(FP.parseNum('1,789'), 1.789);
assert.equal(FP.localIso('2026-01-15 14:30').slice(0, 16), '2026-01-15T14:30');
assert.equal(FP.legacyIOS(), true);
context.navigator = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)' };
assert.equal(FP.legacyIOS(), false);

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), 'utf8'));
}

(async function () {
  let loaderCalls = 0;
  const first = await FP.cached('test:key', 60000, async function () { loaderCalls++; return { ok: true }; });
  assert.equal(first.data.ok, true);
  assert.equal(loaderCalls, 1);
  const second = await FP.cached('test:key', 60000, async function () { loaderCalls++; return { ok: false }; });
  assert.equal(second.fromCache, true);
  assert.equal(loaderCalls, 1);

  FuelDB.get = async function (store, key) {
    if (store === 'priceCache' && key === 'stale:key') {
      return { key: 'stale:key', ts: Date.now() - 120000, data: { kept: true } };
    }
    return cache[store + ':' + key] || null;
  };
  const stale = await FP.cached('stale:key', 60000, async function () { throw new Error('offline'); });
  assert.equal(stale.stale, true);
  assert.equal(stale.data.kept, true);
  FuelDB.get = async function (store, key) { return cache[store + ':' + key] || null; };

  FP.fetchJson = async function () { return readFixture('pt-dgeg-search.json'); };
  load('js/prices/providers/pt-dgeg.js');
  FP.fetchJson = async function () { return readFixture('es-minetur-search.json'); };
  load('js/prices/providers/es-minetur.js');
  FP.fetchJson = async function (url) {
    if (String(url).indexOf('data.economie.gouv.fr') >= 0) return readFixture('fr-government-search.json');
    throw new Error('unexpected url ' + url);
  };
  load('js/prices/providers/fr-government.js');
  FP.fetchJson = async function () { return readFixture('be-fps-reference.json'); };
  load('js/prices/providers/be-fps.js');
  FP.fetchJson = async function () { return readFixture('nl-cbs-reference.json'); };
  load('js/prices/providers/nl-cbs.js');

  assert.equal(FP.stationProvider('PT').id, 'pt-dgeg');
  assert.equal(FP.stationProvider('ES').id, 'es-minetur');
  assert.equal(FP.stationProvider('FR').id, 'fr-government');
  assert.equal(FP.referenceProvider('BE').id, 'be-fps');
  assert.equal(FP.referenceProvider('NL').id, 'nl-cbs');
  assert.deepEqual(FP.countries().map(function (c) { return c.code; }).sort(), ['BE', 'ES', 'FR', 'NL', 'PT']);

  ['pt-dgeg', 'es-minetur', 'fr-government', 'be-fps', 'nl-cbs'].forEach(function (id) {
    assert.ok(FP.byId(id), 'registered ' + id);
  });
  PROXY_DATASETS.forEach(function (id) {
    assert.equal(FP.byId(id).proxyDataset, id, 'proxyDataset for ' + id);
  });
  assert.equal(FP.byId('fr-government').proxyDataset, null);
  assert.equal(FP.byId('be-fps').capabilities.stationPrices, false);
  assert.equal(FP.byId('nl-cbs').capabilities.referencePrices, true);

  FP.fetchJson = async function () { return readFixture('pt-dgeg-search.json'); };
  const pt = await FP.byId('pt-dgeg').searchStations({
    fuelKey: '2101', center: { lat: 38.72, lon: -9.14 }, radiusKm: 50
  });
  assert.equal(pt.stations.length, 1);
  assert.equal(pt.stations[0].id, 'pt-dgeg:42');
  assert.ok(Math.abs(pt.stations[0].price - 1.799) < 0.001);

  FP.fetchJson = async function () { return readFixture('es-minetur-search.json'); };
  const es = await FP.byId('es-minetur').searchStations({
    fuelKey: 'Precio Gasoleo A', regionId: '28', center: { lat: 40.4168, lon: -3.7038 }, radiusKm: 50
  });
  assert.equal(es.stations.length, 1);
  assert.equal(es.stations[0].id, 'es-minetur:ES-9001');
  assert.equal(es.stations[0].unit, 'litre');

  FP.fetchJson = async function (url) {
    if (String(url).indexOf('data.economie.gouv.fr') >= 0) return readFixture('fr-government-search.json');
    throw new Error('unexpected url ' + url);
  };
  const fr = await FP.byId('fr-government').searchStations({
    fuelKey: 'gazole', center: { lat: 48.8566, lon: 2.3522 }, radiusKm: 30
  });
  assert.equal(fr.stations.length, 1);
  assert.equal(fr.stations[0].country, 'FR');
  assert.ok(Math.abs(fr.stations[0].price - 1.852) < 0.001);

  FP.fetchJson = async function () { return readFixture('be-fps-reference.json'); };
  const be = await FP.byId('be-fps').referencePrices();
  assert.ok(be.prices.some(function (p) { return p.canonical === 'DIESEL_B7' && p.value > 1.6; }));

  FP.fetchJson = async function () { return readFixture('nl-cbs-reference.json'); };
  const nl = await FP.byId('nl-cbs').referencePrices();
  assert.ok(nl.prices.some(function (p) { return p.canonical === 'PETROL_95'; }));
  assert.ok(nl.prices.some(function (p) { return p.canonical === 'DIESEL_B7'; }));

  console.log('provider checks passed');
})().catch(function (e) { console.error(e); process.exitCode = 1; });
