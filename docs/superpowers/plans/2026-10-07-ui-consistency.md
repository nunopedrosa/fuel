# UI Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align FuelLog’s chrome, copy, tokens, dialogs, Inter font, and Home fill-analysis charts so the five-screen PWA feels consistent without leaving the vanilla, no-build, iOS 12 constraints.

**Architecture:** Keep the existing shell (`index.html` + `styles.css` + `app.js`). Add a Promise-based `div` modal, self-hosted Inter under `fonts/`, pure series helpers + inline SVG charts on Home, and tighten tokens/copy. No new frameworks or CDN fonts.

**Tech Stack:** Vanilla JS, CSS custom properties, IndexedDB (`FuelDB`), service worker cache, vendored Leaflet (unchanged behaviour), Inter OFL woff2.

**Spec:** `docs/superpowers/specs/2026-10-07-ui-consistency-design.md`

## Global Constraints

- iPhone 6 / iOS 12.5.7 remains the minimum compatibility target.
- No build step; no npm runtime dependencies for the app.
- No third-party font CDN (privacy / offline).
- Keep 1px card density and card collapse on every `.card` / `.side-card` / `.hero-card`.
- Keep Maps-like green Go via `--go` (≈ `#16a34a`).
- Fill-up vocabulary: **Add** for create CTAs; **Save** / **Update** on the form; nav **Fill-up**.
- Topbar titles match nav; no brand slogans in `#pageKicker`.
- Charts: both L/100 km (full-tank segments) and €/L on Home.
- Prefer `div` modal over `<dialog>` for iOS 12 certainty.

---

## File map

| File | Responsibility |
|------|----------------|
| `index.html` | Modal root markup; optional Inter preload |
| `styles.css` | Tokens, `@font-face`, modal, field-stack, actions-stack, chart accent, `.btn.go` |
| `app.js` | Titles/copy, `appDialog`, series + SVG, dialog call sites, map colour tokens |
| `fonts/Inter-*.woff2` + `fonts/OFL.txt` | Self-hosted Inter |
| `sw.js` | Bump cache name; precache font files |
| `CHANGELOG.md` | Unreleased notes |
| `README.md` | Short note on charts / in-app dialogs if needed |

---

### Task 1: Tokens, Inter font, Go token

**Files:**
- Create: `fonts/Inter-Regular.woff2`, `fonts/Inter-SemiBold.woff2` (or `Inter-Bold.woff2` if SemiBold unavailable), `fonts/OFL.txt`
- Modify: `styles.css` (top of file `:root` and `@font-face`)
- Modify: `index.html` (optional `<link rel="preload">` for Regular)
- Modify: `sw.js` (later Task 6 also bumps cache — include fonts in ASSETS here or Task 6; do both in Task 6 if preferred, but add files now)

**Interfaces:**
- Produces: CSS vars `--go`, usable `--bg` / `--accent`; Inter loaded via `@font-face`
- Consumes: none

- [ ] **Step 1: Obtain Inter woff2 files**

Download official Inter release assets (OFL) from https://github.com/rsms/inter/releases (or google/fonts `ofl/inter`). Copy into the repo:

```text
fonts/Inter-Regular.woff2
fonts/Inter-SemiBold.woff2
fonts/OFL.txt
```

Prefer latin + latin-ext subsets if using a subsetter; otherwise full Inter static faces are acceptable if each file stays under ~100KB. Do not add a Google Fonts `<link>`.

- [ ] **Step 2: Add `@font-face` and tokens in `styles.css`**

At the top of `styles.css`, prepend font faces and extend `:root` (merge into existing `:root` — do not duplicate):

```css
@font-face{
  font-family:Inter;
  font-style:normal;
  font-weight:400;
  font-display:swap;
  src:url("fonts/Inter-Regular.woff2") format("woff2");
}
@font-face{
  font-family:Inter;
  font-style:normal;
  font-weight:600;
  font-display:swap;
  src:url("fonts/Inter-SemiBold.woff2") format("woff2");
}
@font-face{
  font-family:Inter;
  font-style:normal;
  font-weight:700;
  font-display:swap;
  src:url("fonts/Inter-SemiBold.woff2") format("woff2");
}
```

In `:root`, ensure (exact values):

