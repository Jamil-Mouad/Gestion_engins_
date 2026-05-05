#!/usr/bin/env bash
set -a
source "$(dirname "$0")/.env"
set +a
exec "$(dirname "$0")/mvnw" spring-boot:run -Dspring-boot.run.profiles=local