# Public-release review

Reviewed for a public, non-commercial, local-first deployment.

## Changes made

- Removed the required DreamHost PHP price proxy from the default application.
- DGEG price requests now originate directly from the user's browser and only after an explicit search.
- Added a 15-minute IndexedDB cache for station-price search responses.
- Increased the local cache for fuel-type reference data to 30 days.
- Changed the service worker so only same-origin static assets are cached; DGEG responses are not placed in Cache Storage and navigation has a correct offline fallback.
- Added `config.js`; it contains only public runtime settings and no secrets.
- Added privacy/security documentation and explicit local-first contribution rules.
- Added security and cache headers for DreamHost/Apache.
- Added MIT license, `.gitignore`, and GitHub Actions syntax/manifest checks.
- Confirmed there are no bundled third-party JavaScript libraries, trackers, analytics, API keys, passwords, tokens, or server credentials.
- Added an iPhone 6 / iOS 12.5.7 compatibility pass, removing unsupported modern JavaScript syntax/APIs and adding Apple PWA metadata.
- Added multi-format local import for FuelLog JSON, generic JSON, CSV, semicolon CSV, TSV and delimited TXT.
- Added a 5 MB per-file import guard for old-device memory safety.
- Added district-filtered DGEG price search; iOS 12 requires a district to avoid downloading roughly 3,000 station rows for one fuel type.
- Added an iOS 12 export fallback for browsers without reliable generated-file download support.

## Hosting behavior

The server normally sees only requests for the small static application files. Once the PWA/service worker is installed, those assets are served from the device cache. Fuel-log records and imports/exports do not touch the server.

The price finder contacts DGEG directly. The host is not a relay and cannot be abused as an open DGEG proxy.

## Remaining considerations

- Browser storage can be cleared; JSON backups remain important.
- DGEG availability and browser CORS behavior are external dependencies. `config.js` preserves an optional future proxy setting, but it is disabled by default.
- The `.htaccess` security headers apply on DreamHost/Apache, not GitHub Pages.
- DGEG data/usage terms remain separate from the MIT license for the application source and artwork.
