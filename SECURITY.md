# Security

FuelLog intentionally has no authentication, server database or write API. User records remain local to the browser. The only server-side code is the optional read-only station proxy `api/stations.php`; issues in it should be reported the same way.

## Reporting

Please report security issues privately to the repository owner rather than opening a public issue with exploit details.

## Deployment notes

Serve only over HTTPS. Do not add secrets to `config.js`: it is public client-side code. Keep third-party scripts and analytics disabled unless the privacy model is intentionally changed and documented.
