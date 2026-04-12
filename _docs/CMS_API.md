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
- `POST /pages/:id/autosave`
- `POST /pages/:id/preview`
- `POST /pages/:id/duplicate`
- `DELETE /pages/:id`
- `GET /pages/:id/revisions`
- `POST /pages/:id/revisions/:revisionId/restore`
- `DELETE /pages/:id/revisions/:revisionId`

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

`POST /pages/:id/autosave` payload (summary):

```json
{
  "title": "Home draft",
  "slug": "/home-draft",
  "data": {
    "schemaVersion": 1,
    "blocks": [],
    "settings": {
      "template": "landing",
      "showInNav": false
    }
  }
}
```

`POST /pages/:id/autosave` response:

```json
{
  "savedAt": "2026-03-06T12:00:00.000Z",
  "reusedRevision": false,
  "revision": {
    "id": "revision-id",
    "pageId": "page-id",
    "version": 7,
    "kind": "autosave",
    "title": "Home draft",
    "slug": "/home-draft",
    "data": { "schemaVersion": 1, "blocks": [] }
  }
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

`GET /pages/:id/revisions` returns both publish revisions and the latest autosave.

Revision item summary:

```json
{
  "id": "revision-id",
  "pageId": "page-id",
  "version": 6,
  "kind": "publish",
  "title": "Home",
  "slug": "/home",
  "data": { "schemaVersion": 1, "blocks": [] },
  "createdAt": "2026-03-06T12:00:00.000Z",
  "createdBy": {
    "id": "user-id",
    "name": "Admin",
    "email": "admin@example.com"
  }
}
```

Notes:
- `kind = autosave` is used for Page Settings snapshots created on drawer close.
- `DELETE /pages/:id/revisions/:revisionId` is supported only for autosave revisions (discard).

Preview URL resolution policy (dotyczy pages/content/widget templates):
- 1) `settings["site.publicBaseUrl"]`
- 2) `PUBLIC_BASE_URL` (ENV fallback)
- 3) request-derived `proto://host` (`x-forwarded-host` / `x-forwarded-proto` / `host`)
- 4) relative path fallback (`/preview?...`) gdy brak poprawnego base URL

Uwaga: gdy `proto` jest nieznane, domyslnie stosujemy `https`, ale dla `localhost/127.0.0.1` -> `http`.

---

## Posts

Permissions: `content:read`, `content:write`, `content:publish`

Posts API jest niezaleznym, internal kontraktem dla domeny posts:
- dane bazuja na dedykowanych tabelach `posts`, `post_revisions`, `post_preview_tokens`, `post_term_assignments`,
- brak runtime/API dependency `posts -> content_entries`,
- payloady i endpointy zostaja kompatybilne dla klienta admin (`postsClient`).

Post document contract (update `TASK-061-02` + `TASK-062`):
- `PostBlockType` zawiera typy `writing-canvas` i `toc`,
- `writing-canvas` przechowuje typed payload:
  - `version: 1`,
  - `nodes[]` (`paragraph`, `heading`, `list`, `quote`, `image`),
- heading contracts wspieraja opcjonalny `anchorId`:
  - `heading` block: `attrs.anchorId?: string`,
  - `writing-canvas` heading node: `anchorId?: string`,
- `toc` block attrs:
  - `title` (string, default: `Table of contents`),
  - `minLevel`/`maxLevel` (1..6, `maxLevel >= minLevel`),
  - `ordered` (boolean),
  - `hideIfEmpty` (boolean),
- normalizer egzekwuje deterministic limits/sanitization dla nodow i zachowuje compatibility z legacy data.

Smart paste contract (update `TASK-061-03`):
- editor normalizuje payload `text/html` i `text/plain` przez `normalizePostPastePayload`,
- Office/Docs artifacts sa usuwane przed mapowaniem (`stripPostOfficeHtmlArtifacts`),
- bezpieczny output mapuje sie do writing nodes + rich text insertion HTML,
- Word heading normalization:
  - `<h1>` z paste jest mapowane do `heading(level=1)`,
  - Word heading-like paragrafy (`MsoHeading*`, `Heading 1..6`, `mso-outline-level:1..6`) sa mapowane do odpowiadajacego `heading(level=1..6)`,
