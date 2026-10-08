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
