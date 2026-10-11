import { Router } from 'express';
import Expense, { EXPENSE_CATEGORIES } from '../models/Expense.js';
import { requireAuth, requirePerm } from '../middleware/auth.js';
import { dayKey, hourKey, isValidDay } from '../lib/day.js';

const router = Router();
router.use(requireAuth);

router.get('/categories', (req, res) => res.json({ categories: EXPENSE_CATEGORIES }));

// GET ?from=&to=&day=&category=
router.get('/', requirePerm('expenses:view'), async (req, res, next) => {
  try {
    const { from, to, day, category } = req.query;
    const filter = { businessId: req.businessId };
    if (day && isValidDay(day)) filter.day = day;
    else if (isValidDay(from) || isValidDay(to)) {
      filter.day = {};
      if (isValidDay(from)) filter.day.$gte = from;
      if (isValidDay(to)) filter.day.$lte = to;
    }
    if (category) filter.category = category;
    const expenses = await Expense.find(filter).sort({ spentAt: -1 }).limit(1000);
    res.json({ expenses: expenses.map((e) => e.toClient()) });
  } catch (err) {
    next(err);
  }
});

// POST create (manager+), offline-safe via clientId
router.post('/', requirePerm('expenses:create'), async (req, res, next) => {
  try {
    const { clientId, category, label = '', amount, note = '', day } = req.body || {};
    if (clientId) {
      const existing = await Expense.findOne({ clientId, businessId: req.businessId });
      if (existing) return res.status(200).json({ expense: existing.toClient(), deduped: true });
    }
    if (!EXPENSE_CATEGORIES.some((c) => c.key === category)) {
      return res.status(400).json({ error: 'Pick a valid expense category' });
    }
    const value = Number(amount);
    if (!value || value <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
    const now = new Date();
    const expense = await Expense.create({
      businessId: req.businessId,
      clientId: clientId || undefined,
      category,
      label: String(label).slice(0, 120),
      amount: value,
      note: String(note).slice(0, 300),
      day: isValidDay(day) ? day : dayKey(now),
      hour: hourKey(now),
      spentAt: now,
      createdBy: { id: req.user._id.toString(), name: req.user.name, role: req.user.role },
    });
    res.status(201).json({ expense: expense.toClient() });
  } catch (err) {
    next(err);
  }
});

// PUT edit (admin only)
router.put('/:id', requirePerm('expenses:edit'), async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const { category, label, amount, note, day } = req.body || {};
    if (category) {
      if (!EXPENSE_CATEGORIES.some((c) => c.key === category)) return res.status(400).json({ error: 'Invalid category' });
      expense.category = category;
    }
    if (label !== undefined) expense.label = String(label).slice(0, 120);
    if (note !== undefined) expense.note = String(note).slice(0, 300);
    if (amount !== undefined) {
      const value = Number(amount);
      if (!value || value <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
      expense.amount = value;
    }
    if (day !== undefined) {
      if (!isValidDay(day)) return res.status(400).json({ error: 'Invalid date' });
      expense.day = day;
    }
    await expense.save();
    res.json({ expense: expense.toClient() });
  } catch (err) {
    next(err);
  }
});

// DELETE (admin only)
router.delete('/:id', requirePerm('expenses:delete'), async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, businessId: req.businessId });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