- dla payloadow duzych lub degradacji parser zwraca warningi (`html_truncated`, `fallback_to_plain_text`, `unsupported_markup_removed`, itd.).

Word TOC replacement contract (update `TASK-062-03`):
- smart paste zwraca dyrektywy i diagnostyke:
  - `directives.replaceWordTocWithDynamicToc: boolean`,
  - `diagnostics.wordTocDetectedLinks?: number`,
  - `diagnostics.wordTocRemovedNodes?: number`,
- przy wykryciu statycznego Word TOC (`href="#_Toc..."`) parser:
  - usuwa statyczne linki TOC z payloadu,
  - emituje warning `word_toc_replaced`,
  - przekazuje dyrektywe, aby editor zapewnil dynamiczny `toc` block (idempotentnie, bez duplikatow).

Clipboard image paste contract (update `TASK-061-04`):
- image clipboard uploads uzywaja internal endpointu `POST /media` (existing admin media contract),
- editor wykonuje image-only guard po stronie klienta i fallback filename dla unnamed clipboard files,
- wstawiany rich-text payload to bezpieczny `img` (`src`, `data-media-id`, `alt`, `loading`) po sanitizacji allowlist.

Image wrap layout contract (update `TASK-061-05`):
- image nodes/rich-text images wspieraja:
  - `wrap`: `none | left | right`,
  - `widthPercent`: `25 | 33 | 50 | 66 | 100`,
  - `marginPreset`: `sm | md | lg`,
- runtime renderer mapuje te pola do klas layoutu:
  - `post-image-wrap-*`, `post-image-width-*`, `post-image-margin-*`,
- mobile fallback (`<= 767px`) wymusza stacked full-width rendering niezaleznie od wrap.

Routes:
- `GET /posts`
- `POST /posts`
- `POST /posts/migration/backfill` (internal ops; permission `settings:write`)
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

Editor save behavior (update `TASK-061-09`):
- autosave i save-before-preview dzialaja jako client-side `silent sync` (bez ponownego hydrate dokumentu w editor state),
- endpointy API i payloady pozostaja bez zmian,
- full hydrate jest wykorzystywany tylko dla explicit refresh/restore konfliktow.
- QA closure (update `TASK-061-08`): lint/types + full regression suite przeszly, a kontrakt editora jest uznany za finalny.

Editor header action flow (update `TASK-063-11`):
- prawa sekcja headera utrzymuje kontrakt:
  - `Preview`,
  - `Publish`/`Update`,
  - `Gear` (`Editor settings` dialog),
- dodatkowe akcje operacyjne (`Outline`, `Details`, `Revisions`, `Focus mode`) pozostaja internal UI controls i nie zmieniaja API kontraktu,
- focus mode state jest utrzymywany lokalnie (`nextless.posts.editor.focusMode`),
- gear dialog zapisuje preference state lokalnie (`nextless.posts.editor.preferences.v2`, compatibility read/write `v1`),
- gear dialog synchronizuje preference state w tle przez `PATCH /user-settings/posts.editor.preferences` (local-first fallback),
- save lifecycle nadal korzysta z istniejących endpointow internal (`PATCH /posts/:id`, `POST /posts/:id/autosave`, `POST /posts/:id/preview`, `POST /posts/:id/publish`).

Editor outline insert flow (update `TASK-063-11-02`):
- primary insert trigger (`+`) jest przeniesiony do `Document Outline` sidebar,
- nowy source w insert resolverze: `outline-plus`,
- `outline-plus` korzysta z tego samego resolvera targetu (`resolvePostInsertMutation`) co pozostałe source modes,
- brak zmian backend/API: to wyłącznie orchestration contract w admin UI.

Editor document overview selectors (update `TASK-063-05`):
- `Document Outline` secondary sidebar ma dwa widoki:
  - `List view` (reorder/select blokow),
  - `Outline` (heading index z walidacja hierarchii),
- stats selector contract:
  - zrodlo: `PostBlockDocument`,
  - pola: `words`, `characters`, `readingTimeMinutes`, `headings`, `paragraphs`, `blocks`,
  - reading-time jest liczone deterministycznie (`ceil(words / wpm)`, domyslnie `wpm=220`, pusty dokument => `0`),
