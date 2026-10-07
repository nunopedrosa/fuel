# Privacy

FuelLog is local-first.

- Vehicle details, fill-ups, notes, preferences, user-defined brand promos and cached station-price responses are stored in the browser's IndexedDB on the user's device.
- FuelLog has no application database and does not send those records to `fuel.trekm.com`.
- There are no analytics, advertising SDKs, trackers, accounts or cookies in the application.
- When the user explicitly opens the price finder and requests prices, the browser contacts a public fuel-price provider. What leaves the device per provider:
  - Portugal (DGEG) / Spain (Minetur): with the station proxy enabled, the fuel choice and coordinates rounded to about 100 m are sent via POST to the site's own `api/stations.php` — not in the URL, so they do not appear in access logs — and are never stored there. In direct mode (proxy disabled/unreachable), only the fuel type and, when required, a region/district id are sent to the public API; coordinates stay on the device and are used only for local distance filtering.
  - France (data.economie.gouv.fr): the fuel choice and coordinates rounded to about 100 m are sent inside the radius query; there is no proxy path.
  - Belgium (FPS Economy/Statbel) and Netherlands (CBS): nothing but the request itself is sent; the responses are national reference prices.
- When the user opens the Map tab on the Prices page, map tile images are requested from `tile.openstreetmap.org`. Loading tiles necessarily reveals the viewed map area and the user's IP address to OpenStreetMap's tile service. No location is stored.
- Exported JSON/CSV files are created locally in the browser. Imported files are read locally.

## User responsibility

Browser/site data can be erased by browser settings, device cleanup or private browsing. Users should keep periodic JSON backups.
