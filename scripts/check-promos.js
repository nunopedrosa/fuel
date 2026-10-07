'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/prices/promos.js'), 'utf8'), {
  window: window,
  console: console,
  Date: Date,
  Math: Math,
  isFinite: isFinite
}, { filename: 'promos.js' });

var P = window.FuelLogPromos;
assert.equal(typeof P.offers, 'function', 'offers missing');

function near(actual, expected, label) {
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error((label || 'value') + ': ' + actual + ' != ' + expected);
  }
}

function station(price, brand) {
  return { brand: brand || 'Galp', country: 'PT', price: price };
}

function promo(overrides) {
  var p = {
    id: 'p',
    brand: 'Galp',
    country: '',
    type: 'litre',
    amount: 0.03,
    fuelId: '',
    validUntil: '',
    notes: '',
    active: true
  };
  Object.keys(overrides || {}).forEach(function (k) { p[k] = overrides[k]; });
  return p;
}

function ids(pkg) {
  return pkg.promos.map(function (p) { return p.id; });
}

// Two cumulative per-litre promos sum and beat a smaller exclusive promo.
var stacked = P.offers(station(1.7), null, [
  promo({ id: 'c1', amount: 0.03 }),
  promo({ id: 'c2', amount: 0.02 }),
  promo({ id: 'x', amount: 0.04, cumulative: false })
], 40);
assert.deepEqual(ids(stacked.winner), ['c1', 'c2']);
assert.equal(stacked.winner.cumulative, true);
near(stacked.winner.perLitre, 0.05, 'stack per litre');
near(stacked.winner.price, 1.65, 'stack price');
assert.deepEqual(ids(stacked.alternative), ['x']);
assert.equal(stacked.alternative.cumulative, false);

// A larger exclusive promo wins and the stack is the alternative.
var exclusiveWins = P.offers(station(1.7), null, [
  promo({ id: 'c1', amount: 0.03 }),
  promo({ id: 'c2', amount: 0.02 }),
  promo({ id: 'x', amount: 0.08, cumulative: false })
], 40);
assert.deepEqual(ids(exclusiveWins.winner), ['x']);
assert.deepEqual(ids(exclusiveWins.alternative), ['c1', 'c2']);
near(exclusiveWins.winner.price, 1.62, 'exclusive price');

// Several exclusive promos and no cumulative promo: only the best, no alternative.
var exclusives = P.offers(station(1.7), null, [
  promo({ id: 'a', amount: 0.06, cumulative: false }),
  promo({ id: 'b', amount: 0.08, cumulative: false }),
  promo({ id: 'c', amount: 0.04, cumulative: false })
], 40);
assert.deepEqual(ids(exclusives.winner), ['b']);
assert.equal(exclusives.alternative, null);

// Equal exclusive discounts: the earlier promo wins.
var exclusiveTie = P.offers(station(1.7), null, [
  promo({ id: 'first', amount: 0.05, cumulative: false }),
  promo({ id: 'second', amount: 0.05, cumulative: false })
], 40);
assert.deepEqual(ids(exclusiveTie.winner), ['first']);
assert.equal(exclusiveTie.alternative, null);

// Cumulative promos alone: the stack, no alternative.
var onlyStack = P.offers(station(1.7), null, [
  promo({ id: 'c1', amount: 0.03 }),
  promo({ id: 'c2', amount: 0.02 })
], 40);
assert.deepEqual(ids(onlyStack.winner), ['c1', 'c2']);
assert.equal(onlyStack.alternative, null);

// An equal discount selects the stack and keeps the exclusive promo as the alternative.
var tie = P.offers(station(1.7), null, [
  promo({ id: 'c1', amount: 0.03 }),
  promo({ id: 'c2', amount: 0.02 }),
  promo({ id: 'x', amount: 0.05, cumulative: false })
], 40);
assert.equal(tie.winner.cumulative, true);
near(tie.winner.perLitre, 0.05, 'tie stack');
assert.deepEqual(ids(tie.alternative), ['x']);

