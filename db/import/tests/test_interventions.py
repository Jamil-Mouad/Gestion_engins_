import pytest


def test_intervention_count(db_connection):
    with db_connection.cursor() as cur:
        cur.execute("SELECT count(*) FROM interventions")
        count = cur.fetchone()[0]
        assert count >= 900, f"Expected >= 900 interventions, got {count}"


def test_intervention_types_seeded(db_connection):
    with db_connection.cursor() as cur:
        cur.execute("SELECT count(*) FROM types_intervention")
        count = cur.fetchone()[0]
        assert count == 16, f"Expected 16 intervention types, got {count}"


def test_composants_seeded(db_connection):
    with db_connection.cursor() as cur:
        cur.execute("SELECT count(*) FROM composants WHERE parent_id IS NULL")
        count = cur.fetchone()[0]
        assert count == 7, f"Expected 7 root composants, got {count}"
