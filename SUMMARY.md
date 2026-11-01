# FuelLog — project decisions and handover

Prepared on **24 October 2026** for continuity when moving from the company
ChatGPT Business account to a personal account.

This document summarises the conclusions reached in the project discussions,
including later corrections and refinements. It combines the accessible project
chat history with the repository documentation, implementation and Git history.
It is a durable handover, not a complete transcript or an account-data export.
Some older discussions were available only through references, design documents
and commits; unavailable conversation text has not been reconstructed as fact.

The checked-out implementation at preparation time is commit `d1cf53b`
(13 October 2026), with runtime release `fuellog-v52-hero-odometer`. This identifies
the local source reviewed; it does not establish what is deployed on the live site.

## 1. Purpose and permanent constraints

FuelLog is a personal fuel-tracking progressive web app, hosted at
`https://fuel.trekm.com`. It records vehicles and fill-ups, calculates consumption,
explores historical purchases and optionally compares public fuel prices.

The settled architecture is a **local-first, static PWA with no build step**.
Personal records belong in IndexedDB on the user's device. Logging, editing,
history, calculations and backup must remain usable offline after the app shell
has been cached. Low hosting load, small downloads and privacy are design goals.

There are no application accounts, analytics, trackers, cloud database or
synchronisation. Vehicles, registrations, notes, fill-ups, promos, imports and
backups must not be uploaded. The optional station proxy processes public fuel
datasets; it is not a personal-data backend. Receipt OCR is also local.

The minimum compatibility target is **iPhone 6 / iOS 12.5.7 / Safari 12**, both in
Safari and as an installed Home Screen PWA. Modern browsers remain supported.
New features must preserve that floor: compatible syntax, APIs and CSS, usable
touch layouts, bounded memory and downloads, manual Add to Home Screen and the
old-iOS export fallback. Modern-browser tests alone do not prove this target.

No framework or heavyweight parser should be added without a concrete reason.
The current app does use locally vendored Leaflet, optional Tesseract OCR and
self-hosted Inter fonts; earlier descriptions of a dependency-free app should
not be read literally.

## 2. How project knowledge should be maintained

We chose **`AGENTS.md`** as the permanent development baseline. It covers
compatibility, architecture, privacy, preservation of data, calculations and
verification. A separate `CLAUDE.md` was discussed as a possible pointer for
another coding tool, rather than a second competing set of requirements.

We also created **`docs/CODEMAP.md`** to make future work faster. Start there,
then verify its pointers against the actual implementation. Update it when files,
entry points or important data flows change. Keep detailed feature material in
`docs/` and maintain the user manual and focused guides alongside code changes.

The shared repository is the durable project context between chats and tools;
future work should not depend on a particular chat retaining its memory. Earlier
suggestions for additional PROJECT/ARCHITECTURE/STATUS documents were proposals,
not a requirement that all those files exist. The existing baseline, code map,
focused guides and this summary provide the current handover.

Dated specs and plans record historical intent. Their old status labels, branch
names and backup versions can be superseded by later implementation. Prefer
current code and focused documentation when they differ.

## 3. Vehicles, fill-ups and editing

Keep useful source information even when the normal form has no control for it.
The Jerrycan work deliberately extended the shared data model instead of merely
reading enough fields to populate the original form.

- Fill-ups retain currency, canonical fuel, station address/coordinates, source
  station identifiers, urban-driving estimates and import provenance.
- Vehicles can retain year, modification, tank capacity and other supplied
  technical metadata, together with original source fields.
- Local record IDs, external import IDs and provider station IDs have different
  meanings. A Jerrycan station ID must not become a provider station ID.
- Editing visible fields must preserve other stored fields and original metadata.
  An unchanged date retains its original seconds and milliseconds. Preserve
  internal numeric precision and round only for presentation.
- Placeholders and conflicting source fields remain available in provenance
  without becoming invented or trusted facts. Do not guess undocumented enums.