// A missing cumulative field is cumulative.
var bare1 = promo({ id: 'c1', amount: 0.03 });
var bare2 = promo({ id: 'c2', amount: 0.02 });
delete bare1.cumulative;
delete bare2.cumulative;
var missingFlag = P.offers(station(1.7), null, [bare1, bare2], 40);
assert.equal(missingFlag.winner.cumulative, true);
assert.equal(missingFlag.winner.promos.length, 2);

// cumulative: false is exclusive and does not join the stack.
var flagged = P.offers(station(1.7), null, [
  promo({ id: 'c1', amount: 0.03, cumulative: true }),
  promo({ id: 'x', amount: 0.02, cumulative: false })
], 40);
assert.deepEqual(ids(flagged.winner), ['c1']);
assert.deepEqual(ids(flagged.alternative), ['x']);

// Inactive, expired, and zero-amount promos are ignored.
var ignored = P.offers(station(1.7), null, [
  promo({ id: 'off', amount: 0.2, active: false }),
  promo({ id: 'old', amount: 0.2, validUntil: '2000-01-01' }),
  promo({ id: 'zero', amount: 0 }),
  promo({ id: 'keep', amount: 0.01 })
], 40);
assert.deepEqual(ids(ignored.winner), ['keep']);
assert.equal(ignored.alternative, null);

// A per-fill promo is converted with the typical fill, then added to a cumulative per-litre promo.
var mixed = P.offers(station(1.7), 'DIESEL_B7', [
  promo({ id: 'litre', amount: 0.03, fuelId: 'DIESEL_B7' }),
  promo({ id: 'fill', type: 'fill', amount: 2, fuelId: 'DIESEL_B7' })
], 40);
assert.deepEqual(ids(mixed.winner), ['litre', 'fill']);
near(mixed.winner.perLitre, 0.08, 'mixed per litre');
near(mixed.winner.price, 1.62, 'mixed price');

// The displayed price clamps at zero while the larger discount still wins.
var clamped = P.offers(station(0.02), null, [
  promo({ id: 'stack', amount: 0.05 }),
  promo({ id: 'big', amount: 0.1, cumulative: false })
], 40);
assert.deepEqual(ids(clamped.winner), ['big']);
assert.equal(clamped.winner.price, 0);
near(clamped.winner.perLitre, 0.1, 'clamped discount');
assert.equal(clamped.alternative.price, 0);
assert.deepEqual(ids(clamped.alternative), ['stack']);

// A station with no price returns no winner.
var noPrice = P.offers({ brand: 'Galp', country: 'PT' }, null, [
  promo({ id: 'c1', amount: 0.03 })
], 40);
assert.equal(noPrice.base, null);
assert.equal(noPrice.winner, null);
assert.equal(noPrice.alternative, null);

// Another brand does not match.
var other = P.offers(station(1.7, 'Repsol'), null, [
  promo({ id: 'c1', amount: 0.05 })
], 40);
assert.equal(other.winner, null);
assert.equal(other.base, 1.7);

// effective() returns the stacked price, and the listed price when nothing matches.
var eff = P.effective(station(1.7), null, [
  promo({ id: 'c1', amount: 0.03 }),
  promo({ id: 'c2', amount: 0.02 })
], 40);
near(eff.perLitre, 0.05, 'effective per litre');
near(eff.price, 1.65, 'effective price');
assert.equal(eff.base, 1.7);
var plain = P.effective(station(1.7, 'Repsol'), null, [promo({ amount: 0.05 })], 40);
assert.equal(plain.price, 1.7);
assert.equal(plain.perLitre, 0);

// Promos match canonical fuel ids from price search, not UI labels.
var dieselPromo = promo({ id: 'd', fuelId: 'DIESEL_B7', amount: 0.05 });
var dieselSearch = P.offers(station(1.7), 'DIESEL_B7', [dieselPromo], 40);
assert(dieselSearch.winner, 'diesel promo applies for DIESEL_B7 search');
var petrolSearch = P.offers(station(1.7), 'PETROL_95', [dieselPromo], 40);
assert.equal(petrolSearch.winner, null, 'diesel promo ignored for PETROL_95 search');

console.log('promos ok');
