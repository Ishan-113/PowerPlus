"""
Phase 2 — Natural language querying, grounded on the PowerPlus schema.

Flow:
  1. Build a schema description (tables + every real tag_name/group/unit) from the DB
  2. Ask Gemini to translate the question into ONE safe SQL SELECT statement
  3. Validate the SQL is read-only before running it anywhere near the database
  4. Execute it and ask Gemini to summarize the result in plain English

Uses Google's Gemini API (free tier — Flash models). Set GEMINI_API_KEY in .env.
"""
import os
import re

from google import genai
from dotenv import load_dotenv

from database import get_cursor

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.5-flash"

_client = None


def get_client():
    global _client
    if _client is None:
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set in .env")
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


SCHEMA_TABLES = """
TABLES:

live_values(tag_id INT, value DECIMAL, last_updated DATETIME)
  -- current/live reading per tag, one row per tag

tag_history(id BIGINT, tag_id INT, ts DATETIME, value DECIMAL)
  -- every reading logged at 15-minute intervals

tag_rollup_daily(tag_id INT, rollup_date DATE, value DECIMAL, min_value DECIMAL, max_value DECIMAL, avg_value DECIMAL)
  -- one row per tag per day; 'value' is the day's total/end reading for cumulative tags

tag_rollup_monthly(tag_id INT, rollup_month DATE, value DECIMAL, min_value DECIMAL, max_value DECIMAL, avg_value DECIMAL)
  -- one row per tag per month (rollup_month is always the 1st of the month)

tag_master(tag_id INT, tag_name VARCHAR, equipment_group VARCHAR, unit VARCHAR, tag_type ENUM('instant','cumulative'))
  -- lookup table: every tag's name, group, unit and type. ALWAYS JOIN through this to resolve tag names.
"""


def build_schema_context(cur):
    cur.execute("SELECT tag_id, tag_name, equipment_group, unit, tag_type FROM tag_master WHERE is_active = TRUE")
    tags = cur.fetchall()
    tag_lines = "\n".join(
        f"  {t['tag_id']}: {t['tag_name']} | group={t['equipment_group']} | unit={t['unit']} | type={t['tag_type']}"
        for t in tags
    )
    return SCHEMA_TABLES + f"\nKNOWN TAGS (tag_id: tag_name | group | unit | type):\n{tag_lines}\n"


SQL_SYSTEM_PROMPT = """You are a SQL generator for a MySQL 8 industrial energy-monitoring database.
Given a question in plain English, output EXACTLY ONE valid MySQL SELECT statement that answers it.

Rules:
- Output ONLY the raw SQL. No markdown fences, no explanation, no semicolon-separated multiple statements.
- Only ever write SELECT statements. Never write INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE/GRANT.
- Always resolve tag names via a JOIN to tag_master (match tag_name exactly as given in the tag list below).
- For "today", "yesterday", "this month" etc, use MySQL date functions (CURDATE(), DATE_SUB, etc) rather than hardcoding dates unless the user gives an explicit date.
- For questions about totals/consumption per day, prefer tag_rollup_daily. For sub-day trends, use tag_history. For "right now"/"current", use live_values.
- If the question is ambiguous or can't be answered with this schema, output: SELECT 'UNSUPPORTED' AS error;

SCHEMA:
{schema}
"""

SUMMARY_SYSTEM_PROMPT = """You are answering a plant operator's question about their energy monitoring data.
Given the original question, the SQL that was run, and the resulting rows, write a short, direct, plain-English
answer (1-3 sentences). Use the actual numbers from the results. Do not mention SQL or databases in your answer.
If the results are empty, say so plainly and suggest the question might need a different date range or tag name.
"""

FORBIDDEN_PATTERN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|REPLACE|EXEC|CALL)\b",
    re.IGNORECASE,
)


def is_safe_select(sql: str) -> tuple[bool, str]:
    """Returns (is_safe, reason_if_not)."""
    cleaned = sql.strip().rstrip(";").strip()

    if not re.match(r"^\s*SELECT\b", cleaned, re.IGNORECASE):
        return False, "Query must start with SELECT"

    if ";" in cleaned:
        return False, "Multiple statements are not allowed"

    if FORBIDDEN_PATTERN.search(cleaned):
        return False, "Query contains a disallowed keyword"

    return True, ""


def enforce_limit(sql: str, max_rows: int = 500) -> str:
    if re.search(r"\bLIMIT\s+\d+\s*$", sql, re.IGNORECASE):
        return sql
    return f"{sql.rstrip().rstrip(';')} LIMIT {max_rows}"


def generate_sql(question: str, schema_context: str) -> str:
    client = get_client()
    prompt = SQL_SYSTEM_PROMPT.format(schema=schema_context)
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=f"{prompt}\n\nQUESTION: {question}\n\nSQL:",
    )
    sql = response.text.strip()
    # strip markdown fences if the model adds them anyway
    sql = re.sub(r"^```(?:sql)?\s*|\s*```$", "", sql, flags=re.IGNORECASE | re.MULTILINE).strip()
    return sql


def summarize_results(question: str, sql: str, rows: list) -> str:
    client = get_client()
    prompt = (
        f"{SUMMARY_SYSTEM_PROMPT}\n\n"
        f"QUESTION: {question}\n\nSQL RUN: {sql}\n\nRESULTS ({len(rows)} rows): {rows[:50]}\n\nANSWER:"
    )
    response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
    return response.text.strip()


def ask(question: str) -> dict:
    with get_cursor() as cur:
        schema_context = build_schema_context(cur)
        sql = generate_sql(question, schema_context)

        safe, reason = is_safe_select(sql)
        if not safe:
            return {"question": question, "sql": sql, "error": f"Blocked unsafe query: {reason}", "rows": [], "answer": None}

        if "UNSUPPORTED" in sql.upper():
            return {"question": question, "sql": sql, "error": None, "rows": [],
                     "answer": "I couldn't map that question to the available data. Try rephrasing with a specific tag name, date, or time range."}

        try:
            cur.execute(enforce_limit(sql))
            rows = cur.fetchall()
        except Exception as e:
            return {"question": question, "sql": sql, "error": f"SQL execution failed: {e}", "rows": [], "answer": None}

        answer = summarize_results(question, sql, rows)
        return {"question": question, "sql": sql, "error": None, "rows": rows, "answer": answer}
