'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/receipt.js'), 'utf8'), { window: window }, { filename: 'receipt.js' });
var R = window.FuelLogReceipt;
var parsed = R.parse([
  'POSTO TREKM LISBOA',
  'Data: 09/10/2026 08:42',
  'Gasoleo simples',
  'Litros: 32,50 L',
  'Preco/L: 1,579 EUR/L',
  'TOTAL EUR 51,32'
].join('\n'));

assert.equal(parsed.station, 'POSTO TREKM LISBOA');
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
console.log('Receipt parser checks passed');
