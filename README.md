# ⏻ PowerPlus — Energy Monitoring Platform

Live plant-wide energy monitoring: **Dashboard · Data Monitor · Trends · Report · Consumption · Ask (AI)**.

A React + Vite dashboard (deployed on Vercel) talking to a FastAPI + MySQL backend (deployed on Render, MySQL on Aiven). Native installs available for **Android** and **Windows** — every install loads the live site, so updates reach all users automatically.

| | Link |
|---|---|
| 🌐 Web dashboard | https://power-plus-sandy.vercel.app |
| 📱 Android APK | https://power-plus-sandy.vercel.app/app.apk |
| 🖥️ Windows app | [Latest Release](https://github.com/Ishan-113/PowerPlus/releases/latest) |

---

## 📥 Downloads & Installation

### 📱 Android (APK, ~842 KB)

1. On your phone, open: **https://power-plus-sandy.vercel.app/app.apk**
2. Chrome may warn *"This file might be harmful"* → tap **Download anyway** (it's our own build).
3. Open the downloaded file. When asked, allow **Install unknown apps** for your browser/Files app.
4. Tap **Install**.
   - If it says **"App not installed"** → an older PowerPlus app is present: uninstall it first (Settings → Apps → PowerPlus), then retry.
5. Open PowerPlus — it loads the live dashboard. Updates arrive automatically with every site deploy.

### 🖥️ Windows

**Option A — Installer (recommended, ~107 MB):**

1. Download **PowerPlus-Setup-1.0.0.exe** from the [Releases page](https://github.com/Ishan-113/PowerPlus/releases/latest).
2. Double-click it. If SmartScreen shows *"Windows protected your PC"* → click **More info → Run anyway** (one time only — the app isn't code-signed; it's our own build).
3. It installs for your user (no admin rights needed) and launches automatically. Find **PowerPlus** in the Start menu; uninstall any time via Settings → Apps.

**Option B — Portable, no install (~139 MB):**

1. Download **PowerPlus-Windows.zip** from the [Releases page](https://github.com/Ishan-113/PowerPlus/releases/latest).
2. Right-click → **Extract All** — keep the folder somewhere plain like `D:\Apps` (avoid OneDrive-synced folders such as the Desktop).
3. Double-click **PowerPlus.exe** (same SmartScreen note as above). Delete the folder to remove it completely.

Both versions load the live site, so **updates arrive automatically** with every deploy — no reinstalls needed.

### 💡 Alternative: install as a PWA (any device, no download)

Open https://power-plus-sandy.vercel.app in Chrome/Edge and click the **Install** icon in the address bar
(phone: ⋮ menu → **Add to Home screen**). Works on Windows, Mac, Linux, Android, and tablets.

---

## 🗂 Repository layout

```
PowerPlus/
├── powerplus/               # Backend: FastAPI + MySQL (see powerplus/README.md)
│   ├── backend/             #   main.py (API), database.py, nl_query.py (AI "Ask")
│   └── sql/                 #   schema + seeds + data dumps
└── powerplus-frontend/      # Dashboard: React 18 + Vite + Recharts (see its README.md)
    └── public/              #   app.apk, PWA manifest, icons
```

## 🚀 Running in development

**Backend** (needs Python 3.13 + a MySQL database — local or Aiven):
```bash
cd powerplus/backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # then fill in DB_* values
uvicorn main:app --reload   # http://localhost:8000
```

**Frontend:**
```bash
cd powerplus-frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :8000)
```

## ☁️ Production stack

| Layer | Service | Notes |
|---|---|---|
| Frontend | Vercel (`power-plus-sandy.vercel.app`) | auto-deploys from `main` |
| API | Render (`powerplus-irrb.onrender.com`) | `VITE_API_URL` baked into frontend builds |
| Database | Aiven MySQL 8.4 | TLS required (`DB_SSL=true`) |

## 🔐 Notes

- The Ask feature (`/api/ask`) answers natural-language questions by generating SQL via Gemini.
- `/health/db` reports database connectivity for the sidebar status indicator.
