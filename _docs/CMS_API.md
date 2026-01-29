# CMS Admin API (v1)

Opis podstawowego API admina. Wszystkie endpointy sa po stronie core.

## Base path

`/admin/api`

## Conventions

- JSON for request/response (poza upload).
- Auth przez session cookie (httpOnly).
- Mutacje wymagaja `X-CSRF-Token`.
- Odpowiedzi:
  - `200/201` dla sukcesu
  - `4xx` dla bledow walidacji i auth
  - `5xx` dla bledow serwera

Access:
- Login endpoint jest publiczny.
- Pozostale endpointy wymagaja auth (session cookie).
- Admin UI komunikuje sie po HTTPS w tej samej domenie.
- Internal service layer to modul w core, bez publicznego endpointu.

Przyklad error:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid payload",
    "details": [{ "path": "title", "message": "Required" }]
  }
}
```

---

## Auth

- `POST /auth/login` (public)
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/csrf` (pobiera token CSRF)
- `POST /auth/verify-otp` (MFA)
- `POST /auth/reset` (public)
- `POST /auth/reset/confirm` (public)

`GET /auth/csrf` wymaga aktywnej sesji i zwraca `{ token }` do headera `X-CSRF-Token`.

Payload login:

```json
{ "email": "user@example.com", "password": "secret" }
```

OTP verify payload (summary):

```json
{ "code": "123456" }
```

Recovery verify payload (summary):

```json
{ "recoveryCode": "ABCD-EFGH" }
```

Reset request payload (summary):

```json
{ "email": "user@example.com" }
```

Reset confirm payload (summary):

```json
{ "token": "reset-token", "password": "new-password" }
```

---

## Users

Permissions: `users:read`, `users:write`

- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `POST /users/:id/reset-password`