Numeric quantity and money controls must accept both comma and point decimals.
Use `type="text"` with `inputmode="decimal"`, normalise input and then parse it.
Safari can discard comma input in `type="number"` fields. The existing input
handler treats the first separator as decimal and ignores later separators.

Editable controls use **16 px text**, including receipt-review controls, to avoid
iPhone focus zoom. Keep user pinch zoom enabled.

The optional **Urban driving** slider sits below Fuel and describes driving since
the preceding fill-up. It spans 0–100%, with an explicit **Not specified** state.
Unknown must not silently become 50%. Internally `cityPercentage` is a 0–1
fraction. Untouched imported values retain their precision; changing the slider
marks the value as a user estimate without destroying source provenance.

## 4. Consumption, mileage and cost meaning

The definitive consumption rule is **completed full-tank-to-full-tank intervals**:

1. Sort the vehicle's records chronologically and start at a recorded full tank.
2. Add every subsequent partial fill and the ending full fill. Exclude the
   starting full fill's litres.
3. Calculate `summed litres / (ending odometer − starting odometer) × 100`.
4. Use the ending full tank as the next interval's starting anchor.

Records before the first full tank and after the last full tank do not establish
completed consumption. A trailing partial purchase stays in spending, quantity
and price views but creates no consumption point. Completed averages are
distance weighted, not a simple average of individual L/100 km results.

The later investigations of apparent consumption spikes confirmed that the
calculation followed the imported source flags. A high value did not justify
automatically changing a full fill to partial. The latest consumption point can
legitimately predate the latest purchase. Another suspicious interval had timing
and odometer differences that warranted reviewing the source, not merging or
correcting records automatically.

When diagnosing a result, identify both full-tank anchors, every intervening
partial fill, dates, odometers and source flags, then show the formula. Only an
explicit user edit changes the stored full/partial status. Preserve the original
imported status in source metadata. Nonpositive distances are invalid; unusual
usable results remain visible with warnings. Timing anomalies are currently a
manual diagnostic, not an implemented implied-speed warning.

The later mileage/dashboard refinement is also settled:

- Home's vehicle hero and Settings vehicle cards show **latest total mileage**:
  the most recent fill-up's odometer, or the vehicle's initial odometer if empty.
- Their headline consumption uses the **last ten fill-ups in date order**, with
  the full-to-full rule applied within that window; show cost/km alongside it.
- Other dashboard statistics can use full-history metrics. These are different
  scopes and must not be confused.
- Dashboard and History fill-up rows always show the **recorded odometer**.
  A row closing a complete interval adds distance, consumption and interval
  cost/km as secondary detail; those values do not replace its odometer.

**Cost-definition detail to preserve:** current `metricsFromFillups` computes
headline cost/km as recorded purchase spending divided by logged odometer
distance in its selected fill-up window. Its consumption average uses completed
intervals. Fill-row interval cost/km uses the purchases belonging to that
completed interval. These measures should not be described as identical or all
as consumed-fuel cost. Never combine different currencies into a single cost/km.

See [docs/ANALYSIS.md](docs/ANALYSIS.md) for the diagnostic contract and
[docs/CODEMAP.md](docs/CODEMAP.md) for the current calculation entry points.

## 5. Historical analysis explorer

We moved beyond the original static Home charts to an interactive, local history
explorer with two linked controls: **period position** and **period length**.
Month shortcuts, exact selected dates, summaries and charts follow the same
temporary selection. Expanded-chart zoom updates that selection too.

The implemented views cover consumption, price paid, monthly purchases and
urban-driving comparison. Summaries include distance-weighted consumption,
completed distance, litres purchased, spending, litre-weighted price and interval
coverage, with preceding-period comparisons when data permits.

Important conclusions:

- Build consumption intervals from the whole history first, then select only
  intervals whose two anchors fall inside the inclusive date window. Exclude
  boundary-crossing intervals instead of clipping them.
