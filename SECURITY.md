# Security

FuelLog intentionally has no authentication, server database or write API. User records remain local to the browser. The only server-side code is the optional read-only station proxy `api/stations.php`; issues in it should be reported the same way.

## Reporting

Please report security issues privately to the repository owner rather than opening a public issue with exploit details.

## Deployment notes

Serve only over HTTPS. Do not add secrets to `config.js`: it is public client-side code. Keep third-party scripts and analytics disabled unless the privacy model is intentionally changed and documented.

Deploy `vendor/tesseract/.htaccess` along with the OCR assets. Receipt OCR uses a
direct same-origin worker with its own response CSP. Only that worker permits
`unsafe-eval` (required for WebAssembly on Safari 12); the document keeps
`script-src 'self'`. Worker connections are limited to the same origin and
`https://tessdata.projectnaptha.com` for the public Portuguese model. Photos and
recognised text stay local. Other hosting systems must apply the equivalent CSP
to `vendor/tesseract/worker.min.js`.
