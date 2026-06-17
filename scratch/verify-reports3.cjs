const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { timeout: 15000 });
  await page.fill('#username', 'Admin');
  await page.fill('#password', 'Admin123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Service FMS', { timeout: 20000 });

  await page.click('text=Reports');

  // Poll up to 30s for the loading spinner to actually disappear, logging how long it took.
  const start = Date.now();
  await page.waitForSelector('text=Loading report data', { state: 'hidden', timeout: 30000 });
  console.log('Loading finished after', Date.now() - start, 'ms');

  await page.waitForSelector('text=Where Work Is Stuck', { timeout: 5000 });
  await page.screenshot({ path: 'scratch/reports-dashboard3.png', fullPage: true });
  console.log('Captured Reports Dashboard tab');
  await browser.close();
})().catch((err) => {
  console.error('SCRIPT ERROR:', err);
  process.exit(1);
});
