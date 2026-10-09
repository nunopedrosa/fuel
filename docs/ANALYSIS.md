# Analysis rules and diagnosing consumption spikes

These rules apply to the dashboard, analysis explorer and import diagnostics.
The development baseline is [AGENTS.md](../AGENTS.md). This document distinguishes
current calculation behaviour from diagnostic checks performed during review.

## Consumption intervals

Use the shared `FuelLogData.intervals` helper in `js/data.js`:

1. Order records chronologically.
2. Start at a recorded full tank.
3. Sum all subsequent partial fills and the ending full fill. Exclude the
   starting full fill's litres.
4. Divide those litres by the ending odometer minus the starting odometer,
   then multiply by 100 for L/100 km.
5. Use the ending full tank as the next interval's anchor.

Records before the first full tank and partial fills after the last full tank
cannot establish completed consumption. A trailing partial purchase must not add
an interval or change completed consumption averages or trends. Its litres count
when a subsequent full fill closes the interval. Purchase quantities, spending
and historical prices still include that purchase according to their own rules.
The latest consumption point can legitimately predate the latest fill-up.

Average consumption is distance weighted: total interval litres divided by total
completed interval distance, multiplied by 100. The explorer's dashed trend uses
up to five completed intervals with the same weighting. Period selection first
builds intervals from whole history, then includes only intervals whose two
anchors are within the selected dates; crossing intervals are excluded, never
clipped. Purchase views select purchases by their own dates.

## Full/partial flags and source integrity

Jerrycan `FullTank` values 1/true map to full; 0/false map to partial. Invalid
flags are reported by the importer. Calculations follow the stored flag until the
user explicitly edits it. Do not infer fullness from volume, tank capacity,
consumption, distance or timing. An unexpectedly high result alone does not prove
a calculation bug or identify a wrong record.

If the user confirms that a recorded full fill was partial, they can uncheck
**Full** and save the record. It then stops closing a consumption interval.
Keep the original imported flag and other metadata in `source.original`; the
user's edited stored flag determines subsequent calculations. Do not silently
rewrite source metadata or historical records.

## Investigating a spike

Trace the plotted interval to the actual records, rather than treating an axis
label, trend value or latest purchase as a consumption observation:

- Identify the start and end full tanks and their dates and odometers.
- List every intervening partial fill and the ending full fill's litres.
- Show the calculation: summed litres / odometer difference × 100.
- Check stored full/partial flags against source metadata; account for explicit
  user edits before assuming an import discrepancy.
- Check timestamps and odometer changes for inconsistencies. A large distance
  between records only minutes apart is reason to review the source. It does not
  establish whether the time, distance or tank flag is wrong.
- Check for duplicate imports using source/local identifiers and import rules;
  nearby timestamps alone do not make distinct records duplicates.

Current calculation warnings reject nonpositive/invalid interval distances and
flag consumption below 2 or above 30 L/100 km for review. These generic thresholds
are not a guarantee that values inside the range are plausible. Suspicious timing
is a manual diagnostic check; the app does not currently implement an implied-speed
warning. Unusual usable results remain visible, without automatic correction.

## Privacy and verification

Use synthetic records for public examples and regression fixtures. Do not commit
personal vehicle backups, registrations or identifying diagnostic histories.

Run the relevant data, calculation, analysis and Jerrycan checks listed in
[TESTING.md](TESTING.md). Check agreement between shared intervals, dashboard
summaries and plotted observations. Preserving correct calculations may require
explaining a source inconsistency rather than changing code. Documentation-only
updates do not establish device or browser compatibility.
