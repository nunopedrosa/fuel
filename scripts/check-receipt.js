'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var window = {};
var fuelContext = { window: window, FuelProviders: { norm: function (text) { return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/prices/fuels.js'), 'utf8'), fuelContext);
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/receipt.js'), 'utf8'), { window: window }, { filename: 'receipt.js' });
var R = window.FuelLogReceipt;
var rawOCR = '\n  GASOLEO EVOLOGIC\nTexto & acentuação ç\n';
assert.equal(R.parse(rawOCR).ocrText, rawOCR, 'retain the exact OCR text, including whitespace and line breaks');
[
  ['GASOLEO EVOLOGIC', 'DIESEL_PREMIUM'],
  ['GASOLEO\nEVOLOGIC', 'DIESEL_PREMIUM'],
  ['Gasolina\nEfitec 95', 'PETROL_95_ADDITIVATED'],
  ['PRIO TOP 95', 'PETROL_95_ADDITIVATED'],
  ['BP Ultimate 98', 'PETROL_98_ADDITIVATED'],
  ['Diesel e+10', 'DIESEL_PREMIUM'],
  ['Repsol AutoGás', 'LPG']
].forEach(function (row) {
  var result = R.parse(row[0] + '\nLitros 20,00\nTOTAL 40,00');
  assert.equal(result.fuelId, row[1], 'receipt fuel: ' + row[0]);
});
assert.equal(R.parse('Gasolina\nTOTAL 95,00').fuelId, null, 'total must not supply octane');
assert.equal(R.parse('POSTO GALP\nTOTAL 40,00').fuelId, null, 'brand alone cannot identify fuel');
assert.equal(R.parse('ECO DIESEL').fuelId, null, 'Eco Diesel must not imply a biodiesel mixture');
var parsed = R.parse([
  'POSTO TREKM LISBOA',
  'Data: 09/10/2026 08:42',
  'Gasoleo simples',
  'Litros: 32,50 L',
  'Preco/L: 1,579 EUR/L',
  'TOTAL EUR 51,32'
].join('\n'));

assert.equal(parsed.station, '', 'receipt text must never be used to guess the station');
assert.equal(parsed.date, '2026-10-09T08:42');
assert.equal(parsed.fuelType, 'Gasoleo simples');
assert.equal(parsed.litres, 32.5);
assert.equal(parsed.pricePerLitre, 1.579);
assert.equal(parsed.totalCost, 51.32);
assert.equal(parsed.amountsMatch, true, 'Portuguese decimal values should validate within receipt rounding');

var mismatch = R.parse('POSTO X\nGasolina 95\nLitros 20,00\n1,70 €/L\nTOTAL 40,00 €');
assert.equal(mismatch.amountsMatch, false, 'a material litres × price mismatch should be flagged');
assert.ok(mismatch.warnings.length, 'mismatches should produce a visible review warning');

var ambiguous = R.parse('POSTO X\nLitros 20,00\nTOTAL 40,00 €');
assert.equal(ambiguous.pricePerLitre, null, 'missing values must stay missing rather than be inferred');
assert.equal(R.parse('POSTO X\nData 2026-10-09\nLitros 1.234,56\nTOTAL 2.000,00').litres, 1234.56, 'thousands separators should follow Portuguese decimal conventions');
assert.equal(R.parse('POSTO X\nDate 2026-10-09').date, '2026-10-09T00:00', 'ISO dates should be recognised');
var compact = R.parse('POSTO X\nGasoleo simples\n32,50 L x 1,579 €/L\nTOTAL 51,32 €');
assert.equal(compact.litres, 32.5, 'quantity should be read from compact fuel lines');
assert.equal(compact.pricePerLitre, 1.579, 'unit price should be read next to the per-litre marker');
assert.equal(compact.amountsMatch, true);
var attachedUnit = R.parse('POSTO X\nP0123456789 40,06L A 2,319€/L 92,90\nDesconto direto 0,12€/L 5,00\nTOTAL A PAGAR 87,90');
assert.equal(attachedUnit.litres, 40.06, 'a quantity attached to L must exclude the preceding product code');
assert.equal(attachedUnit.pricePerLitre, 2.319, 'keep the printed unit price rather than the discount per litre');
assert.equal(attachedUnit.totalCost, 87.9);
assert.equal(attachedUnit.amountsMatch, false, 'a discounted total must prompt review instead of silently changing the price');
assert.equal(R.parse('POSTO X\nPreco/L 1,60€/L').litres, null, 'a unit-price marker is not a purchased quantity');
async function checkStationPrices() {
  var context = vm.createContext({ window: {}, Date: Date, Intl: Intl, console: console, navigator: { userAgent: '' }, document: { querySelector: function () { return null; } }, FuelLogPromos: { DEFAULT_FILL_LITRES: 40 } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8').replace(/init\(\)\.catch[\s\S]*$/, ''), context);
  vm.runInContext("state.priceCountry = 'PT'", context);
  var prompts = [], answer = false;
  context.appDialog = function (options) { prompts.push(options); return Promise.resolve(answer); };
  context.fillPromoPrice = function (station) { return { price: station.price == null ? '' : String(station.price), notes: '' }; };
  function form(price) {
    var ff = {};
    var values = { vehicleId: 'v', fuelId: '', station: '', stationId: '', country: '', pricePerLitre: price, totalCost: '87.90', litres: '40.06', notes: '' };
    Object.keys(values).forEach(function (key) { ff[key] = { value: values[key] }; });
    ff.pricePerLitre.oninput = function () { ff.totalCost.value = context.fillTotalFromLitresPrice(ff.litres.value, ff.pricePerLitre.value); };
    return ff;
  }
  var station = { name: 'Selected station', id: 'station-1', country: 'PT', price: 2.319 };
  var ff = form('2.3190');
  await context.pickStationForFill(ff, station);
  assert.equal(prompts.length, 0, 'numerically identical station price must not prompt');
  assert.equal(ff.pricePerLitre.value, '2.3190', 'equal price must remain untouched');
  assert.equal(ff.totalCost.value, '87.90', 'equal price must preserve the scanned discounted total');
  ff = form('2.100');
  await context.pickStationForFill(ff, station);
  assert.equal(prompts.length, 1, 'different existing price must prompt');
  assert.equal(ff.station.value, 'Selected station', 'keeping price must still select the station');
  assert.equal(ff.stationId.value, 'station-1');
  assert.equal(ff.pricePerLitre.value, '2.100');
  assert.equal(ff.totalCost.value, '87.90');
  answer = true;
  await context.pickStationForFill(ff, station);
  assert.equal(ff.pricePerLitre.value, '2.319');
  assert.equal(ff.totalCost.value, '92.90', 'explicit replacement recalculates total');
  ff = form('');
  var count = prompts.length;
  await context.pickStationForFill(ff, station);
  assert.equal(prompts.length, count, 'empty price can be filled without confirmation');
  assert.equal(ff.pricePerLitre.value, '2.319');
  ff = form('2.100');
  await context.pickStationForFill(ff, station, { confirmPrice: false });
  assert.equal(prompts.length, count, 'background cached-station prefill must not open a dialog');
  assert.equal(ff.pricePerLitre.value, '2.100', 'background prefill must preserve an existing price');
  assert.equal(ff.totalCost.value, '87.90');
  ff = form('2.100');
  await context.pickStationForFill(ff, { name: 'Unpriced station', id: 'station-2' });
  assert.equal(ff.pricePerLitre.value, '2.100');
  assert.equal(ff.totalCost.value, '87.90', 'an unpriced station must not recalculate a recorded total');
  console.log('Receipt parsing and station price preservation checks passed');
}
checkStationPrices().catch(function (error) { console.error(error); process.exitCode = 1; });
