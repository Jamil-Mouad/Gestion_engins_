CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_embeddings (
    id           BIGSERIAL    PRIMARY KEY,
    source_table VARCHAR(50)  NOT NULL,
    source_id    BIGINT       NOT NULL,
    contenu      TEXT         NOT NULL,
    embedding    vector(384)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (source_table, source_id)
);

CREATE INDEX idx_ai_emb_vector ON ai_embeddings USING ivfflat (embedding vector_cosine_ops);
