# Preview Spec (v1)

Cel: podglad wersji draft strony, content entry lub widget template bez publikacji.

## Flow

1. Admin klika "Preview".
2. Core generuje preview token (TTL, np. 30-60 min).
3. Admin dostaje URL: `/preview?type=page&path=/slug&token=...`.
4. Runtime renderuje draft zamiast published.

Content entry:
- URL: `/preview?type=content&contentType=blog&slug=...&token=...`

Widget template:
- URL: `/preview?type=widget-template&token=...`

## Token

- Losowy token (128+ bit).
- Przechowywany jako hash w DB.
- TTL i opcjonalne single-use.

## Endpoint (admin API)

- `POST /pages/:id/preview` -> `{ url }`
- `POST /content/:type/entries/:id/preview` -> `{ url }`
- `POST /widget-templates/:id/preview` -> `{ token, previewUrl, expiresAt, blocksCount }`

## Security

- Preview endpoint tylko dla zalogowanego admina.
- Preview URL dziala bez auth, ale tylko z poprawnym tokenem.
- Tokeny wygasaja po TTL.
