# TASK-517: Entry Visibility — Public Front Enforcement

# FileName: TASK-517_Entry_Visibility_Front_Enforcement.md

**Priority:** High
**Category:** Content / Security / Public Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-514 (Entries editor — ships the `content_entries.visibility` model:
`public` | `private` | `password` + hashed `access_password`, persisted + surfaced in
admin, respected in the admin editor only; front enforcement was explicitly DEFERRED to
this task). TASK-514-01 added both columns to `core/db/schema.ts` (`visibility` @
`schema.ts:792`, `accessPassword` @ `schema.ts:793`); the public read loaders already
expose `visibility` + a DERIVED `hasPassword` boolean (the raw hash is deliberately never
selected into a render projection).
**Status:** ⏳ To Do
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

## Grounded render-path map (verified on disk 2026-07-07)

- Dispatcher: `core/server/publicSite.tsx` (NOT the stale `core/site/publicSite.tsx` —
  that path does not exist). The pure HTML renderer is `core/site/renderPublicEntry.tsx`.
- Branch selection: `renderEntryDetailHtml(typeSlug, routeValue, options)`
  (`publicSite.tsx:1213`). Options object at `:1216-1225` (additive seam: thread the
  auth/preview flag + parsed unlock-cookie values here). The post-content-type vs generic
  split: `if (!options?.preferGenericEntry && isPostContentTypeSlug(typeSlug))` (`:1229`).
  - **Post branch — NOT gated.** Loads via `getPost`/`getPostBySlug` (`:1230`) returning
    `PostDetail` (`postsService.ts:116-139`) from the SEPARATE `posts` table
    (`schema.ts:870-892`), which has NO `visibility`/`access_password` — those columns exist
    ONLY on `content_entries` (`schema.ts:792/793`). Gating this branch would 404 every post
    for anon visitors, so the post render (`:1232-1237`) is left untouched. (Gating posts
    would require first extending the posts model — a separate 514-scope task.)
  - **Generic branch — the ONLY gated branch.** Loads via `getEntryBySlug` (`:1265`) then
    `getEntry` (`:1263/:1270`); existing published guard at `:1274` (`entryDetail`) → gate
    slots in AFTER it (covering the linked-detail-page AND default-generic sub-branches).
    The loaded `entryDetail` already carries `visibility` + `hasPassword` (proven by their
    use in the detail-page runtime calls further down).
  - Gate returns `null` → the caller emits the uniform 404 (`publicSite.tsx:1766` for the
    generic detail path via `handlePublicRequest`, `:1751` for list).
  - **List branch — ALSO gated (no existence leak via enumeration).** The `match.mode==='list'`
    dispatch (`publicSite.tsx:1746-1755`) calls `renderEntryListHtml` (`:1145`), which for generic
    types lists via `listEntries(contentType.id)` (`:1183`) and paginates through
    `paginateEntryListEntries` (`:1110`) — which filters ONLY by `isEntryPublished` (`:1116`), NOT
    by `visibility`. So a PUBLISHED `private`/`password` entry would otherwise appear in the auto
    entry-list route with its title + detail href (`buildDetailHref`, `:1189`), enumerable by any
    anonymous visitor even though its detail page 404s. That contradicts the "never expose whether
    a private entry exists" invariant below, so 517-01-L05 filters non-`public` entries out of the
    list branch for the anon (non-content-read) path, mirroring the detail gate's authed bypass.
    `listEntries` already projects `visibility` (`entryService.ts:448` select / `:487` mapped row;
    `hasPassword` @ `:449`/`:488`), so no extra fetch is needed.
- The unlock-cookie value must be parsed from `req.headers` in `handlePublicRequest(req)`
  (`:1507`, which HAS `req`) near the content-route match (`:1744-1766`) and threaded into
  the `renderEntryDetailHtml` options at the call site (`:1759-1765`), OR the gate is
  enforced at that call site — `renderEntryDetailHtml` does not currently receive the
  `Request`.
