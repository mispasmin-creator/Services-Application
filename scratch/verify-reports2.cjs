const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });

  await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { timeout: 15000 });
  await page.fill('#username', 'Admin');
  await page.fill('#password', 'Admin123');
  await page.click('button[type="submit"]');

  await page.waitForSelector('text=Service FMS', { timeout: 20000 });
  // Let the initial app-level fetchData() finish before navigating anywhere.
  await page.waitForTimeout(4000);

  await page.click('text=Reports');
  await page.waitForSelector('text=Where Work Is Stuck', { timeout: 20000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'scratch/reports-dashboard2.png', fullPage: true });
  console.log('Captured Reports Dashboard tab (data loaded)');

  await browser.close();
})().catch((err) => {
  console.error('SCRIPT ERROR:', err);
  process.exit(1);
});
