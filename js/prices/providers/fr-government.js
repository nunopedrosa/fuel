// FuelLog provider: France — data.economie.gouv.fr station prices (Opendatasoft v2.1).
window.FuelProviders.register((function () {
  var FP = window.FuelProviders;
  var ID = 'fr-government';
  var BASE = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records';
  var FUELS = [
    { key: 'gazole', canonical: 'DIESEL_B7', unit: 'litre' },
    { key: 'sp95', canonical: 'PETROL_95', unit: 'litre' },
    { key: 'e10', canonical: 'PETROL_95_E10', unit: 'litre' },
    { key: 'sp98', canonical: 'PETROL_98', unit: 'litre' },
    { key: 'e85', canonical: 'E85', unit: 'litre' },
    { key: 'gplc', canonical: 'LPG', unit: 'litre' }
  ];
  var LABELS = { gazole: 'Gazole', sp95: 'SP95', e10: 'E10', sp98: 'SP98', e85: 'E85', gplc: 'GPLc' };
  var UNITS = {};
  FUELS.forEach(function (f) { UNITS[f.key] = f.unit; });
  function fuels() {
    return Promise.resolve(FUELS.map(function (f) {
      return { key: f.key, canonical: f.canonical, label: LABELS[f.key], unit: f.unit };
    }));
  }
  function round3(n) { return Math.round(n * 1000) / 1000; }
  function station(rec, retrievedAt, fuelKey) {
    var geom = rec.geom || {};
    return {
      id: ID + ':' + FP.val(rec, 'id'),
      country: 'FR',
      name: FP.val(rec, 'adresse') || 'Fuel station',
      brand: '',
      address: FP.val(rec, 'adresse') || '',
      town: ((FP.val(rec, 'cp') || '') + ' ' + (FP.val(rec, 'ville') || '')).trim(),
      updated: FP.val(rec, fuelKey + '_maj') || '',
      lat: geom.lat, lon: geom.lon,
      price: FP.parseNum(FP.val(rec, fuelKey + '_prix')),
      unit: UNITS[fuelKey] || 'litre',
      provenance: {
        sourceType: 'government-station', sourceId: ID, priceType: 'station',
        sourceUpdatedAt: FP.localIso(FP.val(rec, fuelKey + '_maj')), retrievedAt: retrievedAt
      }
    };
  }
  function fetchPage(center, radiusKm, fuelKey, offset) {
    var where = "within_distance(geom,geom'POINT(" + center.lon + ' ' + center.lat + ")'," + radiusKm + 'km) AND ' + fuelKey + '_prix IS NOT NULL';
    var qs = '?where=' + encodeURIComponent(where) +
      '&order_by=' + fuelKey + '_prix' +
      '&limit=100&offset=' + offset +
      '&select=' + encodeURIComponent('id,adresse,cp,ville,geom,' + fuelKey + '_prix,' + fuelKey + '_maj');
    return FP.fetchJson(BASE + qs);
  }
  function searchStations(opts) {
    if (!opts.center) return Promise.reject(new Error('France search needs a location'));
    var fuelKey = opts.fuelKey;
    var key = 'fr:search:' + fuelKey + ':' + round3(opts.center.lat) + ':' + round3(opts.center.lon) + ':' + opts.radiusKm;
    var loader = function () {
      var all = [];
      var page = function (offset) {
        return fetchPage(opts.center, opts.radiusKm, fuelKey, offset).then(function (d) {
          var rows = (d && Array.isArray(d.results)) ? d.results : [];
          all = all.concat(rows);
          if (rows.length >= 100 && all.length < 300 && offset < 200) return page(offset + 100);
          return all;
        });
      };
      return page(0);
    };
    return FP.cached(key, FP.TTL.search, loader).then(function (r) {
      var retrievedAt = new Date(r.ts).toISOString();
      var ss = r.data.map(function (rec) { return station(rec, retrievedAt, fuelKey); })
        .filter(function (s) { return isFinite(s.price); });
      ss = FP.aroundCenter(ss, opts.center, opts.radiusKm);
      return { stations: ss, sourceUpdatedAt: null, ts: r.ts, stale: r.stale, fromCache: r.fromCache };
    });
  }
  return {
    id: ID, country: 'FR', name: 'Prix des carburants (data.gouv)',
    attribution: 'Ministère de l’Économie — prix-des-carburants-en-france-flux-instantane-v2',
    license: 'Licence Ouverte / Open Licence 2.0 (Etalab)',
    sourceUrl: 'https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/',
    sourceType: 'government-station', priceType: 'station',
    capabilities: { stationDirectory: true, stationPrices: true, referencePrices: false, regions: false },
    proxyDataset: null, units: UNITS,
    fuels: fuels, requiresRegion: function () { return false; }, searchStations: searchStations
  };
})());
