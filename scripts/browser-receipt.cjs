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
        scan: () => Promise.resolve({
          station: '',
          date: '2026-10-09T08:42',
          fuelType: 'Gasoleo simples',
          litres: 30,
          pricePerLitre: 1.6,
          totalCost: 48,
          amountsMatch: true,
          warnings: []
        })
      };
    });
    await page.locator('#receiptLibrary').setInputFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('local test image') });
    await page.getByRole('heading', { name: 'Review receipt values' }).waitFor();
    assert.equal(await page.locator('#receiptReviewStation').inputValue(), '');
    await page.getByRole('button', { name: 'Use values' }).click();
    await page.locator('#fillForm').waitFor();
    assert.equal(await page.locator('#fillStation').inputValue(), '');
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
    assert.deepEqual(errors, []);
    console.log('receipt photo selection, editable review, existing form handoff and local save passed');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
