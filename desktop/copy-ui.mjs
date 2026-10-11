// Copies the built shell UI (client/dist) into desktop/app so electron-builder
// can package it. Run automatically by `npm run dist` (predist hook).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../client/dist');
const dest = path.resolve(here, 'app');

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error('client/dist is missing — run `npm run build:shell` in the repo root first.');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`Copied ${src} -> ${dest}`);
