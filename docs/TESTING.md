# Testing and regression checks

FuelLog has no unit-test framework. Behaviour is guarded by Node and PHP scripts under
`scripts/`, plus static checks in [`.github/workflows/check.yml`](../.github/workflows/check.yml).

Run the automated baseline from the repository root (Node, Python 3 and PHP required):

```bash
set -e
for f in app.js db.js config.js sw.js; do node --check "$f"; done
find js -name '*.js' -exec node --check {} \;
! grep -rnE "[A-Za-z_\]\)]\?\.[A-Za-z_\[]|\?\?|\.at\(|replaceAll|Object\.fromEntries" app.js db.js sw.js config.js js/
for f in scripts/check-*.js; do node "$f"; done
python3 -m json.tool manifest.webmanifest >/dev/null
php -l api/stations.php
php -l api/stations-functions.php
php scripts/check-stations.php
```

CI uses Node 22 and PHP 7.4 and additionally checks that only the two proxy PHP
files and `scripts/check-stations.php` exist. The syntax/API scan is a targeted
guard, not a complete Safari compatibility check. Vendored engines need separate
compatibility review. The optional browser scripts below are not part of CI.

| Script | Focus |
| --- | --- |
| `check-data.js` | `FuelLogData` intervals, currency, warnings |
| `check-bplist.js` | Binary plist decoder limits and edge cases |
| `check-jerrycan.js` | Jerrycan normalize and fixtures |
| `check-import-transaction.js` | `FuelDB.commitImport` atomicity |
| `check-import-flow.js` | CSV/generic import, merge duplicates, Jerrycan batch |
| `check-import-backup.js` | JSON backup merge/replace, `extractRowsFromJson` |
| `check-urban-profile.js` | Optional urban slider, imported precision, clearing and estimate provenance |
| `check-decimal-input.js` | Decimal comma and point entry, one decimal point, and text fields with a decimal keyboard |
| `check-analysis.js` | Period boundaries, weighted summaries/trends, currency fallback, urban coverage and bounded sampling |
| `check-analysis-ui.js` | Explorer controls, safe SVG, single observations, date-sized monthly bars and bounded label formatting |
| `check-calc.js` | `calcMetrics`, `calcRecentMetrics`, dashboard hero mileage, parsers (`flexDate`, `parseDelimited`, …) |
| `check-migrate.js` | `migrateData` and schema settings |
| `check-providers.js` | All EU adapters (fixtures), registry and proxy contract |
| `check-storage.js` | UTF-8 log/metadata sizes, browser quota and remaining space, missing/failed/invalid estimates, empty logs and translations |
| `check-device-language.js` | Device preference order, regional matching, older-browser fallback, manual/current-language lock and country independence |
| `check-i18n.js` | Language keys/placeholders, fallback, diagnostics, locale formatting, user text and canonical CSV stability |
| `check-sw-assets.js` | Asset files, exact release query URLs and HTML/config/app/worker markers |
| `check-splash.js` | iOS startup-image links, PNG sizes and portrait media queries |
| `check-sw-update.js` | Fresh precache, coherent navigation, update metadata, worker replies and rejected incomplete releases |
| `check-app-update.js` | Worker lifecycle, offline activation, stale-page reload and failed-install feedback |
| `check-fuels.js` | Fuel catalogue matching, Portuguese commercial names and additive/simple distinctions |
| `check-promos.js` | Promo stacking rules |
| `check-receipt.js` | Portuguese receipt parsing, compact litre units, product-code separation, discounted-total warnings and station-price replacement confirmation, wrapped commercial fuel names and ambiguous fuels |
| `check-stations.php` | Station proxy index build, radius search, request validation |

Fixtures for providers live in `scripts/fixtures/providers/`.

PWA layout, Safari 12, and touch flows still need manual verification per [AGENTS.md](../AGENTS.md).

## Optional analysis browser check

