# Synthetic import fixtures

These files contain invented data, not the user’s fuel history.

- `types.bplist`: strings, booleans, signed numbers, floating point, native dates,
  byte data and a UID, encoded with Python `plistlib` in binary format.
- `history.jerrycan`: an Example Test vehicle and four records at 100,000,
  100,300, 100,550 and 100,800 km; volumes 60, 25, 20 and 35 litres; the middle
  two fills are partial. The full-to-full interval is 10 L/100 km.

Malformed/cyclic/allocation inputs are constructed directly in `check-bplist.js`.
The real private sample is used locally only and must not be committed here.
