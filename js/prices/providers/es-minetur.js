// FuelLog provider: Spain — MITECO/Minetur Geoportal Gasolineras station prices.
window.FuelProviders.register((function () {
  var FP = window.FuelProviders;
  var ID = 'es-minetur';
  var BASE = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/';
  var FUELS = [
    { key: 'Precio Gasoleo A', canonical: 'DIESEL_B7', unit: 'litre' },
    { key: 'Precio Gasoleo Premium', canonical: 'DIESEL_PREMIUM', unit: 'litre' },
    { key: 'Precio Gasolina 95 E5', canonical: 'PETROL_95_E5', unit: 'litre' },
    { key: 'Precio Gasolina 95 E10', canonical: 'PETROL_95_E10', unit: 'litre' },
    { key: 'Precio Gasolina 95 E5 Premium', canonical: 'PETROL_95', unit: 'litre' },
    { key: 'Precio Gasolina 98 E5', canonical: 'PETROL_98', unit: 'litre' },
    { key: 'Precio Gasolina 98 E10', canonical: 'PETROL_98', unit: 'litre' },
    { key: 'Precio Gases licuados del petróleo', canonical: 'LPG', unit: 'litre' },
    { key: 'Precio Gas Natural Comprimido', canonical: 'CNG', unit: 'kg' },
    { key: 'Precio Gas Natural Licuado', canonical: 'LNG', unit: 'kg' },
    { key: 'Precio Gasolina 95 E85', canonical: 'E85', unit: 'litre' },
    { key: 'Precio Adblue', canonical: 'ADBLUE', unit: 'litre' }
  ];
  var UNITS = {};
  FUELS.forEach(function (f) { UNITS[f.key] = f.unit; });
  function title(s) {
    return String(s || '').toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); });
  }
  function fechaIso(s) {
    var m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})/);
    if (!m) return FP.localIso(s);
    var d = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  function fuels() {
    return Promise.resolve(FUELS.map(function (f) {
      return { key: f.key, canonical: f.canonical, label: f.key.replace(/^Precio /, ''), unit: f.unit };
    }));
  }
  function regions() {
    return FP.cached('es:regions', FP.TTL.catalogue, function () {
      return FP.fetchJson(BASE + 'Listados/Provincias/');
    }).then(function (r) {
      var rows = Array.isArray(r.data) ? r.data : [];
      return rows.map(function (p) {
        return { id: String(p.IDPovincia != null ? p.IDPovincia : p.IDProvincia), label: title(p.Provincia) };
      });
    });
  }
  function requiresRegion() { return true; }
  function station(r, fechaIsoStr, retrievedAt, fuelKey) {
    var name = FP.val(r, 'Rótulo') || 'Fuel station';
    var loc = title(FP.val(r, 'Localidad'));
    return {
      id: ID + ':' + FP.val(r, 'IDEESS'),
      country: 'ES',
      name: loc ? name + ' · ' + loc : name,
      brand: name,
      address: FP.val(r, 'Dirección') || '',
      town: FP.val(r, 'Municipio') || '',
      updated: fechaIsoStr || '',
      lat: FP.parseNum(FP.val(r, 'Latitud')),
      lon: FP.parseNum(FP.val(r, 'Longitud (WGS84)')),
      price: FP.parseNum(FP.val(r, fuelKey)),
      unit: UNITS[fuelKey] || 'litre',
      provenance: {
        sourceType: 'government-station', sourceId: ID, priceType: 'station',
        sourceUpdatedAt: fechaIsoStr, retrievedAt: retrievedAt
      }
    };
  }
  function searchStations(opts) {
    var regionId = opts.regionId;
    var loader = function () { return FP.fetchJson(BASE + 'EstacionesTerrestres/FiltroProvincia/' + encodeURIComponent(regionId)); };
    return FP.cached('es:search:' + regionId, FP.TTL.search, loader).then(function (r) {
      var d = r.data || {};
      var rows = Array.isArray(d.ListaEESSPrecio) ? d.ListaEESSPrecio : [];
      var updated = fechaIso(d.Fecha);
      var retrievedAt = new Date(r.ts).toISOString();
      var ss = rows.filter(function (row) { return isFinite(FP.parseNum(row[opts.fuelKey])); })
        .map(function (row) { return station(row, updated, retrievedAt, opts.fuelKey); });
      ss = FP.aroundCenter(ss, opts.center, opts.radiusKm);
      return { stations: ss, sourceUpdatedAt: updated, ts: r.ts, stale: r.stale, fromCache: r.fromCache };
    });
  }
  return {
    id: ID, country: 'ES', name: 'Geoportal Gasolineras',
    attribution: 'Ministerio para la Transición Ecológica y el Reto Demográfico — Geoportal Gasolineras',
    license: 'Datos abiertos (public open data)',
    sourceUrl: 'https://geoportalgasolineras.es/',
    sourceType: 'government-station', priceType: 'station',
    capabilities: { stationDirectory: true, stationPrices: true, referencePrices: false, regions: true },
    proxyDataset: 'es-minetur', units: UNITS,
    fuels: fuels, regions: regions, requiresRegion: requiresRegion, searchStations: searchStations
  };
})());
