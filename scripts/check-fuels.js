'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/prices/fuels.js'), 'utf8'), {
  window: window,
  console: console,
  FuelProviders: {
    norm: function (text) {
      var s = String(text == null ? '' : text).toLowerCase().replace(/\s+/g, ' ').trim();
      if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return s;
    }
  }
}, { filename: 'fuels.js' });

var F = window.FuelLogFuels;
[
  ['Gasóleo EVOLOGIC', 'DIESEL_PREMIUM'],
  ['Galp Evologic Extra Diesel', 'DIESEL_PREMIUM'],
  ['Gasóleo aditivado', 'DIESEL_PREMIUM'],
  ['Gasóleo especial', 'DIESEL_PREMIUM'],
  ['BP Diesel com tecnologia ACTIVE', 'DIESEL_PREMIUM'],
  ['BP Ultimate Diesel', 'DIESEL_PREMIUM'],
  ['Repsol Diesel e+', 'DIESEL_PREMIUM'],
  ['Repsol Diesel e+10 Neotech', 'DIESEL_PREMIUM'],
  ['PRIO TOP Diesel', 'DIESEL_PREMIUM'],
  ['Moeve Óptima Diesel', 'DIESEL_PREMIUM'],
  ['Cepsa Optima Gasóleo', 'DIESEL_PREMIUM'],
  ['Gasóleo simples', 'DIESEL_B7'],
  ['Gasolina Simples 98', 'PETROL_98'],
  ['Galp Evologic 95', 'PETROL_95_ADDITIVATED'],
  ['Galp Evologic 98', 'PETROL_98_ADDITIVATED'],
  ['BP Gasolina 95 ACTIVE', 'PETROL_95_ADDITIVATED'],
  ['BP Ultimate ACTIVE 98', 'PETROL_98_ADDITIVATED'],
  ['Repsol Efitec 95', 'PETROL_95_ADDITIVATED'],
  ['Repsol Efitec 98', 'PETROL_98_ADDITIVATED'],
  ['PRIO TOP 95', 'PETROL_95_ADDITIVATED'],
  ['PRIO TOP95', 'PETROL_95_ADDITIVATED'],
  ['EFITEC98', 'PETROL_98_ADDITIVATED'],
  ['PRIO TOP 98', 'PETROL_98_ADDITIVATED'],
  ['Moeve Óptima 95', 'PETROL_95_ADDITIVATED'],
  ['Gasolina aditivada 98', 'PETROL_98_ADDITIVATED'],
  ['GPL Auto', 'LPG'], ['Repsol AutoGás', 'LPG'],
  ['Evologic', null], ['BP ACTIVE', null], ['Eco Diesel', null],
  ['Gasolina', null], ['Gasolina Ultimate', null],
  ['Gasolina Evologic 1,95€/L', null]
].forEach(function (row) { assert.equal(F.guess(row[0]), row[1], row[0]); });
assert.equal(F.related('PETROL_95_ADDITIVATED')[0], 'PETROL_95');
assert.equal(typeof F.present, 'function', 'present missing');
assert.equal(typeof F.optionLabels, 'function', 'optionLabels missing');

assert.equal(F.present(null, 'Gasóleo simples'), 'Diesel B7');
assert.equal(F.present(null, 'Gazole'), 'Diesel B7');
assert.equal(F.present(null, 'Euro95'), 'Petrol 95');
assert.equal(F.present('PETROL_98', 'SP98'), 'Petrol 98');
assert.equal(F.present(null, 'kitchen oil'), 'kitchen oil');
assert.equal(F.present('', ''), '');

var spain = [
  { canonical: 'DIESEL_B7', label: 'Gasoleo A' },
  { canonical: 'DIESEL_PREMIUM', label: 'Gasoleo Premium' },
  { canonical: 'PETROL_95_E5', label: 'Gasolina 95 E5' },
  { canonical: 'PETROL_95', label: 'Gasolina 95 E5 Premium' },
  { canonical: 'PETROL_98', label: 'Gasolina 98 E5' },
  { canonical: 'PETROL_98', label: 'Gasolina 98 E10' }
];
assert.deepEqual(F.optionLabels(spain), [
  'Diesel B7',
  'Additivated / premium diesel',
  'Petrol 95 E5',
  'Petrol 95',
  'Petrol 98 · Gasolina 98 E5',
  'Petrol 98 · Gasolina 98 E10'
]);

assert.deepEqual(F.optionLabels([
  { canonical: null, label: 'Mistura local' },
  { canonical: 'LPG', label: 'GPLc' }
]), ['Mistura local', 'LPG']);

console.log('fuel names ok');
