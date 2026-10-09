// Real OCR under the Apache CSP. Requires Playwright and a downloaded public
// por.traineddata.gz supplied with FUELLOG_QA_OCR_MODEL (no receipt data needed).
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');
const { chromium } = require(process.env.FUELLOG_QA_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
const model = fs.readFileSync(process.env.FUELLOG_QA_OCR_MODEL);
function policy(file) {
  if (!fs.existsSync(file)) return null;
  const match = fs.readFileSync(file, 'utf8').match(/Header always set Content-Security-Policy "([^"]+)"/);
  return match && match[1];
}
const types = { '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  const csp = policy(path.join(path.dirname(file), '.htaccess')) || policy(path.join(root, '.htaccess'));
  if (csp) res.setHeader('Content-Security-Policy', csp);
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.readFile(file, (error, data) => { res.writeHead(error ? 404 : 200).end(error ? '' : data); });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.FUELLOG_QA_CHROMIUM || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    // Supply the real public model deterministically; the worker and WASM are
    // never stubbed. A blocked connect-src still fails before this handler.
    await context.route('https://tessdata.projectnaptha.com/**', route => route.fulfill({ status: 200, body: model, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/gzip' } }));
    const page = await context.newPage();
    const failures = [];
    page.on('console', msg => { if (msg.type() === 'error') failures.push(msg.text()); });
    page.on('pageerror', error => failures.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => state.vehicles.length > 0);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    if (process.env.FUELLOG_QA_RECEIPT) await page.evaluate(() => {
      const parse = FuelLogReceipt.parse;
      FuelLogReceipt.parse = text => { window.receiptOCRText = text; return parse(text); };
    });
    const photo = process.env.FUELLOG_QA_RECEIPT ? fs.readFileSync(process.env.FUELLOG_QA_RECEIPT).toString('base64') : await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000; canvas.height = 700;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1000, 700);
      ctx.fillStyle = 'black'; ctx.font = '36px Arial';
      ['POSTO TESTE', '09/10/2026 08:42', 'Gasoleo simples', 'Litros 30,00', 'Preco por litro 1,600', 'TOTAL EUR 48,00'].forEach((line, i) => ctx.fillText(line, 50, 80 + i * 90));
      return canvas.toDataURL('image/png').split(',')[1];
    });
    for (const offline of [false, true]) {
      if (offline) {
        await context.setOffline(true); await page.reload();
        if (process.env.FUELLOG_QA_RECEIPT) await page.evaluate(() => {
          const parse = FuelLogReceipt.parse;
          FuelLogReceipt.parse = text => { window.receiptOCRText = text; return parse(text); };
        });
      }
      const jpeg = /\.jpe?g$/i.test(process.env.FUELLOG_QA_RECEIPT || '');
      await page.locator('#receiptLibrary').setInputFiles({ name: jpeg ? 'receipt.jpg' : 'receipt.png', mimeType: jpeg ? 'image/jpeg' : 'image/png', buffer: Buffer.from(photo, 'base64') });
      const outcome = await Promise.race([
        page.getByRole('heading', { name: 'Review receipt values' }).waitFor({ timeout: 60000 }).then(() => 'review'),
        page.getByRole('heading', { name: 'Receipt scan failed' }).waitFor({ timeout: 60000 }).then(() => 'failed')
      ]);
      assert.equal(outcome, 'review', await page.locator('#modalRoot').textContent().catch(() => failures.join('\n')));
      if (process.env.FUELLOG_QA_RECEIPT) {
        console.log(await page.evaluate(() => (window.receiptOCRText || '').split('\n').filter(line => /[0-9].*(?:L\b|\/L)/i.test(line))));
        console.log(JSON.stringify(await page.locator('.receipt-review-grid input').evaluateAll(inputs => inputs.map(input => ({ field: input.id, value: input.value })))));
      } else {
        assert.equal(await page.locator('#receiptReviewLitres').inputValue(), '30');
        assert.equal(await page.locator('#receiptReviewTotal').inputValue(), '48');
      }
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
    assert.deepEqual(failures, []);
    console.log('Real receipt OCR passed under hosting CSP online and after offline reload');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
