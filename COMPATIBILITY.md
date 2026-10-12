# Compatibility

FuelLog is intentionally written without a build step. Leaflet 1.9.4 (`vendor/leaflet/`) is vendored locally for the station map, and Tesseract 5.1.1 (`vendor/tesseract/`) is lazy-loaded for optional receipt OCR. Low-zoom map tiles are bundled; higher zoom uses OpenStreetMap when online and may be cached in IndexedDB. The Prices bottom sheet and last search archive continue to work offline from cached results.

## Minimum target

The compatibility floor is **iPhone 6 running iOS 12.5.7 / Safari 12**.

The application therefore avoids JavaScript syntax and APIs that would prevent iOS 12 from loading the app, including optional chaining, nullish coalescing, `Array.prototype.at`, `String.prototype.replaceAll`, `File.text()` and required use of `crypto.randomUUID()`.

FuelLog relies on capabilities available on that target:

- IndexedDB for local records
- Service Workers for the offline app shell (supported by iOS from 11.3)
- Fetch for optional fuel-price provider requests
- File input for importing backups/data files
- Apple `apple-mobile-web-app-*` metadata and a 180x180 touch icon for Add to Home Screen

## Old-iPhone accommodations

- Imports are capped at 5 MB per file to avoid excessive memory pressure. Larger histories can be split and merged in several imports.
- Station-price search requires choosing a region before downloading results when the response would be nationwide: Portugal in direct mode on legacy iOS, and Spain always in direct mode (proxy disabled or unavailable). With the proxy enabled, only nearby stations are downloaded and no region is needed. This avoids loading several thousand stations into a 1 GB device.
- Generated-file downloads use an iOS 12 fallback. The export is opened locally in Safari and can be saved/copied using the Share sheet.
- CSS includes fallbacks for missing flex-gap and prefixes `backdrop-filter`.
- Shared `.field` inputs, selects and textareas use 16 px editing text, including
  receipt review dialogs, to retain the iPhone focus-zoom protection. The compact
  fill-up form also uses 16 px controls. The viewport keeps user pinch zoom enabled.
- Prices map uses an absolute-fill Leaflet container (Safari 12 flex + `height:100%` otherwise leaves a zero-height map). On iOS 12, hybrid tile layers omit `crossOrigin` on tiles; if the custom layer fails, OpenStreetMap.de tiles are used as a fallback.

The optional urban-driving input uses a native range slider (0–100%) and checkbox,
with a 44 px touch area and text labels. It requires no new browser APIs or runtime
dependencies and is included in the offline app shell.

Receipt scanning uses a file input that supports camera capture and photo-library
selection. OCR is lazy-loaded into one Web Worker, the image is limited to 8 MB
and downscaled to a 1280 px longest edge before recognition, and the worker is
terminated after each scan. The local worker/core are cached after first use; the
engine/core are pinned to 5.1.1 to avoid the 7.0.0 core's optional chaining and
BigInt typed arrays. A direct same-origin worker uses the separate CSP in
`vendor/tesseract/.htaccess`; WebAssembly evaluation and the language download
are permitted inside that worker, while the page retains its strict script CSP.
Portuguese language model is cached by Tesseract in IndexedDB after its first
online download. Offline scanning requires that first download to have completed.
The notes clear button uses a native button with a 44 px touch target and a
plain CSS circle; its heading uses flex layout without requiring flex-gap.
Commercial fuel matching uses a small local set of regular expressions and checks
at most one adjacent line per product; it adds no runtime dependency or network request.
The iPhone 6 has limited memory, so OCR may be slow or fail on large/unclear
photos; users can still enter a fill-up manually. This code path needs physical
Safari 12 and Home Screen testing before compatibility can be confirmed.

The analysis explorer uses ordinary SVG, native range inputs, click/touch taps,
keyboard inspection and a custom accessible expanded dialog. Zoom buttons avoid
requiring pinch or modern Pointer Events. Chart output is capped at 160 observations
and monthly aggregation at 60 buckets; exact summaries retain all eligible records.
Date/number labels are formatted only after sampling. Reduced-motion preferences
disable brief chart transitions. New analysis scripts are cached for offline use.
Modern Chromium verification does not establish Safari 12 or Home Screen support.

## Install on iPhone 6

1. Open the HTTPS site in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Launch FuelLog from the new Home Screen icon.

The `beforeinstallprompt` event used by Chromium is not available in iOS 12; this manual Safari workflow is expected.

## Import formats

FuelLog can import:

- Jerrycan binary-plist backups decoded on-device
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

## Jerrycan import compatibility

The import file input intentionally has no `accept` filter. Mobile document pickers
can exclude custom extensions such as `.jerrycan` even when they appear in the
filter. Select the backup using Browse/Files; FuelLog validates its contents and
size after selection. An unrestricted picker does not add support for new formats.

The binary reader uses FileReader, ArrayBuffer and DataView; it does not require
BigInt, `File.text()` or a server. Decoding is bounded by the 5 MB input limit,
100,000 objects, 64 levels of nesting and a 16 MB decoded allocation budget.
Duplicate/overlapping object offsets are rejected. Import previews scroll within the screen
on narrow phones. New decoder/data modules are included in the offline app shell.
Source-unit and fuel confirmation avoids assuming undocumented Jerrycan enums.
Static checks and modern-browser tests do not establish physical iPhone 6 support;
actual Safari 12 and Home Screen testing must be reported separately.

## Language selection and symbol controls

English and European Portuguese use small local JavaScript catalogues in
`js/i18n/`, cached with the app shell. Translation lookup and interpolation need
no runtime dependency or new browser API. `Intl` uses explicit `en-GB`/`pt-PT`
locales for displayed dates/numbers; date entry keeps its documented format.
The header flag opens native language buttons, supports keyboard dismissal, and
retains 44 px targets at 320/375 px widths. Search, edit and expand controls use
inline SVG with translated names; consequential actions keep text. Language
switching preserves unsaved forms and imported numeric precision.
Chromium checks cover narrow touch layouts and offline persistence. Safari 12,
a physical iPhone 6 and installed Home Screen behavior remain unverified.

## Coherent release updates

The worker uses the existing Cache Storage, Fetch/Request and client-message APIs.
Fresh `cache: 'reload'` precache requests bypass stale HTTP responses; release
markers are checked as text before activation. The installed HTML and versioned
scripts stay together offline. Update waiting/active worker checks use ordinary
message/statechange listeners with bounded timeouts, including activation of an
already downloaded update while offline. No IndexedDB store/schema changes or
runtime dependencies are involved. Regression tests include an existing v41
installation and a poisoned v42 cache, rather than only a fresh profile. Actual
Safari 12 and physical iPhone 6/Home Screen upgrade behavior remain unverified.

## Storage indicator

Settings shows a serialized UTF-8 log-size estimate using the Safari-12-compatible
Blob API, measuring records individually to limit temporary memory. It includes
all saved settings and preserves imported metadata in the estimate. Optional
`navigator.storage.estimate()` is feature-detected; Safari 12 and failed or invalid
responses show **Available capacity unknown**. Browser totals include same-origin
caches and other storage. Remaining capacity and additional-fill-up counts are
estimates, excluding database overhead from average record size; they are not
guaranteed writable space. No storage probe writes or new dependencies are used.

Device-language defaults use `navigator.languages` when available and fall back
to `navigator.language`, matching regional tags to the bundled language catalogue.
Detection is local and needs no new API, dependency or network request. Saved app
choices override device settings; selecting the current language also persists a
choice. Chromium covers changed device preferences and offline persistence; the
Safari 12 / physical iPhone 6 limitations above still apply.
