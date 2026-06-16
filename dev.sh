#!/usr/bin/env bash
# dev.sh — start the full ST3 stack locally
# Usage:  ./dev.sh [--no-db] [--backend-only] [--frontend-only]
#         ./dev.sh stop   — stop a running stack
#
# Services started:
#   PostgreSQL    — via docker-compose (db service only)  unless --no-db
#   gateway-auth  — Spring Boot on 127.0.0.1:8086
#   fleet-core    — Spring Boot on 127.0.0.1:8081
#   magasin       — Spring Boot on 127.0.0.1:8084
#   gateway-proxy — Spring Cloud Gateway on 0.0.0.0:8080
#   frontend      — Angular dev server on 0.0.0.0:4200
#
# Logs:  /tmp/st3-logs/{service}.log
# Stop:  ./dev.sh stop   (PIDs tracked in /tmp/st3-dev.pid)

set -euo pipefail

# ── colours ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
ok()      { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
err()     { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
section() { echo -e "\n${BOLD}──────────────────────────────────────────${RESET}"; echo -e "${BOLD} $*${RESET}"; echo -e "${BOLD}──────────────────────────────────────────${RESET}"; }

# ── paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FULL_STACK="$SCRIPT_DIR/full_stack"
SERVICES="$FULL_STACK/services"
FRONTEND="$FULL_STACK/frontend"
AUTH_DIR="$SERVICES/gateway-auth"
CORE_DIR="$SERVICES/fleet-core"
MAGASIN_DIR="$SERVICES/magasin-service"
PROXY_DIR="$SERVICES/gateway-proxy"
LOG_DIR="/tmp/st3-logs"
ENV_FILE="$AUTH_DIR/.env"

# ── flags ──────────────────────────────────────────────────────────────────────
NO_DB=false
BACKEND_ONLY=false
FRONTEND_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --no-db)         NO_DB=true ;;
    --backend-only)  BACKEND_ONLY=true ;;
    --frontend-only) FRONTEND_ONLY=true ;;
    -h|--help)
      echo "Usage: $0 [--no-db] [--backend-only] [--frontend-only]"
      exit 0 ;;
    *) warn "Unknown flag: $arg" ;;
  esac
done

# ── PID file ───────────────────────────────────────────────────────────────────
PID_FILE="/tmp/st3-dev.pid"

# stop subcommand: read PID file and kill all tracked processes
if [[ "${1:-}" == "stop" ]]; then
  if [[ ! -f "$PID_FILE" ]]; then
    warn "No running stack found (no PID file at $PID_FILE)"
    exit 0
  fi
  section "Stopping all services…"
  while IFS= read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      ok "Stopped PID $pid"
    fi
  done < "$PID_FILE"
  if ! $NO_DB; then
    info "Stopping database container…"
    (cd "$FULL_STACK" && docker compose stop db 2>/dev/null) || true
  fi
  rm -f "$PID_FILE"
  ok "All services stopped."
  exit 0
fi

# ── PID tracking ───────────────────────────────────────────────────────────────
declare -a PIDS=()
rm -f "$PID_FILE"  # clear any stale PID file from a previous run

cleanup() {
  echo ""
  section "Stopping all services…"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && info "Killed PID $pid" || true
    fi
  done
  if ! $NO_DB; then
    info "Stopping database container…"
    (cd "$FULL_STACK" && docker compose stop db 2>/dev/null) || true
  fi
  ok "All services stopped. Logs are in $LOG_DIR/"
}
trap cleanup INT TERM EXIT

# ── helpers ────────────────────────────────────────────────────────────────────
require() {
  command -v "$1" &>/dev/null || { err "Required command not found: $1"; exit 1; }
}

wait_for_port() {
  local host="$1" port="$2" label="$3" timeout="${4:-60}"
  info "Waiting for $label on $host:$port (up to ${timeout}s)…"
  local elapsed=0
  while ! nc -z "$host" "$port" 2>/dev/null; do
    sleep 2; elapsed=$((elapsed + 2))
    if [[ $elapsed -ge $timeout ]]; then
      err "$label did not become reachable on port $port after ${timeout}s"
      err "Check logs: $LOG_DIR/$label.log"
      exit 1
    fi
    echo -n "."
  done
  echo ""
  ok "$label is up on port $port"
}

start_spring() {
  local name="$1" dir="$2"
  shift 2
  local logfile="$LOG_DIR/$name.log"
  info "Starting $name → $logfile"
  # shellcheck disable=SC2068
  (cd "$dir" && exec "$@") >"$logfile" 2>&1 &
  PIDS+=($!)
  echo "$!" >> "$PID_FILE"
  ok "$name started (PID ${PIDS[-1]})"
}

# ── pre-flight checks ──────────────────────────────────────────────────────────
section "Pre-flight checks"

require java
require node
require npm
if ! $NO_DB; then require docker; fi
require nc   # netcat for port-probing

java_ver=$(java -version 2>&1 | head -1)
node_ver=$(node --version)
info "Java:  $java_ver"
info "Node:  $node_ver"

[[ -f "$ENV_FILE" ]] || { err "Missing .env file: $ENV_FILE"; exit 1; }

