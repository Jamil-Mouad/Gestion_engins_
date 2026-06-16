import pytest
from app import create_app


@pytest.fixture(scope='session')
def app():
    """Flask test app. DB_URL env var must point to a real PostgreSQL instance."""
    return create_app({'TESTING': True})


@pytest.fixture()
def client(app):
    return app.test_client()
