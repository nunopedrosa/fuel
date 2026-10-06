// Public runtime configuration. Do not put secrets in this file.
window.FUELLOG_CONFIG = Object.freeze({
  dgegBase: 'https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb/',
  // Same-origin radius-search proxy (api/stations.php). Set to null for a purely
  // static deployment such as GitHub Pages; the app then queries DGEG directly
  // from the browser.
  stationProxy: 'api/stations.php'
});
