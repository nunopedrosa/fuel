# FuelLog PWA — European Fuel Price Provider Handover

## Purpose

FuelLog is a public, non-commercial, open-source fuel logging PWA intended for `https://fuel.trekm.com` and GitHub.

Core principles:

- Strongly local-first.
- Fuel records, vehicles, settings and caches remain on the user's device.
- Import/export is the primary backup and portability mechanism.
- No account, cloud database, synchronization service or analytics requirement.
- Hosting/server load should be minimal.
- External requests occur only for optional current/reference fuel-price information.
- Compatibility floor: **iPhone 6 / iOS 12.5.7 / Safari 12**.

## Public-data-only policy

Use only fuel-price sources that are legitimately public/reusable.

Do **not**:

- scrape fuel-chain websites;
- reverse-engineer undocumented operator APIs;
- call private/internal endpoints discovered behind station finders;
- automate extraction from Q8, Tango, TinQ, DATS24, Shell or similar operator sites;
- ask operators for special API access;
- require API credentials for ordinary operation;
- introduce commercial price aggregators;
- introduce server-side scraping.

Prefer, in order:

1. official government/open-data APIs;
2. government-published datasets;
3. explicitly licensed public datasets;
4. EU public datasets;
5. the user's own FuelLog history.

If reuse/licensing is uncertain, do not enable the source.

## Multi-provider architecture

Do not model one country as one provider. A country may have:

```text
Country
  +-- station directory provider
  +-- station-price provider(s)
  +-- national/reference-price provider
  +-- locally observed FuelLog prices
```

Providers expose capabilities independently.

Example provider metadata:

```javascript
{
  id: "pt-dgeg",
  country: "PT",
  name: "DGEG",
  capabilities: {
    stationDirectory: true,
    stationPrices: true,
    referencePrices: false,
    regions: true
  },
  sourceType: "government",
  accessType: "public",
  priceType: "station"
}
```

Example Netherlands provider:

```javascript
{
  id: "nl-cbs",
  country: "NL",
  name: "CBS",
  capabilities: {
    stationDirectory: false,
    stationPrices: false,
    referencePrices: true,
    regions: false
  },
  sourceType: "government",
  accessType: "open-data",
  priceType: "national-average",
  license: "CC-BY-4.0"
}
```

## Initial country support

### Portugal — DGEG

Status: **full station-price support**.

Support station search, coordinates, fuel types, current prices, regional filtering and timestamps where available. Continue local caching.

On iPhone 6/iOS 12, require/select a district or region before large searches to avoid unnecessarily downloading the full Portuguese station dataset.

### Spain — MITECO / official public source

Target: **full station-price support**.

Implement as its own provider adapter. Expected capabilities include stations, coordinates, fuel types, current prices and geographic filtering. Verify the current official endpoint before implementation.

### France — official government fuel-price open data

Target: **full station-price support**.

Avoid repeatedly downloading/decompressing a large nationwide dataset on iPhone 6. Prefer smaller official regional/public resources where practical.

If preprocessing becomes necessary, generate static regional files rather than introducing an application backend, e.g.:

```text
/data/fr/
  01.json
  02.json
  ...
  75.json
```

### Belgium — FPS Economy / FOD Economie

Status: **official reference/maximum-price support**.

Represent these values as `official-maximum`, never `station-price`.

Do not integrate Q8, DATS24 or other operator prices unless a clearly reusable public dataset appears later.

Example UI:

```text
Belgium
Diesel B7

Official maximum
€x.xxx / L

Individual station prices:
Not available from an enabled public-data provider.
```

### Netherlands — CBS

Status: **official reference-price support**.

CBS national weighted average pump prices should be represented as `national-average`, never `station-price`. The public dataset includes Euro95, diesel and LPG and is CC BY 4.0.

Do not scrape TinQ, Tango, Shell or other operators.

## EU fallback

Optionally support the European Commission Weekly Oil Bulletin as `eu-national-reference`.

Priority should roughly be:

```text
official current station price
        ↓
official national/reference price
        ↓
EU Weekly Oil Bulletin
```

