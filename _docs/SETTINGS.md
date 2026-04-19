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
| `assistant.launcher.avatarEnabled` | `boolean` | `false` | Czy floating launcher ma uzywac avatara zamiast domyslnej chmurki wiadomosci |
| `assistant.launcher.avatarAsset` | `string \| null` | `null` | Asset id/url avatara launchera |
| `assistant.defaultMode` | `"docs-only" \| "llm-guide"` | `"docs-only"` | Domyslny tryb odpowiedzi |
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

## Assistant operation policy for settings surfaces

`core/services/assistant/operationPolicy/adminSurfacePolicies.ts` maps Settings
root and subpages into the assistant operation policy:

- Settings mutations are `live-gated` / `mode="gated"` until a dedicated typed
  action contract exists for that setting family.
- Secret-bearing surfaces (`assistant`, `security`, `api-keys`, `webhooks`,
  `email`, `storage`, `integrations`) set `secrets.redacted=true` and
  `providerAllowed=false`.
- The policy mirrors the admin route/RBAC split: `settings:read` for inspection
  and `settings:write` for gated configure/update attempts.

## Assistant user settings (`user_settings`)

Legacy compatibility:
- assistant launcher visibility i launcher avatar sa sterowane globalnie przez `settings`,
- dawne `assistant.ui.*` klucze per-user nie sa juz source of truth dla floating launchera.

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `assistant.mode` | `"docs-only" \| "llm-guide" \| null` | `null` | Per-user override trybu; legacy `llm-rag` input is normalized to `llm-guide` |
| `assistant.ui.enabled` | `boolean` | `true` | Legacy compatibility key |
| `assistant.ui.avatarEnabled` | `boolean` | `false` | Legacy compatibility key |
| `assistant.ui.avatarAsset` | `string \| null` | `null` | Legacy compatibility key |

## Validation invariants

- `assistant.defaultMode="llm-guide"` wymaga:
  - `assistant.llm.enabled=true`
  - `assistant.llm.provider != "none"`
- OpenRouter API key is configured in Settings -> Integrations as encrypted `openrouter.apiKey`, not in the Assistant card payload.
- Official assistant corpus from `docs/` jest gotowy dopiero po seedzie do DB.
- Official runtime nie moze fallbackowac do filesystem corpus, gdy DB corpus nie jest gotowy.
- Assistant Settings screen exposes `Run reindex` as the manual DB seeding action.
- Limity liczbowe (`tokens`, `timeout`, `quotas`) musza byc dodatnimi integerami.
