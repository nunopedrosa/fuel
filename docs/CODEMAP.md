# FuelLog code map

Use this map to narrow searches, then read the implementation. It describes the
current code, not planned functionality. Keep paths, function names and flows
current when changing them; avoid line numbers and exhaustive symbol lists.
The development requirements live in [AGENTS.md](../AGENTS.md).

## Start here

FuelLog is a static PWA with no build step. Most UI and application logic lives
in `app.js`. `index.html` shows a static Home placeholder in `#app`, registers the
service worker immediately, then loads a small deferred script bundle (language registry/catalogues, inline icons, configuration,
database, fuels, providers, promos, data, application). Map, country adapters,
analysis, import and receipt OCR scripts load after first paint via
`loadDeferredScripts` in `app.js`.

| Area or task | Files | Useful entry points |
| --- | --- | --- |
| Startup, state and navigation | [app.js](../app.js), [index.html](../index.html) | `init`, `refresh`, `route`, `render`, `wireCommon` |
| Interface languages and symbols | [js/i18n/](../js/i18n/), [js/ui-icons.js](../js/ui-icons.js), [app.js](../app.js), [index.html](../index.html) | `FuelLogI18n.resolve`, `FuelLogI18n.use`, `tr`, `uiLocale`, `uiIcon`, `changeLanguage`, `updateLanguageUi`, `captureLanguageDraft`, `restoreLanguageDraft`; [I18N.md](I18N.md) |
| Dashboard and history | [app.js](../app.js) | `dashboard`, `history`, `fillRow`, `analysisCard` |
| Interactive history analysis | [js/analysis.js](../js/analysis.js), [js/analysis-ui.js](../js/analysis-ui.js) | `FuelLogAnalysis.prepare`, `select`, `monthly`, `sample`; `FuelLogAnalysisUI.render`, `mount`, `chart` |
| Binary-plist decoding | [js/import/bplist.js](../js/import/bplist.js) | `FuelLogBplist.decode` |
| Jerrycan normalization | [js/import/jerrycan.js](../js/import/jerrycan.js), [app.js](../app.js) | `FuelLogJerrycan.inspect`, `normalize`, `importJerrycan`, `prepareJerrycanBatch` |
| Shared data semantics | [js/data.js](../js/data.js) | `FuelLogData.intervals`, `currency`, `sourceKey`, `amountsByCurrency` |
| Consumption and cost calculations | [app.js](../app.js) | `vehicleFillups`, `calcMetrics`, `consumptionSeries`, `priceSeries` |
| Fill-up and vehicle editing | [app.js](../app.js) | `fillForm`, `urbanProfileField`, `wireUrbanProfile`, fill-up submit handler in `wireCommon`, `vehicleDialog`, `wireVehicleForm`, `findStationForFill`, `pickStationForFill` |
| Receipt scanning and OCR parsing | [js/receipt.js](../js/receipt.js), [js/receipt-ocr.js](../js/receipt-ocr.js), [app.js](../app.js) | `FuelLogReceipt.parse`, `FuelLogReceiptOCR.scan`, receipt review and existing fill-up form |
| Import parsing and validation | [app.js](../app.js) | `importData`, `readFileBuffer`, `readFileText`, `extractRowsFromJson`, `parseDelimited`, `guessDelimiter`, `flexDate`, `flexNum`, `flexBool`, `rowValue` |
| Import persistence and duplicates | [app.js](../app.js) | `importGenericRows`, `prepareJerrycanBatch`, `previewImport`, `importFuelLogBackup` |
| Backup and export | [app.js](../app.js) | `exportJson`, `exportCsv`, `download` |
| Local storage and migrations | [db.js](../db.js), [app.js](../app.js) | `FuelDB.open`, `commitImport`, `DB_VERSION`, `migrateData`, `normalizeStoredFuels`, `migrateMapTileCache` |
| Fuel catalogue and matching | [js/prices/fuels.js](../js/prices/fuels.js), [app.js](../app.js) | `FuelLogFuels`, `fuelLabel`, `canonicalForPriceFuelKey` |
| Provider contract and caches | [js/prices/providers.js](../js/prices/providers.js) | `FuelProviders.register`, `stationProvider`, `referenceProvider`, `cached`, `legacyIOS` |
| Station and reference searches | [app.js](../app.js), [config.js](../config.js), [api/stations.php](../api/stations.php) | `wirePrices`, `runPriceSearch`, `runReference`, `searchProxy`, `renderStations`, `renderReference`, `findPrices` / `findPricesHere` (`runStationFind`) |
| PHP proxy validation and indexing | [api/stations.php](../api/stations.php), [api/stations-functions.php](../api/stations-functions.php) | `parseStationsRequest`, `fetchUpstream`, `buildIndex`, `stationsSearchFromIndex`; [check-stations.php](../scripts/check-stations.php) |
| Station list and map popups | [app.js](../app.js), [styles.css](../styles.css) | `stationHtml`, `popupHtml`, `stationTypicalFillTotal`, `maxTypicalFillTotal`, `stationFillCostLine`, `stationDistanceHtml`, `priceTierClass` |
| User-observed prices and provenance | [app.js](../app.js) | `userStationPrices`, `userHistoryHtml`, `youPaidHtml`, `stationProvHtml`, `logFillAt` |
| Brand promos and effective prices | [js/prices/promos.js](../js/prices/promos.js), [app.js](../app.js) | `FuelLogPromos`, `stationOffer`, `stationSortPrice`, `promoFillLitres`, `fillPromoPrice`, `promoDialog`, `wirePromoForm` |
| Map and Prices bottom sheet | [app.js](../app.js), [styles.css](../styles.css) | `ensureMap`, `updateMap`, `wirePriceSheet`, `setPriceSheetSnap`, `refitMapToResults`, `priceMapFitPadding`, `syncPriceMapSize`, `centerMapOnUser` |
| Settings and app updates | [app.js](../app.js), [config.js](../config.js), [sw.js](../sw.js) | `settingsPage`, `savedLogStorage`, `wireSettingsStorage`, `wireSettingsVersion`, `checkAppUpdate`, `applyPwaUpdate`, `waitForInstallingWorker`, `requestWorkerVersion`, `registerFuelServiceWorker`, `APP_BUILD_ID`; [UPDATES.md](UPDATES.md) |
| Offline maps and search history | [js/prices/offline-tiles.js](../js/prices/offline-tiles.js), [db.js](../db.js), [app.js](../app.js) | `FuelLogOfflineTiles`, `putMapTile`, `getMapTile`, `evictMapTiles`, `archivePriceSearch`, `restorePriceSearchFromArchive` |
| App shell, updates and installation | [sw.js](../sw.js), [config.js](../config.js), [manifest.webmanifest](../manifest.webmanifest), [index.html](../index.html) | `CACHE` (matches HTML/config/`APP_BUILD_ID`), versioned `ASSETS`, `verifyShellRelease`, `SKIP_WAITING`/`GET_VERSION` message handlers; `registerFuelServiceWorker` and install prompt in `init` |
| Styling and old-Safari behaviour | [styles.css](../styles.css), [COMPATIBILITY.md](../COMPATIBILITY.md) | Layout fallbacks and shared 16 px `.field` editing controls; `FuelProviders.legacyIOS`, `download`, regional search paths |
| Checks | [.github/workflows/check.yml](../.github/workflows/check.yml), [docs/TESTING.md](TESTING.md), [scripts/check-*.js](../scripts/) | Syntax/iOS-12 scan, manifest/PHP proxy; Node/PHP regression scripts (see TESTING.md) |

