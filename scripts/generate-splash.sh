#!/bin/sh
# Resize the iPhone 14 Pro Home Screen screenshot for other notch / Dynamic
# Island iPhones. iOS matches apple-touch-startup-image by exact pixel size.
# Requires ImageMagick (magick). Run from the repo root:
#   sh scripts/generate-splash.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/FuelLogiPhone14pro.png"
OUT="$ROOT/assets/splash"
test -f "$SRC" || { echo "missing $SRC" >&2; exit 1; }
command -v magick >/dev/null || { echo "magick (ImageMagick) is required" >&2; exit 1; }
mkdir -p "$OUT"

# width height — unique portrait panels without a Home button
SIZES="
1080 2340
1125 2436
1170 2532
1179 2556
1206 2622
828 1792
1242 2688
1260 2736
1284 2778
1290 2796
1320 2868
"

echo "$SIZES" | while read -r w h; do
  test -n "$w" || continue
  dest="$OUT/${w}x${h}.png"
  if test "$w" = 1179 && test "$h" = 2556; then
    cp "$SRC" "$dest"
  else
    magick "$SRC" -resize "${w}x${h}!" -remap "$SRC" -strip \
      -define png:compression-level=9 png8:"$dest"
  fi
  echo "$dest ($(wc -c < "$dest") bytes)"
done
