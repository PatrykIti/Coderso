# TASK-517: Entry Visibility — Public Front Enforcement

# FileName: TASK-517_Entry_Visibility_Front_Enforcement.md

**Priority:** High
**Category:** Content / Security / Public Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-514 (Entries editor — ships the `content_entries.visibility` model:
`public` | `private` | `password` + hashed `access_password`, persisted + surfaced in
admin, respected in the admin editor only; front enforcement was explicitly DEFERRED to
this task). TASK-514-01 added both columns to `core/db/tables/content.ts` (`visibility` @
`content.ts:48`, `accessPassword` @ `content.ts:49`, re-exported via `core/db/schema.ts:28`);
the public read loaders (now in `core/services/content/entryReadService.ts`, re-exported by
`entryService.ts`) already expose `visibility` + a DERIVED `hasPassword` boolean (the raw
hash is deliberately never selected into a render projection).
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** 2026-07-06

---

## Overview

TASK-514 added a per-entry **visibility** field (`public` | `private` | `password`) and a
write-only hashed `access_password`, and its owner-confirmed scope was
**persist + surface + respect-in-admin** with the public front-render enforcement
**deferred to this dedicated task** so 514 stays a UI/UX + model task and the
security-sensitive render-path gating gets its own focused contract, tests, and audit.

TASK-517 enforces visibility on the **public render path** so non-public entries are
actually protected when served to visitors:

- **`public`** — unchanged: rendered to everyone (keeps the existing 30 s public HTML
  cache behavior).
- **`private`** — requires an authenticated (admin / logged-in) render context. An
  anonymous request gets a fail-closed **uniform 404** — byte-identical to the existing
  not-published 404 (`new Response("Not Found", { status: 404 })`) — so a private slug
  never leaks its existence (never 401/403). Preview / admin-authenticated render
  BYPASSES the gate.
- **`password`** — a password-prompt gate: the entry body is withheld until the visitor
  submits the correct password, verified server-side against the entry's hashed
  `access_password` via the existing `verifyPassword` helper (`core/services/auth/password.ts`);
  the hash is NEVER sent to the client. On success a short-lived **HMAC-signed unlock
  cookie scoped to the entry id** unlocks it (stateless — no new table). While locked and
  not-yet-unlocked, a dedicated 200 password-prompt page is served (a distinct, acceptable
  fail state — password entries are meant to be discoverable-but-locked).

## Grounded render-path map (verified on disk 2026-08-14, HEAD f75343de)

- Dispatcher: `core/server/publicSite.tsx` (`handlePublicRequest` @ `:672`; the pure HTML
  renderers are `core/site/renderPublicEntry.tsx` + `core/site/renderPublicPage.tsx`).
  There is NO `core/site/publicSite.tsx` (that path does not exist).
- Cache read happens FIRST (BEFORE dispatch): cache key
  `buildSiteCacheKey(cacheProfileId, slugPath, searchSignature.signature)` @ `:888`,
  `shouldUseCache` const @ `:878`, and the read block @ `:889-894`
  (`if (shouldUseCache) { const cachedHtml = getSiteCacheEntry(cacheKey); if (cachedHtml)
  return buildHtmlResponse(cachedHtml); }`). It is keyed ONLY on path + searchSignature — it
  does NOT vary on auth or the unlock cookie, which is exactly why gated entries must be
  cache-exempt (517-03).
- Dispatch was refactored away from an inline `if (match)` block into
  `resolvePublicSiteRouteTarget` (`core/server/publicSiteRoutePrecedence.ts:11-18`) +
  explicit `routeTarget` branches. In `handlePublicRequest`: `contentRoutes =
  getSetting("site.contentRoutes")` @ `:916`, `match = matchContentRoute(slugPath,
  contentRoutes)` @ `:917`, `page = match?.mode === "detail" ? null :
  getPageBySlug(slugPath)` @ `:918`, `hasPublishedStaticPage` @ `:919`, `routeTarget =
  resolvePublicSiteRouteTarget(match, hasPublishedStaticPage)` @ `:920`, then the
  `content-detail` (@ `:922`), `static-page` (@ `:944`), `content-list` (@ `:960`) and
  final 404 (@ `:973`) branches.
