<div align="center">

# 🕌 AMK Circle
### Multi-Tenant Islamic Education & Community Management Platform

[![Electron](https://img.shields.io/badge/Electron-29-47848F?logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**amkcircle.com** — A production-quality ERP platform for Islamic Community Centers, Masajid, Dara (Quran Boarding Schools), Schools, and Islamic Institutes.

</div>

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Overview](#overview)
- [Features](#features)
- [Demo Credentials](#demo-credentials)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation Guide](#installation-guide)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Docker Deployment](#docker-deployment)
- [Database Migration](#database-migration)
- [Building for Windows](#building-for-windows)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## ⚡ Quick Start

> Get the app running in 3 steps. No configuration needed.

### Step 1 — Install dependencies

Open a terminal in the project folder and run:

```powershell
npm install
```

> ⚠️ If `better-sqlite3` fails, you need the Visual C++ Build Tools. See [Troubleshooting](#troubleshooting).

---

### Step 2 — Start the app

```powershell
npm run dev
```

This launches **both** the Vite dev server (port 5173) and the **Electron desktop window** automatically. Wait a few seconds for the window to appear.

---

### Step 3 — Log in

Use any of the demo accounts below. They are seeded automatically on first launch — no setup required.

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `superadmin` | `Admin@123!` |
| Org Admin | `iecc_admin` | `Admin@123!` |
| Teacher | `teacher1` | `Teacher@123!` |
| Finance | `finance1` | `Finance@123!` |

---

### If Electron fails to open

If you see `Electron failed to install correctly`, run these two commands then retry `npm run dev`:

```powershell
Remove-Item -Recurse -Force node_modules\electron
npm install electron --save-dev
```

---

### Prefer running in a browser instead?

Use Docker — no Electron needed. See [Docker Deployment](#docker-deployment) for the full guide.

```powershell
docker compose up --build -d
# → open http://localhost:8080
```

---

## Overview

AMK Circle is a **multi-tenant** desktop ERP system built with Electron.js. A single installation hosts multiple independent organizations — each fully isolated by `organization_id`. Super admins manage all organizations from a dedicated panel; organization admins manage their own data without ever seeing another org's records.

### Supported Organization Types
| Type | Features |
|------|----------|
| 🕌 Islamic Community Center | Masjid + School modules |
| 🕌 Masjid | Prayer times, Khutbah, Events, Volunteers |
| 📖 Dara (Quran Boarding School) | Hifz tracking, Dormitories, boarding |
| 🎓 College / School / Islamic Institute | Full academic management |
| 🏛️ Hybrid Institution | All modules enabled |

---

## Features

### 🔐 Authentication & Roles
- JWT-based authentication with bcrypt password hashing
- 8 roles: `super_admin`, `organization_admin`, `principal`, `teacher`, `imam`, `finance`, `parent`, `student`
- Role-based access control (RBAC) — sidebar and routes filtered per role
- Audit logging for every CREATE / UPDATE / DELETE / LOGIN / LOGOUT action

### 🏢 Super Admin Panel
- Platform-wide dashboard with revenue metrics and organization breakdown
- Create, edit, enable/disable organizations
- Full audit log viewer across all organizations

### 🏫 School / College Management
- Student enrollment with auto-generated IDs (STU-XXXX)
- Teacher management with auto-generated Employee IDs (EMP-XXX)
- Class management with capacity tracking
- Daily attendance with upsert (mark entire class or individual students)
- Quran progress tracking per student

### 🕌 Masjid Management
- Prayer times management (Fajr → Isha + Iqamah offsets)
- Events, Announcements, Khutbah records, Volunteer registration

### 📖 Dara / Hifz Boarding
- Quran memorisation progress (pages out of 604, % complete)
- Hifz milestones (Rub', Juz', Hizb) with teacher verification
- Dormitory management and boarding assignments

### 💰 Finance
- Payment collection with auto-generated receipt numbers
- PDF receipt generation (A5, branded with org colors)
- Expense tracking with categories
- Teacher salary management (base + allowances − deductions = net)
- Financial summaries and 6-month trend charts

### 📊 Reports & Analytics
- Financial reports with pie charts and Excel export
- Student reports with attendance rate bars
- Attendance reports with date-range filtering
- Hifz progress report
- Audit logs with action filtering
- Excel (.xlsx) export for all report types

### ⚙️ Settings
- Organization branding (name, colors, logo, address)
- App settings (currency, receipt prefix, date format)
- Password change
- Database backup & restore

---

## Demo Credentials

> These accounts are seeded automatically on first launch.

| Role | Username | Password | Access |
|------|----------|----------|--------|
| **Super Admin** | `superadmin` | `Admin@123!` | Full platform |
| **Org Admin** | `iecc_admin` | `Admin@123!` | IECC organization |
| **Teacher** | `teacher1` | `Teacher@123!` | School modules |
| **Finance** | `finance1` | `Finance@123!` | Finance & reports |

**Demo Organization:** IECC – Islamic Educational & Community Center, Minnesota, USA

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  main.js    │  │  handlers/   │  │  database/    │  │
│  │  (BrowserW) │  │  auth.js     │  │  db.js        │  │
│  │             │  │  students.js │  │  schema.js    │  │
│  │             │  │  finance.js  │  │  (SQLite WAL) │  │
│  │             │  │  ...15 more  │  │               │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│         ↕ IPC (contextBridge — secure)                   │
├─────────────────────────────────────────────────────────┤
│                  React Renderer Process                   │
│  ┌───────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │  AuthCtx  │  │  ThemCtx   │  │  React Router    │   │
│  │  (JWT)    │  │  (dark/    │  │  (lazy-loaded    │   │
│  │           │  │   light)   │  │   pages)         │   │
│  └───────────┘  └────────────┘  └──────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Pages: Dashboard · Students · Finance · Masjid  │   │
│  │         Hifz · Attendance · Reports · Settings   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Multi-tenancy:** Every table has `organization_id`. Every IPC handler receives `orgId` extracted from the JWT. No cross-org data leakage is possible at the query level.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 29 |
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 + custom component layer |
| Routing | React Router DOM 6 |
| Charts | Recharts |
| Database | SQLite via better-sqlite3 9 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| PDF | jsPDF + jspdf-autotable |
| Excel | SheetJS (xlsx) |
| Icons | Lucide React |
| Fonts | Inter (Latin) + Amiri (Arabic) |
| Packaging | Electron Builder (NSIS Windows installer) |

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Bundled with Node |
| Windows | 10 / 11 (64-bit) | Primary target |
| Git | 2.x | For cloning |

> **macOS / Linux:** The app runs in development mode. Electron Builder can produce `.dmg` and `.AppImage` builds with minor config changes.

---

## Installation Guide

### 1. Clone the repository

```bash
git clone https://github.com/your-org/amk-circle.git
cd amk-circle
```

### 2. Install dependencies

```bash
npm install
```

> `better-sqlite3` compiles a native addon. On Windows you need the Visual C++ Build Tools.  
> Install via: `npm install --global windows-build-tools` *(run as Administrator)*  
> Or install **"Desktop development with C++"** workload from [Visual Studio Build Tools](https://aka.ms/vs/17/release/vs_BuildTools.exe).

### 3. Run in development mode

```bash
npm run dev
```

This starts both the Vite dev server (port 5173) and Electron. Hot-reload works for React components; restart Electron for main-process changes.

### 4. First launch

On first launch, the database is created automatically at:

```
Windows: %APPDATA%\amk-circle\amkcircle.db
         (e.g. C:\Users\<you>\AppData\Roaming\amk-circle\amkcircle.db)
```

Demo seed data is inserted automatically (organizations, users, students, payments, etc.).

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` in Docker |
| `PORT` | `3000` | API server port (Docker mode) |
| `JWT_SECRET` | *(see auth.js)* | **Change before production!** |
| `DB_PATH` | `%APPDATA%/amkcircle/` | SQLite file path |

> In **Electron desktop mode**, environment variables are set directly in source files. The `.env` file is only used by the optional Docker server mode.

---

## Project Structure

```
amk-circle/
├── electron/
│   ├── main.js                 # BrowserWindow, IPC handler loader
│   ├── preload.js              # Secure contextBridge API surface
│   ├── database/
│   │   ├── schema.js           # All 20+ CREATE TABLE statements
│   │   └── db.js               # DB init, helpers, audit(), seed data
│   └── handlers/
│       ├── auth.js             # Login, logout, change-password
│       ├── organizations.js    # Multi-org CRUD (super admin)
│       ├── users.js            # User CRUD + password reset
│       ├── students.js         # Student CRUD + Quran progress
│       ├── teachers.js         # Teacher CRUD
│       ├── classes.js          # Class management
│       ├── attendance.js       # Daily attendance upsert
│       ├── masjid.js           # Prayer times, events, khutbah, volunteers
│       ├── finance.js          # Payments, expenses, salaries
│       ├── dara.js             # Hifz progress, boarding, dormitories
│       ├── reports.js          # Dashboard stats, platform stats
│       └── settings.js         # Org profile, app settings
│
├── src/
│   ├── main.jsx                # React entry point
│   ├── index.css               # Tailwind + @layer components
│   ├── App.jsx                 # Router, lazy-loaded pages, Protected guard
│   ├── context/
│   │   ├── AuthContext.jsx     # JWT auth state + RBAC helpers
│   │   └── ThemeContext.jsx    # Dark/light mode
│   ├── components/
│   │   ├── Sidebar.jsx         # Role-aware navigation
│   │   ├── Header.jsx          # Greeting, org badge, theme toggle
│   │   ├── Layout.jsx          # Shell layout
│   │   └── ui/
│   │       ├── Modal.jsx       # Accessible modal (ESC, size variants)
│   │       ├── StatsCard.jsx   # KPI card with trend badge
│   │       └── PageHeader.jsx  # Page title + actions slot
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── UsersPage.jsx
│   │   ├── super-admin/        # Super admin panel
│   │   ├── masjid/             # Masjid module
│   │   ├── school/             # School module
│   │   ├── dara/               # Hifz / boarding
│   │   ├── finance/            # Finance module
│   │   ├── reports/            # Reports & analytics
│   │   └── settings/           # Settings
│   └── utils/
│       ├── pdf.js              # jsPDF receipt & report generators
│       ├── excel.js            # SheetJS Excel export helpers
│       └── format.js           # Date, currency, string formatters
│
├── public/                     # Static assets
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # API + Nginx stack
├── .env.example                # Environment variable template
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Database Schema

Key tables (all include `organization_id` for multi-tenancy):

| Table | Purpose |
|-------|---------|
| `organizations` | Root tenant table — name, type, branding, subscription |
| `users` | All users across all orgs; `organization_id` nullable for super_admin |
| `students` | Student enrollment with auto-IDs |
| `teachers` | Staff with employee IDs |
| `classes` | Classroom with teacher FK and capacity |
| `attendance` | Daily per-student status (UNIQUE on org+student+date) |
| `quran_progress` | Surah/ayah/juz progress per student |
| `hifz_milestones` | Memorisation milestone records |
| `dormitories` | Dara boarding rooms |
| `boarding_assignments` | Student ↔ room assignments |
| `prayer_times` | 5 prayers + Iqamah per organization |
| `events` | Community events |
| `announcements` | Org announcements |
| `khutbah` | Jumu'ah sermon records |
| `volunteers` | Volunteer registry |
| `payments` | Income/tuition/donations (UNIQUE on org+receipt_number) |
| `expenses` | Organizational expenses |
| `salaries` | Teacher payroll (UNIQUE on org+teacher+month) |
| `org_settings` | App settings per organization |
| `audit_logs` | Immutable action log |

---

## Docker Deployment

Run AMK Circle as a web app in Docker — no Electron required. The Express server serves the React frontend and bridges all API calls to the same SQLite handlers used by the desktop app.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

---

### Step 1 — Create your `.env` file

```powershell
copy .env.example .env
```

Open `.env` and make sure these values are set:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secret-key-change-this
DB_PATH=/data/amkcircle.db
```

---

### Step 2 — Build and start

```powershell
docker compose up --build -d
```

This will:
1. Pull `node:20-alpine` base image
2. Install dependencies and compile `better-sqlite3` for Linux
3. Build the React/Vite frontend (`dist/`)
4. Start the container and seed the database on first launch

> ⏱ First build takes ~3–4 minutes. Subsequent builds are fast thanks to layer caching.

---

### Step 3 — Open the app

```
http://localhost:8080
```

Log in with any demo account:

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `superadmin` | `Admin@123!` |
| Org Admin | `iecc_admin` | `Admin@123!` |
| Teacher | `teacher1` | `Teacher@123!` |
| Finance | `finance1` | `Finance@123!` |

---

### Daily commands

```powershell
# Start (after first build)
docker compose up -d

# Stop
docker compose down

# Live logs
docker compose logs -f

# Rebuild after code changes
docker compose up --build -d

# Restart without rebuilding
docker compose restart
```

---

### How Docker mode works

The app is an Electron desktop app that uses IPC to talk to SQLite. In Docker mode:

1. **Express server** (`server/index.js`) serves the React build and exposes all IPC channels as `POST /api/:module/:action` routes
2. **Browser shim** (`server/api-shim.js`) is injected into `index.html` at runtime — it defines `window.api` using `fetch()` calls so the React app works identically without any source code changes
3. **SQLite** persists in a Docker volume (`amkcircle_db_data`) at `/data/amkcircle.db`

```
Browser → fetch POST /api/auth/login
        → Express → handlers['auth:login'](null, body)
        → SQLite  → { success: true, token, user }
```

---

### Database volume

The SQLite database lives in a named Docker volume and survives container restarts:

```powershell
# Manual backup
docker exec amkcircle-api cp /data/amkcircle.db /data/backups/amkcircle-backup.db

# View volume info
docker volume inspect amkcircle_db_data

# Reset database (re-seeds on next start)
docker compose down -v
docker compose up -d
```

---

### Production with Nginx (HTTPS)

```powershell
# Place TLS certs in docker/nginx/certs/
# (fullchain.pem + privkey.pem from Let's Encrypt)
docker compose --profile prod up -d
```

Nginx will terminate TLS and proxy to the Express API on port 3000.

---

## Database Migration

Use these steps any time you need to move, rename, or consolidate SQLite database files inside the Docker volume — for example after changing `DB_PATH` in `.env` or after restoring from a backup.

> **When does this happen?**  
> If `DB_PATH` in `docker-compose.yml` or `.env` is changed (e.g. from `/data/amkcircle.sqlite` to `/data/amkcircle.db`), Docker creates a brand-new empty database at the new path. Your old data still exists in the volume under its original filename. The steps below recover it.

---

### Step 1 — Stop the container

Always stop the app before touching the database to avoid corruption.

```powershell
docker compose stop
```

---

### Step 2 — Inspect both database files

Run a temporary Alpine container that mounts the volume to check what files exist:

```powershell
docker run --rm -v amkcircle_db_data:/data alpine ls -lh /data/
```

You will see output similar to:

```
-rw-r--r--  1 root  root  256.0K  amkcircle.db
-rw-r--r--  1 100   101   256.0K  amkcircle.sqlite
drwxr-xr-x  2 root  root    4.0K  backups/
```

---

### Step 3 — Verify row counts in both files

Install `sqlite3` inside the temporary container and inspect each file to confirm which one holds your real data:

```powershell
# Check the OLD file
docker run --rm -v amkcircle_db_data:/data alpine sh -c `
  "apk add --no-cache sqlite > /dev/null 2>&1 && `
   sqlite3 /data/amkcircle.sqlite 'SELECT count(*) FROM organizations; SELECT count(*) FROM users; SELECT count(*) FROM students;'"

# Check the CURRENT file
docker run --rm -v amkcircle_db_data:/data alpine sh -c `
  "apk add --no-cache sqlite > /dev/null 2>&1 && `
   sqlite3 /data/amkcircle.db 'SELECT count(*) FROM organizations; SELECT count(*) FROM users; SELECT count(*) FROM students;'"
```

Pick the file with the most complete data (more orgs, users, audit logs).

---

### Step 4 — Copy the data file into the active path

Replace the current (empty/newer) database with the file that holds your real data, then fix file ownership so the `amk` app user (UID 100, GID 101) can write to it:

```powershell
# Example: promote amkcircle.sqlite → amkcircle.db (the active DB_PATH)
docker run --rm -v amkcircle_db_data:/data alpine sh -c `
  "cp /data/amkcircle.sqlite /data/amkcircle.db && chown 100:101 /data/amkcircle.db && chmod 664 /data/amkcircle.db && echo Done && ls -lh /data/"
```

> Swap the filenames to match your situation. The destination must match the value of `DB_PATH` in your `docker-compose.yml`.

> ⚠️ **Do not skip the `chown` step.** Copying with plain Alpine runs as `root`, making the file read-only for the app user. This causes a **"attempt to write a readonly database"** error on login.

---

### Step 5 — Restart the container

```powershell
docker compose up -d
```

---

### Step 6 — Verify the migration

Check that the container is healthy and the correct row counts are live:

```powershell
# Container status
docker ps --filter name=amkcircle-api --format "table {{.Names}}\t{{.Status}}"

# Quick data check via the API
Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

### Migrating from a backup file on your PC

If you have a `.db` file on your Windows machine and want to load it into the container:

```powershell
# 1. Stop the container
docker compose stop

# 2. Copy your local file into the volume via a temporary container
$localDb = "C:\path\to\your\backup.db"
docker run --rm -v amkcircle_db_data:/data -v "${localDb}:/tmp/import.db" alpine `
  sh -c "cp /tmp/import.db /data/amkcircle.db && echo Imported"

# 3. Restart
docker compose up -d
```

---

### Quick reference — file locations

| Context | Database path |
|---------|--------------|
| Docker container | `/data/amkcircle.db` (set by `DB_PATH` in `.env`) |
| Docker volume on host (Windows) | Managed by Docker Desktop — access via `docker run ... alpine` |
| Electron desktop app (Windows) | `%APPDATA%\amk-circle\amkcircle.db` |
| DBeaver connection | Use the path above with the SQLite driver |

---

## Building for Windows

### Development build test

```bash
npm run build          # Vite production build
npm run electron:build # Electron + Vite, no packaging
```

### NSIS installer (.exe)

```bash
npm run dist
```

Output: `dist-electron/AMK Circle Setup 1.0.0.exe`

> **Code signing:** To sign the installer, set `WIN_CSC_LINK` (path to .pfx) and `WIN_CSC_KEY_PASSWORD` environment variables before running `npm run dist`.

---

## Troubleshooting

### Electron window doesn't open / "Electron failed to install correctly"

This happens when the Electron binary wasn't downloaded properly during `npm install`.

**Fix:**

```powershell
Remove-Item -Recurse -Force node_modules\electron
npm install electron --save-dev
npm run dev
```

---

### Docker — port already in use

```
Error: ports are not available: exposing port TCP 0.0.0.0:8080
```

Something on your machine is already using port 8080. Find and kill it:

```powershell
# Find the process
netstat -ano | Select-String ":8080 " | Select-String "LISTENING"

# Kill it (replace 1234 with the actual PID)
Stop-Process -Id 1234 -Force

# Then retry
docker compose up -d
```

---

### Login fails with "attempt to write a readonly database"

This happens after a manual database migration where the file was copied into the Docker volume using an Alpine container (which runs as `root`). The app user (`amk`, UID 100) can read but not write the file.

**Fix:**

```powershell
# 1. Stop the container
docker compose stop

# 2. Fix ownership inside the volume
docker run --rm -v amkcircle_db_data:/data alpine `
  sh -c "chown 100:101 /data/amkcircle.db && chmod 664 /data/amkcircle.db && ls -lh /data/"

# 3. Restart
docker compose up -d
```

The `ls` output should show `100 101` as the owner, not `root root`.

---

### Docker — container shows `unhealthy` but the app loads fine

```
amkcircle-api   Up 2 minutes (unhealthy)
```

Inside Alpine Linux, `localhost` resolves to IPv6 `::1` but the Express server only binds IPv4 `0.0.0.0`. The `wget` health check therefore gets "Connection refused" even though the app responds correctly.

**Fix:** Both `Dockerfile` and `docker-compose.yml` use `127.0.0.1` instead of `localhost` in their health check commands. If you ever see this on an older build, rebuild:

```powershell
docker compose up --build -d
```

---

### Docker — `Exec format error` on better-sqlite3

```
Error loading shared library better_sqlite3.node: Exec format error
```

The native addon was compiled for Electron's ABI instead of Node.js. Rebuild it:

```powershell
docker compose down
docker compose up --build -d
```

The Dockerfile uses `--ignore-scripts` + `npm rebuild better-sqlite3 --build-from-source` to ensure the correct ABI.

---

### `better-sqlite3` fails to install (Windows / Electron)

```
Error: MSBUILD : error MSB4132
```

**Fix:** Install Visual C++ Build Tools.

```powershell
# Run as Administrator
npm install --global windows-build-tools
# OR download from:
# https://aka.ms/vs/17/release/vs_BuildTools.exe
# Select "Desktop development with C++"
```

---

### App shows white screen on launch

1. Open DevTools: `Ctrl+Shift+I` in the Electron window
2. Check the Console tab for errors
3. Common causes:
   - Missing `node_modules` → run `npm install`
   - Vite build not run → run `npm run build`
   - Port 5173 already in use → kill the process and retry

---

### Database locked error

SQLite WAL mode is enabled by default. If you see `SQLITE_BUSY`:

1. Make sure only one Electron instance is running
2. Delete `amkcircle-dev.sqlite-shm` and `amkcircle-dev.sqlite-wal` temp files
3. Restart the app

---

### Login fails with valid credentials

- Confirm the seed was applied: check the database file exists and is > 0 bytes
- Delete the database file and restart — it will re-seed
- Check `electron/handlers/auth.js` has the correct `JWT_SECRET`

---

### PDF receipts not downloading

The receipt is saved directly via `jsPDF`'s `doc.save()`. On Windows, files go to the user's **Downloads** folder. If nothing happens:

- Check the browser console for jsPDF errors
- Ensure `jspdf` and `jspdf-autotable` are installed: `npm list jspdf`

---

### Excel export downloads empty file

- Confirm `xlsx` is installed: `npm list xlsx`
- Check the data array passed to `exportToExcel` is not empty
- Open DevTools console and look for errors in `excel.js`

---

## Roadmap

- [ ] **Cloud sync** — optional PostgreSQL backend via Express.js REST API
- [ ] **Mobile companion** — React Native app for parents (attendance, grades)
- [ ] **Arabic RTL UI** — full right-to-left layout toggle
- [ ] **Multi-language** — i18next integration (Arabic, Urdu, Malay, French)
- [ ] **Email notifications** — SMTP integration for payment receipts
- [ ] **Fingerprint/biometric attendance** — hardware integration
- [ ] **Payment gateway** — Stripe / PayPal integration
- [ ] **Quran recitation tracking** — audio upload per lesson
- [ ] **Parent portal** — web app for parent access without installing Electron

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

Please follow the existing code style (ESLint + Prettier config coming soon).

---

## License

MIT © AMK Circle — [amkcircle.com](https://amkcircle.com)

---

<div align="center">
Built with ❤️ and Bismillah for the Ummah
</div>
