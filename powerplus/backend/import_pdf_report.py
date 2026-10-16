"""
Import real CrystalEView Report PDF exports into the PowerPlus database.

Handles both:
  - Daily Report exports  (one row per day, time shown as "00:00 - 00:00")
    -> written into tag_rollup_daily
  - 15-Minute Report exports (one row per 15-min interval)
    -> written into tag_history

Usage:
    python import_pdf_report.py "C:\\path\\to\\Report.pdf"

Requires: pip install pdfplumber
"""
import re
import sys
from datetime import datetime

import pdfplumber

from database import get_cursor


def normalize(name: str) -> str:
    """Collapse whitespace/newlines so header text lines up with tag_master.tag_name
    regardless of PDF line-wrapping or inconsistent spacing (e.g. 'Fur-2\\nkWh' vs 'Fur-2 kWh')."""
    return re.sub(r"\s+", "", name or "").lower()


def load_tag_lookup(cur):
    cur.execute("SELECT tag_id, tag_name FROM tag_master")
    lookup = {}
    for row in cur.fetchall():
        lookup[normalize(row["tag_name"])] = (row["tag_id"], row["tag_name"])
    return lookup


def extract_rows(pdf_path):
    """Yields (header_cells, row_cells) for every data row found across all pages,
    skipping metadata lines and 'Total' summary rows."""
    header = None
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for row in table:
                    if row and row[0] == "Sync Date":
                        header = row
                        continue
                    if header is None:
                        continue  # metadata rows before the header
                    if row and row[0] == "Total":
                        continue  # skip summary row
                    if row and row[0]:
                        yield header, row


def parse_timestamp(date_str, time_str):
    """
    date_str: '2026-07-05'
    time_str: '00:00 - 00:00' (daily) or '11:15 - 11:30' (15-min interval)
    Returns (datetime, is_daily)
    """
    start_time = time_str.split('-')[0].strip()
    dt = datetime.strptime(f"{date_str} {start_time}", "%Y-%m-%d %H:%M")
    is_daily = time_str.strip() == "00:00 - 00:00"
    return dt, is_daily


def main():
    if len(sys.argv) < 2:
        print("Usage: python import_pdf_report.py <path_to_report.pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]

    with get_cursor() as cur:
        tag_lookup = load_tag_lookup(cur)

        daily_rows = []   # (tag_id, date, value)
        history_rows = [] # (tag_id, ts, value)
        unmatched = set()

        for header, row in extract_rows(pdf_path):
            date_str, time_str = row[0], row[1]
            ts, is_daily = parse_timestamp(date_str, time_str)

            # Align by position ignoring wrapped/empty cells: continuation pages
            # (no header row) can be one cell shorter than the header when a
            # wrapped header cell collapses. Pairwise zip would silently shift
            # every value into the wrong tag, so require equal counts instead.
            value_headers = [h for h in header[2:] if h is not None]
            value_cells = [c for c in list(row[2:]) if c is not None]
            if len(value_cells) != len(value_headers):
                unmatched.add(
                    f"column-count mismatch {date_str} {time_str} "
                    f"({len(value_cells)} cells vs {len(value_headers)} tags) — row skipped"
                )
                continue

            for col_name, value in zip(value_headers, value_cells):
                key = normalize(col_name)
                if key not in tag_lookup:
                    unmatched.add(col_name.replace("\n", " "))
                    continue

                tag_id, _ = tag_lookup[key]
                try:
                    numeric_value = float(value)
                except ValueError:
                    continue

                if is_daily:
                    daily_rows.append((tag_id, ts.date(), numeric_value))
                else:
                    history_rows.append((tag_id, ts, numeric_value))

        if daily_rows:
            cur.executemany(
                """INSERT INTO tag_rollup_daily (tag_id, rollup_date, value, min_value, max_value, avg_value, source)
                   VALUES (%s, %s, %s, %s, %s, %s, 'real')
                   ON DUPLICATE KEY UPDATE
                     value = VALUES(value), min_value = VALUES(min_value),
                     max_value = VALUES(max_value), avg_value = VALUES(avg_value),
                     source = 'real'""",
                [(tag_id, d, v, v, v, v) for tag_id, d, v in daily_rows],
            )
            print(f"Inserted/updated {len(daily_rows)} daily rollup rows (marked as real).")

        if history_rows:
            cur.executemany(
                """INSERT INTO tag_history (tag_id, ts, value) VALUES (%s, %s, %s)""",
                history_rows,
            )
            print(f"Inserted {len(history_rows)} 15-minute history rows.")

        if not daily_rows and not history_rows:
            print("No matching data rows found — check the PDF format hasn't changed.")

        if unmatched:
            print(f"\n{len(unmatched)} column(s) in the PDF had no matching tag in tag_master:")
            for name in sorted(unmatched):
                print(f"  - {name}")
            print("Add these to sql/03_seed_consumption_tags.sql (or a new seed file) if they matter.")


if __name__ == "__main__":
    main()