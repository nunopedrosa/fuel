# Testing and regression checks

FuelLog has no unit-test framework. Behaviour is guarded by Node and PHP scripts under
`scripts/`, plus static checks in [`.github/workflows/check.yml`](../.github/workflows/check.yml).

Run everything locally:

```bash
for f in scripts/check-*.js; do node "$f"; done
php scripts/check-stations.php
```

| Script | Focus |
| --- | --- |
| `check-data.js` | `FuelLogData` intervals, currency, warnings |
| `check-bplist.js` | Binary plist decoder limits and edge cases |
| `check-jerrycan.js` | Jerrycan normalize and fixtures |
| `check-import-transaction.js` | `FuelDB.commitImport` atomicity |
| `check-import-flow.js` | CSV/generic import, merge duplicates, Jerrycan batch |
| `check-import-backup.js` | JSON backup merge/replace, `extractRowsFromJson` |
| `check-urban-profile.js` | Optional urban slider, imported precision, clearing and estimate provenance |
| `check-analysis.js` | Period boundaries, weighted summaries/trends, currency fallback, urban coverage and bounded sampling |
| `check-analysis-ui.js` | Explorer controls, safe SVG, single observations, date-sized monthly bars and bounded label formatting |
| `check-calc.js` | `calcMetrics`, parsers (`flexDate`, `parseDelimited`, …) |
| `check-migrate.js` | `migrateData` and schema settings |
| `check-providers.js` | All EU adapters (fixtures), registry and proxy contract |
| `check-sw-assets.js` | `sw.js` ASSETS vs disk and `index.html` scripts |
| `check-fuels.js` | Fuel catalogue matching |
| `check-promos.js` | Promo stacking rules |
| `check-receipt.js` | Portuguese receipt parsing, compact litre units, product-code separation, discounted-total warnings and station-price replacement confirmation |
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
choices, the existing fill-up form and IndexedDB save; it does
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
