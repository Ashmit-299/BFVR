// Verifies translation coverage — run: node scripts/i18n-check.mjs
// 1) hi and en dictionaries must have identical key sets
// 2) every literal t('key') used in client/src must exist
// 3) runtime-generated key families (portion_, method_, exp_, role_) must be complete
import fs from 'node:fs';
import path from 'node:path';
import { dict, EXPENSE_KEYS, METHOD_KEYS, PORTION_KEYS } from '../client/src/i18n.js';

let fail = 0;
const hiKeys = Object.keys(dict.hi);
const enKeys = Object.keys(dict.en);

const missingInEn = hiKeys.filter((k) => !(k in dict.en));
const missingInHi = enKeys.filter((k) => !(k in dict.hi));
if (missingInEn.length) {
  fail++;
  console.log('✗ Missing in EN:', missingInEn.join(', '));
}
if (missingInHi.length) {
  fail++;
  console.log('✗ Missing in HI:', missingInHi.join(', '));
}

const srcDir = path.resolve('client/src');
const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(e.name) && !p.includes(`${path.sep}i18n.js`)) files.push(p);
  }
};
walk(srcDir);

const used = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) used.add([m[1], f]);
  for (const m of src.matchAll(/\bt\(\s*"([^"]+)"/g)) used.add([m[1], f]);
}

// filter out template-literal dynamic keys (they use backticks, not matched above)
let missingCount = 0;
for (const [key, file] of used) {
  if (!(key in dict.hi) || !(key in dict.en)) {
    fail++;
    missingCount++;
    console.log(`✗ Missing key "${key}" used in ${path.relative(process.cwd(), file)}`);
  }
}

// generated families
for (const k of EXPENSE_KEYS) {
  for (const lang of ['hi', 'en']) {
    if (!(`${`exp_${k}`}` in dict[lang])) {
      fail++;
      console.log(`✗ Missing ${lang}.exp_${k}`);
    }
  }
}
for (const k of METHOD_KEYS) {
  for (const lang of ['hi', 'en']) {
    if (!(`method_${k}` in dict[lang])) {
      fail++;
      console.log(`✗ Missing ${lang}.method_${k}`);
    }
  }
}
for (const k of PORTION_KEYS) {
  for (const lang of ['hi', 'en']) {
    if (!(`portion_${k}` in dict[lang])) {
      fail++;
      console.log(`✗ Missing ${lang}.portion_${k}`);
    }
  }
}
for (const r of ['superadmin', 'admin', 'manager']) {
  for (const lang of ['hi', 'en']) {
    if (!(`role_${r}` in dict[lang])) {
      fail++;
      console.log(`✗ Missing ${lang}.role_${r}`);
    }
  }
}

// leftover hardcoded Devanagari outside the dictionary (i18n.js) — allow brand names
const ALLOW = [
  'हिंदी / English', // toggle tooltip
  'हिं', // toggle label
  'सभी', // internal sentinel for "all" categories
].sort((a, b) => b.length - a.length); // longest first so partial strips can't leave residue
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (!/[\u0900-\u097F]/.test(line)) return;
    const stripped = ALLOW.reduce((s, a) => s.split(a).join(''), line);
    if (/[\u0900-\u097F]/.test(stripped)) {
      fail++;
      console.log(`✗ Hardcoded Hindi at ${path.relative(process.cwd(), f)}:${i + 1}: ${line.trim().slice(0, 90)}`);
    }
  });
}

console.log(`checked ${used.size} t() keys across ${files.length} files, ${hiKeys.length} keys per language`);
if (fail === 0) console.log('i18n OK — no missing keys, no hardcoded strings');
process.exit(fail > 0 ? 1 : 0);
