const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  page.on('request', (req) => {
    if (req.url().includes('script.google.com')) console.log('[request]', req.url());
  });
  page.on('response', (res) => {
    if (res.url().includes('script.google.com')) console.log('[response]', res.status(), res.url());
  });
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) console.log('[navigated]', frame.url());
  });

  await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { timeout: 15000 });
  await page.fill('#username', 'Admin');
  await page.fill('#password', 'Admin123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Service FMS', { timeout: 20000 });
  console.log('--- logged in, clicking Reports ---');

  await page.click('text=Reports');
  await page.waitForTimeout(8000);
  console.log('--- 8s after clicking Reports, dumping main text ---');
  console.log(await page.locator('main').innerText());
  await browser.close();
})().catch((err) => {
  console.error('SCRIPT ERROR:', err);
  process.exit(1);
});
