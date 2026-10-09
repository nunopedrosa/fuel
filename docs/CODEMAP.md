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
| Dashboard and history | [app.js](../app.js) | `dashboard`, `history`, `fillRow`, `analysisCard` |
| Interactive history analysis | [js/analysis.js](../js/analysis.js), [js/analysis-ui.js](../js/analysis-ui.js) | `FuelLogAnalysis.prepare`, `select`, `monthly`, `sample`; `FuelLogAnalysisUI.render`, `mount`, `chart` |
| Binary-plist decoding | [js/import/bplist.js](../js/import/bplist.js) | `FuelLogBplist.decode` |
| Jerrycan normalization | [js/import/jerrycan.js](../js/import/jerrycan.js), [app.js](../app.js) | `FuelLogJerrycan.inspect`, `normalize`, `importJerrycan`, `prepareJerrycanBatch` |
| Shared data semantics | [js/data.js](../js/data.js) | `FuelLogData.intervals`, `currency`, `sourceKey`, `amountsByCurrency` |
| Consumption and cost calculations | [app.js](../app.js) | `vehicleFillups`, `calcMetrics`, `consumptionSeries`, `priceSeries` |
| Fill-up and vehicle editing | [app.js](../app.js) | `fillForm`, `urbanProfileField`, `wireUrbanProfile`, fill-up submit handler in `wireCommon`, `vehicleDialog`, `wireVehicleForm`, `findStationForFill`, `pickStationForFill` |
| Receipt scanning and OCR parsing | [js/receipt.js](../js/receipt.js), [js/receipt-ocr.js](../js/receipt-ocr.js), [app.js](../app.js) | `FuelLogReceipt.parse`, `FuelLogReceiptOCR.scan`, receipt review and existing fill-up form |
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
  seconds/milliseconds. The urban slider writes `cityPercentage` only when changed,
  preserves untouched imported precision and marks manual changes with
  `cityPercentageSource: "user"`. Review both when adding metadata.
- **Receipt scan:** camera or photo-library input → bounded image resize/contrast →
  direct same-origin Tesseract worker (its response CSP is in
  `vendor/tesseract/.htaccess`) → Portuguese receipt parser and amount check → editable
  review with commercial-fuel matching via `FuelLogFuels.guess` (no station-name extraction) → existing fill-up form and IndexedDB save.
  Station Find confirms a different existing unit price before replacing it;
  equal prices and retained prices preserve the total. Automatic cached-station
  prefill preserves any existing price without a prompt. Photos are discarded;
  worker/core assets and the language model are cached locally after first use.
  `FuelLogReceipt.parse` returns `ocrText` unchanged; receipt review copies it
  into fill-up notes. `fillClearNotes` in `wireCommon` clears only the editable
  notes field; the existing save handler persists its full text.
  The original fuel product text is retained in `receiptFuelType`; the chosen
  canonical ID remains in `fuelId`. Portuguese special 95/98 provider codes map
  to the corresponding additivated petrol options.
- **Imports:** `importData` → binary header detection or JSON/delimited parsing
  → Jerrycan controls or generic mode controls → normalization/validation →
  preview and duplicates → `FuelDB.commitImport` → `refresh` → `render`.
  Native backups validate records/references before the same transaction path.
- **Calculations:** `vehicleFillups` → shared `FuelLogData.intervals` →
  `calcMetrics` summaries and `consumptionSeries` charts. Monetary summaries and
  price series separate currencies. The explorer builds intervals from whole history,
  then selects wholly contained intervals and purchases within inclusive dates.
  Its sliders and expanded zoom share one ephemeral window; chart sampling does
  not affect summaries. Urban profiles use positive segment distances. A trailing
  partial fill remains in purchase views but never closes a consumption interval;
  trace source flags in `js/import/jerrycan.js` and `source.original` when diagnosing
  a spike. See [ANALYSIS.md](ANALYSIS.md) for the calculation/diagnostic contract.
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
