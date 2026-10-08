# Fill analysis explorer implementation plan

> **For agentic workers:** Use superpowers:executing-plans for native execution of the user's approved in-chat design.

**Goal:** Explore local fill history with linked period controls, informative charts, inspection and zoom.
**Architecture:** Add a pure analysis module beside shared data semantics and a focused UI module. Replace the existing analysis card through a narrow app adapter; no storage changes or dependencies.
**Tech Stack:** Safari 12 compatible JavaScript, SVG, CSS, native range inputs.
**Spec:** Approved design in this chat, recorded below for implementation.

## Global constraints and agreed design

Minimum device: iPhone 6 running iOS 12.5.7 / Safari 12, including Home Screen PWA. Local/offline only, no build step or new runtime dependencies. Period position and length sliders, exact dates, 1/3/6/12-month and all-history shortcuts. Summary: weighted consumption, completed distance, purchased litres, spending and weighted price paid (currencies separate), usable interval count. Tabs: consumption with distance-weighted rolling trend, price paid, monthly purchases (litres and cost separate), urban versus consumption. Compare summary against immediately preceding equal-duration period. Expand chart with linked +/-/Reset zoom. Tap or keyboard inspection. Brief reveal/transition, disabled by Reduce Motion. Optional pinch gestures deferred; buttons provide complete zoom support.

Consumption intervals are built from whole history by FuelLogData.intervals, then selected if both endpoints fall within inclusive selected dates. Boundary-crossing intervals are counted and explained, never clipped. Purchase summaries use inclusive dates. The previous equal-duration range ends one millisecond before selected start. Urban fraction is distance weighted across fill segments excluding starting full fill; missing/invalid/nonpositive-distance segments remain unknown. Only fully profiled intervals appear in scatter; known-distance coverage across selected intervals is shown. Outliers remain visible with warnings. Scale defaults to full-history stable domain, optional automatic scale. All computations retain raw precision. Render at most 160 sampled interval/price observations (retain extrema and endpoints); exact summaries use all data, sampled status visible; monthly series aggregate to at most 60 chronological buckets labelled with exact ranges. Single/no observation states remain usable.

## Review focus

- Partial fills and boundary-crossing intervals must never be clipped or invent consumption.
- Currency mixtures and missing prices must not be combined or recorded as zero.
- Missing urban profiles and zero values must remain distinguishable.
- Long and empty histories, equal timestamps and warning outliers must not break SVG or controls.
- Phone layout, keyboard inspection, offline loading and modal focus must remain usable.

### Task 1: Pure analysis semantics

Files: `js/analysis.js`, `scripts/check-analysis.js`.
Interface: FuelLogAnalysis.prepare(fills, vehicles) -> model; select(model,start,end) -> purchases/intervals/summary/coverage; sample(points,limit) -> bounded points; windowFor(model,days,position) -> dates.
- [x] Write failing fixture checks for completed intervals/partial fills, weights, boundaries, mixed currencies, profile coverage, equal-date/empty windows and bounded extrema-preserving sampling.
- [x] Run checks; implement pure helpers; confirm inputs unchanged and all checks pass.

### Task 2: Explorer UI and app integration

Files: `js/analysis-ui.js`, `app.js`, `styles.css`, `index.html`, `sw.js`.
Interface: FuelLogAnalysisUI.render(model) -> card markup; mount(root,model) -> event wiring. App supplies vehicle-specific model to render/mount after dashboard renders. Ephemeral selection per vehicle; no personal uploads.
- [x] Write browser assertions for period controls, summary update, tabs/currency isolation, touch and keyboard inspection, expand/linked zoom, reset/close focus, and one-point/empty states.
- [x] Implement linked controls, timeline, summary/comparison, bounded SVG and detail panels; native touch/keyboard handling; accessible expanded dialog with focus management. Motion optional, drag immediate, full history scales default.
- [x] Add cached scripts and bump cache/style version. Run browser tests online/offline at 375 and 320px; inspect screenshots; confirm no page errors.

### Task 3: Documentation, verification and review

Files: README, COMPATIBILITY, CODEMAP, TESTING, CI.
- [x] Document data rules, profiles, period controls, chart sampling and zoom.
- [x] Run every check-*.js, syntax/API scans, manifest validation and proxy checks; run git diff --check.
- [x] Request independent code review of analysis change; resolve findings, repeat affected checks, report Safari12/physical-device limitations.

## Execution record

Implemented natively on `codex/analysis-explorer`, preserving existing urban-slider
working changes. Independent review identified vehicle-currency fallback, zero-span
and edge-month geometry, zero-distance profile coverage and formatting before
sampling. Each received a failing regression and a passing fix. Formatting is
bounded after sampling; expanded rendering reuses the same chart result.

Ruling: fixed-duration sliders use days; month shortcuts use calendar months with
month-end clamping. Pinch gestures remain optional/deferred; zoom buttons supply
the agreed required interaction. No storage schema or backup version change is
needed because analysis reads existing records and keeps selection ephemeral.