```css
:root{
  --bg:#f4f7f6;
  --card:#fff;
  --ink:#10201d;
  --muted:#6b7c78;
  --line:#dce7e4;
  --primary:#0f766e;
  --primary2:#14b8a6;
  --accent:#f59e0b;
  --go:#16a34a;
  --danger:#b91c1c;
  --shadow:0 12px 30px rgba(15,118,110,.08);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  color-scheme:light;
}
```

Update:

```css
body{margin:0;background:linear-gradient(180deg,#eaf7f3 0,var(--bg) 260px);color:var(--ink);min-height:100vh}
.btn.go{background:var(--go);color:#fff}
.field input,.field select,.field textarea{border:1px solid var(--line);/* was #cbdad6 */}
```

Map highlight in JS still uses hex until Task 5; CSS `.promo` may keep amber backgrounds for now.

- [ ] **Step 3: Preload Regular in `index.html`**

Inside `<head>`, after existing icon links:

```html
<link rel="preload" href="fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin />
```

- [ ] **Step 4: Manual verify font**

Serve locally (e.g. `python3 -m http.server 8080` from repo root). Open Home. DevTools → Network: `Inter-Regular.woff2` loads 200. Computed `font-family` on `body` starts with `Inter`.

- [ ] **Step 5: Commit**

```bash
git add fonts/ styles.css index.html
git commit -m "$(cat <<'EOF'
Add self-hosted Inter and --go design token.

EOF
)"
```

---

### Task 2: Topbar titles and Add/Save copy

**Files:**
- Modify: `app.js` (`ROUTE_LABEL`, `wrap`, `dashboard`, `fillForm`, `history`, `prices`, `settingsPage`, `stationHtml`, `popupHtml`, `render`)

**Interfaces:**
- Consumes: nav labels Home / Fill-up / History / Prices / Settings
- Produces: `wrap(body)` or `wrap(titleOverride, body)`; `ROUTE_LABEL.add === 'Fill-up'`; page title overrides for edit

- [ ] **Step 1: Align `ROUTE_LABEL` and simplify `wrap`**

Replace:

```js
const ROUTE_LABEL={dashboard:'Home',add:'Add fill-up',history:'History',prices:'Prices',settings:'Settings'};
function wrap(kicker,title,body){state.pageKicker=kicker;return body}
```

With:

```js
const ROUTE_LABEL={dashboard:'Home',add:'Fill-up',history:'History',prices:'Prices',settings:'Settings'};
function wrap(body){return body}
function pageTitle(){
  if(state.route==='add'&&state.editing&&state.editing.id)return 'Edit fill-up';
  return ROUTE_LABEL[state.route]||'';
}
```

- [ ] **Step 2: Update all screen builders**

Change every `return wrap('…','…', \`...\`)` to `return \`...\`` (drop wrap args) or `return wrap(\`...\`)`.

Copy fixes (exact strings):

| Location | Old | New |
|----------|-----|-----|
| `history()` CTA | `+ Add` | `+ Add fill-up` |
| `history()` empty | `Nothing logged yet.` | `No fill-ups yet.` |
| `filterHistory` empty | `No matching entries.` | `No matching fill-ups.` |
| `stationHtml` / `popupHtml` button | `Log fill-up` | `Add fill-up` |
| `fillForm` submit button | always `Save fill-up` | create: `Save fill-up`; edit: `Update fill-up` |

Fill form submit button example:

```js
`<button class="btn">${f.id?'Update fill-up':'Save fill-up'}</button>`
```

Dashboard CTA already says `+ Add fill-up` — leave it. Empty `No fill-ups yet.` already OK on dashboard.

- [ ] **Step 3: Set topbar from `pageTitle()` in `render`**

```js
function render(){
  const app=$('#app');
  // ... route renders unchanged except wrap calls ...
  wireCommon();updateSuggestBtn();wireCardToggles();
  const title=pageTitle();
  const pk=$('#pageKicker');
  if(pk)pk.textContent=title;
  document.title='FuelLog'+(title?' · '+title:'');
}
```

Remove any remaining `state.pageKicker` assignments.

- [ ] **Step 4: Manual verify titles/copy**

- Each nav item: topbar matches nav small label.
- Open edit fill-up: topbar `Edit fill-up`, button `Update fill-up`.
- Prices station + map popup: `Add fill-up`.
- History empty and filtered empties use the new strings.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "$(cat <<'EOF'
Align topbar titles with nav and standardize Add/Save copy.

