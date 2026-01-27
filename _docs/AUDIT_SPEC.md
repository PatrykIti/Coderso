# Audit Log Spec (v1)

Minimalne logowanie zdarzen administracyjnych.

## Events (v1)

- auth.login
- auth.logout
- pages.publish
- pages.restore
- plugins.install
- plugins.update
- plugins.disable
- settings.update

## Data model

`audit_logs`:
- id (uuid)
- actor_id (fk users)
- action (string)
- target_type (string)
- target_id (string)
- metadata (jsonb)
- created_at

## Metadata rules

- Nie zapisujemy sekretow (password/token/secret/authorization/cookie).
- `ip` i `userAgent` trafiaja do metadata, jezeli dostepne.
- `action` ma format `domain.action` (np. `pages.publish`).

## API

- `GET /audit` (admin, read-only)
