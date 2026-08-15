# TASK-517-01-L06: Public-Vector Visibility Filters (Search + Listing Blocks)

# FileName: TASK-517-01-L06-Public-Vector-Visibility-Filters.md

**Parent Task:** TASK-517
**Parent Subtask:** TASK-517-01
**Priority:** High
**Category:** Public Runtime / Security
**Estimated Effort:** Small
**Status:** ✅ Done
**Completed:** 2026-08-14

---

## Scope

Executable leaf. Closes the two remaining anonymous existence-leak vectors that the
detail-only gate (517-01-L03) and list-branch filter (517-01-L05) do not cover:

1. **Public search** — the anonymous `/api/search` endpoint
   (`core/server/publicSite.tsx:718-749` → `searchPublicIndex`) lists entries via
   `searchIndexService.ts:152-178`, filtering ONLY `status = "published"` +
   `notInArray(contentTypes.slug, POST_TYPE_SLUGS)` — there is NO visibility filter, so a
   PUBLISHED `private`/`password` entry's title + slug + detail href is returned to any
   anonymous visitor.
2. **Static-page listing blocks** — the `entries` listing source
   (`core/services/content/listingSources.ts:43-74`) calls `listEntriesForListing(typeId, {
   publishedOnly: !includeDrafts })` which filters ONLY `status = "published"` +
   `publishedAt IS NOT NULL` (`entryReadService.ts:98-122`) — there is NO visibility filter, so
   a PUBLISHED `private`/`password` entry is rendered into a public static-page listing block.

This leaf filters non-`public` entries out of BOTH surfaces, keeping the exact current shape of
those modules (no loader widening, no new route, no DB migration). Unlike the detail/list
gates, these two surfaces are ANONYMOUS-ONLY with no session/auth bypass, so the filter is
unconditional: `visibility === "public"` (a `null`/unknown legacy visibility is treated as
non-public — fail-closed, matching the resolver's unknown→`not-found` rule).

## Grounded anchors

- Public search dispatch: `if (url.pathname === "/api/search")` @ `publicSite.tsx:718`, calling
  `searchPublicIndex(query, {...})` @ `:742-746`.
- The leak: `buildDefaultDeps.listEntries` @ `searchIndexService.ts:152-178` selects
  `id/title/slug/updatedAt/typeSlug` and `.where(and(eq(status, "published"),
  notInArray(typeSlug, POST_TYPE_SLUGS), or(...)))` @ `:167-169` — add
  `eq(contentEntries.visibility, "public")` to that `and(...)`. `contentEntries` is already in
  the dynamically-imported schema (`:7-10`); `eq`/`and` are already imported (`:1`).
- Listing blocks: `fetchEntriesRows` @ `listingSources.ts:43-74` calls
  `listEntriesForListing(typeId, { publishedOnly: !includeDrafts, dataPredicates })` @ `:55-58`,
  then maps rows @ `:60-73`. `listEntriesForListing` (`entryReadService.ts:98-122`) already
  selects `visibility` (via `entryListSelection`, `entryReadService.ts:24`) and maps it
  (`:63`) — so the returned `filtered` rows ALREADY carry `visibility`, and this leaf filters
  them in-memory BEFORE the output map (no change to the shared loader, no new column in the
  listing-block output map).

## Implementation pseudocode

```ts
// (1) core/services/search/searchIndexService.ts — buildDefaultDeps.listEntries (:152-178):
//     add ONE eq() clause to the existing and(...); touch NOTHING else in this module.
.where(
  and(
    eq(contentEntries.status, "published"),
    eq(contentEntries.visibility, "public"),            // NEW: anonymous search never lists non-public entries
    notInArray(contentTypes.slug, [...POST_TYPE_SLUGS]),
    or(/* ...existing ts/ilike predicates unchanged... */)
  )
)

// (2) core/services/content/listingSources.ts — fetchEntriesRows (:43-74): filter BEFORE the
//     existing map so the output row shape is unchanged (visibility is NOT added to the output):
const filtered = await listEntriesForListing(typeId, {
  publishedOnly: !includeDrafts,
  dataPredicates: pushdown?.predicates ?? [],
});

const publicOnly = filtered.filter((row) => row.visibility === "public");  // NEW: anonymous listing blocks never list non-public entries

return publicOnly.map((row) => ({ /* ...existing map fields, UNCHANGED... */ }));
```

**Design notes.** Both filters are unconditional (`visibility === "public"`) because neither
surface has an auth context to bypass on; this matches the resolver's fail-closed rule that an
unknown/null visibility is treated as most-restrictive (dropped). The search SQL edit keeps the
planner index-compatible (it is an additional `and` equality clause on an existing column, no
expression change). The listing edit is in-memory to keep `listEntriesForListing` (a shared
loader also used by non-public admin/listing paths) untouched.

## Security Contract (restatement — public-read surface)

- **Visibility:** public, anonymous-only (`/api/search` and static-page listing blocks) — NO
  auth bypass exists on either surface, so non-`public` entries are ALWAYS filtered.
- **No existence leak:** a `private`/`password` entry is never returned by anonymous public
  search and never rendered into a static-page listing block (title, slug, and detail href all
  withheld). This completes the parent's no-existence-leak invariant across detail, list, search,
  and listing-block surfaces.
- **No hash exposure:** these filters read only `visibility`; the `access_password` hash is never
  selected, mapped, or returned.

## Regression-test shape

- **Lane:** Bun `tests/integration/server/entry-visibility-public-vectors.test.ts` (NEW; DB
  round-trip → Bun lane, alongside the existing `tests/integration/server/` service suites).
- Fixtures (unique content-type slug + entry slugs per run, torn down): one `public`, one
  `private`, one `password` PUBLISHED entry under a non-post content type with a
  `site.contentRoutes` detail/list path.
- Scenarios:
  1. `searchPublicIndex("<title-token>", { sources: "entries", contentRoutes })` against the real
     DB returns the `public` entry's id/slug and does NOT return the `private` NOR `password`
     entry's id/slug (search vector).
  2. `fetchListingSourceRows("entries", { contentTypeId, includeDrafts: false })` returns the
     `public` entry and does NOT return the `private` NOR `password` entry (listing-block vector).
  3. Grep-guard: the search `listEntries` dep's `where` includes `eq(contentEntries.visibility,
     "public")` and the listing `fetchEntriesRows` filters `row.visibility === "public"` — a cheap
     structural regression against accidentally widening either surface back.
- **Shared-DB safety:** unique slugs per test, per-test/`afterAll` teardown of seeded entries +
  content type + `site.contentRoutes`; no cross-suite row-count coupling.

## Hard Invariants

1. Anonymous public search never returns a non-`public` entry (title, slug, or href).
2. Static-page listing blocks never render a non-`public` entry (title, slug, or href).
3. Filter is unconditional (`visibility === "public"`) — no auth bypass on these anonymous-only
   surfaces; null/unknown visibility is treated as non-public (fail-closed).
4. `listEntriesForListing` is NOT changed (the filter is in-memory at the listing-source
   boundary); `getEntry`/`getEntryBySlug`/`listEntries` projections are NOT widened; no DB
   migration; no new route.
5. Sole writer of `searchIndexService.ts` + `listingSources.ts` within 517; no other 517 leaf
   touches those files.
6. Shared-DB scoped fixtures; no truncation.
