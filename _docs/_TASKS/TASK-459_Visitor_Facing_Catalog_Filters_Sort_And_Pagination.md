# TASK-459: Visitor Facing Catalog Filters Sort And Pagination
# FileName: TASK-459_Visitor_Facing_Catalog_Filters_Sort_And_Pagination.md

**Priority:** High
**Category:** Pages / Public Runtime / Listings / Search / Performance
**Estimated Effort:** Very Large
**Dependencies:** None (consumes the shipped TASK-457 collection block authoring)
**Status:** ⏳ To Do

---

## Overview

**Product goal (owner, binding):** this family is NOT about one vertical — it
makes Coderso a general-purpose platform on which users can build ANY
listing-driven service: real-estate catalogs, job boards, directories, event
sites, marketplaces, portfolios, blogs with faceted archives. The
real-estate (otodom-style) scenario in the closure demo is the stress test,
not the scope. Every control introduced here must stay generic
(content-type/field driven), never vertical-specific.


Deliver the visitor-facing catalog experience (otodom-style: filters, sort,
pagination, truthful counts, shareable URLs) on Page v2. Recon headline:
roughly 80% of the engine ALREADY exists server-side and is well-tested —
saved listing queries with 12 operators incl. `between`/`gte`/`lte`
(`core/server/validation/listingSchemas.ts:1-126`,
`core/services/content/queryBuilderService.ts:232-320`), the
`lq.<queryId>.<field>.<op>` URL grammar with `__sort`/`__page`/`__q` tokens
and allowlist validation (`core/services/search/filterContract.ts:1,
216-218, 307-311`; `filterEngine.ts:240-427`), a facet metrics resolver
(`core/services/search/listingRuntimeService.ts:85-150`), the widget-era
`listing-filters` UI with facet kinds + auto-apply
(`core/widgets/core/listingFilters.tsx:17-47`) and a fetch-swap/pushState
client script (`core/widgets/core/listingRuntimeScript.ts:291-336`). The v2
collection block already applies `lq.*` URL overrides end to end:
`publicSite.tsx` threads `url.searchParams` into every render and
`contentListResolver` applies visitor filters/sort/page on the saved query
(`core/services/pages/pageRuntimeDataBinding.ts:234-238`;
`core/services/content/contentListResolver.ts:807-830`).

What is missing is almost entirely the VISITOR-FACING V2 SURFACE and scale.
Known traps this family must encode (all verified):

- Assistant blueprints already emit `filters` sections whose collection
  block carries `mode: "filters"`, `facets`, `autoApply`, `showSearch`
  (`core/services/assistant/blueprints/blueprintPageSectionComposer.ts:88-113`)
  — and `pageRuntimeDataBinding.ts:200-224` SILENTLY DROPS all of them (it
  reads only contentTypeId/queryId/templateId/limit), so assistant-built
  filter pages render as plain listings.
- Pagination is hard-forced to `"none"` on v2
  (`pageRuntimeDataBinding.ts:218-220`), so `lq.*.__page` works server-side
  but no pager ever renders.
- Editor/runtime limit clamp mismatch: schema + floating panel allow 1..50
  (`pageDocumentV2.ts:706`, `pageEditorControlRegistry.ts:722`) but runtime
  clamps 1..24 (`pageRuntimeDataBinding.ts:204`,
  `contentList.tsx:255` `contentListLimitMax = 24`) — 25..50 silently
  truncates.
- Facet counts are computed from the CURRENT PAGE SLICE only
  (`listingRuntimeService.ts:128-138` over `execution.rows`), so counts are
  already wrong beyond one page.
- ANY query param bypasses the whole HTML cache
  (`core/server/publicSite.tsx:1527-1528`) — every filtered request is a
  full uncached render.
- Listing execution is fully in-memory over a per-type FULL SCAN with zero
  jsonb indexes on `content_entries.data`
  (`core/services/content/listingSources.ts:32-57`,
  `entryService.ts:433-455`, `core/db/schema.ts:755-781`); offset capped at
  5000 (`queryBuilderService.ts:621-622`).
- Listing template style config (columns/cardVariant,
  `core/services/content/listingTemplateConfig.ts`) is stored but never
  consumed — v2 always renders `variant="grid"`
  (`pageRendererV2.tsx:624-661`).
- Detail-link fallback can 404: `resolveDetailPathPattern` falls back to
  `/<typeSlug>/:slug` even when no content route is registered
  (`contentListResolver.ts:345-348`; `DEFAULT_CONTENT_ROUTES = []`,
  `settingsService.ts:57`).
- V2 pages ship ZERO client JS (`renderPublicPage.tsx:375-388` passes
  `renderBodyScripts` undefined), so the existing fetch-swap script never
  loads on them.

