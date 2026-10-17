r"""Print table counts and key data for whatever DB the env vars point at.

Local (uses .env):
    & ".\venv\Scripts\python.exe" check_db.py

Aiven (set in this terminal only, nothing gets written to .env):
    $env:DB_HOST="mysql-xxx.aivencloud.com"
    $env:DB_PORT="11692"
    $env:DB_USER="avnadmin"
    $env:DB_PASSWORD="<aiven password>"
    $env:DB_NAME="powerplus"
    $env:DB_SSL="true"
    & ".\venv\Scripts\python.exe" check_db.py

Get host/port from Aiven console -> your MySQL service -> Overview -> Service URI.
"""
from database import DB_HOST, DB_NAME, get_cursor

with get_cursor() as cur:
    print(f"connected: {DB_HOST}/{DB_NAME}\n")

    for table in ("tag_master", "live_values", "tag_history", "tag_rollup_daily", "tag_rollup_monthly"):
        cur.execute(f"SELECT COUNT(*) AS c FROM `{table}`")
        print(f"{table:<20} {cur.fetchone()['c']:>8} rows")

    print("\ntag_history by month:")
    cur.execute(
        "SELECT YEAR(ts) AS y, MONTH(ts) AS m, COUNT(*) AS c "
        "FROM tag_history GROUP BY y, m ORDER BY y, m"
    )
    for r in cur.fetchall():
        print(f"  {r['y']}-{r['m']:02d}  {r['c']:>6} rows")

    print("\ntag_rollup_daily by source:")
    cur.execute(
        "SELECT source, COUNT(*) AS c, MIN(rollup_date) AS mn, MAX(rollup_date) AS mx "
        "FROM tag_rollup_daily GROUP BY source"
    )
    for r in cur.fetchall():
        print(f"  {r['source']:<10} {r['c']:>5} rows   {r['mn']} .. {r['mx']}")

    print("\nlive_values for 'Cumulative (24 Hours)':")
    cur.execute(
        """SELECT tm.tag_id, tm.tag_name, lv.value, lv.last_updated
           FROM tag_master tm LEFT JOIN live_values lv ON lv.tag_id = tm.tag_id
           WHERE tm.equipment_group = 'Cumulative (24 Hours)'
           ORDER BY tm.display_order"""
    )
    for r in cur.fetchall():
        print(f"  {r['tag_id']:>4}  {r['tag_name']:<22} {r['value']}  @ {r['last_updated']}")
