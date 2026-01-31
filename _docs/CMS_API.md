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

## Admin users (v1)

Permissions: `users:read`, `users:write`

- `GET /admin-users`
- `POST /admin-users`
- `PATCH /admin-users/:id`
- `POST /admin-users/:id/disable`
- `POST /admin-users/:id/enable`
- `PUT /admin-users/:id/roles`
- `DELETE /admin-users/:id`

Create user payload (summary):

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "roleIds": ["editor"],
  "status": "pending",
  "password": "optional"
}
```

Update user payload (summary):

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "status": "active"
}
```

Replace roles payload:

```json
{ "roleIds": ["editor", "viewer"] }
```

---

## Admin roles (v1)

Permissions: `roles:read`, `roles:write`

- `GET /admin-roles`
- `GET /admin-roles/permissions`
- `POST /admin-roles`
- `PATCH /admin-roles/:id`
- `DELETE /admin-roles/:id`

Create role payload (summary):

```json
{
  "name": "editor",
  "description": "Content editors",
  "permissions": ["content:read", "content:write", "media:read"]
}
```

Permissions catalog response (summary):

```json
[
  {
    "id": "content",
    "label": "Content",
    "permissions": [
      {
        "id": "content:read",
        "label": "Read content",
        "description": "View pages and content entries"
      }
    ]
  }
]
```

---

## Sessions (v1)

Permissions: `settings:read`, `settings:write`

- `GET /sessions` (optional `?userId=...`)
- `POST /sessions/:id/revoke`
- `POST /sessions/revoke-all`

List response (summary):

```json
{
  "items": [
    {
      "id": "session-id",
      "userId": "user-id",
      "userEmail": "admin@example.com",
      "userName": "Admin",
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0",
      "createdAt": "2026-01-31T08:10:00Z",
      "expiresAt": "2026-02-07T08:10:00Z",
      "current": true
    }
  ]
}
```

---

## API Keys (v1)

Permissions: `settings:read`, `settings:write`

- `GET /settings/api-keys`
- `POST /settings/api-keys`
- `POST /settings/api-keys/:id/rotate`
- `POST /settings/api-keys/:id/revoke`

Create payload (summary):

```json
{
  "name": "Analytics Pipeline",
  "scopes": ["content.read", "media.read"]
}
```

Create/rotate response (summary):

```json
{
  "item": {
    "id": "key-id",
    "name": "Analytics Pipeline",
    "scopes": ["content.read", "media.read"],
    "prefix": "abc123",
    "createdAt": "2026-01-31T09:10:00Z",
    "lastUsedAt": null,
    "revokedAt": null
  },
  "secret": "plaintext-key-shown-once"
}
```

List response (summary):

```json
{
  "items": [
    {
      "id": "key-id",
      "name": "Analytics Pipeline",
      "scopes": ["content.read", "media.read"],
      "prefix": "abc123",
      "createdAt": "2026-01-31T09:10:00Z",
      "lastUsedAt": "2026-01-31T10:00:00Z",
      "revokedAt": null
    }
  ]
}
```

Secret jest zwracany tylko raz (create/rotate). Nie przechowujemy plaintext w DB.

---

## Webhooks (v1)

Permissions: `settings:read`, `settings:write`

- `GET /settings/webhooks`
- `POST /settings/webhooks`
- `PATCH /settings/webhooks/:id`
- `DELETE /settings/webhooks/:id`
- `GET /settings/webhooks/:id/deliveries`
- `POST /settings/webhooks/:id/test`

Create payload (summary):

```json
{
  "name": "Marketing Sync",
  "url": "https://example.com/webhook",
  "events": ["entry.created", "media.uploaded"],
  "enabled": true,
  "secret": "whsec_..."
}
```

List response (summary):

```json
{
  "items": [
    {
      "id": "webhook-id",
      "name": "Marketing Sync",
      "url": "https://example.com/webhook",
      "events": ["entry.created"],
      "enabled": true,
      "hasSecret": true,
      "createdAt": "2026-01-31T09:10:00Z",
      "updatedAt": "2026-01-31T09:10:00Z",
      "lastDelivery": {
        "status": "success",
        "deliveredAt": "2026-01-31T10:00:00Z"
      }
    }
  ]
}
```

