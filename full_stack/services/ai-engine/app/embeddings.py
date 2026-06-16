from . import config
from .db import get_db

_model = None


def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer  # lazy: ~350MB, only on first request
        _model = SentenceTransformer(config.EMBED_MODEL)
    return _model


def embed(text: str) -> list[float]:
    return get_model().encode(text).tolist()


def embed_str(text: str) -> str:
    """Return embedding as pgvector literal '[0.1,0.2,...]'."""
    vec = embed(text)
    return '[' + ','.join(str(v) for v in vec) + ']'


def search_similar(text: str, k: int = None) -> list[dict]:
    """Return top-k similar passages from ai_embeddings above similarity threshold.

    The synthetic 'fleet_summary' row is excluded — it has no detail page and is
    injected into the chat context unconditionally by get_fleet_summary().
    """
    k = k or config.TOP_K
    emb = embed_str(text)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT source_table, source_id, contenu, "
                "       1 - (embedding <=> %s::vector) AS score "
                "FROM ai_embeddings "
                "WHERE source_table != 'fleet_summary' "
                "  AND 1 - (embedding <=> %s::vector) > %s "
                "ORDER BY embedding <=> %s::vector "
                "LIMIT %s",
                (emb, emb, config.SIMILARITY_THRESHOLD, emb, k)
            )
            rows = cur.fetchall()
    return [
        {'source_table': r[0], 'source_id': r[1], 'contenu': r[2], 'score': float(r[3])}
        for r in rows
    ]


def get_fleet_summary() -> str | None:
    """Return the latest aggregated fleet statistics text (no vector search).

    Always injected into the chat context so dénombrement/aggregate questions
    ("combien de véhicules", "combien de camions"…) are answered with real
    numbers regardless of semantic recall. Populated by the reindex job.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT contenu FROM ai_embeddings "
                "WHERE source_table = 'fleet_summary' "
                "ORDER BY created_at DESC LIMIT 1"
            )
            row = cur.fetchone()
    return row[0] if row else None
