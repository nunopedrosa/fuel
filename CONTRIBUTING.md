# Contributing

FuelLog is deliberately small and dependency-free. Please preserve these design goals:

1. Personal data stays on-device by default.
2. No account or backend is required for core logging.
3. Network requests happen only for explicitly requested public information such as fuel prices.
4. Avoid frameworks, CDNs and third-party runtime dependencies unless they provide a clear benefit that justifies the added network/privacy cost.
5. Keep JSON backup compatibility. If the schema changes, add an explicit migration path and bump the backup version.
6. Test the PWA both online and offline before submitting a change.
