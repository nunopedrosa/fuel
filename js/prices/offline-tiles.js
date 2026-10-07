// Hybrid offline map tiles: bundled low-zoom PNGs + IndexedDB LRU cache (online provider selectable).
window.FuelLogOfflineTiles = (function () {
  var BUNDLED_MAX_Z = 8;
  var ATTR_OFFLINE = '&copy; OSM data (bundled low resolution)';

  var PROVIDERS = {
    opentopomap: {
      id: 'opentopomap',
      label: 'Terrain (OpenTopoMap)',
      maxZoom: 17,
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      tileUrl: function (z, x, y) {
        var sub = ['a', 'b', 'c'][(x + y + z) % 3];
        return 'https://' + sub + '.tile.opentopomap.org/' + z + '/' + x + '/' + y + '.png';
      }
    },
    'osm-de': {
      id: 'osm-de',
      label: 'Streets (OpenStreetMap)',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="https://openstreetmap.de">openstreetmap.de</a>',
      tileUrl: function (z, x, y) {
        return 'https://tile.openstreetmap.de/' + z + '/' + x + '/' + y + '.png';
      }
    },
    'osm-org': {
      id: 'osm-org',
      label: 'Streets (osm.org)',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      tileUrl: function (z, x, y) {
        return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
      }
    }
  };

  var DEFAULT_PROVIDER = 'opentopomap';
  var manifest = null;
  var manifestPromise = null;

  function provider(id) {
    return PROVIDERS[id] || PROVIDERS[DEFAULT_PROVIDER];
  }

  function tileKey(providerId, z, x, y) {
    return 'online:' + providerId + ':' + z + '/' + x + '/' + y;
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
    return manifest.tiles.indexOf('EU:' + z + '/' + x + '/' + y) >= 0;
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

  function fetchOnlineTile(prov, z, x, y) {
    if (z > prov.maxZoom) throw new Error('zoom capped');
    var url = prov.tileUrl(z, x, y);
    return fetch(url, { mode: 'cors', credentials: 'omit', cache: 'default' }).then(function (res) {
      if (!res.ok) throw new Error('tile ' + res.status);
      return res.blob();
    }).then(function (blob) {
      if (!blob || blob.size < 800) throw new Error('tile too small');
      return blob;
    });
  }

  function useBundledWhenOnline(prov) {
    return prov.id === DEFAULT_PROVIDER;
  }

  function createLayer(options) {
    options = options || {};
    var country = options.countryCode || 'PT';
    var onlineProviderId = options.onlineProviderId || DEFAULT_PROVIDER;
    var offlineMode = false;

    function resolveTile(z, x, y, preferOnline) {
      var prov = provider(onlineProviderId);
      var key = tileKey(prov.id, z, x, y);
      return loadManifest().then(function () {
        return FuelDB.getMapTile(key).then(function (cached) {
          if (cached && cached.size >= 800) {
            return { src: blobToObjectUrl(cached), revocable: true, offline: true };
          }
          var burl = bundledUrl(country, z, x, y);
          var useBundled = burl && z <= BUNDLED_MAX_Z && (!preferOnline || !navigator.onLine || useBundledWhenOnline(prov));
          if (useBundled) {
            return { src: burl, revocable: false, offline: true };
          }
          if (preferOnline && navigator.onLine) {
            return fetchOnlineTile(prov, z, x, y).then(function (blob) {
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

    var Layer = L.TileLayer.extend({
      createTile: function (coords, done) {
        var tile = document.createElement('img');
        tile.alt = '';
        tile.setAttribute('role', 'presentation');
        resolveTile(coords.z, coords.x, coords.y, true).then(function (res) {
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

    var layer = new Layer('', {
      maxZoom: provider(onlineProviderId).maxZoom,
      minZoom: 3,
      attribution: provider(onlineProviderId).attribution,
      crossOrigin: true
    });

    function applyProviderUi() {
      var prov = provider(onlineProviderId);
      layer.options.maxZoom = prov.maxZoom;
      layer.options.attribution = (!navigator.onLine || offlineMode) ? ATTR_OFFLINE : prov.attribution;
      if (layer._map) {
        layer._map.setMaxZoom(prov.maxZoom);
        if (layer._map.getZoom() > prov.maxZoom) layer._map.setZoom(prov.maxZoom);
        if (layer._map.attributionControl) layer._map.attributionControl.setPrefix(false);
        if (layer.redraw) layer.redraw();
      }
    }

    loadManifest().then(function () { applyProviderUi(); });

    function syncAttribution() {
      offlineMode = !navigator.onLine;
      applyProviderUi();
    }

    window.addEventListener('online', syncAttribution);
    window.addEventListener('offline', syncAttribution);

    return {
      layer: layer,
      setCountry: function (cc) {
        country = cc || 'PT';
        if (layer.redraw) layer.redraw();
      },
      setOnlineProvider: function (id) {
        if (!PROVIDERS[id]) id = DEFAULT_PROVIDER;
        onlineProviderId = id;
        offlineMode = false;
        applyProviderUi();
      },
      getOnlineProvider: function () { return onlineProviderId; },
      destroy: function () {
        window.removeEventListener('online', syncAttribution);
        window.removeEventListener('offline', syncAttribution);
      },
      loadManifest: loadManifest
    };
  }

  function prefetchAround(center, zoom, providerId) {
    if (!center || !navigator.onLine) return;
    var prov = provider(providerId || DEFAULT_PROVIDER);
    var z = Math.min(Math.max(Math.round(zoom || 12), 9), prov.maxZoom);
    var n = 1;
    var lat = center.lat;
    var lon = center.lon;
    var x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
    var latRad = lat * Math.PI / 180;
    var y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, z));
    var run = function () {
      for (var dx = -n; dx <= n; dx++) {
        for (var dy = -n; dy <= n; dy++) {
          (function (tx, ty) {
            fetchOnlineTile(prov, z, tx, ty).then(function (blob) {
              FuelDB.putMapTile(tileKey(prov.id, z, tx, ty), blob).catch(function () {});
            }).catch(function () {});
          })(x + dx, y + dy);
        }
      }
    };
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 500);
  }

  function listProviders() {
    return Object.keys(PROVIDERS).map(function (k) {
      var p = PROVIDERS[k];
      return { id: p.id, label: p.label };
    });
  }

  return {
    createLayer: createLayer,
    loadManifest: loadManifest,
    prefetchAround: prefetchAround,
    listProviders: listProviders,
    defaultProvider: DEFAULT_PROVIDER,
    BUNDLED_MAX_Z: BUNDLED_MAX_Z
  };
})();
