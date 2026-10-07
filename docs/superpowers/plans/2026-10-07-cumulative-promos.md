# Cumulative promos implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let brand promos be cumulative or exclusive, stack every matching cumulative promo, and show the better of that stack and the single best exclusive promo.

**Architecture:** `FuelLogPromos.offers()` in `js/prices/promos.js` is the only package chooser. `app.js` renders the winner and optional alternative, prefills a fill-up from the winner, and stores a `cumulative` boolean. A Node script asserts `offers()`.

**Tech Stack:** Vanilla JS (promos.js stays ES5 for iOS 12), IndexedDB, no build step, Node `assert` for the offer script.

**Spec:** `docs/superpowers/specs/2026-10-07-cumulative-promos-design.md`

## Global Constraints

- `cumulative === false` is exclusive. Any other value, including a missing field, is cumulative.
- Packages never mix. At most two: the cumulative stack, and the single best exclusive promo.
- Winner is the larger per-litre discount. An equal discount selects the cumulative stack.
- The second line appears only when both packages exist.
- Per-fill amounts convert with the typical fill (invalid or missing uses 40 L) before compare or add. Price is rounded once to three decimals and clamped at zero.
- Comparison uses the discount, not the clamped price.
- No listed price means `winner` and `alternative` are null.
- No IndexedDB migration. Backup version stays 3.
- Prefill uses the winner only. Price and notes stay editable. Promo math does not run again on save.
- New promo checkbox defaults on. Saving writes `true` or `false`.
- iOS 12-safe style in `promos.js` (`var` and `function`, no arrows).

## File map

| File | Responsibility |
|------|----------------|
| `js/prices/promos.js` | Match, `offers()`, `effective()` wrapper |
| `scripts/check-promos.js` | Node assertions for `offers()` and `effective()` |
| `app.js` | Promo form, list label, station and map copy, fill-up prefill |
| `README.md`, `CHANGELOG.md` | User-facing description |

---

### Task 1: Offer rule

**Files:**
- Create: `scripts/check-promos.js`
- Modify: `js/prices/promos.js`
- Test: `scripts/check-promos.js`

**Interfaces:**
- Consumes: existing `active`, `perLitre`, `matches`
- Produces: `FuelLogPromos.offers(station, canonicalFuel, promos, fillLitres)` → `{ base, winner, alternative }`
- Package: `{ promos, perLitre, price, cumulative }`
- `effective(station, canonicalFuel, promos, fillLitres)` → `{ base, price, perLitre }` where `price === base` when there is no winner

- [x] **Step 1: Write `scripts/check-promos.js`** covering the spec cases: stack beats a smaller exclusive, exclusive beats the stack, exclusive-only has no alternative, stack-only has no alternative, tie selects the stack, missing flag stacks, `false` is exclusive, inactive/expired/zero ignored, per-fill converts then adds, clamp keeps the larger discount as winner, no price returns no winner, other brand does not match, `effective()` returns the stacked price.

- [x] **Step 2: Run** `node scripts/check-promos.js` and confirm it fails because `offers` is missing.

- [x] **Step 3: Implement `offers` and point `effective` at it.** Ignore inactive, expired, non-matching, and non-positive discounts first. Cumulative promos stay in list order. Among equal exclusive discounts, the earlier promo wins. Export `offers`.

- [x] **Step 4: Re-run** `node scripts/check-promos.js` and confirm it passes.

### Task 2: Settings, station copy, fill-up prefill

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `FuelLogPromos.offers`
- Produces: checkbox `cumulative` on the promo form; badge and muted alternative from one copy helper; `logFillAt` prefills the winner

- [x] **Step 1:** Add the Cumulative checkbox, default checked unless `cumulative === false`. Save `cumulative: d.cumulative === 'on'`. Append `cumulative` or `exclusive` in `promoDesc`. Update the card note.

- [x] **Step 2:** Replace single-promo price copy with winner badge plus optional `or` / `or stacked` line on the list and the map. Sort by the winner price, or the listed price when there is no winner.

- [x] **Step 3:** `logFillAt` prefills the winning effective price when every promo is per-litre. When any promo is per-fill, prefill listed price minus only those per-litre amounts (rounded once, clamped at zero) and a note listing the per-fill amounts. Do not mark the fields read-only.

### Task 3: Docs and browser check

**Files:**
- Modify: `README.md`, `CHANGELOG.md`

- [x] **Step 1:** Document `cumulative`, stacking, the exclusive comparison, the second line, and fill-up prefill in the brand-promo section, the backup example, and the `promos` store section. Add an Unreleased changelog bullet.

- [x] **Step 2:** In the browser, save a cumulative promo and an exclusive promo, confirm the labels, and confirm a prefilled fill-up price and note can be edited. The stored fill-up keeps the edited values.

---