User history is separate because it represents an actual historical observation.

## FuelLog history as a price source

Every fill-up can provide the actual price paid:

```text
price per litre = total cost / litres
```

Use this as a local station-price history.

Example:

```text
Q8 Linkebeek
Your history

6 Oct 2026    €1.982/L
21 Sep 2026   €1.949/L
4 Sep 2026    €1.927/L
```

This must work even where no current external station-price provider exists.

## Price provenance

Every displayed price must identify its provenance.

Suggested normalized metadata:

```javascript
{
  value: 1.982,
  currency: "EUR",
  unit: "litre",
  sourceType: "user",
  sourceId: null,
  observedAt: "2026-10-06T18:32:00Z",
  retrievedAt: null
}
```

Supported source types should include:

```text
user
government-station
government-reference
eu-reference
public-open-data
```

External data should distinguish `sourceUpdatedAt` from `retrievedAt`. User prices use `observedAt`.

UI examples:

```text
€1.749/L
DGEG · current station price
Updated 24 min ago
```

```text
€1.982/L
You paid this here
3 days ago
```

```text
€2.058/L
Belgian official maximum
```

```text
€1.934/L
CBS national average
```

Never display a price without making its type/source understandable.

## Station identity

Introduce a normalized station model:

```javascript
{
  id: "...",
  country: "BE",
  name: "Q8 Linkebeek",
  brand: "Q8",
  address: "...",
  latitude: 50.x,
  longitude: 4.x,
  externalIds: {}
}
```

Historical fill-ups should reference a station ID where possible, but manually entered/imported records containing only station text must continue to work.

For imported history, use conservative matching based on country, normalized name, brand, town and coordinates when available. Do not aggressively merge uncertain matches. Preserve original text when uncertain.

## Canonical fuel identifiers

Introduce internal fuel identifiers such as:

```text
PETROL_95
PETROL_95_E5
PETROL_95_E10
PETROL_98
DIESEL_B7
DIESEL_B10
DIESEL_PREMIUM
LPG
CNG
LNG
E85
ADBLUE
```

Providers map local terminology to these identifiers while retaining original provider labels as metadata when useful.

Vehicles should store a canonical preferred fuel, e.g.:

```javascript
{
  id: "...",
  name: "My car",
  preferredFuel: "DIESEL_B7"
}
```

This allows the same vehicle to search prices while travelling between countries.

## Country selection

Store the selected fuel-price country locally.

Example:

```text
Fuel prices

Country
[ Portugal ▼ ]

Region
[ Lisboa ▼ ]

Fuel
[ Diesel B7 ▼ ]
```

Geolocation is optional. Manual country/region selection must always be possible.

## Caching and offline behaviour

Suggested starting TTLs:

```text
station price search        15 minutes
fuel-type catalogue         30 days
region catalogue            30 days
national reference price    according to publication frequency
```

Cache external data in IndexedDB rather than treating service-worker Cache Storage as the authoritative price cache.

Offline, all core functionality must remain available:

- vehicles;
- fill-ups;
- editing;
- history;
- calculations;
- import/export;
- user-observed station history;
- previously cached external prices.

Stale external data must show its age, e.g.:

```text
€1.749/L
DGEG
Cached 2 days ago
```

## No backend requirement

Do not introduce a database or application API on `fuel.trekm.com`.

Deployment should remain essentially static:

```text
DreamHost
  +-- HTML
  +-- CSS
  +-- JavaScript
  +-- manifest
  +-- service worker
  +-- icons/artwork
  +-- optional static public datasets
```

PHP should not be required for normal operation.

## iPhone 6 compatibility

Compatibility floor remains **iPhone 6 / iOS 12.5.7 / Safari 12**.

Do not introduce unsupported runtime features such as:

```text
optional chaining
nullish coalescing
Array.prototype.at
String.prototype.replaceAll
crypto.randomUUID
File.text
incompatible ES-module dependencies
```

Retain existing fallbacks and keep dependencies small. Do not add a large framework for provider support or a large XLSX parser to the core bundle unless separately approved.

