r"""Import DTASET PP2.pdf (Oct 16-17, 15-minute report) into the database.

The PDF is a CrystalEView "15 minutes Report" covering
2026-10-16 22:30 -> 2026-10-17 22:15 with four value columns:
Grid Import kWh, Grid Export kWh, 30MW TG-2 kWh, 30MW TG-1 kWh (tags 116/118/121/120).

Same pattern as reconcile_oct1415_pdf.py:
  - parses the PDF, mapping values by the page-1 header row
  - self-checks parsed values against the PDF's own "Total" row
  - deletes tag_history rows for tags 116/118/120/121 in [2026-10-16 22:30, 2026-10-18)
  - inserts all 83 report rows x 4 values (332 history rows)
  - rebuilds the 2026-10-16/17 daily rollups from history (source='real')
  - rebuilds the whole 2026-10 monthly rollup from ALL October daily rollups
    (covers the Oct 1/2 daily-report import, the Oct 14/15 import and this one)
  - ADDS the imported sums onto the existing live_values (previous + new), so
    the dashboard cards move by exactly the imported totals. Re-runs with the
    PP2 data already present add nothing.

Usage:
    python reconcile_pp2_oct1617.py "C:\path\to\DTASET PP2.pdf"
"""
import re
import sys
from datetime import datetime

import pdfplumber

from database import get_cursor

TAG_IDS = (116, 118, 121, 120)
FROM_TS = "2026-10-16 22:30:00"
UNTIL_TS = "2026-10-18 00:00:00"
EXPECTED_ROWS = 83

# PDF "Total" row per tag (hand-verified), used as a self-check.
EXPECTED_TOTALS = {
    116: 8.0,        # Grid Import kWh
    118: 1005008.0,  # Grid Export kWh
    121: 711560.0,   # 30MW TG-2 kWh
    120: 0.0,        # 30MW TG-1 kWh
}


def normalize(name):
    return re.sub(r"\s+", "", name or "").lower()


def is_blank(cell):
    return cell is None or str(cell).strip() == ""


def parse_pdf(pdf_path, tag_lookup):
    """Returns (history_rows, totals); continuation pages have no header row,
    and both the header and the Total row carry a blank phantom column that
    continuation-page rows don't, so values are always filtered by blankness."""
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
    if len(value_headers) != 4:
        raise SystemExit(f"expected 4 value columns in header, got {len(value_headers)}: {value_headers}")

    tag_ids = []
    for name in value_headers:
        key = normalize(name)
        if key not in tag_lookup:
            raise SystemExit(f"PDF column {name!r} has no matching tag in tag_master")
        tag_ids.append(tag_lookup[key])

    if len(data_rows) != EXPECTED_ROWS:
        raise SystemExit(f"expected {EXPECTED_ROWS} data rows in the report, got {len(data_rows)}")

    history_rows = []
    for row in data_rows:
        values = [str(c).strip() for c in row[2:] if not is_blank(c)]
        if len(values) != 4:
            raise SystemExit(f"row {row[0]} {row[1]} has {len(values)} values, expected 4: {values}")
        date_str, time_str = str(row[0]).strip(), str(row[1]).strip()
        ts = datetime.strptime(f"{date_str} {time_str.split('-')[0].strip()}", "%Y-%m-%d %H:%M")
        for tag_id, raw in zip(tag_ids, values):
            history_rows.append((tag_id, ts, float(raw)))

    if total_row is None:
        raise SystemExit("no 'Total' row found in the PDF")
    total_values = [str(c).strip() for c in total_row[2:] if not is_blank(c)]
    if len(total_values) != 4:
        raise SystemExit(f"Total row has {len(total_values)} values, expected 4")
    totals = {tag_id: float(v) for tag_id, v in zip(tag_ids, total_values)}

    return history_rows, totals


def main():
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else r"c:\Users\Ishan\OneDrive\Random\DTASET PP2.pdf"

    with get_cursor() as cur:
        cur.execute("SELECT tag_id, tag_name FROM tag_master")
        tag_lookup = {normalize(r["tag_name"]): r["tag_id"] for r in cur.fetchall()}

        history_rows, pdf_totals = parse_pdf(pdf_path, tag_lookup)

        sums = {t: 0.0 for t in TAG_IDS}
        for tag_id, _ts, value in history_rows:
            sums[tag_id] += value
        for tag_id in TAG_IDS:
            if abs(sums[tag_id] - pdf_totals[tag_id]) > 0.001:
                raise SystemExit(f"self-check failed: tag {tag_id} sum {sums[tag_id]} != PDF total {pdf_totals[tag_id]}")
            if abs(sums[tag_id] - EXPECTED_TOTALS[tag_id]) > 0.001:
                raise SystemExit(f"self-check failed: tag {tag_id} sum {sums[tag_id]} != expected {EXPECTED_TOTALS[tag_id]}")
        print(f"PDF parsed & verified: {EXPECTED_ROWS} rows x 4 tags = {len(history_rows)} values, totals match")

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
            f"DELETE FROM tag_rollup_daily WHERE tag_id IN ({placeholders}) AND rollup_date IN ('2026-10-16','2026-10-17')",
            list(TAG_IDS),
        )
        print(f"deleted {deleted} old daily rollup rows")

        cur.execute(
            f"""INSERT INTO tag_rollup_daily (tag_id, rollup_date, value, min_value, max_value, avg_value, source)
                SELECT tag_id, DATE(ts), SUM(value), MIN(value), MAX(value), AVG(value), 'real'
                FROM tag_history
                WHERE tag_id IN ({placeholders}) AND DATE(ts) IN ('2026-10-16','2026-10-17')
                GROUP BY tag_id, DATE(ts)""",
            list(TAG_IDS),
        )
        print("rebuilt daily rollups from history")

        deleted = cur.execute("DELETE FROM tag_rollup_monthly WHERE rollup_month = '2026-10-01'")
        cur.execute(
            """INSERT INTO tag_rollup_monthly (tag_id, rollup_month, value, min_value, max_value, avg_value)
               SELECT d.tag_id, DATE_SUB(d.rollup_date, INTERVAL DAYOFMONTH(d.rollup_date) - 1 DAY),
                      CASE WHEN tm.tag_type = 'cumulative' THEN SUM(d.value) ELSE AVG(d.avg_value) END,
                      MIN(d.min_value), MAX(d.max_value), AVG(d.avg_value)
               FROM tag_rollup_daily d
               JOIN tag_master tm ON tm.tag_id = d.tag_id
               WHERE d.rollup_date BETWEEN '2026-10-01' AND '2026-10-31'
               GROUP BY d.tag_id, tm.tag_type, DATE_SUB(d.rollup_date, INTERVAL DAYOFMONTH(d.rollup_date) - 1 DAY)"""
        )
        print(f"rebuilt the 2026-10 monthly rollup from October daily rollups (deleted {deleted} old rows)")

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
                f"live_values left unchanged ({before_rows} PP2 rows were already "
                "present — delete them first to re-import cleanly)"
            )

        cur.execute(
            f"""SELECT tag_id, rollup_date, value FROM tag_rollup_daily
                WHERE tag_id IN ({placeholders}) AND rollup_date IN ('2026-10-16','2026-10-17')
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
