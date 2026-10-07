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
  'Premium diesel',
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
