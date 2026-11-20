'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const slugs = [
  'refresh-contacts', 'refresh-ai', 'refresh-notes', 'refresh-calendar',
  'refresh-tasks', 'refresh-clock', 'refresh-calc', 'refresh-files',
  'refresh-rss', 'refresh-radio', 'refresh-qr', 'refresh-2048'
];

// 1. Check ES5 syntax & manifest completeness for all 12 apps + shared UI
const jsFiles = [path.join(root, 'projects/_shared/refresh-ui.js')];
for (const slug of slugs) {
  const appDir = path.join(root, 'projects', slug, 'app');
  const manifest = JSON.parse(fs.readFileSync(path.join(appDir, 'manifest.webapp'), 'utf8'));
  assert.equal(manifest.type, 'privileged');
  assert.equal(manifest.origin, 'app://' + slug);
  assert(manifest.locales && manifest.locales.ru && manifest.locales.ru.name);
  assert(manifest.icons['56'] && manifest.icons['112'] && manifest.icons['128']);
  for (const f of fs.readdirSync(appDir)) {
    if (f.endsWith('.js')) jsFiles.push(path.join(appDir, f));
  }
}

for (const file of jsFiles) {
  const code = fs.readFileSync(file, 'utf8');
  assert(!/\b(const|let|class)\s+/.test(code), 'ES6 keyword in ' + file);
  assert(!/=>/.test(code), 'Arrow function in ' + file);
  assert(!/`/.test(code), 'Template literal in ' + file);
  new vm.Script(code, { filename: file });
}

// 2. Test QR matrix generator
const qrCtx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'projects/refresh-qr/app/qr.js'), 'utf8'), qrCtx);
const m1 = qrCtx.window.RefreshQR.makeMatrix('https://github.com/theatlasteam/rstore-apps');
assert.equal(m1.length, m1[0].length);
assert(m1.length >= 25);
assert.equal(m1[0][0], 1);
assert.equal(m1[0][6], 1);
assert.equal(m1[6][0], 1);
assert.equal(m1[0][m1.length - 1], 1);
assert.equal(m1[m1.length - 1][0], 1);

const m2 = qrCtx.window.RefreshQR.makeMatrix('WIFI:T:WPA;S:MyNet;P:secret123;;');
assert.equal(m2.length, m2[0].length);

console.log('PASS: All 12 Refresh apps ES5 syntax, manifests, and QR generator verified.');
