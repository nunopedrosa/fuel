# Security

FuelLog intentionally has no authentication, server database or write API. User records remain local to the browser. The only production server-side code is the optional station proxy `api/stations.php` and its `api/stations-functions.php` helper; issues in it should be reported the same way.

## Reporting

Please report security issues privately to the repository owner rather than opening a public issue with exploit details.

## Deployment notes

Serve only over HTTPS. Do not add secrets to `config.js`: it is public client-side code. Serve the vendored Leaflet and optional Tesseract scripts locally. Do not introduce remote scripts or analytics without an explicit change to the privacy model.

The station proxy uses fixed upstream URLs and validates provider, fuel, radius
and coordinates. Its Origin check compares hostnames when the header is present;
requests without Origin are accepted. It is not authentication, a strict
scheme/port origin check or rate limiting. The endpoint writes public dataset
indexes to `api/cache/`, never personal log records. Deploy `api/cache/.htaccess`
to deny direct cache-directory access and use hosting controls if abuse protection
is needed. Apache headers are not applied by GitHub Pages or PHP’s local server.

Deploy `vendor/tesseract/.htaccess` along with the OCR assets. Receipt OCR uses a
direct same-origin worker with its own response CSP. Only that worker permits
`unsafe-eval` (required for WebAssembly on Safari 12); the document keeps
`script-src 'self'`. Worker connections are limited to the same origin and
`https://tessdata.projectnaptha.com` for the public Portuguese model. Photos and
recognised text stay local. Other hosting systems must apply the equivalent CSP
to `vendor/tesseract/worker.min.js`.
