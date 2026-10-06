# Fuel price providers

FuelLog treats external fuel-price information as an optional enhancement. The fuel log itself is always local and private. Price lookups use only public government/open-data sources — no operator sites, private APIs, or commercial aggregators.

## Architecture

`js/prices/providers.js` exposes `window.FuelProviders`, a small registry:

- `FuelProviders.COUNTRIES` — PT, ES, FR, BE, NL (only countries with a registered provider are offered in the UI).
- `register(provider)`, `forCountry(code)`, `stationProvider(code)`, `referenceProvider(code)`, `byId(id)`, `countries()`.
- Shared helpers: `cached(key, ttlMs, loader)` (IndexedDB cache with stale-on-failure), `fetchJson`, `hav`, `parseNum`, `val`, `localIso`, `ago`, `norm`, `aroundCenter`, `legacyIOS`, `TTL`.

Provider contract (also documented in the file header):

```js
{
  id, country, name, attribution, license, sourceUrl,
  sourceType: 'government-station' | 'government-reference',
  priceType: 'station' | 'official-maximum' | 'national-average',
  capabilities: { stationDirectory, stationPrices, referencePrices, regions },
  proxyDataset: null | 'pt-dgeg' | 'es-minetur',
  fuels(): Promise<[{key, canonical, label, unit}]>,
  regions(): Promise<[{id, label}]>,            // only when capabilities.regions
  requiresRegion(): boolean,
  searchStations({fuelKey, center, radiusKm, regionId}): Promise<{stations, sourceUpdatedAt}>,
  referencePrices(): Promise<{prices, sourceUpdatedAt}> // only reference providers
}
```

Station records carry provenance: `{sourceType, sourceId, priceType, sourceUpdatedAt, retrievedAt}`, displayed in the UI together with any `stale` cache marker.

## Support matrix

| Country | Provider | Kind | Price type | Proxy |
|---|---|---|---|---|
| PT | DGEG | station directory + prices | station | `pt-dgeg` |
| ES | Minetur/MITECO Geoportal | station directory + prices | station | `es-minetur` |
| FR | data.economie.gouv.fr | station directory + prices | station | — |
| BE | FPS Economy / Statbel | official maxima | official-maximum | — |
| NL | CBS (80416ned) | national average | national-average | — |
| EU | EU Oil Bulletin | weekly bulletin | — | not implemented |

## Providers

### pt-dgeg — Portugal

- Endpoint: `https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb/` (`GetTiposCombustiveis`, `GetDistritos`, `PesquisarPostos`).
- Attribution: DGEG — Direção-Geral de Energia e Geologia. Licence: public information; non-commercial reuse.
- Sent to the service: fuel id and optional district id; coordinates only for local radius filtering (or rounded coordinates to the own proxy when enabled).
- Cache: searches 15 min, catalogues 30 days. Proxied via `api/stations.php` (`pt-dgeg-<fuel>.json`, hourly).

### es-minetur — Spain

- Endpoint: `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/` (per-province `EstacionesTerrestres/FiltroProvincia/{id}`; provinces list `Listados/Provincias/`).
- Attribution: Ministerio para la Transición Ecológica y el Reto Demográfico — Geoportal Gasolineras. Licence: datos abiertos.
- Direct browser mode always requires a province (the nationwide dataset is ~10 MB). Proxy mode uses `es-minetur-all.json`, refreshed hourly server-side.
- Cache: per-province search 15 min, provinces 30 days.

### fr-government — France

- Endpoint: `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records` (Opendatasoft `within_distance` queries, paginated, max 300 rows).
- Attribution: Ministère de l'Économie — flux instantané v2. Licence: Licence Ouverte / Open Licence 2.0 (Etalab).
- Sent to the service: fuel key and coordinates rounded to ~100 m inside the `within_distance` clause. A location is required; no region concept.
- Cache: 15 min per fuel/centre/radius.

### be-fps — Belgium (reference)

- Endpoint: `https://bestat.statbel.fgov.be/bestat/api/views/665e2960-bf86-4d64-b4a8-90f2d30ea892/result/JSON`.
- Attribution: FPS Economy / Statbel — official maximum prices for petroleum products. Licence: Statbel open data.
- Nothing is sent but the request itself; results are national official maximum prices (price incl. VAT), valid for the published day. Cache: 6 h.

### nl-cbs — Netherlands (reference)

- Endpoint: `https://opendata.cbs.nl/ODataApi/odata/80416ned/TypedDataSet` (latest observation of the current/previous year).
- Attribution: Centraal Bureau voor de Statistiek — Pompprijzen motorbrandstoffen (80416ned). Licence: CC BY 4.0.
- National average prices for Euro95, Diesel, LPG. Cache: 24 h.

## Canonical fuels

`js/prices/fuels.js` defines `FuelLogFuels.LIST`: `PETROL_95`, `PETROL_95_E5`, `PETROL_95_E10`, `PETROL_98`, `DIESEL_B7`, `DIESEL_B10`, `DIESEL_PREMIUM`, `LPG`, `CNG`, `LNG`, `E85`, `ADBLUE`, plus `label()`, `related()` fallbacks and a multilingual `guess(text)`.

Provider fuel keys map to canonical ids, e.g. DGEG `3201`→`PETROL_95`, `2101`→`DIESEL_B7`; Minetur `Precio Gasoleo A`→`DIESEL_B7`; FR `gazole`→`DIESEL_B7`, `e10`→`PETROL_95_E10`; BE product names and NL CBS fields map the same way. Canonical ids are stored on fill-ups (`fuelId`) and vehicles (`preferredFuel`).

## Your history

Fill-ups can record `stationId`, `country` and `fuelId`. The Prices page derives a private, local "Your history" price source from past fill-ups — "You paid €x.xxx/L here" on matching station cards and a per-station history block. This data never leaves the device.

## Station proxy

`api/stations.php` accelerates `pt-dgeg` (per-fuel file) and `es-minetur` (single ~10 MB nationwide file) datasets with an hourly server-side grid index, answering `POST {provider, fuel, lat, lon, radius}` from the same origin only. See README.

## Excluded sources

Operator and retailer sites/apps are deliberately excluded — Q8, DATS24, TinQ, Tango, Shell and similar — as are scraping, reverse-engineered private endpoints, and commercial aggregators. Only public/official data with a clear licence is wired in.

The detailed handover notes live in [FuelLog-Devin-European-Providers-Handover.md](FuelLog-Devin-European-Providers-Handover.md).