Delivery log response (summary):

```json
{
  "items": [
    {
      "id": "delivery-id",
      "webhookId": "webhook-id",
      "event": "entry.created",
      "status": "success",
      "responseCode": 200,
      "attempts": 1,
      "lastError": null,
      "createdAt": "2026-01-31T10:00:00Z",
      "deliveredAt": "2026-01-31T10:00:01Z"
    }
  ]
}
```

Test endpoint wysyla przykladowy payload i zwraca rezultat delivery.

---

## Integrations (v1)

Permissions: `settings:read`, `settings:write`

- `GET /settings/integrations`
- `GET /settings/integrations/:id`
- `PATCH /settings/integrations/:id`
- `POST /settings/integrations/requests`

List response (summary):

```json
{
  "items": [
    {
      "id": "slack",
      "name": "Slack",
      "description": "Send instant notifications to team channels.",
      "category": "Communication",
      "scopes": ["notifications:send", "events:read"],
      "status": "connected",
      "health": {
        "status": "healthy",
        "lastCheckedAt": null,
        "lastError": null
      },
      "updatedAt": "2026-01-31T11:00:00Z",
      "fields": [
        {
          "key": "webhookUrl",
          "label": "Webhook URL",
          "type": "secret",
          "required": true,
          "secret": true,
          "value": null,
          "configured": true
        }
      ]
    }
  ]
}
```

Update payload (summary):

```json
{
  "config": {
    "measurementId": "G-XXXXXXX",
    "webhookUrl": "https://hooks.example.com/..."
  }
}
```

Request payload (summary):

```json
{
  "name": "HubSpot",
  "website": "https://hubspot.com",
  "notes": "Need CRM sync"
}
```

---

## Email Settings (v1)

Permissions: `settings:read`, `settings:write`

- `GET /settings/email`
- `PUT /settings/email`
- `POST /settings/email/test`
- `GET /settings/email/logs`

Update payload (summary):

```json
{
  "smtp": {
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "user": "mailer@example.com",
    "password": "secret"
  },
  "from": {
    "name": "Nextless",
    "email": "hello@example.com"
  }
}
```

Response (summary):

```json
{
  "provider": "smtp",
  "smtp": {
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "user": "mailer@example.com",
    "password": { "configured": true }
  },
  "from": {
    "name": "Nextless",
    "email": "hello@example.com"
  },
  "status": { "configured": true }
}
```

Test email payload:

```json
{ "to": "dev@example.com" }
```

Delivery logs response (summary):

```json
{
  "items": [
    {
      "id": "log-id",
      "recipient": "dev@example.com",
      "subject": "Nextless SMTP test",
      "status": "delivered",
      "provider": "smtp",
      "messageId": "mock",
      "error": null,
      "createdAt": "2026-01-31T10:00:00Z"
    }
  ]
}
```

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

## SEO Manager

Permissions: `content:read` (list + audit), `content:write` (update)

- `GET /seo`
- `GET /seo/:id`
- `PATCH /seo/:id`
- `POST /seo/audit`

Example item:

```json
{
  "id": "seo-id",
  "targetType": "page",
  "targetId": "page-id",
  "targetTitle": "Homepage",
  "slug": "/",
  "title": "Homepage | Nextless",
  "description": "Meta description text...",
  "canonicalUrl": "https://example.com/",
  "robots": "index,follow",
  "score": 90,
  "status": "warning",
  "issues": [
    { "code": "description_short", "severity": "warning", "message": "Description too short." }
  ],
  "lastAuditAt": "2026-01-30T10:00:00Z"
}
```

`POST /seo/audit` payload:

```json
{ "targetType": "page", "targetId": "uuid" }
```

Response:

```json
{ "audited": 12 }
```

---

## Analytics (v1)

Permissions: `content:read`

