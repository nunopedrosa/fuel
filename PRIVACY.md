# Privacy

FuelLog is local-first.

- Vehicle details, fill-ups, notes, preferences, user-defined brand promos and cached station-price responses are stored in the browser's IndexedDB on the user's device.
- FuelLog has no server database for personal records and does not send those records to `fuel.trekm.com`.
- There are no analytics, advertising SDKs, trackers, accounts or cookies in the application.
- Opening Prices can fetch fuel/region catalogues and national reference prices; station searches run on request from Prices or Find in the fill-up form. Cached data is reused when available. What leaves the device per provider:
  - Portugal (DGEG) / Spain (Minetur): with the station proxy enabled, the fuel choice and coordinates rounded to about 100 m are sent via POST to the site's own `api/stations.php` — not in the URL or ordinary URL access logs. The proxy code does not log or persist these coordinates; hosting infrastructure and request-body logging are controlled by the deployment. In direct mode (proxy disabled/unreachable), only the fuel type and, when required, a region/district id are sent to the public API; coordinates stay on the device and are used only for local distance filtering.
  - France (data.economie.gouv.fr): the fuel choice and coordinates rounded to about 100 m are sent inside the radius query; there is no proxy path.
  - Belgium (FPS Economy/Statbel) and Netherlands (CBS): nothing but the request itself is sent; the responses are national reference prices.
- On the Prices page, the map is always visible. While online, the user can choose a map style (OpenTopoMap, OpenStreetMap mirrors, etc.); tile requests go to that provider. Low-zoom terrain tiles are bundled in the app; additional tiles viewed online may be stored locally in IndexedDB (`mapTiles`, capped) per provider. Only the bundled tile manifest is precached at install; individual bundled tiles are cached when viewed. Offline coverage depends on cached areas. Station search snapshots may be kept in IndexedDB for offline display. Map style and centre preference are stored in settings on the device.
- Exported JSON/CSV files are created locally in the browser. Imported files are read locally. JSON backups exclude provider caches, map tiles and OCR assets.
- App-shell installation, update checks and missing static assets contact the host. Map tile URLs disclose the viewed map area to the selected tile provider; like other network requests, they also expose the requesting IP address. No vehicle or fill-up records are attached.
- Feedback opens a pre-addressed message in the user’s email application. Sending that message is the user’s choice; FuelLog does not submit it automatically.
- Receipt photos are processed locally and discarded after OCR; they are not stored with fill-ups or uploaded. The detected text is added to the editable fill-up notes and stored locally when the fill-up is saved; it can be cleared before saving. On the first scan, the browser downloads the Portuguese OCR language model from the Tesseract language-data host; the model is cached locally for later offline use. No receipt image or extracted fill-up data is sent with that download.

## User responsibility

Browser/site data can be erased by browser settings, device cleanup or private browsing. Users should keep periodic JSON backups.
