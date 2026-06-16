# INTERSIG FleetTracker — API Reference

Consolidated catalogue of every HTTP endpoint exposed by the platform.

- **Last updated:** 2026-06-16
- **Public entry point:** all traffic goes through `gateway-proxy` on **`http://<host>:8080`**.
- Downstream services (`gateway-auth`, `fleet-core`, `magasin-service`, `ai-engine`) are **internal only** — they are never exposed directly in production; the gateway is the single public surface.

## Architecture & request flow

```
Angular (nginx :80)
   └─► gateway-proxy :8080  (public; validates JWT, injects identity headers)
         ├─ /api/v1/auth/**      ─► gateway-auth   :8086   (login / JWT issuance)
         ├─ /api/v1/magasin/**   ─► magasin-service:8084   (fuel store)
         ├─ /api/v1/events/**    ─► fleet-core     :8081   (SSE, no buffering)
         ├─ /api/ai/**           ─► ai-engine      :8090   (RAG chat, rewritten to /ai/**)
         └─ /api/v1/**           ─► fleet-core     :8081   (everything else — catch-all)
```

### Gateway routing table (`gateway-proxy/.../application.yml`)

| Order | Path predicate        | Target service   | Notes                                              |
|-------|-----------------------|------------------|----------------------------------------------------|
| 1     | `/api/v1/auth/**`     | gateway-auth     | Login, registration, password reset                |
| 2     | `/api/ai/**`          | ai-engine        | `RewritePath` → `/ai/**`; circuit breaker; 120 s   |
| 3     | `/api/v1/events/**`   | fleet-core       | SSE stream, `Cache-Control: no-store`              |
| 4     | `/api/v1/magasin/**`  | magasin-service  | Fuel store                                         |
| 5     | `/api/v1/**`          | fleet-core       | Catch-all                                          |

## Authentication

1. `POST /api/v1/auth/login` returns a JWT access token (+ refresh token).
2. Clients send `Authorization: Bearer <token>` to the gateway.
3. The gateway validates the JWT and **injects identity headers** into the downstream request:
   - `X-Authenticated-User-Id` — the numeric user id
   - `X-Authenticated-User-Roles` — comma-separated roles (e.g. `ADMIN,FLEET_MANAGER`)
4. Downstream services **trust** these headers and do not parse JWTs themselves. Each maps a `@CurrentUserId` argument from `X-Authenticated-User-Id`. Roles become `ROLE_*` authorities.

Magasin endpoints additionally require role `MAGASIN` or `FLEET_MANAGER` (enforced in the gateway/route guard).

---

## gateway-auth — `:8086`

**Base `/api/v1/auth`** (`AuthController`)

| Method | Path                 | Description                          |
|--------|----------------------|--------------------------------------|
| POST   | `/register`          | Create a user account                |
| POST   | `/login`             | Authenticate, returns access+refresh |
| POST   | `/refresh`           | Exchange refresh token for new access|
| POST   | `/logout`            | Invalidate refresh token             |
| GET    | `/me`                | Current authenticated user           |
| PUT    | `/me/password`       | Change own password                  |

**Base `/api/v1/auth/password-reset`** (`PasswordResetController`)

| Method | Path        | Description                              |
|--------|-------------|------------------------------------------|
| POST   | `/request`  | Request a reset OTP (email)              |
| POST   | `/verify`   | Verify the OTP code                      |
| POST   | `/confirm`  | Set the new password after verification  |

---

## fleet-core — `:8081`

### Vehicles — `/api/v1/vehicules` (`VehiculeController`)
| Method | Path                | Description                |
|--------|---------------------|----------------------------|
| GET    | `/`                 | List / filter vehicles     |
| GET    | `/{id}`             | Vehicle detail             |
| POST   | `/`                 | Create vehicle             |
| PUT    | `/{id}`             | Update vehicle             |
| PATCH  | `/{id}/statut`      | Change status              |
| DELETE | `/{id}`             | Soft-delete                |
| GET    | `/{id}/fiche.pdf`   | Vehicle data sheet (PDF)   |