Note: v1 analytics are derived from CMS data (counts + recent updates), not real traffic.

- `GET /analytics/overview?rangeDays=30`
- `GET /analytics/top-content?limit=10&type=page`

Overview response:

```json
{
  "rangeDays": 30,
  "generatedAt": "2026-01-30T10:00:00Z",
  "totals": { "pages": 12, "publishedPages": 7, "entries": 24, "media": 80, "users": 3 },
  "current": { "pages": 3, "publishedPages": 2, "entries": 5, "media": 12, "users": 1 },
  "previous": { "pages": 2, "publishedPages": 1, "entries": 4, "media": 9, "users": 1 },
  "trend": [
    { "date": "2026-01-24", "value": 3 },
    { "date": "2026-01-25", "value": 2 }
  ]
}
```

Top content response:

```json
[
  { "id": "page-id", "type": "page", "title": "Homepage", "slug": "/", "updatedAt": "2026-01-30T09:00:00Z", "score": 90 }
]
```

---

## Backups (v1)

Permissions: `backups:read`, `backups:write`

Note: v1 backupy to metadane + placeholder na artefakt. Faktyczne backupy realizuje worker/plugin.

- `GET /backups`
- `POST /backups` (manual create)
- `POST /backups/:id/restore`
- `GET /backups/:id/download`
- `GET /backups/schedule`
- `PATCH /backups/schedule`

Create payload (optional):

```json
{ "kind": "manual" }
```

List response:

```json
{
  "items": [
    {
      "id": "backup-id",
      "status": "complete",
      "kind": "manual",
      "storageDriver": "s3",
      "artifactPath": "s3://bucket/backup.tar",
      "sizeBytes": 1048576,
      "error": null,
      "createdAt": "2026-01-30T10:00:00Z",
      "finishedAt": "2026-01-30T10:05:00Z"
    }
  ]
}
```

Schedule payload:

```json
{
  "enabled": true,
  "frequency": "daily",
  "retentionDays": 30,
  "storageDriver": "s3"
}
```

Download response:

```json
{ "url": "https://cdn.example.com/backups/backup.tar", "path": "s3://bucket/backup.tar" }
```

---

## Import / Export (v1)

Permissions: `settings:read`, `settings:write`

- `GET /tools/export`
- `POST /tools/import/preview`
- `POST /tools/import`

Export response (bundle):

```json
{
  "version": 1,
  "exportedAt": "2026-01-30T10:00:00Z",
  "settings": { "site.name": "Nextless", "site.locale": "en", "design.tokens": {} },
  "menus": [
    {
      "name": "Main",
      "location": "primary",
      "items": [{ "id": "item-1", "label": "Home", "href": "/", "orderIndex": 0 }]
    }
  ],
  "themeProfiles": [
    {
      "id": "profile-1",
      "name": "Default",
      "description": null,
      "themeName": "admin-default",
      "tokens": {},
      "isActive": true,
      "routes": [{ "id": "route-1", "path": "/", "pageId": null }]
    }
  ],
  "adminThemes": {
    "templates": [{ "id": "template-1", "name": "Admin Default", "tokens": {} }],
    "profiles": [{ "id": "admin-profile-1", "name": "Admin", "templateId": "template-1", "isActive": true }]
  },
  "redirects": []
}
```

Preview/import response:

```json
{
  "summary": {
    "settings": 3,
    "menus": 1,
    "menuItems": 1,
    "themeProfiles": 1,
    "themeRoutes": 1,
    "adminThemeTemplates": 1,
    "adminThemeProfiles": 1,
    "redirects": 0,
    "warnings": []
  }
}
```

---

## Redirects (v1)

Permissions: `settings:read`, `settings:write`

- `GET /redirects`
- `POST /redirects`
- `PATCH /redirects/:id`
- `DELETE /redirects/:id`

Create/update payload:

```json
{
  "fromPath": "/old-path",
  "toPath": "/new-path",
  "statusCode": 301,
  "enabled": true
}
```

List response (array):

