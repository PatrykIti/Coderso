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
- widgets.template.create
- widgets.template.update
- widgets.template.delete
- widgets.template.restore
- admin.user.invite
- admin.user.password_reset
- admin.user.disable
- admin.user.enable
- admin.user.delete
- admin.role.create
- admin.role.update
- admin.role.duplicate
- admin.role.delete

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
- Role duplicate metadata may include `sourceRoleId` and `sourceRoleName`; reset
  and invite metadata must never include set-password tokens.
- Role create, duplicate, update, and delete metadata must include `roleId`,
  role `name`, sorted stored `permissions`, and `fullAccess`.
- Role update metadata must also include sorted `addedPermissions` and
  `removedPermissions`. For diff purposes, stored `*` full access expands to
  the current permission catalog; the snapshot remains the stored value
  `["*"]` plus `fullAccess: true`.
- Role audit metadata must stay machine-readable and redacted: no session
  cookies, request headers, authorization values, tokens, passwords, or
  unrelated user payloads.

## API

- `GET /audit` (admin, read-only, `audit:read`)

`GET /audit` strict query params:

- `limit`: positive integer, clamped to 200.
- `q`: optional search text matched against stored action, target, actor id,
  and redacted metadata text.
- `category`: optional `authentication`, `content`, or `system`.
- `severity`: optional `info`, `warning`, or `error`.
- `from` / `to`: optional RFC3339 date-time bounds. Reversed ranges are
  rejected.
- `cursor`: optional opaque keyset cursor returned by the previous response.

Response:

- `items`: audit rows ordered by `createdAt DESC, id DESC`.
- `nextCursor`: next keyset cursor when more matching rows are available,
  otherwise `null`. Cursor payloads preserve database timestamp precision.

Derived audit categories:

- `authentication`: actions beginning with `auth.`, `session.`, or
  `sessions.`, or `targetType=session`.
- `content`: case-insensitive target types `page`, `content`, `entry`, `menu`,
  `media`, `seo`, `redirect`, `theme`, or `admin-theme`.
- `system`: everything else.

Category precedence is deterministic: authentication wins over content, and
system applies only after both authentication and content checks fail.

Derived audit severity:

- Explicit `metadata.severity` of `info`, `warning`, or `error` wins.
- Actions containing `error` or `fail` derive `error`.
- Actions containing `warn` or `denied` derive `warning`.
- Everything else derives `info`.

Errors:

- `audit_query_invalid`: invalid/unknown query params or invalid date ranges.
- `audit_cursor_invalid`: malformed cursor.
