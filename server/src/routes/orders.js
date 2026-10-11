import { Router } from 'express';
import Order, { orderTotals, paidAmount } from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import Setting from '../models/Setting.js';
import { requireAuth, requirePerm } from '../middleware/auth.js';
import { dayKey, hourKey, isValidDay } from '../lib/day.js';

const router = Router();
router.use(requireAuth);

const userBrief = (u) => ({ id: u._id.toString(), name: u.name, role: u.role });

// Build server-priced items from client selection (prices always come from the menu)
async function buildItems(selections, businessId) {
  if (!Array.isArray(selections) || selections.length === 0) {
    return { error: 'Order must contain at least one item' };
  }
  const items = [];
  for (const sel of selections) {
    const menu = await MenuItem.findOne({ _id: sel.itemId, businessId });
    if (!menu) return { error: 'A selected dish no longer exists in the menu' };
    const qty = Math.max(1, Math.round(Number(sel.qty) || 1));
    let portion = sel.portion;
    let price;
    if (menu.halfPrice != null || menu.fullPrice != null) {
      if (portion !== 'half' && portion !== 'full') portion = 'full';
      price = portion === 'half' ? menu.halfPrice : menu.fullPrice;
      if (price == null) return { error: `${menu.name} does not have a ${portion} portion price` };
    } else {
      portion = 'single';
      price = menu.price;
      if (price == null) return { error: `${menu.name} has no price set` };
    }
    items.push({ item: menu._id, name: menu.name, category: menu.category, portion, price, qty });
  }
  return { value: items };
}

// POST create bill (offline-safe via clientId)
router.post('/', requirePerm('orders:create'), async (req, res, next) => {
  try {
    const { clientId, customerName = '', customerPhone = '', items: selections, discount = 0 } = req.body || {};
    if (clientId) {
      const existing = await Order.findOne({ clientId, businessId: req.businessId });
      if (existing) return res.status(200).json({ order: existing.toClient(), deduped: true });
    }
    const built = await buildItems(selections, req.businessId);
    if (built.error) return res.status(400).json({ error: built.error });
    const totals = orderTotals(built.value, discount);
    const now = new Date();
    const order = await Order.create({
      businessId: req.businessId,
      clientId: clientId || undefined,
      number: await Setting.nextOrderNumber(req.businessId),
      customerName: String(customerName).slice(0, 80),
      customerPhone: String(customerPhone).slice(0, 20),
      items: built.value,
      ...totals,
      day: dayKey(now),
      hour: hourKey(now),
      placedAt: now,
      createdBy: userBrief(req.user),
    });
    res.status(201).json({ order: order.toClient() });
  } catch (err) {
    next(err);
  }
});

// GET list with filters: ?from=&to=&day=&status=&q=
router.get('/', requirePerm('orders:view'), async (req, res, next) => {
  try {
    const { from, to, day, status, bill, q } = req.query;
    const filter = { businessId: req.businessId };
    if (bill === 'open' || bill === 'closed') filter.status = bill;
    if (day && isValidDay(day)) filter.day = day;
    else if (isValidDay(from) || isValidDay(to)) {
      filter.day = {};
      if (isValidDay(from)) filter.day.$gte = from;
      if (isValidDay(to)) filter.day.$lte = to;
    }
    if (q) {
      const or = [{ customerName: new RegExp(String(q).trim(), 'i') }];
      if (/^\d+$/.test(q)) or.push({ number: Number(q) });
      filter.$or = or;
    }
    let orders = await Order.find(filter).sort({ placedAt: -1 }).limit(500);
    if (status === 'due') orders = orders.filter((o) => paidAmount(o) < o.total);
    else if (status === 'paid') orders = orders.filter((o) => paidAmount(o) >= o.total);
    res.json({ orders: orders.map((o) => o.toClient()) });
  } catch (err) {
    next(err);
  }
});

