#!/usr/bin/env node
/**
 * Downloads low-zoom OSM tiles for offline use. Run from repo root:
 *   node scripts/generate-low-zoom-tiles.mjs
 * Respects OSM tile usage: low zoom only, one-time build artifact.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'map-tiles');

const Z_MIN = 5;
const Z_MAX = 7;
const DELAY_MS = 120;

const REGIONS = {
  EU: { latMin: 35.5, latMax: 52.5, lonMin: -10.5, lonMax: 8.5 },
  PT: { latMin: 36.8, latMax: 42.2, lonMin: -9.6, lonMax: -6.1 },
  ES: { latMin: 36.0, latMax: 43.8, lonMin: -9.5, lonMax: 4.5 },
  FR: { latMin: 41.0, latMax: 51.2, lonMin: -5.2, lonMax: 9.7 },
  BE: { latMin: 49.4, latMax: 51.6, lonMin: 2.5, lonMax: 6.5 },
  NL: { latMin: 50.7, latMax: 53.6, lonMin: 3.2, lonMax: 7.3 }
};

function lonLatToTile(lon, lat, z) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function tilesForRegion(region, z) {
  const tl = lonLatToTile(region.lonMin, region.latMax, z);
  const br = lonLatToTile(region.lonMax, region.latMin, z);
  const xs = [];
  const ys = [];
  for (let x = tl.x; x <= br.x; x++) xs.push(x);
  for (let y = tl.y; y <= br.y; y++) ys.push(y);
  const out = [];
  for (const x of xs) for (const y of ys) out.push({ x, y });
  return out;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function downloadTile(z, x, y, dest) {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'FuelLog/1.0 (offline bundle generator; contact: local dev)' }
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
}

async function main() {
  const manifest = { version: 1, countries: Object.keys(REGIONS), tiles: [] };
  const seen = new Set();

  for (const [code, bbox] of Object.entries(REGIONS)) {
    for (let z = Z_MIN; z <= Z_MAX; z++) {
      const tiles = tilesForRegion(bbox, z);
      for (const { x, y } of tiles) {
        const rel = `${code}/${z}/${x}/${y}.png`;
        const id = `${code}:${z}/${x}/${y}`;
        const dest = path.join(OUT, rel);
        if (seen.has(id)) continue;
        seen.add(id);
        process.stdout.write(`\r${id}                    `);
        try {
          await downloadTile(z, x, y, dest);
          manifest.tiles.push(id);
          await sleep(DELAY_MS);
        } catch (e) {
          console.warn(`\nSkip ${id}: ${e.message}`);
        }
      }
    }
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${manifest.tiles.length} tiles → ${OUT}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
