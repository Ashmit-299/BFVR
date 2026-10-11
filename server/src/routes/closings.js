import { Router } from 'express';
import Order, { paidAmount } from '../models/Order.js';
import Expense from '../models/Expense.js';
import Closing from '../models/Closing.js';
import Setting from '../models/Setting.js';
import { requireAuth, requirePerm } from '../middleware/auth.js';
import { addDays, dayKey, isValidDay } from '../lib/day.js';

const router = Router();
router.use(requireAuth);

// Opening cash for a day = what was KEPT in the drawer at the previous closing
// (any amount the owner decided — ₹500, ₹0, …). Only the very first day with no
// prior closing record falls back to settings.openingFloat.
async function openingFor(businessId, day) {
  const prev = await Closing.findOne({ businessId, day: { $lt: day } }).sort({ day: -1 });
  if (prev) {
    if (prev.closingCash != null) return prev.closingCash;
    return prev.floatAmount ?? 0; // legacy record without closingCash
  }
  const s = await Setting.get(businessId);
  return s.openingFloat ?? 0;
}

async function dayNumbers(businessId, day) {
  const [orders, expenses, closing, opening] = await Promise.all([
    Order.find({ businessId, day }),
    Expense.find({ businessId, day }),
    Closing.findOne({ businessId, day }),
    openingFor(businessId, day),
  ]);
  const revenue = orders.reduce((s, o) => s + o.payments.reduce((a, p) => a + p.amount, 0), 0);
  const billed = orders.reduce((s, o) => s + o.total, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const cashAvailable = opening + revenue - expenseTotal;
  const withdrawn = closing ? closing.withdrawn : 0;
  const closingCash = closing && closing.closingCash != null ? closing.closingCash : cashAvailable - withdrawn;
  return {
    day,
    opening,
    floatAmount: opening,
    revenue,
    billed,
    expenses: expenseTotal,
    net: revenue - expenseTotal,
    withdrawn,
    closingCash,
    cashAvailable,
    closing: closing ? closing.toClient() : null,
    orderCount: orders.length,
    expenseCount: expenses.length,
  };
}

// GET /api/closings/summary?day=YYYY-MM-DD
router.get('/summary', requirePerm('closings:view'), async (req, res, next) => {
  try {
    const day = isValidDay(req.query.day) ? req.query.day : dayKey();
    const [today, yesterday] = await Promise.all([
      dayNumbers(req.businessId, day),
      dayNumbers(req.businessId, addDays(day, -1)),
    ]);
    res.json({ today, yesterday });
  } catch (err) {
    next(err);
  }
});

// GET /api/closings?from=&to=
router.get('/', requirePerm('closings:view'), async (req, res, next) => {
  try {
    const to = isValidDay(req.query.to) ? req.query.to : dayKey();
    const from = isValidDay(req.query.from) ? req.query.from : addDays(to, -29);
    const closings = await Closing.find({ businessId: req.businessId, day: { $gte: from, $lte: to } }).sort({ day: -1 });
    res.json({ closings: closings.map((c) => c.toClient()) });
  } catch (err) {
    next(err);
  }
});

// POST record day closing — send EITHER withdrawn OR closingCash (they must add
// up to cashAvailable: opening + revenue − expenses)
router.post('/', requirePerm('closings:write'), async (req, res, next) => {
  try {
    const { day, withdrawn, closingCash, note = '' } = req.body || {};
    const targetDay = isValidDay(day) ? day : dayKey();
    const nums = await dayNumbers(req.businessId, targetDay);
    const avail = nums.cashAvailable;
    let takeOut;
    if (closingCash !== undefined && closingCash !== null && withdrawn === undefined) {
      const kept = Number(closingCash);
      if (isNaN(kept)) return res.status(400).json({ error: 'Invalid amount' });
      if (kept > avail + 0.001 && avail >= 0) {
        return res.status(400).json({ error: 'Kept amount cannot exceed available cash' });
      }
      takeOut = avail - kept;
    } else {
      takeOut = Math.max(0, Number(withdrawn) || 0);
      if (avail >= 0 && takeOut > avail + 0.001) {
        return res.status(400).json({ error: 'Withdrawal cannot exceed available cash' });
      }
    }
    const closing = await Closing.findOneAndUpdate(
      { businessId: req.businessId, day: targetDay },
      {
        businessId: req.businessId,
        day: targetDay,
        opening: nums.opening,
        floatAmount: nums.opening,
        withdrawn: takeOut,
        closingCash: avail - takeOut,
        note: String(note).slice(0, 300),
        closedBy: { id: req.user._id.toString(), name: req.user.name, role: req.user.role },
        closedAt: new Date(),
      },
      { new: true, upsert: true }
    );
    res.status(201).json({ closing: closing.toClient(), summary: await dayNumbers(req.businessId, targetDay) });
  } catch (err) {
    next(err);
  }
});

export default router;
