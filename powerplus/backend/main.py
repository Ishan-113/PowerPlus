"""
PowerPlus-style Energy Monitoring API
Endpoints map directly to the four screens of the reference app:
  /api/live         -> Data Monitor
  /api/history       -> Trends
  /api/report         -> Report (15min / daily / monthly)
  /api/consumption -> Consumption
"""
from datetime import date, datetime
from itertools import groupby
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import logging
import database as db_module
from database import get_cursor
import nl_query

logger = logging.getLogger("powerplus")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PowerPlus API", version="0.1.0")

# Allow the React frontend from any origin during development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Data Monitor  ->  live values grouped by equipment_group
# ---------------------------------------------------------
@app.get("/api/live")
def get_live_values(group: Optional[str] = None):
    query = """
        SELECT tm.tag_id, tm.tag_name, tm.equipment_group, tm.unit,
               lv.value, lv.last_updated,
               rd.value AS day_value, rd.rollup_date AS day_date
        FROM tag_master tm
        LEFT JOIN live_values lv ON lv.tag_id = tm.tag_id
        LEFT JOIN (
            SELECT trd.tag_id, trd.value, trd.rollup_date
            FROM tag_rollup_daily trd
            JOIN (SELECT tag_id, MAX(rollup_date) AS max_day
                  FROM tag_rollup_daily GROUP BY tag_id) m
              ON m.tag_id = trd.tag_id AND m.max_day = trd.rollup_date
        ) rd ON rd.tag_id = tm.tag_id
        WHERE tm.is_active = TRUE
    """
    params = []
    if group:
        query += " AND tm.equipment_group = %s"
        params.append(group)
    query += " ORDER BY tm.equipment_group, tm.display_order"

    with get_cursor() as cur:
        cur.execute(query, params)
        rows = cur.fetchall()

    # group rows by equipment_group, same shape as the app's yellow section headers
    grouped = []
    for group_name, items in groupby(rows, key=lambda r: r["equipment_group"]):
        grouped.append({"group": group_name, "tags": list(items)})
    return grouped


