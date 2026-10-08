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
| `check-calc.js` | `calcMetrics`, parsers (`flexDate`, `parseDelimited`, …) |
| `check-migrate.js` | `migrateData` and schema settings |
| `check-providers.js` | All EU adapters (fixtures), registry and proxy contract |
| `check-sw-assets.js` | `sw.js` ASSETS vs disk and `index.html` scripts |
| `check-fuels.js` | Fuel catalogue matching |
| `check-promos.js` | Promo stacking rules |
| `check-stations.php` | Station proxy index build, radius search, request validation |

Fixtures for providers live in `scripts/fixtures/providers/`.

PWA layout, Safari 12, and touch flows still need manual verification per [AGENTS.md](../AGENTS.md).