```json
[
  {
    "id": "redirect-id",
    "fromPath": "/old-path",
    "toPath": "/new-path",
    "statusCode": 301,
    "enabled": true,
    "createdAt": "2026-01-30T10:00:00Z",
    "updatedAt": "2026-01-30T10:00:00Z"
  }
]
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

Uwaga: Admin UI korzysta z `GET /audit` do listowania logow (limit 200).

---

## Access logs

Permissions: `audit:read`

- `GET /access-logs?limit=100`
- Optional filters: `status=success|failed`, `q=search`, `from`, `to`

Response:

```json
{
  "items": [
    {
      "id": "access-id",
      "method": "POST",
      "path": "/admin/api/auth/login",
      "status": 401,
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0",
      "userId": "user-id",
      "userName": "Admin",
      "userEmail": "admin@example.com",
      "durationMs": 120,
      "createdAt": "2026-01-31T10:00:00Z"
    }
  ]
}
```

Uwaga: Admin UI korzysta z `GET /access-logs` do listowania (limit 200).

---

## IP allowlist

Permissions: `settings:read`, `settings:write`

- `GET /ip-allowlist`
- `POST /ip-allowlist`
- `DELETE /ip-allowlist/:id`

Create payload:

```json
{
  "cidr": "192.168.1.0/24",
  "label": "Office VPN",
  "description": "HQ range"
}
```

Response (list):

```json
{
  "items": [
    {
      "id": "entry-id",
      "cidr": "192.168.1.0/24",
      "label": "Office VPN",
      "description": "HQ range",
      "createdAt": "2026-01-31T10:00:00Z"
    }
  ]
}
```

Uwaga: Admin UI korzysta z `GET /ip-allowlist` do listowania.

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

## Security settings

Permissions: `settings:read`, `settings:write`

- `GET /settings/security`
- `PATCH /settings/security`

`PATCH /settings/security` (partial update)

```json
{
  "csrf": { "enabled": true, "tokenTtlMinutes": 30 },
  "rateLimit": {
    "enabled": true,
    "admin": { "windowSeconds": 60, "maxRequests": 120 },
    "auth": { "windowSeconds": 60, "maxRequests": 20 }
  },
  "cors": {
    "allowedOrigins": ["https://admin.example.com"],
    "allowCredentials": true,
    "allowedMethods": ["GET", "POST", "PATCH", "DELETE"],
    "allowedHeaders": ["content-type", "x-csrf-token"],
    "maxAgeSeconds": 600
  },
  "plugins": {
    "safeMode": false
  },
  "session": {
    "ttlDays": 7,
    "maxPerUser": 3,
    "singleSession": false
  },
  "loginAlerts": {
    "enabled": true,
    "notifyOnNewDevice": true,
    "notifyOnNewLocation": true
  }
}
```

Uwaga: zmiany obowiazuja natychmiast, bez restartu serwera.

---

## Forms

Permissions: `forms:read`, `forms:write`

- `GET /forms`
- `POST /forms`
- `GET /forms/:id`
- `PATCH /forms/:id`
- `DELETE /forms/:id`
- `GET /forms/:id/fields`
- `PUT /forms/:id/fields`
- `GET /forms/:id/submissions`
- `POST /forms/:id/submissions` (public submit)

`POST /forms`

```json
{
  "name": "Contact",
  "slug": "contact",
  "status": "draft",
  "description": "Customer support form"
}
```

`PUT /forms/:id/fields`

```json
[
  {
    "id": "uuid",
    "type": "text",
    "label": "Full name",
    "name": "full_name",
    "required": true,
    "orderIndex": 0,
    "settings": { "placeholder": "John Doe" }
  }
]
```

`POST /forms/:id/submissions`

```json
{
  "data": {
    "full_name": "Patryk",
    "email": "patryk@example.com"
  }
}
```

Uwagi:
- Payload submission jest walidowany na podstawie definicji pol.
- Publiczny submit podlega rate limitowi; CSRF obowiazuje dla sesji admina.

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
- `GET /theme-profiles`
- `GET /theme-profiles/:id`
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
