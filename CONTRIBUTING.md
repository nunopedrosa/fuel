# Contributing

Start with [AGENTS.md](AGENTS.md) for development requirements and
[docs/CODEMAP.md](docs/CODEMAP.md) for implementation entry points. FuelLog is a
static PWA with no build step; keep core logging local-first and usable offline.

- Preserve iPhone 6 / iOS 12.5.7 / Safari 12 support. Read
  [COMPATIBILITY.md](COMPATIBILITY.md) before changing syntax, APIs or layouts.
- Personal records, imports and receipt images stay on-device. Optional public
  prices, map tiles, OCR model downloads and application updates have documented
  network boundaries in [PRIVACY.md](PRIVACY.md).
- Keep dependencies small and justified. Leaflet and optional Tesseract are
  already vendored locally; do not introduce frameworks or CDN runtime scripts
  without assessing payload, memory, privacy and offline availability.
- Preserve metadata and JSON backup compatibility. Backup format version 4,
  IndexedDB version 3 and record migrations serve different purposes; update
  the appropriate version and migration when changing a schema.
- Follow [docs/ANALYSIS.md](docs/ANALYSIS.md) for full-to-full calculations and
  [docs/PROVIDERS.md](docs/PROVIDERS.md) for public-data source requirements.
- Use synthetic fixtures. Do not commit personal backups, receipts or credentials.

Run the static baseline and relevant regressions in
[docs/TESTING.md](docs/TESTING.md). Runtime changes also need relevant online,
offline and touch-flow checks. Report actual results and unavailable environments;
Node or modern Chromium success does not verify Safari 12 or a physical iPhone 6.

For runtime releases, update all four release markers and asset queries together,
run the service-worker checks, and deploy `sw.js` last as described in
[docs/UPDATES.md](docs/UPDATES.md). Documentation-only changes do not require a
cache bump. Update the code map and focused guides whenever behaviour or entry
points change; dated plans and handovers describe historical intent.
