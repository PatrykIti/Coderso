# Integrations

Overview of external integrations configured in Admin UI (`Settings -> Integrations`).

## Security model

- Secret fields are encrypted at rest with the app master key (`SECRET_MASTER_KEY`).
- Secret values are never returned in plaintext from API responses.
- Runtime consumers resolve decrypted values only on backend services.
- Audit/error payloads must not include secret values.

## Built-in integrations

### `google-analytics`
- Category: `Analytics`
- Fields:
  - `measurementId` (`text`, required)

### `slack`
- Category: `Communication`
- Fields:
  - `webhookUrl` (`secret`, required)
  - `defaultChannel` (`text`, optional)

### `zapier`
- Category: `Automation`
- Fields:
  - `hookUrl` (`secret`, required)

### `sentry`
- Category: `Developer Tools`
- Fields:
  - `dsn` (`secret`, required)
  - `environment` (`text`, optional)

### `openrouter`
- Category: `Developer Tools`
- Used by Assistant in optional `llm-rag` mode.
- Fields:
  - `apiKey` (`secret`, required)
  - `baseUrl` (`url`, optional, default: `https://openrouter.ai/api/v1`)
  - `siteUrl` (`url`, optional, used as `HTTP-Referer` header)
  - `appName` (`text`, optional, used as `X-Title` header)

## Assistant + OpenRouter flow

1. Admin configures `openrouter` integration in Integrations page.
2. Assistant runtime resolves provider via integrations runtime config.
3. If provider is missing or call fails, assistant falls back to `docs-only`.
4. Frontend receives normalized response with:
   - `mode` / `effectiveMode`
   - `sources` (docs citations)
   - optional `llm` metadata (`provider`, `model`, `providerRequestId`, `usage`)

## API endpoints

- `GET /settings/integrations`
- `GET /settings/integrations/:id`
- `PATCH /settings/integrations/:id`
- `POST /settings/integrations/requests`
