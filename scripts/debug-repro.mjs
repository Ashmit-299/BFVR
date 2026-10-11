// Focused debug: reproduce the table close flow with full network logging.
import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:5050';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function clickText(page, selector, text) {
  const clicked = await page.$$eval(
    selector,
    (els, t) => {
      const el = els.find((e) => e.textContent.trim().includes(t));
      if (el) {
        el.click();
        return true;
      }
      return false;
    },
    text
  );
  if (!clicked) throw new Error(`No element ${selector} containing "${text}"`);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on('dialog', (d) => d.accept());

page.on('request', (r) => {
  if (r.url().includes('/api/')) console.log('→', r.method(), r.url().replace(BASE, ''));
});
page.on('response', (r) => {
  if (r.url().includes('/api/')) console.log('←', r.status(), r.url().replace(BASE, ''));
});
page.on('requestfailed', (r) => {
  if (r.url().includes('/api/')) console.log('✗ FAILED', r.method(), r.url().replace(BASE, ''), r.failure()?.errorText);
});
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console.error]', m.text());
});
page.on('pageerror', (e) => console.log('[pageerror]', String(e)));

// cleanup open orders
const loginRes = await fetch(BASE + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'Admin@1234' }),
});
const { token } = await loginRes.json();
const list = await (await fetch(BASE + '/api/orders?bill=open', { headers: { Authorization: `Bearer ${token}` } })).json();
for (const o of list.orders) {
  await fetch(BASE + '/api/orders/close', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id: o.id }),
  });
}
console.log(`cleaned ${list.orders.length} open bills\n`);

await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
await page.type('input[autocomplete="username"]', 'manager');
await page.type('input[autocomplete="current-password"]', 'Manager@1234');
await clickText(page, 'button', 'लॉगिन करें');
await page.waitForSelector('.dish-card');
await page.waitForFunction(() => document.querySelectorAll('.table-tab').length >= 7);

console.log('\n--- select T5, add item, save ---');
await clickText(page, '.table-tab', 'T5');
await page.click('.search');
await page.keyboard.down('Control');
await page.keyboard.press('KeyA');
await page.keyboard.up('Control');
await page.keyboard.type('वड़ा पाव');
await page.waitForFunction(() => document.querySelectorAll('.dish-card').length > 0 && document.querySelectorAll('.dish-card').length < 10);
await clickText(page, '.price-chip.single', '₹20');
await page.waitForSelector('.cart-row');
await clickText(page, '.cart-actions button', 'सेव करें');
await page.waitForFunction(() => document.body.textContent.includes('सेव हो गया'));

console.log('\n--- payment modal → confirm ---');
await clickText(page, '.cart-actions button', 'भुगतान लें + बंद करें');
await page.waitForSelector('.pay-total');
await clickText(page, '.modal-foot button', 'भुगतान लेकर बंद करें');

try {
  await page.waitForSelector('.print-area .bill', { timeout: 8000 });
  console.log('\nbill modal shown');
} catch {
  console.log('\nNO bill modal');
}
const queue = await page.evaluate(() => localStorage.getItem('bfvr_queue'));
console.log('queue:', queue);
const toasts = await page.evaluate(() => Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent));
console.log('toasts:', toasts);

await new Promise((r) => setTimeout(r, 1500));
await browser.close();