mkdir -p "$LOG_DIR"
ok "Log directory: $LOG_DIR"

# Source shared environment (DB creds, JWT secret, mail)
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
ok "Loaded env from $ENV_FILE"

# ── database ───────────────────────────────────────────────────────────────────
if ! $NO_DB && ! $FRONTEND_ONLY; then
  section "Database (PostgreSQL 17 + pgvector)"
  info "Starting db container via docker compose…"
  (cd "$FULL_STACK" && docker compose up -d db)
  wait_for_port localhost 5432 "PostgreSQL" 90
fi

# ── backend ────────────────────────────────────────────────────────────────────
if ! $FRONTEND_ONLY; then
  section "Backend services"

  # Local dev convenience: expose Swagger UI + full actuator (off by default in prod)
  export SWAGGER_ENABLED=true
  export MANAGEMENT_ENDPOINTS=health,metrics,prometheus,caches

  # gateway-auth first — its Flyway applies V1–V11 before fleet-core needs them
  start_spring "gateway-auth" "$AUTH_DIR" \
    ./mvnw spring-boot:run -Dspring-boot.run.profiles=local -q
  wait_for_port 127.0.0.1 8086 "gateway-auth" 120

  # fleet-core (no dedicated .env — uses vars sourced above)
  # Flyway applies V101+ only, baselining at V11 on existing DBs
  start_spring "fleet-core" "$CORE_DIR" \
    ./mvnw spring-boot:run -q
  wait_for_port 127.0.0.1 8081 "fleet-core" 120

  # magasin-service (gasoil) — Flyway applies V201+ only, baselining at V11
  start_spring "magasin" "$MAGASIN_DIR" \
    ./mvnw spring-boot:run -q
  wait_for_port 127.0.0.1 8084 "magasin" 120

  # gateway-proxy (needs JWT_SECRET from sourced .env)
  start_spring "gateway-proxy" "$PROXY_DIR" \
    ./mvnw spring-boot:run -q
  wait_for_port 0.0.0.0 8080 "gateway-proxy" 60

  # ai-engine (Flask/gunicorn on 127.0.0.1:8090 — requires Python + packages)
  AI_DIR="$SERVICES/ai-engine"
  if command -v gunicorn &>/dev/null && python3 -c "import flask, psycopg2, pgvector" 2>/dev/null; then
    logfile="$LOG_DIR/ai-engine.log"
    info "Starting ai-engine → $logfile"
    (
      export DB_URL="postgresql://${POSTGRES_USER:-intersig}:${POSTGRES_PASSWORD}@localhost:5432/fleettracker"
      export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://localhost:11434/v1}"
      export OLLAMA_MODEL="${OLLAMA_MODEL:-gemma4:e2b}"
      # multilingual model — fleet data and chat questions are in French;
      # must match config.py's default (English-only bge ruins recall)
      export EMBED_MODEL="${EMBED_MODEL:-sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2}"
      cd "$AI_DIR" && exec gunicorn "app:create_app()" \
        --bind 127.0.0.1:8090 --timeout 120 --workers 1 \
        --log-file "$logfile" --log-level info
    ) >/dev/null 2>&1 &
    PIDS+=($!)
    echo "$!" >> "$PID_FILE"
    ok "ai-engine started (PID ${PIDS[-1]})"
    wait_for_port 127.0.0.1 8090 "ai-engine" 30
  else
    warn "ai-engine skipped — install gunicorn + Python deps: pip3 install -r $AI_DIR/requirements.txt"
  fi
fi

# ── frontend ───────────────────────────────────────────────────────────────────
if ! $BACKEND_ONLY; then
  section "Frontend (Angular)"

  if [[ ! -d "$FRONTEND/node_modules" ]]; then
    info "Installing npm dependencies…"
    (cd "$FRONTEND" && npm install --silent)
    ok "npm install done"
  fi

  logfile="$LOG_DIR/frontend.log"
  info "Starting Angular dev server → $logfile"
  (cd "$FRONTEND" && exec npm start -- --host 0.0.0.0) >"$logfile" 2>&1 &
  PIDS+=($!)
  echo "$!" >> "$PID_FILE"
  ok "Frontend started (PID ${PIDS[-1]})"

  wait_for_port 0.0.0.0 4200 "Angular" 90
fi

# ── ready ──────────────────────────────────────────────────────────────────────
section "Stack is ready"
echo -e ""
echo -e "  ${GREEN}Angular app  ${RESET}→  ${BOLD}http://localhost:4200${RESET}"
echo -e "  ${GREEN}API gateway  ${RESET}→  ${BOLD}http://localhost:8080${RESET}"
echo -e ""
echo -e "  Logs directory: ${BOLD}$LOG_DIR/${RESET}"
echo -e "  Run ${BOLD}./dev.sh stop${RESET} to stop all services."
echo -e ""

# Detach: remove EXIT trap so cleanup() doesn't fire on normal exit,
# then disown all service PIDs so they survive PTY/terminal closure.
trap - EXIT
disown "${PIDS[@]}" 2>/dev/null || true
