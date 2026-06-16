import os

DB_URL = os.getenv('DB_URL', 'postgresql://intersig:intersig_dev@localhost:5432/fleettracker')
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434/v1')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'gemma4:e2b')
# Multilingual model (384-dim, matches ai_embeddings.vector(384)) — the fleet
# data and user questions are in French, so an English-only model gives poor
# retrieval recall.
EMBED_MODEL = os.getenv('EMBED_MODEL', 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
SIMILARITY_THRESHOLD = float(os.getenv('SIMILARITY_THRESHOLD', '0.3'))
TOP_K = int(os.getenv('TOP_K', '8'))