With Playwright available and a local server running (`python3 -m http.server 8765`),
run `node scripts/browser-analysis.cjs`. Set `FUELLOG_QA_URL` for a different local
port, `FUELLOG_QA_OUTPUT` for screenshots, or `FUELLOG_QA_PLAYWRIGHT` for an
explicit Playwright module path when several runtimes are installed.
`FUELLOG_QA_CHROMIUM` can select an installed Chromium executable. This uses a new isolated Chromium
context with synthetic data; it exercises 375/320px layouts, sliders, calendar
shortcuts, currency switching, tap/keyboard inspection, expanded linked zoom,
focus restoration, reduced motion, empty history and offline reload/interaction.
It is separate from the dependency-free Node checks and is not proof of Safari 12
or physical iPhone 6 compatibility.

The receipt form handoff can be checked with `node scripts/browser-receipt.cjs`
against the same local server. It stubs only the OCR result and exercises photo
selection, editable review, station Find with equal/different prices, keep/replace
choices, commercial-fuel review, computed editing-font sizes in receipt review and the fill-up form, full OCR notes, the touch-sized clear-notes button,
IndexedDB save, editing and JSON export; it does
not test OCR accuracy or the remote language-model download.

`scripts/browser-receipt-ocr.cjs` tests the real worker/core with the hosting CSP,
synthetic receipt recognition, cancellation, a second scan and offline reload.
It starts its own temporary server. Set `FUELLOG_QA_OCR_MODEL` to a locally
downloaded public `por.traineddata.gz` from
`https://tessdata.projectnaptha.com/4.0.0_fast/por.traineddata.gz`; the test supplies
that real model at the external download boundary for a deterministic run.
The same Playwright/Chromium overrides apply. Optional `FUELLOG_QA_RECEIPT` runs
a local image instead, printing review values without saving records. Keep
personal receipt photos out of repository fixtures. This does not verify live
host availability or physical iPhone support.

## Consumption diagnostic checklist

See [ANALYSIS.md](ANALYSIS.md). When investigating a spike, verify the full-to-full
anchors, accumulated partial litres, odometer difference and imported tank flags.
Distinguish the last completed consumption interval from the latest purchase.

Relevant existing checks: `check-data.js`, `check-calc.js`, `check-analysis.js`,
`check-analysis-ui.js` and `check-jerrycan.js`. For future changes, cover a trailing
partial fill after completed intervals: it must leave consumption points, averages
and trends unchanged, while remaining in purchase/price views. A subsequent full
fill must close the interval and include those partial litres exactly once.

A suspicious but valid positive-distance interval must remain visible. Diagnostics
should expose conflicting timestamps/odometers without correcting records. Preserve
source metadata when the user explicitly changes Full/Partial. Use synthetic
fixtures for public regressions; keep personal backups and identifying diagnostic
examples out of the repository.

## Optional language browser check

With the local server and Playwright available, run `node scripts/browser-i18n.cjs`.
The `FUELLOG_QA_URL`, `FUELLOG_QA_PLAYWRIGHT` and `FUELLOG_QA_CHROMIUM` overrides
apply. This uses synthetic local data and checks the header selector at 375/320px,
independence from station country, form/metadata preservation, History filters,
reference-price cards, translated chart tabs and offline reload/switching. It also
checks device defaults and manual choices surviving subsequent device-language changes. It does
not establish Safari 12 or physical iPhone 6/Home Screen compatibility.

## Installed-release upgrade regression

`node scripts/browser-update.cjs` starts an isolated local server with deliberately
long HTTP caching. It uses the v41/v42 Git snapshots to reproduce the mixed release
and inert language flag, then verifies recovery with the current source. It checks
failed downloads/incomplete uploads, update-button feedback, local record precision
and provenance, language persistence and offline reload. The Playwright/Chromium
overrides apply; see [UPDATES.md](UPDATES.md) for the release and deployment contract.