- outline contract:
  - heading sources: `heading` blocks + `writing-canvas` heading nodes,
  - warning codes: `empty_heading`, `skipped_heading_level`, `multiple_h1`,
  - anchor IDs sa generowane przez wspolny helper z runtime, wiec TOC i editor outline utrzymuja ten sam stable link model.

Editor insertion parity flow (update `TASK-063-06` + `TASK-063-11`):
- wszystkie entry points insertu (`outline-plus`, `sidebar inserter`, `slash command`) przechodza przez wspolna orkiestracje targetu:
  - `target.mode = "after-selected" | "after-block" | "index"`,
  - resolver: `resolvePostInsertMutation(...)`,
  - reducer mutation: `insert_block` z `afterId` albo `atIndex`,
- outline `+` jest primary trigger dla nietechnicznego flow, a slash insert pozostaje in-canvas szybkim skrótem authoringowym,
- focus contract po insercie:
  - editor emituje `insertFocusToken`,
  - canvas fokusuje `data-post-editor-primary-editable="true"` w nowo wybranym bloku.

Editor details context contract (update `TASK-063-11-03/04`):
- prawy inspector tabs: `Post` i `Block`,
- klik bloku (w tym media placeholdera) ustawia selekcje i przełącza context na `Block`,
- klik tła canvasu resetuje selekcje bloku i wraca do kontekstu `Post`,
- `Post` inspector flow jest uporzadkowany jako `Publishing -> Categories/Tags -> Featured image -> Danger zone`, a pola SEO/metadata sa pod `Advanced` collapse,
- `Block` inspector zachowuje ten sam kontrakt attrs, ale `Advanced` section jest collapsed by default,
- media/interactive placeholdery (`image`, `embed`, `button`) nie wymagają nowych API; używają istniejących block attrs w `PostBlockDocument`.
- aktywny tab jest deterministyczny: default z `posts.editor.preferences.defaultInspectorTab`, a ostatni tab jest odtwarzany lokalnie gdy `restoreLastSidebarsState = true`.

Danger zone contract (update `TASK-063-12-05`):
- akcja `Move to trash` korzysta z istniejacego endpointu `DELETE /posts/:id`,
- po sukcesie UI wykonuje SPA redirect do `/admin/posts` (`navigate(..., { replace: true })`),
- brak nowych endpointow i brak zmian payload contract.

Smart paste hardening (update `TASK-063-06-03`):
- heading fidelity:
  - Word heading metadata (`mso-outline-level`, heading class/style) moze nadpisac level tagu heading przed sanitizacja,
  - fallback dla paragraph heading-like styles pozostaje aktywny,
- TOC links cleanup:
  - po detekcji TOC replacement usuwane sa rowniez pozostale `href="#_Toc..."` anchors z retained nodes/list items,
  - dynamic TOC directive pozostaje idempotentna i nie duplikuje `toc` blocka.

Backfill endpoint (`POST /posts/migration/backfill`) - request payload:

```json
{
  "dryRun": true,
  "shadowRead": true,
  "entryIds": ["legacy-entry-id-1", "legacy-entry-id-2"]
}
```

Backfill semantics:
- `dryRun=true` (default): no writes, only report generation.
- `dryRun=false`: upsert `posts` + sync revisions/preview tokens/term assignments/seo.
- `shadowRead=true` (default): parity checks legacy vs post rows and mismatch reporting.
- `entryIds`: optional scoped run (useful for retry after partial failures).

Backfill response shape (summary):

```json
{
  "dryRun": false,
  "startedAt": "2026-02-22T18:00:00.000Z",
  "finishedAt": "2026-02-22T18:00:02.000Z",
  "totals": {
    "legacyPosts": 12,
    "processed": 12,
    "inserted": 10,
    "updated": 2,
    "skipped": 0,
    "failed": 0
  },
  "revisions": { "legacy": 18, "inserted": 16, "updated": 2, "existing": 0 },
  "previewTokens": { "legacy": 5, "inserted": 5, "updated": 0, "existing": 0 },
  "termAssignments": { "legacy": 7, "inserted": 7, "updated": 0, "existing": 0 },
  "mismatches": [],
  "failures": []
}
```

