#!/usr/bin/env bash
# Export static OpenAPI documents for the Spring services into docs/api/.
#
# Requires the services running with SWAGGER_ENABLED=true (dev.sh does this).
# Override the base URLs via env vars if your ports differ.
#
#   ./docs/api/export-openapi.sh
#
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")" && pwd)"

declare -A SERVICES=(
  [gateway-auth]="${GATEWAY_AUTH_URL:-http://127.0.0.1:8086}"
  [fleet-core]="${FLEET_CORE_URL:-http://127.0.0.1:8081}"
  [magasin]="${MAGASIN_URL:-http://127.0.0.1:8084}"
)

for name in "${!SERVICES[@]}"; do
  url="${SERVICES[$name]}/v3/api-docs"
  dest="$OUT_DIR/openapi-$name.json"
  echo "→ $name: $url"
  if curl -fsS "$url" -o "$dest"; then
    echo "  saved $dest"
  else
    echo "  FAILED (is $name running with SWAGGER_ENABLED=true?)" >&2
  fi
done

echo "Done. (ai-engine has no OpenAPI document — see docs/api/README.md.)"
