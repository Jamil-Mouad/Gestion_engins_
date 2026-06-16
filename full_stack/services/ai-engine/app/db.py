import psycopg2
from psycopg2 import pool as pg_pool
from contextlib import contextmanager
from . import config

_pool = None


def get_pool():
    global _pool
    if _pool is None:
        _pool = pg_pool.SimpleConnectionPool(1, 10, config.DB_URL)
    return _pool


@contextmanager
def get_db():
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)
