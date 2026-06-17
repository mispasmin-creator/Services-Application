const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()));

  await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { timeout: 15000 });
  await page.fill('#username', 'Admin');
  await page.fill('#password', 'Admin123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Service FMS', { timeout: 20000 });

  await page.click('text=Reports');

  for (let i = 1; i <= 6; i++) {
    await page.waitForTimeout(5000);
    const text = await page.locator('main').innerText();
    console.log(`--- at ${i * 5}s ---`);
    console.log(text.includes('Loading report data') ? 'STILL LOADING' : 'LOADED: ' + text.slice(0, 120).replace(/\n/g, ' | '));
  }

  await page.screenshot({ path: 'scratch/reports-dashboard6.png', fullPage: true });
  await browser.close();
})().catch((err) => {
  console.error('SCRIPT ERROR:', err);
  process.exit(1);
});
