# Privacy

FuelLog is local-first.

- Vehicle details, fill-ups, notes, preferences and cached station-price responses are stored in the browser's IndexedDB on the user's device.
- FuelLog has no application database and does not send those records to `fuel.trekm.com`.
- There are no analytics, advertising SDKs, trackers, accounts or cookies in the application.
- When the user explicitly opens the price finder and requests prices, the browser contacts the Portuguese DGEG fuel-price API directly.
- If nearby search is selected, browser geolocation is used in memory to calculate distance. Coordinates are not persisted by FuelLog and are not sent to `fuel.trekm.com`.
- When the user opens the Map tab on the Prices page, map tile images are requested from `tile.openstreetmap.org`. Loading tiles necessarily reveals the viewed map area and the user's IP address to OpenStreetMap's tile service. No location is stored.
- Exported JSON/CSV files are created locally in the browser. Imported files are read locally.

## User responsibility

Browser/site data can be erased by browser settings, device cleanup or private browsing. Users should keep periodic JSON backups.
