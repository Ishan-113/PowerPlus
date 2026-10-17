"""
Simulator — generates realistic-looking readings so the dashboard can be
tested end-to-end before a real PLC/SCADA/OPC feed is connected.

Run once to backfill history + rollups, then run continuously (or via cron
every 15 min) to keep live_values fresh.

Usage:
    python simulate_data.py --backfill-days 3     # one-time historical backfill
    python simulate_data.py --live                # push one fresh live reading per tag
"""
import argparse
import random
from datetime import datetime, timedelta

from database import get_cursor


def get_all_tags(cur):
    cur.execute("SELECT tag_id, tag_type, unit FROM tag_master WHERE is_active = TRUE")
    return cur.fetchall()


def random_value(tag):
    # placeholder ranges per unit/tag type; replaced by a real PLC/SCADA feed later
    if tag["tag_type"] == "cumulative":
        return round(random.uniform(0, 5000), 3)
    if tag["unit"] == "%":
        return round(random.uniform(0, 100), 3)
    if tag["unit"] == "count":
        return random.randint(0, 15)
    return round(random.uniform(0, 8000), 3)


def push_live(cur, tags):
    now = datetime.now()
    for tag in tags:
        value = random_value(tag)
        cur.execute(
            """INSERT INTO live_values (tag_id, value, last_updated)
               VALUES (%s, %s, %s)
               ON DUPLICATE KEY UPDATE value = VALUES(value), last_updated = VALUES(last_updated)""",
            (tag["tag_id"], value, now),
        )
    print(f"Pushed live values for {len(tags)} tags at {now}")


def backfill_history(cur, tags, days):
    now = datetime.now().replace(second=0, microsecond=0)
    start = now - timedelta(days=days)
    ts = start
    history_rows = []
    while ts <= now:
        for tag in tags:
            history_rows.append((tag["tag_id"], ts, random_value(tag)))
        ts += timedelta(minutes=15)

    cur.executemany(
        "INSERT INTO tag_history (tag_id, ts, value) VALUES (%s, %s, %s)",
        history_rows,
    )
    print(f"Backfilled {len(history_rows)} history rows over {days} day(s)")

    # simple daily rollup from the history we just inserted
    # NOTE: never overwrites a row already marked 'real' (a genuine client import) —
    # only simulated-source rows get refreshed with new random data.
    cur.execute("""
        INSERT INTO tag_rollup_daily (tag_id, rollup_date, value, min_value, max_value, avg_value, source)
        SELECT tag_id, DATE(ts), MAX(value), MIN(value), MAX(value), AVG(value), 'simulated'
        FROM tag_history
        GROUP BY tag_id, DATE(ts)
        ON DUPLICATE KEY UPDATE
            value = IF(source = 'real', value, VALUES(value)),
            min_value = IF(source = 'real', min_value, VALUES(min_value)),
            max_value = IF(source = 'real', max_value, VALUES(max_value)),
            avg_value = IF(source = 'real', avg_value, VALUES(avg_value))
    """)
    print("Daily rollups computed (real data, if any, was preserved).")

    cur.execute("""
        INSERT INTO tag_rollup_monthly (tag_id, rollup_month, value, min_value, max_value, avg_value)
        SELECT tag_id, DATE_FORMAT(rollup_date, '%Y-%m-01'), MAX(value), MIN(min_value), MAX(max_value), AVG(avg_value)
        FROM tag_rollup_daily
        GROUP BY tag_id, DATE_FORMAT(rollup_date, '%Y-%m-01')
        ON DUPLICATE KEY UPDATE
            value = VALUES(value), min_value = VALUES(min_value),
            max_value = VALUES(max_value), avg_value = VALUES(avg_value)
    """)
    print("Monthly rollups computed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--backfill-days", type=int, help="Backfill N days of 15-min history + rollups")
    parser.add_argument("--live", action="store_true", help="Push one fresh live reading per tag")
    args = parser.parse_args()

    with get_cursor() as cur:
        tags = get_all_tags(cur)
        if not tags:
            print("No tags found — run sql/02_seed_tags.sql first.")
            exit(1)

        if args.backfill_days:
            backfill_history(cur, tags, args.backfill_days)
        if args.live:
            push_live(cur, tags)
        if not args.backfill_days and not args.live:
            print("Nothing to do. Use --backfill-days N and/or --live")