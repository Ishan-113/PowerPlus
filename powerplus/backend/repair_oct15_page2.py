r"""One-off repair: page-2 rows of DATASET PP.pdf (Oct-15 18:00/19:00/20:00)
were imported shifted one column left. Run ONCE against Aiven, then run
sync_live_from_history.py. Safe to run once; deletes only the 8 imported
tags at those 3 timestamps, then inserts the 24 correct values.
"""
from database import get_cursor

TAG_IDS = (116, 117, 118, 119, 120, 121, 122, 123)
BAD_TS = ("2026-10-15 18:00:00", "2026-10-15 19:00:00", "2026-10-15 20:00:00")

# (tag_id, ts) -> correct value, read from the PDF:
# 18:00: 0 0 0 0 | 39342 299360 0 39574
# 19:00: 0 0 0 0 | 40076 0 0 40396
# 20:00: 0 0 0 0 | 38078 0 0 38622
CORRECT = {
    ("2026-10-15 18:00:00", 116, 0), ("2026-10-15 18:00:00", 117, 0),
    ("2026-10-15 18:00:00", 121, 0), ("2026-10-15 18:00:00", 120, 0),
    ("2026-10-15 18:00:00", 118, 39342), ("2026-10-15 18:00:00", 122, 299360),
    ("2026-10-15 18:00:00", 123, 0), ("2026-10-15 18:00:00", 119, 39574),
    ("2026-10-15 19:00:00", 116, 0), ("2026-10-15 19:00:00", 117, 0),
    ("2026-10-15 19:00:00", 121, 0), ("2026-10-15 19:00:00", 120, 0),
    ("2026-10-15 19:00:00", 118, 40076), ("2026-10-15 19:00:00", 122, 0),
    ("2026-10-15 19:00:00", 123, 0), ("2026-10-15 19:00:00", 119, 40396),
    ("2026-10-15 20:00:00", 116, 0), ("2026-10-15 20:00:00", 117, 0),
    ("2026-10-15 20:00:00", 121, 0), ("2026-10-15 20:00:00", 120, 0),
    ("2026-10-15 20:00:00", 118, 38078), ("2026-10-15 20:00:00", 122, 0),
    ("2026-10-15 20:00:00", 123, 0), ("2026-10-15 20:00:00", 119, 38622),
}

with get_cursor() as cur:
    placeholders = ",".join(["%s"] * len(TAG_IDS))
    deleted = 0
    for ts in BAD_TS:
        cur.execute(
            f"DELETE FROM tag_history WHERE tag_id IN ({placeholders}) AND ts = %s",
            list(TAG_IDS) + [ts],
        )
        deleted += cur.rowcount
    print("deleted bad rows:", deleted)

    cur.executemany(
        "INSERT INTO tag_history (tag_id, ts, value) VALUES (%s, %s, %s)",
        [(tag, ts, val) for (ts, tag, val) in CORRECT],
    )
    print("inserted correct rows: 24")

    # Oct-15 daily rollups were summed from the shifted data — recompute.
    cur.execute(
        """INSERT INTO tag_rollup_daily
             (tag_id, rollup_date, value, min_value, max_value, avg_value, source)
           SELECT tag_id, DATE(ts), SUM(value), MIN(value), MAX(value),
                  AVG(value), 'real'
           FROM tag_history WHERE DATE(ts) = '2026-10-15'
           GROUP BY tag_id, DATE(ts)
           ON DUPLICATE KEY UPDATE value = VALUES(value),
             min_value = VALUES(min_value), max_value = VALUES(max_value),
             avg_value = VALUES(avg_value), source = 'real'"""
    )
    print("oct-15 rollups recomputed")

print("done — now run sync_live_from_history.py")
