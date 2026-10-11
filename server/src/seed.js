import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
import User from './models/User.js';
import MenuItem from './models/MenuItem.js';
import Setting from './models/Setting.js';
import { migrateTenancy } from './lib/multitenant.js';

// Full menu extracted from "BFVR Menu Card Updated prices.pdf"
// [category, name, half, full] — half/full null means single price
const MENU = [
  // चाइनीज़
  ['चाइनीज़', 'वेज चाउमीन', 30, 50],
  ['चाइनीज़', 'सेजवान चाउमीन', 40, 70],
  ['चाइनीज़', 'मन्चूरियन चाउमीन', 50, 90],
  ['चाइनीज़', 'पनीर चाउमीन', 50, 90],
  ['चाइनीज़', 'वेज राइस', 50, 90],
  ['चाइनीज़', 'सेजवान राइस', 50, 90],
  ['चाइनीज़', 'मन्चूरियन राइस', 50, 100],
  ['चाइनीज़', 'पनीर राइस', 60, 120],
  ['चाइनीज़', 'पनीर मन्चूरियन राइस / ग्रेवी', 75, 140],
  ['चाइनीज़', 'मन्चूरियन ग्रेवी', 50, 90],
  ['चाइनीज़', 'चिल्ली पनीर', 90, 180],
  ['चाइनीज़', 'फिंगर चिल्ली', null, null, 50],
  ['चाइनीज़', 'चिल्ली पटैटो', null, null, 130],
  ['चाइनीज़', 'वेज बर्गर', null, null, 30],
  ['चाइनीज़', 'पनीर बर्गर', null, null, 50],

  // साउथ इंडियन
  ['साउथ इंडियन', 'पेपर डोसा', null, null, 50],
  ['साउथ इंडियन', 'मसाला डोसा', null, null, 80],
  ['साउथ इंडियन', 'मैसूर मसाला डोसा', null, null, 110],
  ['साउथ इंडियन', 'चाइनीज़ डोसा', null, null, 90],
  ['साउथ इंडियन', 'पनीर मसाला डोसा', null, null, 100],
  ['साउथ इंडियन', 'मसाला उत्तपम', null, null, 80],
  ['साउथ इंडियन', 'ओनियन उत्तपम', null, null, 70],
  ['साउथ इंडियन', 'पनीर उत्तपम', null, null, 100],
  ['साउथ इंडियन', 'पाव भाजी', null, null, 70],
  ['साउथ इंडियन', 'पनीर पाव थाली', null, null, 80],
  ['साउथ इंडियन', 'वड़ा पाव', null, null, 20],

  // पिज़ा
  ['पिज़ा', 'वेज पिज़ा', null, null, 140],
  ['पिज़ा', 'अनियन पिज़ा', null, null, 140],
  ['पिज़ा', 'टोमैटो पिज़ा', null, null, 140],
  ['पिज़ा', 'पनीर पिज़ा', null, null, 170],
  ['पिज़ा', 'चीज़ पिज़ा', null, null, 180],

  // सीजनल सब्जी
  ['सीजनल सब्जी', 'मिक्स्ड वेज', 80, 150],
  ['सीजनल सब्जी', 'चना मसाला', 70, 130],
  ['सीजनल सब्जी', 'आलू मटर टमाटर', 50, 90],
  ['सीजनल सब्जी', 'आलू गोभी मटर', 50, 90],
  ['सीजनल सब्जी', 'आलू पालक', 50, 90],
  ['सीजनल सब्जी', 'आलू जीरा', 50, 90],

  // इंडियन
  ['इंडियन', 'मटर पनीर', 90, 170],
  ['इंडियन', 'शाही पनीर', 110, 200],
  ['इंडियन', 'कड़ाही पनीर', 110, 200],
  ['इंडियन', 'पनीर दोप्याजा', 110, 200],
  ['इंडियन', 'हांडी पनीर', 110, 200],
  ['इंडियन', 'पनीर हैदराबादी', 110, 200],
  ['इंडियन', 'पनीर बटर मशाला', 110, 200],
  ['इंडियन', 'पनीर भुजिया', 110, 200],
  ['इंडियन', 'पालक पनीर', 110, 200],
  ['इंडियन', 'मशरुम मशाला', 100, 190],
  ['इंडियन', 'मटर मशरुम', 90, 170],

  // दाल
  ['दाल', 'प्लेन दाल', 40, 70],
  ['दाल', 'दाल फ्राई', 50, 90],
  ['दाल', 'दाल तड़का', 70, 130],
  ['दाल', 'दाल मखानी', 70, 130],

  // राइस
  ['राइस', 'प्लेन राइस', 40, 80],
  ['राइस', 'जीरा राइस', 50, 90],
  ['राइस', 'वेज पोलाव', 50, 90],
  ['राइस', 'मटर पोलाव', 60, 110],
  ['राइस', 'काजू पोलाव', 70, 130],

  // रोटी
  ['रोटी', 'तवा रोटी प्लेन', null, null, 7],
  ['रोटी', 'बटर तवा रोटी', null, null, 10],
  ['रोटी', 'तंदूरी रोटी प्लेन', null, null, 7],
  ['रोटी', 'तंदूरी रोटी बटर', null, null, 10],
  ['रोटी', 'प्लेन नान', null, null, 25],
  ['रोटी', 'बटर नान', null, null, 30],

  // थाली
  ['थाली', 'सिंपल थाली', null, null, 100],
  ['थाली', 'स्पेशल थाली', null, null, 150],
  ['थाली', 'डीलक्स थाली', null, null, 250],

  // पापड़
  ['पापड़', 'ड्राई पापड़', null, null, 10],
  ['पापड़', 'फ्राई पापड़', null, null, 15],
  ['पापड़', 'मशाला पापड़', null, null, 30],

  // चाईनीज स्पेशल
  ['चाईनीज स्पेशल', 'हक्का नूडल्स', 40, 70],
  ['चाईनीज स्पेशल', 'चाईनीज भेल', 40, 70],
  ['चाईनीज स्पेशल', 'ट्रिपल राइस', 90, 170],
  ['चाईनीज स्पेशल', 'सिगापुरी राइस', 80, 150],

  // सुप
  ['सुप', 'वेज सुप', null, null, 40],
  ['सुप', 'मन्चूरियन सुप', null, null, 60],
  ['सुप', 'मन चाहो सुप', null, null, 70],
  ['सुप', 'पनीर मन्चूरियन सुप', null, null, 80],
];

