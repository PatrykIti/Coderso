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

Dodatkowe kody bledow zwiazane z ochrona:
- `rate_limited` / `assistant_rate_limited` (HTTP 429)
- `bot_protection_required`, `bot_protection_failed`, `bot_protection_score_low` (HTTP 4xx)

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
- `GET /auth/bot-protection` (public config dla reCAPTCHA)
- `GET /auth/csrf` (pobiera token CSRF)
- `POST /auth/verify-otp` (MFA)
- `POST /auth/reset` (public)
- `POST /auth/reset/confirm` (public)

`GET /auth/csrf` wymaga aktywnej sesji i zwraca `{ token }` do headera `X-CSRF-Token`.

Payload login:

```json
{ "email": "user@example.com", "password": "secret", "captchaToken": "optional" }
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
{ "email": "user@example.com", "captchaToken": "optional" }
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
- `GET /pages/template-options`
- `POST /pages`
- `GET /pages/:id`
- `PATCH /pages/:id`
- `POST /pages/:id/publish`
- `POST /pages/:id/unpublish`
- `POST /pages/:id/preview`
- `POST /pages/:id/duplicate`
- `DELETE /pages/:id`
- `GET /pages/:id/revisions`
- `POST /pages/:id/revisions/:revisionId/restore`

Create/Update payload (summary):

```json
{
  "title": "Home",
  "slug": "home",
  "data": {
    "schemaVersion": 1,
    "blocks": [],
    "settings": {
      "template": "landing",
      "showInNav": true,
      "layout": {
        "wrapper": {
          "container": "full",
          "padding": { "top": "none", "bottom": "none" },
          "background": { "color": "transparent", "image": null }
        },
        "sections": {
          "gap": "none",
          "defaults": {
            "container": "default",
            "padding": { "top": "xl", "bottom": "xl" },
            "margin": { "top": "none", "bottom": "none" }
          }
        },
        "applyDefaultsToNewBlocks": false
      }
    }
  }
}
```

`POST /pages/:id/publish` (optional draft data)

```json
{
  "data": { "schemaVersion": 1, "blocks": [] }
}
```

`POST /pages/:id/preview` response:

```json
{
  "token": "preview-token",
  "previewUrl": "/preview?type=page&token=preview-token",
  "expiresAt": "2026-02-07T12:00:00.000Z"
}
```

`GET /pages/template-options` response:

```json
{
  "themeName": "default",
  "templates": [{ "key": "landing", "label": "Landing" }]
}
```

Preview URL resolution policy (dotyczy pages/content/widget templates):
- 1) `settings["site.publicBaseUrl"]`
- 2) `PUBLIC_BASE_URL` (ENV fallback)
- 3) request-derived `proto://host` (`x-forwarded-host` / `x-forwarded-proto` / `host`)
- 4) relative path fallback (`/preview?...`) gdy brak poprawnego base URL

Uwaga: gdy `proto` jest nieznane, domyslnie stosujemy `https`, ale dla `localhost/127.0.0.1` -> `http`.

---

## Posts

Permissions: `content:read`, `content:write`, `content:publish`

Posts API to internal alias na content entries:
- reserved content type slug: `post` (auto-bootstrap przez serwis przy pierwszym uzyciu),
- brak dedykowanej tabeli DB dla posts.

Routes:
- `GET /posts`
- `POST /posts`
- `GET /posts/:id`
- `PATCH /posts/:id`
- `PATCH /posts/:id/metadata`
- `POST /posts/:id/autosave`
- `GET /posts/:id/revisions`
- `POST /posts/:id/revisions/:revisionId/restore`
- `POST /posts/:id/publish`
- `POST /posts/:id/unpublish`
- `POST /posts/:id/preview`
- `POST /posts/:id/duplicate`
- `DELETE /posts/:id`

Create payload (summary):

```json
{
  "title": "How we deliver projects",
  "slug": "how-we-deliver-projects",
  "data": {
    "excerpt": "Short intro for listing cards.",
    "content": "<p>Full article body</p>",
    "featuredImage": "media-id",
    "featured": true
  }
}
```

Metadata payload (summary):

```json
{
  "status": "draft",
  "scheduledAt": null,
  "tags": ["engineering", "process"],
  "taxonomy": {
    "categoryId": "term-cat-id",
    "tagIds": ["term-tag-id-1", "term-tag-id-2"]
  },
  "seo": {
    "title": "Post SEO title",
    "description": "Post SEO description",
    "canonicalUrl": "https://example.com/blog/how-we-deliver-projects",
    "robots": "index,follow"
  }
}
```

Autosave response (summary):

```json
{
  "post": {
    "id": "post-id",
    "title": "Draft title",
    "slug": "draft-title",
    "status": "draft",
    "data": { "document": { "version": 1, "blocks": [] } }
  },
  "revision": {
    "id": "revision-id",
    "postId": "post-id",
    "version": 4,
    "createdAt": "2026-02-21T13:00:00.000Z"
  },
  "savedAt": "2026-02-21T13:00:00.000Z",
  "reusedRevision": false
}
```

Preview response:

```json
{
  "token": "preview-token",
  "previewUrl": "/preview?type=content&contentType=post&token=preview-token",
  "expiresAt": "2026-02-21T13:00:00.000Z"
}
```

Runtime rendering contract (posts):
- post detail runtime (`/preview?type=content...` and published content routes) renders `data.document` block document with the same pipeline in preview and published mode,
- legacy posts without `data.document` are auto-coerced from legacy fields (`content`/`excerpt`) before runtime rendering.

---

## Coderso Listings (v1 beta)