- Select purchases by their own dates. Purchase and consumption summaries can
  therefore legitimately describe different records.
- Separate currencies and distinguish missing values from zero.
- Urban profiles are estimates weighted by positive segment distance. Missing
  profiles remain unknown; show coverage and association, not a claim of cause.
- Keep unusual observations visible. Sampling must not alter exact summaries.

Charts support tap and keyboard inspection, an expanded view, **+/−/Reset** zoom,
stable scales with an automatic-scale option, and restrained motion that respects
Reduce Motion. Pinch chart zoom was discussed but **is not implemented**.
Rendering is capped at 160 observations and purchase aggregation at 60 calendar
buckets to protect older devices. Broader seasonal, station-history, range and
distribution ideas were discussed; do not treat every proposed chart as shipped.

## 6. Importing, backups and data portability

**JSON is the canonical lossless backup.** Full backups preserve whole records,
nested source metadata, vehicles, fill-ups, promos and persisted settings.
Current JSON backup version is **4**, while IndexedDB schema version is **3**;
these are separate version systems. Older backup versions 1–3 remain importable.
Provider caches, map tiles and OCR assets are not part of the backup.

CSV is for exchange and analysis, with explicit columns. It cannot preserve all
nested provenance or extended vehicle metadata, and omits `receiptFuelType`.
Document those limitations instead of presenting CSV as a complete restore path.
Generic JSON, CSV, semicolon-separated CSV, TSV and delimited TXT are supported.
Direct XLS/XLSX support remains outside the core app because of parser size and
memory cost; export those spreadsheets as CSV/TSV first.

All imports have a **5 MB limit**. Parse, validate and preview before writing.
Show usable records, duplicates, invalid rows and warnings; clearly explain
replacement and allow cancellation. Invalid rows are explicitly reported, while
questionable usable records are retained with warnings. Cancellation writes
nothing. A failed transaction must preserve the old dataset.

Merge adds records while avoiding repeat imports. Generic duplicate detection
uses vehicle plus date/time, odometer, litres, currency and total cost; it is a
practical heuristic, not semantic reconciliation. Native backup merging respects
local IDs and remaps conflicts; distinct IDs must not be silently collapsed.

Replacement clears and writes participating stores atomically. Generic/Jerrycan
replacement replaces vehicles/fill-ups, preserving unrelated promos/preferences.
Native backup replacement also restores promos and eligible settings. Settings
are **upserted rather than cleared**: absent backup keys remain local. Merge keeps
local settings. Back up first when replacing a dataset that matters.

### Native Jerrycan import

The agreed solution was a bounded, on-device Apple binary-plist reader plus
normalisation modules, rather than a server converter or a large generic parser.
It supports preview, new/existing vehicle selection, merge/replace, deterministic
source keys and atomic writes, including offline use.

Preserve station locations, useful vehicle fields, original values, source
precision and full/partial flags. Ask for distance/volume units and fuel instead
of assuming undocumented Jerrycan numeric enums. Convert confirmed units to km
and litres. Native plist dates are UTC instants; timezone-free text dates require
an explicit UTC offset. Retain source date precision beyond JavaScript's
millisecond representation in provenance.

Handle `PriceInDefaultCurr` in the vehicle's default currency; do not silently
combine a foreign unit price with that amount. Retain the original values and
identify any derived comparable unit price.

The mobile import picker intentionally has **no `accept` filter**, because it
previously hid `.jerrycan` files. Validate the contents after selection. Decoder
bounds include object-count, nesting and decoded-allocation limits as well as
the file-size cap. Preserve those safeguards.

## 7. Public prices, search and maps

Fuel-price lookup is optional. Use official public or explicitly reusable data,
with attribution and timestamps. Do not scrape fuel-chain websites, reverse
engineer private operator APIs or require provider credentials for normal use.

