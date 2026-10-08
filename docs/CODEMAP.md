# FuelLog code map

Use this map to narrow searches, then read the implementation. It describes the
current code, not planned functionality. Keep paths, function names and flows
current when changing them; avoid line numbers and exhaustive symbol lists.
The development requirements live in [AGENTS.md](../AGENTS.md).

## Start here

FuelLog is a static PWA with no build step. Most UI and application logic lives
in `app.js`. `index.html` loads ordinary scripts in dependency order: configuration,
database, fuel catalogue, provider registry, promos, offline tiles, country
adapters, Leaflet, data/import modules, then the application.

| Area or task | Files | Useful entry points |
| --- | --- | --- |
| Startup, state and navigation | [app.js](../app.js), [index.html](../index.html) | `init`, `refresh`, `route`, `render`, `wireCommon` |
| Dashboard, history and charts | [app.js](../app.js) | `dashboard`, `history`, `fillRow`, `analysisCard`, `sparklineSvg` |
| Binary-plist decoding | [js/import/bplist.js](../js/import/bplist.js) | `FuelLogBplist.decode` |
| Jerrycan normalization | [js/import/jerrycan.js](../js/import/jerrycan.js), [app.js](../app.js) | `FuelLogJerrycan.inspect`, `normalize`, `importJerrycan`, `prepareJerrycanBatch` |
| Shared data semantics | [js/data.js](../js/data.js) | `FuelLogData.intervals`, `currency`, `sourceKey`, `amountsByCurrency` |
| Consumption and cost calculations | [app.js](../app.js) | `vehicleFillups`, `calcMetrics`, `consumptionSeries`, `priceSeries` |
| Fill-up and vehicle editing | [app.js](../app.js) | `fillForm`, fill-up submit handler in `wireCommon`, `vehicleDialog`, `wireVehicleForm` |
| Import parsing and validation | [app.js](../app.js) | `importData`, `readFileText`, `extractRowsFromJson`, `parseDelimited`, `guessDelimiter`, `flexDate`, `flexNum`, `flexBool`, `rowValue` |
| Import persistence and duplicates | [app.js](../app.js) | `importGenericRows`, `ensureVehicleByName`, `importFuelLogBackup` |
| Backup and export | [app.js](../app.js) | `exportJson`, `exportCsv`, `download` |
| Local storage and migrations | [db.js](../db.js), [app.js](../app.js) | `FuelDB.open`, `commitImport`, `DB_VERSION`, `migrateData`, `normalizeStoredFuels`, `migrateMapTileCache` |
| Fuel catalogue and matching | [js/prices/fuels.js](../js/prices/fuels.js), [app.js](../app.js) | `FuelLogFuels`, `fuelLabel`, `canonicalForPriceFuelKey` |
| Provider contract and caches | [js/prices/providers.js](../js/prices/providers.js) | `FuelProviders.register`, `stationProvider`, `referenceProvider`, `cached`, `legacyIOS` |
| Station and reference searches | [app.js](../app.js), [config.js](../config.js), [api/stations.php](../api/stations.php) | `wirePrices`, `runPriceSearch`, `runReference`, `searchProxy`, `renderStations`, `renderReference` |
| User-observed prices and provenance | [app.js](../app.js) | `userStationPrices`, `userHistoryHtml`, `youPaidHtml`, `stationProvHtml`, `logFillAt` |
| Brand promos and effective prices | [js/prices/promos.js](../js/prices/promos.js), [app.js](../app.js) | `FuelLogPromos`, `stationOffer`, `stationSortPrice`, `promoDialog`, `wirePromoForm` |
| Map and Prices bottom sheet | [app.js](../app.js), [styles.css](../styles.css) | `ensureMap`, `updateMap`, `popupHtml`, `wirePriceSheet`, `setPriceSheetSnap`, `syncPriceMapSize` |
| Offline maps and search history | [js/prices/offline-tiles.js](../js/prices/offline-tiles.js), [db.js](../db.js), [app.js](../app.js) | `FuelLogOfflineTiles`, `putMapTile`, `getMapTile`, `evictMapTiles`, `archivePriceSearch`, `restorePriceSearchFromArchive` |
| App shell, updates and installation | [sw.js](../sw.js), [manifest.webmanifest](../manifest.webmanifest), [index.html](../index.html) | `CACHE`, `ASSETS`, service-worker handlers; registration and install UI in `init` |
| Styling and old-Safari behaviour | [styles.css](../styles.css), [COMPATIBILITY.md](../COMPATIBILITY.md) | Layout fallbacks; `FuelProviders.legacyIOS`, `download`, regional search paths |
| Checks | [.github/workflows/check.yml](../.github/workflows/check.yml), [docs/TESTING.md](TESTING.md), [scripts/check-*.js](../scripts/) | Syntax/iOS-12 scan, manifest/PHP proxy; Node/PHP regression scripts (see TESTING.md) |

