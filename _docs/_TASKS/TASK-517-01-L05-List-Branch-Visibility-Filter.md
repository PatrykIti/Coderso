# TASK-517-01-L05: List-Branch Visibility Filter (No Enumeration Leak)

# FileName: TASK-517-01-L05-List-Branch-Visibility-Filter.md

**Parent Task:** TASK-517
**Parent Subtask:** TASK-517-01
**Priority:** High
**Category:** Public Runtime / Security / Server Routes
**Estimated Effort:** Small
**Status:** ✅ Done
**Completed:** 2026-08-14

---

## Scope

Executable leaf. Closes the cross-subtask existence-leak that the detail-only gate (517-01-L03)
leaves open: the auto entry-list route enumerates PUBLISHED `private`/`password` entries (title +
detail href) to anonymous visitors even though their detail page 404s. This leaf filters
non-`public` entries out of the list branch for the anon (non-`content:read`) path, mirroring the
detail gate's `content:read` bypass so an authorized admin still sees all entries in the list.

**Why this is its own leaf (reconcile).** The parent Security Contract asserts "never expose
whether a private entry exists," but 517-01/02/03 all gate ONLY the DETAIL render branch. The LIST
branch was untouched — a within-scope contradiction between an asserted parent invariant and the
shipped leaf scope. This leaf resolves it in favor of the invariant (filter the list), matching the
private-uniform-404 no-existence-leak rationale. (517-01-L06 covers the two remaining anonymous
vectors: public search + static-page listing blocks.)

## Grounded anchors

- List dispatch: `handlePublicRequest` → `routeTarget === "content-list"` branch @
  `core/server/publicSite.tsx:960-971` → `renderEntryListHtml(match.type, match.detailPath, {...})`
  @ `:962-965`.
- `renderEntryListHtml` (`:282`): for GENERIC types lists via `listEntries(contentType.id)`
  (`:321`), then paginates through `paginateEntryListEntries` (`:320`) and maps items with
  `buildDetailHref(detailPath, entry.slug, entry.id)` (`:327`). The POST branch
  (`isPostContentTypeSlug`, `:287`) uses `listPosts()` and is NOT gated — `posts` has no
  `visibility` (same exclusion as L03's detail post-branch).
- **The leak:** `paginateEntryListEntries` filters ONLY by `isEntryPublished`
  (`core/server/publicSiteRouteRuntime.ts:71`), NOT by `visibility` — so a published
  `private`/`password` entry stays in the list.
- The projection ALREADY carries `visibility`: `listEntries` selects `visibility`
  (`core/services/content/entryReadService.ts:24`) and maps it onto the row
  (`:63`; `hasPassword` @ `:25`). No loader widening, no extra fetch, no DB migration.
- Auth/permission signal: consume the SHARED auth seam 517-01-L03 introduces — the
  `content:read` `isAuthenticated` boolean (+ the `cookies` local) that L03 derives ONCE,
  HOISTED ABOVE the `routeTarget` branches (at/above `publicSite.tsx:916`), specifically so
  this leaf's LIST call site (`:962`) can read the SAME in-scope `isAuthenticated`
  (`attachUserFromSession` → `getUserPermissions(user.id)` → `hasPermission(perms,
  "content:read")`). See 517-01-L03 Hard Invariant #8. This leaf does NOT re-derive the flag and
  does NOT re-edit L03's derivation (single-writer intent); it only threads the
  already-in-scope `isAuthenticated` boolean into `renderEntryListHtml`'s options (ADDITIVE
  seam, mirroring the detail call site) so the list uses the identical bypass rule as the detail
  gate.

## Implementation pseudocode

```ts
// publicSite.tsx — thread the same content:read flag into the list render (additive):
// `isAuthenticated` (+ `cookies`) is derived ONCE ABOVE the routeTarget branches per the shared
// seam 517-01-L03 introduces (see 517-01-L03 Hard Invariant #8) — NOT re-derived here.
if (routeTarget === "content-list") {                       // :960
  if (!match || match.mode !== "list") return new Response("Not Found", { status: 404 });
  const html = await renderEntryListHtml(match.type, match.detailPath, {
    themeName,
    runtimeSearchParams: url.searchParams,
    isAuthenticated,                       // SAME content:read-bounded flag as the detail call site
  });
  if (!html) return new Response("Not Found", { status: 404 });
  // ANTI-POISONING WRITE GUARD (grounded @ publicSite.tsx:967-969): the list `setSiteCacheEntry`
  // is gated ONLY on `shouldUseCache` and the cache key `buildSiteCacheKey(cacheProfileId,
  // slugPath, searchSignature.signature)` (:888) does NOT vary on auth — so an authed content:read
  // render of the FULL list body would otherwise be written under the auth-independent key and
  // served verbatim to anonymous visitors for the TTL, leaking gated titles/hrefs (defeating this
  // leaf's no-enumeration invariant on the cache path). Mirror 517-01-L03's detail
  // write-exemption: only the anon (public-only) list body is ever cached. Suppress the WRITE
  // when authed:
  if (shouldUseCache && !isAuthenticated) {
    setSiteCacheEntry(cacheKey, html, defaultStoreTtlSeconds);   // was: gated on shouldUseCache alone (:967-969)
  }
  return buildHtmlResponse(html);
}

