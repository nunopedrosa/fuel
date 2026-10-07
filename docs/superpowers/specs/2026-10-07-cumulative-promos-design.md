# FuelLog cumulative promos — design

**Date:** 2026-10-07  
**Status:** Approved and implemented

## Goals

- Let each brand promo be cumulative or exclusive.
- Apply every matching cumulative promo together.
- Compare that stack with the single best matching exclusive promo, and use the better package as the station's headline price.
- When both packages exist, show the other one as a second line.
- Keep the prefilled fill-up price and notes editable.

## Non-goals

- Mixing a cumulative stack with an exclusive promo in one price.
- Showing a second-best exclusive promo when no cumulative stack exists.
- Letting the user pick the alternative from the station card. Add fill-up always starts from the winner.
- Changing brand, country, fuel, expiry, or active matching.
- An IndexedDB migration or a backup version bump.

## Decisions

| Topic | Decision |
|--------|----------|
| Flag | `cumulative` boolean on the promo |
| Missing flag | Cumulative. Existing promos and old backups stack |
| New promo | Checkbox on, so it is cumulative until turned off |
| Packages | At most two: the cumulative stack, and the single best exclusive promo |
| Combination | The two packages never mix |
| Winner | Larger per-litre discount. A tie goes to the cumulative stack |
| Second line | Only when both packages exist |
| Sort | Winner's effective price |
| Fill-up | Prefill the winner only. Price and notes stay editable |
| Storage | Same `promos` store and backup version 3 |

## Offer rule

`FuelLogPromos.offers(station, canonicalFuel, promos, fillLitres)` is the only place that chooses packages. The price list, map, sort, and fill-up prefill all read its result.

A promo matches when it is active, not past `validUntil`, and has the same brand (case and accents ignored). Country and fuel restrict the match only when the promo sets them. That is unchanged.

`cumulative === false` is exclusive. Any other value, including a missing field, is cumulative.

Per-fill amounts become a per-litre value with the typical fill size before they are compared or added. An invalid or missing typical fill uses 40 L. Each promo is converted on its own. A stack adds those per-litre values, then the price is rounded once.

Inactive, expired, non-matching, and zero-or-negative promos are ignored before packages are built. A package that still has no positive discount is dropped.

**Cumulative package.** Every matching cumulative promo. Badge order follows the promo list, so it stays stable.

**Exclusive package.** The matching exclusive promo with the largest per-litre discount. If two exclusive discounts are equal, the earlier one in the promo list wins. The others are not shown.

**Winner.** If only one package remains, it is the winner and there is no alternative. If both remain, the larger discount wins and the other is the alternative. Equal discounts select the cumulative stack, with the exclusive promo as the alternative.

The effective price is the listed price minus the package discount, rounded to three decimal places, and never below zero. Comparison uses the discount, not the clamped price, so a larger discount still wins when both prices would display as zero.

If the station has no finite listed price, `winner` and `alternative` are null.

### Return value

```js
{
  base: number | null,
  winner: null | { promos, perLitre, price, cumulative },
  alternative: null | { promos, perLitre, price, cumulative }
}
```

`cumulative` on a package is true for a stack and false for an exclusive promo. `promos` is the list of promos in that package. `price` is the clamped effective price.

`effective()` remains a wrapper for callers that only need a price. It returns the winner's `base`, `price`, and `perLitre`. When there is no winner, `price` equals `base`, which may be null. Display and prefill use `offers()`.

## Settings

The promo form gains a checkbox labelled **Cumulative**, with the hint that it stacks with other cumulative promos and should be turned off when the promo cannot be combined. It is checked for a new promo and for any promo whose stored value is not `false`.

Saving writes `cumulative: true` or `cumulative: false`.

The promo list appends `cumulative` or `exclusive` to the existing muted description.

The card note under the list says that cumulative promos stack, an exclusive promo is compared with that stack, and stations are sorted by the better effective price.

## Station list and map

One formatter builds the promo copy for the list and the map popup.

The headline is unchanged in structure: effective price, original price struck through, and one promo badge for the winner.

