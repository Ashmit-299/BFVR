// wipe-and-reseed.mjs — one-shot DB reset for the demo business.
//
// Deletes EVERYTHING that belongs to the demo business except the menu card,
// then runs the normal seed so that exactly these remain:
//   - menu items (full demo menu, untouched)
//   - 3 users: superadmin / admin / manager (with their fixed passwords)
//   - 1 fresh Setting (openingFloat 100, tableCount 6, orderSeq 1000)
// so every new account that logs in starts from a clean dashboard (order
// numbers from 1, zero history, no stale closing dates).
//
// Run: node src/scripts/wipe-and-reseed.mjs   (from the server folder)
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
import mongoose from 'mongoose';
import User from '../models/User.js';
import MenuItem from '../models/MenuItem.js';
import Setting from '../models/Setting.js';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import Closing from '../models/Closing.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Copy server/.env.example → .env and fill it in.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const col = (name) => db.collection(name);

  const TEAMS_TO_KEEP = ['superadmin', 'admin', 'manager'];
  let removed = 0;

  // 1) Users — keep only the default trio
  const users = await col('users').find({ role: { $in: TEAMS_TO_KEEP } }).toArray();
  const removeUsers = await col('users').find({ role: { $nin: TEAMS_TO_KEEP } }).toArray();
  for (const u of removeUsers) await col('users').deleteOne({ _id: u._id });
  removed += removeUsers.length;
  console.log(`users: removed ${removeUsers.length}, kept ${users.length}`);

  // 2) Settings — remove every business setting (the old duplicate + the old
  //    restaurant config). The seeds make a fresh one with orderSeq 1000.
  const st = await col('settings').find({}).toArray();
  for (const s of st) await col('settings').deleteOne({ _id: s._id });
  removed += st.length;
  console.log(`settings: removed ${st.length}`);

  // 3) Orders / expenses / closings (everything with a businessId)
  const counts = {};
  for (const m of ['orders', 'expenses', 'closings']) {
    counts[m] = await col(m).countDocuments();
    await col(m).deleteMany({});
    removed += counts[m];
  }
  console.log(`orders: ${counts.orders}, expenses: ${counts.expenses}, closings: ${counts.closings} removed`);

  // 4) Menu — intentionally KEPT (user asked for the menu card to stay).
  const menu = await col('menu_items').countDocuments();
  console.log(`menu_items: kept ${menu}`);

  // 5) Run the normal seed: users + menu upsert + default setting
  const { seedAll } = await import('../seed.js');
  await seedAll(await Setting.get(null)); // businessId null → new default business

  console.log(`\nwipe done. removed ${removed} documents.`);
  const liveUsers = await col('users').countDocuments();
  const liveItems = await col('menu_items').countDocuments();
  const liveOrders = await col('orders').countDocuments();
  console.log(`live: users ${liveUsers}, menu_items ${liveItems}, orders ${liveOrders}, settings ${await col('settings').countDocuments()}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('wipe failed:', err);
  process.exit(1);
});