The `filters` section stays enum-only and gated `listing-section-boundary`
(`pageDocumentV2.ts:485`) — like collection/lead-form, the gate reason means
COMPOSITE-FIRST: the deliverable is a filters BLOCK composed into ordinary
sections, not a monolithic section type.

---

## Security Contract

- **Endpoint visibility:** public READ rendering rides the existing public
  page pipeline; the only candidate NEW public endpoint is the TASK-459-04
  JSON partial/refresh endpoint — public, rate-limited, read-only.
- **Auth model:** anonymous public read; admin session for authoring.
- **RBAC:** existing Pages/content permissions for authoring; the
  admin-gated `POST /filters/preview` (`filterRoutes.ts:40-70`,
  `content:read`) stays admin-gated.
- **CSRF:** unchanged (no public writes anywhere in this family).
- **Rate-limit bucket:** any new public read endpoint uses the existing
  `public_read` bucket (precedent: public `/api/search`,
  `publicSite.tsx:1372-1403`).
- **Validation:** all visitor input flows through the existing allowlist
  validation (`filterEngine` probes every candidate token against the saved
  query's source allowlist via `buildListingExecutionPlan`; rejected tokens
  dropped); pretty-param aliases resolve to the SAME validated lq tokens —
  no new raw-input path; published-only entries on every public path
  (`publicSite.tsx:1029-1037, 1108-1119`) — no draft leakage, including the
  new JSON endpoint.
- **Anti-abuse controls:** clamps preserved (limit/offset), rate limiting on
  the JSON endpoint, no unbounded aggregation driven by visitor input
  (facet aggregation runs only over allowlisted fields of the bound saved
  query).

---

## Sub-Tasks

- [ ] TASK-459-01: Filters contract, pretty-param aliases, and pagination
      plan (contract freeze).
- [ ] TASK-459-02: Filters block, visitor sort control, and the v2 client
      script seam.
- [ ] TASK-459-03: Pagination, truthful totals, clamp fix, list routes, and
      template style consumption.
- [ ] TASK-459-04: DB pushdown, jsonb indexes, corpus-wide facet counts, and
      filtered-request caching.
- [ ] TASK-459-05: Validation, live catalog demo, and closure.

---

## Implementation Pseudocode

```ts
// Target page composition (authorable + assistant-emitted):
// section [ filtersBlock(queryId=Q, facets, sort, autoApply) ]
// section [ collectionBlock(queryId=Q, pagination: { mode: "paged", pageSize }) ]
//
// Visitor flow: facet change -> lq.Q.<field>.<op>=v (or pretty alias) ->
// server validates via filterEngine allowlist -> executeListingQuery with
// SQL-pushed predicates -> page HTML (or JSON partial) with truthful
// totals/counts -> fetch-swap + pushState on the client.
```

Expected data flow: authoring (TASK-457 collection block + new filters
block) -> publish -> public render resolves the shared queryId, applies URL
overrides, renders facet form + sorted/paged listing with counts -> client
script syncs form <-> URL -> refresh via fetch-swap; aliases keep URLs
shareable and canonical rules keep SEO sane.

Error handling: invalid/unknown tokens are dropped (existing rejectedTokens
contract), never 500; dangling queryId/templateId keep the existing
fail-closed inert placeholder; dangling detail routes are guarded (no
silent 404 links).

Regression-test shape: per leaf — contract vitest, Bun runtime
(filters/sort/pager render + URL application), TASK-452-style catalog guard
updates, perf suites for the pushdown (`tests/perf/*` per AGENTS.md, this
family touches performance-gated behavior).

---

## Testing Requirements

- `bun run test:vitest` (incl. updated catalog guard suites).
- Bun: pages runtime, contentListResolver/filterEngine, listing runtime,
  public-site route suites (env loaded).
- `tests/perf/*` suites for the touched listing/caching contracts
  (TASK-459-04) and `bun run gates:coderso` as baseline.
- `bun --cwd core lint`, `bun --cwd core lint:types`, root
  `npx tsc -p tsconfig.json --noEmit`.
- Live `coderso-dev-core-host` + `playwright-cli` catalog demo per
  TASK-459-05.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (filters block, pagination props, catalog change).
- `_docs/CONTENT_TYPES_SPEC.md` (listing/visitor-filtering contract,
  pretty-param aliases).
- `_docs/SEARCH_SPEC.md` (public filtering surface vs admin-scoped v1).
- `_docs/DATA_MODEL.md` (jsonb indexes).
- `docs/guide/` end-user notes (building a filterable catalog page).
- `_docs/_TASKS/README.md` board + statistics; `_docs/_CHANGELOG/` entry on
  completion.