### Tires — `/api/v1` (`PneuController`) — *per-vehicle; the global tire-list page was removed*
| Method | Path                          | Description                       |
|--------|-------------------------------|-----------------------------------|
| POST   | `/vehicules/{id}/pneus`       | Assign a tire to a vehicle        |
| GET    | `/vehicules/{id}/pneus`       | List a vehicle's tires            |
| GET    | `/pneus/available`            | Tires available for remounting    |
| GET    | `/pneus/{id}`                 | Tire detail                       |
| PATCH  | `/pneus/{id}`                 | Update tire                       |
| PATCH  | `/pneus/{id}/permuter`        | Swap two tire positions           |
| PATCH  | `/pneus/{id}/remplacer`       | Replace tire                      |
| PATCH  | `/pneus/{id}/remonter`        | Remount a soft-deleted tire       |
| DELETE | `/pneus/{id}`                 | Soft-delete tire                  |
| GET    | `/pneus/{id}/fiche.pdf`       | Tire data sheet (PDF)             |
| GET    | `/pneus/alertes`              | Tires in warning/empty state (KPI)|
| GET    | `/pneus/{id}/inspections`     | Inspection history (paged)        |
| POST   | `/pneus/{id}/inspections`     | Log an inspection                 |
| GET    | `/pneus/{id}/activity-log`    | Tire activity timeline            |

### Components — `/api/v1/composants` (`ComposantController`)
| Method | Path               | Description                  |
|--------|--------------------|------------------------------|
| GET    | `/tree`            | Component tree               |
| GET    | `/search`          | Search components            |
| GET    | `/categories`      | Categories                   |
| GET    | `/{id}`            | Component detail             |
| POST   | `/`                | Create                       |
| PUT    | `/{id}`            | Update                       |
| DELETE | `/{id}`            | Delete                       |
| GET    | `/{id}/fiche.pdf`  | Component data sheet (PDF)   |

### Interventions — `/api/v1` (`InterventionController`)
| Method | Path                              | Description                |
|--------|-----------------------------------|----------------------------|
| GET    | `/interventions`                  | List / filter              |
| POST   | `/interventions`                  | Create                     |
| GET    | `/interventions/{id}`             | Detail                     |
| PUT    | `/interventions/{id}`             | Update                     |
| PATCH  | `/interventions/{id}/cloturer`    | Close                      |
| GET    | `/interventions/types`            | Intervention types         |
| GET    | `/interventions/en-cours`         | Open interventions         |
| GET    | `/interventions/recentes`         | Recent interventions       |
| GET    | `/vehicules/{id}/interventions`   | Per-vehicle interventions  |

### Purchase requests — `/api/v1/demandes-achat` (`DemandeAchatController`)
| Method | Path                  | Description       |
|--------|-----------------------|-------------------|
| GET    | `/`                   | List              |
| POST   | `/`                   | Create            |
| GET    | `/{id}`               | Detail            |
| PATCH  | `/{id}/approuver`     | Approve           |
| PATCH  | `/{id}/rejeter`       | Reject            |
| PATCH  | `/{id}/cloturer`      | Close             |

### Attelages (tractor↔trailer) — `/api/v1/attelages` (`AttelageController`)
| Method | Path               | Description           |
|--------|--------------------|-----------------------|
| GET    | `/`                | List couplings        |
| POST   | `/`                | Create coupling       |
| PATCH  | `/{id}/terminer`   | End coupling          |
| DELETE | `/{id}`            | Delete                |

