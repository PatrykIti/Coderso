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
- `POST /admin-users/invite`
- `PATCH /admin-users/:id`
- `POST /admin-users/:id/disable`
- `POST /admin-users/:id/enable`
- `PUT /admin-users/:id/roles`
- `POST /admin-users/:id/password-reset`
- `DELETE /admin-users/:id`

Create user payload (summary):

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "roleIds": ["editor"],
  "status": "pending"
}
```

Invite user payload (summary):

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "roleIds": ["editor"],
  "sendSetPasswordInvite": true
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

Password reset payload:

```json
{ "delivery": "email" }
```

Invite/reset responses return delivery status and never return the reset token:

```json
{
  "delivery": "email",
  "status": "sent",
  "expiresAt": "2026-06-01T11:00:00.000Z"
}
```

Relevant errors:

- `email_not_configured` when Settings -> Email is not configured.
- `email_send_failed` when SMTP delivery fails.
- `set_password_token_invalid`, `set_password_token_expired`,
  `set_password_token_used` on reset-confirm.

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
  "permissions": ["content:read", "content:write", "media:read"],
  "sourceRoleId": "optional-source-role-id",
  "sourceRoleName": "optional source role name"
}
```

`sourceRoleId` and `sourceRoleName` are accepted only as duplicate-role audit
context. The route strips them before persistence and records
`admin.role.duplicate` audit metadata when `sourceRoleId` is present.

Relevant role errors:

- `role_not_found` when the target role does not exist.
- `role_invalid` or `permission_invalid` for invalid payloads.
- `role_exists` on name conflicts.
- `last_admin` when a role mutation would remove the last administrator path.

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