Country adapters are in `js/prices/providers/`: `pt-dgeg.js`, `es-minetur.js`,
`fr-government.js`, `be-fps.js` and `nl-cbs.js`. Their contract, provenance and
source policies are documented in [PROVIDERS.md](PROVIDERS.md).

## Main data flows

- **Updates:** fresh complete precache → verify HTML/config/app release markers →
  activate → one controller-change reload. Navigation and assets come from the
  same installed cache; `sw.js` checks bypass it. See [UPDATES.md](UPDATES.md).
- **Startup:** service worker registration (also inlined in `index.html`); iOS Home Screen launch
  image `assets/FuelLogiPhone14pro.png` (1179×2556, iPhone 14/15/16 Pro class) → `init`
  → `FuelDB.open` → `refresh` → default vehicle when needed → `migrateData`
  → `render` (replaces placeholder) → `loadDeferredScripts` after first paint.
- **Language:** saved `settings.language`, otherwise supported device preferences
  (`navigator.languages` / `navigator.language`) → `FuelLogI18n.resolve` / `use`
  → header flag + translated
  rendering/locale formatting. Device detection is not persisted; an explicit
  selection (even the current language) is saved and always wins on later launches.
  It is separate from `priceCountry`. Switching preserves
  form drafts, imported urban precision, filters and station/reference results.
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
  Generic imports stage vehicles in memory inside `importGenericRows`; the legacy
  `ensureVehicleByName` helper is not called by this path. Generic duplicates use
  vehicle + `FuelLogData.sourceKey` (date, odometer, litres, currency, total cost);
  native backups preserve distinct local IDs and remap conflicts on merge.
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
  prices → promo comparison → sorted station list and map markers. the **magnifying glass** searches
  at the map centre; the **location target** uses geolocation then searches there. Station cards
  show effective €/L, typical-fill total and saving vs the most expensive result
  in the current list (typical litres from Settings → Brand promos). List layout
  puts distance under the name and totals under the price; map popups show price,
  total and saving on one right-aligned line. Opening results expands the bottom
  sheet to half; `refitMapToResults` fits markers in the visible map area (sheet
  overlap via layout measurement). `userStationPrices` reads local fill-ups as a
  separate historical price source. Provider caches and search archives allow reuse
  of previous results offline.
