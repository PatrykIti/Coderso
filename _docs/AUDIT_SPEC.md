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
- audit.export

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

- Nie zapisujemy sekretow
  (password/token/secret/authorization/cookie/CSRF/reset-token/session-id).
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
- Admin UI audit entry copy/details rendering applies the same redaction helper
  before exposing payload JSON. Redaction removes sensitive fields recursively
  and redacts token-like strings inside nested values.
- Audit export output applies the same redaction helper before serializing row
  payloads. Export audit events record only format, selected columns, sanitized
  filter summary, row count, and request id; they must never store exported row
  contents.

## API

- `GET /audit` (admin, read-only, `audit:read`)
- `POST /audit/export` (admin, read-only data export, `audit:read`; concrete
  HTTP path is `POST /admin/api/audit/export`)

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
- Admin UI `Next` and `Previous` controls must be driven only by returned
  cursor metadata and loaded page state. Filter changes reset cursor state to
  the first page, and malformed or expired cursors recover to the first page
  with non-destructive copy.
- Audit export uses the active filters without the current page cursor, so the
  export scope is the filtered slice rather than only the visible page.

`POST /audit/export` strict JSON body:

- `format`: `csv` or `json`.
- `columns`: non-empty allowlisted array. Supported columns: `id`, `event`,
  `category`, `actor`, `resource`, `ip`, `timestamp`, `status`, `severity`,
  `requestId`, `description`, `payload`.
- `filters`: same normalized audit list filter contract as `GET /audit`, but
  body uses `query` instead of URL param `q`.
- `filters.limit`: optional positive integer, capped at 200 for synchronous
  exports. Values above 200 are rejected as `audit_export_too_large`.

Export response uses the shared admin export JSON file contract:

```json
{
  "type": "file",
  "filename": "audit-logs-2026-06-01-search.csv",
  "mimeType": "text/csv",
  "content": "Event,Timestamp\ncontent.publish,2026-06-01T10:30:00.000Z"
}
```

CSV output escapes commas, quotes, newlines, and leading formula characters
(`=`, `+`, `-`, `@`). JSON output includes `exportedAt`, selected columns,
sanitized filter summary, row count, max rows, and redacted rows.

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
- `audit_export_invalid`: invalid/unknown export payload.
- `audit_export_invalid_columns`: unsupported or empty export column selection.
- `audit_export_too_large`: requested synchronous export limit is above the
  supported cap.
- `audit_export_forbidden`: `audit:read` is missing for export.

## Admin Entry Copy Payload

`Copy JSON` in Audit Logs writes a redacted public entry payload to the
Clipboard API. The payload includes visible row context plus stable timestamps:

- `id`
- `event`
- `category`
- `actor`
- `resource`
- `resourceLabel`
- `status`
- `severity`
- `createdAt`
- `timestamp`
- `requestId`
- `description`
- `payload` (redacted recursively)

Unsupported entry-level actions that need a server workflow remain disabled
until their route contracts exist.
