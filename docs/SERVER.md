# Server Setup Guide

Vyapar Saathi runs as a Node.js API + web server backed by MongoDB. There are two ways to
run it: **on your own PC** (works on the local network / internet) or **in the cloud** (free
tier, always available). Both are described below.

The mobile APK and Windows EXE apps have the cloud server URL baked in at build time
(`VITE_API_BASE` in `client/.env.shell`) — there is no address to enter on their login
screens. Change it there and rebuild the apps if your server URL ever changes.

---

## Option A — Local PC (LAN)

Use this if all devices that need the app are on the **same Wi-Fi/LAN** as the PC running
the server. No internet or cloud account required.

### 1. Install prerequisites

- **Node.js 18+** — https://nodejs.org (LTS version)
- **MongoDB** — either:
  - a free **MongoDB Atlas** cluster (recommended, no local install): https://www.mongodb.com/atlas
  - or local MongoDB Community Server: https://www.mongodb.com/try/download/community

### 2. Install and configure

```bash
git clone <repo-url> vyapar-saathi   # or download + unzip the project
cd vyapar-saathi
npm install                          # installs server + client (workspaces)

# Create the server env file
cp server/.env.example server/.env   # Windows: copy server\.env.example server\.env
```

Edit `server/.env`:

```
PORT=5050
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/vyapar-saathi?appName=vyapar-saathi
JWT_SECRET=some-long-random-string
CLIENT_ORIGIN=*
```

> **Local IP tip:** find your PC's LAN IP with `ipconfig` (Windows) or `ifconfig`/`ip addr`
> (Mac/Linux). Other phones on the same Wi-Fi will reach the server at `http://<your-pc-ip>:5050`.

### 3. Seed and start

```bash
npm run seed     # creates 3 demo users + 77 menu items (safe to re-run)
npm run build    # builds the web UI
npm start        # API + UI on http://localhost:5050
```

Open `http://localhost:5050` on the PC, or `http://<pc-ip>:5050` from another device on
the same network.

### 4. Allow inbound firewall access (Windows)

To let phones on the Wi-Fi reach the PC, allow Node.js through the firewall:

```powershell
# Run in an elevated (Administrator) PowerShell
New-NetFirewallRule -DisplayName "Vyapar Saathi" -Direction Inbound -Protocol TCP -LocalPort 5050 -Action Allow
```

---

## Option B — Cloud (free, always available)

Use this if you want the app reachable from anywhere (different networks, no PC left on).
The project ships with **Render** (free tier) configuration out of the box.

### 1. Create a free MongoDB Atlas cluster

1. Sign up at https://www.mongodb.com/atlas (free M0 tier is enough).
2. Create a cluster → **Database Access**: add a user + password.
3. **Network Access**: add IP `0.0.0.0/0` (Allow Access From Anywhere) so the cloud server can connect.
4. **Connect → Drivers**: copy the connection string, e.g.
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/vyapar-saathi?retryWrites=true&w=majority`

### 2. Deploy to Render (free)

1. Push this repository to a GitHub account.
2. On https://render.com → **New → Blueprint** → pick the repo. Render reads `render.yaml`
   automatically and creates the web service from the `Dockerfile`.
3. When prompted, set the environment variables:
   - `MONGO_URI` — paste your Atlas connection string
   - `JWT_SECRET` — any long random string (Render can generate one)
   - `CLIENT_ORIGIN` — leave blank or `*`
4. Deploy. On first boot the server **auto-seeds** the demo users and menu, so no manual
   `npm run seed` step is needed.
5. When done, Render shows a URL like `https://vyapar-saathi.onrender.com` — packaged
   APK/EXE builds read their address from `VITE_API_BASE` in `client/.env.shell`, so
   rebuild them if your URL differs from the baked-in one.

> **Free-tier note:** Render's free web service **sleeps after ~15 minutes of inactivity**.
> The first request after idle takes ~30 seconds to wake up. If you need it always-awake,
> consider a paid plan or another host (Railway, Fly.io, Koyeb — all work with the same
> `Dockerfile`).

### Other hosts

The included `Dockerfile` builds the client and serves both the UI and API from one Node
process on `PORT` — so any Docker-capable host works (Railway, Fly.io, Koyeb, a VPS, etc.)
with the same three environment variables.

---

## First-time setup after the server is running

1. Open the app (browser, APK, or EXE).
2. The APK/EXE builds have the server address
   (`https://vyapar-saathi-4ucf.onrender.com`) baked in — no address to enter.
3. Log in with a default account and change the passwords immediately
   (सेटिंग्स → मेरा पासवर्ड बदलें):

| Role | Username | Password |
|---|---|---|
| सुपर एडमिन | `superadmin` | `Super@1234` |
| एडमिन | `admin` | `Admin@1234` |
| मैनेजर | `manager` | `Manager@1234` |

4. Set your shop name, address, phone, UPI id and opening float in **सेटिंग्स**.

---

## Updating the server

- **Local:** `git pull` → `npm install` → `npm run build` → restart `npm start`.
- **Cloud (Render):** push to GitHub — Render auto-redeploys on every push to the main branch.
