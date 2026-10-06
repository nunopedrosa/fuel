# Changelog

## Unreleased

### Features

- Added a Map tab to the Prices page showing matching stations and the user's location on an OpenStreetMap/Leaflet map.
- Added a "Search this area" button on the map that re-runs the station search around the current map centre.
- Vendored Leaflet 1.9.4 locally (`vendor/leaflet/`); the List tab still works offline from cached results.

### Documentation

- Expanded `README.md` into the primary project and user manual.
- Documented installation on iPhone 6, current mobile platforms and desktop.
- Documented local-first architecture, IndexedDB stores and offline behaviour.
- Documented full/partial-tank consumption calculations.
- Documented JSON backup and CSV export behaviour.
- Added detailed generic import formats, aliases, merge/replace semantics and duplicate handling.
- Documented DGEG caching and old-iOS station-search constraints.
- Added deployment, development, security, troubleshooting, backup and limitation sections.

### Compatibility baseline

- iPhone 6 / iOS 12.5.7 remains the minimum compatibility target.
- Core application remains dependency-free and requires no build step or backend.
