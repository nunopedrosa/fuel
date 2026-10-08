'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const assetMatch = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
assert.ok(assetMatch, 'sw.js must define ASSETS');
const assets = [];
assetMatch[1].replace(/'([^']+)'|"([^"]+)"/g, function (_, a, b) {
  assets.push(a || b);
});
assert.ok(assets.length > 0, 'ASSETS must not be empty');

function diskPath(asset) {
  const clean = asset.replace(/^\.\//, '').split('?')[0];
  return path.join(root, clean);
}

assets.forEach(function (asset) {
  if (asset === './') return;
  const p = diskPath(asset);
  assert.ok(fs.existsSync(p), 'missing cached asset: ' + asset + ' (' + p + ')');
});

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [];
html.replace(/<script src="([^"]+)"/g, function (_, src) { scripts.push(src); });
scripts.forEach(function (src) {
  const base = src.split('?')[0];
  assert.ok(fs.existsSync(path.join(root, base)), 'index.html script missing on disk: ' + src);
  const inSw = assets.some(function (a) { return a.split('?')[0] === base; });
  assert.ok(inSw, 'index.html script must be listed in sw.js ASSETS: ' + src);
});

const cacheMatch = sw.match(/const CACHE = '([^']+)'/);
assert.ok(cacheMatch, 'sw.js must define CACHE version');
assert.match(cacheMatch[1], /^fuellog-v\d+/, 'CACHE name should be versioned');

console.log('service worker asset checks passed (' + assets.length + ' assets, ' + scripts.length + ' scripts)');
