# Jerrycan import and data preservation

Status: approved and implemented on `codex/jerrycan-import`. Physical iPhone 6 /
Safari 12 verification remains outstanding.

## Outcome and constraints

Import Jerrycan backups directly into FuelLog, preserving useful vehicle and
fill-up data through editing and JSON backup/restore. All processing happens
on-device and works offline on iPhone 6 / iOS 12.5.7 / Safari 12. Retain the
5 MB file limit and existing JSON/CSV/TSV/TXT support.

The supplied binary-plist sample has a `Car` dictionary and 88 `Records`, with
58 full and 30 partial fills. Records have native plist dates, no record IDs,
and optional locations. The sample contains EUR amounts and vehicle unit enums
whose full mapping has not been verified.

## Approach

Use small browser modules for binary-plist decoding, Jerrycan normalization and
shared record/consumption helpers. Keep orchestration and forms in `app.js`.
Preserve existing stores and add optional fields to existing records.

Alternatives considered: putting all logic in `app.js` adds to its existing
coupling; a generic plist dependency adds payload and compatibility concerns.
The focused modules provide testable boundaries without a framework or build step.
Do not introduce a separate station database or refactor all price providers.

## Shared data model

Retain existing field names (`litres`, `pricePerLitre`, `totalCost`, `station`,
`fullTank`, `fuelId`). Add optional fill-up fields:

- `currency`: explicit ISO currency code; legacy FuelLog records default to EUR.
- `stationLocation`: `{name, address, latitude, longitude, externalIds}`;
  Jerrycan IDs live in `externalIds.jerrycan`, never in provider `stationId`.
- `cityPercentage`: fraction in [0, 1], identified as an imported estimate.
- `source`: import format and deterministic source key, plus source values needed
  to interpret imported dates, units and costs.

Add optional vehicle fields for year, modification, tank capacity in litres,
engine displacement, horsepower, drive, currency and source metadata. Preserve
the original Jerrycan vehicle fields in source metadata so contradictory or
placeholder values are retained for reference without becoming trusted facts.
VIN `000`, zero/unset CO2 and initial-odometer placeholders remain unknown in
normalized fields. Do not resolve the conflicting gearbox fields automatically.

Both vehicle and fill-up save handlers merge changes into the existing object.
Show imported station details and vehicle metadata in a compact details view;
new form controls are limited to currency and fields users need to correct.
An unchanged date must retain its original seconds/milliseconds when editing
another field.

## Import flow

1. Read the file using `FileReader` and detect `bplist00` from bytes. Require
   `Car` and `Records` after decoding; other plists are not Jerrycan backups.
2. Decode with strict bounds and resource limits. Support plist containers,
   strings, integers, reals, dates, booleans, data and UID values. Reject invalid
   offsets/references, cycles, excessive nesting and unsupported encodings with
   a clear error. Avoid BigInt and modern-only browser APIs.
3. Normalize into a proposed vehicle and fill-ups, preserving numeric precision.
   Decode native plist dates as UTC instants using the plist epoch. Preserve the
   original value and require an explicit interpretation for timezone-free string
   dates instead of guessing.
4. Offer a new vehicle (default) or an existing vehicle. Repeated imports can
   recognise a previous source vehicle; do not rely on name alone. Existing
   vehicle metadata is not overwritten without an explicit choice.
5. Ask the user to confirm source distance and volume units (km/litres suggested
   for this sample), then convert to FuelLog km/litres. Fuel selection is explicit;
   offer the selected vehicle's preferred fuel or leave it unset. Preserve numeric
   enums without treating sample `FuelType = 3` as a verified general mapping.
6. Show date/odometer range, full/partial counts, locations, currency totals,
   duplicates, invalid records and warnings. Merge is the default. Replace means
   replace all local vehicles/fill-ups, preserving unrelated promos/settings;
   explain this clearly. Cancel writes nothing.
7. Commit only after confirmation, using one IndexedDB transaction for affected
   vehicles, fill-ups and active-vehicle settings. Resolve on transaction completion;
   abort/error leaves the previous dataset intact. Refresh UI only after success.

Invalid required dates, quantities, costs or flags exclude a record and are listed
explicitly in the preview. Warnings for optional fields or unusual consumption do
not exclude valid records. Invalid coordinates are retained as source data but
not used as map coordinates. Warn when source cost and price × volume disagree;
do not silently overwrite either.

`PriceInDefaultCurr` denotes cost in the vehicle's default currency. If the record
currency differs, do not combine it with the source unit price as if they used
the same currency. Preserve both source values; normalize cost to vehicle currency
and derive the comparable unit price, clearly identifying the derivation.

Deterministic source keys use source date, odometer, volume and currency/cost
values, independent of filename, record order and destination vehicle. Retain
these keys alongside generated local IDs. Duplicate checks apply within the
chosen vehicle, including duplicates inside a file. Compare canonical keys when
matching earlier generic imports; do not collapse merely similar fills.

## Calculations, currency and station history

Use one full-to-full interval helper for dashboard, charts and import warnings.
Sum partial fills and the ending full fill; exclude the starting full fill and
open intervals. Nonpositive distances invalidate the interval and generate a
warning. Generic review flags below 2 or above 30 L/100 km are advisory, not
vehicle-specific declarations of bad data. Do not automatically exclude flagged
positive intervals from averages.

Keep total purchased fuel and spending as purchase metrics. Label cost per km as
logged spending per logged km; do not silently change it to consumed-fuel cost.
Display monetary totals and charts by currency, never sum unlike currencies or
perform implicit conversion. New manual fills default to vehicle currency/EUR.
Provider prices and promos retain their existing currency assumptions; historical
non-EUR prices must be labelled and not treated as EUR comparisons.

Preserve imported station locations for local history. Do not automatically link
them to government-provider stations based solely on a brand/name or coordinates.
Such identity matching is a separate feature.

## Backups, compatibility and verification

Bump the JSON backup version and support existing versions. Extend generic
import/export column handling for currency and station metadata; document CSV's
remaining limits for nested source metadata. Validate backup references before
writing and use transactional persistence for imports that replace data.
Add runtime modules to `index.html` and the service-worker asset list; update its
cache version. Update README, COMPATIBILITY.md and CODEMAP.md.

Verify with generated plist fixtures and a sanitized fixture reflecting the real
sample; do not commit the user's actual private history. Checks cover parser bounds,
dates/precision, full/partial flags, locations, unit confirmation/conversion,
repeat-import duplicates, mixed currencies, metadata surviving edits and backup
round trips, and rollback/cancellation. Use the actual sample locally to verify
88 records, 58 full fills, 30 partial fills and 74 locations. Run existing static,
fuel and promo checks and relevant browser online/offline flows. Report physical
iPhone 6 / Safari 12 testing separately from modern-browser checks.

## Scope boundaries

This change adds direct Jerrycan import and the data support it requires. It does
not add synchronization, exchange-rate services, an external station directory,
automatic correction of history or a general spreadsheet engine.