Error mapping (summary):
- `post_not_found` -> 404
- `post_slug_conflict` -> 409
- `post_revision_not_found` -> 404
- `post_validation_failed` -> 400

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
- `writing-canvas` jest first-class runtime payloadem:
  - nodes (`paragraph`, `heading`, `list`, `quote`, `image`) sa mapowane i renderowane bez fallbacku do legacy string fields,
  - inline image nodes zachowuja shared wrap layout semantics (`wrap`, `widthPercent`, `marginPreset`).
- dynamic TOC runtime:
  - `toc` block renderuje `content.toc.items[]` budowane z aktualnego heading index dokumentu (`heading` blocks + `writing-canvas` heading nodes),
  - link targets sa deterministyczne (`anchorId`), z deduplikacja (`intro`, `intro-2`, ...),
  - custom `anchorId` jest respektowany i tylko deduplikowany gdy wystapi konflikt,
  - dla pustego zakresu headingow renderer zwraca empty-state lub ukrywa TOC, zgodnie z `hideIfEmpty`.
- legacy posts without `data.document` are auto-coerced from legacy fields (`content`/`excerpt`) before runtime rendering.
- read-path compatibility adapter:
  - legacy text blocks (`paragraph`, `heading`, `list`, `quote`, `image`) sa grupowane do segmentow `writing-canvas` bez zapisu migracyjnego,
  - unsupported/non-convertible blocks pozostaja w legacy render path (non-destructive fallback).
- runtime diagnostics:
  - mapper zwraca `warnings[]` dla dropped/invalid runtime nodes,
  - renderer publikuje `data-post-runtime-warning-count` oraz `data-post-runtime-warnings` na root `post-runtime-blocks`.
- public list/detail dla content route typu `post/posts` jest rozwiązywany przez dedykowany posts storage (`posts*`), bez odwołania do `content_entries`.

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

Source notes:
- `entries` czyta rekordy `content_entries` (bez typow `post/posts`),
- `posts` czyta dedykowane rekordy `posts` (post-native flow).

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

`posts-feed` (TASK-059-07):
- dedykowany widget postow bez wymagania query buildera/listing template,
- source modes: `latest | featured | category | manual`,
- runtime hydration: `resolvePostsFeedRuntimeData` (SSR, public runtime),
- public output (`preview=false`) filtruje do `status=published`; preview moze pokazywac wszystkie statusy.

## Coderso Custom Screens (v1 foundation)

Permissions (internal, routes in TASK-054-22-02): `content:read`, `content:write`

Custom screen payload (summary):

```json
{
  "name": "Katalog domow",
  "contentTypeId": "content-type-id",
  "status": "draft",
  "showInSidebar": true,
  "sidebarLabel": "Katalog domow",
  "schemaVersion": 1,
  "blocks": [
    {
      "id": "section-1",
      "type": "section",
      "variant": "default",
      "data": {},
      "slots": {
        "region-1": []
      }
    }
  ],
  "bindings": [
    {
      "id": "title",
      "widgetId": "section-1",
      "propPath": "heading.title",
      "field": "title",
      "mode": "readwrite"
    }
  ]
}
```

Notes:
- `blocks` korzysta z kontraktu widget blocks i jest normalizowany przez widget schema.
- builder insert library filtruje do widget surface `custom-screen-builder`; screen-only widgets nie sa zwracane przez widget library/catalog endpoints.
- `bindings` mapuja `widgetId + propPath` do `contentType` field key.
- `schemaVersion` jest wersjonowany (aktualnie `1`).
- `showInSidebar=true` + `status=active` pozwala pokazac screen jako shortcut po grupie `Coderso` w lewym menu admina.
- `sidebarLabel` jest opcjonalny; przy braku UI uzywa `name`.
- builder preview rozwiazuje bindings przed przekazaniem blokow do `WidgetRenderer`.
- response record niesie tez derived `capabilities`:
  - `mode: "collection-only" | "dashboard" | "editor"`
  - `hasBlocks`, `hasBindings`, `hasReadableBindings`, `hasWritableBindings`
  - `supportsDedicatedPreview`, `supportsDedicatedEditor`