The built-in `resend` integration is a Communication provider with one secret
field: `apiKey`. It has no configurable `baseUrl`; attempts to save unknown
Resend config keys reject as `integration_config_invalid`. Secret fields return
`value: null` with a boolean `configured` flag.

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
  "provider": "smtp",
  "smtp": {
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "user": "mailer@example.com",
    "password": "secret"
  },
  "from": {
    "name": "Coderso",
    "email": "hello@example.com"
  }
}
```

For Resend, Email Settings stores only the provider selection and sender
metadata. The Resend API key is configured through Integrations:

```json
{
  "provider": "resend",
  "from": {
    "name": "Coderso",
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
  "resend": {
    "integrationId": "resend",
    "apiKey": { "configured": false },
    "status": "disconnected"
  },
  "from": {
    "name": "Coderso",
    "email": "hello@example.com"
  },
  "status": { "provider": "smtp", "configured": true }
}
```

`provider` is strictly `smtp | resend`. Missing legacy `email.provider` rows
read as `smtp`. Unknown providers and unknown top-level fields are rejected as
`email_settings_invalid`.

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
      "subject": "Coderso email test",
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
    "schemaVersion": 2,
    "sections": [],
    "settings": {
      "template": "page-v2",
      "showInNav": true,
      "revisionRetention": 10
    }
  }
}
```

`POST /pages/:id/publish` (optional draft data)

```json
{
  "data": { "schemaVersion": 2, "sections": [] }
}
```

`POST /pages/:id/autosave` payload (summary):

```json
{
  "title": "Home draft",
  "slug": "/home-draft",
  "data": {
    "schemaVersion": 2,
    "sections": [],
    "settings": {
      "template": "page-v2",
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
    "data": { "schemaVersion": 2, "sections": [] }
  }
}
```

`POST /pages/:id/preview` payload:

```json
{
  "ttlMinutes": 60,
  "probe": true
}
```

- Pages editor preview with unsaved changes performs a client-side silent draft
  sync through `PATCH /pages/:id` before calling this endpoint. The sync writes
  `currentData` only; it does not update `publishedData`, so public visitors keep
  seeing the last published version until `POST /pages/:id/publish` succeeds.
- `ttlMinutes` is optional and remains clamped by the preview token policy.
- `probe` is optional. When `true`, the server probes only the generated preview
  URL/origin and returns UI-safe metadata; it never accepts an arbitrary URL from
  the browser.

`POST /pages/:id/preview` response:

```json
{
  "token": "preview-token",
  "previewUrl": "/preview?type=page&token=preview-token",
  "expiresAt": "2026-02-07T12:00:00.000Z",
  "probe": {
    "ok": false,
    "status": 503,
    "reason": "http_error",
    "targetLabel": "https://www.example.com/preview"
  }
}
```

`probe` is omitted when not requested or when the generated preview URL is
relative and cannot be probed server-side. Probe diagnostics redact preview
tokens and device query values.

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
  "data": { "schemaVersion": 2, "sections": [] },
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
- Fresh Page writes require `schemaVersion: 2` plus `sections[]`, reject
  unknown fields, and reject legacy/versionless `blocks[]`. Stored legacy Page
  rows are reset to an empty v2 document on read/render/preview/revision paths.

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
- dedicated media block types are accepted only with same-scope editor/runtime
  support: `image`, `embed`, `video`, `gallery`, `audio`, `file`,
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
- media block attrs are normalized before persistence/runtime:
  - `video`: `mediaId`, safe `url` fallback, bounded `caption`, `controls`,
    forced non-autoplay default,
  - `gallery`: unique `mediaIds[]` capped at 12, `columns` clamped to `2 | 3 | 4`,
    `captions`,
  - `audio`: `mediaId`, safe `url` fallback, bounded `caption`, `controls`,
  - `file`: `mediaId`, bounded `label`, `showSize`, `newTab`.

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
- focus mode state jest utrzymywany lokalnie (`coderso.posts.editor.focusMode`),
- gear dialog zapisuje preference state lokalnie (`coderso.posts.editor.preferences.v2`, compatibility read/write `v1`),
- gear dialog synchronizuje preference state w tle przez `PATCH /user-settings/posts.editor.preferences` (local-first fallback),
- save lifecycle nadal korzysta z istniejących endpointow internal (`PATCH /posts/:id`, `POST /posts/:id/autosave`, `POST /posts/:id/preview`, `POST /posts/:id/publish`).
- publish/update success and bounded error feedback is emitted through the
  shared admin action-toast adapter; the shell keeps inline editor state truthful
  and does not swallow rejected publish/update promises.

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
- `Post` inspector flow jest uporzadkowany jako `Publishing -> Categories/Tags -> Featured image -> Danger zone`, a pola SEO/metadata sa pod rozwinietym `Advanced`,
- `Block` inspector zachowuje ten sam kontrakt attrs, ale `Advanced` section jest collapsed by default,
- media/interactive placeholdery (`image`, `embed`, `video`, `gallery`,
  `audio`, `file`, `button`) nie wymagają nowych API; używają istniejących
  block attrs w `PostBlockDocument` i shared Media Library read contract.
- aktywny tab jest deterministyczny: start edytora wybiera `Post`, a klikniecie
  bloku przelacza context na `Block`.
- `Post` inspector otwiera sie domyslnie na tabie `Post`; zapisany layout moze
  odtworzyc widocznosc panelu, ale nie wymusza startowego tabu `Block`.
- `Post` inspector `Advanced` jest rozwiniety bez toggle, a `Canonical URL`
  jest auto-wypelniany z wyliczonego publicznego URL, gdy `site.publicBaseUrl`
  i route posta zawieraja `:slug`.
- `GET /posts/:id/revisions` pozostaje endpointem read-only, a admin client
  cache'uje wynik pod `posts:revisions:<id>`; autosave/publish/restore patchuja
  cache znana rewizja z odpowiedzi zamiast wymuszac pelny reload drawer.

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

`tags` are the Posts free-text tags shown in the inspector. `taxonomy.categoryId`
can be sent on its own and must not clear or replace those free-text tags.
`taxonomy.tagIds`, when explicitly provided, is the taxonomy-tag assignment
contract; in that case persisted `posts.tags` mirrors the selected taxonomy tag
names.
`scheduledAt`, when present, must be an RFC 3339 `date-time` string.

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

Autosave unexpected failure response:

- unexpected persistence/transport failures are mapped at the route boundary to
  `post_autosave_failed` with message `Could not autosave post.`;
- raw driver errors such as `CONNECTION_CLOSED`, SQL text, database hosts, or
  stack traces must not be returned to the admin browser;
- the editor must keep the autosave failure truthful and dirty until a later
  save succeeds.

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
- dedicated media runtime:
  - `video` and `audio` resolve a media-library asset by `mediaId` first, then
    a sanitized same-origin/http(s) `url` fallback, and render native playback
    controls without autoplay,
  - `gallery` resolves up to 12 media-library image assets, drops unresolved
    items from output, and clamps columns to `2 | 3 | 4`,
  - `file` resolves a media-library asset and renders a safe download/open link
    with optional size label and `noopener noreferrer` for new-tab output,
  - unresolved media references render no executable fallback markup.
- read-path compatibility adapter:
  - legacy text blocks (`paragraph`, `heading`, `list`, `quote`, `image`) sa grupowane do segmentow `writing-canvas` bez zapisu migracyjnego,
  - unsupported/non-convertible blocks pozostaja w legacy render path (non-destructive fallback).
- runtime diagnostics:
  - mapper zwraca `warnings[]` dla dropped/invalid runtime nodes,
  - renderer publikuje `data-post-runtime-warning-count` oraz `data-post-runtime-warnings` na root `post-runtime-blocks`.
- public list/detail dla content route typu `post/posts` jest rozwiązywany przez dedykowany posts storage (`posts*`), bez odwołania do `content_entries`.

---

## Coderso Listings (v1 beta)

Permissions: `content:read`, `content:write`, `content:publish`

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

Route error mapping keeps domain `ApiError` responses unchanged and maps raw
Listings sentinels at the route boundary. Stable query/template codes include
`listing_query_invalid`, `listing_query_invalid_name`,
`listing_query_invalid_source_config`, `listing_query_invalid_filter_value`,
`listing_query_update_empty`, `listing_query_not_found`,
`listing_template_invalid`, `listing_template_config_invalid`,
`listing_template_slug_exists`, and `listing_template_not_found`.

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

## Coderso Custom Screens (workspace builder V3)

Permissions (internal, routes in TASK-054-22-02): `content:read`, `content:write`

Custom screen payload (summary):

```json
{
  "name": "Katalog domow",
  "contentTypeId": "content-type-id",
  "status": "draft",
  "showInSidebar": true,
  "sidebarLabel": "Katalog domow",
  "schemaVersion": 3,
  "definition": {
    "schemaVersion": 3,
    "listView": {
      "columns": [
        {
          "id": "system-title",
          "source": "system",
          "field": "title",
          "label": "Record",
          "formatter": "text",
          "visible": true
        },
        {
          "id": "field-projectstatus",
          "source": "field",
          "field": "projectStatus",
          "label": "Project status",
          "formatter": "select",
          "visible": true
        }
      ],
      "filters": [
        {
          "id": "filter-projectstatus",
          "source": "field",
          "field": "projectStatus",
          "label": "Project status",
          "operator": "equals",
          "enabled": true
        }
      ],
      "defaultSort": { "field": "updatedAt", "direction": "desc" },
      "bulkActions": {
        "delete": true,
        "publish": true,
        "unpublish": true
      }
    },
    "editorView": {
      "saveMode": "entry",
      "interactionMode": "inline",
      "blocks": [
        {
          "id": "field-1",
          "type": "screen-field-value",
          "data": {}
        }
      ],
      "bindings": [
        {
          "id": "field-1-value",
          "widgetId": "field-1",
          "propPath": "value",
          "field": "projectStatus",
          "mode": "readwrite"
        }
      ]
    }
  }
}
```

Notes:
- `contentTypeId` pozostaje stanem rekordu `custom_screens.content_type_id`;
  persisted `definition` odrzuca top-level `contentTypeId`.
- `definition.schemaVersion=3` jest zrodlem prawdy dla aktywnego workspace
  Custom Screens.
- Legacy `schemaVersion`, `blocks`, i `bindings` pozostaja projekcjami
  `definition.editorView` oraz kompatybilnoscia dla starszych rows.
- V1/V2 rows bez gotowego V3 payloadu sa migrowane przy odczycie do V3:
  `listView` dostaje deterministyczne domyslne kolumny/filtry z wybranego
  content type, a dawne `blocks`/`bindings` trafiaja do `editorView`.
- `definition.listView` jest wlascicielem tabeli rekordow: system/field
  columns, filters, `defaultSort`, i bulk action visibility.
- `definition.editorView` jest wlascicielem canvasa create/edit:
  `blocks`, `bindings`, `saveMode: "entry"`, i `interactionMode: "inline"`.
- `blocks` korzysta z kontraktu widget blocks i jest normalizowany przez widget schema.
- builder insert library filtruje do admin surface `admin-editor-view`; public
  page builder i widget library nadal uzywaja swoich powierzchni.
- `bindings` mapuja `widgetId + propPath` do pola wybranego content type albo
  do dozwolonych system fields.
- Dla screen widgets kontrakt zapisuje tez widget-owned binding targets:
  `screen-record-header` wystawia tylko read-only props
  (`eyebrow`, `title`, `subtitle`, `description`, `badge`), a
  `screen-field-value` pozwala na write-capable binding tylko dla `value`;
  `label` i `helper` pozostaja read-only.
- screen widget editor bundles nadal uzywaja wspolnego kontraktu
  `wizard -> visual -> advanced`:
  `wizard` ustawia wariant i glowna strukture, `visual` jest binding-aware dla
  codziennej edycji tresci, a `advanced` trzyma alignment/tone oraz clearable
  chrome tokens.
- builder preview i read-only fragmenty record editora renderuja
  `definition.editorView.blocks` przez wspolny screen-widget read bridge, wiec
  ten sam payload blokow zasila preview dialog, nested layout widgets, i
  readonly runtime record surface. Inline write pozostaje zachowaniem widgetow
  takich jak `screen-field-value`, gdy `value` binding wskazuje writable field.
- `schemaVersion` jest wersjonowany; aktywna wersja workspace buildera to `3`.
- `showInSidebar=true` + `status=active` + `supportsDedicatedEditor=true`
  pozwala pokazac screen jako shortcut po grupie `Coderso` w lewym menu admina.
- `sidebarLabel` jest opcjonalny; przy braku UI uzywa `name`.
- lista `/admin/advanced/custom-screens` wzbogaca wiersze o nazwy content type
  z `contentTypes:list`, ale nie zapisuje denormalizowanych labeli do custom
  screen record.
- lista pokazuje status sidebar shortcut jako pochodna:
  `active + showInSidebar + supportsDedicatedEditor` -> visible shortcut,
  `active + showInSidebar + !supportsDedicatedEditor` -> requires editor setup,
  `draft + showInSidebar` -> configured after activation,
  otherwise -> not shown.
- create drawer na liscie wysyla tylko istniejace pola create schema:
  `name`, `contentTypeId`, `status`, `showInSidebar`, `sidebarLabel`,
  `blocks`, `bindings`.
- builder topbar uzywa `Preview`, `List View`, `Editor View`, i `Save`; aktywny
  runtime flow nie uzywa juz `Builder / Preview`, `Open records`, ani
  classic-editor / drawer branches.
- `Preview` w builderze otwiera dedykowany dialog:
  - `List View` preview pokazuje zywy widok tabeli rekordow dla aktualnej
    konfiguracji z inline header reorder controls zachowanymi w canvasie,
  - `Editor View` preview pokazuje widgetowy record surface w szerszym,
    Pages-like shell i startuje od desktop frame na first open,
  - `Editor View` preview oraz mounted builder canvas wspoldziela cached-first
    owner nad `entries:list:<typeSlug>`; przy braku rekordow albo cold-cache
    read failure UI pokazuje jawny schema-fallback note zamiast udawac realny
    rekord sample data.
- response record niesie tez derived `capabilities`:
  - `mode: "collection-only" | "dashboard" | "editor"`
  - `hasBlocks`, `hasBindings`, `hasReadableBindings`, `hasWritableBindings`
  - `supportsDedicatedPreview`, `supportsDedicatedEditor`
- `capabilities` pozostaje polem diagnostycznym/readiness, ale aktywna sciezka
  runtime dla V3 nie rozgalezia sie juz do classic editor / drawer.
- dedicated record workflow nie dodaje nowego API `custom-screen entries`; reuse is through existing internal entry endpoints:
  - `GET /content/:type/entries`
  - `POST /content/:type/entries`
  - `GET /content/:type/entries/:id`
  - `PATCH /content/:type/entries/:id`
- admin UI routes for the workflow:
  - `/admin/advanced/custom-screens/:screenId/entries`
  - `/admin/advanced/custom-screens/:screenId/entries/:entryId`
  - `/admin/advanced/custom-screens/:screenId/entries/new`
- `New record` z records workspace zawsze otwiera
  `/admin/advanced/custom-screens/:screenId/entries/new`; active V3 runtime nie
  otwiera juz shared `EntryCreateDrawer`.
- screen-owned record editor renderuje widgetowy layout jako glowny surface i
  pozwala aktywowac widgety na canvasie, a prawy panel `Selected Element`
  pokazuje bound field editors dla wybranego elementu.
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
- `POST /widgets/entry-teaser/preview` (internal admin preview hydration, permission: `content:read`)
- `POST /widgets/product-compare/preview` (internal admin preview hydration, permission: `commerce:read`)
- `POST /widgets/product-gallery/preview` (internal admin preview hydration, permission: `widgets:read`)
- `GET /widgets/templates` (alias: `GET /widget-templates`)
- `GET /widgets/templates/:id` (alias: `GET /widget-templates/:id`)
- `POST /widgets/templates` (alias: `POST /widget-templates`)
- `PATCH /widgets/templates/:id` (alias: `PATCH /widget-templates/:id`)
- `DELETE /widgets/templates/:id` (alias: `DELETE /widget-templates/:id`)
- `POST /widgets/templates/:id/duplicate` (alias: `POST /widget-templates/:id/duplicate`)
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

Internal widget preview routes:
- use the same admin session + CSRF contract as the editor surface that calls them
- accept widget-owned payloads only (`additionalProperties: false`)
- return transient preview data for the current builder canvas and do not persist resolved runtime payload into widget JSON

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

Template create/update rejects case-insensitive duplicate template names with
`widget_template_name_conflict` (HTTP 409).

`POST /widgets/templates/:id/duplicate` accepts an empty strict JSON payload and
returns the created draft template. The server loads the source template and
decides which fields are safe to copy; callers cannot supply replacement
`blocks`, `settings`, revision ids, or preview tokens. Duplicate names are
resolved intentionally with `Copy of ...` style suffixes.

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

## Detail pages (Internal Admin API)

Permissions: `content:read`, `content:write`, `content:publish`

- `GET /detail-pages`
- `GET /detail-pages/:id`
- `POST /detail-pages`
- `PATCH /detail-pages/:id`
- `DELETE /detail-pages/:id`
- `POST /detail-pages/:id/preview`
- `POST /detail-pages/:id/publish`
- `POST /detail-pages/:id/unpublish`
- `POST /detail-pages/:id/autosave`
- `GET /detail-pages/:id/revisions`
- `POST /detail-pages/:id/revisions/:revisionId/restore`
- `DELETE /detail-pages/:id/revisions/:revisionId`

List response:

```json
{
  "items": []
}
```

Create/update payload (summary):

```json
{
  "document": {
    "id": "optional-uuid",
    "name": "Products detail template",
    "contentTypeId": "content-type-uuid",
    "contentTypeSlug": "products",
    "status": "draft",
    "titlePattern": "{{ title }}",
    "seo": {
      "titlePattern": "{{ title }} | Products",
      "descriptionField": "summary",
      "imageField": "coverImage"
    },
    "settings": {
      "template": "detail",
      "layout": {}
    },
    "blocks": [],
    "bindings": []
  }
}
```

Create/update keep the editable `currentDocument` in draft mode only. Public
state changes move through:

- `POST /detail-pages/:id/publish`
- `POST /detail-pages/:id/unpublish`

Rules:

- `GET /detail-pages?contentTypeId=<uuid>` filters by stable `contentTypeId`;
  `contentTypeSlug` remains advisory response data and is refreshed from the
  canonical content type on write.
- `POST /detail-pages` may omit `document.id` for manual admin create; the
  service generates a UUID-compatible id and returns the normalized record.
- `PATCH /detail-pages/:id` keeps route param identity authoritative; a
  conflicting body id returns `detail_page_conflict`.
- `DELETE /detail-pages/:id` returns `detail_page_route_conflict` (HTTP 409)
  while the document is still referenced by `site.contentRoutes.detailPageId`.
- `POST /detail-pages/:id/preview` accepts `{ sampleEntryId, ttlMinutes? }`,
  issues only the dedicated `type=detail-page` preview token, and stores
  `sampleEntryId` server-side in `preview_tokens.context`.
- `POST /detail-pages/:id/publish` promotes the saved `current_document` into
  `published_document`, records a `publish` revision, and keeps public runtime
  behind the existing canonical route link.
- Public runtime and dedicated detail-page preview render detail-document
  `titlePattern` / `seo.titlePattern`, `seo.descriptionField`, and
  `seo.imageField` against the selected entry before falling back to entry SEO
  metadata. Title-pattern tokens are limited to safe entry meta/data paths;
  secret-like token names are rejected by the document normalizer and fail
  closed in public rendering.
- `POST /detail-pages/:id/autosave` accepts `{ document }`, records or reuses a
  single latest `autosave` revision snapshot for recovery, and does not mutate
  canonical route linkage.
- `POST /detail-pages/:id/unpublish` clears `published_document` and keeps the
  draft/current document under the same detail-page owner seam.
- `GET /detail-pages/:id/revisions` returns bounded revision metadata ordered by
  newest version first without embedding stored detail-page document snapshots.
- `POST /detail-pages/:id/revisions/:revisionId/restore` restores the chosen
  revision into `current_document` only; it must not become a second publish
  path outside the dedicated lifecycle routes.
- `DELETE /detail-pages/:id/revisions/:revisionId` discards only `autosave`
  revisions; publish revisions fail closed with
  `detail_page_revision_delete_forbidden`.
- This CRUD family manages documents only; canonical route linking remains owned
  by `setting.content-route.upsert`.
- Admin client cache keys for these routes are `detailPages:list`,
  `detailPages:list:contentType:<contentTypeId>`, and
  `detailPages:detail:<id>`; assistant `detail-page.upsert` execution results
  broadcast the same cache family as manual admin mutations.
- Manual admin editing opens the route-linked detail template at
  `/admin/advanced/engine/:contentTypeId/collection/detail-template/:detailPageId`.
  The editor uses the same `/detail-pages*` lifecycle routes plus bounded
  `entriesClient` reads for the preview sample entry; it does not own a
  separate detail-page fetch or preview transport.
- The Engine collection workspace may create the missing manual detail template
  from the canonical resource card. The browser creates a draft
  `DetailPageDocument` through `POST /detail-pages`, then links the returned id
  through the existing Site Settings `site.contentRoutes.detailPageId` owner. If
  no route exists for the content type slug, the workspace writes the same
  default route shape that Site Settings suggests: `/{slug}` and `/{slug}/:slug`.
- Workspace deletion of the canonical detail template clears the matching
  `site.contentRoutes.detailPageId` first and then calls `DELETE /detail-pages/:id`;
  this preserves the route-conflict guard while keeping the UI action
  one-click-confirmable for admins.
- The detail template editor exposes block-level Data bindings for
  `document.bindings` through the same `PATCH /detail-pages/:id` draft payload.
  Block `data` remains fallback/default content; public detail runtime overlays
  entry-specific values only through the existing `resolveDetailPageBlocks`
  binding resolver. This binding UI is detail-template scoped and does not add a
  generic Pages content-type binding contract.

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
  "collectionRole": "canonical-admin-screen",
  "compositionKey": "catalog-screen",
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
- `id`, `name`, `contentTypeId`, `status`, `collectionRole`,
  `compositionKey`, `schemaVersion`, `blocks`, `bindings`
- `createdAt`, `updatedAt`

---

## Public site rendering

Publiczne renderowanie stron działa bez `/admin`.

- `GET /` oraz `GET /:slug` → published pages
- `GET /preview?type=page&token=...` → podgląd draftu strony (token)
- `GET /preview?type=content&token=...&detailPageId=...` → podgląd wpisu, z
  opcjonalnym published detail-page override (token)
- `GET /preview?type=detail-page&token=...` → podgląd draft/current
  detail-page document z server-side sample-entry context (token)
- `GET /preview?type=widget-template&token=...` → podgląd runtime template widgetów (token)
- `GET <content list route>` → lista wpisów dla danego content type
- `GET <content detail route>` → pojedynczy wpis (slug)

Uwaga: podgląd wymaga ważnego tokena z odpowiedniego owner seam; route zwraca
`410` tylko dla wygaslych tokenow, a `404` dla disabled preview, missing target,
lub invalid/mismatched detail-page overrides.
Uwaga: trasy list/detail są konfigurowane przez `site.contentRoutes` (Settings).

---

## Media

Permissions: `media:read`, `media:write`

- `POST /media` (multipart)
- `GET /media`
- `GET /media/:id`
- `GET /media/:id/usage`
- `PATCH /media/:id`
- `POST /media/:id/dimensions/recover`
- `POST /media/:id/replace` (multipart)
- `DELETE /media/:id`

Runtime asset delivery:
- `GET /media/*` (public site runtime URL)
- zachowanie zalezy od `settings.storage.delivery.accessMode`.

Upload payload (multipart):

- `file`: binary
- `alt`: string (optional)
- `title`: string (optional)
- `caption`: string (optional)

Upload response:

- `POST /media` returns the full persisted media record (`id`, `key`, `url`,
  `originalName`, `type`, `mimeType`, `size`, dimensions when available,
  metadata, `createdAt`, and `createdBy`). Admin clients use this row as the
  authoritative cache-upsert payload.
- Admin media kind classification is MIME-driven: `image/*` -> `image`,
  `audio/*` -> `audio`, `video/*` -> `video`, and remaining files ->
  `document`.

Update metadata payload:

```json
{ "title": "Hero Banner", "alt": "Mountain landscape", "caption": "Winter view" }
```

Usage response:

```json
[
  {
    "id": "page:uuid",
    "type": "page",
    "title": "Homepage",
    "context": "Page builder content",
    "targetId": "uuid",
    "targetSlug": "homepage",
    "adminHref": "/pages/uuid"
  }
]
```

Maintenance/action notes:

- `PATCH /media/:id` accepts partial metadata and preserves omitted fields;
  explicit `null` clears a metadata value.
- `POST /media/:id/dimensions/recover` accepts `{}` and attempts bounded
  service-side dimension recovery for existing images without stored
  dimensions.
- `POST /media/:id/replace` accepts multipart `file`, validates the replacement
  with the same upload settings, preserves the media ID, and updates storage
  key/url, MIME, size, original file name, and dimensions.
- New media action payloads reject unknown fields and stay on the internal admin
  `media:read` / `media:write` permission model with CSRF for writes.

---

## Menus

Permissions: `menus:read`, `menus:write`

- `GET /menus`
- `POST /menus`
- `GET /menus/:id`
- `PATCH /menus/:id`
- `PUT /menus/:id/items`
- `DELETE /menus/:id`

Menu summary response includes:

```json
{
  "id": "menu-uuid",
  "name": "Primary",
  "location": "primary",
  "status": "published",
  "publishedAt": "2026-04-23T10:00:00.000Z",
  "createdAt": "2026-04-22T10:00:00.000Z"
}
```

Create menu payload:

```json
{ "name": "Primary", "location": "primary", "status": "draft" }
```

`status` is optional and must be `draft` or `published`. New menus default to
`draft`; existing menus are migrated as `published` for runtime compatibility.
`location` is a nullable theme/runtime slot key such as `primary` or `footer`;
create payloads include the key explicitly and may set it to `null`.

Update menu payload:

```json
{ "name": "Primary", "location": "primary", "status": "published" }
```

`PATCH /menus/:id` rejects empty payloads and unknown fields. Setting
`status: "published"` sets `publishedAt`; setting `status: "draft"` clears it.
Public runtime navigation resolves only published menus.

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
- `selectedKitId` can also be persisted client-side as an admin preference to focus the `Advanced` sidebar on kit-relevant modules.
- This preference is not a dedicated persisted API resource in v1; it is an admin UI concern layered on top of list/detail payloads and kit manifests.
- Active kit focus expands module dependencies from the Advanced module registry and keeps `custom-screens` visible for content kits that include `engine`, `entries`, and `widgets`.

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
- `enabledStepIds`: execution scope selected by the reviewed LLM Guide
  site-builder plan,
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

`options.wizard` (legacy apply snapshot; new reviewed intake UI does not expose
wizard rerun/clone controls):
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
- `POST /content-types/:id/duplicate`
- `GET /content-types/:id/collection-workspace`
- `PATCH /content-types/:id`
- `DELETE /content-types/:id`

Content type payload:

```json
{
  "name": "Blog Post",
  "slug": "blog-post",
  "status": "draft",
  "schema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

`status` is `draft` or `published`. Create defaults to `draft`; existing rows
from the TASK-202 migration were retained as `published`.

Duplicate payload accepts optional `name` / `slug`; without them the service
creates a unique `Copy of ...` draft and copies schema only, never entries.

`GET /content-types/:id/collection-workspace` is the internal Engine workspace
read model for one collection root. It requires `content:read` and returns a
bounded server-owned summary with `canonical`, `linkedSecondary`, `unresolved`,
and `candidates` buckets. It does not expose preview tokens, raw custom-screen
bindings, signed media URLs, or browser-owned canonical-link state. Canonical
route/detail/list/listing/admin-screen links resolve from `site.contentRoutes`,
`PageData.settings.collectionLink`, listing services, and custom-screen
`collectionRole` metadata; ambiguous or missing links remain unresolved with
bounded candidates, and route-derived canonical data requires `settings:read`.
The canonical detail-page candidate links to the manual detail-template editor
under the same Engine workspace route family; hover/focus prefetch warms the
workspace summary, detail-page record, and sample entries with cached reads.
When the canonical detail-page candidate is missing, the same workspace card
offers a create action that persists a draft detail template, links it through
`site.contentRoutes.detailPageId`, refreshes the workspace summary, and opens
the shared builder-style editor. Deleting the canonical detail template from the
card first clears the matching route link, then deletes the document through the
existing detail-page lifecycle route. Other canonical resource cards stay
owner-routed: list pages link to Pages, listing queries and listing templates
link to Listings, admin screens link to Custom Screens, and route rows link to
Site Settings. Missing listing queries may open the new query editor with the
current `contentTypeId` pre-filled, but persistence still happens through the
existing Listings owner routes.
TASK-190 blueprint composition consumes this same workspace/detail-page read
model for supported mixed setup follow-ups. The assistant may request
server-derived resource catalog inclusion, but clients cannot submit trusted
`resourceCatalog` payloads, and detail-page writes still execute only through
the typed `detail-page.upsert` action plus the detail-page route/service owner
seams.

Delete returns `{ "ok": true }` only after the content type dependency guard
passes. Known conflicts are mapped to HTTP 409:
`content_type_has_entries`, `content_type_has_custom_screens`,
`content_type_has_taxonomies`, `content_type_has_listings`,
`content_type_has_detail_pages`. Any
`site.contentRoutes` entry for the deleted content type slug is pruned during
delete, because Site Settings keeps default route placeholders in sync with
content types.

- `GET /content-entries`
- `GET /content/:type/entries`
- `POST /content/:type/entries`

`GET /content-entries` is the internal admin all-entries read model used by the
Entries first-screen list. It requires `content:read`, accepts no query
parameters, rejects unknown query fields, and returns entry summary fields plus
row-owned `contentType: { id, slug, name, status }`. The existing
`/content/:type/entries` route remains the type-scoped contract for editors,
widgets, relation fields, and existing clients.

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
- `POST /content/:type/entries/:id/duplicate`
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

Content entry route errors are mapped at the route boundary and remain
machine-readable for Custom Screens, Entries, and any other internal admin
client reusing these endpoints:

- `entry_validation_failed` -> HTTP 400 with bounded `validation` details when
  schema validation fails.
- `entry_slug_conflict` -> HTTP 409 with `details.field = "slug"` when the UI
  can bind the conflict to the slug input.
- `content_type_not_found`, `entry_not_found`, `media_asset_missing`,
  `relation_target_not_found`, and `relation_entry_missing` -> HTTP 404.
- `media_value_invalid`, `media_type_not_allowed`, `relation_value_invalid`,
  and `entry_duplicate_failed` -> HTTP 400. Media/relation field errors may
  also include `details.field` so admin clients can render inline field
  feedback without parsing backend-only messages.
- `auth_required` -> HTTP 401.

Preview response (example):

```json
{
  "token": "token",
  "previewUrl": "/preview?type=content&token=token",
  "expiresAt": "2026-01-27T10:00:00Z"
}
```

`previewUrl` w odpowiedzi moze byc relatywny albo absolutny, zgodnie z policy wyzej.
Shared preview URL builders wspieraja tez `detailPageId` dla `type=content`
oraz `type=detail-page` dla dedykowanego detail-template preview. Dedicated
detail-page preview przechowuje `sampleEntryId` server-side w
`preview_tokens.context`; runtime nie ufa surowym sample-entry query params.

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

Metadata status transitions to `published` require `content:publish`; ordinary
metadata writes remain under `content:write`.

Duplicate entry payload:

```json
{}
```

Duplicate creates a draft copy with a unique title/slug, copied entry data,
taxonomy assignments, tags, and SEO metadata. The source entry is not mutated.

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

`/content-types/:id/*` accepts the content type UUID and the stable content
type slug. The dedicated Posts editor uses `post`; the taxonomy service resolves
that slug to the persisted `content_types.id` before querying UUID-backed
taxonomy rows.

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

Taxonomy overview error contract:

- known taxonomy/domain errors keep their machine-readable codes;
- unexpected backend/database failures from `/content-types/:id/terms` map to
  `taxonomy_unexpected_error` with message `Could not load taxonomy terms.`;
- unknown content type slugs do not query UUID-backed taxonomy rows with raw
  slug text; taxonomy writes map missing targets to `taxonomy_not_found`;
- the Posts inspector renders safe category-load copy plus retry and must not
  display raw SQL/query text.

---

## Search

Permissions: `content:read`

- `GET /search?q=...&limit=20&dateRange=last-7-days`
- `GET /search/recent`

`dateRange` is optional and defaults to `last-7-days`. Allowed values are
`last-7-days`, `last-30-days`, `last-12-months`, and `all-time`; unknown values
return `search_date_range_invalid` with HTTP 400. Finite ranges filter page,
entry, and user `updatedAt` timestamps plus media `createdAt` timestamps.

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
  ],
  "meta": {
    "dateRange": "last-7-days",
    "hasSearchableContent": true,
    "hasQueryMatches": true,
    "hasMatchesOutsideDateRange": false,
    "returnedItems": 7
  }
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

`meta` is aggregate-only and supports Search empty states without exposing
private row data. `hasSearchableContent` is `null` only for minimum-length
requests that do not execute search.

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
  "title": "Homepage | Coderso",
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
{
  "targetType": "page",
  "targetId": "uuid",
  "checks": ["meta", "links", "robots"]
}
```

`targetType` and `targetId` are optional, but must be provided together for a
scoped audit. `checks` is optional and defaults to all supported checks. Unknown
checks are rejected with `validation_error`; an empty array is rejected before
the audit runs.

Response:

```json
{ "audited": 12 }
```

Saving `/seo/:id` recalculates `score`, `status`, and `issues` from the saved
metadata and clears the server-side public HTML cache. Public page rendering
uses SEO Manager documents as the first public source of truth for page title,
description, canonical URL, and robots directives, then falls back to published
page SEO data and page title. Detail-page explicit SEO title/description field
mappings keep precedence over entry SEO document fallbacks.

---

## Analytics (v1)

Permissions: `content:read`

Note: v1 analytics are derived from CMS data (counts + recent updates), not real traffic.

- `GET /analytics/overview?rangeDays=30`
- `GET /analytics/top-content?limit=10&rangeDays=30&type=page`
- `GET /analytics/top-content/export?limit=50&rangeDays=30&format=csv&type=page`

All Analytics endpoints are internal admin reads. They require the existing
session cookie and `content:read`; GET requests use the `admin_read` rate-limit
bucket and do not require CSRF. Query strings are strict: unknown parameters,
invalid `type`, unsupported export formats, and out-of-range `limit`/
`rangeDays` values are rejected with `validation_error`.

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

Top content is scoped to items updated inside the selected `rangeDays` window.
`type` is optional and may be `page` or `entry`. Export currently supports CSV
only and returns the file payload in a JSON envelope so the admin UI can create
the browser download:

```json
{
  "fileName": "coderso-analytics-top-content-30d-2026-01-30.csv",
  "contentType": "text/csv",
  "content": "type,title,slug,updatedAt,score\npage,Homepage,/,2026-01-30T09:00:00.000Z,90",
  "rangeDays": 30,
  "totalRows": 1
}
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

Note: v1 manual backups are CMS-managed metadata rows plus a local JSON artifact.
`POST /backups` creates the row, writes the artifact under `BACKUP_DIR` or
`storage/backups`, and returns a completed row when artifact creation succeeds.
Restore is still unsupported until a separate restore contract exists.

- `GET /backups?page=1&limit=10&query=queued`
- `POST /backups` (manual create)
- `POST /backups/:id/restore`
- `GET /backups/:id/download`
- `DELETE /backups/:id`
- `GET /backups/schedule`
- `PATCH /backups/schedule`

Create payload (optional):

```json
{
  "kind": "manual",
  "include": ["database", "media"]
}
```

`include` is optional and defaults to `["database", "media"]`. Allowed values
are `database`, `media`, and `settings`; the array must contain 1-3 unique
values. The selected option keys are accepted by the service and recorded in
audit metadata, but v1 does not persist secret values or artifact contents in
the browser/API payload.

List query:

```json
{
  "page": 1,
  "limit": 10,
  "query": "queued"
}
```

List response:

```json
{
  "items": [
    {
      "id": "backup-id",
      "status": "complete",
      "kind": "manual",
      "storageDriver": "local",
      "artifactPath": "local",
      "sizeBytes": 1048576,
      "error": null,
      "createdAt": "2026-01-30T10:00:00Z",
      "finishedAt": "2026-01-30T10:05:00Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1,
  "hasNext": false,
  "hasPrevious": false,
  "worker": {
    "mode": "internal",
    "healthy": true,
    "queuedCount": 0,
    "oldestQueuedAt": null,
    "message": "Backups are processed by the CMS."
  }
}
```

Unknown query fields are rejected. `page` must be an integer >= 1 and `limit`
must be 1-100.

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
{
  "url": null,
  "path": null,
  "fileName": "coderso-backup-backup-id.json",
  "contentType": "application/json",
  "content": "{...redacted example...}"
}
```

Download returns `backup_not_ready` for queued/running/failed/artifact-less
rows and `backup_artifact_invalid` when a completed row has a non-downloadable
artifact path outside the configured backup directory. Local CMS artifacts are
returned as JSON content with `url: null` and `path: null`; list responses and
browser cache redact local artifact paths to `artifactPath: "local"` and never
persist downloaded artifact content. Future plugin/storage integrations may
still return public `http(s)` artifact URLs.

Restore returns `backup_not_ready` until a completed artifact exists, then
`backup_restore_unsupported` until the CMS ships an explicit restore
implementation.

Delete response:

```json
{ "ok": true, "id": "backup-id" }
```

Delete removes the target metadata row and deletes the owned local artifact only
when the path resolves inside the configured backup directory.

Known backup error codes:

- `backup_not_found`
- `backup_not_ready`
- `backup_restore_unsupported`
- `backup_artifact_invalid`
- `backup_include_required`
- `backup_include_invalid`
- `backup_schedule_invalid`

---

## Import / Export (v1)

Permissions: `settings:read`, `settings:write`

- `GET /tools/export`
- `POST /tools/import/preview`
- `POST /tools/import`

Export query:

| Field | Type | Default | Notes |
|---|---|---|---|
| `target` | `full` \| `settings` \| `menus` \| `themes` \| `redirects` | `full` | Selects the export surface. Unsupported Content Types, Pages, Media, CSV, and ZIP exports are not exposed by v1. |
| `include` | comma-separated include options | target defaults | Allowed values: `settings`, `menus`, `menu-items`, `theme-profiles`, `theme-routes`, `admin-theme-templates`, `admin-theme-profiles`, `redirects`. Values must belong to the selected target. |

Example targeted export:

```http
GET /tools/export?target=menus&include=menus,menu-items
```

Export response (bundle):

```json
{
  "version": 1,
  "exportedAt": "2026-01-30T10:00:00Z",
  "scope": {
    "target": "full",
    "include": [
      "settings",
      "menus",
      "menu-items",
      "theme-profiles",
      "theme-routes",
      "admin-theme-templates",
      "admin-theme-profiles",
      "redirects"
    ]
  },
  "settings": {
    "site.name": "Coderso",
    "site.locale": "en",
    "site.adminBaseUrl": null,
    "site.publicBaseUrl": "https://www.example.com",
    "site.adminPath": "/admin",
    "site.adminRedirectEnabled": false,
    "design.tokens": {}
  },
  "menus": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "name": "Main",
      "location": "primary",
      "items": [
        {
          "id": "22222222-2222-4222-8222-222222222222",
          "label": "Home",
          "href": "/",
          "orderIndex": 0
        }
      ]
    }
  ],
  "themeProfiles": [
    {
      "id": "33333333-3333-4333-8333-333333333333",
      "name": "Default",
      "description": null,
      "themeName": "admin-default",
      "tokens": {},
      "isActive": true,
      "routes": [
        {
          "id": "44444444-4444-4444-8444-444444444444",
          "path": "/",
          "pageId": null
        }
      ]
    }
  ],
  "adminThemes": {
    "templates": [
      {
        "id": "55555555-5555-4555-8555-555555555555",
        "name": "Admin Default",
        "tokens": {}
      }
    ],
    "profiles": [
      {
        "id": "66666666-6666-4666-8666-666666666666",
        "name": "Admin",
        "templateId": "55555555-5555-4555-8555-555555555555",
        "isActive": true
      }
    ]
  },
  "redirects": [
    {
      "id": "77777777-7777-4777-8777-777777777777",
      "fromPath": "/old",
      "toPath": "/new",
      "statusCode": 301,
      "enabled": true
    }
  ]
}
```

Targeted export bundles include empty arrays/objects for omitted sections and
carry `scope`. Import preview/apply use that scope so omitted sections are not
treated as delete instructions.

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

Known import/export error codes:

- `export_target_invalid`
- `export_include_required`
- `export_include_invalid`
- `import_bundle_version_invalid`
- `import_bundle_exported_at_invalid`
- `import_*_invalid` for malformed UUID-backed IDs/references
- `theme_routes_duplicate`
- `redirects_duplicate`
- `admin_theme_template_not_found`
- `menu_item_link_invalid`
- `redirect_invalid`
- `redirect_target_external`

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

Validation and runtime contract:

- `fromPath` and `toPath` are internal path strings with a 512 character
  maximum. Both are normalized with a leading `/`; trailing slashes are removed
  except for `/`.
- `toPath` must stay internal. Absolute URLs, protocol-relative URLs, and
  backslash/network-path variants are rejected with `redirect_target_external`
  or `redirect_invalid`.
- `statusCode` accepts only `301`, `302`, `307`, and `308`.
- Duplicate `fromPath` rows return `redirect_exists`.
- Missing rows return `redirect_not_found`.
- Source-to-self redirects and redirect chains that loop return
  `redirect_loop`.
- Public runtime applies enabled redirects before page/content resolution and
  after public API, preview, and site-asset exclusions. Disabled/no-match rows
  fall through to normal public routing. Runtime loops fail closed with HTTP
  `508`.

---

## Admin log query conventions

Admin log list endpoints use strict query validation. Unknown query parameters
are rejected, `limit` is normalized through the shared Admin query helper after
raw string validation, and date query params must be RFC3339 `date-time` values
when a route accepts them. UI copy must not invent totals: exact totals may
only be shown when response metadata supplies them; otherwise copy must describe
loaded rows and cursor availability. Custom ranges must expose real `from`/`to`
inputs before they can be applied, and filter labels must match their source
(`User` for user ids, `Role` for role ids).

---

## Audit logs

Permissions: `audit:read`

- `GET /audit?limit=100`
- `POST /audit/export`
- Optional strict filters: `q=search`, `category=authentication|content|system`,
  `severity=info|warning|error`, `from`, `to`, `cursor`.
- `from` and `to` must be RFC3339 `date-time` values. Reversed ranges are
  rejected as `audit_query_invalid`.
- Cursors are opaque keyset cursors that preserve database timestamp precision.
  Malformed cursors are rejected as `audit_cursor_invalid`.

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
  ],
  "nextCursor": null
}
```

Uwaga: Admin UI korzysta z `GET /audit` do listowania logow. `limit` jest
walidowany jako dodatnia liczba calkowita i clampowany do 200 przez wspolne
konwencje query. `category` i `severity` sa deterministycznie wyprowadzane z
`action`, `targetType` i `metadata.severity`; odpowiedz jest sortowana po
`createdAt DESC, id DESC`.

`POST /audit/export` body:

```json
{
  "format": "csv",
  "columns": ["event", "actor", "resource", "timestamp", "status", "payload"],
  "filters": {
    "limit": 50,
    "query": "auth",
    "category": "authentication",
    "from": "2026-06-01T00:00:00.000Z",
    "to": "2026-06-01T23:59:59.999Z"
  }
}
```

The export route is an internal admin POST (`/admin/api/audit/export` over
HTTP), uses the global admin CSRF and `admin_write` rate-limit pipeline, and
requires `audit:read`. It rejects unknown body fields and unsupported columns.
Supported formats are `csv` and `json`; synchronous exports are limited to 200
rows. Responses use the shared admin export JSON contract:

```json
{
  "type": "file",
  "filename": "audit-logs-2026-06-01-search.csv",
  "mimeType": "text/csv",
  "content": "Event,Timestamp\ncontent.publish,2026-06-01T10:30:00.000Z"
}
```

Exported payload values are redacted recursively before serialization. CSV
output escapes commas, quotes, newlines, and formula prefixes.

---

## Access logs

Permissions:

- `audit:read` for `GET /access-logs`.
- `audit:read` for `POST /access-logs/export`.
- `settings:write` for `POST /access-logs/:id/revoke`.

- `GET /access-logs?limit=100`
- `POST /access-logs/export`
- `POST /access-logs/:id/revoke`
- Optional strict filters: `status=success|failed`, `q=search`, `userId`,
  `method`, `ip`, `from`, `to`, `cursor`.
- `from` and `to` must be RFC3339 `date-time` values. Reversed ranges are
  rejected as `access_log_query_invalid`.
- `cursor` is an opaque keyset cursor returned by the previous response.
  Malformed cursors are rejected as `access_log_cursor_invalid`.

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
      "createdAt": "2026-01-31T10:00:00Z",
      "matchContext": {
        "field": "email",
        "label": "Matched user email"
      },
      "session": {
        "state": "active",
        "label": "Active session",
        "sessionId": "session-id",
        "userId": "user-id",
        "current": false,
        "expiresAt": "2026-02-01T10:00:00Z",
        "revokedAt": null,
        "view": { "enabled": true },
        "revoke": { "enabled": true }
      }
    }
  ],
  "nextCursor": null
}
```

Uwaga: Admin UI korzysta z `GET /access-logs` do listowania. `limit` jest
walidowany jako dodatnia liczba calkowita i clampowany do 200 przez wspolne
konwencje query. Wyniki sa sortowane `createdAt DESC, id DESC`; `Next` i
`Previous` w UI korzystaja wylacznie z `nextCursor` i lokalnego stosu
zaladowanych cursorow. `matchContext` wyjasnia dopasowania query do pol, ktore
nie zawsze sa oczywiste w tabeli, bez dodawania nowych wartosci PII.

`session` opisuje deterministyczny stan sesji zwiazanej z access logiem:
`active`, `current`, `revoked`, `expired`, `none`, albo `missing`. Raw
`sessionId`, `userId`, `current`, `expiresAt`, and `revokedAt` are returned only
when the current admin also has `settings:read`; `audit:read` without settings
access sees only state and unavailable copy. `userId` lets the Settings Sessions
surface focus a linked active session that belongs to another user without
guessing from browser hints. Historical rows without `session_id` and
failed/system rows do not call session actions.

`POST /access-logs/export` body:

```json
{
  "format": "csv",
  "columns": ["user", "ip", "timestamp", "status", "path"],
  "filters": {
    "limit": 50,
    "status": "failed",
    "query": "login",
    "userId": "user-id",
    "method": "POST",
    "ip": "127.0.0.1",
    "from": "2026-06-01T00:00:00.000Z",
    "to": "2026-06-01T23:59:59.999Z"
  }
}
```

The export route is an internal admin POST (`/admin/api/access-logs/export`
over HTTP), uses the global admin CSRF and `admin_write` rate-limit pipeline,
and requires `audit:read`. It rejects unknown body fields and unsupported
columns. Supported formats are `csv` and `json`; synchronous exports are
limited to 200 rows. The body uses `query` instead of the URL `q` parameter.
Supported columns are `id`, `user`, `userId`, `method`, `path`, `status`, `ip`,
`device`, `userAgent`, `timestamp`, `durationMs`, `sessionState`, and `match`.
Raw `sessionId` is not an export column.

Responses use the shared admin export JSON contract:

```json
{
  "type": "file",
  "filename": "access-logs-2026-06-01-failed-POST-search-user-ip.csv",
  "mimeType": "text/csv",
  "content": "User,Status\nAdmin,401"
}
```

Exported `path`, `userAgent`, IP, and user labels are redacted for cookies,
authorization headers, CSRF/reset/session tokens, API keys, passwords, and raw
secret-like values before serialization. CSV output escapes commas, quotes,
newlines, and formula prefixes. Export emits `access_logs.export` with format,
selected columns, sanitized filter summary, row count, and request id only.

`POST /access-logs/:id/revoke` strict JSON body:

```json
{
  "reason": "admin_manual_revoke"
}
```

The revoke route is internal admin-only, uses the global admin CSRF pipeline and
`admin_write` rate-limit bucket, and requires `settings:write`; `audit:read`
alone is never sufficient. The browser sends only the reason. The server
resolves the target session from `access_logs.session_id`, blocks current-session
self-lockout, treats already-revoked sessions idempotently, and emits a redacted
audit event with `accessLogRef`, `revokedSessionRef`, `targetUserRef`, `reason`,
and `result`.

Known errors:

- `access_log_query_invalid`: invalid/unknown list query params.
- `access_log_cursor_invalid`: malformed list cursor.
- `access_log_export_invalid`: invalid/unknown export payload.
- `access_log_export_invalid_columns`: unsupported or empty export column
  selection.
- `access_log_export_too_large`: requested synchronous export limit is above
  the supported cap.
- `access_log_export_forbidden`: `audit:read` is missing for export.
- `access_log_revoke_invalid`: invalid revoke body or reason.
- `access_log_not_found`: access log row does not exist.
- `access_log_session_not_found`: row has no resolvable session relation.
- `access_log_session_expired`: linked session is already expired.
- `access_log_current_session_revoke_blocked`: linked session is the current
  admin session.

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
  "site.name": "Coderso",
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
    {
      "type": "blog",
      "listPath": "/blog",
      "detailPath": "/blog/:slug",
      "enabled": true,
      "detailPageId": "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c"
    }
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
- `site.contentRoutes` mapuje content types na trasy (list + detail). Settings
  -> Site automatycznie dodaje domyslne wpisy dla content types, a delete
  content type usuwa wpis odpowiadajacy jego slugowi. Route rows moga tez
  opcjonalnie przenosic `detailPageId` jako structural link do jednego
  canonical detail-page document; omitted preserves the current link, `null`
  clears it, and a string replaces it through the same settings/action seam.
  Published content routes with a linked `detailPageId` render composed
  detail-page blocks through the existing page runtime shell; content preview
  moze reuse ten canonical link albo jawny `detailPageId` override, ale tylko
  dla published detail-page document zgodnego z previewed content type. Route
  updates reuse the shared site-cache invalidation seam for cached list/detail
  HTML; routes without the link stay on the legacy entry-detail renderer.
- `assistant.*` klucze sterują globalną konfiguracją Doc Navigatora i opcjonalnego trybu LLM.
- `assistant.launcher.avatar*` sterują floating launcher surface w admin UI.
- Official assistant corpus jest sourced z root `docs/` i seedowany do DB.
- Official runtime readiness wymaga seeded DB corpus; brak gotowosci nie fallbackuje do filesystem.
- Alias kompatybilnosciowy: `site.baseUrl` mapuje read/write na `site.publicBaseUrl`.
- Walidacja: `assistant.defaultMode=llm-guide` wymaga `assistant.llm.enabled=true` i `assistant.llm.provider != none`.

Settings route error contract:

- known settings validation errors keep stable codes such as
  `settings_key_invalid`, `settings_value_invalid`, and `design_tokens_invalid`;
- unexpected backend/database failures map to `settings_error` with message
  `Could not complete settings request.`;
- raw SQL/query text, driver messages, database hosts, stack traces, tokens, or
  secrets must not be returned to the admin browser for `GET /settings`,
  `GET /settings/:key`, storage/security settings reads, or settings writes.

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
- `customScreens.openAfterCreate` (bool)
- `forms.openAfterCreate` (bool)
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
- `settings:read` + `content:read` dla `POST /assistant/actions/plan`
- dodatkowo `widgets:read` dla `POST /assistant/actions/plan`, gdy
  `context.activeSurface.kind` to `widget-template` albo `detail-page`; aktywne
  Pages v2 uzywaja tylko sekcji/blokow atomowych i nie hydratuja template refs
- `POST /assistant/actions/dry-run` i `POST /assistant/actions/execute`
  egzekwuja per-action permissions z registry kontraktow zamiast dokladac
  jeden szerszy wspolny bundle write/read dla wszystkich action families
- dodatkowo `solution-kits:read` dla `POST /assistant/actions/plan`, gdy
  payload zawiera reviewed `context.siteBuilderIntakeState.activeSession`, oraz
  dla `POST /assistant/actions/dry-run`, gdy plan zawiera `site-kit.*`
- dodatkowo `solution-kits:write` dla `POST /assistant/actions/execute`, gdy plan zawiera `site-kit.*`

Endpoints:
- `GET /assistant/status`
- `POST /assistant/chat`
- `POST /assistant/reindex`
- `POST /assistant/actions/plan`
- `POST /assistant/actions/dry-run`
- `POST /assistant/actions/execute`

Stara rodzina `/assistant/site-builder/*` jest wycofana. Site-kit planning/execution idzie przez reviewed `LLM Guide` intake i `site-kit.*` actions w `/assistant/actions/*`.
`site-kit.*` wymaga skonfigurowanego `LLM Guide` (`llmAvailable=true`); endpoint zwraca `assistant_llm_unavailable`, gdy provider/API key nie jest gotowy.
`TASK-170-01` dodalo contract-only registry dla przyszlych rodzin akcji (`entry.*`, `menu.*`, `seo.*`, `media.*`, `form.automation.*`, `page.widget.*`, `listing-*.*`).
`TASK-170-03-01` promuje `entry.upsert-draft` do executable typed action.
`TASK-170-03-02-01` promuje `menu.item.upsert` do executable typed action dla bezpiecznych relatywnych linkow menu.
`TASK-170-03-02-02` promuje `seo.document.upsert` do executable typed action dla jawnych targetow `page` i `entry`.
`TASK-170-03-02-03` promuje `media.reference.attach` do executable typed action dla istniejacych media assetow i targetow `entry`.
`TASK-170-03-03-01` promuje `listing-query.filters.patch` do executable typed action dla patchowania `query.filters` na istniejacych listing queries.
`TASK-170-03-03-02` promuje `listing-template.card.patch` do executable typed action dla patchowania `config.card` na istniejacych listing templates.
`TASK-170-03-03-03` historycznie promowal `page.widget.patch` dla widgetowych Page rows; TASK-417 wycofuje te akcje z Pages.
`TASK-170-03-03-04` promuje `form.automation.upsert` do executable typed action dla bezpiecznych non-webhook form actions; webhook automation pozostaje poza zakresem do czasu jawnej obslugi sekretow.
`TASK-170-03-04` domyka executor adapter wave: `/assistant/actions/dry-run` i `/assistant/actions/execute` egzekwuja action-specific permissions z registry kontraktow bez dokladania jednego szerszego endpoint-level write bundle ponad sam action family contract.
`TASK-174-03-01` promuje `custom-screen.delete` do executable typed action dla custom screenow rozwiazanych z server-side resource catalog context; execute ponownie sprawdza id/name/prefix przed usunieciem.
`TASK-174-03-02` promuje `page.delete` do executable typed action dla aktywnej strony; execute ponownie sprawdza id/title/slug/status przed usunieciem.
`TASK-174-03-03` promuje `widget-template.delete` do executable typed action dla aktywnego reusable widget template; dry-run ostrzega o blast radius, a execute sprawdza id/name/status/category przed usunieciem.
`TASK-174-03-04` promuje `entry.delete` i `content-type.delete` do executable typed actions; content type delete jest blokowany, gdy server-side catalog raportuje istniejace entries.
`TASK-174-03-05` promuje `listing-query.delete` i `listing-template.delete` do executable typed actions; dry-run/execute blokuje usuniecie, gdy page/widget-template reference scan nadal widzi zalezne referencje.
`TASK-174-03-06` promuje `form.delete` i `form.archive` do executable typed actions; hard delete jest blokowany, gdy formularz ma submissions, a archiwizacja zachowuje historie submissions bez ujawniania payloadow.
`TASK-174-03-07` promuje `menu.item.delete` i `seo.document.delete` do executable typed actions; menu item delete zachowuje niezalezne elementy drzewa menu, a SEO delete usuwa tylko dokument SEO bez usuwania target page/entry.
`TASK-174-04-01` promuje `page.update` do executable typed action dla aktywnej strony; akcja edytuje title/slug/status/settings i zachowuje niepowiazane Page data.
`TASK-174-04-02` historycznie rozszerzal `page.widget.patch`; po TASK-417 Page mutations ida przez `page.upsert` z `sections[]` albo metadata-only `page.update`.
`TASK-174-04-03` promuje `widget-template.update` i `widget-template.block.patch` do executable typed actions dla aktywnego reusable widget template; page-instance vs reusable-template ambiguity zwraca `needs_input`.
`TASK-174-04-04` promuje `custom-screen.update` i `custom-screen.widget.patch` do executable typed actions dla aktywnego custom screen; binding target jest rozpoznawany po `widgetId + propPath + field`, bez ujawniania entry payloadow.
`TASK-190-06-01` przenosi kompozycje katalogowych admin review screens do `blueprintAdminSurfaceComposer`: helper sklada istniejace `screen-*` custom-screen blocks, waliduje referencje do pol content schema, odrzuca secret-like field refs i nadal zwraca obecny `custom-screen.upsert` `blocks` / `bindings` payload bez nowego layout DSL.
`TASK-190-06-02` przenosi binding composition do `blueprintBindingComposer` i rozszerza obecny custom-screen owner seam o top-level `collectionRole` / `compositionKey`; `custom-screen.upsert` oraz `custom-screen.update` moga przenosic te pola przez strict action schema, executor i `customScreenService` bez assistant-only metadata store.
`TASK-174-04-05` promuje `entry.update`, `form.update`, `listing-query.update`, `listing-template.update`, `menu.item.update` i `seo.document.update` do executable typed actions; wszystkie mutacje ida przez istniejace domain services i zachowuja unrelated fields/config.
`TASK-190-05-03-05` promuje `detail-page.upsert` do executable typed action dla strict detail-page documents; execute przechodzi przez content-domain owner seam, odswieza `contentTypeSlug` z canonical content type, respektuje `DetailPageDocument.status` jako jedyny owner publish state, i nie przejmuje route-link ownership od `setting.content-route.upsert`.
`TASK-190-07-02` dodaje catalog-backed no-duplicate matcher przed handoffem do strict executor path: bounded resource catalog zawiera bezpieczne detail-page summaries, page `collectionLink` metadata, custom-screen `collectionRole` / `compositionKey`, media summaries bez raw/signed payloadow, a matcher przepisuje wspierane create-like akcje na istniejace stable ids albo zwraca blocking conflict dla niejednoznacznych query/screen/media kandydatow. W executorze istnieje tylko compatibility fallback dla pojedynczego exact-name custom screena bez `collectionRole` i bez `compositionKey`; ekran o tej samej nazwie z innymi metadanymi pozostaje konfliktem zaleznosci zamiast silent reuse.
`TASK-190-05-03-08` promuje `detail-page` do generic CMS operation vocabulary tylko jako bounded resource-context seam: provider guidance/package metadata moga opisywac `detail-page`, target resolver akceptuje zaufane id, stable `contentTypeId`, exact route/content-type linkage albo aktywny detail-template surface, a generic `detail-page` mutation pozostaje policy-gated bez nowej sciezki wykonawczej poza lokalnym `detail-page.upsert`.
`TASK-174-05-01` historycznie dodawal read-only active page template-section inspection. Po TASK-417 Pages v2 nie hydratuja widget-template refs z Page data i nie wymagaja `widgets:read`; template reference summaries pozostaja przy aktywnych widget templates/detail-page surfaces.
`TASK-174-05-02` historycznie obslugiwal template-backed page widget edits. Po TASK-417 Pages nie zawieraja `template-section`; reusable-template prompts nadal moga isc do `widget-template.block.patch`, a Page instance edits musza byc planowane jako `page.upsert`/`page.update`.
`TASK-174-06-01` aktualizuje admin review/result UI dla resource operations: preview pokazuje operation badges, destructive/blocked states i warningi, execute pokazuje partial counts i redaguje secret-like dynamic text.
`TASK-180` rozszerza generic CMS operation mapping o counted multi-target delete/archive/update oraz jawne multi-create z `mutation.patch.items[]`; kazda mutacja nadal mapuje sie do istniejacych strict typed actions i wymaga review/dry-run/execute. Assistant execute invaliduje znane admin cache keys dla successful non-noop CMS action results, w tym pages, entries, content types, custom screens, forms, listings, widget templates, menus i SEO.
`TASK-172-02` dodaje lead capture blueprint pack: prompt o stronie kontaktowej/leadowej moze zwrocic plan `form.upsert` + prosty `page.upsert` z embedem formularza.
`TASK-172-03` dodaje gated booking blueprint pack: prompt bookingowy zwraca `needs_input`, dopoki nie powstana dedykowane booking action adapters.
`TASK-172-04` dodaje product inquiry pack: produktowy katalog z formularzem zapytania jest executable, ale checkout/payment prompt zwraca `needs_input` do czasu dedykowanych adapterow commerce.
`TASK-172-06` dodaje editorial content hub pack: prompt blogowy tworzy strone z `posts-feed`, bez mutowania rekordow posts.
Pozostale contract-only rodziny nadal sa odrzucane przez strict action plan schema i provider operation-draft mapping do czasu osobnych adapterow preview/execute. Provider nie moze zwrocic `actions[]` jako executor payloadu; akcje musza zostac zrekonstruowane lokalnie z poprawnego `CmsOperationDraft`, exact `resourceKey`, policy lookup, resolvera i mappera. Provider draft z unknown fields, `actions[]`, null/missing ambiguous `resourceKey` albo malformed shape jest odrzucany zamiast naprawiany.

Declared capability limits:
- `docs-only` remains read-only and never returns executable action plans.
- `LLM Guide` can execute only strict typed actions listed in `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`, after plan/dry-run/review/execute.
- Executable business setup currently covers catalog-family packs, lead capture site, product inquiry catalog, portfolio case study, editorial content hub, and `site-kit.recommend/install/validate`.
- Booking resources, checkout/payment, webhook form automation, fine-grained
  existing Page section/block patch actions beyond `page.upsert` /
  `page.update`, `menu.structure.patch`, bulk/sample entry creation, field
  patching, and installed solution-kit refinements remain gated follow-up
  capabilities.
- No assistant action endpoint supports arbitrary code execution or autonomous mutation outside the reviewed execute flow.

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
    "page": "/admin/advanced/widgets",
    "locale": "pl-PL",
    "includeResourceCatalog": true,
    "runtimeSnapshot": {
      "schemaVersion": 2,
      "route": "/admin/advanced/widgets",
      "activeHref": "/admin/advanced/widgets",
      "area": "advanced",
      "advancedModule": "widgets",
      "selectedResource": null,
      "visibleActions": [
        {
          "id": "widget-template.create",
          "label": "Create widget template",
          "kind": "create",
          "href": "/admin/advanced/widgets",
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
Snapshot obejmuje pages, detail pages, content types, custom screens, listings, forms, menus, SEO documents, media, commerce, solution kits i widgets/templates.
Nie jest przyjmowany jako client-supplied `resourceCatalog`; unknown context fields sa odrzucane.
Generic provider planning package zawiera bounded `detailPages` obok istniejacych
pages/posts/entries/media/commerce/solution-kit grup; dodanie `detail-page` nie
usuwa zadnej dotychczasowej grupy. Dopasowanie detail-page uzywa stable
`contentTypeId` / exact ids jako preferowanych kluczy, a route-facing slugi i
`linkedRouteType` sa traktowane jako kompatybilne etykiety, nie fuzzy nazwy.
Collection workspace follow-up uses the same boundary: the browser may send only
`context.collectionWorkspaceHint` with `contentTypeId` plus optional
`activeDetailPageId`. Client-supplied `context.collectionWorkspace` summaries
are rejected; the route hydrates that package server-side from
`GET /content-types/:id/collection-workspace` semantics before provider
packaging.
`runtimeSnapshot` jest advisory planning context; nie zastepuje route/domain RBAC.
Generic CMS operation planning uses the same route and can return strict read-only `inspection` metadata for resource candidate lists. Those responses have `actions: []`, are not executable, and are used for prompts such as "czy widzisz strone X" or "jakie ekrany widzisz z prefixem Y".
Action plan responses may include `responseKind`:
- `docs`: non-mutating planner guidance, rendered as an assistant message,
- `inspection`: read-only candidate list, no dry-run/execute,
- `action_plan`: reviewable typed actions,
- `needs_input`: clarification required before planning,
- `gated`: unsupported or blocked capability.
Generic mutation planning maps resolved CMS operation drafts to existing typed
actions where a safe action contract already exists. Unsupported resources,
ambiguous targets, missing field values, or broad destructive prompts return
`needs_input` rather than arbitrary patches.
For composed setup requests, compatible `content-type.upsert` fragments can now
merge server-side into one schema-validated action; incompatible field types or
secret-like defaults still fail closed and surface typed conflict/needs-input
behavior instead of broad schema patches.
Compatible listing facet arrays and listing-template card bindings can also
merge server-side against that composed schema owner; when they require extra
runtime projection fields, the assembler widens `listing-query.upsert.fields`
automatically. Missing facet/card source paths still fail closed through typed
`facet_field_missing` needs-input behavior.
Detail-page binding resolution now lives under the content-domain owner seam in
`detailPageBindingResolver.ts`: validated documents can bind entry fields, entry
meta, `detailHref`, `formContext`, and `relatedItems` into widget props without
minting a second route, form, or related-query contract.
The generic action mapper must also find an executable action and field mapping
in `assistantOperationPolicy`; strict action schemas remain the final validator
for every returned action. Bulk/count and filtered-all destructive behavior is
evaluated by policy safety rules before any multi-action plan is returned.
Generic CMS operation drafts can include `surfaceHint` and allowlisted `filters`.
Resource aliases, filter aliases, surface-only read fallback, OR-term matching,
and count words are resolved through `assistantOperationPolicy` via
`operationPolicy/resolverPolicy.ts`. Surface hints such as `Screens`, `Engine`,
`Admin UI`, `menu`, or `Pages` are planner location hints and are not resource
names. Filters are limited to fields declared by the resource policy; unsupported
filters fail closed instead of widening candidate sets. Policy entries own aliases
such as `opublikowane`, `publiczny`, `widoczne`, `layout`, and `limit`.
The legacy CMS resource registry has been removed; policy lookup is the source of
truth for generic CMS planning.
TASK-188 final validation kept the OpenAI/OpenRouter live assistant matrix green
after the policy cutover.
When the active admin surface is `Pages > :id`, `activeSurface` includes a bounded Page v2 canvas summary with page identity, selected section id, optional selected block id, section ids/types/block summaries, and warnings such as unsaved local changes. The server normalizes/redacts this context before planning.
For active Page surfaces, planning hydration revalidates page identity server-side and does not hydrate widget-template refs from Page data. Page mutations use `page.upsert` sections or `page.update`; `page.widget.patch` is rejected for Pages.
When the active admin surface is `Advanced > Widgets > Templates > :id`, `activeSurface` may include a bounded widget template summary with template identity, selected block id, block id/type/path summaries, slot keys, template-section references, wrapper/section settings summary, and remote-update warnings.
When the active admin surface is `Advanced > Custom Screens`, `activeSurface` may include a bounded custom screen summary with screen identity, canonical `collectionRole` / `compositionKey` metadata, capabilities mode, selected entry id, selected block id, block summaries, bindings, writable field names, and unsaved/remote-update warnings.
When the active admin surface is
`Advanced > Engine > :contentTypeId > Collection > Detail Template`, the
detail-template editor may publish `activeSurface.kind = "detail-page"` through
the existing browser active-surface transport. The route keeps
`runtimeSnapshot.selectedResource.kind = "content-type"` for the workspace
shell, derives only the bounded `collectionWorkspaceHint`, then rehydrates
`collectionWorkspace` and detail-page identity server-side before planning.
Before planning, the route rehydrates active surface identity server-side. Active pages/custom screens require `content:read`; active Pages v2 do not require `widgets:read`; active widget templates require `widgets:read`; active detail pages require `content:read` plus `widgets:read` for retained template-reference summaries. If the server-side resource is missing, active surface context is dropped.

Reviewed site-builder intake uzywa `context.siteBuilderIntakeState.activeSession`.
Bezposrednie `context.siteKit` nie jest publicznym/admin payloadem dla
`POST /assistant/actions/plan` i jest odrzucane przez schema validation:

```json
{
  "prompt": "Create a complete website for my business.",
  "context": {
    "locale": "en",
    "siteBuilderIntakeState": {
      "activeSession": {
        "version": 1,
        "mode": "basic",
        "currentStepId": "review",
        "answers": [
          {
            "stepId": "business-profile",
            "values": {
              "siteName": "Studio Forma",
              "entityName": "Studio Forma",
              "vertical": "architecture studio",
              "locale": "en"
            }
          }
        ]
      }
    }
  }
}
```

The route session shape is intentionally stripped to
`version/mode/currentStepId/answers`; facts, review metadata, provider text,
secrets, signed URLs, and compiled `siteKit` input stay backend-owned.
After a reviewed Advanced intake is compiled server-side, the internal
`AssistantSiteKitPlanInput` may include optional `advancedRuntimeOverrides` for
existing menu/Navigation, Hero, and section widget surfaces. Raw
`advancedLayout`, reference design briefs, arbitrary URLs, CSS, prompt text,
provider output, and review gates remain outside request payloads and outside
the executable action input.

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
Successful execute responses may include `idempotency: { "replayed": boolean, "scope": "actor_plan_hash" }` so support can distinguish fresh execution from safe replay without exposing stored payload internals.
Fresh successful executions also persist sanitized undo manifest items server-side. The manifest records assistant-owned resource provenance and fingerprints for future cleanup planning; no cleanup endpoint is exposed in this slice.

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
- `assistant_action_plan_invalid`
- `assistant_action_plan_not_ready`
- `assistant_action_idempotency_required`
- `assistant_action_idempotency_conflict`
- `assistant_action_actor_required`
- `assistant_action_dependency_missing`
- `assistant_action_dependency_conflict`
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
- `POST /forms/:id/submissions` (public submit; mounted both through the
  admin API router and the public site request handler)
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
- `status`: `draft`, `published` albo `archived`; inne wartosci sa odrzucane
  na granicy route schema.
- `successMessage`: fallback dla sukcesu submission (uzywane, gdy widget nie ma override).
- `successRedirectUrl`: po sukcesie przekierowuje tylko na same-origin relative
  path (`/thank-you`, z opcjonalnym query/hash). Absolute, protocol-relative i
  `javascript:` URL sa odrzucane przed zapisem.
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
      "formStep": 1,
      "inputStep": 1
    }
  }
]
```

Top-level keys in each field input are strict (`id`, `type`, `label`, `name`,
`required`, `orderIndex`, `settings`). Flexible per-field extension data must
stay inside `settings`.

Field settings use `formStep` for multi-step placement and `inputStep` for
number/range/time input increments. Legacy `settings.step` is preserved as a
non-destructive form-step adapter and is not interpreted as an input increment.

Known Forms errors are returned as machine-readable API errors:
- `form_invalid` -> 400,
- `form_name_required` -> 400,
- `form_slug_exists` -> 409,
- `form_not_found` -> 404,
- `form_delete_restricted` -> 409 when retained submissions or action-run
  diagnostics block hard delete,
- field validation errors such as `form_fields_invalid`,
  `form_field_invalid`, `form_field_label_required`,
  `form_field_id_duplicate`, and `form_field_name_duplicate` -> 400,
- submission payload errors such as `form_payload_invalid`,
  `form_payload_unknown_field`, and `form_payload_required` -> 400,
- `form_success_redirect_url_invalid` -> 400 when a form-level success redirect
  is not a same-origin relative path.

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
- runtime widget `form-embed` wysyla JSON do `POST /forms/:id/submissions` i
  obsluguje `runtime.successMessage` / `runtime.redirectUrl` inline.
- public Form Embed submissions use the Forms access evaluator, strict
  reject-unknown validation, the `public_write` rate-limit bucket keyed by form
  id, and the signed form nonce (`formId.timestamp.HMAC`) projected only at
  runtime. Optional bot protection remains backend-owned.
- widget-level success copy has precedence over `runtime.successMessage` when
  configured. `runtime.redirectUrl` is followed only when it is a same-origin
  relative URL.
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
        "X-Source": "coderso"
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

Permissions: `content:read`

- `GET /search?q=...&limit=20&dateRange=last-7-days`

---

## Audit logs

Permissions: `audit:read`

- `GET /audit`
- `POST /audit/export`
- Optional strict filters: `limit`, `q`, `category`, `severity`, `from`, `to`,
  `cursor`
- Export body filters use `query` instead of `q`, plus `format` (`csv`/`json`)
  and allowlisted `columns`.

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
