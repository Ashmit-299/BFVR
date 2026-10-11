import { Router } from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import { requireAuth, requirePerm } from '../middleware/auth.js';
import { canManageRole, ROLES } from '../lib/permissions.js';

const router = Router();
router.use(requireAuth, requirePerm('users:manage'));

router.get('/', async (req, res, next) => {
  try {
    const users = await User.find({ businessId: req.businessId }).sort({ role: 1, name: 1 });
    res.json({ users: users.map((u) => u.toClient()) });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/overview — superadmin only.
// Returns role counts plus per-user usage analytics (bills, billed amount,
// payments recorded, expenses added, last activity) so the owner can see
// how the admins/managers they created are actually using the system.
router.get('/overview', async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only the super admin can view this overview' });
    }
    const bid = req.businessId;

    const [users, orderAgg, payAgg, expAgg, activityAgg] = await Promise.all([
      User.find({ businessId: bid }).sort({ role: 1, name: 1 }),
      // bills created per user
      Order.aggregate([
        { $match: { businessId: bid } },
        { $group: { _id: '$createdBy.id', orders: { $sum: 1 }, billed: { $sum: '$total' } } },
      ]),
      // payments recorded per user
      Order.aggregate([
        { $match: { businessId: bid, 'payments.by.id': { $exists: true } } },
        { $unwind: '$payments' },
        { $match: { 'payments.by.id': { $exists: true } } },
        { $group: { _id: '$payments.by.id', payments: { $sum: 1 }, paid: { $sum: '$payments.amount' } } },
      ]),
      // expenses added per user
      Expense.aggregate([
        { $match: { businessId: bid } },
        { $group: { _id: '$createdBy.id', expenses: { $sum: 1 }, expenseTotal: { $sum: '$amount' } } },
      ]),
      // most recent action per user (bill placed or expense added)
      Order.aggregate([
        { $match: { businessId: bid, 'createdBy.id': { $exists: true } } },
        { $group: { _id: '$createdBy.id', last: { $max: '$placedAt' } } },
      ]),
    ]);

    const byId = (rows) => new Map(rows.map((r) => [String(r._id), r]));
    const oMap = byId(orderAgg);
    const pMap = byId(payAgg);
    const eMap = byId(expAgg);
    const aMap = byId(activityAgg);

    const overview = users.map((u) => {
      const id = u._id.toString();
      const o = oMap.get(id) || {};
      const p = pMap.get(id) || {};
      const e = eMap.get(id) || {};
      const a = aMap.get(id) || {};
      return {
        id,
        name: u.name,
        username: u.username,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt || null,
        orders: o.orders || 0,
        billed: o.billed || 0,
        payments: p.payments || 0,
        paid: p.paid || 0,
        expenses: e.expenses || 0,
        expenseTotal: e.expenseTotal || 0,
        lastActivityAt: a.last || null,
      };
    });

    const counts = { total: users.length, active: 0, superadmin: 0, admin: 0, manager: 0 };
    for (const u of users) {
      counts[u.role] = (counts[u.role] || 0) + 1;
      if (u.active) counts.active++;
    }

    const totals = overview.reduce(
      (acc, r) => ({
        orders: acc.orders + r.orders,
        billed: acc.billed + r.billed,
        payments: acc.payments + r.payments,
        paid: acc.paid + r.paid,
        expenses: acc.expenses + r.expenses,
        expenseTotal: acc.expenseTotal + r.expenseTotal,
      }),
      { orders: 0, billed: 0, payments: 0, paid: 0, expenses: 0, expenseTotal: 0 }
    );

    res.json({ counts, totals, users: overview });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, username, password, role } = req.body || {};
    if (!name || !username || !password || !ROLES.includes(role)) {
      return res.status(400).json({ error: 'name, username, password and a valid role are required' });
    }
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!canManageRole(req.user.role, role)) {
      return res.status(403).json({ error: `Your role cannot create '${role}' users` });
    }
    const un = String(username).toLowerCase().trim();
    const exists = await User.findOne({ username: un });
    if (exists) return res.status(409).json({ error: 'Username already taken' });
    const user = await User.create({
      businessId: req.businessId,
      name,
      username: un,
      passwordHash: await User.hashPassword(password),
      role,
    });
    res.status(201).json({ user: user.toClient() });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    // scoped lookup: a user of another business is simply "not found"
    const user = await User.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // The single super-admin account is immutable — seeded, cannot be edited.
    if (user.role === 'superadmin') {
      return res.status(403).json({ error: 'The super admin account cannot be edited' });
    }
    const { name, role, active, password } = req.body || {};

    if (role && role !== user.role) {
      if (!canManageRole(req.user.role, role) || !canManageRole(req.user.role, user.role)) {
        return res.status(403).json({ error: `Your role cannot change a '${user.role}' user to '${role}'` });
      }
      if (user._id.equals(req.user._id)) return res.status(400).json({ error: 'You cannot change your own role' });
      user.role = role;
    }
    if (typeof active === 'boolean') {
      if (user._id.equals(req.user._id)) return res.status(400).json({ error: 'You cannot deactivate yourself' });
      user.active = active;
    }
    if (name) user.name = name;
    if (password) {
      if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      user.passwordHash = await User.hashPassword(password);
    }
    await user.save();
    res.json({ user: user.toClient() });
  } catch (err) {
    next(err);
  }
});

export default router;