- **Backups:** in-memory records → `exportJson` or `exportCsv` → `download` with
  the legacy-iOS fallback. JSON exports whole records; CSV lists fields explicitly.

## Storage boundaries

`db.js` defines `vehicles`, `fillups`, `settings`, `priceCache`, `promos` and
`mapTiles` stores. Records use local IDs; fill-ups link to vehicles through
`vehicleId`. `commitImport` writes affected stores atomically and resolves on transaction
completion. Replacement clears only participating non-settings stores; settings
are upserted, so absent backup keys remain local. JSON backup version 4 is separate
from IndexedDB version 3 and the `schemaMigrated` record-normalization marker.
Store/index upgrades live in `FuelDB.open`; record normalization
and settings migrations live in `app.js`.

Settings → Storage estimates the UTF-8 JSON payload of all saved fill-ups, vehicles,
promos and persisted settings, one record at a time. Browser usage/quota comes from
feature-detected `navigator.storage.estimate()` and includes caches and other
same-origin storage; missing, rejected or invalid estimates show unknown capacity.
Additional fill-ups divide remaining quota by average serialized fill-up size,
without promising that many records will fit. Empty logs have no record estimate.

Service-worker Cache Storage in `sw.js` is separate from IndexedDB. The tile
manifest is precached; bundled PNGs are cached on request. `mapTiles` uses
provider-qualified keys and evicts by write timestamp at a 32 MiB cap, without
refreshing timestamps on reads. Optional OCR runtime assets are cached on use;
Tesseract manages its language-model cache separately. The optional
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
  `sw.js` asset list/release queries and `CACHE` bump, matching `APP_BUILD_ID`,
  HTML `data-app-version` and `appCacheId` in `config.js`
  (`scripts/check-sw-assets.js`), and offline verification.
- **App version bump:** change the full release identifier in `sw.js`, `config.js`,
  `index.html` (marker/script/style queries) and `app.js` (`APP_BUILD_ID`) together; Settings compares the installed id to a network fetch of `sw.js` when
  online and applies waiting service workers via **Update app**.
- **New map behaviour:** `app.js`, `styles.css`, offline tile layer, IndexedDB
  caches and [COMPATIBILITY.md](../COMPATIBILITY.md). Bundled tile generation lives
  in [scripts/generate-low-zoom-tiles.mjs](../scripts/generate-low-zoom-tiles.mjs).

For user behaviour and formats see [README.md](../README.md); for contribution,
privacy and security rules see [CONTRIBUTING.md](../CONTRIBUTING.md),
[PRIVACY.md](../PRIVACY.md) and [SECURITY.md](../SECURITY.md).
