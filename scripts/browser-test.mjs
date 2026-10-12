// Browser end-to-end test — run: node scripts/browser-test.mjs
// Covers: login + language toggle, multi-table POS with any-order billing,
// offline queue + auto-sync, role-based UI, analytics, phone responsiveness.
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
  return clicked;
}

async function replaceInput(page, selector, text) {
  await page.click(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.type(text);
}

async function login(page, username, password) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
  await page.click('input[autocomplete="username"]', { clickCount: 3 });
  await page.type('input[autocomplete="username"]', username);
  await page.click('input[autocomplete="current-password"]');
  await page.type('input[autocomplete="current-password"]', password);
  await clickText(page, 'button', 'लॉगिन करें');
  await page.waitForSelector('.pos, .form-error', { timeout: 10000 });
  const err = await page.$('.form-error');
  return !err;
}

async function cleanupOpenOrders() {
  // close bills left open by previous runs so the suite is idempotent
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@1234' }),
  });
  const { token } = await loginRes.json();
  const listRes = await fetch(BASE + '/api/orders?bill=open', { headers: { Authorization: `Bearer ${token}` } });
  const { orders = [] } = await listRes.json();
  for (const o of orders) {
    await fetch(BASE + '/api/orders/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: o.id }),
    });
  }
  return orders.length;
}

