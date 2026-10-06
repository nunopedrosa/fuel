# Compatibility

FuelLog is intentionally written without a build step. The only runtime JavaScript dependency is a locally vendored copy of Leaflet 1.9.4 (`vendor/leaflet/`) used for the station map on the Prices page. Map tiles come from OpenStreetMap and require connectivity; the map is optional and the List tab continues to work offline from cached results.

## Minimum target

The compatibility floor is **iPhone 6 running iOS 12.5.7 / Safari 12**.

The application therefore avoids JavaScript syntax and APIs that would prevent iOS 12 from loading the app, including optional chaining, nullish coalescing, `Array.prototype.at`, `String.prototype.replaceAll`, `File.text()` and required use of `crypto.randomUUID()`.

FuelLog relies on capabilities available on that target:

- IndexedDB for local records
- Service Workers for the offline app shell (supported by iOS from 11.3)
- Fetch for optional DGEG requests
- File input for importing backups/data files
- Apple `apple-mobile-web-app-*` metadata and a 180x180 touch icon for Add to Home Screen

## Old-iPhone accommodations

- Imports are capped at 5 MB per file to avoid excessive memory pressure. Larger histories can be split and merged in several imports.
- On iOS 12, station-price search requires a DGEG district before downloading results. This avoids loading several thousand Portuguese stations into a 1 GB device.
- Generated-file downloads use an iOS 12 fallback. The export is opened locally in Safari and can be saved/copied using the Share sheet.
- CSS includes fallbacks for missing flex-gap and prefixes `backdrop-filter`.

## Install on iPhone 6

1. Open the HTTPS site in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Launch FuelLog from the new Home Screen icon.

The `beforeinstallprompt` event used by Chromium is not available in iOS 12; this manual Safari workflow is expected.

## Import formats

FuelLog can import:

- FuelLog JSON backups
- Generic JSON arrays of fuel records
- JSON objects containing `fillups`, `records`, `entries`, or `data` arrays
- CSV
- semicolon-separated CSV, common in Portuguese/European Excel exports
- TSV
- delimited TXT

The delimited importer auto-detects comma, semicolon, or tab separators, accepts decimal comma or decimal point, and recognizes common English and Portuguese headings.

Examples include `date` / `data`, `odometer` / `quilometragem`, `litres` / `litros`, `cost` / `custo`, `price_per_litre` / `preco_litro`, `station` / `posto`, and `vehicle` / `viatura`.

XLS/XLSX is deliberately not bundled in the core PWA. A robust XLSX parser would substantially increase the static payload and memory use on the iPhone 6. Exporting the spreadsheet as CSV/TSV before import preserves the lightweight/offline-first design.