| Package | Badge |
|---------|--------|
| One per-litre promo | `Promo -€0.030/L` |
| One per-fill promo | `Promo -€2.00 per fill (~-€0.050/L)` |
| Stack of per-litre promos | `Stacked -€0.030/L + -€0.020/L` |
| Stack that includes a per-fill promo | `Stacked -€0.030/L + -€2.00 per fill (~-€0.080/L)` |

Amounts use the existing `euro` and `euro3` formatters, so the examples in this section show word order and the currency symbol follows the locale. The unit follows the station, as it does today. The parenthetical total appears only when the package includes a per-fill promo, because that conversion depends on the typical fill.

The alternative is a muted line under the badge, not a second badge. It uses the same discount list and the same per-fill parenthetical, then the alternative's effective price. A single promo has no extra prefix. A stack is prefixed with `stacked`. The line is omitted when `alternative` is null.

| Alternative | Line |
|-------------|------|
| One per-litre promo | `or -€0.080/L → €1.549` |
| One per-fill promo | `or -€2.00 per fill (~-€0.050/L) → €1.650` |
| Stack | `or stacked -€0.030/L + -€0.020/L → €1.649` |

## Fill-up prefill

Add fill-up uses the winning package only.

| Winner | Price / litre field | Notes |
|--------|---------------------|--------|
| Per-litre promos only | Winning effective price | Empty |
| Any per-fill promo | Listed price minus only the exact per-litre discounts in that package, rounded once to three decimals and clamped at zero | Per-fill amounts to subtract from the total |

A per-fill-only winner prefills the listed price, which is the current behaviour. Two per-fill discounts in one stack are both listed, for example `Promo: -€2.00 + -€1.00 per fill at Galp Oriente`. A single per-fill note stays `Promo: -€2.00 per fill at Galp Oriente`.

The price per litre input and the notes textarea are the existing fields. Nothing is marked read-only. Promo math runs only while building the prefill. It does not run again on save. Saving stores the form values, including any edit. Litres, total cost, and price per litre keep the recalculation they already have, so editing one of those fields can still update the others.

## Storage and backups

No new object store and no schema version change. Export and import already read and write each promo object whole. Backup `version` stays 3.

On import, a missing `cumulative` means cumulative. An explicit `false` stays exclusive.

## Edges

- A station with no listed price shows no promo price and no promo lines.
- A discount larger than the listed price displays €0.000. The larger discount still wins.
- Several exclusive promos and no cumulative stack show only the best exclusive promo.
- Cumulative promos with nothing exclusive show only the stack.
- Both sides show the winner as the headline and the other package on the second line.

## Verification

A small Node script loads `js/prices/promos.js` with a `window` stub and asserts `offers()`:

- two cumulative per-litre promos sum, and that stack beats a smaller exclusive promo
- a larger exclusive promo wins, and the stack is the alternative
- several exclusive promos and no cumulative promo return only the best, with no alternative
- cumulative promos alone return the stack, with no alternative
- an equal discount selects the stack and keeps the exclusive promo as the alternative
- a missing `cumulative` field is cumulative
- `cumulative: false` is exclusive
- inactive, expired, and zero-amount promos are ignored
- a per-fill promo is converted with the typical fill, then added to a cumulative per-litre promo
- the displayed price clamps at zero while the larger discount still wins
- a station with no price returns no winner

In the app, check the checkbox and the cumulative / exclusive label, the station list and map popup for a stack, an exclusive winner with a second line, and an exclusive-only station with no second line. Start a fill-up from a stacked per-litre winner and from a per-fill winner, change the prefilled price and the note, and save. The stored fill-up keeps the edited values.

## Docs

Update the README brand-promo section and the `promos` object example to describe `cumulative`, stacking, the exclusive comparison, the second line, and the fill-up prefill. Add a changelog entry.

## Files

- `js/prices/promos.js` — `offers()`, cumulative flag, `effective()` wrapper
- `app.js` — promo form, list label, station and map copy, fill-up prefill
- `scripts/check-promos.js` — the Node assertions above
- `README.md`, `CHANGELOG.md`