async function main() {
  const cleaned = await cleanupOpenOrders();
  if (cleaned) console.log(`(closed ${cleaned} bill(s) left open by a previous run)`);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('dialog', (d) => d.accept()); // auto-confirm delete/close dialogs

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('requestfailed', (r) => {
    if (r.url().includes('/api/')) console.log(`  [net-fail] ${r.method()} ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on('response', (r) => {
    if (r.url().includes('/payments') || r.url().includes('/close')) console.log(`  [net] ${r.status()} ${r.request().method()} ${r.url()}`);
  });

  console.log('— login + language toggle —');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  ok('login page renders brand', (await page.content()).includes('व्यापार साथी'));

  await page.click('.login-lang');
  await page.waitForFunction(() => document.body.textContent.includes('Username'));
  ok('language toggle → English on login', true);
  await page.click('.login-lang');
  await page.waitForFunction(() => document.body.textContent.includes('यूज़रनेम'));
  ok('toggle back → Hindi', true);

  const mgrIn = await login(page, 'manager', 'Manager@1234');
  ok('manager logs in → lands on POS', mgrIn && page.url().endsWith('/pos'));

  console.log('— POS: table strip —');
  await page.waitForSelector('.table-tab', { timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll('.table-tab').length >= 7, { timeout: 15000 });
  const tabCount = await page.$$eval('.table-tab', (els) => els.length);
  ok('direct + 6 tables shown', tabCount === 7, `got ${tabCount}`);
  await page.waitForSelector('.dish-card');
  const dishCount = await page.$$eval('.dish-card', (els) => els.length);
  ok('dish grid loaded', dishCount >= 70, `got ${dishCount}`);

  console.log('— table 2: order with half+full —');
  await clickText(page, '.table-tab', 'T2');
  await page.waitForFunction(() => document.querySelector('.cart-head')?.textContent.includes('टेबल 2'));
  await replaceInput(page, '.search', 'चाउमीन');
  await page.waitForFunction(() => document.querySelectorAll('.dish-card').length < 20 && document.querySelectorAll('.dish-card').length > 0);
  await clickText(page, '.price-chip.half', 'हाफ');
  await page.waitForSelector('.cart-row');
  await clickText(page, '.price-chip.full', 'फूल');
  const grand = await page.$eval('.cart-totals .grand', (el) => el.textContent);
  ok('cart total = 30 + 50 = ₹80', grand.includes('₹80'), grand);
  await clickText(page, '.cart-actions button', 'सेव करें');
  await page.waitForFunction(() => document.body.textContent.includes('सेव हो गया'), { timeout: 10000 });
  await page.waitForFunction(() => {
    const t2 = Array.from(document.querySelectorAll('.table-tab')).find((e) => e.textContent.includes('T2'));
    return t2 && t2.classList.contains('busy');
  }, { timeout: 10000 });
  ok('T2 shows occupied after save', true);

  console.log('— table 3: second simultaneous order —');
  await clickText(page, '.table-tab', 'T3');
  await page.waitForFunction(() => document.querySelector('.cart-head')?.textContent.includes('टेबल 3'));
  const t2StillBusy = await page.$$eval('.table-tab', (els) =>
    els.some((e) => e.textContent.includes('T2') && e.classList.contains('busy'))
  );
  ok('T2 stays occupied while working T3', t2StillBusy);
  await replaceInput(page, '.search', 'वड़ा पाव');
  await page.waitForFunction(() => document.querySelectorAll('.dish-card').length < 10 && document.querySelectorAll('.dish-card').length > 0);
  await clickText(page, '.price-chip.single', '₹20');
  await page.waitForSelector('.cart-row');
  await clickText(page, '.cart-actions button', 'सेव करें');
  // wait until the server assigned a bill number to THIS cart (not a lingering toast)
  await page.waitForFunction(() => document.querySelector('.cart-head')?.textContent.includes('बिल #'), { timeout: 15000 });

  console.log('— settle T3 FIRST (billing not in queue order) —');
  await clickText(page, '.cart-actions button', 'भुगतान लें + बंद करें');
  await page.waitForSelector('.pay-total');
  await clickText(page, '.modal-foot button', 'भुगतान लेकर बंद करें');
  await page.waitForSelector('.print-area .bill', { timeout: 10000 });
  const bill3 = await page.$eval('.bill', (el) => el.textContent);
  ok('T3 bill shows ₹20', bill3.includes('₹20'));
  await clickText(page, '.bill-actions button', 'बंद करें');
  await page.waitForSelector('.print-area', { hidden: true });
  await page.waitForFunction(() => {
    const t3 = Array.from(document.querySelectorAll('.table-tab')).find((e) => e.textContent.includes('T3'));
    return t3 && t3.classList.contains('free');
  }, { timeout: 10000 });
  const t2StillBusy2 = await page.$$eval('.table-tab', (els) =>
    els.some((e) => e.textContent.includes('T2') && e.classList.contains('busy'))
  );
  ok('T3 freed, T2 still open — any-order billing works', t2StillBusy2);

  console.log('— close T2 without payment (due bill) —');
  await clickText(page, '.table-tab', 'T2');
  await page.waitForFunction(() => document.querySelector('.cart-head')?.textContent.includes('टेबल 2'));
  await clickText(page, '.cart-actions button', 'भुगतान लें + बंद करें');
  await page.waitForSelector('.pay-total');
  await clickText(page, '.modal-foot button', 'बिना भुगतान बंद करें');
  await page.waitForSelector('.print-area .bill', { timeout: 10000 });
  const bill2 = await page.$eval('.bill', (el) => el.textContent);
  ok('T2 due bill shows ₹80 due', bill2.includes('₹80'));
  await clickText(page, '.bill-actions button', 'बंद करें');
  await page.waitForFunction(() => {
    const t2 = Array.from(document.querySelectorAll('.table-tab')).find((e) => e.textContent.includes('T2'));
    return t2 && t2.classList.contains('free');
  }, { timeout: 10000 });
  ok('T2 freed after due-close', true);

  console.log('— orders list shows tables & status —');
  await clickText(page, '.nav-item', 'बिल / ऑर्डर');
  await page.waitForSelector('.table tbody tr', { timeout: 10000 });
  await page.waitForFunction(() => document.body.textContent.includes('T2'), { timeout: 5000 }).catch(() => {});
  const tableCol = await page.evaluate(() => document.body.textContent.includes('T2'));
  ok('orders list has table column with T2', tableCol);
  const hasClosedBadge = await page.evaluate(() => document.body.textContent.includes('बंद'));
  ok('closed status badge shown', hasClosedBadge);

  console.log('— topbar language toggle —');
  await clickText(page, '.nav-item', 'नया बिल');
  await page.waitForSelector('.table-tab');
  await page.waitForFunction(() => document.querySelectorAll('.table-tab').length >= 7, { timeout: 15000 });
  await page.click('.topbar .lang-btn');
  await page.waitForFunction(() => document.body.textContent.includes('Bills / Orders'), { timeout: 5000 });
  ok('UI switched to English', true);
  const enTables = await page.evaluate(() => document.body.textContent.includes('Free'));
  ok('table strip translated (Free)', enTables);
  await page.click('.topbar .lang-btn');
  await page.waitForFunction(() => document.body.textContent.includes('बिल / ऑर्डर'), { timeout: 5000 });
  ok('UI switched back to Hindi', true);

  console.log('— offline queue + auto sync (direct bill) —');
  await page.click('.search', { clickCount: 3 });
  await page.type('.search', 'वड़ा पाव');
  await page.waitForFunction(() => document.querySelectorAll('.dish-card').length < 10);
  await clickText(page, '.price-chip.single', '₹20');
  await page.waitForSelector('.cart-row');
  await page.setOfflineMode(true);
  await page.waitForFunction(() => document.querySelector('.conn-pill').textContent.includes('ऑफ़लाइन'));
  ok('UI shows offline indicator', true);
  await clickText(page, '.cart-actions button', 'सेव करें');
  await page.waitForFunction(() => (localStorage.getItem('bfvr_queue') || '').includes('upsert'), { timeout: 10000 });
  const queued = await page.evaluate(() => JSON.parse(localStorage.getItem('bfvr_queue') || '[]').length);
  ok('offline save queued locally', queued >= 1, `queue=${queued}`);
  await page.setOfflineMode(false);
  await page.waitForFunction(() => (localStorage.getItem('bfvr_queue') || '[]') === '[]', { timeout: 15000 });
  ok('queue auto-synced when back online', true);
  const syncToast = await page.evaluate(() => document.body.textContent.includes('sync हो गई'));
  ok('sync success toast shown', syncToast);

  console.log('— manager restrictions in UI —');
  await clickText(page, '.nav-item', 'मेन्यू');
  await page.waitForSelector('.menu-group');
  const hasAddBtn = await page.evaluate(() => !!Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('नया आइटम')));
  ok('manager does NOT see "add item" button', !hasAddBtn);
  const seesReadOnly = await page.evaluate(() => document.body.textContent.includes('केवल एडमिन'));
  ok('manager sees read-only notice', seesReadOnly);

  console.log('— analytics dashboard —');
  await clickText(page, '.nav-item', 'एनालिटिक्स');
  await page.waitForSelector('.stat-card', { timeout: 15000 });
  const stats = await page.$$eval('.stat-card', (els) => els.length);
  ok('daily stat cards rendered', stats >= 4, `cards=${stats}`);
  await page.waitForSelector('.chart-card svg, .card svg', { timeout: 15000 });
  const svgCount = await page.$$eval('svg', (els) => els.length);
  ok('charts rendered as SVG', svgCount >= 2, `svgs=${svgCount}`);
  const closingOk = await page.evaluate(
    () => document.body.textContent.includes('दिन की बंदी') && document.body.textContent.includes('ड्रॉअर में रखा')
  );
  ok('closing card uses kept-in-drawer model (no fixed float)', closingOk);
  const mixDaily = await page.evaluate(() => document.body.textContent.includes('भुगतान का मिश्रण'));
  ok('daily payment mix (cash vs QR) shown', mixDaily);

  await clickText(page, '.seg button', 'साप्ताहिक');
  await page.waitForFunction(() => document.body.textContent.includes('7 दिन का राजस्व'), { timeout: 15000 });
  ok('weekly analytics loads', true);
  await page.waitForFunction(() => document.querySelectorAll('.table-card table tbody tr').length === 7, { timeout: 15000 });
  ok('weekly day-by-day table (cash/QR/net per day)', true);
  await clickText(page, '.seg button', 'वार्षिक');
  await page.waitForFunction(() => document.querySelectorAll('.chart-card svg').length >= 1, { timeout: 15000 });
  ok('yearly analytics loads with charts', true);
  await page.waitForFunction(() => document.querySelectorAll('.table-card table tbody tr').length === 12, { timeout: 15000 });
  ok('yearly month-by-month table (cash/QR/net per month)', true);

  console.log('— expenses —');
  await clickText(page, '.nav-item', 'रोज़ का खर्च');
  await page.waitForSelector('.expense-form');
  await clickText(page, '.cat-pick', 'डेयरी');
  await page.type('.expense-form input[type="number"]', '250');
  await page.type('.expense-form input[placeholder="किसके लिए"]', 'दूध मक्खन');
  await clickText(page, '.expense-form button', 'खर्च सेव करें');
  await page.waitForFunction(() => document.body.textContent.includes('खर्च जुड़ गया'), { timeout: 10000 });
  ok('manager adds expense via UI', true);

  console.log('— admin sees management UI —');
  await login(page, 'admin', 'Admin@1234');
  await page.waitForSelector('.pos');
  await clickText(page, '.nav-item', 'मेन्यू');
  await page.waitForSelector('.menu-group');
  const adminAddBtn = await page.evaluate(() => !!Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('नया आइटम')));
  ok('admin sees "add item" button', adminAddBtn);
  await clickText(page, '.nav-item', 'यूज़र');
  await page.waitForFunction(() => document.querySelectorAll('.table tbody tr').length >= 3, { timeout: 15000 });
  ok('admin sees users table', true);
  await clickText(page, '.nav-item', 'सेटिंग्स');
  await page.waitForSelector('input');
  const settingsOk = await page.evaluate(
    () =>
      document.body.textContent.includes('टेबल की संख्या') &&
      document.body.textContent.includes('पहले दिन की शुरूआती नकदी') &&
      document.body.textContent.includes('बंदी')
  );
  ok('settings has table count + starting-cash explanation', settingsOk);

  console.log('— phone responsiveness (390×844) —');
  await clickText(page, '.nav-item', 'नया बिल');
  await page.waitForSelector('.dish-card');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 400));
  const hamburgerVisible = await page.$eval('.hamburger', (el) => getComputedStyle(el).display !== 'none');
  const sidebarOff = await page.$eval('.sidebar', (el) => {
    const r = el.getBoundingClientRect();
    return r.right <= 0;
  });
  ok('hamburger shown, sidebar hidden on phone', hamburgerVisible && sidebarOff);
  await replaceInput(page, '.search', 'मसाला डोसा');
  await page.waitForFunction(() => document.querySelectorAll('.dish-card').length < 10 && document.querySelectorAll('.dish-card').length > 0);
  await clickText(page, '.price-chip.single', '₹80');
  await page.waitForSelector('.cart-row');
  const barVisible = await page.$eval('.mobile-cartbar', (el) => getComputedStyle(el).display !== 'none');
  ok('mobile quick-action bar appears with items', barVisible);
  await page.click('.hamburger');
  await page.waitForFunction(() => document.querySelector('.sidebar')?.classList.contains('open'));
  ok('hamburger opens sidebar on phone', true);
  await page.setViewport({ width: 1440, height: 900 });

  ok('no runtime page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Browser test crashed:', e.message);
  process.exit(1);
});