Create user payload (summary):

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "roleIds": ["editor"],
  "status": "pending"
}
```

---

## Roles

Permissions: `roles:read`, `roles:write`

- `GET /roles`
- `POST /roles`
- `PATCH /roles/:id`
- `DELETE /roles/:id`

Create role payload (summary):

```json
{
  "name": "editor",
  "description": "Content editors",
  "permissions": ["content:read", "content:write", "media:read"]
}
```

---

## Pages

Permissions: `content:read`, `content:write`, `content:publish`

- `GET /pages`
- `POST /pages`
- `GET /pages/:id`
- `PATCH /pages/:id`
- `POST /pages/:id/publish`
- `POST /pages/:id/unpublish`
- `POST /pages/:id/preview`
- `GET /pages/:id/revisions`
- `POST /pages/:id/revisions/:revisionId/restore`

Create/Update payload (summary):

```json
{
  "title": "Home",
  "slug": "home",
  "status": "draft",
  "data": { "schemaVersion": 1, "blocks": [] }
}
```

---

## Media

Permissions: `media:read`, `media:write`

- `POST /media` (multipart)
- `GET /media`
- `GET /media/:id`
- `PATCH /media/:id`
- `DELETE /media/:id`

Upload payload (multipart):

- `file`: binary
- `alt`: string (optional)
- `title`: string (optional)
- `caption`: string (optional)

Update metadata payload:

```json
{ "title": "Hero Banner", "alt": "Mountain landscape", "caption": "Winter view" }
```

---

## Menus

Permissions: `menus:read`, `menus:write`

- `GET /menus`
- `POST /menus`
- `GET /menus/:id`
- `PATCH /menus/:id`
- `PUT /menus/:id/items`
- `DELETE /menus/:id`

Create menu payload:

```json
{ "name": "Primary", "location": "primary" }
```

Update menu items payload:

```json
{
  "items": [
    { "id": "1", "label": "Home", "href": "/", "orderIndex": 0, "parentId": null },
    { "id": "2", "label": "About", "href": "/about", "orderIndex": 1, "parentId": null },
    { "id": "3", "label": "Team", "pageId": "page-uuid", "parentId": "2" }
  ]
}
```

---

## Content types and entries

Permissions: `content:read`, `content:write`, `content:publish`

- `GET /content-types`
- `POST /content-types`
- `PATCH /content-types/:id`
- `DELETE /content-types/:id`

- `GET /content/:type/entries`
- `POST /content/:type/entries`

---

## Storage settings

Permissions: `settings:read`, `settings:write`

- `GET /settings/storage`
- `PATCH /settings/storage`

Przyklad payload:

```json
{
  "driver": "s3",
  "publicBaseUrl": "https://cdn.example.com",
  "maxSizeBytes": 10485760,
  "allowedMime": "image/*,application/pdf",
  "s3": {
    "bucket": "media-bucket",
    "region": "eu-central-1",
    "endpoint": "https://s3.amazonaws.com",
    "accessKey": "AKIA...",
    "secretKey": "••••"
  }
}
```
- `GET /content/:type/entries/:id`
- `PATCH /content/:type/entries/:id`
- `POST /content/:type/entries/:id/preview`
- `POST /content/:type/entries/:id/publish`
- `POST /content/:type/entries/:id/unpublish`

Create content type payload (summary):

```json
{
  "name": "Blog Post",
  "slug": "blog",
  "schema": {
    "type": "object",
    "additionalProperties": false,
    "required": ["title"],
    "properties": {
      "title": { "type": "string" },
      "summary": { "type": "string" },
      "featured": { "type": "boolean", "default": false }
    }
  }
}
```

Create entry payload (summary):

```json
{
  "title": "Launch announcement",
  "slug": "launch-announcement",
  "status": "draft",
  "data": {
    "title": "Launch announcement",
    "summary": "Short intro",
    "featured": true
  }
}
```

Preview response (example):

```json
{
  "previewToken": "token",
  "expiresAt": "2026-01-27T10:00:00Z"
}
```

---

## Search

Permissions: `content:read`

- `GET /search?q=...&limit=20`

Response:

```json
{
  "items": [
    { "id": "page-id", "type": "page", "title": "Homepage", "slug": "home" },
    { "id": "entry-id", "type": "entry", "title": "Launch announcement", "slug": "launch" },
    { "id": "media-id", "type": "media", "title": "Hero banner" }
  ]
}
```

---

## Audit logs

Permissions: `audit:read`

- `GET /audit?limit=100`

Response:

```json
{
  "items": [
    {
      "id": "audit-id",
      "actorId": "user-id",
      "action": "pages.publish",
      "targetType": "page",
      "targetId": "page-id",
      "metadata": { "slug": "home" },
      "createdAt": "2026-01-27T10:00:00Z"
    }
  ]
}
```

---

## Settings

Permissions: `settings:read`, `settings:write`

- `GET /settings`
- `GET /settings/:key`
- `PATCH /settings/:key`
- `PATCH /settings`

Payloady:

`PATCH /settings/:key`

```json
{ "value": "pl-PL" }
```

`PATCH /settings` (bulk map)

```json
{
  "site.name": "Nextless",
  "site.locale": "pl-PL",
  "design.tokens": { "colors": { "primary": "#111111" } }
}
```

Response:
- `GET /settings` zwraca merged view (z defaultami).
- `design.tokens` zwracane jako resolved tokens (defaults + overrides).

---

## Plugins (installed)

Permissions: `plugins:read`, `plugins:manage`

- `GET /plugins`
- `POST /plugins/install` (name + version)
- `POST /plugins/:name/enable`
- `POST /plugins/:name/disable`
- `POST /plugins/:name/update`
- `DELETE /plugins/:name`

Uwagi:
- `POST /plugins/:name/update` respektuje polityke update (domyslnie `auto-security`).
- Dla update manualnych polityka moze byc nadpisana przez admina.
- Revocations z `revocations.json` skutkuja auto-disable w core.

---

## Store (browse)

Permissions: `store:browse`

- `GET /store/plugins`
- `GET /store/plugins/:name`

---

## Themes

Permissions: `themes:read`, `themes:write`

- `GET /themes`
- `POST /themes/activate`
- `GET /theme-profiles`
- `POST /theme-profiles`
- `PATCH /theme-profiles/:id`
- `POST /theme-profiles/:id/activate`
- `PUT /theme-profiles/:id/routes`

---

## Search

Permissions: `content:read`, `media:read`

- `GET /search?q=...`

---

## Audit logs

Permissions: `audit:read`

- `GET /audit`

---

## Users and Roles

Permissions: `users:read`, `users:write`, `roles:read`, `roles:write`

- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `GET /roles`
- `POST /roles`
- `PATCH /roles/:id`
