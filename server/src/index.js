import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import { migrateTenancy } from './lib/multitenant.js';
import { seedAll } from './seed.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import expenseRoutes from './routes/expenses.js';
import closingRoutes from './routes/closings.js';
import analyticsRoutes from './routes/analytics.js';
import settingsRoutes from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const app = express();

app.use(express.json({ limit: '1mb' }));
// CLIENT_ORIGIN: comma-separated origins, or "*" for any (packaged APK/EXE
// apps and Render's *.onrender.com URL both hit this API cross-origin).
const clientOrigin = process.env.CLIENT_ORIGIN;
app.use(
  cors({
    origin: !clientOrigin || clientOrigin.trim() === '*' ? true : clientOrigin.split(',').map((o) => o.trim()),
  })
);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/closings', closingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

// Serve the built client (production mode: single port)
const dist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;

connectDB(process.env.MONGO_URI)
  .then(async () => {
    const businessId = await migrateTenancy();
    // Fresh cloud deployment: seed demo menu/users once so the app works
    // immediately after deploy (idempotent — never touches existing data).
    if (process.env.AUTO_SEED !== '0') await seedAll(businessId);
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