| Country | Implemented source | Meaning |
| --- | --- | --- |
| Portugal | DGEG | Individual station prices |
| Spain | Minetur/MITECO | Individual station prices |
| France | data.economie.gouv.fr | Individual station prices |
| Belgium | FPS Economy / Statbel | Official maximum prices |
| Netherlands | CBS | National average prices |

Belgium and the Netherlands do not supply an implemented station list. The EU
Oil Bulletin was considered but is not implemented. A canonical fuel catalogue
maps provider names/keys and recognises supported commercial names. Provider
identifiers remain separate from local and import identifiers.

The same-origin PHP proxy is enabled in the checked-in configuration for PT/ES.
It caches public datasets hourly and returns bounded nearby results, avoiding
large nationwide downloads to low-memory phones. Disable it on a static-only
host; direct mode then uses the provider and applicable region restrictions.
Do not mistake the Origin check for authentication or rate limiting.

The settled Prices design uses a map with filters and a draggable result sheet.
The **magnifying glass searches the map centre**; the **location target obtains
the user's location and searches there**. Tapping a station name focuses it on
the map; Go opens directions, and Add fill-up prefills an editable record.
Fit markers into the visible area above the sheet. Cards and markers use the
same price tiers. Local past purchases appear separately as **You paid … here**;
they are historical personal observations, not current official prices.

Keep source update time, retrieval context and stale-cache labels visible.
Opening Prices may fetch catalogues, reference prices and map tiles. Station
searches require an action; it would be inaccurate to say every provider request
waits for a search click.

Search results, area/fuel bundles and archives support offline reuse where
cached. Offline maps combine bundled low-zoom terrain with bounded viewed-tile
caching. **Only the bundled manifest is precached at installation**; bundled
PNGs are cached when requested. Installation alone does not guarantee offline
coverage. The IndexedDB tile cache is capped at 32 MiB and evicts by oldest write
timestamp, not least-recent read.

Price searches may disclose rounded coordinates to the own proxy or the French
provider; tile requests disclose viewed areas to the selected tile provider.
This is separate from personal fuel-log data. The app does not upload records
with those requests. See [PRIVACY.md](PRIVACY.md) and
[docs/PROVIDERS.md](docs/PROVIDERS.md) for the precise boundaries.

## 8. Brand promos and typical-fill economics

Promos are local, user-entered discounts matched to station brands, ignoring
case and accents, with optional country/fuel/expiry restrictions. Support both
per-litre and per-fill amounts.

The final combination rule is:

1. Stack all matching cumulative promos.
2. Compare that stack with the single best matching exclusive promo.
3. Use the better package for headline price, sorting and fill-up prefill.
   A tie favours the cumulative stack.
4. If both packages exist, show the other on a second line. Never combine an
   exclusive promo with the cumulative stack or another exclusive promo.

New promos default to cumulative. Older promos without the flag are also
cumulative. Matching depends on the provider's brand field, so missing brand
information limits promo matching.

Convert per-fill discounts to an **estimated** per-litre saving using configurable
typical fill size, default 40 L. The same size drives station total-cost displays
and savings versus the most expensive station in the current results. These are
comparisons for that assumed purchase, not guaranteed personal savings.

When starting a fill-up, apply exact per-litre discounts to the prefilled price.
If the winning package includes per-fill discounts, put those amounts in a note
for subtraction from the actual total; do not store a typical-fill approximation
as the actual purchase price. Price and notes remain editable.

## 9. Optional receipt scanning

The accepted flow adds camera **Scan** and **Photos** actions beside Add fill-up
on Home. Downscale/preprocess the image, run local OCR, parse Portuguese receipt
values, validate, show editable review, then use the existing fill-up form/save.
The user still confirms odometer and full/partial status. Manual entry remains
available.

Later debugging refined the initial proposal:

- A blocked OCR worker caused the early scan failure. Use the direct same-origin
  worker with its scoped CSP. Tesseract/core are pinned to **5.1.1**, avoiding the
  newer core's incompatible syntax/APIs.
