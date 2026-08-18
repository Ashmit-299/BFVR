# Restaurant Financial Management System

A complete app to manage your restaurant's money — track sales, monitor expenses, see daily profits, and close your books every night. Works on phone, tablet, and computer.

---

## What Does This App Do?

| Feature | What It Means |
|---------|--------------|
| **Record Sales** | Log every sale with amount and payment type (Cash, UPI, Card) |
| **Track Expenses** | Record what you spend — vegetables, rent, salaries, gas, etc. |
| **Dashboard** | See today's revenue, expenses, and profit at a glance |
| **Analytics** | Find your best days, busiest months, and spending patterns |
| **Daily Closing** | Count your cash, match it with the system, and close the day |
| **Multi-User** | Owner sees everything. Manager can only add sales/expenses |
| **Works Everywhere** | Use it on your phone, tablet, or computer |

---

## Who Is This For?

- Small restaurant owners who want to track money without Excel
- Restaurant managers who need to log sales and expenses quickly
- Anyone who wants a simple, clean dashboard for restaurant finances

---

## What You Need Before Starting

| Tool | Version | Why |
|------|---------|-----|
| **Python** | 3.11 or higher | Runs the backend (the brain of the app) |
| **Node.js** | 18 or higher | Runs the frontend (what you see on screen) |
| **PostgreSQL** | 14+ (or Supabase account) | Stores all your data |

**How to check if you have them:**
```bash
python --version     # Should show Python 3.11+
node --version       # Should show v18+
```

---

## Step-by-Step: Running on Your Computer

### Step 1: Download the Project
```bash
git clone https://github.com/YOUR_USERNAME/restaurant-fms.git
cd restaurant-fms
```

### Step 2: Set Up the Backend

Open a terminal and type these commands one by one:

```bash
# Go into the backend folder
cd backend

# Create a virtual environment (keeps your Python packages clean)
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install all the packages the app needs
pip install -r requirements.txt
```

### Step 3: Set Up the Database

You have two options:

**Option A: Use Supabase (Recommended — Free, No Install)**
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (pick a name and password)
3. Go to Settings → Database → Connection string → URI
4. Copy the URI — it looks like: `postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres`

