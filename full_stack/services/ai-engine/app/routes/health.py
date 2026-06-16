import requests
from flask import Blueprint, jsonify
from .. import config
from ..db import get_db

health_bp = Blueprint('health', __name__)


@health_bp.route('/ai/health', methods=['GET'])
def health():
    pgvector_ok = False
    ollama_ok = False
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT '[1]'::vector")
                pgvector_ok = True
    except Exception:
        pass
    try:
        base = config.OLLAMA_BASE_URL.replace('/v1', '')
        r = requests.get(f'{base}/api/tags', timeout=3)
        ollama_ok = r.status_code == 200
    except Exception:
        pass
    status = 'healthy' if (pgvector_ok and ollama_ok) else 'unhealthy'
    return jsonify({'status': status, 'ollama': ollama_ok, 'pgvector': pgvector_ok})
