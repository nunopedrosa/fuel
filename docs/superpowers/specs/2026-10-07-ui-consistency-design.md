# FuelLog UI consistency — design

**Date:** 2026-10-07  
**Status:** Design approved; Add/Save vocabulary confirmed; awaiting final spec OK before implementation plan  

**Scope:** Interface consistency cleanup + visual polish (no new product domains beyond restoring fill analysis charts)

## Goals

- Align chrome, copy, tokens, and dialogs so the five-screen PWA feels one product.
- Preserve existing constraints: local-first, no build step, dependency-free runtime (except vendored Leaflet + self-hosted Inter), iPhone 6 / iOS 12 baseline, tight 1px card density, card collapse on every card.
- Restore fill-analysis charts on Home (L/100 km and €/L).

## Non-goals

- Dark mode
- New routes / bottom-nav items
- Replacing Unicode nav glyphs with an icon library
- Theming Leaflet chrome beyond what chart/modal work already requires
- Changing Prices provider behaviour

## Decisions (locked)

| Topic | Decision |
|--------|----------|
| Topbar | Compact page titles matching nav labels |
| Fill-up vocabulary | **Add** for create CTAs; **Save** / **Update** on the form; nav stays **Fill-up** |
| Go button | Keep Maps-like green (tokenized as `--go`) |
| Card collapse | Keep on every `.card` / `.side-card` / `.hero-card` |
| Density | Keep 1px gaps |
| Dialogs | In-app modal; replace `confirm` / `alert` / `prompt` |
| Font | Self-host Inter (woff2), no third-party CDN |
| Charts | Both L/100 km trend and €/L trend on Home |
| Priority | Cleanup and polish in one implementation track |

### Why Add / Save (not Log)

- **Add** matches “create a record” and pairs with the nav noun Fill-up.
- **Save** / **Update** are standard form commit verbs once the form is open.
- **Log** as a button competes with “history” and “log in” connotations; station CTAs currently say “Log fill-up” while Home says “Add fill-up”.

## Architecture

All changes stay in the existing vanilla shell:

- `index.html` — modal host, font link/preload if needed
- `styles.css` — tokens, modal, chart, stacked fields, backup actions
- `app.js` — titles, copy, modal API, chart SVG, dialog call sites
- `fonts/` — Inter woff2 files (latin subset preferred for size)
- `sw.js` — cache Inter and any new static assets

No build step; fonts are static files served beside the app.

## 1. Topbar titles

**Behaviour**

- `#pageKicker` shows the page title only (same visual slot as today — compact, ellipsis, no extra height).
- Titles match bottom nav: `Home`, `Fill-up`, `History`, `Prices`, `Settings`.
- Exception: when editing an existing fill-up, title is `Edit fill-up`.
- Remove brand slogans (`Private by design`, `Local-first`, `Your records`, `New entry`, `{Country} · Public price data`, etc.) from the topbar.
- Document title stays `FuelLog · {title}` using the same labels.
- Prices country / provenance stays in-page (filters card / summary), not in the topbar.

**API**

- Simplify `wrap`: either `wrap(body)` with title set from `ROUTE_LABEL` / edit state in `render()`, or `wrap(title, body)` where `title` is optional override. Drop the unused second “page title” argument that is never rendered today.
- Align `ROUTE_LABEL.add` with nav: `Fill-up` (not `Add fill-up`). Suggestion mailto body uses the same labels.

## 2. Copy consistency

| Context | Copy |
|---------|------|
| Nav | Fill-up |
| Dashboard / History CTA | `+ Add fill-up` |
| History section button | `+ Add fill-up` (not `+ Add`) |
| Station list / map popup | `Add fill-up` (not `Log fill-up`) |
| Form primary (create) | `Save fill-up` |
| Form primary (edit) | `Update fill-up` |
| Empty (no data) | `No fill-ups yet.` |
| Empty (filtered) | `No matching fill-ups.` |
| Delete toast | `Fill-up deleted` (unchanged) |

Side-card helper text may keep “Add your first fill-up.” (same verb family).

## 3. Design tokens & CSS cleanup

**Tokens (extend `:root`)**

- Keep existing: `--bg`, `--card`, `--ink`, `--muted`, `--line`, `--primary`, `--primary2`, `--accent`, `--danger`, `--shadow`.
- Add `--go` ≈ `#16a34a` (current `.btn.go`; Maps-like green).
- Use tokens for field borders, status/notice/promo colours where practical without redesigning those surfaces.
- Reference `--bg` from `body` (or drop the unused variable — prefer use it).
- Use `--accent` for map highlight / promo emphasis where hardcoded `#f59e0b` appears in JS/CSS.

**Keep**

- `.chart` and related SVG rules (charts restored).
- `.btn.go` using `var(--go)`.
- 1px grid gaps; card collapse styles.

**Remove or wire**

- Unused `.price` if still unused after charts (charts use `.chart`, not `.price`).
- Prefer `.btn.danger` for modal destructive confirm; keep `.danger-link` for icon deletes that open the modal.
- Define minimal rules for `.you-paid` / `.tab-panel` if still used, or drop the class names.

**Layout polish**

- Prices stacked filters: CSS class (e.g. `.field-stack > .field + .field { margin-top: 12px }`) — no inline `style="margin-top:…"`.
- Backup export/import controls: `.form-actions` or `.actions-stack` button group, not `.list` row stacking.