const USERS = [
  { name: 'Super Admin', username: 'superadmin', password: 'Super@1234', role: 'superadmin' },
  { name: 'Business Admin', username: 'admin', password: 'Admin@1234', role: 'admin' },
  { name: 'Counter Manager', username: 'manager', password: 'Manager@1234', role: 'manager' },
];

async function run() {
  await connectDB(process.env.MONGO_URI);

  // Multi-tenancy: adopt/create the default business and attach legacy docs.
  const businessId = await migrateTenancy();
  await seedAll(businessId);
  console.log('Seed complete.');
  process.exit(0);
}

// Seed menus/users/settings into the given business — safe to re-run:
// existing users (and their passwords) are never touched, menu upserts only.
export async function seedAll(businessId) {
  // Users (only create missing ones — never reset existing passwords)
  for (const u of USERS) {
    const exists = await User.findOne({ username: u.username });
    if (!exists) {
      await User.create({ ...u, businessId, passwordHash: await User.hashPassword(u.password) });
      console.log(`Created user ${u.username} (${u.role})`);
    }
  }

  // Menu (demo items live on the default business only)
  let created = 0;
  for (let i = 0; i < MENU.length; i++) {
    const [category, name, half, full, price] = MENU[i];
    const portions = half != null || full != null;
    const update = {
      name,
      category,
      halfPrice: portions ? half : null,
      fullPrice: portions ? full : null,
      price: portions ? null : price,
      sortOrder: i,
      available: true,
    };
    const res = await MenuItem.updateOne({ businessId, name, category }, { $set: update }, { upsert: true });
    if (res.upsertedCount) created++;
  }
  console.log(`Menu: ${created} new items seeded, ${MENU.length} total in menu`);

  // Settings
  const settings = await Setting.get(businessId);
  console.log(`Settings ready (float ₹${settings.openingFloat})`);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('seed.js');
if (invokedDirectly) {
  run().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
