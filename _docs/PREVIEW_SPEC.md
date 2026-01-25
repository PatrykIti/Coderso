# Preview Spec (v1)

Cel: podglad wersji draft strony lub content entry bez publikacji.

## Flow

1. Admin klika "Preview".
2. Core generuje preview token (TTL, np. 30-60 min).
3. Admin dostaje URL: `/preview?type=page&path=/slug&token=...`.
4. Frontend renderuje draft zamiast published.

Content entry:
- URL: `/preview?type=content&contentType=blog&slug=...&token=...`

## Token

- Losowy token (128+ bit).
- Przechowywany jako hash w DB.
- TTL i opcjonalne single-use.

## Endpoint (admin API)

- `POST /pages/:id/preview` -> `{ url }`
- `POST /content/:type/entries/:id/preview` -> `{ url }`

## Security

- Preview endpoint tylko dla zalogowanego admina.
- Preview URL dziala bez auth, ale tylko z poprawnym tokenem.
- Tokeny wygasaja po TTL.
