import { Router } from 'express';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import Setting from '../models/Setting.js';
import { requireAuth, requirePerm } from '../middleware/auth.js';
import { addDays, dayRange, dayKey, isValidDay, MONTHS } from '../lib/day.js';

const router = Router();
router.use(requireAuth, requirePerm('analytics:view'));

const EMPTY_METHODS = { cash: 0, upi: 0, card: 0, other: 0 };

const fillDays = (days, maps) =>
  days.map((d) => ({
    day: d,
    revenue: maps.revenue[d] || 0,
    billed: maps.billed[d] || 0,
    orders: maps.orders[d] || 0,
    expenses: maps.expenses[d] || 0,
    net: (maps.revenue[d] || 0) - (maps.expenses[d] || 0),
    methods: maps.methods[d] ? { ...EMPTY_METHODS, ...maps.methods[d] } : { ...EMPTY_METHODS },
  }));

// Shared aggregation over an inclusive day range, scoped to one business
async function rangeStats(businessId, from, to) {
  const days = dayRange(from, to);
  const [collections, billed, expByDay, expByCat, topDishes] = await Promise.all([
    Order.aggregate([
      { $match: { businessId, 'payments.day': { $gte: from, $lte: to } } },
      { $unwind: '$payments' },
      { $match: { 'payments.day': { $gte: from, $lte: to } } },
      { $group: { _id: { day: '$payments.day', method: '$payments.method' }, revenue: { $sum: '$payments.amount' } } },
    ]),
    Order.aggregate([
      { $match: { businessId, day: { $gte: from, $lte: to } } },
      { $group: { _id: '$day', billed: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { businessId, day: { $gte: from, $lte: to } } },
      { $group: { _id: '$day', expenses: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { businessId, day: { $gte: from, $lte: to } } },
      { $group: { _id: '$category', amount: { $sum: '$amount' } } },
      { $sort: { amount: -1 } },
    ]),
    Order.aggregate([
      { $match: { businessId, day: { $gte: from, $lte: to } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          qty: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const maps = { revenue: {}, billed: {}, orders: {}, expenses: {}, methods: {} };
  for (const r of collections) {
    const { day: d, method } = r._id;
    maps.revenue[d] = (maps.revenue[d] || 0) + r.revenue;
    if (!maps.methods[d]) maps.methods[d] = { ...EMPTY_METHODS };
    maps.methods[d][method] = (maps.methods[d][method] || 0) + r.revenue;
  }
  for (const r of billed) {
    maps.billed[r._id] = r.billed;
    maps.orders[r._id] = r.orders;
  }
  for (const r of expByDay) maps.expenses[r._id] = r.expenses;

  const rows = fillDays(days, maps);
  const totals = rows.reduce(
    (a, r) => ({
      revenue: a.revenue + r.revenue,
      billed: a.billed + r.billed,
      orders: a.orders + r.orders,
      expenses: a.expenses + r.expenses,
      net: a.net + r.net,
      methods: {
        cash: a.methods.cash + r.methods.cash,
        upi: a.methods.upi + r.methods.upi,
        card: a.methods.card + r.methods.card,
        other: a.methods.other + r.methods.other,
      },
    }),
    { revenue: 0, billed: 0, orders: 0, expenses: 0, net: 0, methods: { ...EMPTY_METHODS } }
  );
  return { rows, totals, expenseByCategory: expByCat.map((e) => ({ category: e._id, amount: e.amount })), topDishes: topDishes.map((t) => ({ name: t._id, qty: t.qty, revenue: t.revenue })) };
}

// GET /api/analytics/daily?day=YYYY-MM-DD
router.get('/daily', async (req, res, next) => {
  try {
    const day = isValidDay(req.query.day) ? req.query.day : dayKey();
    const prevDay = addDays(day, -1);
    const [stats, prevStats, hourlyAgg, ordersByHourAgg] = await Promise.all([
      rangeStats(req.businessId, day, day),
      rangeStats(req.businessId, prevDay, prevDay),
      revenueByHour(req.businessId, day),
      Order.aggregate([
        { $match: { businessId: req.businessId, day } },
        { $group: { _id: '$hour', orders: { $sum: 1 }, billed: { $sum: '$total' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const revenue = stats.rows[0]?.revenue || 0;
    const expenses = stats.rows[0]?.expenses || 0;
    const billed = stats.rows[0]?.billed || 0;

    res.json({
      day,
      revenue,
      billed,
      expenses,
      net: revenue - expenses,
      orders: stats.rows[0]?.orders || 0,
      methodTotals: stats.rows[0]?.methods || { ...EMPTY_METHODS },
      expenseByCategory: stats.expenseByCategory,
      hourly: Array.from({ length: 18 }, (_, i) => {
        const h = i + 8; // 8:00 → 1:00 (restaurant hours)
        const row = hourlyAgg.find((r) => r._id === h);
        return { hour: h, revenue: row?.revenue || 0 };
      }).filter((r) => r.hour <= 23),
      ordersByHour: ordersByHourAgg.map((r) => ({ hour: r._id ?? 0, orders: r.orders, billed: r.billed })),
      prevDay: {
        day: prevDay,
        revenue: prevStats.rows[0]?.revenue || 0,
        expenses: prevStats.rows[0]?.expenses || 0,
        net: prevStats.rows[0]?.net || 0,
      },
      topDishes: stats.topDishes,
    });
  } catch (err) {
    next(err);
  }
});

function revenueByHour(businessId, day) {
  return Order.aggregate([
    { $match: { businessId, 'payments.day': day } },
    { $unwind: '$payments' },
    { $match: { 'payments.day': day } },
    { $group: { _id: '$payments.hour', revenue: { $sum: '$payments.amount' } } },
    { $sort: { _id: 1 } },
  ]);
}

// GET /api/analytics/weekly?end=YYYY-MM-DD → rolling 7 days ending on `end`
router.get('/weekly', async (req, res, next) => {
  try {
    const end = isValidDay(req.query.end) ? req.query.end : dayKey();
    const start = addDays(end, -6);
    const stats = await rangeStats(req.businessId, start, end);
    res.json({ start, end, days: stats.rows, totals: stats.totals, methodTotals: stats.totals.methods, expenseByCategory: stats.expenseByCategory, topDishes: stats.topDishes });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/yearly?year=2026
router.get('/yearly', async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const stats = await rangeStats(req.businessId, from, to);
    const months = MONTHS.map((label, idx) => {
      const key = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const rows = stats.rows.filter((r) => r.day.startsWith(key));
      const agg = rows.reduce(
        (a, r) => ({
          revenue: a.revenue + r.revenue,
          billed: a.billed + r.billed,
          orders: a.orders + r.orders,
          expenses: a.expenses + r.expenses,
          net: a.net + r.net,
          methods: {
            cash: a.methods.cash + r.methods.cash,
            upi: a.methods.upi + r.methods.upi,
            card: a.methods.card + r.methods.card,
            other: a.methods.other + r.methods.other,
          },
        }),
        { revenue: 0, billed: 0, orders: 0, expenses: 0, net: 0, methods: { ...EMPTY_METHODS } }
      );
      return { month: key, label, ...agg };
    });
    res.json({ year, months, totals: stats.totals, methodTotals: stats.totals.methods, expenseByCategory: stats.expenseByCategory, topDishes: stats.topDishes });
  } catch (err) {
    next(err);
  }
});

export default router;
