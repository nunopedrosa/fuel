'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const links = [];
html.replace(/<link\s+rel="apple-touch-startup-image"\s+href="([^"]+)"\s+media="([^"]+)"/g, function (_, href, media) {
  links.push({ href: href, media: media });
});
assert.ok(links.length >= 11, 'expected startup images for notch / Dynamic Island iPhones');

function pngSize(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', 'not a PNG: ' + file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

links.forEach(function (link) {
  const w = Number((link.media.match(/device-width:\s*(\d+)px/) || [])[1]);
  const h = Number((link.media.match(/device-height:\s*(\d+)px/) || [])[1]);
  const dpr = Number((link.media.match(/-webkit-device-pixel-ratio:\s*(\d+)/) || [])[1]);
  assert.ok(w && h && dpr, 'startup-image media must name width, height and pixel ratio: ' + link.media);
  assert.ok(/orientation:\s*portrait/.test(link.media), 'startup images are portrait-only: ' + link.media);
  const file = path.join(root, link.href);
  assert.ok(fs.existsSync(file), 'missing splash: ' + link.href);
  const size = pngSize(file);
  assert.equal(size.width, w * dpr, link.href + ' width must be ' + (w * dpr));
  assert.equal(size.height, h * dpr, link.href + ' height must be ' + (h * dpr));
});

console.log('splash image checks passed (' + links.length + ' startup images)');