- `renderEntryDetailHtml(typeSlug, routeValue, options)` @ `:352`. Options object @
  `:355-366` (additive seam: thread the auth/preview flag + parsed unlock-cookie values
  here; `requestPath`/`requestOrigin` ALREADY exist and are threaded at the detail call
  site @ `:932-933`).
  - **Post branch — NOT gated.** `if (!options?.preferGenericEntry &&
    isPostContentTypeSlug(typeSlug))` @ `:370`; loads via `getPost`/`getPostBySlug`
    (`:371`) returning `PostDetail` (`core/services/content/postsService.ts`) from the
    SEPARATE `posts` table, which has NO `visibility`/`access_password` — those columns
    exist ONLY on `content_entries` (`core/db/tables/content.ts:48-49`). Gating this branch
    would 404 every post for anon visitors, so the post render (`:378-397`) is left
    untouched. (Gating posts would require first extending the posts model — a separate
    514-scope task.)
  - **Generic branch — the ONLY gated branch.** `contentType = getContentTypeBySlug` @
    `:400`; `entryDetail` resolved via `getEntry(routeValue)` (`:405`, id route) or
    `getEntryBySlug(contentType.id, routeValue)` → published guard → `getEntry(entry.id)`
    (`:407-412`, slug route). The resolved `entryDetail` published guard
    `if (!options?.preview && !isEntryPublished(entryDetail)) return null;` @ `:416` → gate
    slots in AFTER it (covering the linked-detail-page AND default-generic sub-branches).
    `entryDetail` already carries `visibility` + `hasPassword` (`EntryDetail`,
    `entryTypes.ts:20-21`).
  - Gate returns `null` → the caller emits the uniform 404: detail branch @ `:935`
    (`if (!detailHtml) return new Response("Not Found", { status: 404 });`).
  - **List branch — ALSO gated (no existence leak via enumeration).** The
    `routeTarget === "content-list"` branch @ `:960-971` calls `renderEntryListHtml`
    (`:282`), which for generic types lists via `listEntries(contentType.id)` (`:321`) and
    paginates through `paginateEntryListEntries` (`:320`) — which filters ONLY by
    `isEntryPublished` (`core/server/publicSiteRouteRuntime.ts:71`), NOT by `visibility`. So
    a PUBLISHED `private`/`password` entry would otherwise appear in the auto entry-list
    route with its title + detail href (`buildDetailHref`, `:327`), enumerable by any
    anonymous visitor even though its detail page 404s. That contradicts the "never expose
    whether a private entry exists" invariant below, so 517-01-L05 filters non-`public`
    entries out of the list branch for the anon (non-content-read) path, mirroring the
    detail gate's authed bypass. `listEntries` already projects `visibility`
    (`entryReadService.ts:24` select / `:63` mapped row; `hasPassword` @ `:25`), so no
    extra fetch is needed.
- The unlock-cookie value must be parsed from `req.headers` in `handlePublicRequest(req)`
  (`:672`, which HAS `req`) and threaded into the `renderEntryDetailHtml` options at the
  detail call site (`:926-934`), OR the gate is enforced at that call site —
  `renderEntryDetailHtml` does not currently receive the `Request`.
- Public read loaders (`core/services/content/entryReadService.ts`, re-exported by
  `entryService.ts:25-32`): `listEntries(typeId)` (`:84`), `getEntry(id)` (`:149`),
  `getEntryBySlug(typeId, slug)` (`:173`) — ALL project `visibility` + a DERIVED
  `hasPassword` (`sql\`... is not null\``), NONE select the raw `access_password` hash.
  **Do NOT widen these.** Password verification needs a NARROW server-only helper
  `getEntryAccessPasswordHash(entryId)` that selects ONLY the hash, invoked EXCLUSIVELY by
  the unlock-submit endpoint.

## Coordination (pinned facts)

