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

- `GET /audit` (admin, read-only)
