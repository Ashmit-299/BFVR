// Focused regression: taking a customer payment must free the table.
// Path A: POS payment modal ("Receive payment & close")
// Path B: Bills page payment button (full payment → bill auto-closes → table freed)
// Run: node scripts/payment-table-test.mjs
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

async function tableState(page, n) {
  return page.evaluate(async (tn) => {
    const res = await fetch('/api/orders/tables', {
      headers: { Authorization: `Bearer ${localStorage.getItem('bfvr_token')}` },
    });
    const data = await res.json();
    const t = data.tables.find((x) => x.table === tn);
    return t ? (t.order ? { busy: true, id: t.order.id, total: t.order.total, status: t.order.status } : { busy: false }) : null;
  }, n);
}

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
  await page.click('input[autocomplete="username"]', { clickCount: 3 });
  await page.type('input[autocomplete="username"]', 'manager');
  await page.click('input[autocomplete="current-password"]');
  await page.type('input[autocomplete="current-password"]', 'Manager@1234');
  await clickText(page, 'button', 'लॉगिन करें');
  await page.waitForSelector('.pos', { timeout: 15000 });
}

async function buildTableBill(page, tableNo, dishQuery, priceText) {
  await page.waitForFunction(
    (n) => Array.from(document.querySelectorAll('.table-tab')).some((e) => e.textContent.includes(`T${n}`)),
    { timeout: 15000 },
    tableNo
  );
  await clickText(page, '.table-tab', `T${tableNo}`);
  await page.waitForFunction(
    (n) => document.querySelector('.cart-head')?.textContent.includes(`टेबल ${n}`),
    { timeout: 10000 },
    tableNo
  );
  await page.click('.search');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.type(dishQuery);
  await page.waitForFunction(() => {
    const n = document.querySelectorAll('.dish-card').length;
    return n > 0 && n < 20;
  });
  await clickText(page, '.price-chip', priceText);
  await page.waitForSelector('.cart-row');
  await clickText(page, '.cart-actions button', 'सेव करें');
  await page.waitForFunction(() => document.body.textContent.includes('सेव हो गया'), { timeout: 15000 });
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

  // close anything left open from earlier runs so both paths start clean
  await login(page);
  await page.evaluate(async () => {
    const tok = localStorage.getItem('bfvr_token');
    const res = await fetch('/api/orders?bill=open', { headers: { Authorization: `Bearer ${tok}` } });
    const { orders = [] } = await res.json();
    for (const o of orders) {
      await fetch('/api/orders/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ id: o.id }),
      });
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.dish-card', { timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll('.table-tab').length >= 7, { timeout: 15000 });

  console.log('— Path A: POS payment modal frees table T5 —');
  await buildTableBill(page, 5, 'मसाला डोसा', '₹80');
  await page.waitForFunction(() => {
    const t = Array.from(document.querySelectorAll('.table-tab')).find((e) => e.textContent.includes('T5'));
    return t && t.classList.contains('busy');
  }, { timeout: 15000 });
  ok('T5 occupied after save', true);
  const before = await tableState(page, 5);
  ok('server has open bill on T5', before.busy && before.status === 'open', JSON.stringify(before));

  await clickText(page, '.cart-actions button', 'भुगतान लें + बंद करें');
  await page.waitForSelector('.pay-total');
  await clickText(page, '.modal-foot button', 'भुगतान लेकर बंद करें');
  await page.waitForSelector('.print-area .bill', { timeout: 15000 });
  await clickText(page, '.bill-actions button', 'बंद करें');
  await page.waitForFunction(() => {
    const t = Array.from(document.querySelectorAll('.table-tab')).find((e) => e.textContent.includes('T5'));
    return t && t.classList.contains('free');
  }, { timeout: 15000 });
  ok('T5 freed in UI after POS payment', true);
  const afterA = await tableState(page, 5);
  ok('server confirms T5 free', !afterA.busy, JSON.stringify(afterA));

  console.log('— Path B: Bills-page payment frees table T6 —');
  await clickText(page, '.nav-item', 'नया बिल');
  await page.waitForFunction(() => document.querySelectorAll('.table-tab').length >= 7, { timeout: 15000 });
  await buildTableBill(page, 6, 'मसाला डोसा', '₹80');
  await page.waitForFunction(() => {
    const t = Array.from(document.querySelectorAll('.table-tab')).find((e) => e.textContent.includes('T6'));
    return t && t.classList.contains('busy');
  }, { timeout: 15000 });
  const beforeB = await tableState(page, 6);
  ok('server has open bill on T6', beforeB.busy && beforeB.status === 'open', JSON.stringify(beforeB));

  await clickText(page, '.nav-item', 'बिल / ऑर्डर');
  await page.waitForSelector('.table tbody tr', { timeout: 15000 });
  // find the row for our open T6 bill and click its cash (receive payment) button
  const paid = await page.evaluate(async () => {
    const tok = localStorage.getItem('bfvr_token');
    const res = await fetch('/api/orders?bill=open', { headers: { Authorization: `Bearer ${tok}` } });
    const { orders = [] } = await res.json();
    return orders.filter((o) => o.table === 6).length;
  });
  ok('bills list has exactly ONE open bill on T6 (no duplicates)', paid === 1, `open-on-T6=${paid}`);
  await page.waitForFunction(() => {
    const rows = Array.from(document.querySelectorAll('.table tbody tr'));
    const row = rows.find((r) => r.textContent.includes('T6'));
    if (!row) return false;
    const btn = row.querySelector('button.btn-primary'); // cash = receive payment
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, { timeout: 15000 });
  await page.waitForSelector('.modal-foot', { timeout: 10000 });
  // modal prefills the full due — confirm payment
  await clickText(page, '.modal-foot button', 'सेव करें');
  await page.waitForFunction(() => !document.querySelector('.modal-foot'), { timeout: 15000 });
  // the bill must now show as closed, and the table must be free
  await page.waitForFunction(() => {
    const rows = Array.from(document.querySelectorAll('.table tbody tr'));
    const row = rows.find((r) => r.textContent.includes('T6'));
    return row && row.textContent.includes('बंद');
  }, { timeout: 15000 });
  ok('T6 bill shows closed status after full payment', true);
  const afterB = await tableState(page, 6);
  ok('server confirms T6 free after Bills-page payment', !afterB.busy, JSON.stringify(afterB));

  // and the POS strip must reflect it too
  await clickText(page, '.nav-item', 'नया बिल');
  await page.waitForFunction(() => document.querySelectorAll('.table-tab').length >= 7, { timeout: 15000 });
  await page.waitForFunction(() => {
    const t = Array.from(document.querySelectorAll('.table-tab')).find((e) => e.textContent.includes('T6'));
    return t && t.classList.contains('free');
  }, { timeout: 15000 });
  ok('POS table strip shows T6 free again', true);

  ok('no runtime page errors', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 300));

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error('Payment/table test crashed:', err.message);
  process.exit(1);
});
