# Services

## Port Allocations

| Port | Service | Binding | Description |
|------|---------|---------|-------------|
| 8080 | `gateway-proxy` | `0.0.0.0` (public) | Spring Cloud Gateway — JWT validation, RBAC, header injection, reverse proxy |
| 8086 | `gateway-auth` | `127.0.0.1` (internal) | Auth service — login, refresh, password-reset, JWT issuance |
| 8081 | `fleet-core` | `127.0.0.1` (internal) | Fleet management — vehicles, interventions, pneus, KPIs |
| 8082 | `admin` _(future)_ | `127.0.0.1` (internal) | Admin service |
| 8083 | `logistique` _(future)_ | `127.0.0.1` (internal) | Logistics service |
| 8084 | `magasin-service` | `127.0.0.1` (internal) | Magasin — gasoil stock (citerne, arrivages, sorties, jaugeage), fuel KPIs |

## Architecture

```
Angular ──/api/**──► gateway-proxy (8080, public)
                       │  1. Validate JWT (shared APP_JWT_SECRET)
                       │  2. Extract userId + roles from claims
                       │  3. Enforce route-level RBAC
                       │  4. Strip spoofed identity headers
                       │  5. Inject X-Authenticated-User-Id / X-Authenticated-User-Roles
                       ▼
          ┌────────────────┬────────────────┐
          ▼                ▼                ▼
  gateway-auth (8086)  fleet-core (8081)  ...future services
  (internal only)      (internal only)
```

Internal services are unreachable from outside the host. They trust the headers
injected by the proxy and do **not** parse JWTs or hold `APP_JWT_SECRET`.

## Shared Database Migrations

`db/migrations/` (at repo root) contains Flyway migrations V1–V11 used by both
`gateway-auth` and `fleet-core`. Service-specific migrations live in each service's
`src/main/resources/db/migrations/`, each with its own Flyway history table and
version range: fleet-core V101+, magasin-service V201+.

## Adding a New Service

1. Create `full_stack/services/<name>/` as a standalone Spring Boot app.
2. Bind to `127.0.0.1:<port>` only.
3. Add a route to `gateway-proxy/src/main/resources/application.yml`.
4. Trust `X-Authenticated-User-Id` and `X-Authenticated-User-Roles` headers — do not import jjwt.
5. Allocate the next available port from the table above.pwd

