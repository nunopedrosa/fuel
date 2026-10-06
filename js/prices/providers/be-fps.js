// FuelLog provider: Belgium — FPS Economy/Statbel official maximum prices (no station data).
window.FuelProviders.register((function () {
  var FP = window.FuelProviders;
  var ID = 'be-fps';
  var SRC = 'https://bestat.statbel.fgov.be/bestat/api/views/665e2960-bf86-4d64-b4a8-90f2d30ea892/result/JSON';
  var MAP = {
    'Road Diesel B7': 'DIESEL_B7',
    'Road Diesel B10': 'DIESEL_B10',
    'Euro Super 95 E5': 'PETROL_95_E5',
    'Euro Super 95 E10': 'PETROL_95_E10',
    'Super Plus 98 E5': 'PETROL_98',
    'Super Plus 98 E10': 'PETROL_98',
    'Autogas LPG (at the pump)': 'LPG'
  };
  var MONTHS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  function dayIso(s) {
    var m = String(s || '').match(/^(\d{2})([A-Za-z]{3})(\d{2})$/);
    if (!m) return null;
    var mon = MONTHS[m[2].toUpperCase()];
    if (mon == null) return null;
    var d = new Date(Date.UTC(2000 + (+m[3]), mon, +m[1]));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  function labelOf(product) { return String(product || '').replace(/\s*\(€\/L\)\s*$/, ''); }
  function fuels() {
    return Promise.resolve(Object.keys(MAP).map(function (k) {
      return { key: k, canonical: MAP[k], label: labelOf(k), unit: 'litre' };
    }));
  }
  function referencePrices() {
    return FP.cached('be:reference', 6 * 3600 * 1000, function () { return FP.fetchJson(SRC); }).then(function (r) {
      var facts = (r.data && Array.isArray(r.data.facts)) ? r.data.facts : [];
      var updated = null;
      var prices = [];
      facts.forEach(function (f) {
        var product = FP.val(f, 'Product');
        var canonical = MAP[labelOf(product)];
        if (!canonical) return;
        var day = dayIso(FP.val(f, 'Day'));
        if (day && (!updated || day > updated)) updated = day;
        var v = FP.parseNum(FP.val(f, 'Price incl. VAT'));
        if (!isFinite(v)) return;
        prices.push({ key: product, canonical: canonical, label: labelOf(product), value: Math.round(v * 1000) / 1000, unit: 'litre', validFrom: day });
      });
      return { prices: prices, sourceUpdatedAt: updated, ts: r.ts, stale: r.stale, fromCache: r.fromCache };
    });
  }
  return {
    id: ID, country: 'BE', name: 'FPS Economy',
    attribution: 'FPS Economy / Statbel — official maximum prices for petroleum products',
    license: 'Statbel open data (see source terms)',
    sourceUrl: 'https://statbel.fgov.be/en/themes/energy',
    sourceType: 'government-reference', priceType: 'official-maximum',
    capabilities: { stationDirectory: false, stationPrices: false, referencePrices: true, regions: false },
    proxyDataset: null,
    fuels: fuels, requiresRegion: function () { return false; }, referencePrices: referencePrices
  };
})());