Permissions: `content:read`, `content:write`

Saved queries:
- `GET /listings/queries`
- `GET /listings/queries/:id`
- `POST /listings/queries`
- `PATCH /listings/queries/:id`
- `DELETE /listings/queries/:id`
- `POST /listings/queries/preview`

Templates:
- `GET /listings/templates`
- `GET /listings/templates/:id`
- `POST /listings/templates`
- `PATCH /listings/templates/:id`
- `DELETE /listings/templates/:id`

### Listing query payload (summary)

```json
{
  "name": "Homepage services",
  "description": "Cards for front page",
  "query": {
    "source": "entries",
    "sourceConfig": {
      "contentTypeId": "service",
      "includeDrafts": false
    },
    "filters": [
      { "field": "status", "op": "eq", "value": "published" }
    ],
    "sort": [
      { "field": "publishedAt", "dir": "desc" }
    ],
    "pagination": { "limit": 12, "offset": 0 },
    "fields": ["id", "slug", "title", "status", "data.summary"]
  }
}
```

Allowed query operators:
- `eq`, `neq`, `in`, `nin`, `contains`, `startsWith`, `gt`, `gte`, `lt`, `lte`, `between`, `exists`

Supported sources:
- `entries`, `posts`, `users`, `taxonomies`

### Listing template payload (summary)

```json
{
  "name": "Service cards",
  "slug": "service-cards",
  "layout": "grid",
  "config": {
    "fields": [
      {
        "key": "title",
        "source": "title",
        "format": "text",
        "conditions": []
      },
      {
        "key": "excerpt",
        "source": "data.summary",
        "format": "text",
        "fallback": "No summary",
        "conditions": [
          { "id": "show-excerpt", "field": "status", "op": "eq", "value": "published" }
        ]
      }
    ],
    "itemActions": [
      { "id": "view", "label": "View", "kind": "view", "href": "/services/{{slug}}", "opensInNewTab": false }
    ],
    "emptyState": {
      "title": "No items found",
      "description": null,
      "ctaLabel": null,
      "ctaHref": null
    },
    "style": {
      "columns": 3,
      "gap": "md",
      "cardVariant": "default"
    }
  }
}
```

Allowed field condition operators:
- `eq`, `neq`, `in`, `contains`, `exists`, `gt`, `gte`, `lt`, `lte`

Error codes (selected):
- `listing_query_not_found`
- `listing_template_not_found`
- `listing_template_slug_exists`
- `listing_template_layout_invalid`
- `listing_template_config_invalid`

### Runtime widget integration

`content-list` i `entry-teaser` wspieraja:
- `source.mode = "legacy"` (dotychczasowe content-type flow)
- `source.mode = "listing"` (`listingQueryId` + opcjonalny `listingTemplateId`)

Back-compat:
- jesli `source.mode` nie istnieje, ale `listingQueryId` jest ustawione, runtime traktuje widget jako `listing`.

Public runtime safety:
- dla source `entries/posts` runtime wymusza `includeDrafts=false` poza preview.

## Coderso Filters & Search (v2 beta)

Filters preview (internal API, session/RBAC):
- `POST /filters/preview`
- Permission: `content:read`

Public search preview (internal API for admin tooling):
- `GET /search/public-preview?q=<query>&limit=<1..50>&sources=pages,entries,posts`
- Permission: `content:read`
- Zwraca ten sam kontrakt co publiczne `GET /api/search`, ale przez internal router (`/admin/api/...`).

Request:

```json
{
  "listingQueryId": "query-id",
  "queryString": "lq.query-id.status.in=published&lq.query-id.__q=release"
}
```

Response (summary):

```json
{
  "listingQueryId": "query-id",
  "total": 12,
  "limit": 10,
  "offset": 0,
  "rows": [],
  "rejectedTokens": [],
  "appliedFilters": [],
  "appliedSort": [],
  "page": 1,
  "searchQuery": "release"
}
```

Public search endpoint:
- `GET /api/search?q=<query>&limit=<1..50>&sources=pages,entries,posts`
- brak auth (public read), podlega public rate-limit bucket.

`sources`:
- `pages`
- `entries`
- `posts`

Runtime URL token contract (listing widgets):
- `lq.<listingQueryId>.__q`
- `lq.<listingQueryId>.__sort`
- `lq.<listingQueryId>.__page`
- `lq.<listingQueryId>.<field>.<operator>`

## Coderso Booking (v1 foundation + runtime widgets)

Permissions: `booking:read`, `booking:write`

Internal admin API (`/admin/api/*`, RBAC required):

Resources:
- `GET /booking/resources`
- `POST /booking/resources`
- `GET /booking/resources/:id`
- `PATCH /booking/resources/:id`
- `DELETE /booking/resources/:id`

Services:
- `GET /booking/services`
- `POST /booking/services`
- `GET /booking/services/:id`
- `PATCH /booking/services/:id`
- `DELETE /booking/services/:id`
- `GET /booking/services/:id/resources`
- `PUT /booking/services/:id/resources`

Schedules / Blackouts:
- `GET /booking/resources/:id/schedules`
- `PUT /booking/resources/:id/schedules`
- `GET /booking/blackouts?resourceId=<optional>`
- `POST /booking/blackouts`
- `DELETE /booking/blackouts/:id`

Reservations / Slots:
- `POST /booking/slots/preview`
- `GET /booking/reservations?resourceId=&serviceId=&status=&from=&to=`
- `POST /booking/reservations`
- `PATCH /booking/reservations/:id/status`

