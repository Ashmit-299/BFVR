import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { permissionsFor } from '../lib/permissions.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      businessId: user.businessId ? user.businessId.toString() : null,
      role: user.role,
    },
    SECRET,
    { expiresIn: '30d' }
  );
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Login required' });
    let payload;
    try {
      payload = jwt.verify(token, SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expired, please login again' });
    }
    const user = await User.findById(payload.id);
    if (!user || !user.active) return res.status(401).json({ error: 'Account disabled' });
    if (!user.businessId) return res.status(401).json({ error: 'Account is not linked to a business' });
    req.user = user;
    req.businessId = user.businessId;
    req.perms = permissionsFor(user.role);
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePerm(perm) {
  return (req, res, next) => {
    if (!req.perms || !req.perms.includes(perm)) {
      return res.status(403).json({ error: 'You do not have permission for this action' });
    }
    next();
  };
}
