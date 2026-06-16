import os
import pytest
import psycopg
from urllib.parse import urlparse


@pytest.fixture(scope="module")
def db_connection():
    raw = os.environ.get('POSTGRES_URL', 'localhost:5432/fleettracker')
    # Accept both bare "host:port/dbname" and full "jdbc:postgresql://host:port/dbname"
    if '://' not in raw:
        raw = f'postgres://{raw}'
    elif raw.startswith('jdbc:'):
        raw = raw[len('jdbc:'):]
    parsed = urlparse(raw)
    conn = psycopg.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        dbname=parsed.path.lstrip('/'),
        user=os.environ.get('POSTGRES_USER', 'intersig'),
        password=os.environ.get('POSTGRES_PASSWORD', 'intersig_dev'),
    )
    yield conn
    conn.close()