- **Changelog number:** closure creates `_docs/_CHANGELOG/1280-*.md` — live changelog
  entries exist through 1273 and 1274 is reserved for TASK-559, so **1280 is the pinned
  next-free number** for 517's closure (the old contract's 1230/1236 pins were STALE and
  are corrected here). Only the closure subtask (517-03) edits `_docs/_TASKS/*` +
  `_docs/_CHANGELOG/*`.
- **Branch/worktree:** dedicated `task/stream-517` worktree (HEAD f75343de). 517 depends on
  514's shipped model (`content_entries.visibility` + `access_password` in
  `core/db/tables/content.ts:48-49`).
- **No DB migration of its own** — reuses 514's `content_entries.visibility` +
  `access_password` columns. The signed-unlock token is a **stateless HMAC-signed cookie**
  (mirror `core/services/forms/submissionNonce.ts` + the secure-cookie machinery in
  `core/server/httpServer.ts` / `sessionService.ts`), NOT a new table.
- **Shared REMOTE test DB** — scoped fixtures, no truncation; render/route tests seed +
  clean their own rows (unique slugs, per-test teardown, no cross-suite row-count
  coupling). Test lane = **Bun** for the render/route path.

## Security Contract

- **Endpoint visibility:** public — this changes the PUBLIC entry render path
  (`renderEntryDetailHtml` dispatch in `publicSite.tsx`, incl. the post-content-type +
  generic-entry-detail branches; the pure `renderPublicEntryDetailHtml` in
  `renderPublicEntry.tsx` is unchanged) and adds a NEW public **password-submit** endpoint
  `POST /entries/:id/unlock` for the `password` gate.
- **Fail-closed:** unknown/unresolved visibility → treat as the most restrictive; never
  render a `private`/`password` body without passing the gate. `private` anonymous →
  uniform 404 (byte-identical to not-published; no existence leak, never 401/403).
  Preview / admin-authenticated render BYPASSES the gate (already authorized).
- **Password gate:** verify submitted password against `access_password` hash server-side
  with `verifyPassword(hash, submitted)` (argument order: HASH FIRST); the hash is NEVER
  sent to the client and NEVER widened into a render projection (narrow
  `getEntryAccessPasswordHash` reads it only for the submit path). On success, set a
  short-lived **HMAC-signed** unlock cookie scoped per entry id (payload
  `${entryId}.${timestamp}`, sha256-hex signature, dedicated env secret `ENTRY_UNLOCK_SECRET`,
  verify with `timingSafeEqual` + TTL ~12 h; cookie name `entry_unlock_<entryId-hash>`,
  flags `HttpOnly; Secure(per COOKIE_SECURE/NODE_ENV); SameSite=Strict; Path=/;
  Max-Age=<ttl>`). The submit endpoint is a public write: `public_write` rate-limit bucket
  + strict reject-unknown validation (`additionalProperties:false`) + bot/DNT-neutral.
- **No secret/PII leak:** never expose whether a private entry exists — enforced on the
  detail path (private-anon → uniform 404, byte-identical to not-published), the auto
  entry-list path (517-01-L05), the public search path (`/api/search`,
  `searchIndexService.ts:152-168` → 517-01-L06), and the static-page listing-block path
  (`listingSources.ts:43-74` → 517-01-L06) — a `private`/`password` entry is NOT
  enumerable via any anonymous surface (title + detail href filtered out). The list
  no-enumeration invariant also holds on the CACHE path: 517-01-L05 suppresses the list
  cache WRITE for an authed content:read render (`setSiteCacheEntry` gated on
  `shouldUseCache && !isAuthenticated`, `publicSite.tsx:967-969`) so the authed FULL-list
  body — which carries gated titles/hrefs — can never be written under the
  auth-independent cache key and served to anonymous visitors; only the anon public-only list
  body is ever cached. Never expose the password hash, never confirm which entries exist from the unlock
  endpoint's failure responses.
