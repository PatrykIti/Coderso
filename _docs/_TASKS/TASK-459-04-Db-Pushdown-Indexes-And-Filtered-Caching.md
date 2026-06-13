# TASK-459-04: Db Pushdown Indexes And Filtered Caching
# FileName: TASK-459-04-Db-Pushdown-Indexes-And-Filtered-Caching.md

**Parent Task:** TASK-459
**Priority:** High
**Category:** Listings / Database / Performance / Public Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-459-01
**Status:** ✅ Done
**Completed:** 2026-06-13

---

## Overview

Make the catalog truthful and scalable. Verified starting state:

- Listing execution is fully IN-MEMORY: `executeListingQuery` loads ALL
  entries of the content type (`listEntries` is a per-type full scan with
  no data-field WHERE, `core/services/content/entryService.ts:433-455`;
  `core/services/content/listingSources.ts:32-57`), then filters/sorts/
  slices in JS (`queryBuilderService.ts:474-544` operator matrix,
  `:634-653` execute); limit clamps 1..100, offset 0..5000 (`:621-622`).
- `content_entries.data` is one jsonb column with ZERO indexes on it
  (`core/db/schema.ts:755-781`; the 0006 migration covers only
  title/slug/alt tsvector+trgm,
  `core/db/migrations/0006_search_indexes.sql:1-41`).
- Facet counts/range bounds are computed from the CURRENT PAGE SLICE only
  (`listingRuntimeService.ts:128-138` over `execution.rows`;
  `filterEngine.ts:429-522`) — wrong whenever results exceed one page.
- ANY query param disables the whole-page HTML cache
  (`publicSite.tsx:1527-1528`) — every filtered request is a full uncached
  render plus a full in-memory scan.
- The admin-only `POST /filters/preview` (`filterRoutes.ts:40-70`,
  `content:read`) returns rows/total/applied/rejected — the contract
  reference for the public JSON partial; the public precedent for
  rate-limited anonymous reads is `/api/search`
  (`publicSite.tsx:1372-1403`, `public_read` bucket).

Deliverables:

1. **SQL pushdown:** translate the hot, safe `data.*` predicate subset into
   SQL superset predicates inside the listing execution plan: numeric
   comparisons/equality/ranges, boolean equality, `exists`, and null
   equality. String operators, non-`data.*` fields, unsafe path segments,
   mixed value lists, sorting, projection, and pagination intentionally stay
   in the JS path. The JS matcher remains the semantics oracle and ALWAYS
   re-runs over the SQL candidate set; pushed-down results must equal the
   in-memory oracle for the covered operator matrix. Non-pushable shapes fall
   back to the in-memory path (correctness over speed, flagged in the
   execution plan for observability).
2. **Indexes (full migration artifacts):** drizzle SQL migration + journal
   + `schema.ts` — published-scope composite btree on
   `(type_id, status, published_at)` and jsonb GIN on `content_entries.data`
   (`jsonb_path_ops`). Static per-field expression indexes are intentionally
   not shipped because field paths are content-type authored and deployment
   specific; document the strategy and its limits in `_docs/DATA_MODEL.md`.
3. **Corpus-wide counts:** facet option counts, range min/max, and totals
   computed over the FULL filtered set by the listing runtime resolver,
   replacing the page-slice computation. SQL pushdown may reduce the
   candidate corpus first, but final aggregation remains resolver-owned over
   the oracle-filtered rows; the offset 5000 cap remains bounded by contract.
4. **Filtered-request serving:** implement the contract decision —
   param-aware HTML cache keys (normalized/canonicalized param order,
   bounded key cardinality, short TTL) AND/OR a public JSON partial
   endpoint for filter refresh that returns the rendered listing fragment +
   counts so the client script swaps without a full page render. The JSON
   endpoint (if built) is anonymous, `public_read` rate-limited, validates
   exactly like the page path (queryId must belong to a published page
   binding or saved-query allowlist per contract), and serves PUBLISHED
   data only.

Per AGENTS.md this touches performance-gated behavior: `tests/perf/*`
suites for the touched contracts are REQUIRED, and
`scripts/coderso-release-gates.ts` / workflow files stay in sync if the
gate contract changes.

---

## Sub-Tasks

- [x] Pin current JS filter/sort semantics with an operator-matrix fixture
      suite (oracle).
- [x] Execution-plan pushdown for the safe `data.*` predicate subset with
      fallback detection; parity suite vs the JS oracle. Sorting and
      pagination remain JS-owned.
- [x] Migration artifacts: published-scope composite btree + jsonb GIN
      indexes; EXPLAIN evidence captured for the demo-catalog query shapes.
- [x] Corpus-wide facet aggregation + totals wired into
      `listingRuntimeService` / resolver meta.
