// FuelLog provider: Portugal — DGEG station directory and current pump prices.
window.FuelProviders.register((function () {
  var FP = window.FuelProviders;
  var CANON = { 2101: 'DIESEL_B7', 2105: 'DIESEL_PREMIUM', 3201: 'PETROL_95', 3205: 'PETROL_95', 3400: 'PETROL_98', 3405: 'PETROL_98', 1120: 'LPG', 1143: 'CNG', 1141: 'CNG', 1142: 'LNG' };
  var UNITS = { 1143: 'kg', 1141: 'm3', 1142: 'kg' };
  var ID = 'pt-dgeg';
  function base() {
    return (window.FUELLOG_CONFIG && window.FUELLOG_CONFIG.dgegBase) || 'https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb/';
  }
  function api(action, params) {
    var u = new URL(action, base());
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v !== null && v !== undefined && v !== '') u.searchParams.set(k, v);
    });
    return FP.fetchJson(u);
  }
  function resultArray(d) {
    var r = d && d.resultado != null ? d.resultado : (d && d.Resultado != null ? d.Resultado : d);
    return Array.isArray(r) ? r : (r && Array.isArray(r.items) ? r.items : (r && Array.isArray(r.Postos) ? r.Postos : []));
  }
  function rowLabel(t) { return t.Descritivo || t.descritivo || t.Nome || t.nome || 'Fuel'; }
  function rowId(t) { return t.Id != null ? t.Id : (t.id != null ? t.id : t.ID); }
  function station(s, retrievedAt) {
    return {
      id: ID + ':' + FP.val(s, 'Id', 'id', 'ID', 'IdPosto'),
      country: 'PT',
      name: FP.val(s, 'Nome', 'nome', 'NomePosto', 'Designacao') || 'Fuel station',
      brand: FP.val(s, 'Marca', 'marca') || '',
      address: FP.val(s, 'Morada', 'morada') || '',
      town: FP.val(s, 'Municipio', 'municipio', 'Localidade', 'localidade') || '',
      updated: FP.val(s, 'DataAtualizacao', 'dataAtualizacao', 'Atualizado') || '',
      lat: FP.parseNum(FP.val(s, 'Latitude', 'latitude', 'Lat', 'lat')),
      lon: FP.parseNum(FP.val(s, 'Longitude', 'longitude', 'Lng', 'lng')),
      price: FP.parseNum(FP.val(s, 'Preco', 'preco', 'Preço', 'price')),
      unit: 'litre',
      provenance: {
        sourceType: 'government-station', sourceId: ID, priceType: 'station',
        sourceUpdatedAt: FP.localIso(FP.val(s, 'DataAtualizacao', 'dataAtualizacao', 'Atualizado')),
        retrievedAt: retrievedAt
      }
    };
  }
  function fuels() {
    return FP.cached('pt:fuels', FP.TTL.catalogue, function () { return api('GetTiposCombustiveis'); }).then(function (r) {
      return resultArray(r.data).map(function (t) {
        var id = rowId(t);
        return { key: String(id), canonical: CANON[id] || null, label: rowLabel(t), unit: UNITS[id] || 'litre' };
      });
    });
  }
  function regions() {
    return FP.cached('pt:regions', FP.TTL.catalogue, function () { return api('GetDistritos'); }).then(function (r) {
      return resultArray(r.data).map(function (d) { return { id: String(rowId(d)), label: rowLabel(d) }; });
    });
  }
  function requiresRegion() { return FP.legacyIOS(); }
  function searchStations(opts) {
    var regionId = opts.regionId || '';
    var loader = function () {
      return api('PesquisarPostos', {
        idsTiposComb: opts.fuelKey, idDistrito: regionId,
        qtdPorPagina: regionId ? 1000 : 4000, pagina: 1, orderDesc: 0
      });
    };
    return FP.cached('pt:search:' + opts.fuelKey + ':' + (regionId || 'all'), FP.TTL.search, loader).then(function (r) {
      var retrievedAt = new Date(r.ts).toISOString();
      var ss = resultArray(r.data).map(function (s) { return station(s, retrievedAt); })
        .filter(function (s) { return isFinite(s.price); });
      ss = FP.aroundCenter(ss, opts.center, opts.radiusKm);
      return { stations: ss, sourceUpdatedAt: null, ts: r.ts, stale: r.stale, fromCache: r.fromCache };
    });
  }
  return {
    id: ID, country: 'PT', name: 'DGEG',
    attribution: 'DGEG — Direção-Geral de Energia e Geologia',
    license: 'Public information; non-commercial reuse',
    sourceUrl: 'https://precoscombustiveis.dgeg.gov.pt/',
    sourceType: 'government-station', priceType: 'station',
    capabilities: { stationDirectory: true, stationPrices: true, referencePrices: false, regions: true },
    proxyDataset: 'pt-dgeg', units: UNITS,
    fuels: fuels, regions: regions, requiresRegion: requiresRegion, searchStations: searchStations
  };
})());
