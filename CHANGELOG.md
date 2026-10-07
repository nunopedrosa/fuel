# Changelog

## Unreleased

### Features

- Added an optional same-origin PHP proxy (`api/stations.php`) that caches DGEG station lists per fuel type for one hour and answers radius searches, so clients download only nearby stations.

- Added a Map tab to the Prices page showing matching stations and the user's location on an OpenStreetMap/Leaflet map.
- Added a "Search this area" button on the map that re-runs the station search around the current map centre, and a centre-on-me button that recentres the map on the user's location.
- Vendored Leaflet 1.9.4 locally (`vendor/leaflet/`); the List tab still works offline from cached results.

- Added a multi-country fuel-price provider architecture: station prices for Portugal (DGEG), Spain (Minetur/MITECO) and France (data.economie.gouv.fr); official maximum prices for Belgium (FPS Economy/Statbel) and national averages for the Netherlands (CBS).
- Added a canonical fuel catalogue (`FuelLogFuels`) with multilingual name matching, plus a one-time data migration that tags vehicles and fill-ups with canonical fuel ids.
- Added per-price provenance (provider, price type, source update time) and stale-data labels.
- Added the user's own fill-up history as a private local price source ("You paid … here") and a "Log fill-up" action on station cards and map popups.
- The station proxy now also serves the Spanish nationwide dataset (~10 MB, refreshed hourly server-side).
- Added user-defined brand promos (Settings → Brand promos): per-litre or per-fill discounts matched to a station's brand. Matching stations show an effective price with the original struck through plus a promo badge, and results are sorted by effective price; per-fill discounts are converted using a configurable typical fill size. Promos are stored in a new `promos` IndexedDB store (schema v2) and included in JSON backups.

### Documentation

- Added `docs/PROVIDERS.md` describing the provider architecture, licences, cache TTLs, data sent per provider, and the public-data-only policy; moved the providers design handover into `docs/`.
- Expanded `README.md` into the primary project and user manual.
- Documented installation on iPhone 6, current mobile platforms and desktop.
- Documented local-first architecture, IndexedDB stores and offline behaviour.
- Documented full/partial-tank consumption calculations.
- Documented JSON backup and CSV export behaviour.
- Added detailed generic import formats, aliases, merge/replace semantics and duplicate handling.
- Documented provider caching and old-iOS station-search constraints.
- Added deployment, development, security, troubleshooting, backup and limitation sections.

### Compatibility baseline

- iPhone 6 / iOS 12.5.7 remains the minimum compatibility target.
- Core application remains dependency-free and requires no build step or backend.
