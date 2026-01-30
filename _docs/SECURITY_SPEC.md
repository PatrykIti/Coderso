# Security Spec (v1)

Zakres: podstawowe zabezpieczenia w core. Rozszerzenia przez pluginy.

## Middleware (core)

- Request ID: generowany per request, logowany.
- Rate limiting: per IP dla login i admin API.
- CORS: tylko zaufane originy dla admina.
- CSRF: token dla POST/PUT/DELETE w admin.
  - Token pobierany z `GET /admin/api/auth/csrf`.
  - UI dodaje `X-CSRF-Token` do mutacji.
- Security headers:
  - Content-Security-Policy (basic)
  - X-Content-Type-Options
  - X-Frame-Options
  - Referrer-Policy
- HTTPS w produkcji (HSTS zalecany).

### Konfiguracja runtime (Admin UI)

- Wszystkie ustawienia middleware sa trzymane w DB (`settings.key = security.settings`).
- Zmiany wchodza w zycie bez restartu (runtime config).
- Zakres konfigurowalny z panelu:
  - requestId (enabled, headerName)
  - csrf (enabled, headerName, tokenTtlMinutes)
  - cors (allowedOrigins, allowCredentials, allowedMethods, allowedHeaders, maxAgeSeconds)
  - rateLimit (enabled, admin/auth limits)
  - headers (frameOptions, referrerPolicy, CSP, HSTS, itd.)
  - validation (rejectUnknownFields)

Uwaga: header CSRF jest weryfikowany na podstawie tokenu z prefiksem timestamp (`<ts>.<token>`),
co pozwala egzekwowac TTL bez dodatkowych kolumn w DB.

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
- Sekrety storage (S3/Azure) przechowywane sa zaszyfrowane w DB.
- Master key do szyfrowania: `MEDIA_SECRET_MASTER_KEY` (ENV, poza DB).

### Master key (storage secrets)

`MEDIA_SECRET_MASTER_KEY` to klucz master do szyfrowania/odszyfrowywania sekretow
S3/Azure zapisywanych w DB. Bez niego runtime nie odszyfruje rekordow.

Akceptowane formaty (32 bajty):
- 64‑znakowy hex
- base64 o dlugosci 32 bajtow
- dokladnie 32 znaki ASCII

Przyklady generowania:

```bash
# 32 bajty w base64
openssl rand -base64 32

# 32 bajty w hex (64 znaki)
openssl rand -hex 32
```

Rotacja klucza:
- Po zmianie klucza musisz ponownie wpisac wszystkie sekrety w Admin UI
  (zostana zaszyfrowane nowym kluczem).
- Jesli zmienisz klucz bez ponownego zapisu sekretow, konfiguracja storage
  stanie sie nieczytelna do czasu ich ponownej edycji.

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
