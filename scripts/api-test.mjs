// End-to-end API smoke test — run: node scripts/api-test.mjs
const BASE = process.env.BASE || 'http://localhost:5050';
const RUN = Date.now().toString(36); // unique per run so the suite is re-runnable
const CID = {
  order: `bill-${RUN}`,
  pay1: `pay1-${RUN}`,
  pay2: `pay2-${RUN}`,
  payOver: `payover-${RUN}`,
  exp: `exp-${RUN}`,
  upsertA: `up-a-${RUN}`,
  upsertB: `up-b-${RUN}`,
  tempMgr: `tempmgr${RUN}`,
  secondAdmin: `admin2${RUN}`,
};
let pass = 0;
let fail = 0;

function ok(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, data };
}

async function login(username, password) {
  const r = await req('POST', '/api/auth/login', { body: { username, password } });
  return r.data?.token;
}

const today = () => new Date().toLocaleDateString('sv-SE');
const yesterdayOf = (day) => {
  const d = new Date(day + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

async function main() {
  // Close bills left open by previous runs/sessions so the table assertions
  // start from a clean slate (same hygiene as browser-test.mjs).
  {
    const tok = await login('admin', 'Admin@1234');
    const open = await req('GET', '/api/orders?bill=open', { token: tok });
    for (const o of open.data?.orders || []) {
      await req('POST', '/api/orders/close', { token: tok, body: { id: o.id } });
    }
    if ((open.data?.orders || []).length) console.log(`(closed ${open.data.orders.length} bill(s) left open previously)`);
  }

  console.log('— auth —');
  const bad = await req('POST', '/api/auth/login', { body: { username: 'admin', password: 'wrong' } });
  ok('wrong password rejected (401)', bad.status === 401);

  const adminTok = await login('admin', 'Admin@1234');
  ok('admin login', !!adminTok);
  const mgrTok = await login('manager', 'Manager@1234');
  ok('manager login', !!mgrTok);
  const superTok = await login('superadmin', 'Super@1234');
  ok('superadmin login', !!superTok);

  const me = await req('GET', '/api/auth/me', { token: mgrTok });
  ok('me returns permissions', Array.isArray(me.data?.user?.permissions) && me.data.user.permissions.includes('orders:create'));

  console.log('— menu —');
  const menu = await req('GET', '/api/menu', { token: adminTok });
  ok('menu has at least 77 items', menu.data?.items?.length >= 77, `got ${menu.data?.items?.length}`);
  const vegChow = menu.data.items.find((i) => i.name === 'वेज चाउमीन');
  ok('veg chowmein 30/50', vegChow?.halfPrice === 30 && vegChow?.fullPrice === 50);

  const mgrMenuWrite = await req('POST', '/api/menu', { token: mgrTok, body: { name: 'Test', category: 'सुप', price: 10 } });
  ok('manager CANNOT create menu item (403)', mgrMenuWrite.status === 403, `got ${mgrMenuWrite.status}`);
  const adminMenuWrite = await req('POST', '/api/menu', { token: adminTok, body: { name: 'टेस्ट सूप', category: 'सुप', price: 55 } });
  ok('admin CAN create menu item', adminMenuWrite.status === 201);
  const delTest = await req('DELETE', `/api/menu/${adminMenuWrite.data?.item?.id}`, { token: adminTok });
  ok('admin deletes test item', delTest.status === 200);

  console.log('— billing (manager input) —');
  const day = today();
  const baseline = await req('GET', `/api/analytics/daily?day=${day}`, { token: mgrTok });
  const baseRev = baseline.data?.revenue || 0;
  const baseExp = baseline.data?.expenses || 0;
  const dosaId = menu.data.items.find((i) => i.name === 'मसाला डोसा')?.id;
  const orderRes = await req('POST', '/api/orders', {
    token: mgrTok,
    body: {
      clientId: CID.order,
      customerName: 'टेस्ट ग्राहक',
      items: [
        { itemId: vegChow.id, portion: 'half', qty: 2 },
        { itemId: dosaId, portion: 'single', qty: 1 },
      ],
      discount: 10,
    },
  });
  ok('manager creates order', orderRes.status === 201, JSON.stringify(orderRes.data));
  const order = orderRes.data?.order;
  // 2×30 + 80 = 140, −10 = 130
  ok('server-side pricing (total ₹130)', order?.total === 130, `got ${order?.total}`);
  ok('new orders start OPEN', order?.status === 'open', `got ${order?.status}`);

  const dedupe = await req('POST', '/api/orders', {
    token: mgrTok,
    body: { clientId: CID.order, items: [{ itemId: vegChow.id, portion: 'full', qty: 5 }] },
  });
  ok('offline replay deduped (same order returned)', dedupe.status === 200 && dedupe.data?.deduped === true);
  const ordersAfter = await req('GET', `/api/orders?day=${order.day}`, { token: mgrTok });
  ok('no duplicate order created', ordersAfter.data.orders.filter((o) => o.clientId === CID.order).length === 1);

  console.log('— payments —');
  const payRes = await req('POST', '/api/orders/payments', {
    token: mgrTok,
    body: { clientId: CID.pay1, orderClientId: CID.order, method: 'upi', amount: 100 },
  });
  ok('partial payment via orderClientId', payRes.status === 201, JSON.stringify(payRes.data));
  ok('due computed (130−100=30)', payRes.data?.order?.due === 30, `got ${payRes.data?.order?.due}`);
  const payDedupe = await req('POST', '/api/orders/payments', {
    token: mgrTok,
    body: { clientId: CID.pay1, orderClientId: CID.order, method: 'upi', amount: 100 },
  });
  ok('payment replay deduped', payDedupe.status === 200 && payDedupe.data?.deduped === true);
  const overpay = await req('POST', `/api/orders/${order.id}/payments`, {
    token: mgrTok,
    body: { clientId: CID.payOver, method: 'cash', amount: 9999 },
  });
  ok('overpayment rejected (400)', overpay.status === 400);
  const payRest = await req('POST', `/api/orders/${order.id}/payments`, {
    token: mgrTok,
    body: { clientId: CID.pay2, method: 'cash', amount: 30 },
  });
  ok('bill fully paid', payRest.data?.order?.paymentStatus === 'paid');

  // manager may extend an OPEN bill (that is "input"), but not a closed one
  const mgrEditOpen = await req('PUT', `/api/orders/${order.id}`, { token: mgrTok, body: { discount: 5 } });
  ok('manager CAN edit an OPEN bill', mgrEditOpen.status === 200, `got ${mgrEditOpen.status}`);
  const closeBill = await req('POST', '/api/orders/close', { token: adminTok, body: { id: order.id } });
  ok('admin closes bill', closeBill.status === 200 && closeBill.data?.order?.status === 'closed', JSON.stringify(closeBill.data));
  const mgrEditClosed = await req('PUT', `/api/orders/${order.id}`, { token: mgrTok, body: { discount: 0 } });
  ok('manager CANNOT edit a CLOSED bill (403)', mgrEditClosed.status === 403, `got ${mgrEditClosed.status}`);

  console.log('— expenses —');
  const expRes = await req('POST', '/api/expenses', {
    token: mgrTok,
    body: { clientId: CID.exp, category: 'vegetables', label: 'आलू प्याज़', amount: 600 },
  });
  ok('manager adds expense', expRes.status === 201, JSON.stringify(expRes.data));
  const expDedupe = await req('POST', '/api/expenses', {
    token: mgrTok,
    body: { clientId: CID.exp, category: 'vegetables', label: 'आलू प्याज़', amount: 600 },
  });
  ok('expense replay deduped', expDedupe.status === 200 && expDedupe.data?.deduped === true);
  const expOver = await req('POST', '/api/expenses', {
    token: mgrTok,
    body: { clientId: `exp-bad-${RUN}`, category: 'vegetables', amount: 0 },
  });
  ok('zero amount rejected (400)', expOver.status === 400);

  console.log('— tables & upsert (parallel table orders) —');
  const tabs = await req('GET', '/api/orders/tables', { token: mgrTok });
  ok('6 tables by default', tabs.status === 200 && tabs.data?.count === 6 && tabs.data?.tables?.length === 6, JSON.stringify({ c: tabs.data?.count }));
  ok('all tables free at start', tabs.data.tables.every((x) => x.order === null));

  const up1 = await req('POST', '/api/orders/upsert', {
    token: mgrTok,
    body: { clientId: CID.upsertA, table: 1, items: [{ itemId: vegChow.id, portion: 'full', qty: 1 }] },
  });
  ok('upsert opens table 1', up1.status === 201 && up1.data?.order?.table === 1 && up1.data?.order?.status === 'open', JSON.stringify(up1.data));

  const up2 = await req('POST', '/api/orders/upsert', {
    token: mgrTok,
    body: { clientId: CID.upsertA, table: 1, items: [{ itemId: vegChow.id, portion: 'full', qty: 2 }, { itemId: dosaId, portion: 'single', qty: 1 }] },
  });
  ok('second upsert extends same bill', up2.status === 200 && up2.data?.order?.id === up1.data?.order?.id, JSON.stringify({ s: up2.status, same: up2.data?.order?.id === up1.data?.order?.id }));
  ok('extended total (2×50+80=180)', up2.data?.order?.total === 180, `got ${up2.data?.order?.total}`);

  const up3 = await req('POST', '/api/orders/upsert', {
    token: mgrTok,
    body: { clientId: CID.upsertB, table: 1, items: [{ itemId: dosaId, portion: 'single', qty: 3 }] },
  });
  ok('different clientId on busy table joins SAME bill (no double-open)', up3.status === 200 && up3.data?.order?.id === up1.data?.order?.id, JSON.stringify({ s: up3.status }));

  const tabs2 = await req('GET', '/api/orders/tables', { token: mgrTok });
  ok('table 1 shows occupied with amount', tabs2.data.tables[0].order?.total === 240 && tabs2.data.tables[1].order === null, `t1=${tabs2.data.tables[0].order?.total}`);

  const closeT = await req('POST', '/api/orders/close', { token: mgrTok, body: { orderClientId: CID.upsertA } });
  ok('close by orderClientId frees table', closeT.status === 200 && closeT.data?.order?.status === 'closed', JSON.stringify(closeT.data));
  const tabs3 = await req('GET', '/api/orders/tables', { token: mgrTok });
  ok('table 1 free again', tabs3.data.tables[0].order === null);
  const closeAgain = await req('POST', '/api/orders/close', { token: mgrTok, body: { orderClientId: CID.upsertA } });
  ok('double close is idempotent', closeAgain.status === 200 && closeAgain.data?.already === true);

  console.log('— daily closing chain (no fixed float) —');
  const sum1 = await req('GET', `/api/closings/summary?day=${day}`, { token: mgrTok });
  ok('summary has opening & available cash', sum1.status === 200 && typeof sum1.data?.today?.opening === 'number' && typeof sum1.data?.today?.cashAvailable === 'number', JSON.stringify(sum1.data?.today));

  const yDay = yesterdayOf(day);
  const sumY = await req('GET', `/api/closings/summary?day=${yDay}`, { token: mgrTok });
  const yAvail = sumY.data?.today?.cashAvailable;
  const closeY = await req('POST', '/api/closings', { token: adminTok, body: { day: yDay, closingCash: yAvail } });
  ok('admin records yesterday keeping all cash', closeY.status === 201, JSON.stringify(closeY.data));
  const sum2 = await req('GET', `/api/closings/summary?day=${day}`, { token: mgrTok });
  ok(`today opens with yesterday's kept cash (${yAvail})`, sum2.data?.today?.opening === yAvail, `got ${sum2.data?.today?.opening}`);

  const closeToday = await req('POST', '/api/closings', { token: adminTok, body: { day, withdrawn: 0 } });
  ok('admin records today closing', closeToday.status === 201, JSON.stringify(closeToday.data));
  const sum3 = await req('GET', `/api/closings/summary?day=${day}`, { token: mgrTok });
  ok('closingCash = available − withdrawn', Math.abs((sum3.data?.today?.closingCash ?? -1) - ((sum3.data?.today?.cashAvailable ?? 0) - (sum3.data?.today?.withdrawn ?? 0))) < 0.01, JSON.stringify({ c: sum3.data?.today?.closingCash, a: sum3.data?.today?.cashAvailable }));
  const mgrClose = await req('POST', '/api/closings', { token: mgrTok, body: { day, withdrawn: 999 } });
  ok('manager CANNOT record closing (403)', mgrClose.status === 403, `got ${mgrClose.status}`);

  console.log('— analytics —');
  const daily = await req('GET', `/api/analytics/daily?day=${day}`, { token: mgrTok });
  ok('manager views daily analytics', daily.status === 200 && typeof daily.data?.revenue === 'number');
  ok('daily revenue matches payments (+130 this run)', daily.data?.revenue === baseRev + 130, `got ${daily.data?.revenue}, base ${baseRev}`);
  ok('daily expenses matches entry (+600 this run)', daily.data?.expenses === baseExp + 600, `got ${daily.data?.expenses}, base ${baseExp}`);
  ok('hourly array present', Array.isArray(daily.data?.hourly));
  const mix = daily.data?.methodTotals;
  const mixSum = mix ? mix.cash + mix.upi + mix.card + mix.other : -1;
  ok('daily payment mix (cash/QR/card) sums to revenue', mixSum === daily.data?.revenue, `mix=${mixSum} rev=${daily.data?.revenue}`);
  ok('daily mix has QR (upi) bucket', mix && typeof mix.upi === 'number', JSON.stringify(mix));
  const weekly = await req('GET', '/api/analytics/weekly', { token: mgrTok });
  ok('weekly analytics (7 days)', weekly.status === 200 && weekly.data?.days?.length === 7);
  ok('weekly top dishes present', Array.isArray(weekly.data?.topDishes) && weekly.data.topDishes.length > 0);
  const wMix = weekly.data?.methodTotals;
  const wMixSum = wMix ? wMix.cash + wMix.upi + wMix.card + wMix.other : -1;
  ok('weekly payment mix sums to revenue', wMixSum === weekly.data?.totals?.revenue, `mix=${wMixSum}`);
  ok('weekly rows carry day-wise cash/QR methods', weekly.data.days.every((d) => d.methods && typeof d.methods.cash === 'number' && typeof d.methods.upi === 'number'));
  const yearly = await req('GET', '/api/analytics/yearly', { token: mgrTok });
  ok('yearly analytics (12 months)', yearly.status === 200 && yearly.data?.months?.length === 12);
  ok('yearly months carry methods', yearly.data.months.every((m) => m.methods && typeof m.methods.cash === 'number'));
  const yMix = yearly.data?.methodTotals;
  const yMixSum = yMix ? yMix.cash + yMix.upi + yMix.card + yMix.other : -1;
  ok('yearly payment mix sums to revenue', yMixSum === yearly.data?.totals?.revenue, `mix=${yMixSum}`);

  console.log('— users & roles —');
  const mgrUsers = await req('GET', '/api/users', { token: mgrTok });
  ok('manager CANNOT list users (403)', mgrUsers.status === 403);
  const adminMakesMgr = await req('POST', '/api/users', {
    token: adminTok,
    body: { name: 'Temp Manager', username: CID.tempMgr, password: 'Temp@1234', role: 'manager' },
  });
  ok('admin CAN create manager', adminMakesMgr.status === 201, JSON.stringify(adminMakesMgr.data));
  const adminMakesAdmin = await req('POST', '/api/users', {
    token: adminTok,
    body: { name: 'Evil', username: `evil${RUN}`, password: 'Evil@1234', role: 'admin' },
  });
  ok('admin CANNOT create another admin (403)', adminMakesAdmin.status === 403, `got ${adminMakesAdmin.status}`);
  const superMakesAdmin = await req('POST', '/api/users', {
    token: superTok,
    body: { name: 'Second Admin', username: CID.secondAdmin, password: 'Admin2@1234', role: 'admin' },
  });
  ok('superadmin CAN create admin', superMakesAdmin.status === 201, JSON.stringify(superMakesAdmin.data));

  for (const u of [adminMakesMgr.data?.user?.id, superMakesAdmin.data?.user?.id]) {
    if (u) await req('PUT', `/api/users/${u}`, { token: superTok, body: { active: false } });
  }

  console.log('— settings —');
  const st = await req('GET', '/api/settings', { token: mgrTok });
  ok('settings readable', st.status === 200 && typeof st.data?.settings?.restaurant === 'object');
  const mgrSt = await req('PUT', '/api/settings', { token: mgrTok, body: { openingFloat: 5 } });
  ok('manager CANNOT change settings (403)', mgrSt.status === 403);
  const tblBad = await req('PUT', '/api/settings', { token: adminTok, body: { tableCount: 15 } });
  ok('table count out of range rejected (400)', tblBad.status === 400, `got ${tblBad.status}`);
  const tblOk = await req('PUT', '/api/settings', { token: adminTok, body: { tableCount: 6 } });
  ok('table count 6 accepted', tblOk.status === 200 && tblOk.data?.settings?.tableCount === 6);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Test crashed:', e);
  process.exit(1);
});
