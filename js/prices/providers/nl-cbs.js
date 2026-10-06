// FuelLog provider: Netherlands — CBS national average pump prices (no station data).
window.FuelProviders.register((function () {
  var FP = window.FuelProviders;
  var ID = 'nl-cbs';
  var SRC = 'https://opendata.cbs.nl/ODataApi/odata/80416ned/TypedDataSet?$filter=';
  var MAP = [
    { field: 'BenzineEuro95_1', key: 'Euro95', canonical: 'PETROL_95', label: 'Euro95' },
    { field: 'Diesel_2', key: 'Diesel', canonical: 'DIESEL_B7', label: 'Diesel' },
    { field: 'Lpg_3', key: 'LPG', canonical: 'LPG', label: 'LPG' }
  ];
  function periodIso(s) {
    var m = String(s || '').match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  function fuels() {
    return Promise.resolve(MAP.map(function (m) {
      return { key: m.key, canonical: m.canonical, label: m.label, unit: 'litre' };
    }));
  }
  function referencePrices() {
    return FP.cached('nl:reference', 24 * 3600 * 1000, function () {
      var year = new Date().getFullYear();
      var url = function (y) { return SRC + encodeURIComponent("startswith(Perioden,'" + y + "')"); };
      return FP.fetchJson(url(year)).then(function (d) {
        var rows = (d && Array.isArray(d.value)) ? d.value : [];
        return rows.length ? d : FP.fetchJson(url(year - 1));
      });
    }).then(function (r) {
      var rows = (r.data && Array.isArray(r.data.value)) ? r.data.value : [];
      var row = rows[rows.length - 1] || {};
      var updated = periodIso(row.Perioden);
      var prices = [];
      MAP.forEach(function (m) {
        var v = FP.parseNum(row[m.field]);
        if (!isFinite(v)) return;
        prices.push({ key: m.key, canonical: m.canonical, label: m.label, value: Math.round(v * 1000) / 1000, unit: 'litre', validFrom: updated });
      });
      return { prices: prices, sourceUpdatedAt: updated, ts: r.ts, stale: r.stale, fromCache: r.fromCache };
    });
  }
  return {
    id: ID, country: 'NL', name: 'CBS',
    attribution: 'Centraal Bureau voor de Statistiek — Pompprijzen motorbrandstoffen (80416ned)',
    license: 'CC BY 4.0',
    sourceUrl: 'https://opendata.cbs.nl/statline/#/CBS/nl/dataset/80416ned',
    sourceType: 'government-reference', priceType: 'national-average',
    capabilities: { stationDirectory: false, stationPrices: false, referencePrices: true, regions: false },
    proxyDataset: null,
    fuels: fuels, requiresRegion: function () { return false; }, referencePrices: referencePrices
  };
})());
