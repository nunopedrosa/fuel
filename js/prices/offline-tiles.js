// Hybrid offline map tiles: bundled low-zoom PNGs + IndexedDB LRU cache (online via CARTO, not OSM.org).
window.FuelLogOfflineTiles = (function () {
  // CARTO raster basemap — OK for in-app display; do not bulk-scrape (use bundled tiles offline).
  var ONLINE = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  var BUNDLED_MAX_Z = 8;
  var CACHE_PREFIX = 'carto-v1:';
  var ATTR_ONLINE = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  var ATTR_OFFLINE = '&copy; OSM data (bundled low resolution)';

  var manifest = null;
  var manifestPromise = null;

  function tileKey(z, x, y) {
    return CACHE_PREFIX + z + '/' + x + '/' + y;
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

  function onlineTileUrl(z, x, y) {
    var r = '';
    if (typeof L !== 'undefined' && L.Browser && L.Browser.retina) r = '@2x';
    return ONLINE.replace('{z}', z).replace('{x}', x).replace('{y}', y).replace('{r}', r);
  }

  function fetchOnlineTile(z, x, y) {
    var url = onlineTileUrl(z, x, y);
    return fetch(url, { mode: 'cors', credentials: 'omit', cache: 'default' }).then(function (res) {
      if (!res.ok) throw new Error('tile ' + res.status);
      return res.blob();
    }).then(function (blob) {
      if (!blob || blob.size < 800) throw new Error('tile too small');
      return blob;
    });
  }

  function resolveTile(country, z, x, y, preferOnline) {
    var key = tileKey(z, x, y);
    return loadManifest().then(function () {
      return FuelDB.getMapTile(key).then(function (cached) {
        if (cached && cached.size >= 800) {
          return { src: blobToObjectUrl(cached), revocable: true, offline: true };
        }
        var burl = bundledUrl(country, z, x, y);
        if (burl && z <= BUNDLED_MAX_Z) {
          return { src: burl, revocable: false, offline: true };
        }
        if (preferOnline && navigator.onLine) {
          return fetchOnlineTile(z, x, y).then(function (blob) {
            FuelDB.putMapTile(key, blob).catch(function () {});
            return { src: blobToObjectUrl(blob), revocable: true, offline: false };
          }).catch(function () {
            if (burl) return { src: burl, revocable: false, offline: true };
            return { src: getPlaceholder(), revocable: false, offline: true };
          });
        }
        if (burl) return { src: burl, revocable: false, offline: true };
        return { src: getPlaceholder(), revocable: false, offline: true };
      });
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

    var layer = new Layer(ONLINE, {
      maxZoom: 19,
      minZoom: 3,
      attribution: ATTR_ONLINE,
      crossOrigin: true
    });

    loadManifest().then(function () {
      if (layer._map && layer.redraw) layer.redraw();
    });

    function syncAttribution() {
      var low = offlineMode || !navigator.onLine;
      layer.options.attribution = low ? ATTR_OFFLINE : ATTR_ONLINE;
      if (layer._map && layer._map.attributionControl) layer._map.attributionControl.setPrefix(false);
    }

    window.addEventListener('online', syncAttribution);
    window.addEventListener('offline', function () { offlineMode = true; syncAttribution(); });

    return {
      layer: layer,
      setCountry: function (cc) {
        country = cc || 'PT';
        if (layer.redraw) layer.redraw();
      },
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