Public runtime API:
- `GET /api/booking/slots?serviceId=&resourceId=&date=&runtimeToken=&timezone=&intervalMinutes=`
- `POST /api/booking/reservations`

Service-level runtime access (`booking_services.settings.submissionAccess`):
- `public` (default):
  - slots wymagaja `runtimeToken`,
  - reservations wymagaja `formNonce` i (opcjonalnie) `captchaToken` zgodnie z Security Settings.
- `internal`:
  - slots/reservations wymagaja sesji admina **lub** API key z zakresem `booking.submit`,
  - nonce/captcha nie sa wymagane.

Payload runtime reservations (summary):

```json
{
  "serviceId": "uuid",
  "resourceId": "uuid",
  "startsAt": "2030-01-20T09:00:00.000Z",
  "endsAt": "2030-01-20T09:30:00.000Z",
  "timezone": "UTC",
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com",
  "customerPhone": null,
  "notes": null,
  "metadata": {
    "flowId": "booking-flow"
  },
  "formNonce": "<required in public mode>",
  "captchaToken": "<optional-recaptcha-token>"
}
```

Runtime widgets:
- `booking-calendar`:
  - renderuje service/resource/date selector + sloty,
  - publikuje selected slot event po `flowId`.
- `appointment-form`:
  - nasluchuje selected slot po `flowId`,
  - wysyla payload do `POST /api/booking/reservations`,
  - obsluguje `runtime.successMessage`.

Selected error codes:
- `booking_resource_not_found`
- `booking_service_not_found`
- `booking_slot_unavailable`
- `booking_blackout_conflict`
- `booking_service_resource_not_allowed`

## Coderso Commerce (v1 preview)

Permissions: `commerce:read`, `commerce:write`

Internal admin API (`/admin/api/*`, RBAC required):

Products:
- `GET /commerce/products`
- `GET /commerce/products/:id`
- `POST /commerce/products`
- `PATCH /commerce/products/:id`
- `DELETE /commerce/products/:id`
- `PUT /commerce/products/:id/collections`
- `POST /commerce/products/query`

Collections:
- `GET /commerce/collections`
- `GET /commerce/collections/:id`
- `POST /commerce/collections`
- `PATCH /commerce/collections/:id`
- `DELETE /commerce/collections/:id`

Product create payload (summary):

```json
{
  "title": "Starter Home",
  "slug": "starter-home",
  "status": "draft",
  "excerpt": "Compact modern home.",
  "description": "Long form description...",
  "pricing": {
    "amount": 120000,
    "currency": "USD",
    "compareAtAmount": 130000
  },
  "stock": {
    "state": "in_stock",
    "quantity": 3
  },
  "collectionIds": ["uuid"],
  "mediaIds": ["uuid"],
  "variants": [],
  "metadata": {},
  "data": {}
}
```

Products query payload (summary):

```json
{
  "filters": [
    { "field": "status", "op": "eq", "value": "published" }
  ],
  "sort": [
    { "field": "updatedAt", "dir": "desc" }
  ],
  "pagination": {
    "limit": 24,
    "offset": 0
  },
  "status": ["published"],
  "collectionIds": ["uuid"],
  "search": "starter"
}
```

Runtime behavior (v1):
- public runtime widgets (`product-gallery`, `product-compare`, `product-table`) sa hydradowane SSR przez internal services.
- v1 **nie dodaje** publicznych endpointow `/api/commerce/*`.
- checkout/cart provider contract jest warstwa service + plugin hooks (`commerce:checkout:adapters`) i nie jest public API route.

---

## Widgets

Permissions: `widgets:read`, `widgets:write`

- `GET /widgets` (catalog: core + templates)
- `GET /widgets/templates` (alias: `GET /widget-templates`)
- `GET /widgets/templates/:id` (alias: `GET /widget-templates/:id`)
- `POST /widgets/templates` (alias: `POST /widget-templates`)
- `PATCH /widgets/templates/:id` (alias: `PATCH /widget-templates/:id`)
- `DELETE /widgets/templates/:id` (alias: `DELETE /widget-templates/:id`)
- `POST /widgets/templates/:id/preview` (alias: `POST /widget-templates/:id/preview`)
- `GET /widgets/templates/:id/revisions` (alias: `GET /widget-templates/:id/revisions`)
- `POST /widgets/templates/:id/revisions/:revisionId/restore`

`GET /widgets` catalog item shape (summary):
- `id`, `source`, `name`, `description`, `category`, `variants`, `status`
- composite-first metadata:
  - `complexity`: `composite | atomic`
  - `audience`: `beginner | intermediate | advanced`
  - `module`: module key (`layout`, `content`, `forms`, `navigation`, `media`, etc.)
  - `presets[]`: optional preset metadata
  - `requires[]`: optional module dependencies

Core catalog includes utility widgets for engagement layouts:
- `tabs`
- `accordion`
- `toggle-block`

Template create/update payload (summary):

```json
{
  "name": "Homepage Hero A",
  "description": "Reusable hero stack",
  "category": "layout",
  "status": "draft",
  "blocks": [],
  "settings": {
    "layout": {
      "wrapper": {
        "container": "full",
        "padding": { "top": "none", "bottom": "none" },
        "background": { "color": "transparent", "image": null }
      },
      "sections": {
        "gap": "none",
        "defaults": {
          "container": "default",
          "padding": { "top": "xl", "bottom": "xl" },
          "margin": { "top": "none", "bottom": "none" }
        }
      }
    }
  }
}
```

`POST /widgets/templates/:id/preview` response:

```json
{
  "token": "preview-token",
  "previewUrl": "/preview?type=widget-template&token=preview-token",
  "expiresAt": "2026-02-07T12:00:00.000Z",
  "blocksCount": 3
}
```

