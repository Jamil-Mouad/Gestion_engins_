# Security review — INTERSIG FleetTracker

Date: 2026-06-15. Scope: `gateway-proxy`, `gateway-auth`, `fleet-core`, Angular
frontend. Legend: **[fixed]** applied in this branch · **[manual]** requires an
operator action · **[recommended]** deliberately not auto-applied (would risk
breaking running behaviour — see note).

## Critical

### C1. Secrets committed to the repo — **[manual]**
`full_stack/services/gateway-auth/.env` contains a real `JWT_SECRET` and a Gmail
`MAIL_PASSWORD` in plaintext. Anyone with repo access can forge tokens for every
account and use the mailbox.
- Rotate the JWT secret and the Gmail app password now.
- Remove `.env` from git history (`git filter-repo` / BFG) and confirm `.env` is
  git-ignored (it is, but the file was already committed).
- After rotating the JWT secret, all existing tokens are invalidated (expected).

### C2. Tokens in plaintext `localStorage` — **[fixed]** (mitigated)
`access_token`, `refresh_token`, and `auth.user` were readable by any script.
A full fix is httpOnly cookies; the chosen, lower-risk mitigation:
- Non-"remember me" logins already use `sessionStorage` (cleared on tab close);
  this is now the default path.
- A strict `Content-Security-Policy` (see C3) restricts `script-src` to `'self'`,
  which is the practical defense against token theft via injected script.
- The chatbot markdown renderer now runs through DOMPurify (see H1).
- Note: client-side "hashing/encryption" of tokens was intentionally **not**
  added — the key would have to live in the same JS context, so it provides no
  real protection (security theater).

## High

### H1. XSS via `[innerHTML]` in the chat bubble — **[fixed]**
`features/chatbot/message-bubble.component.ts` binds rendered markdown to
`[innerHTML]`. Output is HTML-escaped first and now additionally sanitized with
DOMPurify (allowlist: `strong, em, ul, li, br`, no attributes).

### H2. Missing browser security headers / CSP — **[fixed]**
- `index.html` now ships a `Content-Security-Policy` meta
  (`default-src 'self'`, `script-src 'self'`, fonts allowed for Google Fonts,
  `object-src 'none'`, `base-uri 'self'`).
- `gateway-proxy` now adds `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and
  `Strict-Transport-Security` to every response
  (`SecurityHeadersFilter`).

### H3. Actuator metrics/prometheus/caches exposed — **[fixed]**
`fleet-core` and `gateway-proxy` exposed `metrics,prometheus,caches`. Exposure
is now `${MANAGEMENT_ENDPOINTS:health}` (health only by default). `dev.sh`
re-enables the full set locally.

### H4. Swagger / OpenAPI public — **[fixed]**
`springdoc.swagger-ui.enabled` / `api-docs.enabled` now default to
`${SWAGGER_ENABLED:false}` in `fleet-core` and `gateway-auth`. `dev.sh` exports
`SWAGGER_ENABLED=true` so local dev is unchanged; production is off by default.

### H5. No role enforcement on mutating endpoints — **[recommended]**
Controllers authenticate (gateway JWT + `X-Authenticated-User-*` headers) but do
not authorize by role; any authenticated user can mutate vehicles/tires/files.
Not auto-fixed because role data is currently unreliable (the seeded admin
presents role `USER`), so adding `@PreAuthorize("hasRole('ADMIN')")` would lock
out legitimate users. To enforce safely: normalize roles at issuance, add
`@EnableMethodSecurity`, then annotate mutations, e.g.
`@PreAuthorize("hasAnyRole('ADMIN','FLEET_MANAGER')")`. Roles already arrive as
`ROLE_<role>` authorities (`GatewayHeaderAuthFilter`).

## Medium

### M1. SSRF on fiche-photo fetch — **[fixed]** (was already hardened; kept)
`FichePhotoLoader` (shared by pneu/composant/vehicule fiches) resolves the host,
rejects loopback/link-local/private/ULA addresses, pins the connection to the
validated addresses (DNS-rebinding TOCTOU defense), disables redirects, and caps
the body at 5 MB. Internal `/api/v1/files/...` URLs bypass the network entirely
and are read from local storage.

### M2. Stricter `photoUrl` input validation — **[recommended]**
The fetch-time SSRF guard (M1) is the real defense. As defense-in-depth, reject
unexpected `photoUrl`/`imageUrl` shapes at write time (allow only internal
`/api/v1/files/...` or `https://`) in the pneu/composant/vehicule update DTOs.

### M3. Dynamic SQL assembly in `HistoriqueService` — **[recommended]**
The WHERE clause is concatenated but all values are bound parameters (no
injection today). Prefer the JPA Criteria API if this grows.

### M4. Local DB / mail credentials in `application-local.yml` — **[manual]**
Keep them out of any non-local deployment; ensure the `local` profile cannot be
activated in production.

## Low

- **L1 [recommended]** Rotate refresh tokens on `/auth/refresh` (currently only
  the access token is reissued).
- **L2 [recommended]** Rate-limit password-reset verify per email (login is
  already rate-limited).
- **L3** Immutable `Cache-Control` on `/api/v1/files/**` is correct (UUID names).

## Applied changes in this branch
- `index.html`: CSP meta.
- `gateway-proxy`: `SecurityHeadersFilter`.
- `fleet-core` + `gateway-proxy` + `gateway-auth`: actuator + Swagger gated by
  env vars (`MANAGEMENT_ENDPOINTS`, `SWAGGER_ENABLED`).
- `dev.sh`: enables Swagger + full actuator locally.
- `message-bubble.component.ts`: DOMPurify sanitization.
- `FichePhotoLoader`: consolidated, SSRF-hardened photo loading.