- Public read loaders (`core/services/content/entryService.ts`): `getEntry(id)` (`:618`),
  `getEntryBySlug(typeId, slug)` (`:690`), `listEntries` (`:448`) — ALL project
  `visibility` + a DERIVED `hasPassword` (`sql\`... is not null\``), NONE select the raw
  `access_password` hash. **Do NOT widen these.** Password verification needs a NARROW
  server-only helper `getEntryAccessPasswordHash(entryId)` that selects ONLY the hash,
  invoked EXCLUSIVELY by the unlock-submit endpoint.

## Coordination (pinned facts)

- **Changelog number:** closure creates `_docs/_CHANGELOG/1236-*.md` — 1235 is TAKEN
  (522); the highest on disk at authoring is 1235, so **1236 is next-free** (the old
  contract's 1230 pin was STALE and is corrected here). Only the closure subtask (517-03)
  edits `_docs/_TASKS/*` + `_docs/_CHANGELOG/*`.
- **Branch/worktree:** dedicated `feature/task-517` worktree, branched from
  `feature/tasks-fixes` HEAD (517 depends on 514's shipped model — a fresh
  pre-implementation audit re-grounds 514's real column + helper names first).
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
- **No secret/PII leak:** never expose whether a private entry exists — enforced on BOTH the
  detail path (private-anon → uniform 404, byte-identical to not-published) AND the auto
  entry-list path (a `private`/`password` entry is NOT enumerable — its title + detail href are
  filtered out of the anon list body by 517-01-L05, mirroring the detail gate's authed bypass, so
  it never leaks via `renderEntryListHtml`). The list no-enumeration invariant also holds on the
  CACHE path: 517-01-L05 suppresses the list cache WRITE for an authed content:read render
  (`setSiteCacheEntry` gated on `shouldUseCache && !isAuthenticated`, `publicSite.tsx:1752`) so the
  authed FULL-list body — which carries gated titles/hrefs — can never be written under the
  auth-independent cache key and served to anonymous visitors; only the anon public-only list body
  is ever cached. Never expose the password hash, never confirm which entries exist from the unlock
  endpoint's failure responses.
- **Caching:** `private` + `password` entries are FULLY cache-exempt on BOTH read and
  write — the shared `siteCache` read (`publicSite.tsx:1716-1721`) happens BEFORE route
  dispatch keyed only on path + searchSignature (it does NOT vary on the unlock cookie), so
  a locked page could otherwise serve a previously-cached unlocked body (and vice-versa).
  The WRITE side is closed from the first landed leaf: 517-01-L03 returns `{ html,
  cacheable:false }` for gated `allow` renders (including the authed/preview bypass), so an
  authed render can never poison the shared anon-served cache — no fail-open window exists
  after 01+02 land but before 03. 517-03 then bypasses the cache READ for gated routes and
  adds the canonical auth-independent `entryRouteIsGated` short-circuit (belt-and-braces on
  both read AND write). Only `public` entries keep the existing 30 s public HTML cache.

## Sub-Tasks

| ID | Title | Priority | Effort | Status |
|----|-------|----------|--------|--------|
| TASK-517-01 | Visibility resolver + private auth-gate on the public render path | High | Medium | ⏳ To Do |
| TASK-517-02 | Password gate: unlock-cookie util + submit endpoint + prompt UI | High | Medium | ⏳ To Do |
| TASK-517-03 | Cache exclusion + gate-matrix tests + docs & closure | Medium | Medium | ⏳ To Do |

### Leaf inventory

- **TASK-517-01** (5 leaves):
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
  PAGE/ENTRY model note), and closure under changelog 1236.

Land order strictly sequential **01 → 02 → 03**; each leaf is single-writer with documented
additive seams. Each subtask carries execution-ready pseudocode, a Security Contract
restatement (route-touching), the correct Bun test lane, and shared-DB safety. Run the
standard pipeline (author → drift-audit → sequential implement with gates → post-audit →
runtime smoke of every gate state: public renders, private 404-anon / renders-authed,
password prompt → wrong → right → unlocked, tampered cookie rejected) before closure.
