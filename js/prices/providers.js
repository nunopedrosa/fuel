// FuelLog price-provider registry and shared helpers (iOS 12 safe).
// Provider contract: {id, country, name, attribution, license, sourceUrl,
//   sourceType:'government-station'|'government-reference', priceType:'station'|'official-maximum'|'national-average',
//   capabilities:{stationDirectory,stationPrices,referencePrices,regions}, proxyDataset:null|'pt-dgeg'|'es-minetur',
//   units:{<fuelKey>:'litre'|'kg'|'m3'},
//   fuels():Promise<[{key,canonical,label,unit}]>, regions():Promise<[{id,label}]>, requiresRegion():boolean,
//   searchStations({fuelKey,center,radiusKm,regionId}):Promise<{stations:[Station],sourceUpdatedAt,ts,stale}>}
// Station = {id:'<provider>:<externalId>',country,name,brand,address,town,lat,lon,price,unit,distance?,
//   provenance:{sourceType,sourceId,priceType,sourceUpdatedAt,retrievedAt}}
window.FuelProviders = (function () {
  var REG = {};
  var COUNTRIES = [
    { code: 'PT', name: 'Portugal' },
    { code: 'ES', name: 'Spain' },
    { code: 'FR', name: 'France' },
    { code: 'BE', name: 'Belgium' },
    { code: 'NL', name: 'Netherlands' }
  ];
  var TTL = { search: 15 * 60 * 1000, catalogue: 30 * 864e5 };
  function register(p) { (REG[p.country] = REG[p.country] || []).push(p); }
  function forCountry(code) { return REG[code] || []; }
  function byId(id) {
    var found = null;
    Object.keys(REG).forEach(function (c) { REG[c].forEach(function (p) { if (p.id === id) found = p; }); });
    return found;
  }
  function stationProvider(code) {
    return forCountry(code).filter(function (p) { return p.capabilities && p.capabilities.stationPrices; })[0] || null;
  }
  function referenceProvider(code) {
    return forCountry(code).filter(function (p) { return p.capabilities && p.capabilities.referencePrices; })[0] || null;
  }
  function countries() { return COUNTRIES.filter(function (c) { return forCountry(c.code).length; }); }
  async function cached(key, ttlMs, loader) {
    var c = await FuelDB.get('priceCache', key);
    if (c && Date.now() - c.ts < ttlMs) return { data: c.data, ts: c.ts, fromCache: true, stale: false };
    try {
      var data = await loader();
      await FuelDB.put('priceCache', { key: key, ts: Date.now(), data: data });
      return { data: data, ts: Date.now(), fromCache: false, stale: false };
    } catch (err) {
      if (c) return { data: c.data, ts: c.ts, fromCache: true, stale: true, error: err };
      throw err;
    }
  }
  async function fetchJson(url, opts) {
    var o = { mode: 'cors', credentials: 'omit', cache: 'default' };
    if (opts) Object.keys(opts).forEach(function (k) { o[k] = opts[k]; });
    var r = await fetch(url, o);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  function hav(a, b, c, d) {
    var R = 6371, p = Math.PI / 180, x = (c - a) * p, y = (d - b) * p;
    var A = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(a * p) * Math.cos(c * p) * Math.sin(y / 2) * Math.sin(y / 2);
    return 2 * R * Math.asin(Math.sqrt(A));
  }
  function parseNum(x) {
    return parseFloat(String(x == null ? '' : x).replace(',', '.').replace(/[^0-9.-]/g, ''));
  }
  function val(o) {
    for (var i = 1; i < arguments.length; i++) {
      var k = arguments[i];
      if (o && o[k] !== undefined && o[k] !== null) return o[k];
    }
    return null;
  }
  function localIso(s) {
    var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    var p = new Date(s);
    return isNaN(p.getTime()) ? null : p.toISOString();
  }
  function ago(iso) {
    if (!iso) return '';
    var t = new Date(iso).getTime();
    if (!isFinite(t)) return '';
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 90) return 'just now';
    var m = s / 60;
    if (m < 90) return Math.round(m) + ' min ago';
    var h = m / 60;
    if (h < 48) return Math.round(h) + ' h ago';
    var d = h / 24;
    if (d <= 30) return Math.round(d) + ' days ago';
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function norm(text) {
    var s = String(text == null ? '' : text).toLowerCase().replace(/\s+/g, ' ').trim();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s;
  }
  function aroundCenter(stations, center, radiusKm) {
    var ss = stations;
    if (center) {
      ss = ss.map(function (s) {
        var out = {};
        Object.keys(s).forEach(function (k) { out[k] = s[k]; });
        out.distance = isFinite(s.lat) && isFinite(s.lon) ? hav(center.lat, center.lon, s.lat, s.lon) : Infinity;
        return out;
      }).filter(function (s) { return s.distance <= radiusKm; });
      ss.sort(function (a, b) { return a.price - b.price || a.distance - b.distance; });
    } else {
      ss.sort(function (a, b) { return a.price - b.price; });
    }
    return ss;
  }
  function legacyIOS() {
    var m = navigator.userAgent.match(/OS (\d+)_/);
    return /iP(hone|od|ad)/.test(navigator.userAgent) && m && Number(m[1]) < 13;
  }
  return {
    COUNTRIES: COUNTRIES, register: register, forCountry: forCountry, byId: byId,
    stationProvider: stationProvider, referenceProvider: referenceProvider, countries: countries,
    cached: cached, fetchJson: fetchJson, hav: hav, parseNum: parseNum, val: val,
    localIso: localIso, ago: ago, norm: norm, aroundCenter: aroundCenter, TTL: TTL, legacyIOS: legacyIOS
  };
})();
