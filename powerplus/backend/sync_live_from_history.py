r"""Sync derived tables from tag_history after a PDF import (run pointed at Aiven).

1. live_values  <- latest tag_history row per tag (drives Dashboard/Data Monitor)
2. tag_rollup_daily <- fills dates present in history but missing from the
   daily table (drives Consumption). New rows are marked source='real';
   existing rows are never touched.

Usage (PowerShell, Aiven env set in this terminal only):
    & ".\venv\Scripts\python.exe" sync_live_from_history.py
"""
from database import get_cursor

with get_cursor() as cur:
    cur.execute(
        """INSERT INTO live_values (tag_id, value, last_updated)
           SELECT h.tag_id, h.value, h.ts FROM tag_history h
           JOIN (SELECT tag_id, MAX(ts) AS m FROM tag_history GROUP BY tag_id) l
             ON l.tag_id = h.tag_id AND l.m = h.ts
           ON DUPLICATE KEY UPDATE
             value = VALUES(value), last_updated = VALUES(last_updated)"""
    )
    print("live synced:", cur.rowcount)

    cur.execute(
        """INSERT INTO tag_rollup_daily
             (tag_id, rollup_date, value, min_value, max_value, avg_value, source)
           SELECT h.tag_id, DATE(h.ts), SUM(h.value), MIN(h.value), MAX(h.value),
                  AVG(h.value), 'real'
           FROM tag_history h
           LEFT JOIN tag_rollup_daily d
             ON d.tag_id = h.tag_id AND d.rollup_date = DATE(h.ts)
           WHERE d.tag_id IS NULL
           GROUP BY h.tag_id, DATE(h.ts)"""
    )
    print("daily rollups filled:", cur.rowcount)

print("done")
