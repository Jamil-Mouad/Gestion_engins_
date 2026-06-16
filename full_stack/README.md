# INTERSIG FleetTracker — Full Stack

Angular frontend + Spring services (gateway-proxy, gateway-auth, fleet-core, magasin-service)
+ Flask ai-engine (RAG chat) + PostgreSQL/pgvector + Ollama.

For the complete endpoint catalogue see [`../docs/api/README.md`](../docs/api/README.md).

## Deliver with Docker (one command)

Everything is containerised. From this `full_stack/` directory:

```bash
cp .env.example .env          # then edit .env and set real secrets
docker compose up --build
```

Then open **http://localhost** (the frontend nginx, port 80).

### What comes up

| Service           | In-cluster address        | Published port | Role                                   |
|-------------------|---------------------------|----------------|----------------------------------------|
| `frontend`        | nginx :80                 | **80**         | Angular SPA + reverse proxy to gateway |
| `gateway-proxy`   | :8080                     | **8080**       | Public API gateway (JWT validation)    |
| `gateway-auth`    | :8086                     | internal       | Auth / JWT issuance                    |
| `fleet-core`      | :8081                     | internal       | Fleet management                       |
| `magasin-service` | :8084                     | internal       | Fuel store                             |
| `ai-engine`       | :8090                     | internal       | RAG chat (Flask)                       |
| `ollama`          | :11434                    | internal       | LLM runtime                            |
| `db`              | :5432                     | internal       | PostgreSQL 17 + pgvector               |

Only `frontend` (80) and `gateway-proxy` (8080) are reachable from the host; every
other service is internal to the compose network.

### Required configuration (`.env`)

| Variable             | Required | Notes                                              |
|----------------------|----------|----------------------------------------------------|
| `POSTGRES_PASSWORD`  | yes      | Database password                                  |
| `JWT_SECRET`         | yes      | ≥ 64-byte base64 secret (only gateway-proxy/auth)  |
| `MAIL_*`             | for OTP  | Needed for password-reset emails                   |
| `POSTGRES_USER`      | no       | Defaults to `intersig`                             |
| `OLLAMA_MODEL`       | no       | Defaults to `gemma4:e2b`                            |
| `EMBED_MODEL`        | no       | Defaults to the multilingual MiniLM model (French) |
| `FRONTEND_PORT`      | no       | Host port for the SPA (default `80`)               |

### First-run notes

- **Model download:** `ollama-init` pulls `OLLAMA_MODEL` into the `ollama_models`
  volume on first start (a one-time multi-GB download). `ai-engine` waits for it to
  finish. Subsequent starts are instant.
- **RAG index:** after the stack is healthy, build the embedding index by calling
  `POST /api/ai/embeddings/reindex` (requires a `FLEET_MANAGER`/`ADMIN` token).
- **Database schema:** the shared migrations (`../db/migrations`, V1–V11) are applied
  once when the `db` volume is first created; each service then applies its own
  migrations (fleet-core V101+, magasin V201+) and baselines the shared set.
- **Reset everything:** `docker compose down -v` (the `-v` also drops the database
  and downloaded model volumes).

### Enabling Swagger UI

The Spring services ship springdoc but keep it disabled. Add `SWAGGER_ENABLED=true`
to `.env` (and rebuild/restart) to expose `…/swagger-ui/index.html` and `…/v3/api-docs`
on each service's internal port. See [`../docs/api/README.md`](../docs/api/README.md).

## Local development (without Docker)

Use `../dev.sh` — it starts the Postgres container, the four Spring services
(with Swagger enabled), the Flask ai-engine, and the Angular dev server. See the
script header for flags (`--no-db`, `--backend-only`, `--frontend-only`, `stop`).