### KPIs & dashboard — `/api/v1` (`KpiController`)
| Method | Path                                   | Description                  |
|--------|----------------------------------------|------------------------------|
| GET    | `/kpis`                                | Headline KPIs                |
| GET    | `/kpis/disponibilite/timeseries`       | Availability time series     |
| GET    | `/kpis/couts/breakdown`                | Cost breakdown               |
| GET    | `/kpis/cost-history`                   | Cost history                 |
| GET    | `/kpis/interventions-by-status`        | Interventions by status      |
| GET    | `/vehicules/{id}/kpis`                 | Per-vehicle KPIs             |
| GET    | `/dashboard/snapshot`                  | Dashboard KPI snapshot       |

### Notifications — `/api/v1/notifications` (`NotificationController`)
| Method | Path                  | Description                    |
|--------|-----------------------|--------------------------------|
| GET    | `/`                   | List                           |
| GET    | `/non-lues/count`     | Unread count                   |
| GET    | `/critiques`          | Critical notifications         |
| PATCH  | `/{id}/marquer-lue`   | Mark one read                  |
| PATCH  | `/lire-tout`          | Mark all read                  |
| GET    | `/config`             | Notification preferences       |
| PUT    | `/config`             | Update preferences             |

### User profile — `/api/v1/users` (`UserProfileController`)
| Method | Path                              | Description                              |
|--------|-----------------------------------|------------------------------------------|
| GET    | `/me`                             | Current profile                          |
| PUT    | `/me`                             | Update profile (prénom/nom/téléphone)    |
| PATCH  | `/me`                             | Update profile (used by the SPA)         |
| GET    | `/me/dashboard-config`            | Saved dashboard layout (jsonb)           |
| PUT    | `/me/dashboard-config`            | Save dashboard layout                    |
| GET    | `/me/preferences-notifications`   | Notification prefs (jsonb)               |
| PUT    | `/me/preferences-notifications`   | Save notification prefs                  |

### Import / export — `/api/v1` (`ImportController`, `ExportController`)
| Method | Path                          | Description                       |
|--------|-------------------------------|-----------------------------------|
| POST   | `/import/excel`               | Upload Excel for import (preview) |
| GET    | `/import/excel/fields`        | Mappable fields for an entity     |
| POST   | `/import/releves-compteurs`   | Import odometer readings          |
| GET    | `/import/historique`          | Import history (paged)            |
| GET    | `/export/excel`               | Export data to Excel              |

### Files — `/api/v1/files` (`FileController`)
Upload (`POST`) and fetch (`GET /{filename}`, public read) for `vehicule-photos`, `pneu-photos`, `composant-photos`, `intervention-photos`, `demande-photos`.

### Activity table & realtime
| Method | Path                       | Service / notes                       |
|--------|----------------------------|---------------------------------------|
| GET    | `/api/v1/tableau-journees` | `TableauJourneesController` — daily activity table |
| GET    | `/api/v1/events/stream`    | `SseController` — Server-Sent Events (routed without buffering) |

> Removed in the 2026-06-16 cleanup: `GET /api/v1/historique`, `GET/POST /api/v1/releves-compteur`, `GET /api/v1/vidanges`, `GET /api/v1/vidanges/planning`, `GET /api/v1/vehicules/{id}/vidanges`, `PATCH /api/v1/vidanges/{id}/cloturer`, and the global `GET /api/v1/pneus`.

---

## magasin-service — `:8084` (base `/api/v1/magasin`)

### Tank — `CiterneController`
| Method | Path                    | Description                          |
|--------|-------------------------|--------------------------------------|
| GET    | `/citerne`              | Tank state (stock, capacity, %)      |
| PUT    | `/citerne`              | Update tank config                   |
| GET    | `/citerne/bareme`       | Gauge→volume barème                  |
| PUT    | `/citerne/bareme`       | Update barème                        |
| GET    | `/citerne/conversion`   | Height→litres conversion             |

