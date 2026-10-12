# App-shell updates

## Release consistency

The running app, HTML and service worker identify the same release:

- `app.js`: `APP_BUILD_ID` (the source of `appCacheId()` / installed version).
- `index.html`: `data-app-version` and the `v` query on shell scripts/styles.
- `config.js`: `FUELLOG_CONFIG.appCacheId`.
- `sw.js`: `CACHE` and matching script/style query values in `ASSETS`.

`appAssetUrl` adds the same release query to deferred scripts and Leaflet CSS.
`scripts/check-sw-assets.js` enforces these markers and exact shell URL matches.
When bumping a release, replace the full release identifier in those four files.
A version query prevents an older worker/HTTP cache from satisfying new runtime
URLs, but it does not prove a host has finished uploading the files.

The worker downloads the complete asset list with `Request.cache = 'reload'`,
so a fresh release cannot reuse stale browser HTTP-cache responses. `addAll`
rejects if any asset fails. It then checks the cached HTML, configuration and
application build markers before activation. A failed/inconsistent download is
rejected and its new cache removed; the installed worker remains in control.
Only after those checks does `skipWaiting` allow activation. Old FuelLog caches
are removed at activation; IndexedDB records/settings are separate and untouched.

Navigations serve the installed cached HTML alongside its cached, versioned
scripts. Fresh server HTML never overwrites an installed release. Cache lookups
are limited to that worker's release, including optional runtime assets. The
`sw.js` version-check request always goes to the network with `no-store` and is
never satisfied from Cache Storage. `.htaccess` requires revalidation of HTML,
JavaScript (both `text/javascript` and `application/javascript`), CSS and manifest
responses; the service worker still supplies the installed app offline.

## Update control

`registerFuelServiceWorker` listens for a new controller and reloads once.
`checkAppUpdate` compares the running build with the server's `sw.js` release.
A failed check is shown as unavailable, rather than confirming the latest version.

`applyPwaUpdate` activates an already waiting worker before making any network
request, allowing a downloaded update to be applied offline. During installation,
`waitForInstallingWorker` retains the worker object even after `reg.installing`
becomes null. It removes its listener on success, redundancy or timeout. A failed
update shows a persistent Settings error and re-enables the button.

If a newer worker is already active while an older page is still open,
`requestWorkerVersion` uses a bounded `GET_VERSION` / `FUELLOG_VERSION` exchange;
the page reloads into that active release. A newer version on the server alone is
not treated as proof that its download succeeded.

## Deploying and recovery

Upload all changed runtime assets, `index.html`, `config.js` and `.htaccess`, then
upload **`sw.js` last**. This avoids advertising a release before its files exist.
Release-marker validation also protects against old shell files returning HTTP
200 during an incomplete upload. After a failed installation, completing the
upload and checking for updates again retries that release.

The v43 release repairs the v41/v42 mixed-cache case without deleting local data:
legacy workers may fetch new HTML while returning old unversioned scripts, and
v42's precache could reuse those old HTTP responses. The v43 worker uses fresh
requests and distinct runtime URLs, then takes control of a verified shell.
After deploying v43, reopen the app while online to let it download and reload.
Do not clear site storage or IndexedDB to recover an app-shell update.

## Regression checks

- `node scripts/check-sw-assets.js`: files, exact versioned references and release markers.
- `node scripts/check-sw-update.js`: fresh precache, cached navigation, uncached
  update checks, version messages, rejected asset failures and inconsistent HTTP-200 shell content.
- `node scripts/check-app-update.js`: retained worker reference, offline activation,
  already-active newer worker reload, failed-install feedback and listener cleanup.
- `node scripts/browser-update.cjs`: isolated Chromium origin with synthetic data
  and 30-day HTTP caching. Reproduces v41 code in a poisoned v42 cache and an inert
  flag, upgrades to the current release, exercises failed subsequent deployment and successful retry after upload completes,
  and checks records, timestamps, metadata, language and offline reload.

The browser test starts its own temporary server and uses historical Git snapshots
`f7979bd` (v41) and `9ae345c` (v42). It needs those commits in the local history and
accepts `FUELLOG_QA_PLAYWRIGHT`, `FUELLOG_QA_CHROMIUM` and `FUELLOG_QA_OLD_REF`.
Its success does not establish Safari 12 / physical iPhone 6 / Home Screen behavior.