## 4. Inter font

- Add `fonts/` with Inter woff2 (latin; include latin-ext if PT/ES/FR copy needs it — prefer latin + latin-ext for European station names).
- `@font-face` in `styles.css` with `font-display: swap`.
- Keep system stack as fallback after Inter.
- Preload primary woff2 from `index.html` if size is reasonable.
- Register font URLs in `sw.js` precache/cache list so offline PWA still gets Inter after first visit.
- Licence: include Inter OFL text in `fonts/LICENSE` (or project LICENSE note).

## 5. In-app dialogs

**Shell**

- Add `#modalRoot` (or similar) in `index.html`: backdrop + card, hidden by default.
- Focus trap light enough for iOS 12: focus primary button on open; Escape closes as Cancel when supported; backdrop click = Cancel.
- `aria-modal="true"`, labelled by title.

**API (Promise)**

```js
await appDialog({
  title: string,
  body: string,           // plain text or trusted HTML built by us
  confirmLabel: string,   // default 'OK'
  cancelLabel: string,    // default 'Cancel'; omit for alert-only
  danger: boolean         // styles confirm as destructive
})
// resolves true on confirm, false on cancel
```

**Call sites to replace**

| Current | Replacement |
|---------|-------------|
| `confirm('Delete this fill-up?')` | danger confirm |
| `confirm('Delete this vehicle?')` | danger confirm |
| `confirm` promo delete (if any) | danger confirm |
| `alert` vehicle has fill-ups | alert-only (OK) |
| `confirm` import merge vs replace | two-action dialog: body explains Replace vs Merge; buttons `Replace` / `Merge` (or Confirm + Cancel mapped clearly in copy) |
| `alert` iOS export Share hint | alert-only |

No `prompt()` usage required after this pass; do not introduce prompt-style free-text dialogs.

**Visual**

- Same card radius/shadow language as `.card`.
- Primary confirm uses `.btn`; destructive uses `.btn.danger`; cancel `.btn.ghost`.

## 6. Fill analysis charts

**Placement**

- Home (dashboard), below the 4-stat grid and above “Recent fill-ups”.
- One collapsible `.card` titled **Fill analysis** (collapse behaviour unchanged — every card).

**Series (both)**

1. **L/100 km** — points derived the same way as overall average: between consecutive **full-tank** fill-ups for the active vehicle (`litres accumulated / distance * 100` for each full-to-full segment). If fewer than two full tanks, show empty state inside the card: “Need at least two full-tank fill-ups for consumption.”
2. **€/L** — one point per fill-up with a finite `pricePerLitre` (or `totalCost/litres`), chronological, active vehicle. If fewer than two points, “Need at least two fill-ups with price for €/L.”

**Rendering**

- Inline SVG, reuse `.chart` / `.chart .line` / `.chart .area` / `.chart .gridline` CSS.
- Two small charts stacked in the card (each with a short label), or a simple in-card tab control (L/100 km | €/L) if vertical space is tight on iPhone 6 — **prefer stacked** for no extra JS state; keep each SVG ~140–190px tall.
- X axis: date labels sparingly (first/last or ~3 ticks).
- Y axis: muted min/max labels.
- No external chart library.
- Colours: primary teal for L/100 km; `--accent` for €/L (or both teal with different stroke styles — prefer teal + accent for distinction).

**Data helpers**

- Add `consumptionSeries(vehicleId)` and `priceSeries(vehicleId)` next to `calcMetrics` — pure functions returning `{t, y}[]`.

## 7. Error handling & compatibility

- Modal must work without `dialog` element polyfills if we use a `div`-based overlay (prefer `div` for iOS 12 certainty).
- Charts: if SVG missing points, show the empty copy; never throw.
- Font failure: system stack; no blank text.
- Service worker: update cache version when fonts/modal assets change.

## 8. Testing (manual)

- iPhone 6 / iOS 12 Safari (or closest available): Home charts, modal delete, import Replace/Merge, Inter load, topbar titles, Go still green.
- Desktop: all five routes, collapse on analysis card, offline after first load (Inter + app shell).
- Edit fill-up: topbar `Edit fill-up`; submit `Update fill-up`.
- Station card + map popup: `Add fill-up` prefill still works.

## File touch list

| File | Change |
|------|--------|
| `index.html` | Modal root; optional font preload |
| `styles.css` | Tokens, `@font-face`, modal, field-stack, backup actions, chart polish |
| `app.js` | Titles, copy, modal API, series + SVG, call sites |
| `fonts/*` | Inter woff2 + OFL |
| `sw.js` | Cache fonts / bump version |
| `CHANGELOG.md` | Unreleased notes |
| `README.md` | Only if user-facing behaviour (dialogs, charts, font) needs a sentence |

## Implementation order (for the later plan)

1. Tokens + Inter + topbar/copy (low risk, visible consistency)
2. Modal API + replace native dialogs
3. Chart series + Home card
4. CSS polish (field-stack, backup actions, dead-class cleanup)
5. SW + changelog + manual test pass

## Out of scope follow-ups (explicit)

- Unifying `.row` / `.station` / `.vehicle-card` into one list primitive
- Custom in-app dialogs for vehicle/promo forms (they already use in-page forms)
- Dark mode / Inter variable font axes beyond regular+semibold if two files suffice
