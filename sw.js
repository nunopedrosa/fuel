const CACHE = 'fuellog-v44-storage';
const ASSETS = [
  './',
  'index.html',
  'styles.css?v=fuellog-v44-storage',
  'config.js?v=fuellog-v44-storage',
  'js/i18n/i18n.js?v=fuellog-v44-storage',
  'js/i18n/en.js?v=fuellog-v44-storage',
  'js/i18n/pt.js?v=fuellog-v44-storage',
  'js/ui-icons.js?v=fuellog-v44-storage',
  'db.js?v=fuellog-v44-storage',
  'js/data.js?v=fuellog-v44-storage',
  'js/import/bplist.js?v=fuellog-v44-storage',
  'js/import/jerrycan.js?v=fuellog-v44-storage',
  'js/analysis.js?v=fuellog-v44-storage',
  'js/analysis-ui.js?v=fuellog-v44-storage',
  'js/receipt.js?v=fuellog-v44-storage',
  'js/receipt-ocr.js?v=fuellog-v44-storage',
  'app.js?v=fuellog-v44-storage',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'fonts/Inter-Regular.woff2',
  'fonts/Inter-SemiBold.woff2',
  'js/prices/fuels.js?v=fuellog-v44-storage',
  'js/prices/providers.js?v=fuellog-v44-storage',
  'js/prices/promos.js?v=fuellog-v44-storage',
  'js/prices/offline-tiles.js?v=fuellog-v44-storage',
  'js/prices/providers/pt-dgeg.js?v=fuellog-v44-storage',
  'js/prices/providers/es-minetur.js?v=fuellog-v44-storage',
  'js/prices/providers/fr-government.js?v=fuellog-v44-storage',
  'js/prices/providers/be-fps.js?v=fuellog-v44-storage',
  'js/prices/providers/nl-cbs.js?v=fuellog-v44-storage',
  'assets/map-tiles/manifest.json',
  'vendor/leaflet/leaflet.js?v=fuellog-v44-storage',
  'vendor/leaflet/leaflet.css?v=fuellog-v44-storage',
  'vendor/leaflet/images/marker-icon.png',
  'vendor/leaflet/images/marker-icon-2x.png',
  'vendor/leaflet/images/marker-shadow.png',
  'vendor/leaflet/images/layers.png',
  'vendor/leaflet/images/layers-2x.png'
];
self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'GET_VERSION' && e.source) e.source.postMessage({type:'FUELLOG_VERSION',requestId:e.data.requestId,cacheId:CACHE});
});
function verifyShellRelease(cache) {
  return Promise.all(['index.html','config.js?v='+CACHE,'app.js?v='+CACHE].map(asset => cache.match(asset).then(response => {
    if (!response) throw new Error('Incomplete app release');
    return response.text();
  }))).then(parts => {
    const html = parts[0].match(/data-app-version=["']([^"']+)["']/);
    const config = parts[1].match(/appCacheId:\s*['"]([^'"]+)['"]/);
    const app = parts[2].match(/const APP_BUILD_ID = ['"]([^'"]+)['"]/);
    if (!html || !config || !app || html[1] !== CACHE || config[1] !== CACHE || app[1] !== CACHE) throw new Error('Incomplete app release');
  });
}
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c =>
  c.addAll(ASSETS.map(asset => new Request(new URL(asset, self.location.href).href, {cache:'reload'}))).then(() => verifyShellRelease(c))
).then(() => self.skipWaiting()).catch(error => caches.delete(CACHE).then(() => {throw error}))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.indexOf('fuellog-') === 0 && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;
  // Version checks must reach the server, regardless of the installed shell.
  if (u.pathname === self.location.pathname) {
    e.respondWith(fetch(new Request(e.request, {cache:'no-store'})));
    return;
  }
  if (u.pathname.indexOf('/assets/map-tiles/') === 0 && u.pathname.endsWith('.png')) {
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request)).then(cached => cached || fetch(e.request).then(r => {
      if (r.ok) {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.open(CACHE).then(c => c.match('assets/map-tiles/manifest.json')))));
    return;
  }
  if (e.request.mode === 'navigate') {
    // Keep the installed HTML and its scripts together until a complete release
    // has downloaded and taken control. Never overwrite it with future HTML.
    e.respondWith(caches.open(CACHE).then(c => c.match('index.html')).then(cached => cached || fetch(e.request)));
    return;
  }
  e.respondWith(caches.open(CACHE).then(c => c.match(e.request)).then(cached => cached || fetch(e.request).then(r => {
    if (r.ok) {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return r;
  })));
});