- Limit images to 8 MB and downscale to a 1280 px longest edge. Use one worker
  per scan and terminate it afterwards.
- Parse decimal commas and units without spaces, such as `40,06L`. Compare litres
  × unit price with the total and flag discounts/other-item discrepancies for
  review instead of forcing the values to agree.
- **Do not extract station names from the receipt** in the current flow; early
  suggestions were unreliable. Enter the station or use station Find.
- Station Find confirms before replacing a different existing unit price.
  Keeping the current or identical price preserves the total. Automatic cached
  station prefill preserves an existing price.
- Recognise supported Portuguese commercial fuel names through the canonical
  catalogue. Preserve the receipt product text as `receiptFuelType`. These are
  broad fuel categories, not an invented three-tier quality ranking. Ambiguous
  names need confirmation; do not infer octane from unrelated receipt numbers.
- Copy the complete OCR text into editable notes with line breaks. A circled X
  beside Notes clears only that field and does not save automatically.

Photos are discarded, not attached to records or uploaded. Photo attachments
were considered but not adopted. Engine/core assets load on demand and cache
locally; the Portuguese language model downloads from the language-data host on
the first online scan and is cached separately by Tesseract. **First-ever offline
scanning is not guaranteed**. OCR remains optional and may be slow or fail on an
iPhone 6.

## 10. Language and interface decisions

English and **European Portuguese** are implemented with a small registry and
one catalogue per language under `js/i18n/`. Keep matching keys/placeholders,
English fallback and translated accessibility labels. Inline SVG symbols avoid
an external icon dependency.

The final language selector is a **flag at the top right on every screen, next
to feedback**, opening a menu with language names. This superseded the initial
Settings-selector proposal. It remains available when feedback is hidden.

Language and station-search country are independent. Switching language must
preserve unsaved drafts, imported precision, filters and results. It must not
rewrite records, change fuel/currency/units, or change the OCR model.

Without a saved app choice, use the first supported device preference, with
regional Portuguese variants matching Portuguese and English as fallback.
Automatic detection is not persisted. Every explicit choice, **including the
currently displayed language**, is saved and wins over future device changes.
Languages remain available offline.

Other agreed UI conventions include compact titles matching navigation,
**Add / Save / Update** vocabulary, in-app dialogs, self-hosted Inter, compact
card spacing and Maps-like green Go actions. Familiar actions can use symbols
(search, nearby search, edit, close, expand), with accessible names and adequate
touch targets. Keep explicit text for consequential/ambiguous actions such as
Delete, Import, Replace and Update app, and keep bottom-navigation labels.

Feedback is an optional envelope action opening the user's email application;
FuelLog does not send feedback automatically.

## 11. Storage estimates and app updates

Settings → Storage separately estimates saved-log UTF-8 JSON size and browser
usage/quota. Saved-log size includes vehicles, fill-ups, promos and settings,
including metadata, but excludes database overhead. Browser usage also includes
offline caches and other same-origin storage.

Feature-detect `navigator.storage.estimate()`. Older Safari, failed calls or
invalid estimates show **Available capacity unknown**. Empty logs have no average
record-size estimate. Additional fill-ups are calculated from remaining quota
divided by average serialized fill-up size; this is theoretical, not a practical
capacity promise or a measurement of free RAM/disk space.

The later discussion clarified that a multi-GiB quota can be plausible and is
not guaranteed writable space. The final wording recommendation was simply to
rename **Available space** to **Remaining browser quota**, because the existing
explanation already covered the limitations. That recommendation is recorded
here; this review does not claim a later wording change was implemented.

Settings also shows the installed app build and an optional Update app action.
The mixed v41/v42 installation incident established that a fresh-profile test is
insufficient: new HTML had appeared with older scripts and an inert language
button. The fix was coherent, validated release caching, not deleting user data.

