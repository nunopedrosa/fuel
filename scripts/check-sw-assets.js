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
html.replace(/<script(?:\s+defer)?\s+src="([^"]+)"/g, function (_, src) { scripts.push(src); });
scripts.forEach(function (src) {
  const base = src.split('?')[0];
  assert.ok(fs.existsSync(path.join(root, base)), 'index.html script missing on disk: ' + src);
  const inSw = assets.indexOf(src) >= 0;
  assert.ok(inSw, 'index.html script must be listed in sw.js ASSETS: ' + src);
});

const cacheMatch = sw.match(/const CACHE = '([^']+)'/);
assert.ok(cacheMatch, 'sw.js must define CACHE version');
assert.match(cacheMatch[1], /^fuellog-v\d+/, 'CACHE name should be versioned');

const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
const configCacheMatch = config.match(/appCacheId:\s*'([^']+)'/);
assert.ok(configCacheMatch, 'config.js must define appCacheId');
assert.equal(configCacheMatch[1], cacheMatch[1], 'config.js appCacheId must match sw.js CACHE');

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const buildMatch = app.match(/const APP_BUILD_ID = '([^']+)'/);
assert.ok(buildMatch, 'app.js must identify its own running build');
assert.equal(buildMatch[1], cacheMatch[1], 'running application build must match sw.js CACHE');
const htmlBuild = html.match(/data-app-version="([^"]+)"/);
assert.ok(htmlBuild, 'HTML must identify its app release');
assert.equal(htmlBuild[1], cacheMatch[1], 'HTML release must match sw.js CACHE');
assets.filter(asset => /\.(js|css)(\?|$)/.test(asset)).forEach(asset => {
  assert.equal(asset.split('?')[1], 'v=' + cacheMatch[1], 'runtime asset must use the release version: ' + asset);
});
console.log('service worker asset checks passed (' + assets.length + ' assets, ' + scripts.length + ' scripts)');
