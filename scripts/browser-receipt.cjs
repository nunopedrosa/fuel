// Optional browser flow check: requires Playwright and a local FuelLog server.
const { chromium } = require(process.env.FUELLOG_QA_PLAYWRIGHT || 'playwright');
const assert = require('assert');
const base = process.env.FUELLOG_QA_URL || 'http://127.0.0.1:8765';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.FUELLOG_QA_CHROMIUM || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForFunction(() => state.vehicles.length > 0);
    assert.equal(await page.locator('[data-receipt-camera]').count(), 1);
    assert.equal(await page.locator('[data-receipt-library]').count(), 1);
    await page.evaluate(() => {
      window.FuelLogReceiptOCR = {
        scan: () => Promise.resolve(FuelLogReceipt.parse('GASOLEO\nEVOLOGIC\n09/10/2026 08:42\nLitros 30,00\n1,600 EUR/L\nTOTAL 48,00\n  OCR <text> & ç\n'))
      };
    });
    await page.locator('#receiptLibrary').setInputFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('local test image') });
    await page.getByRole('heading', { name: 'Review receipt values' }).waitFor();
    async function assertEditingFontSizes(selector) {
      const sizes = await page.locator(selector).evaluateAll(fields => fields.map(field => ({ name: field.id || field.name, size: parseFloat(getComputedStyle(field).fontSize) })));
      assert.ok(sizes.length > 0);
      sizes.forEach(field => assert.ok(field.size >= 16, field.name + ' has a ' + field.size + 'px editing font; keep the iPhone focus-zoom protection'));
    }
    await assertEditingFontSizes('.receipt-review-grid input, .receipt-review-grid select');
    assert.equal(await page.locator('#receiptReviewStation').inputValue(), '');
    assert.equal(await page.locator('#receiptReviewFuel').inputValue(), 'DIESEL_PREMIUM');
    await page.getByRole('button', { name: 'Use values' }).click();
    await page.locator('#fillForm').waitFor();
    await assertEditingFontSizes('#fillForm input:not([type="hidden"]):not([type="checkbox"]):not([type="range"]), #fillForm select, #fillForm textarea');
    assert.equal(await page.locator('#fillStation').inputValue(), '');
    const rawOCR = 'GASOLEO\nEVOLOGIC\n09/10/2026 08:42\nLitros 30,00\n1,600 EUR/L\nTOTAL 48,00\n  OCR <text> & ç\n';
    assert.equal(await page.locator('#fillForm [name="notes"]').inputValue(), rawOCR);
    const clearBox = await page.getByRole('button', { name: 'Clear notes', exact: true }).boundingBox();
    const notesBox = await page.locator('#fillForm [name="notes"]').boundingBox();
    assert.ok(clearBox.width >= 44 && clearBox.height >= 44, 'clear notes needs a touch-sized target');
    assert.ok(Math.abs(clearBox.x + clearBox.width - notesBox.x - notesBox.width) < 2, 'clear button must align to the right edge of notes');
    assert.equal(await page.locator('#fillForm [name="litres"]').inputValue(), '30');
    assert.equal(await page.locator('#fillForm [name="totalCost"]').inputValue(), '48');
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 38.7, longitude: -9.1 });
    await page.evaluate(() => {
      state.priceResults = [{ name: 'Posto de Teste', id: 'test-station', country: 'PT', lat: 38.7, lon: -9.1, price: 1.6 }];
    });
    await page.locator('#fillFindStation').click();
    await page.waitForFunction(() => document.querySelector('#fillStation').value === 'Posto de Teste');
    assert.equal(await page.locator('#modalRoot').getAttribute('aria-hidden'), 'true', 'equal price must not prompt');
    assert.equal(await page.locator('#fillForm [name="totalCost"]').inputValue(), '48');
    await page.evaluate(() => { state.priceResults[0].price = 1.7; });
    await page.locator('#fillFindStation').click();
    await page.getByRole('heading', { name: 'Replace price per litre?' }).waitFor();
    await page.getByRole('button', { name: 'Keep current price' }).click();
    assert.equal(await page.locator('#fillForm [name="pricePerLitre"]').inputValue(), '1.600');
    assert.equal(await page.locator('#fillForm [name="totalCost"]').inputValue(), '48');
    await page.locator('#fillFindStation').click();
    await page.getByRole('heading', { name: 'Replace price per litre?' }).waitFor();
    await page.getByRole('button', { name: 'Replace price', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#fillForm [name="pricePerLitre"]').value === '1.700');
    assert.equal(await page.locator('#fillForm [name="totalCost"]').inputValue(), '51.00');
    await page.locator('#fillForm [name="odometer"]').fill('10000');
    await page.getByRole('button', { name: 'Save fill-up' }).click();
    await page.waitForFunction(() => state.fillups.some(fill => fill.station === 'Posto de Teste'));
    const saved = await page.evaluate(() => state.fillups.find(fill => fill.station === 'Posto de Teste'));
    assert.equal(saved.totalCost, 51);
    assert.equal(saved.pricePerLitre, 1.7);
    assert.equal(saved.litres, 30);
    assert.equal(saved.fuelId, 'DIESEL_PREMIUM');
    assert.equal(saved.receiptFuelType, 'GASOLEO EVOLOGIC');
    assert.equal(saved.notes, rawOCR, 'save the full OCR text without trimming it');
    await page.locator('[data-edit]').first().click();
    await page.getByRole('button', { name: 'Update fill-up' }).click();
    await page.waitForFunction(() => state.route === 'dashboard');
    assert.equal(await page.evaluate(() => state.fillups[0].receiptFuelType), 'GASOLEO EVOLOGIC');
    const backup = await page.evaluate(async () => {
      let text;
      const original = download;
      download = (name, content) => { text = content; };
      try { await exportJson(); return JSON.parse(text); } finally { download = original; }
    });
    assert.equal(backup.fillups[0].receiptFuelType, 'GASOLEO EVOLOGIC');
    assert.equal(backup.fillups[0].fuelId, 'DIESEL_PREMIUM');
    assert.equal(backup.fillups[0].notes, rawOCR);
    await page.locator('[data-edit]').first().click();
    await page.getByRole('button', { name: 'Clear notes', exact: true }).click();
    assert.equal(await page.locator('#fillForm [name="notes"]').inputValue(), '');
    assert.equal(await page.locator('#fillForm [name="notes"]').evaluate(el => document.activeElement === el), true);
    assert.equal(await page.evaluate(() => state.fillups[0].notes), rawOCR, 'clear must not save automatically');
    await page.getByRole('button', { name: 'Update fill-up' }).click();
    await page.waitForFunction(() => state.route === 'dashboard');
    assert.equal(await page.evaluate(() => state.fillups[0].notes), '');
    assert.equal(await page.evaluate(() => state.fillups[0].receiptFuelType), 'GASOLEO EVOLOGIC');
    await page.evaluate(() => {
      state.editing = null;
      state.prefill = { receiptFuelType: 'Gasolina', fuelType: 'Gasolina', fuelId: null };
      route('add');
    });
    assert.equal(await page.locator('#fillForm [name="fuelId"]').inputValue(), '', 'ambiguous scanned fuel must not inherit the vehicle default');
    assert.deepEqual(errors, []);
    console.log('receipt photo selection, editable review, existing form handoff and local save passed');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
