import { Router } from 'express';
import User from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { permissionsFor } from '../lib/permissions.js';

const router = Router();

// NOTE: Public registration is disabled. There is exactly one super admin
// (seeded with fixed credentials) who creates admins; admins create managers.

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
    // The single super-admin account is fixed (seeded) — its password cannot change.
    if (req.user.role === 'superadmin') {
      return res.status(403).json({ error: 'Super admin password cannot be changed' });
    }
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
