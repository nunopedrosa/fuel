# FuelLog development baseline

These instructions apply to all development in this repository. Preserve them in
new features, fixes, refactors and dependency changes. They describe required
behaviour, not a claim that every existing implementation already meets it.

Start with [docs/CODEMAP.md](docs/CODEMAP.md) to locate the relevant code and
related change points. Verify its pointers against the implementation and update
it when files, entry points or important data flows move or change.

## Compatibility is a requirement

- The minimum supported device is **iPhone 6 running iOS 12.5.7 / Safari 12**.
  Every new feature must work both in Safari and when launched from the Home
  Screen as an installed PWA. Modern browsers must remain supported too.
- Check JavaScript syntax, browser APIs, CSS, touch interaction, viewport layout,
  memory use and download size against that minimum. A successful check in Node
  or a modern browser does not establish Safari 12 compatibility.
- Do not introduce optional chaining, nullish coalescing or unsupported APIs into
  browser code. Examples include `Array.prototype.at`, `String.prototype.replaceAll`,
  `Object.fromEntries` and `File.text()`. Use compatible alternatives; feature
  detection cannot protect a browser from unsupported syntax.
- New optional browser capabilities need feature detection and a usable fallback.
  Preserve the legacy file export and manual Add to Home Screen workflows.
- Keep processing bounded on low-memory devices. Retain the 5 MB import limit,
  bounded caches/results and region or nearby-station search paths. Avoid loading
  large nationwide datasets or heavyweight parsers into the core application.
- Preserve old-Safari layout fallbacks. Read [COMPATIBILITY.md](COMPATIBILITY.md)
  before changing compatibility-sensitive behaviour.

## Architecture and privacy

- Core logging, history, calculations, editing and backup remain local-first.
  Store personal data in IndexedDB and keep core functionality usable offline.
- Do not upload vehicles, registrations, fill-ups, notes, imported files, backups
  or promos. Do not add accounts, tracking, analytics, telemetry, a cloud database
  or synchronisation without an explicit change in project requirements.
- Keep the static PWA and no-build-step architecture. The existing optional
  station proxy serves public station searches; it is not a personal-data backend.
- Prefer small, compatible browser code. Justify new runtime dependencies by
  their benefit, payload, memory cost, compatibility, offline availability and
  privacy impact. Keep optional large functionality out of the startup payload.
- When adding runtime files or changing cached assets, review `sw.js` so updates
  and offline operation continue to work.

## Data integrity and portability

- Preserve supported metadata through import, storage, editing, migration and
  full JSON backup/restore. Editing visible fields must not discard other stored
  fields. JSON is the canonical lossless backup; document CSV limitations.
- Extend the shared data model when an importer supplies useful information.
  Do not discard station addresses/coordinates, external IDs, currency, vehicle
  metadata or source provenance merely because the current form lacks controls.
- Keep source identifiers separate from local IDs and provider station IDs.
  Do not assume identifiers from different sources are interchangeable.
- Preserve numeric precision internally; round for presentation. Treat missing
  values, zeroes and placeholders according to the source format rather than
  inventing values. Do not guess undocumented fuel enums or timezone semantics.
- Validate and preview imports before writing. Show usable records, duplicates,
  errors and warnings. Explain replacement clearly and allow cancellation.
  Merge should avoid duplicates when the same file is imported again.
- Never silently correct questionable historical data. Warnings may flag usable
  records; invalid records must be reported explicitly. Prevent failed imports
  from leaving partially replaced or partially written datasets.
- Preserve compatibility with existing backups. For schema changes, provide an
  explicit migration path and update the backup version as appropriate. Change
  the IndexedDB version when stores or indexes change.

## Calculations and price meaning

- Calculate consumption only over completed full-tank-to-full-tank intervals.
  Include intervening partial fills and the ending full fill; exclude the starting
  full fill. Leave intervals before the first full tank and after the last full
  tank out of consumption calculations.
- A trailing partial fill does not create a consumption point or change completed
  consumption averages. The latest consumption point may therefore predate the
  latest purchase. Include that partial fill only when a later full tank closes
  the interval; purchase and price views still include it.
- Respect the recorded full/partial flag, including the imported source flag.
  Do not infer tank fullness from purchased litres, short distances, a surprising
  consumption value or nearby timestamps. A correction requires an explicit user
  edit; preserve the original import metadata.
- When investigating an unexpected consumption point, trace both full-tank
  anchors and every intervening partial fill, and show the litres/distance formula.
  Check dates, odometers and source flags before changing calculation rules.
  Suspicious timing or odometer differences warrant review, not automatic merging,
  deduplication, reordering or correction of distinct records.
- Use consistent interval rules for dashboard summaries and charts. Flag invalid
  distances and unusual results without altering the underlying records. Clearly
  distinguish recorded purchases, derived consumption and estimates.
- Keep currencies and units explicit. Never silently treat a non-EUR amount as
  euros or sum different currencies. Any conversion needs an explicit policy.
- Distinguish current station prices, official maxima, national averages and
  historical prices paid by the user. Display provenance and relevant timestamps;
  stale cached prices must be recognisable.

## External data and security

- Use official public or explicitly reusable datasets. Do not scrape fuel-chain
  sites, reverse-engineer private operator APIs or require provider credentials
  for normal use. Consult [docs/PROVIDERS.md](docs/PROVIDERS.md).
- Keep requests and caches bounded, respect source terms and preserve attribution.
- Treat imported text and external responses as untrusted data. Validate structure
  and values, escape displayed content and never execute imported content.

## Verification and documentation

- Read the relevant implementation and focused documentation before changing it.
  Keep user documentation, compatibility notes and data-format descriptions aligned
  with the actual behaviour. Put detailed feature specifications in `docs/`.
- Run checks appropriate to the change. The baseline checks are defined in
  `.github/workflows/check.yml`: JavaScript syntax, incompatible syntax/API scan,
  manifest JSON validation and PHP checks for the station proxy.
- Focused regression scripts live under `scripts/check-*.js` (data semantics,
  import/backup, calculations, migrations, binary plist/Jerrycan, fuels, promos,
  price providers). CI runs them all; run the scripts that match your change area.
- For runtime changes, verify relevant online/offline flows and touch layouts.
  Data changes need meaningful checks for metadata preservation, backup round
  trips, migration and duplicate handling. Import failures and cancellation must
  preserve existing data.
- Report what was actually verified and what remains untested. Explicitly state
  when Safari 12 or a physical iPhone 6 was unavailable; do not claim device
  compatibility based solely on modern-browser or static checks.

Detailed calculation and diagnostic rules: [docs/ANALYSIS.md](docs/ANALYSIS.md).

See also [README.md](README.md), [CONTRIBUTING.md](CONTRIBUTING.md),
[PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).
