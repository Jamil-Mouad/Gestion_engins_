import pytest


def test_vidanges_count(db_connection):
    with db_connection.cursor() as cur:
        cur.execute("SELECT count(*) FROM suivi_vidanges")
        count = cur.fetchone()[0]
        assert count == 75, f"Expected 75 vidange records, got {count}"


def test_releves_count(db_connection):
    with db_connection.cursor() as cur:
        cur.execute("SELECT count(*) FROM releves_compteur")
        count = cur.fetchone()[0]
        assert count >= 42, f"Expected >= 42 releves_compteur records, got {count}"