Keep the release identifier in `sw.js`, `config.js`, `app.js`, HTML
`data-app-version` and script/style release queries in sync. Download the complete
shell freshly and verify its markers before activation. Keep installed HTML and
scripts together, reject incomplete releases, allow retries and reload once when
the controller changes. Update checks must fetch `sw.js` from the network.
An already-downloaded update can activate offline. Failure must be visible and
allow retry. Never clear IndexedDB to recover a shell update.

Deploy changed assets, HTML, config and hosting rules first; **deploy `sw.js`
last**. Documentation-only changes need no runtime version bump. See
[docs/UPDATES.md](docs/UPDATES.md).

## 12. Verification, remaining limits and future work

Past implementation chats report focused Node/PHP regressions and isolated
Chromium checks, including imports, rollback, metadata/backup round trips,
phone-width layouts, offline flows, OCR, language changes and upgrades from
existing installations. Treat each as evidence for that revision and scenario,
not proof of every device or today's live deployment.

**Safari 12, a physical iPhone 6 and installed Home Screen behaviour were not
available for the reported automated verification.** Compatibility remains a
required target with physical-device validation outstanding. Provider availability,
current terms and hosting behaviour likewise need targeted checks when changed.

For future code changes, use the static baseline in
[.github/workflows/check.yml](.github/workflows/check.yml) and focused regressions
in [docs/TESTING.md](docs/TESTING.md). Verify relevant online/offline and touch
flows, preserve import cancellation/rollback, and state what was actually tested.

Ideas mentioned as possible future work include optional lazy-loaded XLSX import,
richer import mapping/duplicate review, more official providers, station favourites,
additional analysis, maintenance/other vehicle expenses, configurable units,
encrypted backups, backup reminders and deployment automation. They are **not
approved commitments or a claim of implemented functionality**. Accounts,
tracking, cloud synchronisation and personal-data uploads would require an
explicit change to the project's requirements.

## 13. Resume work from a new account

Keep this repository and its Git history independently of chat access. Start a
new project conversation with this summary and `AGENTS.md`, then consult
`docs/CODEMAP.md` and the relevant focused guide. Preserve any source attachments
needed for future diagnostics separately; this summary does not embed personal
backups, receipts or identifying history.

The application's fuel records are stored in browser IndexedDB, separately from
chat history. Use FuelLog's full JSON backup to preserve them, especially before
changing browser/profile/device or clearing site storage. This summary is project
context, not a fuel-data backup or an automatic migration of conversations.

### Source trail

Accessible project conversations reviewed for this handover:

- **Continue .jerrycan import discussion** — `01a11b22-b750-7193-8e88-950dc1d6e9b8`
  (including its older turns and reference to **Analyse fuel data file**).
- **Add offline receipt scanning** — `01a1213d-7fca-7742-8d3c-07184a7b58fb`.
- **Fix receipt scan failures** — `01a12166-1979-7d93-88a4-94ce7b007618`.
- **Add Portuguese language support** — `01a12fb8-7241-7b91-8b06-5a58e6df5f4e`.
- **Check available PWA storage** — `01a12fe2-d0fe-7ea0-a030-ef98bd719e3d`.
- **Review and update documentation** — `01a1310f-592d-75b3-8741-bf66c2fee9a3`.
- **Codex PWA Access** — `6ac8b1d9-a124-83ed-839e-840f2153f548`; parts of the
  earlier advice were available through the receipt task's cached reference.

Repository evidence includes [AGENTS.md](AGENTS.md), [README.md](README.md),
[COMPATIBILITY.md](COMPATIBILITY.md), [PRIVACY.md](PRIVACY.md),
[REVIEW.md](REVIEW.md), [CHANGELOG.md](CHANGELOG.md), the focused guides linked
above, dated specs/plans under `docs/superpowers/`, and Git history from the
initial 6 October version through the 13 October mileage changes. Provider,
promo and UI conclusions were also checked against current implementation;
their original conversations were not all directly available.

This handover changes documentation only. Runtime/browser/device tests and live
provider/deployment checks were not rerun for its preparation.