- admin record workflow korzysta z `capabilities`:
  - `collection-only` -> entries list shortcut + classic editor fallback,
  - `dashboard` -> read-only record screen + classic editor CTA,
  - `editor` -> dedicated screen editor with writable bound fields.
- dedicated record workflow nie dodaje nowego API `custom-screen entries`; reuse is through existing internal entry endpoints:
  - `GET /content/:type/entries`
  - `POST /content/:type/entries`
  - `GET /content/:type/entries/:id`
  - `PATCH /content/:type/entries/:id`
- admin UI routes for the workflow:
  - `/admin/coderso/custom-screens/:screenId/entries`
  - `/admin/coderso/custom-screens/:screenId/entries/:entryId`
- `contentTypeId` z custom screen jest najpierw rozwiazywany do `content_types.slug`, dopiero potem uzywany przez powyzsze entry endpoints.

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

Indexed fields (current):
- `pages`: `title`, `slug`,
- `entries`: `content_entries.title`, `content_entries.slug`, `content_entries.data.title` (bez post types),
- `posts`: `posts.title`, `posts.slug`, `posts.excerpt`, `posts.data.title`.

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

## Custom screens (Coderso)

Permissions: `content:read`, `content:write`

- `GET /custom-screens`
- `GET /custom-screens/:id`
- `POST /custom-screens`
- `PATCH /custom-screens/:id`
- `DELETE /custom-screens/:id`

List response (summary):

```json
{
  "items": []
}
```

Create payload (summary):

```json
{
  "name": "Catalog screen",
  "contentTypeId": "content-type-uuid",
  "status": "draft",
  "schemaVersion": 1,
  "blocks": [
    { "id": "section-1", "type": "section", "data": {} }
  ],
  "bindings": [
    {
      "id": "title",
      "widgetId": "section-1",
      "propPath": "title",
      "field": "title",
      "mode": "readwrite"
    }
  ]
}
```

Record shape (summary):
- `id`, `name`, `contentTypeId`, `status`, `schemaVersion`, `blocks`, `bindings`
- `createdAt`, `updatedAt`

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

Admin UI note:
- `selectedKitId` can also be persisted client-side as an admin preference to focus the `Coderso` sidebar on kit-relevant modules.
- This preference is not a dedicated persisted API resource in v1; it is an admin UI concern layered on top of list/detail payloads and kit manifests.

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
  "posts.editor.mode": "blocks",
  "setup.completed": false,
  "site.contentRoutes": [
    { "type": "blog", "listPath": "/blog", "detailPath": "/blog/:slug", "enabled": true }
  ],
  "design.tokens": { "colors": { "primary": "#111111" } },
  "assistant.enabled": true,
  "assistant.launcher.avatarEnabled": false,
  "assistant.launcher.avatarAsset": null,
  "assistant.defaultMode": "docs-only",
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
- `posts.editor.mode` przełącza edytor posts: `blocks` (domyślny Gutenberg-like) lub `classic` (legacy fallback).
- `setup.completed` ustawia stan pierwszej konfiguracji.
- UI mapping: `site.publicBaseUrl` jest zarzadzane w Settings -> General, a `auth.*TTL*` w Settings -> Security.
- Setup Wizard zapisuje `site.*`, `auth.*` i finalnie `setup.completed=true` jednym bulk requestem.
- `site.contentRoutes` mapuje content types na trasy (list + detail).
- `assistant.*` klucze sterują globalną konfiguracją Doc Navigatora i opcjonalnego trybu LLM.
- `assistant.launcher.avatar*` sterują floating launcher surface w admin UI.
- Official assistant corpus jest sourced z root `docs/` i seedowany do DB.
- Official runtime readiness wymaga seeded DB corpus; brak gotowosci nie fallbackuje do filesystem.
- Alias kompatybilnosciowy: `site.baseUrl` mapuje read/write na `site.publicBaseUrl`.
- Walidacja: `assistant.defaultMode=llm-guide` wymaga `assistant.llm.enabled=true` i `assistant.llm.provider != none`.

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
- `posts.editor.preferences` (object; `version=2`, `focusModeOnOpen`, `compactSidePanels`, `showOutlineHints`, `editorDensity`, `showKeyboardHints`, `defaultInspectorTab`, `restoreLastSidebarsState`)
- `assistant.mode` (`docs-only` | `llm-guide` | null; legacy `llm-rag` input is normalized to `llm-guide`)
- `assistant.ui.enabled` (bool; legacy compatibility)
- `assistant.ui.avatarEnabled` (bool; legacy compatibility)
- `assistant.ui.avatarAsset` (string | null; legacy compatibility)