### Fuel-outs — `SortieController`
| Method | Path                          | Description                       |
|--------|-------------------------------|-----------------------------------|
| GET    | `/sorties`                    | List fuel withdrawals             |
| GET    | `/sorties/last-totaliseur`    | Last pump totalizer reading       |
| POST   | `/sorties`                    | Record a withdrawal               |
| PUT    | `/sorties/{id}`               | Update                            |
| DELETE | `/sorties/{id}`               | Delete                            |
| GET    | `/vehicules/suggest`          | Vehicle autocomplete              |
| GET    | `/destinations/suggest`       | Destination autocomplete          |

### Deliveries — `ArrivageController` (`/arrivages`)
| Method | Path        | Description          |
|--------|-------------|----------------------|
| GET    | `/`         | List deliveries      |
| POST   | `/`         | Record a delivery    |
| PUT    | `/{id}`     | Update               |
| DELETE | `/{id}`     | Delete               |

### Gaugings — `JaugeageController` (`/jaugeages`)
| Method | Path        | Description       |
|--------|-------------|-------------------|
| GET    | `/`         | List gaugings     |
| POST   | `/`         | Record a gauging  |
| DELETE | `/{id}`     | Delete            |

### Magasin KPIs / import / export
| Method | Path                          | Controller                |
|--------|-------------------------------|---------------------------|
| GET    | `/kpis/dashboard`             | `KpiMagasinController`     |
| GET    | `/kpis/vehicule`              | `KpiMagasinController`     |
| POST   | `/import/gasoil`              | `ImportGasoilController`   |
| GET    | `/export/excel`               | `ExportMagasinController`  |

---

## ai-engine — `:8090` (Flask, routed via `/api/ai/**` → `/ai/**`)

| Method | Path (`/ai/…`)                          | Description                                                        |
|--------|-----------------------------------------|--------------------------------------------------------------------|
| GET    | `/ai/health`                            | Health (pgvector + ollama availability)                            |
| POST   | `/ai/chat`                              | **SSE** streaming RAG chat. Requires `X-Authenticated-User-Id`; optional `conversation_id`. Streams `{type: text\|source\|error\|done}` chunks; sets `X-Conversation-Id`, `X-Accel-Buffering: no`. |
| GET    | `/ai/conversations`                     | List the user's conversations (paged)                              |
| POST   | `/ai/conversations`                     | Create a conversation                                              |
| GET    | `/ai/conversations/{id}/messages`       | Conversation messages                                              |
| DELETE | `/ai/conversations/{id}`                | Delete a conversation                                              |
| PATCH  | `/ai/conversations/{id}/pin`            | Toggle favourite/pin                                               |
| POST   | `/ai/embeddings/reindex`                | Rebuild the RAG embedding index (requires `ROLE_FLEET_MANAGER` or `ROLE_ADMIN`). Indexes interventions, pneu inspections, composants, vidanges, vehicles, fleet summary. |

The ai-engine is the only service without springdoc; its surface is documented here by hand.

---

## Interactive docs (Swagger UI / OpenAPI)

springdoc is wired into the three Spring MVC services (`gateway-auth`, `fleet-core`, `magasin-service`) but **disabled by default** for security. Enable per service with environment variables:

```
SWAGGER_ENABLED=true
MANAGEMENT_ENDPOINTS=health,metrics,prometheus   # optional, widens actuator
```

`dev.sh` sets `SWAGGER_ENABLED=true` automatically for local development. When enabled, each service serves:

- Swagger UI: `http://<service-host>:<port>/swagger-ui/index.html`
- OpenAPI JSON: `http://<service-host>:<port>/v3/api-docs`

These live on the **internal** service ports and are intentionally **not** proxied through the public gateway. To browse them, port-forward the service (or hit it on the Docker network).

`gateway-proxy` is a pure reverse proxy and exposes no OpenAPI document of its own.

### Exporting static OpenAPI documents

With the stack running and `SWAGGER_ENABLED=true`, regenerate the static specs:

```bash
./docs/api/export-openapi.sh        # writes docs/api/openapi-<service>.json
```
