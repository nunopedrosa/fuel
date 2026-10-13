'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const context = vm.createContext({
  window: {},
  Date,
  Intl,
  console,
  navigator: { userAgent: '' },
  document: { querySelector() { return null }, addEventListener() {} },
  FuelLogFuels: { LIST: [], guess() { return null }, label(id) { return id; } },
  FuelLogPromos: { DEFAULT_FILL_LITRES: 40 },
  FuelProviders: { countries() { return []; } }
});
require('./i18n-test-helper.cjs')(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8').replace(/init\(\)\.catch[\s\S]*$/, ''), context);
const run = s => vm.runInContext(s, context);

assert.equal(run("decimalInputText('12,5')"), '12.5');
assert.equal(run("decimalInputText('12.5')"), '12.5');
assert.equal(run("decimalInputText(',5')"), '.5');
assert.equal(run("decimalInputText('12,')"), '12.');
assert.equal(run("decimalInputText('1.2,3')"), '1.23');
assert.equal(run("decimalInputText('1,2.3')"), '1.23');
assert.equal(run("decimalInputText('-60,5')"), '-60.5');
assert.equal(run("decimalInputText('')"), '');
assert.equal(run("+decimalInputText('48,25')"), 48.25);

function field(value, start, mode) {
  return {
    nodeName: 'INPUT',
    value: value,
    selectionStart: start,
    selectionEnd: start,
    getAttribute(name) { return name === 'inputmode' ? mode : null; },
    setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; }
  };
}
context.field = field;
const litres = run("field('45,5', 3, 'decimal')");
context.litres = litres;
run('applyDecimalInput(litres)');
assert.equal(litres.value, '45.5');
assert.equal(litres.selectionStart, 3);
const station = run("field('Galp, Lisboa', 5, null)");
context.station = station;
run('applyDecimalInput(station)');
assert.equal(station.value, 'Galp, Lisboa');

const html = run('fillForm()');
['litres', 'odometer', 'pricePerLitre', 'totalCost'].forEach(name => {
  const tag = html.match(new RegExp('<input\\b[^>]*name="' + name + '"[^>]*>'));
  assert.ok(tag, name + ' field missing');
  assert.ok(tag[0].indexOf('type="text"') >= 0, name + ' must accept a comma keystroke');
  assert.ok(tag[0].indexOf('inputmode="decimal"') >= 0, name + ' must keep a decimal keyboard');
  assert.ok(tag[0].indexOf('type="number"') < 0, name + ' must not use a number input');
});
assert.equal((html.match(/type="number"/g) || []).length, 0, 'fill-up form must not use number inputs');

const promo = run('promoDialog()');
assert.ok(/name="amount"[^>]*type="text"[^>]*inputmode="decimal"|type="text"[^>]*inputmode="decimal"[^>]*name="amount"/.test(promo));
const vehicle = run('vehicleDialog()');
assert.ok(/name="initialOdometer"[^>]*inputmode="decimal"|inputmode="decimal"[^>]*name="initialOdometer"/.test(vehicle));
assert.ok(vehicle.indexOf('type="number"') < 0);

const src = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
assert.equal(src.indexOf('type="number"'), -1, 'numeric entry must not use type=number');
assert.equal(src.indexOf('type=\\"number\\"'), -1, 'dialog numeric entry must not use type=number');
assert.ok(src.indexOf('inputmode=\\"decimal\\"') >= 0, 'receipt review must request a decimal keyboard');

console.log('decimal input checks passed');
