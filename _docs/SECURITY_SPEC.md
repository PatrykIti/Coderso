# Security Spec (v1)

Zakres: podstawowe zabezpieczenia w core. Rozszerzenia przez pluginy.

## Middleware (core)

- Request ID: generowany per request, logowany.
- Rate limiting: per IP dla login i admin API.
- CORS: tylko zaufane originy dla admina.
- CSRF: token dla POST/PUT/DELETE w admin.
- Security headers:
  - Content-Security-Policy (basic)
  - X-Content-Type-Options
  - X-Frame-Options
  - Referrer-Policy
- HTTPS w produkcji (HSTS zalecany).

## Input validation

- JSON schema validation dla payloadow admin API.
- Odrzucenie nadmiarowych pol (strict).

## Internal service layer

- Internal layer nie jest publiczny, ale wciaz wymaga walidacji i RBAC.
- Brak bezposredniego dostepu z zewnatrz.

## File uploads

- Limit size per file.
- Dozwolone MIME types.
- Skanowanie antivirus (opcjonalnie; plugin).

## Secrets

- Nigdy nie logujemy tokenow/hasel.
- ENV tylko po stronie serwera.

## Audit logs (v1.0)

- Logowanie zdarzen admin: login, publish, plugin install, settings update.
- Metadata jest czyszczona z sekretow (token/password/secret).
- `ip` i `userAgent` zapisywane w metadata jesli dostepne.

## Plugin security

- Permissions gate na API core.
- Pluginy nie maja bezposredniego dostepu do DB.

## Operational safety

- Safe mode uruchamia core bez pluginow, aby odzyskac panel admina.
  - Env: `PLUGINS_SAFE_MODE=1`.
- Error boundaries w admin UI izoluje bledy pluginow.
- Auto-disable pluginu po przekroczeniu progu bledow (configurable).
  - Env: `PLUGIN_ERROR_THRESHOLD` (domyslnie 3).
- Watchdog/timeouts dla hookow i renderowania server-side.
  - Env: `PLUGIN_TIMEOUT_MS` (domyslnie 5000ms).
