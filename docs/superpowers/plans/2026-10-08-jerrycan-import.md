# Jerrycan Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if the user selects delegation. Steps use checkbox syntax for tracking.

**Goal:** Import Jerrycan backups on-device and preserve their useful data through normal FuelLog use.

**Architecture:** Add focused browser modules for binary-plist decoding, shared data helpers and Jerrycan adaptation. Keep application orchestration in `app.js` and use a single IndexedDB transaction for each import commit. Add optional record fields without introducing new stores.

**Tech Stack:** Plain JavaScript, FileReader, DataView, IndexedDB, Node assertion scripts and Python plistlib for generated test fixtures. No runtime dependency or build step.

**Spec:** `docs/superpowers/specs/2026-10-08-jerrycan-import-design.md`

## Global Constraints

- iPhone 6 / iOS 12.5.7 / Safari 12; offline processing and installed-PWA operation.
- Retain the 5 MB file limit and existing JSON/CSV/TSV/TXT support.
- Preserve precision, source metadata and native plist UTC timestamps.
- Do not infer undocumented unit or fuel enums; expose confirmation controls.
- No upload of personal files, logs or backups; no new runtime dependencies.
- Merge defaults to preserving data; replacement and invalid-row exclusions require an explicit preview and confirmation.
- Abort/error leaves the previous dataset intact; write success means transaction completion.
- Do not commit the actual user's private sample; use generated/sanitized fixtures.

## Review Focus

- Corrupt offsets, cycles or deep containers: fail promptly with a useful message, bounded memory and no writes (Task 1).
- Reordered/renamed files and changing destination vehicles: deterministic keys remain stable and duplicates are scoped to the destination (Task 2).
- Foreign-currency price versus default-currency total: preserve source amounts and never label either as EUR implicitly (Tasks 2 and 4).
- Cancel, quota errors and mid-write failures: leave all existing stores intact (Task 3).
- Editing only a note or vehicle name: retain imported metadata and timestamp precision (Task 4).

## File responsibilities

- `js/import/bplist.js`: binary-plist decoding only; exports `window.FuelLogBplist`.
- `js/import/jerrycan.js`: format validation, normalization, warnings and source keys; exports `window.FuelLogJerrycan`.
- `js/data.js`: reusable record helpers, consumption intervals and currencies; exports `window.FuelLogData`.
- `db.js`: transaction-backed import commit alongside existing storage helpers.
- `app.js`: dialogs, file detection, destination selection, forms, currency presentation and existing import/export orchestration.
- `scripts/check-bplist.js`, `scripts/check-jerrycan.js`, `scripts/check-data.js`, `scripts/check-import-transaction.js`: meaningful regression checks using Node assertions.
- `scripts/fixtures/jerrycan/`: synthetic plist inputs produced with Python plistlib; never the private sample.
- `index.html`, `sw.js`: script order and offline assets; `styles.css`: compact import/details controls.
- `README.md`, `COMPATIBILITY.md`, `docs/CODEMAP.md`, `.github/workflows/check.yml`: user documentation and maintained checks.

### Task 1: Safe binary-plist decoder

**Files:** Create `js/import/bplist.js`, `scripts/check-bplist.js` and synthetic fixtures in `scripts/fixtures/jerrycan/`.

**Interfaces:** `FuelLogBplist.decode(arrayBuffer)` returns plain JS values, `Date` objects for dates and explicit wrapper objects for data/UID values. Unsupported structures throw an `Error`. No DOM or database dependencies.

- [ ] Generate fixtures for dictionaries, arrays, ASCII/UTF-16 strings, signed integers, 32/64-bit reals, booleans, null, native dates, bytes and UIDs:

```python
import datetime, pathlib, plistlib
p = pathlib.Path('scripts/fixtures/jerrycan/types.bplist')
p.parent.mkdir(parents=True, exist_ok=True)
p.write_bytes(plistlib.dumps({
    'name': 'São João', 'values': [True, False, -1, 42, 1.25],
    'date': datetime.datetime(2026, 10, 7, 16, 18, 33, 497745),
    'bytes': b'abc', 'uid': plistlib.UID(7)
}, fmt=plistlib.FMT_BINARY))
```

