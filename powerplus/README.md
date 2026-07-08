# PowerPlus-style Energy Monitoring — Phase 1 (SQL Backend)

Backend + MySQL schema for a live/trends/report/consumption dashboard,
modeled on the reference app screenshots (Data Monitor, Trends, Report, Consumption).

## Project layout

```
powerplus/
├── docker-compose.yml       # MySQL + backend, one command to run both
├── sql/
│   ├── 01_schema.sql        # 5 tables: tag_master, live_values, tag_history, rollup_daily/monthly
│   └── 02_seed_tags.sql     # seeds tag_master with tags from the reference screenshots
└── backend/
    ├── main.py              # FastAPI app: /api/live, /api/history, /api/report, /api/consumption
    ├── database.py          # MySQL connection (PyMySQL)
    ├── simulate_data.py     # generates test data until a real PLC/SCADA feed is connected
    ├── requirements.txt
    ├── Dockerfile
    └── .env.example
```

## Quick start (Docker — recommended)

```bash
cd powerplus
docker compose up -d
```
This starts MySQL on `localhost:3306` (auto-loads the schema + seed tags on first boot)
and the API on `localhost:8000`.

Then generate test data so the dashboard has something to show:
```bash
docker compose exec backend python simulate_data.py --backfill-days 3
docker compose exec backend python simulate_data.py --live
```

## Quick start (without Docker)

1. Have a MySQL 8 server running, then load the schema:
   ```bash
   mysql -u root -p < sql/01_schema.sql
   mysql -u root -p < sql/02_seed_tags.sql
   ```
2. Set up the backend:
   ```bash
   cd backend
   python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env      # edit with your MySQL credentials
   python simulate_data.py --backfill-days 3   # test data
   uvicorn main:app --reload
   ```
3. API is live at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## API endpoints (map 1:1 to the app's screens)

| Endpoint | Maps to | Example |
|---|---|---|
| `GET /api/live?group=SMS-4 Furnace Parameters` | Data Monitor | live values grouped by section |
| `GET /api/history?tag_ids=1,2&start=...&end=...` | Trends | time-series for selected tags |
| `GET /api/report?granularity=15min\|daily\|monthly&start=...&end=...` | Report | tabular export data |
| `GET /api/consumption?date=2026-06-24` | Consumption | daily cumulative readings |
| `GET /api/tags` | Trends checklist | tag master list for the "Set Parameter" picker |

## Connecting a real data source later

Nothing in the schema or API changes when you move off the simulator. Whatever collects
plant data (OPC-UA client, Modbus poller, PLC gateway, or a manual entry tool) just needs to:
1. UPSERT into `live_values` on every poll (Data Monitor)
2. INSERT into `tag_history` every 15 minutes (Trends / 15-min Report)
3. Run/schedule the rollup queries in `simulate_data.py::backfill_history` on a cron
   (or replace with a proper ETL job) to keep `tag_rollup_daily`/`tag_rollup_monthly` current

## Next phases

- **Phase 2**: React frontend consuming these endpoints (web first, reusable patterns for
  a React Native mobile app later)
- **Phase 3**: Natural-language query layer — an LLM translates prompts into SQL against
  this schema, using `tag_master` as the grounding lookup
- **Phase 4**: Fine-tune a custom model once Phase 3 has logged real prompt→SQL→result usage