EOF
)"
```

---

### Task 3: In-app `appDialog` modal

**Files:**
- Modify: `index.html` (modal root before `#toast`)
- Modify: `styles.css` (modal styles)
- Modify: `app.js` (`appDialog` + replace `confirm`/`alert`)

**Interfaces:**
- Produces:

```js
/**
 * @param {{title:string, body:string, confirmLabel?:string, cancelLabel?:string|null, danger?:boolean}} opts
 * @returns {Promise<boolean>} true if confirm, false if cancel/dismiss
 */
function appDialog(opts)
```

- Consumes: `#modalRoot` markup

- [ ] **Step 1: Add modal markup to `index.html`**

Before `<div id="toast"…>`:

```html
<div id="modalRoot" class="modal-root hidden" aria-hidden="true">
  <div class="modal-backdrop" data-modal-cancel></div>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <h2 id="modalTitle" class="modal-title"></h2>
    <div id="modalBody" class="modal-body"></div>
    <div class="modal-actions form-actions">
      <button type="button" id="modalCancel" class="btn ghost">Cancel</button>
      <button type="button" id="modalConfirm" class="btn">OK</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add modal CSS to `styles.css`**

```css
.modal-root{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:18px}
.modal-root.hidden{display:none!important}
.modal-backdrop{position:absolute;inset:0;background:rgba(16,32,29,.45)}
.modal-card{position:relative;z-index:1;width:min(100%,420px);background:var(--card);border:1px solid var(--line);border-radius:6px;padding:20px;box-shadow:var(--shadow)}
.modal-title{margin:0 0 10px;font-size:19px}
.modal-body{font-size:14px;color:var(--ink);line-height:1.45;white-space:pre-wrap}
.modal-actions{margin-top:18px}
```

- [ ] **Step 3: Implement `appDialog` in `app.js`**

Place near `toast` / helpers:

```js
function appDialog(opts){
  const root=$('#modalRoot'),title=$('#modalTitle'),body=$('#modalBody'),ok=$('#modalConfirm'),cancel=$('#modalCancel');
  if(!root)return Promise.resolve(false);
  title.textContent=opts.title||'';
  body.textContent=opts.body||'';
  ok.textContent=opts.confirmLabel||'OK';
  ok.className='btn'+(opts.danger?' danger':'');
  const showCancel=opts.cancelLabel!==null;
  cancel.classList.toggle('hidden',!showCancel);
  if(showCancel)cancel.textContent=opts.cancelLabel||'Cancel';
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden','false');
  ok.focus();
  return new Promise(resolve=>{
    const finish=v=>{
      root.classList.add('hidden');
      root.setAttribute('aria-hidden','true');
      root.removeEventListener('click',onClick);
      document.removeEventListener('keydown',onKey);
      resolve(v);
    };
    const onClick=e=>{
      if(e.target===ok)finish(true);
      else if(e.target===cancel||e.target.hasAttribute('data-modal-cancel'))finish(false);
    };
    const onKey=e=>{if(e.key==='Escape'&&showCancel)finish(false)};
    root.addEventListener('click',onClick);
    document.addEventListener('keydown',onKey);
  });
}
```

Note: use `textContent` for `body` (plain text). For import dialog, put Replace/Merge explanation in plain text.

- [ ] **Step 4: Replace native dialogs**

**Delete fill-up** (both places in `wireCommon` / `filterHistory`):

```js
b.onclick=async()=>{
  if(!await appDialog({title:'Delete fill-up',body:'Delete this fill-up? This cannot be undone.',confirmLabel:'Delete',danger:true}))return;
  await FuelDB.del('fillups',b.dataset.delete);
  await refresh();render();toast('Fill-up deleted');
};
```

**Vehicle delete:**

```js
if(state.fillups.some(f=>f.vehicleId===id)){
  await appDialog({title:'Cannot delete',body:'Delete this vehicle’s fill-ups first.',confirmLabel:'OK',cancelLabel:null});
  return;
}
if(!await appDialog({title:'Delete vehicle',body:'Delete this vehicle?',confirmLabel:'Delete',danger:true}))return;
```

**Promo delete:** same pattern as fill-up with title `Delete promo`.

**Import mode** in `importData` — replace `confirm(...)` with:

```js
const replace=await appDialog({
  title:'Import mode',
  body:'Replace removes local vehicles and fill-ups first.\nMerge keeps existing data and adds imported rows.',
  confirmLabel:'Replace',
  cancelLabel:'Merge'
});
// replace===true → Replace; false → Merge (user dismissed/Merge)
```

If user dismisses via backdrop, treat as Merge (`false`) — document in changelog.

**iOS export** in `download`:

```js
setTimeout(()=>appDialog({title:'Export',body:'On this iPhone, use Safari Share to save or copy the exported '+name+'.',confirmLabel:'OK',cancelLabel:null}),150);
```

**Prices region alerts** in `wirePrices` (two `alert('Choose a region…')` sites):

```js
await appDialog({title:'Choose a region',body:'Choose a region first. This keeps the download small enough for reliable use.',confirmLabel:'OK',cancelLabel:null});
```

Ensure those click handlers are `async`.

- [ ] **Step 5: Manual verify modal**

- Delete fill-up: modal appears; Cancel keeps row; Delete removes.
- Vehicle with fill-ups: alert-only OK.
- Import: Replace vs Merge buttons work.
- Escape / backdrop cancels when Cancel visible.
- No remaining `confirm(` / `alert(` in `app.js` (grep).

```bash
rg "confirm\(|alert\(|prompt\(" app.js
```

Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css app.js
git commit -m "$(cat <<'EOF'
Replace native dialogs with an in-app modal.

EOF
)"
```

---

### Task 4: Fill analysis series + SVG charts

**Files:**
- Modify: `app.js` (`consumptionSeries`, `priceSeries`, `sparklineSvg`, `analysisCard`, `dashboard`)
- Modify: `styles.css` (optional `.chart.accent` stroke using `--accent`)

**Interfaces:**
- Produces:

```js
function consumptionSeries(vehicleId) // -> [{t:number /* ms */, y:number}, ...]
function priceSeries(vehicleId)      // -> [{t:number, y:number}, ...]
function sparklineSvg(points, opts)  // opts: {accent?:boolean, yLabel?:string} -> HTML string
function analysisCard(vehicleId)     // -> HTML string for one .card
```

- Consumes: `vehicleFillups`, `calcMetrics` full-tank logic, existing `.chart` CSS

- [ ] **Step 1: Add series helpers next to `calcMetrics`**

```js
function consumptionSeries(vehicleId){
  const fs=vehicleFillups(vehicleId),out=[];
  let lastFull=null,acc=0;
  for(const f of fs){
    acc+=Number(f.litres||0);
    if(f.fullTank){
      if(lastFull){
        const dist=Number(f.odometer)-Number(lastFull.odometer);
        if(dist>0)out.push({t:new Date(f.date).getTime(),y:acc/dist*100});
      }
      lastFull=f;acc=0;
    }
  }
  return out;
}
function priceSeries(vehicleId){
  return vehicleFillups(vehicleId).map(f=>{
    const y=Number(f.pricePerLitre!=null?f.pricePerLitre:(f.litres?f.totalCost/f.litres:NaN));
    return {t:new Date(f.date).getTime(),y};
  }).filter(p=>isFinite(p.y)&&p.y>0);
}
```

- [ ] **Step 2: Add SVG builder**

Reuse `.chart` classes. Width 320 viewBox, height 160. Minimal implementation:

```js
function sparklineSvg(points,opts){
  opts=opts||{};
  if(!points||points.length<2)return '';
  const w=320,h=160,pad=28;
  const xs=points.map(p=>p.t),ys=points.map(p=>p.y);
  const minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs);
  const minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
  const spanX=maxX-minX||1,spanY=maxY-minY||1;
  const coord=(p)=>({
    x:pad+(p.t-minX)/spanX*(w-2*pad),
    y:h-pad-(p.y-minY)/spanY*(h-2*pad)
  });
  const pts=points.map(coord);
  const line=pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
  const area=line+' L'+pts[pts.length-1].x.toFixed(1)+','+(h-pad)+' L'+pts[0].x.toFixed(1)+','+(h-pad)+' Z';
  const cls=opts.accent?'chart chart-accent':'chart';
  const yLo=minY.toFixed(2),yHi=maxY.toFixed(2);
  const d0=dateLabel(new Date(minX).toISOString()),d1=dateLabel(new Date(maxX).toISOString());
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(opts.yLabel||'Chart')}"><path class="gridline" d="M${pad} ${pad} H${w-pad}"/><path class="gridline" d="M${pad} ${h-pad} H${w-pad}"/><path class="area" d="${area}"/><path class="line" d="${line}"/><text x="${pad}" y="14">${yHi}</text><text x="${pad}" y="${h-6}">${yLo}</text><text x="${pad}" y="${h-pad+14}">${esc(d0)}</text><text x="${w-pad}" y="${h-pad+14}" text-anchor="end">${esc(d1)}</text></svg>`;
}
```

Add CSS:

```css
.chart-accent .line{stroke:var(--accent)}
.chart-accent .area{fill:rgba(245,158,11,.12)}
.chart-block{margin-top:14px}
.chart-block h3{margin:0 0 8px;font-size:14px}
```

- [ ] **Step 3: Build `analysisCard` and insert into `dashboard`**

```js
function analysisCard(vehicleId){
  const cons=consumptionSeries(vehicleId),price=priceSeries(vehicleId);
  const consHtml=cons.length>=2
    ?`<div class="chart-block"><h3>L/100 km</h3>${sparklineSvg(cons,{yLabel:'L/100 km'})}</div>`
    :`<div class="chart-block"><h3>L/100 km</h3><p class="muted">Need at least two full-tank fill-ups for consumption.</p></div>`;
  const priceHtml=price.length>=2
    ?`<div class="chart-block"><h3>€/L</h3>${sparklineSvg(price,{accent:true,yLabel:'€/L'})}</div>`
    :`<div class="chart-block"><h3>€/L</h3><p class="muted">Need at least two fill-ups with price for €/L.</p></div>`;
  return `<div class="card"><h2>Fill analysis</h2>${consHtml}${priceHtml}</div>`;
}
```

In `dashboard()`, after the stats `.grid` and before Recent fill-ups `section-head`, insert `${analysisCard(v.id)}`.

- [ ] **Step 4: Manual verify charts**

- Vehicle with ≥2 full tanks: L/100 km line appears.
- Vehicle with ≥2 priced fill-ups: €/L amber line appears.
- Sparse data: muted empty messages, no thrown errors.
- Card has collapse control (existing `wireCardToggles`).

- [ ] **Step 5: Commit**

```bash
git add app.js styles.css
git commit -m "$(cat <<'EOF'
Restore Home fill analysis charts for L/100 km and €/L.

EOF
)"
```

---

### Task 5: CSS polish and map token colours

**Files:**
- Modify: `styles.css` (`.field-stack`, `.actions-stack`, remove unused `.price` if still unused)
- Modify: `app.js` (`prices()` filters markup, `settingsPage` backup block, map marker colours)

**Interfaces:**
- Consumes: `--accent`, `--primary`, `--primary2`, `--go`
- Produces: no new JS API

- [ ] **Step 1: Add layout utility classes**

```css
.field-stack>.field+.field{margin-top:12px}
.actions-stack{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.actions-stack .btn,.actions-stack label.btn{width:100%;text-align:center}
.you-paid{/* inherits .meta; optional */}
```

Remove unused `.price{font-weight:850}` if grep shows no `class="price"`.

- [ ] **Step 2: Update `prices()` filter card**

Wrap country/region/fuel/radius fields in `<div class="field-stack">` and remove inline `style="margin-top:12px"` / `style="width:100%;margin-top:16px"`.

- [ ] **Step 3: Update Settings backup + feedback inline styles**

Replace backup `<div class="list">…buttons…</div>` with `<div class="actions-stack">…</div>`.

Replace promo typical-fill `style="margin-top:12px"` with `class="field"` inside a stack or `field-stack`.

Replace Feedback `style="padding-top:0"` with a class:

```css
.switchline.tight{padding-top:0}
```

- [ ] **Step 4: Map markers use CSS-aligned hex from tokens**

In `updateUserMarker` / `updateMap`, keep hex literals that match tokens (JS cannot read CSS vars reliably for Leaflet without getComputedStyle — acceptable to hardcode matching values):

```js
fillColor:'#2563eb' // user — keep (outside brand; documented)
fillColor:state.searchCenter&&i===0?'#f59e0b'/* --accent */:'#14b8a6'/* --primary2 */
color:'#0f766e'/* --primary */
```

No behaviour change.

- [ ] **Step 5: Manual verify layout**

- Prices filters stacked without inline styles.
- Settings backup buttons spaced as a column group, not 1px list rows.
- Grep: `style="margin-top` near zero in app templates (except any unavoidable Leaflet).

- [ ] **Step 6: Commit**

```bash
git add styles.css app.js
git commit -m "$(cat <<'EOF'
Polish field stacks, backup actions, and token-aligned map colours.

EOF
)"
```

---

### Task 6: Service worker, changelog, README

**Files:**
- Modify: `sw.js`
- Modify: `CHANGELOG.md`
- Modify: `README.md` (short)

**Interfaces:**
- Produces: new cache name including fonts

- [ ] **Step 1: Update `sw.js`**

```js
const CACHE='fuellog-v12-ui';
const ASSETS=[
  './','index.html','styles.css','config.js','db.js','app.js','manifest.webmanifest',
  'icons/icon.svg','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png',
  'fonts/Inter-Regular.woff2','fonts/Inter-SemiBold.woff2',
  'js/prices/fuels.js','js/prices/providers.js','js/prices/promos.js',
  'js/prices/providers/pt-dgeg.js','js/prices/providers/es-minetur.js',
  'js/prices/providers/fr-government.js','js/prices/providers/be-fps.js','js/prices/providers/nl-cbs.js',
  'vendor/leaflet/leaflet.js','vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/marker-icon.png','vendor/leaflet/images/marker-icon-2x.png',
  'vendor/leaflet/images/marker-shadow.png','vendor/leaflet/images/layers.png',
  'vendor/leaflet/images/layers-2x.png'
];
```

(Adjust font filenames if Step 1 used different names.)

- [ ] **Step 2: Changelog under Unreleased**

```markdown
### UI

- Topbar page titles now match bottom navigation (Edit fill-up when editing).
- Standardized fill-up copy to Add / Save / Update; station actions say Add fill-up.
- Replaced native confirm/alert with in-app dialogs.
- Bundled Inter locally; added `--go` token for Maps-like navigation buttons.
- Restored Home Fill analysis charts (L/100 km and €/L).
```

- [ ] **Step 3: README**

In the feature / Home section, add one sentence that Home shows Fill analysis charts for consumption and €/L when enough data exists, and that destructive actions use in-app dialogs.

- [ ] **Step 4: Offline verify**

Hard-refresh once online so SW installs v12. Go offline. Reload: shell + Inter still available from cache.

- [ ] **Step 5: Commit**

```bash
git add sw.js CHANGELOG.md README.md
git commit -m "$(cat <<'EOF'
Cache Inter fonts and document the UI consistency refresh.

EOF
)"
```

---

### Task 7: Full manual regression

**Files:** none (verification only)

- [ ] **Step 1: Run checklist**

| Check | Pass? |
|-------|-------|
| Topbar titles match nav on all 5 routes | |
| Edit fill-up title + Update button | |
| Add fill-up on station + popup | |
| Modal delete fill-up / vehicle / promo | |
| Import Replace vs Merge | |
| Region-required alert via modal | |
| Inter loads; fallback if font blocked | |
| Go button still green | |
| Collapse on analysis card + forms | |
| Charts: empty + populated states | |
| 1px density unchanged | |
| `rg "confirm\\(|alert\\(|prompt\\(" app.js` empty | |
| SW cache includes fonts | |

- [ ] **Step 2: Final commit only if Task 7 found fixes**

Otherwise stop; implementation complete.

---

## Spec coverage (self-review)

| Spec section | Task |
|--------------|------|
| Topbar titles | Task 2 |
| Add/Save copy | Task 2 |
| Tokens / `--go` / `--bg` / `--accent` | Tasks 1, 5 |
| Inter bundle | Tasks 1, 6 |
| In-app dialogs | Task 3 |
| Charts L/100 km + €/L | Task 4 |
| field-stack / backup actions | Task 5 |
| Keep collapse + density + green Go | Constraints + Tasks 1–4 |
| SW + changelog | Task 6 |
| Manual testing | Tasks 1–7 |

**Placeholder scan:** none intentional.  
**Type consistency:** `appDialog` → boolean; series → `{t,y}[]`; `sparklineSvg` / `analysisCard` HTML strings.
