// Hybrid offline map tiles: bundled low-zoom PNGs + IndexedDB LRU cache for OSM tiles.
window.FuelLogOfflineTiles = (function () {
  var OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var BUNDLED_MAX_Z = 8;
  var ATTR_ONLINE = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  var ATTR_OFFLINE = '&copy; OSM (offline / low resolution)';

  var manifest = null;
  var manifestPromise = null;

  function tileKey(z, x, y) {
    return z + '/' + x + '/' + y;
  }

  function bundledPath(country, z, x, y) {
    return 'assets/map-tiles/' + country + '/' + z + '/' + x + '/' + y + '.png';
  }

  function loadManifest() {
    if (manifest) return Promise.resolve(manifest);
    if (manifestPromise) return manifestPromise;
    manifestPromise = fetch('assets/map-tiles/manifest.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : { countries: {}, tiles: [] }; })
      .catch(function () { return { countries: {}, tiles: [] }; })
      .then(function (m) { manifest = m || { countries: {}, tiles: [] }; return manifest; });
    return manifestPromise;
  }

  function manifestHas(country, z, x, y) {
    if (!manifest || !manifest.tiles) return false;
    var id = country + ':' + z + '/' + x + '/' + y;
    if (manifest.tiles.indexOf(id) >= 0) return true;
    var eu = 'EU:' + z + '/' + x + '/' + y;
    return manifest.tiles.indexOf(eu) >= 0;
  }

  function bundledUrl(country, z, x, y) {
    if (manifestHas(country, z, x, y)) return bundledPath(country, z, x, y);
    if (manifestHas('EU', z, x, y)) return bundledPath('EU', z, x, y);
    return null;
  }

  function placeholderDataUrl() {
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#e7efed';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#cdd8d4';
    g.lineWidth = 1;
    for (var i = 0; i <= 256; i += 32) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 256);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(256, i);
      g.stroke();
    }
    return c.toDataURL('image/png');
  }

  var placeholderUrl = null;
  function getPlaceholder() {
    if (!placeholderUrl) placeholderUrl = placeholderDataUrl();
    return placeholderUrl;
  }

  function blobToObjectUrl(blob) {
    try {
      return URL.createObjectURL(blob);
    } catch (e) {
      return null;
    }
  }

  function fetchOnlineTile(z, x, y) {
    var url = OSM.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    return fetch(url, { mode: 'cors', credentials: 'omit', cache: 'default' }).then(function (r) {
      if (!r.ok) throw new Error('tile ' + r.status);
      return r.blob();
    });
  }

  function resolveTile(country, z, x, y, preferOnline) {
    var key = tileKey(z, x, y);
    return FuelDB.getMapTile(key).then(function (cached) {
      if (cached) return { src: blobToObjectUrl(cached), revocable: true, offline: true };
      var burl = bundledUrl(country, z, x, y);
      if (burl && z <= BUNDLED_MAX_Z) return { src: burl, revocable: false, offline: true };
      if (preferOnline && navigator.onLine) {
        return fetchOnlineTile(z, x, y).then(function (blob) {
          FuelDB.putMapTile(key, blob).catch(function () {});
          return { src: blobToObjectUrl(blob), revocable: true, offline: false };
        });
      }
      if (z > BUNDLED_MAX_Z && burl) return { src: burl, revocable: false, offline: true };
      return { src: getPlaceholder(), revocable: false, offline: true };
    }).catch(function () {
      return { src: getPlaceholder(), revocable: false, offline: true };
    });
  }

  function createLayer(options) {
    options = options || {};
    var country = options.countryCode || 'PT';
    var offlineMode = false;

    var Layer = L.TileLayer.extend({
      createTile: function (coords, done) {
        var tile = document.createElement('img');
        tile.alt = '';
        tile.setAttribute('role', 'presentation');
        var self = this;
        resolveTile(country, coords.z, coords.x, coords.y, true).then(function (res) {
          tile.onload = function () { done(null, tile); };
          tile.onerror = function () {
            tile.src = getPlaceholder();
            done(null, tile);
          };
          if (res.offline && !navigator.onLine) offlineMode = true;
          tile.src = res.src;
          tile._fuellogRevoke = res.revocable ? res.src : null;
        });
        return tile;
      },
      _removeTile: function (key) {
        var tile = this._tiles[key];
        if (tile && tile.el && tile.el._fuellogRevoke) {
          try { URL.revokeObjectURL(tile.el._fuellogRevoke); } catch (e) {}
        }
        L.TileLayer.prototype._removeTile.call(this, key);
      }
    });

    var layer = new Layer(OSM, {
      maxZoom: 19,
      minZoom: 3,
      attribution: ATTR_ONLINE,
      crossOrigin: true
    });

    function syncAttribution() {
      var low = offlineMode || !navigator.onLine;
      layer.options.attribution = low ? ATTR_OFFLINE : ATTR_ONLINE;
      if (layer._map) layer._map.attributionControl.setPrefix(false);
    }

    window.addEventListener('online', syncAttribution);
    window.addEventListener('offline', function () { offlineMode = true; syncAttribution(); });

    return {
      layer: layer,
      setCountry: function (cc) { country = cc || 'PT'; },
      destroy: function () {
        window.removeEventListener('online', syncAttribution);
      },
      loadManifest: loadManifest
    };
  }

  function prefetchAround(center, zoom) {
    if (!center || !navigator.onLine) return;
    var z = Math.min(Math.max(Math.round(zoom || 12), 9), 14);
    var n = 1;
    var lat = center.lat;
    var lon = center.lon;
    var x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
    var latRad = lat * Math.PI / 180;
    var y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, z));
    var run = function () {
      for (var dx = -n; dx <= n; dx++) {
        for (var dy = -n; dy <= n; dy++) {
          resolveTile('PT', z, x + dx, y + dy, true).catch(function () {});
        }
      }
    };
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 500);
  }

  return {
    createLayer: createLayer,
    loadManifest: loadManifest,
    prefetchAround: prefetchAround,
    BUNDLED_MAX_Z: BUNDLED_MAX_Z
  };
})();
