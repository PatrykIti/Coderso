# Settings Matrix (Core)

Dokument zbiera klucze `settings` i ich znaczenie dla runtime/admin UI.

## Runtime + auth settings (`settings`)

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `site.publicBaseUrl` | `string \| null` | `null` | Publiczny base URL runtime (`http/https`, trailing slash normalizowany) |
| `auth.sessionTtlDays` | `number` | `14` | TTL sesji logowania w dniach (`1..365`) |
| `auth.resetTtlMinutes` | `number` | `60` | TTL tokenu resetu hasla w minutach (`5..1440`) |
| `setup.completed` | `boolean` | `false` | Flaga zamkniecia pierwszej konfiguracji |

Alias kompatybilnosciowy:
- `site.baseUrl` -> `site.publicBaseUrl` (read/write, brak osobnego source of truth).

## Assistant settings (`settings`)

Admin UI: Settings → Assistant.

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `assistant.enabled` | `boolean` | `false` | Globalny toggle asystenta w Admin UI |
| `assistant.defaultMode` | `"docs-only" \| "llm-rag"` | `"docs-only"` | Domyslny tryb odpowiedzi |
| `assistant.docs.backend` | `"filesystem" \| "db"` | `"filesystem"` | Backend retrieval (`db` = KB z ingest, `filesystem` = in-memory index) |
| `assistant.docs.sourceRoot` | `string` | `"_docs/_internal"` | Root dla ingest do DB backendu |
| `assistant.docs.paths` | `string[]` | `["_docs"]` | Sciezki dokumentacji indeksowane przez Doc Navigator |
| `assistant.docs.reindexOnBoot` | `boolean` | `false` | Czy wykonywac reindex przy starcie |
| `assistant.llm.enabled` | `boolean` | `false` | Wlacza sciezke LLM |
| `assistant.llm.provider` | `"openrouter" \| "none"` | `"none"` | Provider LLM |
| `assistant.llm.model` | `string` | `"google/gemma-3n-e2b-it:free"` | Id modelu providera |
| `assistant.llm.maxInputTokens` | `number` | `8192` | Limit wejscia dla zapytan |
| `assistant.llm.maxOutputTokens` | `number` | `2048` | Limit wyjscia odpowiedzi |
| `assistant.llm.timeoutMs` | `number` | `20000` | Timeout requestu LLM |
| `assistant.quotas.requestsPerMinute` | `number` | `20` | Soft quota/min |
| `assistant.quotas.requestsPerDay` | `number` | `1000` | Soft quota/day |

## Security settings (`settings.key = security.settings`)

Ustawienia security sa przechowywane jako JSON w `settings.key = security.settings`.

- `requestId`: `enabled`, `headerName`
- `csrf`: `enabled`, `headerName`, `tokenTtlMinutes`
- `cors`: `allowedOrigins`, `allowCredentials`, `allowedMethods`, `allowedHeaders`, `maxAgeSeconds`
- `rateLimit`:
  - `enabled`
  - `buckets`: `auth`, `admin_read`, `admin_write`, `public_read`, `public_write`, `assistant`
- `headers`: `enabled`, `frameOptions`, `contentTypeOptions`, `referrerPolicy`, `permissionsPolicy`, `csp`, `hsts`
- `session`: `ttlDays`, `maxPerUser`, `singleSession`
- `loginAlerts`: `enabled`, `notifyOnNewDevice`, `notifyOnNewLocation`
- `botProtection`: `enabled`, `provider`, `siteKey`, `secretKey`, `thresholds`, `enforceOnLocalhost`
- `plugins`: `safeMode`
- `validation`: `rejectUnknownFields`

Publiczny payload z API `/settings/security` zwraca:
- `botProtection.secretKey.configured` (maskowanie sekretu)
- `passwordPepperConfigured` (ENV `AUTH_PASSWORD_PEPPER`)

## Assistant user settings (`user_settings`)

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `assistant.mode` | `"docs-only" \| "llm-rag" \| null` | `null` | Per-user override trybu |
| `assistant.ui.enabled` | `boolean` | `true` | Widocznosc UI asystenta |
| `assistant.ui.avatarEnabled` | `boolean` | `false` | Toggle avatara |
| `assistant.ui.avatarAsset` | `string \| null` | `null` | Asset id/url avatara |

## Validation invariants

- `assistant.defaultMode="llm-rag"` wymaga:
  - `assistant.llm.enabled=true`
  - `assistant.llm.provider != "none"`
- `assistant.enabled=true` wymaga niepustego `assistant.docs.paths`.
- `assistant.docs.sourceRoot` musi byc niepustym stringiem.
- Limity liczbowe (`tokens`, `timeout`, `quotas`) musza byc dodatnimi integerami.
