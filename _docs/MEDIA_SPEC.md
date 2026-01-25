# Media Storage Spec (v1)

## Default

- Storage lokalny w core (filesystem) - v1.
- Publiczne serwowanie plikow przez core.
- V1 wspiera adaptery: local, S3, Azure.

## Local storage

- Katalog: `MEDIA_DIR` (np. `/data/media`).
- URL publiczny: `/media/<path>`.
- Struktura sciezek: `/<yyyy>/<mm>/<uuid>.<ext>`.
- Cache-Control: long cache dla niezmiennych plikow.

## External storage (adapter)

Konfiguracja:
- `MEDIA_STORAGE=local|s3|azure`
- `MEDIA_BASE_URL=https://cdn.example.com` (opcjonalnie)

S3 (przyklad):
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`

Azure (przyklad):
- `AZURE_CONTAINER`, `AZURE_ACCOUNT`, `AZURE_KEY`

Adapter interface (concept):
- `put(file)` -> `{ url, key }`
- `get(key)` -> stream
- `delete(key)` -> void
- `getPublicUrl(key)` -> url

## Upload rules

- Max size per file (config).
- Dozwolone MIME types (whitelist).
- Metadane: alt, title, caption.

## Security

- Uploady tylko przez admin API (auth + CSRF).
- Opcjonalny AV scan jako plugin.