## Import/export and migrations

Import/export remains central; do not replace it with cloud synchronization.

Supported/intended imports:

- FuelLog JSON backup;
- generic JSON record arrays;
- CSV;
- semicolon-separated CSV;
- TSV;
- delimited TXT.

JSON is the canonical complete backup format.

New station IDs, price provenance and canonical fuel IDs must survive JSON export/restore. Older FuelLog backups must remain importable.

If IndexedDB schema changes, migrate existing installations without losing vehicles, fill-ups, settings or cached data. New fields should generally be optional so old records continue to work.

## Privacy

Never transmit personal FuelLog data to public price providers.

External price requests must not include:

- vehicle registration;
- odometer;
- fuel history;
- user identity;
- historical stations;
- expenditure.

Geolocation, when used, should transmit only what the selected public service technically requires. Prefer local geographic filtering where practical.

## Attribution

Provider adapters should carry attribution/licensing metadata, for example:

```javascript
{
  id: "nl-cbs",
  attribution: "Centraal Bureau voor de Statistiek",
  license: "CC BY 4.0",
  sourceUrl: "..."
}
```

Display attribution where required and document enabled external datasets and licences.

## Explicitly excluded providers

Do not implement automated retrieval from:

```text
Q8
DATS24
TinQ
Tango
Shell station pages
other operator websites without explicitly reusable public data
```

Do not add dormant scraper code, commit reverse-engineered endpoints, or contact these providers requesting authorization.

## Suggested source organization

Logical organization:

```text
js/
  prices/
    providers.js
    fuels.js
    countries.js
    cache.js
    normalize.js

    providers/
      pt-dgeg.js
      es-miteco.js
      fr-government.js
      be-fps.js
      nl-cbs.js
      eu-oil-bulletin.js
```

Because iOS 12 is required, production delivery need not use browser ES modules. Prefer retaining the current lightweight/zero-build deployment where practical.

## Provider failure isolation

A failed provider must never break FuelLog.

Example:

```text
Could not update Portuguese station prices.

Last cached data:
6 Oct 2026 14:42

Your fuel log remains available offline.
```

## Documentation updates

Update README and relevant technical docs with:

- multi-country architecture;
- country/provider capabilities;
- price provenance;
- station vs reference vs maximum prices;
- local historical prices;
- canonical fuels;
- caching;
- source licences;
- offline/privacy behaviour;
- iPhone 6 compatibility;
- excluded operator sources.

Update CHANGELOG.

## Initial support matrix

| Country | Current station prices | Official reference | Local FuelLog history |
|---|---|---|---|
| Portugal | Yes — DGEG | If applicable | Yes |
| Spain | Yes — official public source | If applicable | Yes |
| France | Yes — official public source | If applicable | Yes |
| Belgium | No | Yes — official maximum | Yes |
| Netherlands | No | Yes — CBS average | Yes |

Unsupported capabilities should not be presented as errors.

## Acceptance criteria

1. Existing Portuguese functionality still works.
2. Existing user data survives the upgrade.
3. Price code is provider-based rather than Portugal-specific.
4. Portugal works through the new provider interface.
5. Spain and France use official/public station-level sources.
6. Belgium exposes official maximum/reference pricing only.
7. Netherlands exposes official CBS reference pricing only.
8. No operator scraping or private/undocumented APIs are present.
9. User fill-up history provides locally observed station prices.
10. Price provenance is visible.
11. Stale cached data is identified.
12. Provider failures do not affect local logging.
13. No backend/database is introduced.
14. Normal logging remains completely local.
15. Import/export remains fully functional.
16. New fields survive JSON backup/restore.
17. Older backups remain importable.
18. iPhone 6/iOS 12 compatibility is retained.
19. README and technical documentation are updated.

## Guiding principle

> **FuelLog is first a private, local fuel log. External fuel-price information is an optional enhancement.**

The user's own data must never depend on an external service.

If every external fuel-price provider disappeared tomorrow, FuelLog should still function as a complete fuel logging, history, calculation, import and export application.