# ---------------------------------------------------------
# Trends  ->  time-series history for selected tags
# ---------------------------------------------------------
@app.get("/api/history")
def get_history(
    tag_ids: str = Query(..., description="Comma-separated tag_id list, e.g. 1,4,9"),
    start: datetime = Query(..., description="ISO datetime, e.g. 2026-06-25T11:15:00"),
    end: datetime = Query(..., description="ISO datetime, e.g. 2026-06-25T12:05:00"),
):
    try:
        ids = [int(x) for x in tag_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(400, "tag_ids must be a comma-separated list of integers")
    if not ids:
        raise HTTPException(400, "At least one tag_id is required")

    placeholders = ",".join(["%s"] * len(ids))
    query = f"""
        SELECT th.tag_id, tm.tag_name, th.ts, th.value
        FROM tag_history th
        JOIN tag_master tm ON tm.tag_id = th.tag_id
        WHERE th.tag_id IN ({placeholders}) AND th.ts BETWEEN %s AND %s
        ORDER BY th.tag_id, th.ts
    """
    with get_cursor() as cur:
        cur.execute(query, ids + [start, end])
        rows = cur.fetchall()

    series = []
    for tag_id, items in groupby(rows, key=lambda r: r["tag_id"]):
        items = list(items)
        series.append({
            "tag_id": tag_id,
            "tag_name": items[0]["tag_name"],
            "points": [{"ts": r["ts"], "value": r["value"]} for r in items],
        })
    return series


# ---------------------------------------------------------
# Report  ->  15-minute / daily / monthly, with date range
# ---------------------------------------------------------
@app.get("/api/report")
def get_report(
    granularity: str = Query(..., pattern="^(15min|hourly|daily|monthly)$"),
    start: str = Query(..., description="Date or datetime depending on granularity"),
    end: str = Query(..., description="Date or datetime depending on granularity"),
    tag_ids: Optional[str] = Query(None, description="Comma-separated tag_id list; omit for all"),
):
    ids = None
    if tag_ids:
        try:
            ids = [int(x) for x in tag_ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(400, "tag_ids must be a comma-separated list of integers")
        if not ids:
            ids = None

    if granularity == "15min":
        # raw 15-min history
        query = """
            SELECT t.tag_id, tm.tag_name, tm.unit, t.ts AS period, t.value
            FROM tag_history t
            JOIN tag_master tm ON tm.tag_id = t.tag_id
            WHERE t.ts BETWEEN %s AND %s
        """
        params = [start, end]
        if ids:
            query += f" AND t.tag_id IN ({','.join(['%s']*len(ids))})"
            params += ids
        query += " ORDER BY t.tag_id, t.ts"

    elif granularity == "hourly":
        # aggregate tag_history into 1-hour buckets
        query = """
            SELECT t.tag_id, tm.tag_name, tm.unit,
                    DATE_FORMAT(DATE_SUB(t.ts, INTERVAL MINUTE(t.ts) MINUTE), '%%Y-%%m-%%d %%H:00:00') AS period,
                   SUM(t.value) AS value
            FROM tag_history t
            JOIN tag_master tm ON tm.tag_id = t.tag_id
            WHERE t.ts BETWEEN %s AND %s
        """
        params = [start, end]
        if ids:
            query += f" AND t.tag_id IN ({','.join(['%s']*len(ids))})"
            params += ids
        query += " GROUP BY t.tag_id, tm.tag_name, tm.unit, period ORDER BY t.tag_id, period"

    elif granularity == "daily":
        table, ts_col = "tag_rollup_daily", "rollup_date"
        query = f"""
            SELECT t.tag_id, tm.tag_name, tm.unit, t.{ts_col} AS period, t.value, t.source
            FROM {table} t
            JOIN tag_master tm ON tm.tag_id = t.tag_id
            WHERE t.{ts_col} BETWEEN %s AND %s
        """
        params = [start, end]
        if ids:
            query += f" AND t.tag_id IN ({','.join(['%s']*len(ids))})"
            params += ids
        query += f" ORDER BY t.tag_id, t.{ts_col}"

    else:  # monthly
        table, ts_col = "tag_rollup_monthly", "rollup_month"
        query = f"""
            SELECT t.tag_id, tm.tag_name, tm.unit, t.{ts_col} AS period, t.value
            FROM {table} t
            JOIN tag_master tm ON tm.tag_id = t.tag_id
            WHERE t.{ts_col} BETWEEN %s AND %s
        """
        params = [start, end]
        if ids:
            query += f" AND t.tag_id IN ({','.join(['%s']*len(ids))})"
            params += ids
        query += f" ORDER BY t.tag_id, t.{ts_col}"

    with get_cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()


# ---------------------------------------------------------
# Consumption  ->  daily rollup for cumulative-type tags
# ---------------------------------------------------------
@app.get("/api/consumption")
def get_consumption(on_date: date = Query(..., alias="date")):
    query = """
        SELECT tm.tag_id, tm.tag_name, tm.equipment_group, tm.unit, trd.value
        FROM tag_rollup_daily trd
        JOIN tag_master tm ON tm.tag_id = trd.tag_id
        WHERE trd.rollup_date = %s AND tm.tag_type = 'cumulative'
        ORDER BY tm.display_order
    """
    with get_cursor() as cur:
        cur.execute(query, [on_date])
        return cur.fetchall()


@app.get("/api/tags")
def list_tags():
    """Tag master list — used by the frontend to build the Trends checklist."""
    with get_cursor() as cur:
        cur.execute(
            "SELECT tag_id, tag_name, equipment_group, unit, tag_type "
            "FROM tag_master WHERE is_active = TRUE ORDER BY equipment_group, display_order"
        )
        return cur.fetchall()


class AskRequest(BaseModel):
    question: str


@app.post("/api/ask")
def ask_question(req: AskRequest):
    """Phase 2 — natural language question -> SQL -> results -> plain-English answer."""
    if not req.question or not req.question.strip():
        raise HTTPException(400, "question must not be empty")
    try:
        return nl_query.ask(req.question.strip())
    except Exception as e:
        logger.exception("Ask failed")
        raise HTTPException(500, str(e))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db():
    """DB connectivity check — returns driver error without leaking credentials."""
    try:
        with get_cursor() as cur:
            cur.execute("SELECT 1 AS ok")
            row = cur.fetchone()
        return {
            "status": "ok",
            "db_host": db_module.DB_HOST,
            "db_port": db_module.DB_PORT,
            "db_name": db_module.DB_NAME,
            "db_user": db_module.DB_USER,
            "db_ssl": db_module.DB_SSL,
            "result": row,
        }
    except Exception as e:
        logger.exception("DB health check failed")
        raise HTTPException(500, f"DB connection failed: {type(e).__name__}: {e}")
