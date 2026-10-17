r"""Remove the DATASET PP.pdf import (Oct 14-15, tags 116-123) from the DB.

Undoes the Oct 14-15 import so the dashboard shows the values that were live
before it — the 2026-07-08 09:06:40 snapshot from Mayur's original database
(2602.880 / 4962.149 / 2538.246 / 3207.917 for the four key meters):

  - deletes tag_history rows for tags 116-123 in [2026-10-14 21:00, 2026-10-16)
  - deletes the 2026-10-14/15 daily rollups for those tags
  - restores live_values for those tags to the 2026-07-08 09:06:40 snapshot

Oct-01/02 rollups are left untouched — they were already in Mayur's database.
To bring the PDF data back later, re-run reconcile_oct1415_pdf.py.

Usage:
    python remove_oct1415_pdf_data.py
"""
from database import get_cursor

TAG_IDS = (116, 117, 118, 119, 120, 121, 122, 123)
FROM_TS = "2026-10-14 21:00:00"
UNTIL_TS = "2026-10-16 00:00:00"

# live_values snapshot from Mayur's original database (sql/05_local_dump.sql)
SNAPSHOT = {
    116: 2602.880,  # Grid Import kWh
    117: 1248.545,  # Grid Import kVah
    118: 4962.149,  # Grid Export kWh
    119: 4030.637,  # Grid Export kVah
    120: 4346.992,  # 30MW TG-1 kWh
    121: 2538.246,  # 30MW TG-2 kWh
    122: 3207.917,  # 33MW TG-3 kWh
    123: 2397.812,  # 30MW TG-4 kWh
}
SNAPSHOT_TS = "2026-07-08 09:06:40"


def main():
    with get_cursor() as cur:
        placeholders = ",".join(["%s"] * len(TAG_IDS))

        cur.execute(
            f"SELECT COUNT(*) AS n FROM tag_history WHERE tag_id IN ({placeholders}) AND ts >= %s AND ts < %s",
            list(TAG_IDS) + [FROM_TS, UNTIL_TS],
        )
        before_rows = cur.fetchone()["n"]
        cur.execute(
            f"SELECT COUNT(*) AS n FROM tag_rollup_daily WHERE tag_id IN ({placeholders}) AND rollup_date IN ('2026-10-14','2026-10-15')",
            list(TAG_IDS),
        )
        before_rollups = cur.fetchone()["n"]

        print("BEFORE (live_values):")
        cur.execute(
            f"SELECT tag_id, value, last_updated FROM live_values WHERE tag_id IN ({placeholders}) ORDER BY tag_id",
            list(TAG_IDS),
        )
        for r in cur.fetchall():
            print(f"  tag {r['tag_id']} {r['last_updated']} = {r['value']}")

        deleted = cur.execute(
            f"DELETE FROM tag_history WHERE tag_id IN ({placeholders}) AND ts >= %s AND ts < %s",
            list(TAG_IDS) + [FROM_TS, UNTIL_TS],
        )
        print(f"\ndeleted {deleted} PDF history rows (expected {before_rows})")

        deleted = cur.execute(
            f"DELETE FROM tag_rollup_daily WHERE tag_id IN ({placeholders}) AND rollup_date IN ('2026-10-14','2026-10-15')",
            list(TAG_IDS),
        )
        print(f"deleted {deleted} PDF daily rollup rows (expected {before_rollups})")

        cur.executemany(
            """INSERT INTO live_values (tag_id, value, last_updated) VALUES (%s, %s, %s)
               ON DUPLICATE KEY UPDATE value = VALUES(value), last_updated = VALUES(last_updated)""",
            [(tag_id, SNAPSHOT[tag_id], SNAPSHOT_TS) for tag_id in TAG_IDS],
        )
        print("restored live_values to the 2026-07-08 09:06:40 snapshot")

        print("\nAFTER (live_values + latest stored day, what the dashboard will show):")
        cur.execute(
            f"""SELECT lv.tag_id, lv.value, lv.last_updated, rd.value AS day_value, rd.rollup_date AS day_date
                FROM live_values lv
                LEFT JOIN (
                    SELECT trd.tag_id, trd.value, trd.rollup_date
                    FROM tag_rollup_daily trd
                    JOIN (SELECT tag_id, MAX(rollup_date) AS max_day FROM tag_rollup_daily GROUP BY tag_id) m
                      ON m.tag_id = trd.tag_id AND m.max_day = trd.rollup_date
                ) rd ON rd.tag_id = lv.tag_id
                WHERE lv.tag_id IN ({placeholders}) ORDER BY lv.tag_id""",
            list(TAG_IDS),
        )
        for r in cur.fetchall():
            print(f"  tag {r['tag_id']} live={r['value']} ({r['last_updated']})  latest day {r['day_date']} = {r['day_value']}")


if __name__ == "__main__":
    main()
