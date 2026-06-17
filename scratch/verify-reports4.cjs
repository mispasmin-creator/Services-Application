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
  await page.waitForSelector('text=Where Work Is Stuck', { timeout: 10000 });

  const bodyText = await page.locator('main').innerText();
  console.log('--- main innerText ---');
  console.log(bodyText);
  console.log('--- end ---');

  await page.screenshot({ path: 'scratch/reports-dashboard4.png' }); // viewport only, not fullPage
  console.log('Captured viewport screenshot');
  await browser.close();
})().catch((err) => {
  console.error('SCRIPT ERROR:', err);
  process.exit(1);
});
