import pytest


def test_vehicule_count(db_connection):
    with db_connection.cursor() as cur:
        cur.execute("SELECT count(*) FROM vehicules")
        count = cur.fetchone()[0]
        assert count == 42, f"Expected 42 vehicules, got {count}"


def test_vehicule_required_fields(db_connection):
    with db_connection.cursor() as cur:
        cur.execute("SELECT code, type, statut FROM vehicules")
        rows = cur.fetchall()
        assert len(rows) > 0, "No vehicules found"
        for code, vtype, statut in rows:
            assert code is not None, f"Vehicle with null code found"
            assert vtype is not None, f"Vehicle {code} has null type"
            assert statut == "in-service", (
                f"Vehicle {code} has statut={statut}, expected 'in-service'"
            )


def test_camions_joined(db_connection):
    with db_connection.cursor() as cur:
        cur.execute("SELECT count(*) FROM camions")
        count = cur.fetchone()[0]
        assert count > 0, "No joined camions found"
