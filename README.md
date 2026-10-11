# व्यापार साथी — POS, Billing & Analytics

Offline-capable billing & management website for small businesses — restaurants, kirana stores,
bakeries, medical shops and more: POS billing with half/full portions, customer
payments (cash/UPI/card with due tracking), daily expenses (kirana, vegetables, dairy, wages),
daily/weekly/yearly analytics, and a **daily-float cash model** — built with **React (Vite PWA) +
Node/Express + MongoDB**.

## Quick start

```bash
npm install          # installs server + client (workspaces)
npm run seed         # seeds 77 menu dishes, 3 users, settings (safe to re-run)
npm run dev          # API on :5050 + web app on :5173 (with hot reload)
```

Production (single port, serves the built PWA):

```bash
npm run build
npm start            # http://localhost:5050
```

## Default accounts

| Role | Username | Password | Can do |
|---|---|---|---|
| सुपर एडमिन | `superadmin` | `Super@1234` | Everything + create admin accounts |
| एडमिन | `admin` | `Admin@1234` | Menu CRUD, edit/delete bills, expenses, closings, managers, settings |
| मैनेजर | `manager` | `Manager@1234` | Take orders, record payments, add expenses, view analytics — **cannot** change menu, edit past bills, manage users/settings |

> Change these passwords after first login (सेटिंग्स → मेरा पासवर्ड बदलें).

## Features

- **POS billing** — tap a dish to add it; half/full portions carry their own prices from the menu
  (e.g. वेज चाउमीन हाफ ₹30 / फूल ₹50), single-rate dishes add at their rate. Quantity steppers,
  customer name/phone, discount, save-with-payment or save-as-due, printable bill.
- **Payments** — cash/UPI/card, partial payments and due (udhaar) tracking per bill.
- **Menu management** (admin) — 77 dishes seeded from the menu-card PDF across 12 categories;
  half/full vs single pricing, availability toggle, add/edit/delete.
- **Daily expenses** — kirana, vegetables, dairy, wages, rent, utilities, transport, other;
  day-wise totals and category breakdown.
- **Analytics dashboard** — दैनिक (hourly revenue = best times, expense pie, yesterday comparison),
  साप्ताहिक (7-day revenue vs expenses vs net, top dishes), वार्षिक (12-month trends).
- **Daily float cash model** — every day opens with a set float (default ₹100). At closing,
  `revenue − expenses` is suggested as the withdrawal (“pocketed” amount); the next day starts
  fresh with the float. Cash-in-hand always reconciles: `float + revenue − expenses − withdrawn`.
- **Works offline (PWA)** — installable; menu loads from cache. Orders/payments/expenses made
  without internet are queued locally and **auto-sync in order when the connection returns**
  (server de-duplicates by `clientId`, so nothing is ever double-recorded).
- **Responsive UI** — pink · gold · green · brown · yellow restaurant theme, light animations.

## Project structure

```
server/          Express + Mongoose API (src/routes, src/models, src/seed.js)
client/          Vite + React PWA (src/pages, src/components, src/lib)
scripts/         api-test.mjs, browser-test.mjs (end-to-end tests)
```

## Configuration

`server/.env` (gitignored):

```
PORT=5050        # 5000 was already in use on this machine
MONGO_URI=...    # your MongoDB Atlas connection string (database: baba-family-restaurant)
JWT_SECRET=...
CLIENT_ORIGIN=http://localhost:5173
```

The restaurant name, address, phone, UPI id and opening float are editable in
**सेटिंग्स** (stored in MongoDB, not code).

## Tests

```bash
npm run test:api       # 63 API assertions: auth, roles, billing, offline dedupe,
                       # tables/upsert/close, closing chain, payment-mix analytics
npm run test:browser   # 40 UI assertions: multi-table POS (any-order billing),
                       # EN/HI toggle, offline sync, permissions, charts, phone viewport
node scripts/i18n-check.mjs  # translation coverage: no missing keys / hardcoded strings
```

Both expect the server running on :5050.

## Notes

- **Language**: हिंदी/English toggle (हिं / EN button) in the top bar and on the login screen.
- **Tables**: 6 tables by default (Settings → 1–10). Each table holds its own open bill;
  bills can be settled in any order. Managers may extend open bills, only admins can edit closed ones.
- **Daily cash model**: every day opens with the amount you kept at the previous day's closing
  (₹500, ₹0 — your choice). The opening-cash setting applies only before the first closing exists.
- **Payments**: cash / QR (UPI) / card are tracked separately — analytics shows the payment mix
  daily, day-by-day weekly, and month-by-month yearly, with net revenue everywhere.
- Menu items seeded from `BFVR Menu Card Updated prices.pdf`. A few names were reconstructed from
  a partially-encoded PDF — check **सिंपल थाली / स्पेशल थाली / डीलक्स थाली** and edit from
  the Menu screen if needed.
- Timezone for all daily reports is IST (Asia/Kolkata).
- Server-side validation error strings are English-only; the UI itself is fully bilingual.
