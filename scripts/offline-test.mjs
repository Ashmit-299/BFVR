// Offline / online boot test — run: node scripts/offline-test.mjs
// Covers the full "works without internet" flow:
//   1. login online (warms the read cache)
//   2. reload online → measures warm load time
//   3. go OFFLINE → full page reload → app must boot straight into the POS
//      from cached session + cached menu/tables (no internet at all)
//   4. language toggle while offline → menu cards translate (EN ↔ HI)
//   5. add items + save while offline → write is queued locally
//   6. go ONLINE → queue auto-syncs → table becomes occupied
//   7. take payment + close → table must free up (regression: payment bug)
//   8. no runtime page errors along the way
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE || 'http://localhost:5050';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${extra}`);
  }
};

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

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('dialog', (d) => d.accept());

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  console.log('— login online (warms cache) —');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
  await page.click('input[autocomplete="username"]', { clickCount: 3 });
  await page.type('input[autocomplete="username"]', 'manager');
  await page.click('input[autocomplete="current-password"]');
  await page.type('input[autocomplete="current-password"]', 'Manager@1234');
  await clickText(page, 'button', 'लॉगिन करें');
  await page.waitForSelector('.pos', { timeout: 15000 });
  await page.waitForSelector('.dish-card', { timeout: 15000 });
  ok('logged in, dish grid rendered', true);

  // wait for the read cache to be populated (menu + tables + settings + session)
  await page.waitForFunction(
    () =>
      Object.keys(localStorage).some((k) => k.startsWith('bfvr_cache:')) &&
      (localStorage.getItem('bfvr_user') || '').length > 0,
    { timeout: 10000 }
  );
  ok('read cache + session profile stored', true);

  console.log('— warm reload (online, cached) —');
  const t0 = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.dish-card', { timeout: 15000 });
  const warmMs = Date.now() - t0;
  ok(`warm boot to dish grid: ${warmMs}ms`, warmMs < 5000, `${warmMs}ms`);

  console.log('— go OFFLINE —');
  await page.setOfflineMode(true);
  await page.waitForFunction(() => document.querySelector('.conn-pill')?.textContent.includes('ऑफ़लाइन'), {
    timeout: 10000,
  });
  ok('connection pill shows offline', true);

  console.log('— full reload with NO network —');
  const t1 = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.dish-card', { timeout: 20000 });
  await page.waitForFunction(() => document.querySelectorAll('.table-tab').length >= 7, { timeout: 15000 }).catch(() => {});
  const offMs = Date.now() - t1;
  const dishCount = await page.$$eval('.dish-card', (els) => els.length);
  const tableTabs = await page.$$eval('.table-tab', (els) => els.length);
  const stillLoggedIn = !page.url().includes('/login');
  ok(`app booted offline → POS visible (${dishCount} dishes, ${tableTabs} tabs, ${offMs}ms)`, dishCount > 0 && tableTabs >= 7 && stillLoggedIn);
  ok('offline boot did not bounce to login', stillLoggedIn, page.url());
  const hindiDish = await page.evaluate(() => document.body.textContent.includes('मसाला डोसा'));
  ok('menu cards render (Hindi default)', hindiDish);

  console.log('— language toggle OFFLINE (menu cards must translate) —');
  await page.click('.topbar .lang-btn');
  await page.waitForFunction(() => document.body.textContent.includes('Masala Dosa'), { timeout: 5000 }).catch(() => {});
  const enDish = await page.evaluate(() => document.body.textContent.includes('Masala Dosa'));
  const enCat = await page.evaluate(() => document.body.textContent.includes('South Indian'));
  const enAll = await page.evaluate(() => document.body.textContent.includes('All'));
  ok('dish cards switch to English', enDish);
  ok('category chips switch to English', enCat);
  ok('All chip switches to English', enAll);
  await page.click('.topbar .lang-btn');
  await page.waitForFunction(() => document.body.textContent.includes('मसाला डोसा'), { timeout: 5000 });
  ok('toggled back to Hindi', true);

  console.log('— build a table bill OFFLINE —');
  await clickText(page, '.table-tab', 'T4');
  await page.waitForFunction(() => document.querySelector('.cart-head')?.textContent.includes('टेबल 4'));
  await page.click('.search', { clickCount: 3 });
  await page.type('.search', 'मसाला डोसा');
  await page.waitForFunction(() => document.querySelectorAll('.dish-card').length > 0 && document.querySelectorAll('.dish-card').length < 20);
  await clickText(page, '.price-chip', '₹80'); // masala dosa single
  await page.waitForSelector('.cart-row');
  await clickText(page, '.cart-actions button', 'सेव करें');
  await page.waitForFunction(() => document.body.textContent.includes('ऑफ़लाइन: सुरक्षित'), { timeout: 10000 });
  ok('offline save toast shown', true);
  await page.waitForFunction(() => (localStorage.getItem('bfvr_queue') || '').includes('upsert'), { timeout: 10000 });
  const queued = await page.evaluate(() => JSON.parse(localStorage.getItem('bfvr_queue') || '[]').length);
  ok('write queued locally (upsert)', queued >= 1, `queue=${queued}`);

  console.log('— back ONLINE → auto sync —');
  await page.setOfflineMode(false);
  await page.waitForFunction(() => (localStorage.getItem('bfvr_queue') || '[]') === '[]', { timeout: 20000 });
  ok('queue drained automatically', true);
  await page.waitForFunction(() => {
    const t4 = Array.from(document.querySelectorAll('.table-tab')).find((e) => e.textContent.includes('T4'));
    return t4 && t4.classList.contains('busy');
  }, { timeout: 15000 });
  ok('T4 shows occupied after sync', true);

  console.log('— payment must free the table (regression) —');
  await clickText(page, '.cart-actions button', 'भुगतान लें + बंद करें');
  await page.waitForSelector('.pay-total');
  await clickText(page, '.modal-foot button', 'भुगतान लेकर बंद करें');
  await page.waitForSelector('.print-area .bill', { timeout: 15000 });
  const billTxt = await page.$eval('.bill', (el) => el.textContent);
  ok('bill shows the amount', billTxt.includes('₹80'), billTxt.slice(0, 120));
  await clickText(page, '.bill-actions button', 'बंद करें');
  await page.waitForFunction(() => {
    const t4 = Array.from(document.querySelectorAll('.table-tab')).find((e) => e.textContent.includes('T4'));
    return t4 && t4.classList.contains('free');
  }, { timeout: 15000 });
  ok('T4 freed after payment — table updates', true);

  // double-check against the server directly
  const serverFree = await page.evaluate(async () => {
    const res = await fetch('/api/orders/tables', { headers: { Authorization: `Bearer ${localStorage.getItem('bfvr_token')}` } });
    const data = await res.json();
    const t4 = data.tables.find((t) => t.table === 4);
    return t4 && t4.order === null;
  });
  ok('server confirms T4 free (no duplicate open bill)', !!serverFree);

  console.log('— offline again (session must survive repeated reloads) —');
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.pos', { timeout: 20000 });
  const stillIn = !page.url().includes('/login');
  ok('second offline reload still logged in', stillIn, page.url());
  await page.setOfflineMode(false);

  ok('no runtime page errors', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 300));

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error('Offline test crashed:', err.message);
  process.exit(1);
});
