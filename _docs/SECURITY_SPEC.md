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

## File uploads

- Limit size per file.
- Dozwolone MIME types.
- Skanowanie antivirus (opcjonalnie; plugin).

## Secrets

- Nigdy nie logujemy tokenow/hasel.
- ENV tylko po stronie serwera.

## Audit logs (v1.1)

- Logowanie zdarzen admin: login, publish, plugin install.

## Plugin security

- Permissions gate na API core.
- Pluginy nie maja bezposredniego dostepu do DB.

## Operational safety

- Safe mode uruchamia core bez pluginow, aby odzyskac panel admina.
- Error boundaries w admin UI izoluje bledy pluginow.