---

## Public site rendering

Publiczne renderowanie stron działa bez `/admin`.

- `GET /` oraz `GET /:slug` → published pages
- `GET /preview?type=page&token=...` → podgląd draftu strony (token)
- `GET /preview?type=content&token=...` → podgląd draftu wpisu (token)
- `GET /preview?type=widget-template&token=...` → podgląd runtime template widgetów (token)
- `GET <content list route>` → lista wpisów dla danego content type
- `GET <content detail route>` → pojedynczy wpis (slug)

Uwaga: podgląd wymaga ważnego tokena z `/pages/:id/preview`.
Uwaga: trasy list/detail są konfigurowane przez `site.contentRoutes` (Settings).

---

## Media

Permissions: `media:read`, `media:write`

- `POST /media` (multipart)
- `GET /media`
- `GET /media/:id`
- `PATCH /media/:id`
- `DELETE /media/:id`

Runtime asset delivery:
- `GET /media/*` (public site runtime URL)
- zachowanie zalezy od `settings.storage.delivery.accessMode`.

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
    {
      "id": "1",
      "label": "Home",
      "href": "/",
      "orderIndex": 0,
      "parentId": null,
      "settings": {
        "visibility": "all"
      }
    },
    {
      "id": "2",
      "label": "About",
      "href": "/about",
      "orderIndex": 1,
      "parentId": null,
      "settings": {
        "badge": { "label": "New", "tone": "accent" },
        "description": "Company overview",
        "icon": "sparkles"
      }
    },
    {
      "id": "3",
      "label": "Team",
      "pageId": "page-uuid",
      "parentId": "2",
      "settings": {
        "visibility": "logged_in"
      }
    }
  ]
}
```

`items[].settings` (optional, normalized server-side):
- `visibility`: `all | logged_in | logged_out`
- `badge`: `{ label: string, tone?: default|accent|success|warning|danger }`
- `description`: string
- `icon`: string

---

## Coderso Engagement (v3 preview)

Permissions:
- Popups: `popups:read`, `popups:write`
- Reviews: `reviews:read`, `reviews:write`

Internal admin API (`/admin/api/*`, RBAC required):

Popups:
- `GET /popups`
- `GET /popups/:id`
- `POST /popups`
- `PATCH /popups/:id`
- `PATCH /popups/:id/status`
- `DELETE /popups/:id`

Reviews:
- `GET /reviews`
- `GET /reviews/:id`
- `POST /reviews`
- `PATCH /reviews/:id`
- `PATCH /reviews/:id/status`
- `DELETE /reviews/:id`

Notes:
- v1 engagement routes are internal-only (no public `/api/popups` / `/api/reviews` routes).
- Menu metadata (`menu_items.settings`) is exposed to navigation runtime as deterministic `items[].meta`:
  - `meta.visibility`: `all | logged_in | logged_out`
  - `meta.badge`: `{ label: string, tone: default|accent|success|warning|danger } | null`
  - `meta.description`: `string | null`
  - `meta.icon`: `string | null`

---

## Coderso Solution Kits (v3 preview foundation)

Permissions:
- `solution-kits:read` (list/detail/plan preview)
- `solution-kits:write` (apply/rollback execution)

Internal admin API (`/admin/api/*`, RBAC required):
- `GET /solution-kits`
- `GET /solution-kits/:id`
- `POST /solution-kits/plan`
- `POST /solution-kits/:id/apply`
- `POST /solution-kits/:id/rollback`
- `GET /solution-kits/runs`
- `GET /solution-kits/runs/:runId`

List/detail payload includes normalized `manifest`:
- `vertical`,
- `includes` (`contentTypes|entries|widgets|templates|forms|menus`),
- `requiredModules`, `optionalModules`, `postInstallTasks`.

Plan request payload (summary):

```json
{
  "businessType": "automotive_workshop",
  "goals": ["online_booking", "lead_generation"],
  "locale": "pl",
  "region": "PL",
  "siteName": "AutoFix Warsaw",
  "preferredKitId": "automotive-workshop"
}
```

Plan response highlights:
- deterministic `recommendedKitId` + `confidence`,
- transparent `steps[]` list (`id`, `title`, `description`, `editable`, `affectsResources`),
- `settingsPatch` preview (no side effects in this endpoint).

Install engine:
- `solution_kit_install_runs` stores one run per `dry_run` / `apply` / `rollback`,
- `solution_kit_install_items` stores per-resource operation trace (`content_type|form|page|menu`),
- idempotency keying uses resource keys (`slug` / `location`) and records rollback hints,
- apply uses additional template phase (`templateInstaller`) that upserts widget templates with deterministic collision suffixing,
- template phase rollback metadata is stored in `run.options.kitInstaller.templateRollbackPlan`,
- resource installers include nested pack sync:
  - content type taxonomy terms,
  - form fields,
  - page SEO defaults,
  - menu items (`pageSlug -> pageId` resolution),
- rollback restores nested snapshots for `update` items and removes nested data for `create` items.

Apply request payload:

```json
{
  "dryRun": false,
  "continueOnError": true,
  "plan": {
    "enabledStepIds": ["settings", "content-model", "pages", "forms", "navigation", "qa"],
    "settingsPatch": {
      "site.locale": "pl",
      "site.name": "AutoFix Warsaw"
    },
    "notes": [
      "Recommended kit: Automotive Workshop."
    ]
  }
}
```

`plan` (optional):
- `enabledStepIds`: execution scope selected in AI wizard review step,
- `settingsPatch`: planner output snapshot attached to run metadata,
- `notes`: planner notes attached to run metadata.

Rollback request payload:

```json
{
  "sourceRunId": "123e4567-e89b-12d3-a456-426614174000",
  "continueOnError": true
}
```

Runs query params:
- `kitId` (optional)
- `mode` (`dry_run|apply|rollback`, optional)
- `limit` (optional, 1..200)

Run shape (summary):
- `id`, `kitId`, `mode`, `status`,
- `actorId`, `rollbackOfRunId`,
- `options`, `summary`, `error`,
- `createdAt`, `updatedAt`, `finishedAt`.

`options.wizard` (when run started from AI wizard apply):
- `enabledStepIds`,
- `settingsPatch`,
- `notes`.

`options.manifest`:
- manifest snapshot used for this run.

`options.kitInstaller`:
- `templateInstallSummary`,
- `templateRollbackPlan`.

Item shape (summary):
- `id`, `runId`, `position`,
- `resourceType`, `resourceKey`,
- `operation`, `status`,
- `beforeSnapshot`, `afterSnapshot`, `rollbackAction`,
- `error`, `createdAt`, `updatedAt`.

Note:
- `POST /solution-kits/:id/apply` and `POST /solution-kits/:id/rollback` require `solution-kits:write`.
- Read routes require `solution-kits:read`.

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
  "delivery": {
    "accessMode": "public"
  },
  "s3": {
    "bucket": "media-bucket",
    "region": "eu-central-1",
    "endpoint": "https://s3.amazonaws.com",
    "accessKey": "AKIA...",
    "secretKey": "••••"
  }
}
```

`delivery.accessMode`:
- `public` (default) - media runtime URLs (`/media/*`) dostępne bez auth,
- `internal` - `/media/*` wymaga sesji admina lub API key scope `media.read`.
- `GET /content/:type/entries/:id`
- `PATCH /content/:type/entries/:id`
- `PATCH /content/:type/entries/:id/metadata`
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

Praktyczne schematy i relacje: `CONTENT_MODELING_COOKBOOK.md`.

Create entry payload (summary):

```json
{
  "title": "Launch announcement",
  "slug": "launch-announcement",
  "status": "draft",
  "data": {
    "title": "Launch announcement",
    "summary": "Short intro",
    "featured": true,
    "leadProject": "entry-id-123",
    "relatedProjects": ["entry-id-123", "entry-id-456"],
    "heroImage": "media-id-123",
    "gallery": ["media-id-1", "media-id-2"]
  }
}
```

Entry response fields include:
- `taxonomy` (object: `category`, `tags` with term IDs/names)
- `tags` (string[])
- `scheduledAt` (timestamp | null)
- `seo` (object with `title`, `description`, `canonicalUrl`, `robots`)

Preview response (example):

```json
{
  "token": "token",
  "previewUrl": "/preview?type=content&token=token",
  "expiresAt": "2026-01-27T10:00:00Z"
}
```

`previewUrl` w odpowiedzi moze byc relatywny albo absolutny, zgodnie z policy wyzej.

Metadata update payload (example):

```json
{
  "status": "scheduled",
  "scheduledAt": "2026-02-01T10:00:00Z",
  "taxonomy": {
    "categoryId": "term-id-123",
    "tagIds": ["term-id-555", "term-id-777"]
  },
  "seo": {
    "title": "Launch announcement",
    "description": "Short summary for search results",
    "canonicalUrl": "https://example.com/blog/launch",
    "robots": "index,follow"
  }
}
```

---

## Taxonomies (Categories/Tags)

Permissions: `content:read` / `content:write`

- `GET /content-types/:id/taxonomies`
- `PATCH /content-types/:id/taxonomies`
- `GET /content-types/:id/terms`
- `GET /taxonomies/:id/terms`
- `POST /taxonomies/:id/terms`
- `PATCH /terms/:id`
- `DELETE /terms/:id`

Taxonomy config payload (example):

```json
{
  "categories": true,
  "tags": true
}
```

Taxonomy overview response (example):

```json
{
  "taxonomies": {
    "category": { "id": "tax-id-1", "name": "Categories", "slug": "categories", "kind": "category" },
    "tag": { "id": "tax-id-2", "name": "Tags", "slug": "tags", "kind": "tag" }
  },
  "terms": {
    "categories": [{ "id": "term-1", "taxonomyId": "tax-id-1", "name": "News", "slug": "news" }],
    "tags": [{ "id": "term-2", "taxonomyId": "tax-id-2", "name": "Launch", "slug": "launch" }]
  }
}
```

---

## Search

Permissions: `content:read`

- `GET /search?q=...&limit=20`
- `GET /search/recent`

Response:

```json
{
  "items": [
    {
      "id": "page-id",
      "type": "page",
      "title": "Homepage",
      "slug": "home",
      "categoryId": "page",
      "categoryLabel": "Pages"
    },
    {
      "id": "entry-id",
      "type": "entry",
      "title": "Launch announcement",
      "slug": "launch",
      "categoryId": "entry:blog",
      "categoryLabel": "Blog"
    },
    { "id": "media-id", "type": "media", "title": "Hero banner", "categoryId": "media", "categoryLabel": "Media" }
  ],
  "categories": [
    { "id": "page", "label": "Pages", "count": 4 },
    { "id": "entry:blog", "label": "Blog", "count": 2 },
    { "id": "media", "label": "Media", "count": 1 }
  ]
}
```

Recent response (summary):

```json
{
  "items": [
    { "query": "pricing page", "createdAt": "2026-01-31T10:00:00Z" },
    { "query": "hero banner", "createdAt": "2026-01-31T09:50:00Z" }
  ]
}
```

Category labels can be overridden via settings key `search.categoryOverrides` (map of categoryId -> { label, hidden }).

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

## Dashboard (v1)

Permissions: `content:read`

Note: Dashboard payload jest agregowany po stronie backendu z danych CMS
(pages/content entries/media/users/security settings) i nie wymaga query params.

- `GET /dashboard`

Response:

```json
{
  "generatedAt": "2026-02-09T10:00:00.000Z",
  "totals": {
    "pages": 12,
    "entries": 24,
    "media": 80,
    "users": 3
  },
  "storage": {
    "usedBytes": 245760,
    "limitBytes": null,
    "usedPercent": null
  },
  "security": {
    "status": "warning",
    "issues": 1,
    "checks": [
      {
        "id": "csrf",
        "label": "CSRF protection",
        "status": "ok",
        "detail": "Enabled (x-csrf-token)."
      },
      {
        "id": "rateLimit",
        "label": "Rate limiting",
        "status": "ok",
        "detail": "Enabled (120/20)."
      },
      {
        "id": "headers",
        "label": "Security headers",
        "status": "ok",
        "detail": "Enabled (DENY, nosniff on)."
      },
      {
        "id": "sessionPolicy",
        "label": "Session policy",
        "status": "warning",
        "detail": "TTL 90d or max 10 sessions/user is too permissive."
      }
    ]
  },
  "recentEdits": [
    {
      "id": "page-id",
      "type": "page",
      "title": "Homepage",
      "path": "/",
      "status": "published",
      "updatedAt": "2026-02-09T09:00:00.000Z",
      "author": {
        "id": "user-id",
        "name": "Admin",
        "email": "admin@example.com"
      }
    }
  ]
}
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
  "settings": {
    "site.name": "Nextless",
    "site.locale": "en",
    "site.adminBaseUrl": null,
    "site.publicBaseUrl": "https://www.example.com",
    "site.adminPath": "/admin",
    "site.adminRedirectEnabled": false,
    "design.tokens": {}
  },
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
  "site.adminBaseUrl": "https://cms.example.com",
  "site.publicBaseUrl": "https://www.example.com",
  "site.adminPath": "/admin-panel",
  "site.adminRedirectEnabled": true,
  "site.homepageId": "page-id",
  "site.notFoundPageId": "page-id",
  "site.previewEnabled": true,
  "site.cacheTtlSeconds": 30,
  "auth.sessionTtlDays": 14,
  "auth.resetTtlMinutes": 60,
  "setup.completed": false,
  "site.contentRoutes": [
    { "type": "blog", "listPath": "/blog", "detailPath": "/blog/:slug", "enabled": true }
  ],
  "design.tokens": { "colors": { "primary": "#111111" } },
  "assistant.enabled": true,
  "assistant.defaultMode": "docs-only",
  "assistant.docs.backend": "db",
  "assistant.docs.sourceRoot": "_docs/_internal",
  "assistant.docs.paths": ["_docs"],
  "assistant.docs.reindexOnBoot": false,
  "assistant.llm.enabled": false,
  "assistant.llm.provider": "none",
  "assistant.llm.model": "google/gemma-3n-e2b-it:free",
  "assistant.llm.maxInputTokens": 8192,
  "assistant.llm.maxOutputTokens": 2048,
  "assistant.llm.timeoutMs": 20000,
  "assistant.quotas.requestsPerMinute": 20,
  "assistant.quotas.requestsPerDay": 1000
}
```

Response:
- `GET /settings` zwraca merged view (z defaultami).
- `design.tokens` zwracane jako resolved tokens (defaults + overrides).
- `site.adminBaseUrl` i `site.publicBaseUrl` sterują rozdzieleniem hostów admin/public.
- `site.adminPath` i `site.adminRedirectEnabled` sterują ścieżką panelu admina.
- `site.homepageId` i `site.notFoundPageId` sterują stronami start/404.
- `site.previewEnabled` włącza/wyłącza preview.
- `site.cacheTtlSeconds` kontroluje TTL cache HTML (0 = off).
- `auth.sessionTtlDays` ustawia TTL sesji logowania (zakres `1..365` dni).
- `auth.resetTtlMinutes` ustawia TTL tokenu resetu hasla (zakres `5..1440` minut).
- `setup.completed` ustawia stan pierwszej konfiguracji.
- UI mapping: `site.publicBaseUrl` jest zarzadzane w Settings -> General, a `auth.*TTL*` w Settings -> Security.
- Setup Wizard zapisuje `site.*`, `auth.*` i finalnie `setup.completed=true` jednym bulk requestem.
- `site.contentRoutes` mapuje content types na trasy (list + detail).
- `assistant.*` klucze sterują globalną konfiguracją Doc Navigatora i opcjonalnego trybu LLM.
- Alias kompatybilnosciowy: `site.baseUrl` mapuje read/write na `site.publicBaseUrl`.
- Walidacja: `assistant.defaultMode=llm-rag` wymaga `assistant.llm.enabled=true` i `assistant.llm.provider != none`.
- Walidacja: `assistant.enabled=true` wymaga niepustego `assistant.docs.paths`.
- Walidacja: `assistant.docs.sourceRoot` musi byc niepusty.

---

## User settings

Auth: wymagane zalogowanie (session cookie). Dotyczy preferencji per użytkownik.

- `GET /user-settings`
- `GET /user-settings/:key`
- `PATCH /user-settings/:key`

`PATCH /user-settings/:key`

```json
{ "value": true }
```

Przykładowe klucze:
- `pages.openAfterCreate` (bool)
- `media.openAfterUpload` (bool)
- `widgets.favorites` (string[])
- `widgets.hero.presets` (preset[])
- `assistant.mode` (`docs-only` | `llm-rag` | null)
- `assistant.ui.enabled` (bool)
- `assistant.ui.avatarEnabled` (bool)
- `assistant.ui.avatarAsset` (string | null)

---

## Assistant (Doc Navigator runtime)

Permissions:
- `settings:read` dla `GET /assistant/status` i `POST /assistant/chat`
- `settings:write` dla `POST /assistant/reindex`
- `solution-kits:read` dla `POST /assistant/site-builder/plan` i `POST /assistant/site-builder/validate`
- `solution-kits:write` dla `POST /assistant/site-builder/execute`

Endpoints:
- `GET /assistant/status`
- `POST /assistant/chat`
- `POST /assistant/reindex`
- `POST /assistant/site-builder/plan`
- `POST /assistant/site-builder/execute`
- `POST /assistant/site-builder/validate`

`retrievalBackend` moze miec wartosc `filesystem` lub `db`.

`GET /assistant/status` response

```json
{
  "enabled": true,
  "defaultMode": "docs-only",
  "retrievalBackend": "db",
  "llmAvailable": false,
  "indexReady": true,
  "indexBuilding": false,
  "indexError": null,
  "lastReindexAt": "2026-02-09T21:00:00.000Z",
  "docCount": 12,
  "chunkCount": 77
}
```

`POST /assistant/chat` request

```json
{
  "message": "where can I find hero visual settings?",
  "mode": "docs-only",
  "context": {
    "page": "widgets/templates",
    "locale": "pl"
  }
}
```

`POST /assistant/chat` response

```json
{
  "mode": "llm-rag",
  "template": "location_answer",
  "answer": "Use Hero visual settings in Block Settings > Visual tab [1].",
  "confidence": 0.76,
  "sources": [
    {
      "path": "_docs/_internal/widgets/hero-basics.md",
      "heading": "Hero widget basics > Step By Step",
      "lineStart": 20,
      "lineEnd": 38,
      "snippet": "Use visual tab to change colors and spacing.",
      "score": 2.4211
    }
  ],
  "fallbackUsed": false,
  "requestedMode": "llm-rag",
  "effectiveMode": "llm-rag",
  "retrievalBackend": "db",
  "llm": {
    "provider": "openrouter",
    "model": "google/gemma-3n-e2b-it:free",
    "providerRequestId": "gen-abc123",
    "usage": {
      "inputTokens": 512,
      "outputTokens": 174,
      "totalTokens": 686
    }
  }
}
```

`POST /assistant/reindex` request

```json
{}
```

`POST /assistant/reindex` response

```json
{
  "retrievalBackend": "db",
  "builtAt": "2026-02-09T21:05:00.000Z",
  "buildDurationMs": 84,
  "docCount": 12,
  "chunkCount": 77,
  "totalTokens": 578,
  "actorId": "user-id"
}
```

`POST /assistant/site-builder/plan` request

```json
{
  "businessType": "automotive_workshop",
  "goals": ["lead_generation", "online_booking"],
  "locale": "en",
  "siteName": "AutoFix",
  "selectedKitId": "automotive-workshop",
  "enabledStepIds": ["settings", "pages", "qa"]
}
```

`POST /assistant/site-builder/plan` response (fragment)

```json
{
  "selectedKitId": "automotive-workshop",
  "selectedKitTitle": "Automotive Workshop",
  "enabledStepIds": ["settings", "pages", "qa"],
  "actions": [
    {
      "id": "pages:page:home",
      "stepId": "pages",
      "target": "page",
      "resourceKey": "home",
      "title": "Upsert page: Home",
      "description": "Sync page data, publish state, and SEO defaults.",
      "required": true
    }
  ],
  "modules": {
    "required": ["forms"],
    "optional": [],
    "recommended": ["booking"]
  },
  "plan": {
    "recommendedKitId": "automotive-workshop",
    "confidence": 90,
    "recommendations": [],
    "steps": [],
    "settingsPatch": {},
    "notes": []
  }
}
```

`POST /assistant/site-builder/execute` request (fragment)

```json
{
  "businessType": "automotive_workshop",
  "goals": ["lead_generation", "online_booking"],
  "locale": "en",
  "selectedKitId": "automotive-workshop",
  "enabledStepIds": ["settings", "pages", "qa"],
  "dryRun": false,
  "continueOnError": true
}
```

`POST /assistant/site-builder/execute` response adds:
- `execution` (solution kit install payload)
- `validation`:
  - `runId`
  - `status` (`ok|warning|failed`)
  - `checks[]`
  - `unresolvedItems[]`

`POST /assistant/site-builder/validate` request

```json
{
  "runId": "0f7573a3-9ac9-4bc7-a492-fb11da09c37e"
}
```

`POST /assistant/site-builder/validate` response

```json
{
  "runId": "0f7573a3-9ac9-4bc7-a492-fb11da09c37e",
  "status": "warning",
  "unresolvedItems": ["No form operations were applied."],
  "checks": [
    {
      "id": "step.forms",
      "label": "Forms step",
      "status": "warning",
      "details": "No form operations were applied."
    }
  ]
}
```

Error codes:
- `assistant_disabled`
- `assistant_index_missing`
- `assistant_reindex_failed`
- `assistant_message_invalid`
- `assistant_rate_limited`
- `assistant_budget_exceeded`
- `site_builder_kit_not_found`
- `site_builder_run_not_found`
- `validation_error` (payload schema mismatch)

Uwagi:
- Message sanitization usuwa control chars i blokuje prompt-injection markers.
- Gdy żądany tryb to `llm-rag`, a LLM jest wyłączony, runtime zwraca `docs-only` z `fallbackUsed=true`.
- Gdy provider nie odpowie lub nie jest skonfigurowany, runtime zwraca odpowiedz `docs-only` oraz `llm=null`.
- Dla backendu `db` retrieval idzie najpierw po DB; fallback do filesystem aktywuje sie tylko gdy DB jest puste lub niedostepne.
- Quota enforcement dziala per user (`assistant.quotas.requestsPerMinute`, `assistant.quotas.requestsPerDay`) przed retrieval/provider call.

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
- `GET /forms/:id/actions`
- `PUT /forms/:id/actions`
- `GET /forms/:id/action-runs`
- `POST /forms/action-runs/:runId/retry`

`POST /forms`

```json
{
  "name": "Contact",
  "slug": "contact",
  "status": "draft",
  "description": "Customer support form",
  "successMessage": "Thanks for reaching out!",
  "successRedirectUrl": "/thank-you",
  "submissionAccess": "public",
  "settings": {
    "layoutMode": "single",
    "saveProgress": false,
    "stepTitles": [],
    "preset": "custom",
    "automationRetry": {
      "enabled": false,
      "maxAttempts": 1,
      "baseDelayMs": 300,
      "maxDelayMs": 2000
    }
  }
}
```

Opcjonalne pola:
- `successMessage`: fallback dla sukcesu submission (uzywane, gdy widget nie ma override).
- `successRedirectUrl`: po sukcesie przekierowuje na podany URL.
- `submissionAccess`: `public` (default) lub `internal` (wymaga sesji admina lub API key).
- `settings.layoutMode`: `single` lub `multi_step`.
- `settings.saveProgress`: runtime zapisuje postep do `localStorage`.
- `settings.stepTitles`: nazwy krokow dla multi-step.
- `settings.preset`: `custom|contact|lead_capture|service_intake`.
- `settings.automationRetry`: polityka auto-retry dla akcji automatyzacji.

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
    "settings": {
      "placeholder": "John Doe",
      "step": 1
    }
  }
]
```

`POST /forms/:id/submissions`

```json
{
  "data": {
    "full_name": "Patryk",
    "email": "patryk@example.com"
  },
  "captchaToken": "optional",
  "formNonce": "optional"
}
```

Uwaga:
- runtime widget `form-embed` wysyla JSON do `POST /forms/:id/submissions` i obsluguje `runtime.successMessage` / `runtime.redirectUrl` inline.
- bez JS endpoint nadal przyjmuje payload form-urlencoded (mapowany do `data`).

Przyklad odpowiedzi:

```json
{
  "id": "submission-id",
  "formId": "form-id",
  "payload": {
    "full_name": "Patryk",
    "email": "patryk@example.com"
  },
  "status": "new",
  "createdAt": "2026-02-18T10:00:00.000Z",
  "runtime": {
    "successMessage": "Thanks for your submission.",
    "redirectUrl": "/thank-you"
  }
}
```

`PUT /forms/:id/actions`

```json
[
  {
    "type": "success_message",
    "label": "Success message override",
    "enabled": true,
    "continueOnError": true,
    "condition": {
      "operator": "always"
    },
    "config": {
      "message": "Thanks {{submission.full_name}}!"
    },
    "orderIndex": 0
  },
  {
    "type": "webhook",
    "label": "CRM webhook",
    "enabled": true,
    "continueOnError": true,
    "condition": {
      "operator": "exists",
      "field": "email"
    },
    "config": {
      "url": "https://example.com/webhook",
      "method": "POST",
      "headers": {
        "X-Source": "nextless"
      },
      "timeoutMs": 8000,
      "includeSubmission": true
    },
    "orderIndex": 1
  }
]
```

Wspierane `type`:
- `email`
- `webhook`
- `entry_sync`
- `redirect`
- `success_message`

Wspierane operatory warunkow (`condition.operator`):
- `always`
- `equals`
- `not_equals`
- `exists`
- `not_exists`

Uwagi:
- Payload submission jest walidowany na podstawie definicji pol.
- Publiczny submit podlega rate limitowi; CSRF obowiazuje dla sesji admina.
- Publiczny submit wymaga `formNonce` (HMAC nonce). W HTML formach jest renderowany jako hidden `__nl_form_nonce`.
- Akcje formularza wykonywane sa sekwencyjnie po zapisie submission.
- Retry endpoint (`POST /forms/action-runs/:runId/retry`) dziala tylko dla runow w statusie `failed`.

---

## Plugins (installed)

Permissions: `plugins:read`, `plugins:manage`

- `GET /plugins`
- `POST /plugins/manifest/validate`

Uwagi:
- `GET /plugins` zwraca zainstalowane pluginy + snapshot contribution contract (`modules/widgets/presets/templates/routes`).
- `POST /plugins/manifest/validate` wykonuje dry-run walidacji manifestu i zwraca znormalizowany manifest.
- Walidacja obejmuje:
  - compatibility (`targetApiVersion`/`targetCoreVersion`, z aliasami legacy),
  - dependencies,
  - contribution ids i route contract.

---

## Store (browse)

Permissions: `store:browse`

- v1 core nie udostepnia jeszcze internal admin routes `/store/*`.
- Browser/listing Store jest realizowany przez dedykowany Store API (zewnetrzny kontrakt):
  - zobacz: `_docs/STORE_API.md`

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
