# Code and documentation review

Reviewed on 12 October 2026 against the checked-in implementation. This is a
focused architecture/documentation review and automated regression run, not a
security certification or proof of device compatibility.

## Current architecture

- Static PWA with no build step. Core records live in IndexedDB (`FuelLogDB`,
  version 3); JSON backup version 4 retains vehicles, fill-ups, promos and settings.
- Leaflet 1.9.4 is vendored for maps. Tesseract.js/core 5.1.1 is loaded only for
  receipt scanning; images stay local and the Portuguese model downloads on first
  use. Inter fonts are bundled. The app is not free of third-party dependencies.
- The checked-in configuration enables the optional PT/ES station proxy.
  `api/stations.php` and `api/stations-functions.php` cache public datasets and
  answer bounded radius searches. Static-only hosts must disable this endpoint.
- Prices can fetch catalogues, reference prices and map tiles on opening the
  page. Station searches require an action. Network boundaries are described in
  [PRIVACY.md](PRIVACY.md); ordinary logging does not require a price provider.
- Shared full-to-full interval calculations exclude a trailing partial fill from
  consumption while retaining it in purchase views. Imported source flags and
  metadata remain available for diagnosis; see [docs/ANALYSIS.md](docs/ANALYSIS.md).
- Releases coordinate HTML, app, config and service-worker markers. A complete
  shell is downloaded and checked before activation; deploy the worker last.
  See [docs/UPDATES.md](docs/UPDATES.md).

## Findings reflected in documentation

- Release instructions previously mentioned only worker/config markers. They now
  include app/HTML markers and versioned asset URLs.
- The README file tree and dependency claims omitted analysis, languages,
  import modules, OCR and the PHP helper. The code map also pointed generic import
  persistence at an unused vehicle helper; imports actually stage records before
  `commitImport`.
- Generic duplicate keys include currency and total cost. Native backup merge
  uses local IDs, preserves distinct IDs and remaps conflicts; it is not an edited
  history reconciliation service.
- Backup replacement upserts settings rather than clearing the settings store.
  Keys absent from the backup remain local, including an existing language choice.
  JSON excludes provider caches, map tiles and OCR assets.
- Only the bundled tile manifest is precached at install. Tile PNGs are cached
  on request, so installation alone does not guarantee offline map coverage.
  IndexedDB tile eviction uses oldest write timestamps, not least recent reads.
- The proxy rejects a different hostname in a supplied Origin header, but accepts
  requests without Origin. That check is not authentication or rate limiting.
  The application does not persist search coordinates; hosting request-body
  logging remains a deployment concern.

## Verification and limits

All 21 `scripts/check-*.js` regressions passed, covering calculations, imports,
atomic writes, metadata, providers, receipts, languages, storage and updates.
JavaScript syntax, the CI incompatible-syntax/API scan, manifest JSON, approved
PHP file inventory, both PHP lints and the station-proxy regression also passed.
Local checks used Node 22.23.1 and PHP 8.5.10; PHP 7.4 was not exercised locally.
See [docs/TESTING.md](docs/TESTING.md) for repeatable commands.

This pass changes documentation only. No browser automation, live-provider calls,
Apache deployment checks or physical-device tests were run. Safari 12, a physical
iPhone 6 and installed Home Screen behaviour were unavailable. Provider terms and
live endpoint availability were not independently revalidated. Historical design
plans remain historical; focused guides and code describe current behaviour.
