import Setting from '../models/Setting.js';
import User from '../models/User.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import Closing from '../models/Closing.js';

const SCOPED = [User, MenuItem, Order, Expense, Closing];

// One-time (idempotent) multi-tenancy migration:
// 1. Adopt the legacy singleton Setting (or create one) as the default business.
// 2. Attach every pre-existing doc that has no businessId to that business —
//    so the current restaurant keeps all of its data after the upgrade.
// 3. Rebuild indexes: drop the old GLOBAL unique indexes (clientId, day, key)
//    and create the new per-business compound ones.
export async function migrateTenancy() {
  let business = await Setting.findOne().sort({ createdAt: 1 });
  if (!business) business = await Setting.create({});
  const bid = business._id;

  for (const M of SCOPED) {
    await M.updateMany({ businessId: { $exists: false } }, { $set: { businessId: bid } });
    await M.updateMany({ businessId: null }, { $set: { businessId: bid } });
  }

  for (const M of [Setting, ...SCOPED]) {
    await M.syncIndexes();
  }

  return bid;
}