---

## Assistant (Doc Navigator runtime)

Permissions:
- `settings:read` dla `GET /assistant/status` i `POST /assistant/chat`
- `settings:write` dla `POST /assistant/reindex`
- `settings:read` + `content:read` dla `POST /assistant/actions/plan` i `POST /assistant/actions/dry-run`
- `settings:write` + `content:write` + `content:publish` dla `POST /assistant/actions/execute`
- dodatkowo `solution-kits:read` dla `POST /assistant/actions/plan` i `POST /assistant/actions/dry-run`, gdy payload dotyczy `context.siteKit` albo `site-kit.*`
- dodatkowo `solution-kits:write` dla `POST /assistant/actions/execute`, gdy plan zawiera `site-kit.*`

Endpoints:
- `GET /assistant/status`
- `POST /assistant/chat`
- `POST /assistant/reindex`
- `POST /assistant/actions/plan`
- `POST /assistant/actions/dry-run`
- `POST /assistant/actions/execute`

Stara rodzina `/assistant/site-builder/*` jest wycofana. Site-kit planning/execution idzie przez `site-kit.*` actions w `/assistant/actions/*`.
`site-kit.*` wymaga skonfigurowanego `LLM Guide` (`llmAvailable=true`); endpoint zwraca `assistant_llm_unavailable`, gdy provider/API key nie jest gotowy.
`TASK-170-01` dodalo contract-only registry dla przyszlych rodzin akcji (`entry.*`, `menu.*`, `seo.*`, `media.*`, `form.automation.*`, `page.widget.*`, `listing-*.*`).
`TASK-170-03-01` promuje `entry.upsert-draft` do executable typed action.
`TASK-170-03-02-01` promuje `menu.item.upsert` do executable typed action dla bezpiecznych relatywnych linkow menu.
`TASK-170-03-02-02` promuje `seo.document.upsert` do executable typed action dla jawnych targetow `page` i `entry`.
`TASK-170-03-02-03` promuje `media.reference.attach` do executable typed action dla istniejacych media assetow i targetow `entry`.
`TASK-170-03-03-01` promuje `listing-query.filters.patch` do executable typed action dla patchowania `query.filters` na istniejacych listing queries.
`TASK-170-03-03-02` promuje `listing-template.card.patch` do executable typed action dla patchowania `config.card` na istniejacych listing templates.
Pozostale nowe rodziny nadal sa odrzucane przez strict action plan schema/provider draft adapter do czasu osobnych adapterow preview/execute.

