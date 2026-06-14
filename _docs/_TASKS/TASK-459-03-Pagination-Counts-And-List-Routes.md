# TASK-459-03: Pagination Counts And List Routes
# FileName: TASK-459-03-Pagination-Counts-And-List-Routes.md

**Parent Task:** TASK-459
**Priority:** High
**Category:** Pages / Public Runtime / Listings
**Estimated Effort:** Medium
**Dependencies:** TASK-459-01
**Status:** ✅ Done
**Completed:** 2026-06-13

---

## Overview

Make v2 listings pageable and honest, and stop tiles from linking into 404s.

Verified starting state:

- Historical starting state: v2 collection pagination defaulted to `"none"`
  and did not expose the saved query page state even though
  `lq.<id>.__page` mapped to offset server-side (`filterEngine.ts`) and the
  resolver computed page/totalPages/prev/next meta. Current ownership is
  `mapPageCollectionBlockToContentListData` in
  `pageRuntimeBindingContract.ts`, plus the shared content-list pager render.
- Historical starting state: schema/editor/runtime clamps drifted. Current
  ownership is `PAGE_COLLECTION_LIMIT_CLAMP` in `pageDocumentV2.ts`, backed by
  `contentListLimitMax = 24` and consumed by
  `pageRuntimeBindingContract.ts`.
- Listing template style config `{ columns 1-6, gap, cardVariant }` and
  `emptyState` are normalized and stored
  (`core/services/content/listingTemplateConfig.ts:1-96`) but never
  consumed — v2 always renders `variant="grid"` defaults
  (`pageRendererV2.tsx:624-661` region, `:649`).
- Dangling links: `resolveDetailPathPattern` falls back to
  `/<typeSlug>/:slug` with no registered route
  (`contentListResolver.ts:345-348`) and `matchContentRoute` will not match
  it (`core/site/contentRouteMatcher.ts:14-54`); routes are persisted only
  on Site Settings save / detail-template link / assistant blueprint
  (`siteSettingsValidation.ts:81-91`,
  `CollectionWorkspacePage.tsx:90-103`).
- Auto entry-list routes (`renderEntryListHtml`,
  `publicSite.tsx:1556-1585`, list branch at `:1029-1037`) render a plain
  published list; they receive the request but do not consume
  `searchParams` for page/filter state the way page renders do.

Deliverables (per the TASK-459-01 frozen contract):

1. **Pagination flip:** collection block props
   `pagination: { mode: "none" | "paged" | "load-more", pageSize }` wired
   through schema, editor controls (segmented + slider via shared
   primitives), and `mapPageCollectionBlockToContentListData` — `"none"`
   stays the DEFAULT (existing pages render unchanged). Canvas keeps
   pagination affordances inert (existing TASK-457 discipline).
2. **Numbered pager + view-all:** extend the widget pagination render with
   page numbers (windowed, e.g. 1 … 4 5 6 … 12), prev/next, and the
   view-all affordance where the contract says so; load-more keeps the
   existing anchor semantics; works no-JS (server-rendered hrefs), enhanced
   by the TASK-459-02 script.
3. **Totals surfaced:** render the total/result-count fields named by the
   contract on the pager line ("N results"); truthful full-corpus totals
   are completed by TASK-459-04 — this leaf renders whatever the resolver
   reports.
4. **Clamp fix:** single limit bound per the contract decision, owned in
   one place; editor schema, registry clamp, and runtime agree; migration
   note for stored documents with out-of-range values (normalize on read).
5. **List routes consume searchParams:** `renderEntryListHtml` honors
   page/sort params (same validated grammar), so auto list pages paginate
   instead of dumping the full published set.
6. **Template style consumption:** thread `template.config.style`
   (columns/gap/cardVariant) and `emptyState` into the v2 collection render
   path (and the entry-list route render), replacing the hardcoded grid
   defaults; absent style keeps current defaults (no visual change for
   existing pages).
7. **Dangling-link guard:** implement the frozen policy — auto-provision
   the content route on first bind OR suppress card links when no enabled
   route exists; either way, no rendered card may link to a URL the matcher
   cannot match.

---

## Sub-Tasks

- [x] Pagination props end to end (schema, controls, binding, default
      "none", canvas-inert).
- [x] Numbered pager + totals + view-all in the shared list render.
- [x] Clamp unification + stored-document normalization.
- [x] Entry-list route searchParams consumption.
- [x] Template style/emptyState consumption (v2 + list routes).
- [x] Dangling-link guard per frozen policy.

## Completion Notes

- Pagination, totals, URL-driven list routes, template style consumption,
  clamp normalization, and dangling-link suppression are wired through the
  page/listing runtime path.

## Validation

- `bun test tests/unit/content/contentListResolver.test.ts` passed.
- `bun test tests/integration/runtime/pages-runtime.test.ts` passed.
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.

---

## Implementation Pseudocode

```ts
// pageRuntimeBindingContract.ts
const pagination = normalizeCollectionPagination(block.props.pagination);
// { mode: "none" } default; pageSize clamped to the single contract bound
return { ...contentListDefaults, pagination, ... };

// pager (contentList render):
// hrefs built server-side from existing runtime meta (page/totalPages,
// contentListResolver.ts:824-842): ?lq.Q.__page=N (alias-aware per contract)
renderPager({ page, totalPages, total, window: 2, viewAllHref? })

// dangling guard (policy A shape):
if (!enabledRouteFor(contentTypeId)) href = undefined; // card renders unlinked
// (policy B: upsert route on first bind, reusing buildDefaultRoute)
```

Expected data flow: author sets pagination mode/pageSize -> publish ->
visitor page N via pager href -> `lq.Q.__page` validated -> offset applied
-> pager reflects page/totalPages/total; auto list routes follow the same
grammar.

Error handling: out-of-range page clamps to valid range (existing engine
behavior); offset cap 5000 respected until TASK-459-04 revisits scale;
missing template style -> defaults; suppressed links render plain cards,
never broken anchors.

Regression-test shape: vitest — pagination props round-trip + controls,
clamp normalization, pager markup (windowing, totals), style consumption;
Bun — public page paged render (page 2 via URL), list route with
searchParams, dangling-route guard (no unmatched hrefs in output), legacy
documents render unchanged with default "none".

---

## Security Contract

- **Endpoint visibility:** no new endpoints; list routes already public.
- **Auth model:** anonymous public read, published entries only (existing
  `isEntryPublished` filters, `publicSite.tsx:1029-1037`).
- **RBAC / CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** page/sort params ride the existing validated lq grammar;
  pagination props schema-clamped; route auto-provisioning (if chosen)
  writes through the existing settings validation path.
- **Anti-abuse controls:** offset/limit clamps preserved.

---

## Testing Requirements

- `bun run test:vitest`.
- Bun: pages runtime, contentListResolver, public-site route suites (env
  loaded).
- `bun --cwd core lint`, `bun --cwd core lint:types`, root tsc.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (pagination props, clamp, style consumption).
- `_docs/CONTENT_TYPES_SPEC.md` (list routes, dangling-route policy).
- `docs/guide/` note (pagination on listing pages).
