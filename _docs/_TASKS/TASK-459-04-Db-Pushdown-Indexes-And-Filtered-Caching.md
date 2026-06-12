# TASK-459-04: Db Pushdown Indexes And Filtered Caching
# FileName: TASK-459-04-Db-Pushdown-Indexes-And-Filtered-Caching.md

**Parent Task:** TASK-459
**Priority:** High
**Category:** Listings / Database / Performance / Public Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-459-01
**Status:** ⏳ To Do

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

1. **SQL pushdown:** translate allowlisted predicates and sorts —
   entry meta fields and `data.*` (the `fieldPrefixAllowlist`,
   `listingSources.ts:148`) — into SQL (jsonb path expressions) inside the
   listing execution plan, with the JS matcher retained as the semantics
   oracle: pushed-down results must equal in-memory results for the whole
   operator matrix (eq/neq/in/nin/contains/startsWith/gt/gte/lt/lte/
   between/exists), including numeric vs string comparison semantics
   (pin current JS behavior with fixtures FIRST, then match it in SQL).
   Non-pushable shapes fall back to the in-memory path (correctness over
   speed, flagged in the execution plan for observability).
2. **Indexes (full migration artifacts):** drizzle SQL migration + journal
   + `schema.ts` — jsonb GIN on `content_entries.data` (jsonb_path_ops) and
   targeted expression btree indexes for hot typed comparisons (numeric
   casts) as designed in this leaf; document the strategy and its limits in
   `_docs/DATA_MODEL.md`.
3. **Corpus-wide counts:** facet option counts, range min/max, and totals
   computed over the FULL filtered set via SQL aggregation (count per
   option with the facet's own predicate excluded — standard faceting
   semantics per the TASK-459-01 contract), replacing the page-slice
   computation; the offset 5000 cap revisited per contract.
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

- [ ] Pin current JS filter/sort semantics with an operator-matrix fixture
      suite (oracle).
- [ ] Execution-plan pushdown (predicates + sorts + pagination) with
      fallback detection; parity suite vs the oracle.
- [ ] Migration artifacts: jsonb GIN + expression indexes; EXPLAIN-verified
      index usage for the demo-catalog query shapes.
- [ ] Corpus-wide facet aggregation + totals wired into
      `listingRuntimeService` / resolver meta.
- [ ] Param-aware caching and/or public JSON partial endpoint per contract;
      client script consumes it (with TASK-459-02's script seam).
- [ ] Perf suites (`tests/perf/*`) covering filtered render latency and
      query counts at a seeded corpus (e.g. 5k entries).

---

## Implementation Pseudocode

```ts
// queryBuilderService: execution plan grows a pushdown section
type ListingExecutionPlan = {
  ...,
  pushdown: { where: SQL[]; orderBy: SQL[]; fullyPushed: boolean };
};
// data.price between -> (entry.data #>> '{price}')::numeric BETWEEN $1 AND $2
// fallback: !fullyPushed -> fetch matching superset (or full set) + JS path

// facet aggregation (per facet, excluding its own predicate):
SELECT data#>>'{rooms}' AS option, count(*) FROM content_entries
WHERE <type + published + other-facet predicates> GROUP BY 1;

// public partial (if chosen):
GET /api/listings/:queryId/fragment?lq...  -> rate-limited public_read
  -> validate tokens (filterEngine allowlist) -> execute -> { html, total,
     facets } ; 404 for unknown/unbound queryId; published rows only.
```

Expected data flow: filtered request -> validated tokens -> pushed-down SQL
(indexes engaged) -> rows + corpus-wide aggregates -> render or JSON
fragment -> param-aware cache stores the result under the canonicalized
key.

Error handling: pushdown translation failure falls back to the in-memory
path (never an error to the visitor); aggregation errors degrade to
count-less facets (render without numbers, log); cache key explosion
guarded by canonicalization + allowlisted params only (unknown params do
not fragment the cache — they are dropped from the key since they are
dropped from execution).

Regression-test shape: Bun — operator-matrix parity (SQL vs JS oracle, incl.
null/missing-field/mixed-type rows), aggregation correctness on a seeded
corpus, endpoint validation/rate-limit/draft-exclusion, cache key
canonicalization; perf — filtered page p95 + query count budget at the
seeded corpus, EXPLAIN assertions for index usage on the hot shapes.

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
  published query per the contract); reject-unknown preserved; SQL built
  exclusively through parameterized drizzle expressions over allowlisted
  field paths — no string-built SQL from visitor input.
- **Anti-abuse controls:** limit/offset clamps enforced in SQL; aggregation
  restricted to author-configured facets (bounded GROUP BYs); rate limit +
  bounded cache cardinality.

---

## Testing Requirements

- Bun: parity, aggregation, endpoint, caching suites (env loaded).
- `tests/perf/*` for filtered listing latency/query budget;
  `bun run gates:coderso` baseline.
- Migration applies cleanly; EXPLAIN checks scripted in the perf suite.
- `bun --cwd core lint`, `bun --cwd core lint:types`, root tsc.

---

## Documentation Updates Required

- `_docs/DATA_MODEL.md` (jsonb index strategy + limits).
- `_docs/CONTENT_TYPES_SPEC.md` / `_docs/SEARCH_SPEC.md` (pushdown
  contract, public fragment endpoint, caching rules).
- `_docs/ADMIN_CACHE.md` only if admin-visible caching changes.
