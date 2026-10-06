// Public runtime configuration. Do not put secrets in this file.
window.FUELLOG_CONFIG = Object.freeze({
  dgegBase: 'https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb/',
  // Keep null for the zero-backend/public deployment.
  // A same-origin proxy may be configured later only if DGEG CORS changes.
  priceProxy: null
});
