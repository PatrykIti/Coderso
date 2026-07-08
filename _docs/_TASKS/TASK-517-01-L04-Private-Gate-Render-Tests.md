# TASK-517-01-L04: Private/Public Gate Render Tests (Fail-Closed Uniform 404)

# FileName: TASK-517-01-L04-Private-Gate-Render-Tests.md

**Parent Task:** TASK-517
**Parent Subtask:** TASK-517-01
**Priority:** High
**Category:** Tests / Security / Public Runtime
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Adds the Bun render tests that prove the private/public gate on the live
`handlePublicRequest` path: public entries render to everyone; private entries return a
uniform 404 to anonymous requests and render for an authenticated (preview/admin) context;
a password entry with no valid unlock is withheld (404 in the 517-01 placeholder state —
the 200 prompt assertion is added by 517-02-L04). Drives the real dispatcher, not the pure
resolver (that is 517-01-L01's Vitest suite).

## Grounded anchors

- Entry point under test: `handlePublicRequest(req)` (`publicSite.tsx:1507`) → content-route
  match → `renderEntryDetailHtml` (`:1759`) → uniform 404 `new Response("Not Found",
  { status: 404 })` (`:1766`) when the gate returns `null`.
- Existing render/route Bun test precedent for driving `handlePublicRequest` with a seeded
  entry + a content route (`site.contentRoutes` setting) lives under
  `tests/integration/runtime/*` (e.g. `detail-page-runtime.test.ts`,
  `redirects-runtime.test.ts`) — mirror its request construction (`new Request(url)`),
  content-route seeding, and per-test teardown. (There is NO `tests/integration/site/` dir;
  the new gate test file is created fresh under the existing `tests/integration/runtime/`.)
- The 514 create/update service is the real path to seed an entry with `visibility` +
  hashed `access_password`; use it so the fixture rows carry the real column values.
- Authenticated context: build the request with the same session cookie
  (`SESSION_COOKIE_NAME = "session"`) the existing admin-authenticated tests use so the
  session-derivation added by 517-01-L03 (`attachUserFromSession` → resolve
  `getUserPermissions(user.id)` → `isAuthenticated = hasPermission(perms, "content:read")`; there
  is NO pre-existing `isAuthenticatedAdminRequest` helper — L03 introduces the derivation) resolves
  a `content:read` user and bypasses the gate; the anon request omits the cookie. The bypass is
  PERMISSION-bounded, NOT bare `Boolean(user)` — so a session user WITHOUT `content:read` must NOT
  bypass (see scenario 6).

## Regression-test shape

- **Lane:** Bun `tests/integration/runtime/entry-visibility-gate.test.ts` (NEW; render/route
  path → Bun; sits alongside the existing `detail-page-runtime.test.ts`).
- Fixtures (seeded per-suite, unique slugs, torn down after): a published `public` entry,
  a published `private` entry, a published `password` entry (hashed `access_password`), all
  under a seeded content type + `site.contentRoutes` mapping so `handlePublicRequest`
  resolves each detail path.
- Scenarios:
  1. `public` + anon `GET /<route>/<publicSlug>` → **200**, body contains the entry's
     rendered content.
  2. `private` + anon → **404**, body === `"Not Found"` (byte-identical to a not-published
     entry's 404 — assert the SAME status + body as a control not-published entry, proving
     no existence leak; never 401/403).
  3. `private` + authenticated `content:read` (admin/preview) → **200**, body renders (gate bypass).
  4. `password` + anon (no unlock cookie) → withheld: **404** in the 517-01 placeholder
     state. (517-02-L04 REPLACES this expectation with **200 prompt page**; this leaf
     documents the placeholder so the suite is green at 517-01 land and the follow-up
     amends it — do NOT assert the body contains rendered entry content in either state.)
  5. Not-found control: a non-existent slug → 404, byte-identical to scenario 2 (the
     comparison target that proves uniformity).
  6. **Permission-bounded bypass (REQUIRED):** `private` + a session user WITHOUT `content:read`
     → **404** (same uniform 404 as anon) — proves the bypass is `content:read`-bounded, NOT bare
     `Boolean(user)`. Seed a low-privilege role/user (or a role lacking `content:read`) for this.
  7. **Gated-allow cache non-write at BOTH detail exits (REQUIRED — L03 Hard Invariant #7):**
     under the `content:read` bypass, a gated entry rendered via (a) the linked-detail-page
     runtime exit (`publicSite.tsx:1397`) AND (b) the default-generic string exit (`:1420`) is
     NOT written to the shared `siteCache` (assert via `canCache=false` / a cache-instrumentation
     probe): a subsequent anon request for the same path is NOT served a cached gated body.
- **Shared-DB safety:** unique type slug + entry slugs per run, per-test/`afterAll`
  teardown of seeded entries + content type + the `site.contentRoutes` setting mutation, no
  cross-suite row-count assertions.

## Hard Invariants

1. Drives the REAL `handlePublicRequest` (not the pure resolver).
2. Private-anon 404 is asserted byte-identical (status + body) to a not-published /
   non-existent 404 — the existence-leak guard.
3. Private-`content:read`-authed renders (bypass proven); a session WITHOUT `content:read` does
   NOT bypass (still 404) — the permission-bounded-bypass guard (L03 Hard Invariant #6).
4. Password-anon is withheld (never renders the body); the placeholder-404 vs 200-prompt
   expectation is owned jointly with 517-02-L04.
5. Gated-allow cache non-write asserted at BOTH detail exits (linked-detail-page `:1397` object +
   default-generic `:1420` string) under the bypass (L03 Hard Invariant #7).
6. Shared-DB scoped fixtures; no truncation.
