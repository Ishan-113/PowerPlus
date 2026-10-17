r"""Reconcile the Oct 14-15 report window (tags 116-123) from DATASET PP.pdf.

History of what went wrong (for reference):
  - the original import shifted the page-2 columns (no blank column there),
    fixed later by repair_oct15_page2.py for 18:00/19:00/20:00 only
  - tag 122 (33MW TG-3 kWh) page-1 values (106432 / 96808 / 206680) never
    made it into the DB, so its Oct-15 total showed 299360 instead of 602848
  - the 14 Oct page-1 rows were similarly incomplete

This script rebuilds the whole report window from the PDF itself:
  - parses both pages, mapping values by the page-1 header row
  - self-checks parsed values against the PDF's own "Total" row
  - deletes tag_history rows for tags 116-123 in [2026-10-14 21:00, 2026-10-16)
  - re-inserts all 21 report rows x 8 values (168 history rows)
  - rebuilds the 2026-10-14/15 daily rollups from history (source='real')
  - ADDS the imported sums onto the existing live_values, so the dashboard
    shows "previous value + new import" on the cards instead of the newest
    (often 0) reading. Re-runs with the PDF data already present add nothing.

Usage:
    python reconcile_oct1415_pdf.py "C:\path\to\DATASET PP.pdf"
"""
import re
import sys
from datetime import datetime

import pdfplumber

from database import get_cursor

TAG_IDS = (116, 117, 118, 119, 120, 121, 122, 123)
FROM_TS = "2026-10-14 21:00:00"
UNTIL_TS = "2026-10-16 00:00:00"

# PDF "Total" row per tag (hand-verified from the PDF), used as a self-check.
EXPECTED_TOTALS = {
    116: 0,        # Grid Import kWh
    117: 0,        # Grid Import kVah
    121: 611432,   # 30MW TG-2 kWh
    120: 0,        # 30MW TG-1 kWh
    118: 992408,   # Grid Export kWh
    122: 709280,   # 33MW TG-3 kWh
    123: 0,        # 30MW TG-4 kWh
    119: 997638,   # Grid Export kVah
}


def normalize(name):
    return re.sub(r"\s+", "", name or "").lower()


def is_blank(cell):
    return cell is None or str(cell).strip() == ""


def parse_pdf(pdf_path, tag_lookup):
    """Returns (history_rows, totals) where history_rows is a list of
    (tag_id, ts, value) and totals is {tag_id: total} from the 'Total' row."""
    header = None
    data_rows = []
    total_row = None

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for row in table:
                    if not row or is_blank(row[0]):
                        continue
                    if row[0] == "Sync Date":
                        header = row
                        continue
                    if header is None:
                        continue
                    if row[0] == "Total":
                        total_row = row
                        continue
                    if re.match(r"^\d{4}-\d{2}-\d{2}$", str(row[0]).strip()):
                        data_rows.append(row)

    value_headers = [h for h in header[2:] if not is_blank(h)]
    if len(value_headers) != 8:
        raise SystemExit(f"expected 8 value columns in header, got {len(value_headers)}: {value_headers}")

    tag_ids = []
    for name in value_headers:
        key = normalize(name)
        if key not in tag_lookup:
            raise SystemExit(f"PDF column {name!r} has no matching tag in tag_master")
        tag_ids.append(tag_lookup[key])

    if len(data_rows) != 21:
        raise SystemExit(f"expected 21 data rows in the report, got {len(data_rows)}")

    history_rows = []
    for row in data_rows:
        values = [c for c in row[2:] if not is_blank(c)]
        if len(values) != 8:
            raise SystemExit(f"row {row[0]} {row[1]} has {len(values)} values, expected 8: {values}")
        date_str, time_str = str(row[0]).strip(), str(row[1]).strip()
        ts = datetime.strptime(f"{date_str} {time_str.split('-')[0].strip()}", "%Y-%m-%d %H:%M")
        for tag_id, raw in zip(tag_ids, values):
            history_rows.append((tag_id, ts, float(raw)))

    if total_row is None:
        raise SystemExit("no 'Total' row found in the PDF")
    total_values = [c for c in total_row[2:] if not is_blank(c)]
    if len(total_values) != 8:
        raise SystemExit(f"Total row has {len(total_values)} values, expected 8")
    totals = {tag_id: float(v) for tag_id, v in zip(tag_ids, total_values)}

    return history_rows, totals


