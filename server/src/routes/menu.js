import { Router } from 'express';
import multer from 'multer';
import MenuItem, { CATEGORIES } from '../models/MenuItem.js';
import { requireAuth, requirePerm } from '../middleware/auth.js';
import { parseMenuPdf } from '../lib/menuPdf.js';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

router.get('/', requirePerm('menu:view'), async (req, res, next) => {
  try {
    const items = await MenuItem.find({ businessId: req.businessId }).sort({ category: 1, sortOrder: 1, name: 1 });
    res.json({ items: items.map((i) => i.toClient()), categories: CATEGORIES });
  } catch (err) {
    next(err);
  }
});

function parsePrices(body) {
  const hasPortions = body.halfPrice != null || body.fullPrice != null;
  const halfPrice = body.halfPrice != null && body.halfPrice !== '' ? Number(body.halfPrice) : null;
  const fullPrice = body.fullPrice != null && body.fullPrice !== '' ? Number(body.fullPrice) : null;
  const price = body.price != null && body.price !== '' ? Number(body.price) : null;
  if (hasPortions) {
    if (halfPrice == null || fullPrice == null || halfPrice < 0 || fullPrice < 0) {
      return { error: 'Both half and full prices must be positive numbers' };
    }
    if (halfPrice > fullPrice) return { error: 'Half price cannot be more than full price' };
    return { value: { halfPrice, fullPrice, price: null } };
  }
  if (price == null || price < 0) return { error: 'A price is required' };
  return { value: { halfPrice: null, fullPrice: null, price } };
}

router.post('/', requirePerm('menu:manage'), async (req, res, next) => {
  try {
    const { name, category, available = true, sortOrder = 0 } = req.body || {};
    if (!name || !category) return res.status(400).json({ error: 'Name and category are required' });
    const parsed = parsePrices(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const item = await MenuItem.create({
      businessId: req.businessId,
      name: String(name).trim(),
      category: String(category).trim(),
      available,
      sortOrder: Number(sortOrder) || 0,
      ...parsed.value,
    });
    res.status(201).json({ item: item.toClient() });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requirePerm('menu:manage'), async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const { name, category, available, sortOrder } = req.body || {};
    if (name) item.name = String(name).trim();
    if (category) item.category = String(category).trim();
    if (typeof available === 'boolean') item.available = available;
    if (sortOrder != null) item.sortOrder = Number(sortOrder) || 0;
    if (req.body.halfPrice !== undefined || req.body.fullPrice !== undefined || req.body.price !== undefined) {
      const parsed = parsePrices(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      Object.assign(item, parsed.value);
    }
    await item.save();
    res.json({ item: item.toClient() });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requirePerm('menu:manage'), async (req, res, next) => {
  try {
    const item = await MenuItem.findOneAndDelete({ _id: req.params.id, businessId: req.businessId });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Smart upload: parse a menu-card PDF and return structured items for review.
router.post('/parse-pdf', requirePerm('menu:manage'), (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
    try {
      const result = await parseMenuPdf(req.file.buffer);
      if (result.items.length === 0) {
        return res.status(422).json({
          error: 'No items found in PDF. Make sure it is a text-based menu card (not a scanned image).',
        });
      }
      res.json(result);
    } catch (e) {
      next(e);
    }
  });
});

// Bulk import: save reviewed items from the smart-upload flow.
router.post('/bulk', requirePerm('menu:manage'), async (req, res, next) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    if (items.length > 500) return res.status(400).json({ error: 'Too many items (max 500)' });
    const docs = [];
    for (const it of items) {
      const name = String(it.name || '').trim();
      const category = String(it.category || '').trim();
      if (!name || !category) continue;
      const half = it.halfPrice != null && it.halfPrice !== '' ? Number(it.halfPrice) : null;
      const full = it.fullPrice != null && it.fullPrice !== '' ? Number(it.fullPrice) : null;
      const price = it.price != null && it.price !== '' ? Number(it.price) : null;
      let doc = { businessId: req.businessId, name, category, sortOrder: Number(it.sortOrder) || 0 };
      if (half != null && full != null && half >= 0 && full >= 0 && half <= full) {
        doc.halfPrice = half;
        doc.fullPrice = full;
        doc.price = null;
      } else if (price != null && price >= 0) {
        doc.price = price;
        doc.halfPrice = null;
        doc.fullPrice = null;
      } else {
        continue; // skip invalid
      }
      docs.push(doc);
    }
    if (docs.length === 0) return res.status(400).json({ error: 'No valid items to import' });
    const created = await MenuItem.insertMany(docs, { ordered: false });
    res.status(201).json({ imported: created.length });
  } catch (err) {
    next(err);
  }
});

export default router;