// GET /api/tables — live table status (occupied by an open bill or free)
router.get('/tables', requirePerm('orders:view'), async (req, res, next) => {
  try {
    const settings = await Setting.get(req.businessId);
    const count = Math.min(10, Math.max(1, Number(settings.tableCount) || 6));
    const open = await Order.find({ businessId: req.businessId, status: 'open', table: { $ne: null } }).sort({ placedAt: 1 });
    const tables = [];
    for (let i = 1; i <= count; i++) {
      const found = open.find((o) => o.table === i) || null;
      tables.push({ table: i, order: found ? found.toClient() : null });
    }
    res.json({ count, tables });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requirePerm('orders:view'), async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: order.toClient() });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/upsert — create OR extend an open table/bill in one idempotent call.
// Offline-safe: matches by clientId first, then by the table's open bill.
router.post('/upsert', requirePerm('orders:create'), async (req, res, next) => {
  try {
    const { clientId, table, customerName = '', customerPhone = '', items: selections, discount } = req.body || {};
    const tableNo = table != null && table !== '' ? Number(table) : null;
    if (tableNo != null && (!Number.isInteger(tableNo) || tableNo < 1 || tableNo > 10)) {
      return res.status(400).json({ error: 'Invalid table number' });
    }

    let order = null;
    if (clientId) order = await Order.findOne({ clientId, businessId: req.businessId });
    if (!order && tableNo != null) order = await Order.findOne({ businessId: req.businessId, table: tableNo, status: 'open' });

    const built = await buildItems(selections, req.businessId);
    if (built.error) return res.status(400).json({ error: built.error });
    const totals = orderTotals(built.value, discount ?? 0);

    if (order) {
      const paid = paidAmount(order);
      if (paid > totals.total) return res.status(400).json({ error: 'Total is less than the amount already received' });
      order.items = built.value;
      order.subtotal = totals.subtotal;
      order.discount = totals.discount;
      order.total = totals.total;
      if (customerName !== undefined) order.customerName = String(customerName).slice(0, 80);
      if (customerPhone !== undefined) order.customerPhone = String(customerPhone).slice(0, 20);
      if (tableNo != null && order.table == null) order.table = tableNo;
      if (clientId && !order.clientId) {
        const taken = await Order.findOne({ clientId, businessId: req.businessId });
        if (!taken) order.clientId = clientId;
      }
      order.updatedBy = userBrief(req.user);
      await order.save();
      return res.json({ order: order.toClient(), updated: true });
    }

    const now = new Date();
    const created = await Order.create({
      businessId: req.businessId,
      clientId: clientId || undefined,
      number: await Setting.nextOrderNumber(req.businessId),
      table: tableNo,
      status: 'open',
      customerName: String(customerName).slice(0, 80),
      customerPhone: String(customerPhone).slice(0, 20),
      items: built.value,
      ...totals,
      day: dayKey(now),
      hour: hourKey(now),
      placedAt: now,
      createdBy: userBrief(req.user),
    });
    res.status(201).json({ order: created.toClient() });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/close — finish a bill and free its table. Offline-safe by orderClientId.
router.post('/close', requirePerm('orders:create'), async (req, res, next) => {
  try {
    const { id, orderClientId } = req.body || {};
    let order = null;
    if (id) order = await Order.findOne({ _id: id, businessId: req.businessId });
    if (!order && orderClientId) order = await Order.findOne({ clientId: orderClientId, businessId: req.businessId });
    if (!order) return res.status(404).json({ error: 'Order not found — it may still be syncing' });
    if (order.status === 'closed') return res.json({ order: order.toClient(), already: true });
    order.status = 'closed';
    order.closedAt = new Date();
    order.closedBy = userBrief(req.user);
    order.updatedBy = userBrief(req.user);
    await order.save();
    res.json({ order: order.toClient() });
  } catch (err) {
    next(err);
  }
});

// PUT edit a past bill — admin may edit anything; manager may only extend
// an order that is still OPEN on a table (that is "input", not editing past bills)
router.put('/:id', requirePerm('orders:create'), async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const canEdit = req.perms.includes('orders:edit') || (req.perms.includes('orders:create') && order.status === 'open');
    if (!canEdit) return res.status(403).json({ error: 'Closed bills can only be edited by an admin' });
    const { customerName, customerPhone, items: selections, discount } = req.body || {};
    if (selections !== undefined) {
      const built = await buildItems(selections, req.businessId);
      if (built.error) return res.status(400).json({ error: built.error });
      const paid = paidAmount(order);
      const totals = orderTotals(built.value, discount ?? order.discount);
      if (paid > totals.total) return res.status(400).json({ error: 'Total is less than the amount already received' });
      order.items = built.value;
      order.subtotal = totals.subtotal;
      order.discount = totals.discount;
      order.total = totals.total;
    } else if (discount !== undefined) {
      const paid = paidAmount(order);
      const totals = orderTotals(order.items, discount);
      if (paid > totals.total) return res.status(400).json({ error: 'Total is less than the amount already received' });
      order.subtotal = totals.subtotal;
      order.discount = totals.discount;
      order.total = totals.total;
    }
    if (customerName !== undefined) order.customerName = String(customerName).slice(0, 80);
    if (customerPhone !== undefined) order.customerPhone = String(customerPhone).slice(0, 20);
    order.updatedBy = userBrief(req.user);
    await order.save();
    res.json({ order: order.toClient() });
  } catch (err) {
    next(err);
  }
});

// DELETE a bill (admin only)
router.delete('/:id', requirePerm('orders:delete'), async (req, res, next) => {
  try {
    const order = await Order.findOneAndDelete({ _id: req.params.id, businessId: req.businessId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ ok: true, number: order.number });
  } catch (err) {
    next(err);
  }
});

// Shared payment logic — validates, dedupes by clientId, records day/hour
async function processPayment(order, body, user) {
  const { clientId, method = 'cash', amount } = body || {};
  if (clientId && order.payments.some((p) => p.clientId === clientId)) {
    return { order, deduped: true };
  }
  const value = Number(amount);
  if (!value || value <= 0) return { error: 'Amount must be greater than 0' };
  if (!['cash', 'upi', 'card', 'other'].includes(method)) return { error: 'Invalid payment method' };
  const due = order.total - paidAmount(order);
  if (value > due + 0.001) return { error: `Amount exceeds due (₹${due})` };
  const now = new Date();
  order.payments.push({
    clientId: clientId || undefined,
    method,
    amount: value,
    day: dayKey(now),
    hour: hourKey(now),
    at: now,
    by: userBrief(user),
  });
  order.updatedBy = userBrief(user);
  await order.save();
  return { order };
}

// POST record a payment against an order that exists on the server
router.post('/:id/payments', requirePerm('payments:record'), async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const result = await processPayment(order, req.body, req.user);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(result.deduped ? 200 : 201).json({ order: result.order.toClient(), deduped: !!result.deduped });
  } catch (err) {
    next(err);
  }
});

// POST record a payment referencing the order by its clientId —
// used by the offline queue so a payment can be queued before the order has synced
router.post('/payments', requirePerm('payments:record'), async (req, res, next) => {
  try {
    const { orderClientId } = req.body || {};
    if (!orderClientId) return res.status(400).json({ error: 'orderClientId is required' });
    const order = await Order.findOne({ clientId: orderClientId, businessId: req.businessId });
    if (!order) return res.status(404).json({ error: 'Order not synced yet — retry after connection returns' });
    const result = await processPayment(order, req.body, req.user);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(result.deduped ? 200 : 201).json({ order: result.order.toClient(), deduped: !!result.deduped });
  } catch (err) {
    next(err);
  }
});

export default router;
