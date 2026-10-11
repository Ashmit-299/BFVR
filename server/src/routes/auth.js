import { Router } from 'express';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { permissionsFor } from '../lib/permissions.js';

const router = Router();

// POST /api/auth/register — self-serve signup: creates a brand-new business
// (its own empty Setting doc) plus the owner admin. The new business starts
// with zero menu items, zero orders, zero expenses — a pure fresh dashboard.
router.post('/register', async (req, res, next) => {
  try {
    const { businessName, name, username, password } = req.body || {};
    if (!businessName || !name || !username || !password) {
      return res.status(400).json({ error: 'Business name, your name, username and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const un = String(username).toLowerCase().trim();
    if (!/^[a-z0-9._-]{3,30}$/.test(un)) {
      return res.status(400).json({ error: 'Username must be 3-30 letters, numbers, dots, dashes or underscores' });
    }
    const exists = await User.findOne({ username: un });
    if (exists) return res.status(409).json({ error: 'Username already taken' });

    // Each business owns one Setting document — its _id is the businessId.
    const setting = await Setting.create({
      restaurant: { name: String(businessName).trim().slice(0, 120) },
    });
    const user = await User.create({
      businessId: setting._id,
      name: String(name).trim().slice(0, 80),
      username: un,
      passwordHash: await User.hashPassword(password),
      role: 'admin',
    });
    user.lastLoginAt = new Date();
    await user.save();
    res.status(201).json({
      token: signToken(user),
      user: { ...user.toClient(), permissions: permissionsFor(user.role) },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await User.findOne({ username: String(username).toLowerCase().trim() });
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (!user.active) return res.status(403).json({ error: 'Account is disabled. Contact admin.' });
    user.lastLoginAt = new Date();
    await user.save();
    res.json({ token: signToken(user), user: { ...user.toClient(), permissions: permissionsFor(user.role) } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { ...req.user.toClient(), permissions: req.perms } });
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    if (!(await req.user.verifyPassword(oldPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    req.user.passwordHash = await User.hashPassword(newPassword);
    await req.user.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