`retrievalBackend` ma wartosc `db` dla official assistant corpus.

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
  "detailLevel": "instruction",
  "guideMode": "default",
  "context": {
    "page": "widgets/templates",
    "locale": "pl"
  }
}
```

`POST /assistant/chat` response

```json
{
  "mode": "llm-guide",
  "template": "location_answer",
  "detailLevel": "instruction",
  "guideMode": "default",
  "answer": "Use Hero visual settings in Block Settings > Visual tab [1].",
  "confidence": 0.76,
  "sources": [
    {
      "path": "docs/coderso/widget-template-editor.md",
      "heading": "Widget Template Editor > Instruction",
      "lineStart": 20,
      "lineEnd": 38,
      "snippet": "Use visual tab to change colors and spacing.",
      "score": 2.4211
    }
  ],
  "followUpOptions": [
    {
      "id": "followup-advanced",
      "label": "Advanced scenarios",
      "detailLevel": "advanced",
      "guideMode": "default",
      "promptHint": "Give me advanced scenarios, trade-offs, and anti-patterns."
    },
    {
      "id": "followup-troubleshooting",
      "label": "Troubleshooting",
      "detailLevel": "instruction",
      "guideMode": "troubleshooting",
      "promptHint": "Give me troubleshooting steps and likely root causes."
    }
  ],
  "fallbackUsed": false,
  "requestedMode": "llm-guide",
  "effectiveMode": "llm-guide",
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

`template` in `POST /assistant/chat` can be:
- `location_answer`
- `how_to_answer`
- `clarifying_question`
- `missing_answer`

Optional `POST /assistant/chat` request fields:
- `detailLevel` (`basic|medium|instruction|advanced`)
- `guideMode` (`default|troubleshooting|decision_guide|checklist|security`)

Docs-only answers may include:
- canonical `surface` labels based on the document title,
- numbered `What to do` steps for procedural/location guidance,
- explicit `detailLevel` and `guideMode` fields for deterministic section selection,
- `followUpOptions[]` for progressive depth/mode continuation in multi-turn chat,
- conservative clarification choices when multiple surfaces remain plausible.

Example conservative clarification response:

```json
{
  "mode": "docs-only",
  "template": "clarifying_question",
  "detailLevel": "medium",
  "guideMode": "default",
  "answer": "I am not confident which product area you mean from the docs yet.\n\nDo you mean:\n\n- Themes\n- Coderso Widgets and Template Editor",
  "confidence": 0.22,
  "sources": [
    {
      "path": "docs/screens/themes.md",
      "heading": "Themes > Step By Step",
      "lineStart": 15,
      "lineEnd": 28,
      "snippet": "Adjust global color, spacing, and typography tokens from Themes.",
      "score": 1.8442
    }
  ],
  "followUpOptions": [],
  "fallbackUsed": false,
  "requestedMode": "docs-only",
  "effectiveMode": "docs-only",
  "retrievalBackend": "db",
  "llm": null
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

Reindex refreshes the DB-backed official corpus from the current root `docs/`
tree and removes official assistant docs that no longer exist in the source
corpus.

`POST /assistant/actions/plan` request

```json
{
  "prompt": "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog",
  "context": {
    "page": "/admin/coderso/widgets",
    "locale": "pl-PL",
    "includeResourceCatalog": true,
    "runtimeSnapshot": {
      "schemaVersion": 1,
      "route": "/admin/coderso/widgets",
      "activeHref": "/admin/coderso/widgets",
      "area": "coderso",
      "codersoModule": "widgets",
      "selectedResource": null,
      "visibleActions": [
        {
          "id": "widget-template.create",
          "label": "Create widget template",
          "kind": "create",
          "href": "/admin/coderso/widgets",
          "requiredPermission": "widgets:write"
        }
      ],
      "permissionHints": {
        "known": false,
        "requiredForVisibleActions": ["widgets:write"],
        "reason": "frontend_user_has_no_permissions"
      }
    }
  }
}
```

`includeResourceCatalog=true` enrichuje server-side planning context o bounded/redacted snapshot admin resources dla `LLM Guide`.
Snapshot obejmuje content types, custom screens, listings, forms i widgets/templates.
Nie jest przyjmowany jako client-supplied `resourceCatalog`; unknown context fields sa odrzucane.
`runtimeSnapshot` jest advisory planning context; nie zastepuje route/domain RBAC.

`context.siteKit` moze byc uzyty przez AI Site Wizard jako guided entry point do tego samego action flow:

```json
{
  "prompt": "Prepare a site kit plan through LLM Guide.",
  "context": {
    "locale": "en",
    "siteKit": {
      "businessType": "automotive_workshop",
      "goals": ["lead_generation", "online_booking"],
      "locale": "en",
      "selectedKitId": "automotive-workshop",
      "enabledStepIds": ["settings", "pages", "qa"]
    }
  }
}
```

`POST /assistant/actions/plan` response (fragment)

```json
{
  "id": "plan-house-projects-catalog",
  "status": "ready",
  "intentId": "house-projects-catalog",
  "title": "House Projects Catalog",
  "answer": "I can set up a complete catalog flow for house projects in Coderso.",
  "summary": "Create a structured house-projects catalog with content model, dedicated admin surface, listing query/template, public catalog page, and detail routes.",
  "confidence": 0.91,
  "assumptions": [
    "The first release focuses on catalog setup without inquiry form automation."
  ],
  "questions": [],
  "actions": [
    {
      "id": "content-type-house-projects",
      "type": "content-type.upsert",
      "title": "Create the house projects content model",
      "description": "Provision structured fields for summaries, media, specs, pricing, and project status.",
      "input": {
        "slug": "house-projects",
        "name": "House Projects",
        "schema": {
          "type": "object",
          "additionalProperties": false,
          "properties": {}
        }
      }
    }
  ]
}
```

`POST /assistant/actions/dry-run` request

```json
{
  "plan": {
    "id": "plan-house-projects-catalog",
    "status": "ready",
    "intentId": "house-projects-catalog",
    "title": "House Projects Catalog",
    "answer": "Plan ready",
    "summary": "Plan summary",
    "confidence": 0.91,
    "assumptions": [],
    "questions": [],
    "actions": []
  }
}
```

`POST /assistant/actions/dry-run` response adds:
- `changes[]` with:
  - `actionId`
  - `type`
  - `targetType`
  - `targetKey`
  - `operation` (`create|update|noop`)
  - `summary`
  - `warnings[]`
  - `conflicts[]` with machine-readable conflict metadata
  - `dependencies[]` with previewed dependency hints
- `warnings[]`
- `readyToExecute`

`POST /assistant/actions/execute` request

```json
{
  "plan": {
    "id": "plan-house-projects-catalog",
    "status": "ready",
    "intentId": "house-projects-catalog",
    "title": "House Projects Catalog",
    "answer": "Plan ready",
    "summary": "Plan summary",
    "confidence": 0.91,
    "assumptions": [],
    "questions": [],
    "actions": []
  },
  "idempotencyKey": "assistant-house-projects-1"
}
```

`POST /assistant/actions/execute` response adds:
- `preview` (same shape as dry-run result)
- `results[]` with:
  - `actionId`
  - `type`
  - `targetType`
  - `targetKey`
  - `operation`
  - `status` (`success|failed`)
  - `resourceId`
  - `adminHref`
  - `publicHref`
  - `message`
- `summary`:
  - `create`
  - `update`
  - `noop`
  - `failed`

`idempotencyKey` is persisted for successful executions. Reusing the same key with a different actor/plan/hash returns `assistant_action_idempotency_conflict` (HTTP 409).

Site-kit action plan fragment:

```json
{
  "id": "plan-site-kit-automotive-workshop",
  "status": "ready",
  "intentId": "site-kit-install",
  "actions": [
    {
      "id": "site-kit-recommend-automotive-workshop",
      "type": "site-kit.recommend",
      "title": "Recommend Automotive Workshop",
      "input": {
        "businessType": "automotive_workshop",
        "goals": ["lead_generation", "online_booking"],
        "locale": "en",
        "selectedKitId": "automotive-workshop"
      }
    },
    {
      "id": "site-kit-install-automotive-workshop",
      "type": "site-kit.install",
      "title": "Install Automotive Workshop",
      "input": {
        "businessType": "automotive_workshop",
        "goals": ["lead_generation", "online_booking"],
        "locale": "en",
        "selectedKitId": "automotive-workshop",
        "enabledStepIds": ["settings", "pages", "qa"]
      }
    }
  ]
}
```

`site-kit.install` execution result embeds solution-kit execution and validation under `results[].details.siteKit`.

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
- Gdy żądany tryb to `llm-guide`, a LLM jest wyłączony, runtime zwraca `docs-only` z `fallbackUsed=true`.
- Gdy provider nie odpowie lub nie jest skonfigurowany, runtime zwraca odpowiedz `docs-only` oraz `llm=null`.
- Official assistant retrieval korzysta z DB-seeded corpus tylko w modelu `db`.
- Quota enforcement dziala per user (`assistant.quotas.requestsPerMinute`, `assistant.quotas.requestsPerDay`) przed retrieval/provider call.
- Official assistant docs from root `docs/` are considered available only after DB seeding/reindex.

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