**Option B: Install PostgreSQL Locally**
1. Download from [postgresql.org](https://www.postgresql.org/download/)
2. Remember the password you set during install
3. Open pgAdmin or any SQL tool and create a database called `BFVG`

### Step 4: Configure the Backend

Create a file called `.env` inside the `backend` folder with this content:

```env
# If using Supabase, paste your Supabase URI here:
DATABASE_URL=postgresql+asyncpg://YOUR_SUPABASE_URI_HERE
DATABASE_URL_SYNC=postgresql://YOUR_SUPABASE_URI_HERE

# If using local PostgreSQL:
# DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/BFVG
# DATABASE_URL_SYNC=postgresql://postgres:YOUR_PASSWORD@localhost:5432/BFVG

SECRET_KEY=any-random-text-here-make-it-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=["http://localhost:3000"]
```

**Important:** The async URL must start with `postgresql+asyncpg://` (with `+asyncpg`). The sync URL must start with `postgresql://` (without `+asyncpg`).

### Step 5: Start the Backend

```bash
# Make sure you're in the backend folder with venv activated
python seed.py        # Creates tables and adds demo users
python -m uvicorn app.main:app --reload --port 8000
```

You should see: `Uvicorn running on http://127.0.0.1:8000`

### Step 6: Set Up the Frontend

Open a **new** terminal (keep the backend running in the first one):

```bash
# Go into the frontend folder
cd frontend

# Install packages
npm install

# Start the app
npm run dev
```

You should see: `Ready on http://localhost:3000`

### Step 7: Open the App

Open your browser and go to: **http://localhost:3000**

**Login with these demo accounts:**

| Role | Email | Password | What They Can Do |
|------|-------|----------|-----------------|
| Owner | owner@restaurant.com | owner123 | Everything — manage users, categories, see all reports |
| Manager | manager@restaurant.com | manager123 | Add sales, add expenses, do daily closing |

---

## Deploying to the Internet (Free)

This makes your app accessible from any device, anywhere.

### Step 1: Push to GitHub

```bash
cd ..  # Go to the project root
git init
git add .
git commit -m "First version"
```

Then create a new repository on [github.com/new](https://github.com/new), then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/restaurant-fms.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign up with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Fill in:
   - **Name:** `restaurant-backend`
   - **Region:** Pick closest to your users
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python seed.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Click **"Add Environment Variable"** for each of these:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase async URI (with `+asyncpg`) |
| `DATABASE_URL_SYNC` | Your Supabase sync URI (without `+asyncpg`) |
| `SECRET_KEY` | Click "Generate" or type any long random text |
| `CORS_ORIGINS` | `["https://restaurant-frontend.onrender.com"]` |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |

6. Click **"Create Web Service"**
7. Wait 5-10 minutes for it to build
8. Copy the URL (looks like `https://restaurant-backend.onrender.com`)

### Step 3: Deploy Frontend on Render

1. Go back to Render dashboard
2. Click **"New +"** → **"Static Site"**
3. Connect the same GitHub repo
4. Fill in:
   - **Name:** `restaurant-frontend`
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Publish Directory:** `frontend/.next`
5. Add **Environment Variable:**

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://restaurant-backend.onrender.com` |

6. Click **"Create Static Site"**
7. Wait 5-10 minutes

### Step 4: Test

Open your frontend URL → Login → It's live!

**Note:** Free tier puts the app to sleep after 15 minutes of no use. First visit after sleep takes 15-30 seconds to wake up.

---

## Project Structure (What's Where)

```
restaurant-fms/
├── backend/                    # The brain of the app
│   ├── app/
│   │   ├── main.py            # Entry point — starts the server
│   │   ├── config.py          # Reads settings from .env file
│   │   ├── database.py        # Connects to PostgreSQL
│   │   ├── models/            # Defines what data looks like (User, Sale, Expense)
│   │   ├── schemas/           # Validates data before saving
│   │   ├── api/               # All the API routes (URLs the frontend calls)
│   │   │   ├── auth.py        # Login, register, get user
│   │   │   ├── transactions.py # Add/view/cancel sales
│   │   │   ├── expenses.py    # Add/view/cancel expenses
│   │   │   ├── dashboard.py   # Today's summary
│   │   │   ├── analytics.py   # Charts and reports
│   │   │   ├── closing.py     # Daily closing
│   │   │   └── settings.py    # Restaurant name, categories, users
│   │   └── utils/             # Password hashing, JWT tokens
│   ├── seed.py                # Creates demo users and categories
│   ├── requirements.txt       # Python packages needed
│   └── .env                   # Your secret settings (not shared)
│
├── frontend/                   # What you see on screen
│   ├── src/
│   │   ├── app/               # All pages
│   │   │   ├── login/         # Login page
│   │   │   ├── register/      # Register page
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── sales/         # View and add sales
│   │   │   ├── expenses/      # View and add expenses
│   │   │   ├── analytics/     # Charts and reports
│   │   │   ├── closing/       # Daily closing
│   │   │   └── settings/      # Restaurant settings
│   │   ├── components/        # Reusable UI pieces (sidebar, header, etc.)
│   │   ├── hooks/             # Custom React functions
│   │   ├── lib/               # API calls, helper functions
│   │   └── types/             # TypeScript type definitions
│   ├── public/                # Static files (logo, favicon)
│   ├── package.json           # Node packages needed
│   └── tailwind.config.js     # Styling configuration
│
├── render.yaml                 # Auto-deployment config for Render
├── docker-compose.yml          # Run everything with Docker
└── README.md                   # This file
```

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'app'"
You're not in the `backend` folder. Run: `cd backend`

### "asyncpg" or "psycopg2" errors
Your `.env` URL is wrong. Make sure:
- `DATABASE_URL` starts with `postgresql+asyncpg://`
- `DATABASE_URL_SYNC` starts with `postgresql://`
- There are no trailing slashes or spaces

### "Connection refused" or "could not connect"
- Backend not running? Start it: `python -m uvicorn app.main:app --reload --port 8000`
- Wrong database URL? Double-check your `.env` file

### Frontend shows "Failed to fetch"
- Backend not running on port 8000?
- `NEXT_PUBLIC_API_URL` in `frontend/.env.local` should be `http://localhost:8000`

### "Column not found" or table errors
Run the seed script again: `python seed.py`

### App loads but data doesn't save
- Check if backend is running (http://localhost:8000/docs should show API docs)
- Check browser console (F12) for error messages

---

## API Documentation

Once the backend is running, visit **http://localhost:8000/docs** to see all available endpoints with interactive testing.

---

## Tech Stack

| Part | Technology |
|------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Charts | Recharts |
| Backend | FastAPI (Python) |
| Database | PostgreSQL (via Supabase or local) |
| Authentication | JWT tokens |
| Deployment | Render.com |

---

## License

Private — for restaurant use only.