- **Caching:** `private` + `password` entries are FULLY cache-exempt on BOTH read and
  write — the shared `siteCache` read (`publicSite.tsx:889-894`) happens BEFORE route
  dispatch keyed only on path + searchSignature (it does NOT vary on the unlock cookie), so
  a locked page could otherwise serve a previously-cached unlocked body (and vice-versa).
  The WRITE side is closed from the first landed leaf: 517-01-L03 returns `{ html,
  cacheable:false }` for gated `allow` renders (including the authed/preview bypass), so an
  authed render can never poison the shared anon-served cache — no fail-open window exists
  after 01+02 land but before 03. 517-03 then bypasses the cache READ for gated routes and
  adds the canonical auth-independent `routeIsGatedEntry` short-circuit (belt-and-braces on
  both read AND write). Only `public` entries keep the existing 30 s public HTML cache.

## Sub-Tasks

| ID | Title | Priority | Effort | Status |
|----|-------|----------|--------|--------|
| TASK-517-01 | Visibility resolver + private auth-gate on the public render path | High | Medium | ⏳ To Do |
| TASK-517-02 | Password gate: unlock-cookie util + submit endpoint + prompt UI | High | Medium | ⏳ To Do |
| TASK-517-03 | Cache exclusion + gate-matrix tests + docs & closure | Medium | Medium | ⏳ To Do |

### Leaf inventory

- **TASK-517-01** (6 leaves):
  - 517-01-L01 — pure visibility resolver (`resolveEntryVisibilityGate`) + unit tests.
  - 517-01-L02 — narrow `getEntryAccessPasswordHash` server-only loader (additive; no
    widening of `getEntry`/`getEntryBySlug`).
  - 517-01-L03 — render-path gate insertion in `renderEntryDetailHtml` + option/auth
    threading in `handlePublicRequest` (permission-bounded `content:read` bypass).
  - 517-01-L04 — private-anon fail-closed uniform-404 Bun render tests (public renders,
    private 404-anon / renders-authed; non-`content:read` session does NOT bypass;
    gated-allow cache non-write at BOTH detail exits).
  - 517-01-L05 — list-branch visibility filter: drop non-`public` entries from the auto
    entry-list route (`renderEntryListHtml`/`paginateEntryListEntries`) for the anon
    (non-`content:read`) path, mirroring the detail gate's bypass, so a `private`/`password`
    entry is not enumerable (title + detail href) via the list — closing the existence-leak the
    detail-only gate would otherwise leave open. Bun list-leak test (gated entry NOT in anon list
    body; present when content:read-authed). No DB migration; `listEntries` already projects
    `visibility`.
  - 517-01-L06 — public-vector visibility filters: drop non-`public` entries from the
    anonymous public search index (`/api/search`, `searchIndexService.ts:152-168`) AND the
    static-page listing-block entries source (`listingSources.ts:43-74`) so a
    `private`/`password` entry is not enumerable via either anonymous surface (see the parent
    no-existence-leak invariant). DB-backed Bun tests for both vectors.
- **TASK-517-02** (4 leaves):
  - 517-02-L01 — HMAC unlock-cookie sign/verify util (`entryUnlockToken.ts`) + unit tests.
  - 517-02-L02 — `POST /entries/:id/unlock` endpoint (`handlePublicEntryUnlockApi`):
    validation + rate-limit + narrow hash fetch + verify + Set-Cookie + 302.
  - 517-02-L03 — password-prompt UI (locked-body withholding) + unlock-cookie consumption
    in the gate.
  - 517-02-L04 — password flow Bun tests (wrong → rejected, right → unlocks, unlocked
    serves body, tampered cookie rejected).
- **TASK-517-03** (single closure subtask, no leaves): cache exclusion (read + write) for
  gated entries, the full gate-matrix Bun test aggregate, docs (SECURITY_SPEC +
  PAGE/ENTRY model note), and closure under changelog 1280.

Land order strictly sequential **01 → 02 → 03**; each leaf is single-writer with documented
additive seams. Each subtask carries execution-ready pseudocode, a Security Contract
restatement (route-touching), the correct Bun test lane, and shared-DB safety. Run the
standard pipeline (author → drift-audit → sequential implement with gates → post-audit →
runtime smoke of every gate state: public renders, private 404-anon / renders-authed,
password prompt → wrong → right → unlocked, tampered cookie rejected) before closure.
