import { Router } from 'express';
import Setting from '../models/Setting.js';
import { requireAuth, requirePerm } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const s = await Setting.get(req.businessId);
    res.json({
      settings: {
        restaurant: s.restaurant,
        currency: s.currency,
        openingFloat: s.openingFloat,
        tableCount: s.tableCount || 6,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', requirePerm('settings:manage'), async (req, res, next) => {
  try {
    const s = await Setting.get(req.businessId);
    const { restaurant, openingFloat, currency, tableCount } = req.body || {};
    if (restaurant && typeof restaurant === 'object') {
      for (const key of ['name', 'nameEn', 'tagline', 'address', 'phone', 'upiId', 'gstin']) {
        if (restaurant[key] !== undefined) s.restaurant[key] = String(restaurant[key]).slice(0, 300);
      }
    }
    if (openingFloat !== undefined) {
      const v = Number(openingFloat);
      if (isNaN(v) || v < 0) return res.status(400).json({ error: 'Opening float must be a positive number' });
      s.openingFloat = v;
    }
    if (currency !== undefined) s.currency = String(currency).slice(0, 4);
    if (tableCount !== undefined) {
      const v = Math.round(Number(tableCount));
      if (isNaN(v) || v < 1 || v > 10) return res.status(400).json({ error: 'Table count must be between 1 and 10' });
      s.tableCount = v;
    }
    await s.save();
    res.json({ settings: { restaurant: s.restaurant, currency: s.currency, openingFloat: s.openingFloat, tableCount: s.tableCount || 6 } });
  } catch (err) {
    next(err);
  }
});

export default router;
