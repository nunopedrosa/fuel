// Public runtime configuration. Do not put secrets in this file.
window.FUELLOG_CONFIG = Object.freeze({
  // Must match the CACHE name in sw.js (see scripts/check-sw-assets.js).
  appCacheId: 'fuellog-v45-device-language',
  dgegBase: 'https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb/',
  // Same-origin radius-search proxy (api/stations.php). Set to null for a purely
  // static deployment such as GitHub Pages; the app then queries DGEG directly
  // from the browser.
  stationProxy: 'api/stations.php'
});
