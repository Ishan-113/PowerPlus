"""
MySQL connection helper.
Reads connection settings from environment variables (see .env.example).
Supports SSL for cloud-hosted MySQL (e.g. Aiven).
"""
import os
import pymysql
import pymysql.cursors
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "powerplus")
DB_SSL = os.getenv("DB_SSL", "false").lower() == "true"


def get_connection():
    ssl = {"ssl": {"ssl_mode": "REQUIRED"}} if DB_SSL else {}
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        **ssl,
    )


@contextmanager
def get_cursor():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            yield cursor
    finally:
        conn.close()
