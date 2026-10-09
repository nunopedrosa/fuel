const CACHE = 'fuellog-v39-receipt-notes';
const ASSETS = [
  './',
  'index.html',
  'styles.css?v=45',
  'config.js',
  'db.js',
  'js/data.js',
  'js/import/bplist.js',
  'js/import/jerrycan.js',
  'js/analysis.js',
  'js/analysis-ui.js',
  'js/receipt.js',
  'js/receipt-ocr.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'fonts/Inter-Regular.woff2',
  'fonts/Inter-SemiBold.woff2',
  'js/prices/fuels.js',
  'js/prices/providers.js',
  'js/prices/promos.js',
  'js/prices/offline-tiles.js',
  'js/prices/providers/pt-dgeg.js',
  'js/prices/providers/es-minetur.js',
  'js/prices/providers/fr-government.js',
  'js/prices/providers/be-fps.js',
  'js/prices/providers/nl-cbs.js',
  'assets/map-tiles/manifest.json',
  'vendor/leaflet/leaflet.js',
  'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/marker-icon.png',
  'vendor/leaflet/images/marker-icon-2x.png',
  'vendor/leaflet/images/marker-shadow.png',
  'vendor/leaflet/images/layers.png',
  'vendor/leaflet/images/layers-2x.png'
];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;
  if (u.pathname.indexOf('/assets/map-tiles/') === 0 && u.pathname.endsWith('.png')) {
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
      if (r.ok) {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match('assets/map-tiles/manifest.json'))));
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put('./', copy));
      return r;
    }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
    if (r.ok) {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return r;
  })));
});