- [x] Param-aware caching and/or public JSON partial endpoint per contract;
      client script consumes it (with TASK-459-02's script seam).
- [x] Perf suites (`tests/perf/*`) covering filtered render latency and
      query counts at a seeded corpus (e.g. 5k entries).

---

## Implementation Pseudocode

```ts
// queryBuilderService: execution plan grows a pushdown section
type ListingExecutionPlan = {
  ...,
  pushdown: { predicates: ListingPushdownPredicate[]; fullyPushed: boolean; sortPushed: false };
};
// data.price between -> SQL superset predicate over JSON-number rows
// fallback: unsupported filters fetch the full candidate set + JS oracle path

// facet aggregation: resolver computes counts/ranges from the full
// oracle-filtered corpus, not the current page slice.

// public partial (if chosen):
GET /api/listings/:queryId/fragment?lq...  -> rate-limited public_read
  -> validate tokens (filterEngine allowlist) -> execute -> { html, total,
     facets } ; 404 for unknown/unbound queryId; published rows only.
```

Expected data flow: filtered request -> validated tokens -> SQL superset
pushdown for supported `data.*` predicates (indexes engaged where applicable)
-> JS oracle filter/sort/pagination -> corpus-wide resolver counts -> render
or JSON fragment -> param-aware cache stores only requests whose search params
all match the bounded allowlist.

Error handling: pushdown translation failure falls back to the in-memory
path (never an error to the visitor); aggregation errors degrade to
count-less facets (render without numbers, log); cache key explosion is
guarded by canonicalization + allowlisted params only. Unknown or arbitrary
alias params make the request uncacheable instead of being dropped from the
cache key, so rendered pager/search state cannot poison a normalized entry.

Regression-test shape: Bun — operator-matrix parity (pushdown superset vs JS
oracle, incl. null/missing-field/mixed-type rows), aggregation correctness on
a seeded corpus, cache key canonicalization; perf — filtered page p95 +
query-count budget at the seeded corpus; manual EXPLAIN evidence for btree
and GIN index use on the hot shapes.

---

## Security Contract

- **Endpoint visibility:** the JSON partial (if built) is a NEW PUBLIC READ
  endpoint — explicitly public, read-only, no admin data shapes
  (`/filters/preview` stays admin-gated and is NOT reused as-is).
- **Auth model:** anonymous; PUBLISHED entries only — drafts excluded at
  the SQL level (status predicate always pushed), never reachable via any
  token combination (no draft leakage).
- **RBAC:** none on the public endpoint by design; admin surfaces
  unchanged.
- **CSRF:** not applicable (GET, no state change).
- **Rate-limit bucket:** `public_read` (same as `/api/search`,
  `publicSite.tsx:1372-1403`).
- **Validation:** identical allowlist validation to the page path
  (`filterEngine` probe per token; queryId must resolve to a bound/saved
  published query per the contract); reject-unknown preserved; SQL values are
  parameterized and path segments are strictly charset-gated before being
  inlined into jsonb path expressions — no visitor-controlled raw SQL.
- **Anti-abuse controls:** limit/offset clamps enforced in the execution plan;
  aggregation restricted to author-configured facets; rate limit + bounded
  cache cardinality.

## Completion Notes

- Listing pushdown/index migrations, corpus-wide facet counts, option-A
  param-aware HTML cache signatures, and bounded cache-key hardening are in
  place. Arbitrary pretty aliases intentionally bypass global HTML caching
  unless represented by a cacheable canonical `lq.*`, `cl.*`, route `page`, or
  route `sort` param.

## Validation

- `bun test tests/unit/content/contentListResolver.test.ts tests/unit/site/cache.test.ts` passed.
- `bun test tests/unit/content/listingPushdown.test.ts` passed with the
  SQL-pushdown superset/oracle operator matrix.
- `bun test tests/perf/codersoPerformanceGate.test.ts` passed.
- `bun run gates:coderso` passed.
- Manual EXPLAIN evidence showed `content_entries_type_status_published_idx`
  and `content_entries_data_gin_idx` usage on the hot filtered shapes.

---

## Testing Requirements

- Bun: parity, aggregation, caching suites (env loaded).
- `tests/perf/*` for filtered listing latency/query budget;
  `bun run gates:coderso` baseline.
- Migration applies cleanly; manual EXPLAIN evidence records the btree and GIN
  index use on the hot query shapes.
- `bun --cwd core lint`, `bun --cwd core lint:types`, root tsc.

---

## Documentation Updates Required

- `_docs/DATA_MODEL.md` (jsonb index strategy + limits).
- `_docs/CONTENT_TYPES_SPEC.md` / `_docs/SEARCH_SPEC.md` (pushdown
  contract, public fragment endpoint, caching rules).
- `_docs/ADMIN_CACHE.md` only if admin-visible caching changes.
