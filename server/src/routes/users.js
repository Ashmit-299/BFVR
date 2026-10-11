import { Router } from 'express';
import User from '../models/User.js';
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
