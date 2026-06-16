import os
import psycopg
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


def get_connection() -> psycopg.Connection:
    url = os.environ["DATABASE_URL"]
    return psycopg.connect(url)
