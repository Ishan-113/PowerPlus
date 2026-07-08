"""
Keep test data fresh — designed to run on a schedule (e.g. every 15 minutes via
Windows Task Scheduler) without creating duplicate rows or reprocessing old data.

Unlike simulate_data.py --backfill-days (which regenerates a whole date range and
will duplicate rows if run more than once over the same window), this script:
  1. Finds the last timestamp already in tag_history
  2. Generates only the NEW 15-min points between then and now
  3. Refreshes today's rollup (safe to re-run — uses upsert)
  4. Pushes a fresh live_values snapshot

Usage (run every 15 min via Task Scheduler):
    python keep_data_fresh.py
"""
from datetime import datetime, timedelta

from database import get_cursor
from simulate_data import get_all_tags, random_value, push_live


def get_last_ts(cur):
    cur.execute("SELECT MAX(ts) AS last_ts FROM tag_history")
    row = cur.fetchone()
    return row["last_ts"]


def fill_gap(cur, tags):
    last_ts = get_last_ts(cur)
    now = datetime.now().replace(second=0, microsecond=0)

    if last_ts is None:
        # no history at all yet — seed the last 15 minutes only
        start = now - timedelta(minutes=15)
    else:
        start = last_ts + timedelta(minutes=15)

    if start > now:
        print("Data is already up to date — nothing to fill.")
        return 0

    rows = []
    ts = start
    while ts <= now:
        for tag in tags:
            rows.append((tag["tag_id"], ts, random_value(tag)))
        ts += timedelta(minutes=15)

    if rows:
        cur.executemany(
            "INSERT INTO tag_history (tag_id, ts, value) VALUES (%s, %s, %s)",
            rows,
        )
    print(f"Filled gap {start} -> {now}: inserted {len(rows)} history rows.")
    return len(rows)


def refresh_today_rollup(cur):
    cur.execute("""
        INSERT INTO tag_rollup_daily (tag_id, rollup_date, value, min_value, max_value, avg_value, source)
        SELECT tag_id, DATE(ts), MAX(value), MIN(value), MAX(value), AVG(value), 'simulated'
        FROM tag_history
        WHERE DATE(ts) = CURDATE()
        GROUP BY tag_id, DATE(ts)
        ON DUPLICATE KEY UPDATE
            value = IF(source = 'real', value, VALUES(value)),
            min_value = IF(source = 'real', min_value, VALUES(min_value)),
            max_value = IF(source = 'real', max_value, VALUES(max_value)),
            avg_value = IF(source = 'real', avg_value, VALUES(avg_value))
    """)
    print("Today's daily rollup refreshed (real data, if any, was preserved).")

    cur.execute("""
        INSERT INTO tag_rollup_monthly (tag_id, rollup_month, value, min_value, max_value, avg_value)
        SELECT tag_id, DATE_FORMAT(rollup_date, '%Y-%m-01'), MAX(value), MIN(min_value), MAX(max_value), AVG(avg_value)
        FROM tag_rollup_daily
        WHERE DATE_FORMAT(rollup_date, '%Y-%m-01') = DATE_FORMAT(CURDATE(), '%Y-%m-01')
        GROUP BY tag_id, DATE_FORMAT(rollup_date, '%Y-%m-01')
        ON DUPLICATE KEY UPDATE
            value = VALUES(value), min_value = VALUES(min_value),
            max_value = VALUES(max_value), avg_value = VALUES(avg_value)
    """)
    print("This month's rollup refreshed.")


if __name__ == "__main__":
    with get_cursor() as cur:
        tags = get_all_tags(cur)
        if not tags:
            print("No tags found — run sql/02_seed_tags.sql first.")
            raise SystemExit(1)

        fill_gap(cur, tags)
        refresh_today_rollup(cur)
        push_live(cur, tags)