- [ ] Write a VM-loaded assertion script before implementation. Extract the ArrayBuffer from the exact Buffer slice. Assert semantic values and date precision:

```javascript
const decoded = window.FuelLogBplist.decode(buffer.buffer.slice(
  buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
assert.equal(decoded.name, 'São João');
assert.equal(decoded.values[2], -1);
assert.equal(decoded.values[4], 1.25);
assert.equal(decoded.date.toISOString(), '2026-10-07T16:18:33.497Z');
```

- [ ] Run `node scripts/check-bplist.js` and confirm failure because the decoder does not exist.
- [ ] Implement header/trailer checks, safe integer arithmetic without BigInt, offset-table bounds, object-reference bounds and marker decoding. Use explicit endian reads and byte loops for strings. Reject unsafe numeric integer values. Decode extended lengths only from valid integer markers.
- [ ] Enforce 5 MB input, maximum depth 64 and at most 100,000 objects; cache decoded objects and separately track objects being decoded to reject cycles. Validate every read and declared allocation length before allocating.
- [ ] Add malformed fixtures by modifying valid buffers: truncated trailer, out-of-file offset, invalid object reference, self-reference, excessive nesting and oversized declared string/container. Assert each throws and never calls a database helper.
- [ ] Run `node scripts/check-bplist.js` until all valid-type and corrupt-input cases pass.

### Task 2: Data helpers and Jerrycan adaptation

**Files:** Create `js/data.js`, `js/import/jerrycan.js`, `scripts/check-data.js`, `scripts/check-jerrycan.js` and sanitized vehicle/record fixtures.

**Interfaces:**

- `FuelLogData.intervals(fillups)` returns `{intervals, warnings}` with interval `{start, end, distance, litres, consumption, warnings}` objects.
- `FuelLogData.currency(record, vehicle)` returns explicit currency or legacy EUR.
- `FuelLogData.amountsByCurrency(fillups, vehicles)` returns separate totals per currency.
- `FuelLogData.sourceKey(record)` returns a stable canonical source identity from original date, odometer, volume and currency/cost values; store the complete canonical identity, not only a collision-prone short hash.
- `FuelLogJerrycan.inspect(root)` validates `Car`/`Records` and supplies source metadata for the controls.
- `FuelLogJerrycan.normalize(root, options)` takes `{distanceUnit, volumeUnit, fuelId, stringDateOffsetMinutes}` and returns `{vehicle, fillups, warnings, errors, summary}` without writing anything.

- [ ] Write and run failing assertions for full/partial accumulation, open intervals and currency separation:

```javascript
const fs = [
  {date:'2026-01-01', odometer:100000, litres:60, fullTank:true},
  {date:'2026-01-02', odometer:100300, litres:25, fullTank:false},
  {date:'2026-01-03', odometer:100550, litres:20, fullTank:false},
  {date:'2026-01-04', odometer:100800, litres:35, fullTank:true}
];
assert.equal(D.intervals(fs).intervals[0].consumption, 10);
assert.equal(D.intervals(fs.slice(0,3)).intervals.length, 0);
assert.deepEqual(D.amountsByCurrency([
  {totalCost:10,currency:'EUR'}, {totalCost:20,currency:'USD'}
], []), {EUR:10,USD:20});
```

