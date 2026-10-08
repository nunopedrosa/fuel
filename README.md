# FuelLog

FuelLog is a small, installable, **local-first fuel log Progressive Web App (PWA)** intended for public deployment at `https://fuel.trekm.com/` and publication as an open-source GitHub repository.

The application is designed around a simple rule: **personal vehicle and fill-up data belongs on the user's device, not on the web server**.

FuelLog therefore needs no account, database, login, analytics service, cloud sync, or tracking infrastructure. DreamHost or GitHub Pages only serves the static application files plus one optional same-origin PHP script (`api/stations.php`, see [Station proxy](#station-proxy)). After the PWA application shell has been cached, normal fuel logging works offline and places almost no continuing load on the host.

Fuel-station prices for Portugal, Spain and France, plus official reference prices for Belgium and the Netherlands, are an optional online feature supplied by public/official data providers (see [Fuel price providers](#fuel-price-providers)). They are requested only when the user explicitly asks to find stations — via the same-origin station proxy when it is enabled in `config.js`, or directly by the user's browser from the public provider when the proxy is disabled or unavailable.

---

## Contents

- [Main features](#main-features)
- [Privacy and local-first design](#privacy-and-local-first-design)
- [How the application works](#how-the-application-works)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Using FuelLog](#using-fuellog)
- [Consumption and cost calculations](#consumption-and-cost-calculations)
- [Backup and export](#backup-and-export)
- [Importing existing fuel records](#importing-existing-fuel-records)
- [FuelLog JSON backup format](#fuellog-json-backup-format)
- [CSV format](#csv-format)
- [Fuel price providers](#fuel-price-providers)
- [Offline behaviour and caching](#offline-behaviour-and-caching)
- [iPhone 6 / iOS 12 support](#iphone-6--ios-12-support)
- [Browser compatibility](#browser-compatibility)
- [Deployment](#deployment)
- [Development](#development)
- [Repository structure](#repository-structure)
- [Data model](#data-model)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Backup recommendations](#backup-recommendations)
- [Known limitations](#known-limitations)
- [Possible future work](#possible-future-work)
- [License](#license)

---

## Main features

### Fuel logging

- Multiple vehicles
- Date and time of each fill-up
- Odometer reading in kilometres
- Litres added
- Total fuel cost
- Price per litre
- Full-tank or partial-fill indication
- Fuel type
- Fuel station
- Free-form notes
- Edit and delete existing entries

### Dashboard

For the selected vehicle FuelLog displays:

- average consumption in L/100 km
- latest fill-up
- logged distance
- total fuel logged
- total fuel spend
- cost per kilometre
- Interactive Fill analysis: period sliders, consumption and price history, monthly purchases, urban-driving comparison, point inspection and expanded zoom
- recent fill-ups

### History

- all recorded fill-ups
- filter by vehicle
- search station names and notes
- edit or remove records

### Portability

- canonical lossless FuelLog JSON backup
- CSV export for spreadsheets and other tools
- native Jerrycan binary-plist import
- generic JSON import
- comma-separated CSV import
- semicolon-separated CSV import, common with European Excel installations
- TSV import
- delimited TXT import
- English and Portuguese column-name aliases
- decimal point and decimal comma support
- merge or replace import modes (in-app dialog)
- basic duplicate avoidance when importing generic records
- in-app confirmation dialogs for deletes and import mode (no native browser prompts)

### Fuel prices

- multi-country providers: station prices for Portugal, Spain and France; official reference prices for Belgium and the Netherlands
- canonical fuel catalogue with multilingual name matching
- source provenance and staleness labels on every price
- your own fill-up history surfaced as a private local price source ("You paid … here")
- "Add fill-up" from a station card or map popup
- user-defined brand promos: per-litre or per-fill discounts, cumulative or exclusive, that show an effective price on matching stations and re-sort results by that price
- optional device geolocation
- radius filtering when location is available
- sorting by price and then distance
- optional map view of stations and the user's location (OpenTopoMap / OSM)
- "search this area" around the current map centre
- on-device result caching
- reduced-memory search path for iPhone 6 / iOS 12

### PWA / offline use

- installable on supported phones and computers
- offline application shell
- IndexedDB local database
- no runtime JavaScript frameworks or third-party libraries
- no build step
- no application backend (a single optional same-origin station-proxy script is the only server-side code)

---

## Privacy and local-first design

FuelLog is deliberately different from a traditional cloud application.

### Stored locally

The following information is stored in **IndexedDB on the user's browser/device**:

- vehicles
- fuel records
- application settings
- user-defined brand promos
- cached provider fuel types/regions
- cached provider station searches and reference prices

### Not sent to `fuel.trekm.com`

FuelLog does **not** send the user's:

- vehicle details
- registration number
- odometer readings
- fuel history
- costs
- notes
- brand promos
- imported files
- exported backups

back to the hosting server.

The host normally sees only requests for static application files such as HTML, JavaScript, CSS, icons and the service worker, plus POSTs to `api/stations.php` when the user runs a station search with the proxy enabled.

### No accounts or tracking

FuelLog includes no:

- user accounts
- login system
- cookies for tracking
- advertising
- analytics platform
- telemetry
- cloud database
- background cloud synchronisation

See [PRIVACY.md](PRIVACY.md) for the focused privacy statement.

> **Important:** browser-local storage can be deleted by the user or operating system. FuelLog's privacy model therefore makes **exported backups important**. See [Backup recommendations](#backup-recommendations).

---

## How the application works

```text
                  fuel.trekm.com
                        |
                        | static files only
                        v
                Browser / PWA
             +--------------------+
             | Service Worker     |
             | cached app shell   |
             +--------------------+
                        |
             +--------------------+
             | IndexedDB          |
             |                    |
             | vehicles           |
             | fill-ups           |
             | settings           |
             | promos             |
             | price cache        |
             +--------------------+
                        |
                        | only after an explicit
                        | station-price search
                        v
              public fuel-price provider
```

A normal workflow such as opening FuelLog, adding a fill-up, editing a vehicle or viewing history does not require the application server once the PWA files are available locally.

---

# Installation

FuelLog can also be used directly in a normal browser tab. Installation is optional but recommended on phones because it gives the application its own Home Screen icon and app-like window.

## iPhone 6 / iOS 12.5.7

1. Open `https://fuel.trekm.com/` in **Safari**.
2. Tap the **Share** button.
3. Choose **Add to Home Screen**.
4. Confirm the name and icon.
5. Launch FuelLog from the new Home Screen icon.

Older iOS versions do not support the Chromium-style automatic install prompt. Manual **Add to Home Screen** is expected.

## Current iPhone / iPad

Open the site in Safari and use **Share → Add to Home Screen**.

Depending on the iOS version, Apple may describe the installed application as a web app.

## Android

On a modern Chromium-based browser:

1. Open the site.
2. Use the browser's **Install app** / **Add to Home Screen** command, or the FuelLog install button when offered.
3. Launch FuelLog from the launcher icon.

## Desktop

Chrome, Edge and other PWA-capable browsers can install FuelLog as a desktop web application. It can also simply remain a normal browser bookmark.

---

# Quick start

1. Open FuelLog.
2. Go to **Settings** and configure the initial vehicle.
3. After refuelling, choose **Add fill-up**.
4. Enter the odometer, litres and total paid.
5. Leave **Full tank** enabled when the tank was filled completely.
6. Save the entry.
7. Continue recording fill-ups.
8. After two suitable full-tank points exist, FuelLog can calculate average consumption.
9. Periodically choose **Export backup** to create a FuelLog JSON backup.

---

# Using FuelLog

## Vehicles

FuelLog supports more than one vehicle. Each vehicle has its own identifier and can contain:

- name
- registration
- make
- model
- preferred/default fuel type
- initial odometer field

One vehicle is selected as the active vehicle for the dashboard and new-entry defaults.

A generic data import can create vehicles automatically when imported rows contain vehicle names that are not yet present.

## Brand promos

Fuel stations sometimes run brand-level promotions. In **Settings → Brand promos** you can record:

- the brand name (matched exactly against the station's brand, ignoring case and accents)
- an optional country restriction
- a discount type: **€ per litre off** or **€ per fill off**
- the amount
- an optional fuel restriction and an optional end date
- whether the promo is **cumulative** (the default) or exclusive

Cumulative promos that match the same station are added together. An exclusive promo is not combined with that stack or with other exclusive promos. The price list and the map show the **effective price** of the better package — the cumulative stack, or the single best exclusive promo — with the original price struck through and a promo badge. When both packages exist, the other one is shown on a second line. Results are sorted by the winning effective price. Per-fill discounts are converted to an approximate per-litre value using the configurable *Typical fill* size (default 40 L) for display and sorting. A promo saved before this option existed is treated as cumulative.

Promos match on the station's `brand` field only. Providers that do not report a brand (France) never match; in Spain the provider uses the station name as the brand, so name-based brands work there.

Starting a fill-up from a station card uses the winning package only. A per-litre winner prefills the effective price. If that package includes a per-fill discount, the form prefills the listed price minus any exact per-litre discounts and a note lists the per-fill amounts to subtract from the total. The price and the note stay editable, and saving stores what is on the form.

## Adding a fill-up

A fill-up contains:

| Field | Required | Description |
|---|---:|---|
| Vehicle | Yes | Vehicle to which the record belongs |
| Date & time | Yes | When fuel was purchased |
| Odometer | Yes | Vehicle odometer in kilometres |
| Litres | Yes | Fuel quantity |
| Total cost | Yes | Total amount paid in euro |
| Price/litre | No | Unit price; may be entered manually |
| Station | No | Station name |
| Fuel type | No | e.g. Gasóleo simples |
| Urban driving | No | Estimated urban share since the previous fill-up (0–100%) |
| Full tank | No | Indicates that the tank was filled to full |
| Notes | No | Free-form comments |

When adding a record, the date/time defaults to the current local time and FuelLog defaults to the active vehicle.

The **Urban driving** slider appears below Fuel. Uncheck **Not specified** to
enter an estimate; 0% means entirely outside urban areas and 100% entirely urban.
Leave it unspecified when unknown. Imported values keep their original precision
unless adjusted. Internally, `cityPercentage` stores a fraction from 0 to 1;
manual changes set `cityPercentageSource` to `user` without replacing import
provenance. JSON backups preserve both fields; CSV preserves only the fraction.

## Exploring Fill analysis

On Home, **Period position** moves the analysis window through your vehicle's
history and **Period length** adjusts its duration in days. Shortcuts select
1, 3, 6 or 12 calendar months ending at the selected endpoint; **All history**
resets both controls. The overview highlights the chosen dates. Position is
disabled when the window already covers the whole history.

Summaries show distance-weighted consumption, completed distance, purchased
litres, recorded spending, litre-weighted price paid and completed interval count.
Spending and prices remain separate for each currency. Missing amounts are marked;
partial spending totals include only recorded amounts. The preceding equal-duration
period is shown for comparison where data exists; sparse coverage can affect that
comparison.

Choose **Consumption**, **Price paid**, **Purchases** or **Urban driving**.
Consumption includes only full-to-full intervals with both endpoints within the
inclusive selected dates. Intervals are calculated across the entire history first,
including partial fills; boundary-crossing intervals are counted and excluded,
never clipped. Purchase totals include purchases dated inside the window, so they
cover different records. Unusual consumption remains visible; calculation warnings
are accessible below the chart. Invalid-distance intervals are excluded without
changing stored data.

The dashed consumption trend weights up to five intervals by distance. Monthly
charts show spending and litres separately for the chosen currency. Urban scatter
plots require complete profiles across an interval, weight percentages by segment
distance, and show known-distance coverage. Missing profiles remain unknown; zero
means no urban driving. A zero-distance segment retains known positive-distance
coverage but excludes the interval from scatter; a decreasing/invalid odometer
segment makes the interval's urban profile unknown. The plot shows an association,
not proof of cause.

Tap a chart to inspect an observation, or focus it and use Left/Right/Home/End.
**Expand** opens a larger view; **+**, **−** and **Reset** update the same period
and summaries. Close or Escape returns focus to Expand. Zoom uses explicit buttons;
pinch gestures are not implemented. Axes use stable full-history scales by default;
**Automatic scale** fits the selected observations. Brief transitions are disabled
by Reduce Motion and while dragging the sliders.

Charts display at most 160 representative observations, preserving endpoints and
bucket extremes; summary calculations use every eligible record. Purchases use
at most 60 calendar buckets, combining months for very long histories. Sampling
is labelled. Analysis stays local and works offline after the app shell is cached.

## Full tanks and partial fills

The **Full tank** flag is significant for consumption calculation.

FuelLog can safely record partial fills. Litres from partial fills are accumulated until a later full fill closes the measurement interval.

Example:

```text
Full fill        50 L at 10,000 km
Partial fill     20 L at 10,300 km
Partial fill     15 L at 10,500 km
Full fill        25 L at 10,700 km
```

For that full-to-full interval FuelLog uses:

```text
Distance = 10,700 - 10,000 = 700 km
Fuel     = 20 + 15 + 25 = 60 L
```

The 50 L from the first full fill belongs to the preceding interval and is not counted in the new interval.

## History

The History screen lists records with:

- date
- vehicle
- station
- odometer
- litres
- full/partial indicator
- cost
- price per litre

Records can be edited or deleted individually.

## Suggestion button

An envelope button in the top-right corner of the title bar opens the device's email app with a pre-addressed suggestion message: the subject is `[Fuel suggestion]` and the body names the page where the button was pressed, followed by a `Suggestion:` line to write on. Nothing is sent until the user presses send in their mail app. The button can be hidden in **Settings → Feedback**.

---

# Consumption and cost calculations

## Average fuel consumption

FuelLog calculates consumption from valid **full-to-full intervals**:

```text
Consumption (L/100 km) = litres used / distance travelled * 100
```

Partial fills between two full fills are included in the litres used for that interval.

If FuelLog does not yet have enough full-tank reference points, average consumption is displayed as `—` rather than inventing a result.

## Distance logged

The dashboard's logged distance is currently:

```text
latest recorded odometer - earliest recorded odometer
```

for the selected vehicle.

## Total fuel

```text
sum of litres recorded for the selected vehicle
```

## Total spend

```text
sum of totalCost for recorded fill-ups, grouped separately by currency
```

## Cost per kilometre

```text
fuel spend / logged distance
```

This value represents **fuel cost only**. It does not include maintenance, insurance, tolls, depreciation, electricity, parking or other vehicle expenses.

---

# Backup and export

FuelLog provides two intentionally different exports.

## FuelLog JSON backup

The JSON backup is the **recommended backup/restore format**.

It preserves:

- vehicle objects
- fill-up objects
- stable record IDs
- relevant application settings
- timestamps and optional fields

Use JSON when the objective is to restore FuelLog or move the database to another browser/device.

The exported filename follows the pattern:

```text
fuellog-backup-YYYY-MM-DD.json
```

## CSV export

CSV is intended for:

- Excel
- Numbers
- LibreOffice
- statistical analysis
- import into other applications
- human inspection

The exported filename follows:

```text
fuellog-YYYY-MM-DD.csv
```

CSV is an interoperability format, not the canonical FuelLog backup format.

## Export on old iOS

Older Safari versions, including iOS 12, do not reliably support the modern generated-file download workflow.

On those devices FuelLog opens the generated export as a local document in Safari. Use the iOS **Share** sheet to save, copy, send or move the file as appropriate.

---

# Importing existing fuel records

FuelLog accepts several lightweight formats without downloading an import library.

## Supported formats

- FuelLog JSON backup
- generic JSON array
- JSON object containing a `fillups` array
- JSON object containing a `records` array
- JSON object containing an `entries` array
- JSON object containing a `data` array
- CSV
- semicolon-separated CSV
- TSV
- delimited TXT

The delimited-text importer automatically detects:

- comma `,`
- semicolon `;`
- tab

Semicolon support is particularly useful for CSV files produced by European spreadsheet installations where comma is the decimal separator.

## XLS and XLSX

FuelLog intentionally does **not** bundle an Excel workbook parser.

A robust XLSX parser would substantially increase the application payload and memory usage, which conflicts with the project's lightweight design and the iPhone 6 compatibility target.

For Excel or Numbers data:

1. open the workbook in the spreadsheet application;
2. export or save the relevant sheet as CSV or TSV;
3. import that file into FuelLog.

An optional on-demand XLSX import module may be considered in the future without making it part of the core application.

## Jerrycan backups

Select a `.jerrycan` backup in Settings → Import data. FuelLog decodes the binary
plist locally, including when offline; the file is never uploaded. Confirm the
source distance and volume units and choose a fuel, or leave the fuel unset.
Numeric Jerrycan unit/fuel codes are not interpreted automatically.

Choose a new vehicle or an existing vehicle. Repeat imports recognise a previously
imported source vehicle and skip matching records in that vehicle. Existing vehicle
metadata is preserved. Merge keeps existing data; Replace removes all local vehicles
and fill-ups, then creates the vehicle from the file. A final preview shows usable
records, full/partial fills, locations, date range, currency totals, duplicates,
invalid rows that will be excluded, and warnings. Cancel writes nothing. Writes
commit together; a failed import preserves the previous dataset.

Imported fields include station address/coordinates and Jerrycan station IDs,
urban-driving estimates, vehicle details, source metadata and original numeric
precision. Imported details appear in the edit forms. Editing another field retains
that metadata and the unchanged timestamp. The original binary-plist date value
is retained in source metadata, including precision beyond JavaScript milliseconds. Stations are not automatically assigned
an external provider ID. Placeholder VIN and conflicting transmission fields stay
in source metadata rather than becoming trusted vehicle facts.

Native plist dates represent UTC instants. Dates stored as timezone-free text
require an explicit UTC offset in minutes. Source units can be kilometres/miles
and litres/US gallons/imperial gallons; FuelLog normalizes to km and litres.

Currency is explicit on each fill-up. Legacy records default to EUR. Spending totals
and price charts separate currencies, without exchange-rate conversion. Jerrycan's
`PriceInDefaultCurr` is retained in the vehicle's default currency; if the source
unit price uses another currency, FuelLog derives the comparable unit price from
that total and preserves the foreign price in source metadata. Logged spending per
km remains purchases divided by logged distance, not a consumed-fuel cost measure.
Consumption uses completed full-to-full intervals and includes intervening partial
fills. Review warnings do not silently alter the history.

Full JSON backups use version 4 and retain nested metadata; versions 1–3 remain
importable. CSV exports include currency, station address/coordinates, Jerrycan
station ID and urban fraction, but omit nested source metadata and extended vehicle
metadata. Use JSON for a lossless backup. CSV now labels costs `total_cost` plus
`currency`; the older `total_cost_eur` import heading is still accepted.

## Maximum import size

Individual import files are currently limited to **5 MB**.

This is primarily to prevent excessive memory pressure on older devices such as the 1 GB iPhone 6.

For a very large history, split the input into several files and import them using **merge** mode.

## Column recognition

FuelLog recognises common aliases. Matching is intended to be forgiving rather than tied to one vendor's export layout.

### Date/time

Examples:

```text
date
datetime
timestamp
data
data_hora
datahora
```

### Odometer

```text
odometer
odometer_km
mileage
km
kms
quilometragem
conta_quilometros
```

### Litres

```text
litres
liters
litros
quantity
volume
combustivel_litros
```

### Total cost

```text
total_cost_eur
total_cost
total
cost
amount
custo
custo_total
preco_total
valor
```

### Unit fuel price

```text
price_per_litre
price_per_liter
price_l
unit_price
price
preco_litro
preco_por_litro
```

### Vehicle

```text
vehicle
vehicle_name
car
car_name
viatura
veiculo
```

### Fuel type

```text
fuel_type
fuel
combustivel
tipo_combustivel
```

### Station

```text
station
gas_station
fuel_station
posto
posto_abastecimento
```

### Full-tank indicator

```text
full_tank
full
tank_full
deposito_cheio
ateste
```

### Notes

```text
notes
note
comment
comments
notas
observacoes
```

### Record ID

```text
id
uuid
record_id
```

If an imported row contains a source ID, FuelLog preserves it as the fill-up ID where possible. Otherwise a new stable local ID is generated.

## Decimal comma

FuelLog accepts values such as:

```text
48,25
1,689
82,47
```

as well as decimal-point values.

## Missing total or price

When possible FuelLog derives one monetary value from the other:

```text
Total cost = litres * price per litre
```

or:

```text
Price per litre = total cost / litres
```

A usable generic record must ultimately contain:

- a valid date
- odometer
- litres greater than zero
- total cost, either supplied or derivable

Rows that cannot be interpreted are skipped. FuelLog shows the number of usable and skipped rows before continuing.

## Merge versus replace

When importing, FuelLog asks whether to replace or merge.

### Merge

Merge keeps existing local data and adds new records.

For generic imports, FuelLog uses this combination as a practical duplicate key:

```text
vehicle + date/time + odometer + litres + currency + total cost
```

If that combination already exists, the incoming row is skipped.

This is intentionally conservative and lightweight; it is not a universal semantic duplicate detector.

### Replace

Replace clears and writes the local vehicle and fill-up stores in one transaction,
after preview confirmation. A failed transaction preserves the previous dataset.

Use replace only when the imported file should become the authoritative local dataset.

**Create a JSON backup before replacing a database you care about.**

## Imported vehicles

When an imported record contains a vehicle name:

- FuelLog reuses an existing vehicle with the same name, ignoring case; or
- creates a new local vehicle for that name.

If the import has no vehicle name and no current vehicle can be used, FuelLog creates an `Imported vehicle` entry.

---

# FuelLog JSON backup format

A FuelLog backup has this general structure:

```json
{
  "format": "FuelLog",
  "version": 4,
  "exportedAt": "2026-10-06T18:00:00.000Z",
  "vehicles": [
    {
      "id": "...",
      "name": "My car",
      "registration": "",
      "make": "",
      "model": "",
      "fuelType": "Gasóleo simples",
      "initialOdometer": 0
    }
  ],
  "fillups": [
    {
      "id": "...",
      "vehicleId": "...",
      "date": "2026-10-06T17:30:00.000Z",
      "odometer": 123456,
      "litres": 45.2,
      "totalCost": 76.5,
      "currency": "EUR",
      "pricePerLitre": 1.692,
      "station": "Example station",
      "fuelType": "Gasóleo simples",
      "fullTank": true,
      "notes": ""
    }
  ],
  "promos": [
    {
      "id": "stable-id",
      "brand": "Example brand",
      "country": "PT",
      "type": "litre",
      "amount": 0.05,
      "fuelId": "",
      "validUntil": "",
      "notes": "",
      "cumulative": true
    }
  ],
  "settings": []
}
```

The format carries an explicit `version` field so future releases can migrate older backups if the schema evolves.

A FuelLog JSON backup should be preferred over manipulating internal IndexedDB data directly.

---

# CSV format

FuelLog's own CSV export contains these columns:

```text
id, date, vehicle, odometer_km, litres, total_cost, currency, price_per_litre,
full_tank, fuel_type, station, fuel_id, station_id, country, notes,
station_address, latitude, longitude, jerrycan_station_id, city_percentage
```

The actual file uses comma-separated headers. Nested import provenance and extended
vehicle details are preserved by JSON backups rather than CSV.

Example of a smaller generic CSV accepted by the importer:

```csv
id,date,vehicle,odometer_km,litres,total_cost,currency,price_per_litre,full_tank,fuel_type,station,notes
abc123,2026-10-06T17:30:00.000Z,My car,123456,45.2,76.50,EUR,1.692,true,Diesel B7,Example station,
```

Fields that require quoting are escaped using normal CSV rules.

---

# Fuel price providers

FuelLog uses public, official fuel-price sources through a provider registry (`js/prices/providers.js`). Provider code lives under `js/prices/providers/`.

| Country | Provider | Kind |
|---|---|---|
| PT | DGEG | station prices |
| ES | Minetur/MITECO Geoportal Gasolineras | station prices |
| FR | data.economie.gouv.fr (flux instantané) | station prices |
| BE | FPS Economy / Statbel | official maximum prices |
| NL | CBS (80416ned) | national average prices |

Every price shown carries provenance (provider, price type, source update time) and a staleness marker when cached data is used. Provider endpoints, licences, cache TTLs and the canonical fuel mapping are documented in [docs/PROVIDERS.md](docs/PROVIDERS.md); the full design handover is in [docs/FuelLog-Devin-European-Providers-Handover.md](docs/FuelLog-Devin-European-Providers-Handover.md).

## When providers are contacted

Providers are contacted only when the user opens/uses the price feature and an appropriate locally cached result is unavailable or expired. Belgium/Netherlands reference prices are fetched when the Prices page is opened for those countries.

Normal fuel logging never contacts a price provider.

## Location

FuelLog can ask the browser for location when distance/radius filtering is requested.

Location permission belongs to the browser/operating system. When the station proxy is enabled (Portugal/Spain station searches), the browser POSTs the location (rounded to about 100 m) to the site's own `api/stations.php`; the coordinates are never stored there. In France, the rounded coordinates are sent directly to data.economie.gouv.fr as part of the radius query. With the proxy disabled, the location stays in the browser and is used only for local distance calculations (Portugal/Spain direct mode). Belgium/Netherlands reference prices use no location at all.

## Station proxy

`api/stations.php` is an optional, dependency-free PHP 7.4+ endpoint intended for the DreamHost deployment. It is enabled by default via `stationProxy` in `config.js`; set it to `null` for a purely static host such as GitHub Pages.

The proxy serves the Portuguese (`pt-dgeg`, one file per fuel type) and Spanish (`es-minetur`, a single ~10 MB nationwide dataset refreshed hourly on the server) providers. It fetches the upstream data at most once per hour, stores it in `api/cache/` as a 0.1° grid index, and answers `POST {provider, fuel, lat, lon, radius}` queries with the stations inside the radius. Phones therefore download only nearby stations instead of a multi-megabyte nationwide response. It accepts only same-origin POST requests, is not an open relay (the upstream URL is fixed and the only parameters are fuel, coordinates and radius), and never logs or persists the request coordinates. If the proxy fails, the app warns and falls back to querying the provider directly (where a direct mode exists).

## Price accuracy

External price information can be delayed, unavailable or incorrect. Always confirm the actual price displayed at the station/pump before purchasing fuel.

## Non-commercial use

This project is intended for personal/non-commercial use. External fuel-price data remains subject to each provider's own conditions and licence and is not covered by FuelLog's MIT licence.

---

# Offline behaviour and caching

FuelLog has two distinct cache mechanisms.

## Service Worker cache

The service worker stores the application shell, including first-party resources such as:

- HTML
- JavaScript
- CSS
- manifest
- icons

This allows the installed application to start and perform core logging while offline.

The service worker deliberately does not treat external provider responses as ordinary application-shell assets.

## IndexedDB provider cache

Provider data is cached explicitly inside IndexedDB where FuelLog can apply purpose-specific freshness rules.

Current policy:

- station-search results: **15 minutes**
- fuel-type/region catalogues: **30 days**
- Belgium reference prices: **6 hours**; Netherlands reference prices: **24 hours**

If a current cache exists, repeated searches reuse it instead of contacting the provider again.

If the network request fails and older cached data exists, FuelLog may use that cached response as a fallback and identifies stale results in the interface.

## Prices map (offline)

The Prices page uses a full-screen map with a bottom sheet for filters and results.

- **Bundled low-zoom tiles** (`assets/map-tiles/`, z5–z7) ship with the app so a coarse map works offline after install.
- **IndexedDB `mapTiles`** stores tiles fetched while online, per chosen map style (LRU cap ~32 MB). On the Prices map, a control lets you pick the online provider (default OpenTopoMap; optional OpenStreetMap street maps). Offline mode uses bundled terrain tiles plus cache. Avoid `tile.openstreetmap.org` for bulk/automated traffic; the optional osm.org style is user-initiated only.
- **`searchArchive:*` entries** in `priceCache` keep the last station searches (up to 20 snapshots, 7-day TTL, 500 stations each) plus `settings.lastPriceSearch` for reopening the Prices page offline.

Regenerate bundled tiles after changing coverage:

```bash
node scripts/generate-low-zoom-tiles.mjs
```

---

# iPhone 6 / iOS 12 support

The compatibility floor is intentionally old:

**iPhone 6 running iOS 12.5.7 / Safari 12.**

This matters because many modern JavaScript conveniences are not supported there.

FuelLog therefore avoids requiring features such as:

- optional chaining (`?.`)
- nullish coalescing (`??`)
- `Array.prototype.at()`
- `String.prototype.replaceAll()`
- `File.text()`
- mandatory `crypto.randomUUID()`

The application includes alternative code paths instead of requiring a transpiler or compatibility framework.

## Memory-conscious behaviour

An iPhone 6 has much less memory than a current phone. FuelLog therefore:

- limits imported files to 5 MB
- avoids a bundled XLSX engine
- avoids large third-party frameworks
- limits displayed station results
- requires a region for station searches in direct mode (Portugal on legacy iOS, Spain always; never when the proxy is used)

The region requirement prevents the old phone from unnecessarily processing a nationwide response containing thousands of stations.

See [COMPATIBILITY.md](COMPATIBILITY.md) for the focused compatibility notes.

---

# Browser compatibility

| Platform | Expected status | Notes |
|---|---|---|
| iPhone 6 / iOS 12.5.7 Safari | Primary compatibility floor | Manual Add to Home Screen; old-iOS export fallback |
| Current iOS Safari | Supported | Modern PWA behaviour varies by iOS release |
| Current Android Chrome | Supported | Installable PWA |
| Current desktop Chrome | Supported | Installable PWA |
| Current desktop Edge | Supported | Installable PWA |
| Current Firefox | Core web app expected | PWA installation capabilities differ by platform |
| Safari on macOS | Core web app expected | Installation depends on macOS/Safari release |

Because FuelLog deliberately supports a very old Safari engine, code changes should be checked carefully before introducing newer JavaScript syntax.

---

# Deployment

## DreamHost

FuelLog is intended to be served from:

```text
https://fuel.trekm.com/
```

Deployment is simply a static-file upload.

1. Configure the `fuel.trekm.com` subdomain in DreamHost.
2. Enable HTTPS, normally using DreamHost's Let's Encrypt support.
3. Upload the repository contents to that domain's document root.
4. Open the site in a browser.
5. Verify that the service worker registers and the app works after going offline.

There is:

- no build step
- no SQL database
- no scheduled job
- no secret configuration

`api/stations.php` requires PHP 7.4+, which DreamHost provides; the rest of the application needs no server runtime. For GitHub Pages (or any static-only host), set `stationProxy: null` in `config.js` and the app queries each provider directly.

## `.htaccess`

The repository includes an Apache `.htaccess` with security and caching directives suitable for the DreamHost deployment.

The optional Apache modules are guarded so the application still works if a module is unavailable.

## GitHub Pages

Because FuelLog is otherwise static, GitHub Pages can also host it — with `stationProxy: null` in `config.js`, since Pages cannot run the optional PHP proxy.

For the intended deployment, DreamHost can remain the canonical `fuel.trekm.com` site while GitHub serves as the public source repository.

A future workflow could deploy automatically from GitHub, but automatic deployment is not required by the application itself.

---

# Development

FuelLog intentionally has **no build system**.

The checked-in files are the application that the server serves.

## Run locally

Service workers require HTTP(S), so do not rely on opening `index.html` directly using `file://`.

From the repository directory:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

Browsers normally treat localhost as a secure-enough context for development features. Real deployment should use HTTPS.

## Publishing the repository

Example initial GitHub setup:

```bash
git init
git add .
git commit -m "Initial FuelLog PWA"
git branch -M main
git remote add origin git@github.com:YOUR-USER/fuellog.git
git push -u origin main
```

Do not commit deployment credentials or unrelated server files into the repository.

## Dependency philosophy

The core application currently uses a single runtime third-party JavaScript dependency: a locally vendored copy of Leaflet 1.9.4 (`vendor/leaflet/`) that powers the optional station map. Everything else is dependency-free.

This minimalism is intentional. Before introducing a dependency, consider:

- download size
- parse/execution cost on old devices
- iOS 12 compatibility
- offline availability
- privacy impact
- supply-chain/security implications
- whether the dependency is needed during every application start

For large optional functionality, prefer an explicit optional/on-demand mechanism rather than permanently increasing the base PWA payload.

---

# Repository structure

```text
.
|-- index.html                 main application HTML
|-- app.js                     UI, calculations, import/export and price-search logic
|-- db.js                      IndexedDB wrapper
|-- config.js                  runtime/static configuration
|-- styles.css                 application styling and old-Safari fallbacks
|-- sw.js                      service worker / offline app shell
|-- manifest.webmanifest       PWA metadata
|-- .htaccess                  DreamHost/Apache headers and caching
|
|-- api/
|   |-- stations.php           optional same-origin radius-search proxy (PT/ES datasets)
|   `-- cache/                 server-side station grid-index cache (denied via .htaccess)
|
|-- js/
|   `-- prices/               fuel catalogue and provider registry
|       |-- fuels.js          canonical fuel ids and multilingual name matching
|       |-- providers.js      provider registry and shared helpers
|       |-- promos.js         brand-promo matching and effective-price helpers
|       `-- providers/        pt-dgeg, es-minetur, fr-government, be-fps, nl-cbs
|
|-- docs/
|   |-- PROVIDERS.md          provider architecture, licences and data flows
|   `-- FuelLog-Devin-European-Providers-Handover.md  design handover notes
|
|-- vendor/
|   `-- leaflet/              vendored Leaflet 1.9.4 for the station map
|
|-- icons/
|   |-- icon.svg               source/vector application artwork
|   |-- icon-192.png           PWA icon
|   |-- icon-512.png           PWA icon
|   `-- apple-touch-icon.png   iOS Home Screen icon
|
|-- README.md                  main project and user documentation
|-- CHANGELOG.md               notable project changes
|-- COMPATIBILITY.md           old-device/browser compatibility notes
|-- PRIVACY.md                 privacy model
|-- SECURITY.md                security policy/guidance
|-- CONTRIBUTING.md            contribution notes
|-- REVIEW.md                  public-release architectural review
|-- LICENSE                    MIT licence
|-- .gitignore
`-- .github/                   repository automation/checks
```

---

# Data model

FuelLog uses an IndexedDB database named:

```text
FuelLogDB
```

Current database version:

```text
3
```

It contains six object stores.

## `vehicles`

Key:

```text
id
```

Typical object:

```json
{
  "id": "stable-id",
  "name": "My car",
  "registration": "",
  "make": "",
  "model": "",
  "fuelType": "Gasóleo simples",
  "initialOdometer": 0
}
```

## `fillups`

Key:

```text
id
```

Indexes:

```text
date
vehicleId
```

Typical object:

```json
{
  "id": "stable-id",
  "vehicleId": "vehicle-id",
  "date": "2026-10-06T17:30:00.000Z",
  "odometer": 123456,
  "litres": 45.2,
  "totalCost": 76.5,
  "pricePerLitre": 1.692,
  "station": "Example station",
  "fuelType": "Gasóleo simples",
  "fullTank": true,
  "notes": ""
}
```

## `settings`

Key:

```text
key
```

Used for lightweight application settings such as the active vehicle, preferred fuel selections and backup metadata.

## `priceCache`

Key:

```text
key
```

Stores timestamped external reference/search results so repeated provider requests can be avoided. Keys prefixed with `searchArchive:` hold longer-lived station search snapshots for offline use.

## `mapTiles`

Key:

```text
z/x/y
```

Stores PNG blobs for map tiles fetched while online (LRU eviction, ~32 MB cap).

## `promos`

Key:

```text
id
```

Stores user-defined brand promotions. Typical object:

```json
{
  "id": "stable-id",
  "brand": "Example brand",
  "country": "PT",
  "type": "litre",
  "amount": 0.05,
  "fuelId": "DIESEL_B7",
  "validUntil": "2026-12-31",
  "notes": "",
  "active": true,
  "cumulative": true,
  "updatedAt": "2026-10-07T08:00:00.000Z"
}
```

`type` is `litre` (discount per litre) or `fill` (fixed discount per fill-up). Empty `country`/`fuelId` mean the promo applies to all countries/fuels. `cumulative: false` marks an exclusive promo. A missing `cumulative` field means the promo stacks with other cumulative promos.

---

# Security

FuelLog has a small attack surface because it has no account system and no application backend.

The repository nevertheless includes several protective measures:

- HTTPS expected in production
- Content Security Policy in the DreamHost configuration
- frame/clickjacking protection
- restrictive referrer policy
- permissions restrictions
- no third-party runtime scripts
- no embedded API secret
- output escaping for displayed user/imported text

See [SECURITY.md](SECURITY.md).

If you find a vulnerability, follow the reporting guidance there rather than publishing sensitive exploitation details immediately.

---

# Troubleshooting

## The application does not install on iPhone 6

Use Safari and install manually:

**Share → Add to Home Screen**

There is no automatic Chromium-style install prompt on iOS 12.

## My data disappeared

FuelLog stores its database inside browser/site storage. Data can disappear if:

- Safari/browser website data is cleared
- the browser profile is reset
- the application/site storage is manually deleted
- the operating system/browser removes site data
- the device is lost or restored without that site data

Restore the most recent FuelLog JSON backup.

## Import says there are no usable records

Check that the file contains recognizable columns for:

- date
- odometer
- litres
- total cost or a usable price per litre

If a spreadsheet uses an unusual proprietary heading, rename columns to one of the aliases documented above and save again as CSV/TSV.

## European CSV imports incorrectly

Try a semicolon-separated CSV export from the spreadsheet application. FuelLog automatically detects comma, semicolon and tab delimiters and accepts decimal commas.

## A duplicate was imported

Generic duplicate detection uses:

```text
vehicle + date + odometer + litres
```

Two genuinely different transactions that share all four values cannot be reliably distinguished by this lightweight heuristic. Conversely, changing one of these values may make an otherwise duplicated event look unique.

FuelLog JSON backups preserve stable IDs and are preferable for exact restoration.

## Price search does not work

Possible causes include:

- no internet connection
- temporary provider service outage
- provider API change
- browser cross-origin policy change
- location permission denied when a radius search needs location
- no district selected on iOS 12

Cached price data may remain usable if FuelLog has a previous response.

## Prices look old

Price results are cached for a short period to reduce network traffic. FuelLog also cannot guarantee the timeliness or accuracy of an external source. Verify the price at the station.

## Export does not download on iOS 12

FuelLog uses a fallback that opens the generated export in Safari. Use the **Share** sheet to save or copy the result.

## The PWA still shows an old version after deployment

A service worker may still have cached the previous application shell.

Typical recovery steps are:

1. close all FuelLog windows;
2. reopen the application while online;
3. reload it;
4. if necessary, remove/re-add the Home Screen app or clear only the application cache with care.

**Do not clear all site data without first exporting a backup**, because IndexedDB contains the user's fuel records.

---

# Backup recommendations

FuelLog intentionally has no automatic cloud copy. A sensible routine is therefore:

- export a JSON backup after substantial data entry;
- export before replacing data during an import;
- export before clearing browser/site data;
- export before major operating-system/browser changes;
- keep backup copies somewhere independent from the phone.

Examples include a computer, external drive, personal cloud storage, email to yourself, AirDrop or another location chosen by the user.

FuelLog does not automatically upload backups anywhere.

---

# Known limitations

- No automatic cross-device synchronisation
- No account recovery because there are no accounts
- No server-side backup
- Clearing browser/site storage can delete the local database
- XLS/XLSX import is not bundled
- Generic import duplicate detection is heuristic rather than semantic
- Fuel costs are supported; maintenance/insurance/tolls are not yet part of the data model
- provider availability and API compatibility are outside FuelLog's control
- Belgium and the Netherlands currently expose only reference prices (no public station list)
- Old iOS export requires the Safari Share-sheet workaround
- Very large imports are intentionally limited to protect low-memory devices

These limitations are mostly direct consequences of the local-first, very-low-server-load and iPhone-6-compatible design goals.

---

# Possible future work

Potential enhancements that can remain consistent with the project's architecture include:

- optional XLSX importer loaded only when requested
- import preview with explicit column mapping
- more sophisticated duplicate-review screen
- additional European public fuel-price providers behind the existing provider interface (e.g. the EU Oil Bulletin)
- station favourites
- effective-cost comparison including fuel used to reach a station
- richer charts that remain lightweight on old phones
- maintenance and vehicle-expense records
- configurable units for markets using miles/gallons
- optional encrypted backup files
- a backup-age reminder stored locally
- optional GitHub-to-DreamHost deployment automation

Any new feature should continue to favour local processing and avoid turning `fuel.trekm.com` into a high-load application backend.

---

# Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

In particular, changes should preserve:

- local-first storage
- low hosting load
- no tracking
- small static payload
- offline core operation
- iPhone 6 / iOS 12.5.7 compatibility unless the compatibility policy is deliberately changed

---

# Related documentation

- [COMPATIBILITY.md](COMPATIBILITY.md) — old Safari/iPhone requirements and fallbacks
- [PRIVACY.md](PRIVACY.md) — privacy behaviour
- [SECURITY.md](SECURITY.md) — security notes and reporting
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution guidelines
- [REVIEW.md](REVIEW.md) — public-release architecture review
- [CHANGELOG.md](CHANGELOG.md) — notable project changes

---

# License

FuelLog application source code and original FuelLog artwork are released under the **MIT License**. See [LICENSE](LICENSE).

External provider data is not part of the repository and remains subject to each provider's terms and conditions.
