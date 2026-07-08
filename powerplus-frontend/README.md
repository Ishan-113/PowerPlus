# PowerPlus Frontend (React + Vite)

Web dashboard matching the reference app: Dashboard → Data Monitor → Trends → Report → Consumption.
Talks to the FastAPI backend at `http://localhost:8000` (must be running — see the backend README).

## Design

Control-room instrumentation theme: deep graphite background, amber section labels (echoing real
switchgear indicator lamps), cyan for live/generation values, tabular monospace numerals for every
reading so figures align like a real meter. Each Data Monitor row includes a live sparkline pulled
from the last 4 hours of history.

## Setup

```bash
cd powerplus-frontend
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

**Requirement**: the backend must already be running at `localhost:8000` (`uvicorn main:app --reload`
from the `backend` folder) — this frontend fetches all its data from there.

## Pages

| Route | Screen | Backend calls |
|---|---|---|
| `/` | Dashboard | `/api/live` (summary strip only) |
| `/data-monitor` | Data Monitor | `/api/live`, `/api/history` (sparklines) |
| `/trends` | Trends | `/api/tags`, `/api/history` |
| `/report` | Report | `/api/report` |
| `/consumption` | Consumption | `/api/consumption` |

## Build for production

```bash
npm run build
```
Outputs static files to `dist/` — can be served by any static host (nginx, IIS, etc.) once you're
ready to deploy rather than run the dev server.