- [ ] Implement the helpers. Sort a copy chronologically; sum only closed positive-distance intervals. Flag below 2 or above 30 L/100 km as advisory. Exclude invalid distances consistently from chart and summary inputs.
- [ ] Normalize source fields into existing FuelLog names and optional fields from the spec. Preserve the raw vehicle dictionary once on the vehicle and useful raw record values in record source metadata. Map optional locations with exact coordinates and external IDs. Validate flags strictly rather than defaulting missing flags to full.
- [ ] Require explicit units and fuel selection. Support km/miles and litres/US gallons/imperial gallons with documented factors 1.609344, 3.785411784 and 4.54609 respectively. Divide source unit prices by volume conversion factors. Retain unit enums as metadata.
- [ ] Native plist dates become UTC ISO strings; timezone-free string dates require a supplied offset. Invalid date strings generate explicit row errors. Preserve raw timestamps for source identity even when JS date precision is milliseconds.
- [ ] Resolve `PriceInDefaultCurr` in vehicle currency. When source price uses another currency, derive the normalized comparable price from total/litres and retain the foreign source price/currency. Missing currencies and unresolvable amounts are preview errors, not EUR guesses.
- [ ] Check exact synthetic numbers, zero urban fraction, no location, invalid coordinates, conflicting gearbox, placeholders, malformed required fields and negative/zero-distance intervals. Assert changing filename/order never changes source identity; unit/fuel correction preserves the original identity.
- [ ] Run `node scripts/check-data.js` and `node scripts/check-jerrycan.js`; decode the real sample locally and verify 88 records, 58 full, 30 partial and 74 locations without committing its contents.

### Task 3: Atomic persistence and validated import batches

**Files:** Modify `db.js`, `app.js`; create `scripts/check-import-transaction.js`.

**Interfaces:** `FuelDB.commitImport({replace, vehicles, fillups, settings, promos})` opens one readwrite transaction for included stores, enqueues clear/put requests synchronously, rejects on abort/error and resolves only on `oncomplete`. Omitted stores remain untouched; generic/Jerrycan replacement includes vehicles/fillups and necessary settings, native backup replacement may also include promos.

- [ ] Write a faithful transaction mock that stages writes until completion and discards all staged operations on abort. Include a successful request followed by an error and a completion that happens after request successes:

```javascript
const pending = FuelDB.commitImport(batch);
mock.succeedRequests();
assert.equal(mock.promiseResolved, false);
mock.abort(new Error('quota'));
await assert.rejects(pending);
assert.deepEqual(mock.persisted, originalStores);
```

- [ ] Run `node scripts/check-import-transaction.js` and confirm failure before implementing `commitImport`.
- [ ] Implement completion-based atomic commits. Verify duplicate primary keys cannot overwrite unrelated local records: allocate local IDs for new Jerrycan records and validate native backup collisions/references before writing.
- [ ] Refactor `importGenericRows` and `importFuelLogBackup` to construct complete proposed batches before writes. Validate vehicle references, record structure and backup versions. Existing backup versions remain accepted; unsupported versions fail clearly.
- [ ] Check Jerrycan source identities within the destination vehicle plus canonical matching for earlier generic records. Duplicate rows in one file count as skipped duplicates. Keep differing legitimate fills separate. New-vehicle imports recognise source vehicle metadata on later imports without silently overwriting user fields.
- [ ] Ensure replacement clears only the specified stores in that same transaction and active-vehicle settings refer to a committed vehicle. No write occurs until final confirmation; no misleading success toast on cancellation.
- [ ] Run transaction tests covering failure, successful merge, replacement, invalid references and duplicate/collision handling. Verify rollback in actual IndexedDB during browser QA in Task 5.

### Task 4: Integrate reader, preview, metadata and currencies

**Files:** Modify `app.js`, `styles.css`, `index.html`, `sw.js`; extend data/import regression scripts.

**Interfaces:** `readFileBuffer(file)` uses `FileReader.readAsArrayBuffer`; `importJerrycan(root)` orchestrates controls, normalization, preview and `FuelDB.commitImport`. Helpers from Tasks 1–3 remain pure or transactional as specified.

- [ ] Add failing regression cases that exercise real save/export handlers in a VM harness with DOM/storage stubs. Verify note/name-only edits retain `source`, station details, currency and unchanged date precision:

```javascript
await editFillupThroughHandler({notes:'Updated note'});
assert.equal(saved.date, original.date);
assert.deepEqual(saved.source, original.source);
assert.deepEqual(saved.stationLocation, original.stationLocation);
await editVehicleThroughHandler({name:'Renamed car'});
assert.deepEqual(savedVehicle.source, originalVehicle.source);
```

