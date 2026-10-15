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
# For Aiven: project CA is self-signed, so default is no verification
# unless DB_SSL_VERIFY=true + DB_SSL_CA=/path/to/ca.pem are set.
DB_SSL_VERIFY = os.getenv("DB_SSL_VERIFY", "false").lower() == "true"
DB_SSL_CA = os.getenv("DB_SSL_CA") or None


def get_connection():
    kwargs = {
        "connect_timeout": 10,
        "read_timeout": 30,
        "write_timeout": 30,
    }
    if DB_SSL:
        # Use PyMySQL's ssl_* params (not ssl={"ssl_mode": ...} which is ignored).
        # Setting any ssl_* option forces REQUIRED mode; otherwise PREFERRED (auto-TLS).
        kwargs["ssl_verify_cert"] = DB_SSL_VERIFY
        kwargs["ssl_verify_identity"] = False
        if DB_SSL_CA:
            kwargs["ssl_ca"] = DB_SSL_CA
        elif DB_SSL_VERIFY:
            # VERIFY requested but no CA path -> fail fast with clear message
            raise RuntimeError("DB_SSL_VERIFY=true but DB_SSL_CA is not set")
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        **kwargs,
    )


@contextmanager
def get_cursor():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            yield cursor
    finally:
        conn.close()