def main():
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else r"c:\Users\Ishan\OneDrive\Random\DATASET PP.pdf"

    with get_cursor() as cur:
        cur.execute("SELECT tag_id, tag_name FROM tag_master")
        tag_lookup = {normalize(r["tag_name"]): r["tag_id"] for r in cur.fetchall()}

        history_rows, pdf_totals = parse_pdf(pdf_path, tag_lookup)

        # self-checks: parsed sums must match both the PDF Total row and the
        # hand-verified expected totals
        sums = {t: 0.0 for t in TAG_IDS}
        for tag_id, _ts, value in history_rows:
            sums[tag_id] += value
        for tag_id in TAG_IDS:
            if abs(sums[tag_id] - pdf_totals[tag_id]) > 0.001:
                raise SystemExit(f"self-check failed: tag {tag_id} sum {sums[tag_id]} != PDF total {pdf_totals[tag_id]}")
            if abs(sums[tag_id] - EXPECTED_TOTALS[tag_id]) > 0.001:
                raise SystemExit(f"self-check failed: tag {tag_id} sum {sums[tag_id]} != expected {EXPECTED_TOTALS[tag_id]}")
        print(f"PDF parsed & verified: 21 rows x 8 tags = {len(history_rows)} values, totals match")

        placeholders = ",".join(["%s"] * len(TAG_IDS))

        cur.execute(
            f"""SELECT tag_id, DATE(ts) AS d, SUM(value) AS total FROM tag_history
                WHERE tag_id IN ({placeholders}) AND ts >= %s AND ts < %s
                GROUP BY tag_id, DATE(ts) ORDER BY d, tag_id""",
            list(TAG_IDS) + [FROM_TS, UNTIL_TS],
        )
        print("\nBEFORE (current DB history sums):")
        for r in cur.fetchall():
            print(f"  tag {r['tag_id']} {r['d']} = {r['total']}")

        cur.execute(
            f"SELECT COUNT(*) AS n FROM tag_history WHERE tag_id IN ({placeholders}) AND ts >= %s AND ts < %s",
            list(TAG_IDS) + [FROM_TS, UNTIL_TS],
        )
        before_rows = cur.fetchone()["n"]

        deleted = cur.execute(
            f"DELETE FROM tag_history WHERE tag_id IN ({placeholders}) AND ts >= %s AND ts < %s",
            list(TAG_IDS) + [FROM_TS, UNTIL_TS],
        )
        print(f"\ndeleted {deleted} old history rows")

        cur.executemany(
            "INSERT INTO tag_history (tag_id, ts, value) VALUES (%s, %s, %s)",
            history_rows,
        )
        print(f"inserted {len(history_rows)} history rows")

        deleted = cur.execute(
            f"DELETE FROM tag_rollup_daily WHERE tag_id IN ({placeholders}) AND rollup_date IN ('2026-10-14','2026-10-15')",
            list(TAG_IDS),
        )
        print(f"deleted {deleted} old daily rollup rows")

        cur.execute(
            f"""INSERT INTO tag_rollup_daily (tag_id, rollup_date, value, min_value, max_value, avg_value, source)
                SELECT tag_id, DATE(ts), SUM(value), MIN(value), MAX(value), AVG(value), 'real'
                FROM tag_history
                WHERE tag_id IN ({placeholders}) AND DATE(ts) IN ('2026-10-14','2026-10-15')
                GROUP BY tag_id, DATE(ts)""",
            list(TAG_IDS),
        )
        print("rebuilt daily rollups from history")

        cur.execute(
            f"DELETE FROM tag_rollup_monthly WHERE tag_id IN ({placeholders}) AND rollup_month = '2026-10-01'",
            list(TAG_IDS),
        )
        cur.execute(
            f"""INSERT INTO tag_rollup_monthly (tag_id, rollup_month, value, min_value, max_value, avg_value)
                SELECT d.tag_id, DATE_SUB(d.rollup_date, INTERVAL DAYOFMONTH(d.rollup_date) - 1 DAY),
                       CASE WHEN tm.tag_type = 'cumulative' THEN SUM(d.value) ELSE AVG(d.avg_value) END,
                       MIN(d.min_value), MAX(d.max_value), AVG(d.avg_value)
                FROM tag_rollup_daily d
                JOIN tag_master tm ON tm.tag_id = d.tag_id
                WHERE d.tag_id IN ({placeholders}) AND d.rollup_date IN ('2026-10-14','2026-10-15')
                GROUP BY d.tag_id, tm.tag_type, DATE_SUB(d.rollup_date, INTERVAL DAYOFMONTH(d.rollup_date) - 1 DAY)""",
            list(TAG_IDS),
        )
        print("rebuilt monthly rollup for 2026-10 from daily rollups")

        # Dashboard card value = previous live value + everything this import
        # adds (the same per-tag sums the PDF's own Total row shows). Guard
        # against double-counting: only accumulate if the PDF rows weren't
        # already in the DB (run remove_oct1415_pdf_data.py to re-import).
        cur.execute(
            f"SELECT tag_id, value FROM live_values WHERE tag_id IN ({placeholders})",
            list(TAG_IDS),
        )
        old_live = {r["tag_id"]: r["value"] for r in cur.fetchall()}

        if before_rows == 0:
            newest_ts = max(ts for _tag, ts, _val in history_rows)
            updates = [
                (tag_id, float(old_live.get(tag_id) or 0) + sums[tag_id], newest_ts)
                for tag_id in TAG_IDS
            ]
            cur.executemany(
                """INSERT INTO live_values (tag_id, value, last_updated) VALUES (%s, %s, %s)
                   ON DUPLICATE KEY UPDATE value = VALUES(value), last_updated = VALUES(last_updated)""",
                updates,
            )
            print("live_values accumulated: previous value + new imported values")
        else:
            print(
                f"live_values left unchanged ({before_rows} PDF rows were already "
                "present — run remove_oct1415_pdf_data.py first to re-import cleanly)"
            )

        cur.execute(
            f"""SELECT tag_id, rollup_date, value FROM tag_rollup_daily
                WHERE tag_id IN ({placeholders}) AND rollup_date IN ('2026-10-14','2026-10-15')
                ORDER BY rollup_date, tag_id""",
            list(TAG_IDS),
        )
        print("\nAFTER (rebuilt daily rollups):")
        for r in cur.fetchall():
            print(f"  tag {r['tag_id']} {r['rollup_date']} = {r['value']}")

        cur.execute(
            f"SELECT tag_id, value, last_updated FROM live_values WHERE tag_id IN ({placeholders}) ORDER BY tag_id",
            list(TAG_IDS),
        )
        print("\nAFTER (live_values):")
        for r in cur.fetchall():
            print(f"  tag {r['tag_id']} {r['last_updated']} = {r['value']}")


if __name__ == "__main__":
    main()