- [ ] Detect bytes before text parsing and accept `.jerrycan` in the file input. Reuse compatible text reading for existing formats. Load `js/data.js`, decoder and adapter before `app.js`; add them to `sw.js` and bump the app cache version.
- [ ] Provide compact in-app controls for new/existing vehicle, explicit source units, fuel and any necessary string-date offset. Show counts, ranges, per-currency totals, duplicates, row errors and metadata/consumption warnings. Escape all source text. Merge defaults to selected; replacing and excluding invalid rows must be visible in the final confirmation.
- [ ] Merge existing vehicle metadata when saving. Preserve original date if the date input was not changed. Add currency control and compact details views for imported vehicle/station/source information. Do not assign Jerrycan station IDs to provider `stationId`.
- [ ] Make dashboard/history/forms/price charts/export labels currency-aware. Separate unlike currencies in total spend, cost/km and price charts; no implicit FX. Keep station provider/promos as currently supported and label historical foreign prices explicitly. Use `FuelLogData.intervals` in both calculation paths and preview warnings.
- [ ] Bump JSON backup version, default legacy stored fill-up currencies to EUR and preserve source metadata. Extend CSV columns and generic aliases for currency, address, coordinates, external Jerrycan station ID and urban fraction; document nested metadata limits. Verify full JSON round trip and flat CSV metadata round trip.
- [ ] Run new focused scripts and existing fuel/promo checks. Confirm malicious station names render as text, final cancellation writes nothing and non-EUR values never receive EUR labels.

### Task 5: Browser verification, documentation and final checks

**Files:** Update `README.md`, `COMPATIBILITY.md`, `docs/CODEMAP.md` and `.github/workflows/check.yml`; add generated fixtures or regression cases only where a new failure warrants them.

- [ ] Use the current browser tooling against a local preview to exercise import/preview/cancel/merge/repeat merge/replace, an existing vehicle, metadata editing and JSON export/restore. Test actual transaction rollback with an injected write failure using synthetic data. Preserve any existing browser log data by testing in an isolated origin/session.
- [ ] Load all new runtime assets online, then verify the importer and logging flows offline from the installed service-worker cache. Check narrow touch layouts and dialog scrolling. Physical iPhone 6 / Safari 12 testing is a separately reported requirement; static checks and a modern browser are not substitutes.
- [ ] Update format examples and compatibility instructions, including unit/fuel confirmation, currency semantics, validation warnings, duplicates and CSV limitations. Replace CODEMAP statements that Jerrycan is unimplemented and record the new module boundaries and atomic write flow.
- [ ] Add the new assertion scripts to CI. Run JavaScript syntax checks on browser modules, existing incompatible API/syntax scan, manifest JSON validation, `node scripts/check-fuels.js`, `node scripts/check-promos.js`, all new checks and PHP lint if available. Run `git diff --check`.
- [ ] Review the full diff against every approved spec requirement, particularly error paths and metadata loss. Resolve discovered failures, then repeat only affected checks. Report modified files, actual test results and any physical-device verification limitation.

## Execution

Recommended method: native implementation in this chat because the five tasks
share record and transaction interfaces and the existing `app.js` integration.
The written plan must be reviewed before product-code edits. Keep existing
uncommitted `AGENTS.md` and CODEMAP additions; do not reset unrelated work.

## Execution results

Implemented on `codex/jerrycan-import`. Seven assertion scripts pass, along with
syntax/API scans, manifest validation and PHP lint. Chromium verifies import
cancellation, repeat imports, metadata/precision edits, distinct native-backup
restore, actual IndexedDB rollback, mixed currencies and offline import.
The private sample normalizes to 88 records (58 full, 30 partial, 74 locations).
Independent review findings were fixed with regression coverage. Physical iPhone 6
and Safari 12 were unavailable; the bundled WebKit executable was missing.
Source memory limits now also bound decoded allocation and source-metadata graph
expansion. Original plist timestamp seconds are retained beyond JS milliseconds.