Country adapters are in `js/prices/providers/`: `pt-dgeg.js`, `es-minetur.js`,
`fr-government.js`, `be-fps.js` and `nl-cbs.js`. Their contract, provenance and
source policies are documented in [PROVIDERS.md](PROVIDERS.md).

## Main data flows

- **Startup:** `init` → `FuelDB.open` → `refresh` → default vehicle when needed
  → `migrateData` → `render` → service-worker registration.
- **Editing:** form → submit handler → `FuelDB.put` → `refresh` → rendering.
  Both save handlers preserve existing fields; unchanged fill-up dates retain
  seconds/milliseconds. Review both when adding metadata.
- **Imports:** `importData` → binary header detection or JSON/delimited parsing
  → Jerrycan controls or generic mode controls → normalization/validation →
  preview and duplicates → `FuelDB.commitImport` → `refresh` → `render`.
  Native backups validate records/references before the same transaction path.
- **Calculations:** `vehicleFillups` → shared `FuelLogData.intervals` →
  `calcMetrics` summaries and `consumptionSeries` charts. Monetary summaries and
  price series separate currencies.
- **Prices:** selected country/fuel → provider or optional proxy → normalized
  prices → promo comparison → cards/map. `userStationPrices` reads local fill-ups
  as a separate historical price source. Provider caches and search archives allow
  reuse of previous results offline.
- **Backups:** in-memory records → `exportJson` or `exportCsv` → `download` with
  the legacy-iOS fallback. JSON exports whole records; CSV lists fields explicitly.

## Storage boundaries

`db.js` defines `vehicles`, `fillups`, `settings`, `priceCache`, `promos` and
`mapTiles` stores. Records use local IDs; fill-ups link to vehicles through
`vehicleId`. `commitImport` writes affected stores atomically and resolves on transaction
completion. Store/index upgrades live in `FuelDB.open`; record normalization
and settings migrations live in `app.js`.

Service-worker Cache Storage in `sw.js` is separate from IndexedDB. The optional
PHP proxy caches public station datasets in `api/cache/`; it does not store the
user's fuel log. `.htaccess` and `api/cache/.htaccess` control hosting/cache access.

## Review these together

- **New record fields:** forms and save handlers, import paths, migrations,
  JSON restore, CSV columns, calculations/display and README data examples.
- **New import format:** unrestricted file input in `settingsPage` (keep custom
  extensions selectable on mobile), file reading
  and detection in `importData`, validation/preview, vehicle matching, duplicates
  and persistence. Jerrycan uses `js/import/bplist.js` and `jerrycan.js`;
  other formats retain their existing parsing helpers.
- **New provider or fuel:** catalogue, registry/adapters, optional proxy mappings,
  UI units/provenance, offline assets and provider documentation.
- **New runtime file or cached asset:** `index.html` script/style references,
  `sw.js` asset list/cache version and offline verification.
- **New map behaviour:** `app.js`, `styles.css`, offline tile layer, IndexedDB
  caches and [COMPATIBILITY.md](../COMPATIBILITY.md). Bundled tile generation lives
  in [scripts/generate-low-zoom-tiles.mjs](../scripts/generate-low-zoom-tiles.mjs).

For user behaviour and formats see [README.md](../README.md); for contribution,
privacy and security rules see [CONTRIBUTING.md](../CONTRIBUTING.md),
[PRIVACY.md](../PRIVACY.md) and [SECURITY.md](../SECURITY.md).