// renderEntryListHtml options gain `isAuthenticated?: boolean`. In the GENERIC branch, drop
// non-public entries for the anon path BEFORE pagination (so counts/pager stay correct):
const listed = await listEntries(contentType.id);              // :321
const visible = options?.isAuthenticated
  ? listed
  : listed.filter((e) => e.visibility === "public");   // anon: public-only, no private/password
const paged = paginateEntryListEntries(visible, options?.runtimeSearchParams);   // :320
// POST branch: unchanged (posts have no visibility model).
```

## Security Contract (restatement — route-touching)

- **Endpoint visibility:** public (`renderEntryListHtml` on the public list dispatch).
- **No existence leak:** an anonymous visitor's list body contains NO `private`/`password` entry —
  neither title nor detail href — so a gated entry is not enumerable. A `content:read` session sees
  the full list (parity with the detail bypass).
- **Bypass is permission-bounded:** same `content:read` rule as 517-01-L03 (`getUserPermissions` +
  `hasPermission`), NOT bare `Boolean(user)`.
- **Cache:** list-branch caching for the ANON (`public`-only) list body is unchanged and stays
  cacheable. (The gated-DETAIL cache exemption is 517-03.) The authed FULL-list body is NOT gated
  per-render, but its cache WRITE is SUPPRESSED here: the list `setSiteCacheEntry` (`:967-969`) is
  gated on `shouldUseCache && !isAuthenticated`, so only the anon public-only body is ever written
  under the auth-independent key `buildSiteCacheKey(cacheProfileId, slugPath,
  searchSignature.signature)` (`:888`, which does NOT vary on auth). Without this guard a single
  content:read admin GET to the list route would persist gated titles/hrefs into the shared 30 s
  cache and serve them verbatim to anonymous visitors — the exact enumeration leak this leaf
  closes, on the cache path. This is a concrete guard (`shouldUseCache && !isAuthenticated`), NOT
  an unbacked "the authed list is never written" assertion. 517-03's regression test confirms a
  public list still caches after its reorder; this leaf's own regression test asserts an authed
  content:read GET to the list route does NOT persist gated titles/hrefs (a follow-up anon GET to
  the same path returns the public-only body).

## Regression-test shape

- **Lane:** Bun — folded into `tests/integration/runtime/entry-visibility-gate.test.ts`
  (517-01-L04's file) or a sibling under `tests/integration/runtime/`.
- Scenarios (seeded per-suite, unique slugs, teardown):
  1. Anon `GET /<listRoute>` → body contains the `public` entry's title/href, and does NOT contain
     the `private` NOR the `password` entry's title/href (not enumerable).
  2. `content:read`-authed `GET /<listRoute>` → body contains ALL of them (bypass parity).
  3. A session WITHOUT `content:read` → same as anon (public-only) — permission-bounded.
  4. **Cache non-poisoning (REQUIRED):** a `content:read`-authed `GET /<listRoute>` (which renders
     the FULL list including gated titles/hrefs) is followed by an ANON `GET /<listRoute>` to the
     SAME path → the anon body is the PUBLIC-only body (no `private`/`password` title/href), proving
     the authed full-list body was NOT written into the shared cache (write suppressed by
     `shouldUseCache && !isAuthenticated`, `:967-969`).
- **Shared-DB safety:** scoped fixtures, per-test teardown of entries + content type +
  `site.contentRoutes`; no cross-suite row-count assertions.

## Hard Invariants

1. Anon list body omits every non-`public` entry (title + detail href) — no enumeration leak.
2. `content:read` session sees the full list; a non-`content:read` session sees public-only (same
   permission-bounded rule as 517-01-L03, NOT bare `Boolean(user)`).
3. Filter runs BEFORE `paginateEntryListEntries` so pager counts reflect the visible set.
4. POST list branch (`listPosts`) is NOT filtered (posts have no visibility model — mirrors L03).
5. No loader widening, no DB migration — `listEntries` already projects `visibility`.
6. Shared-DB scoped fixtures; no truncation.
7. **Authed list-body is never shared-cached (anti-poisoning, mirrors L03 Hard Invariant #7):**
   the list cache WRITE (`setSiteCacheEntry`, `:967-969`) is gated on
   `shouldUseCache && !isAuthenticated` so the content:read FULL-list body (which carries gated
   titles/hrefs) can NEVER be written under the auth-independent key (`:888`); only the anon
   public-only body is cached. The REQUIRED regression test (scenario 4) asserts an authed list GET
   followed by an anon GET to the same path returns the public-only body. This is a concrete guard,
   NOT an unbacked assertion.
