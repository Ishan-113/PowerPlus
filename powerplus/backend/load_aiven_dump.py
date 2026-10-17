"""Load 05_local_dump.sql into Aiven (writes to Aiven only, never touches local DB).
Usage (PowerShell, run from D:\\powerplus-project):
  $env:DB_HOST="mysql-xxx.aivencloud.com"
  $env:DB_PORT="11692"
  $env:DB_USER="avnadmin"
  $env:DB_PASSWORD="<paste-your-aiven-password>"
  $env:DB_NAME="powerplus"
  $env:DB_SSL="true"
  $env:DB_SSL_VERIFY="false"
  & "powerplus/backend/venv/Scripts/python.exe" powerplus/backend/load_aiven_dump.py
"""
import os
from pathlib import Path
import pymysql

DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT", "11692"))
DB_USER = os.getenv("DB_USER", "avnadmin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "powerplus")
DB_SSL = os.getenv("DB_SSL", "true").lower() == "true"
DB_SSL_VERIFY = os.getenv("DB_SSL_VERIFY", "false").lower() == "true"

if not DB_HOST or not DB_PASSWORD:
    raise SystemExit("Set $env:DB_HOST and $env:DB_PASSWORD first (see docstring).")

dump_path = Path(__file__).resolve().parent.parent / "sql" / "05_local_dump.sql"
print(f"Loading {dump_path} -> {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
sql_text = dump_path.read_text(encoding="utf-8")

kwargs = {"connect_timeout": 20, "read_timeout": 60, "write_timeout": 60}
if DB_SSL:
    kwargs["ssl_verify_cert"] = DB_SSL_VERIFY
    kwargs["ssl_verify_identity"] = False

import pymysql.cursors
conn = pymysql.connect(
    host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD,
    database=DB_NAME, autocommit=True,
    cursorclass=pymysql.cursors.DictCursor, **kwargs,
)
try:
    with conn.cursor() as cur:
        # Split on semicolon at end of statement; dump has no procedures/triggers
        # so no semicolons inside values.
        statements = [s.strip() for s in sql_text.split(";\n")]
        statements = [s for s in statements if s and not s.startswith("-- PowerPlus fresh")]
        done = 0
        for stmt in statements:
            # skip pure comment lines
            lines = [l for l in stmt.splitlines() if not l.strip().startswith("--")]
            clean = "\n".join(lines).strip()
            if not clean:
                continue
            cur.execute(clean)
            done += 1
            if done % 500 == 0:
                print(f"... {done} statements done")
        print(f"Done: {done} statements executed.")
        for tbl in ["tag_master", "live_values", "tag_history", "tag_rollup_daily", "tag_rollup_monthly"]:
            try:
                cur.execute(f"SELECT COUNT(*) AS c FROM `{tbl}`")
                print(tbl, cur.fetchone()["c"])
            except Exception as e:
                print(tbl, "check failed:", e)
finally:
    conn.close()
