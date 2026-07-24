# TASK-551-04-L01: Canonical FTS, Trigram, and Ranked SQL Contract
# FileName: TASK-551-04-L01-Canonical-FTS-Trigram-And-Ranked-SQL-Contract.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-04
**Priority:** Critical
**Category:** Database / Search / Performance
**Estimated Effort:** Large
**Dependencies:** TASK-551-03-L03, TASK-551-05-L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Consume the exact vector inputs, weights, text-search configuration, generated
columns, and matching indexes owned by TASK-551-05. Own the trigram fallback,
rank expression, projections, and deterministic limits for pages, entries,
posts, media, and users. Replace sequential per-source fetching with bounded
ranked SQL while retaining current source/category response semantics.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Production:** `core/services/search/searchContract.ts`,
`core/services/search/searchService.ts`,
`core/services/search/searchIndexService.ts`,
`core/services/search/searchHistoryService.ts`, and
`core/server/routes/searchRoutes.ts`.

**Tests:** `tests/vitest/search/searchService.test.ts`,
`tests/vitest/search/searchIndexService.test.ts`,
`tests/unit/search/searchServiceDateRange.test.ts`,
`tests/unit/search/searchHistoryService.test.ts`,
`tests/integration/routes/search.test.ts`,
`tests/integration/database/searchRankedQueries.test.ts`, and
`tests/perf/database-search-plans.test.ts`.

Every other path is forbidden, including all `core/db/schema*` and
`core/db/migrations/**` paths (TASK-551-05), assistant service consumers (L02),
TASK-493 GSC files, TASK-511/TASK-517/TASK-518 files, cache, task, changelog,
and workflow files. This leaf emits no DDL or migration metadata.

This leaf is the sole whole-file writer of `searchHistoryService.ts`. It removes
the private `pruneHistory` query and the post-`recordSearch` prune call, so the
request write performs zero retention SQL. It does not create or edit the new
retention service. It hands TASK-551-06-L01 this table-level contract:
`search_history`, cutoff `created_at`, preserve newest 10 rows per user, delete
oldest by `created_at ASC, id ASC` in bounded locked batches. L06-L01 solely
creates `searchHistoryRetentionService.ts`; the leaves share no written file.

## Implementation Pseudocode

```ts
const SEARCH_SOURCE_CONTRACT = strictReadonly({
  pages: { vector: pages.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.pages, updatedAt: pages.updatedAt, id: pages.id },
  entries: { vector: contentEntries.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.entries, updatedAt: contentEntries.updatedAt, id: contentEntries.id },
  posts: { vector: posts.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.posts, updatedAt: posts.updatedAt, id: posts.id },
  media: { vector: media.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.media, updatedAt: media.createdAt, id: media.id },
  users: { vector: users.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.users, updatedAt: users.updatedAt, id: users.id },
});

function parseSearchRequest(input: unknown): StrictSearchRequest {
  // Reject unknown fields; normalize query; length 2..200; limit default 20/max 50.
}

async function searchAll(request: StrictSearchRequest, deps: SearchDeps): Promise<SearchItem[]> {
  // Build one parameterized tsquery. Each UNION ALL arm selects an explicit
  // projection, applies auth/publication/date filters, references only its
  // landed search_vector column, computes ts_rank_cd, and caps candidates.
  // Final order: rank DESC, updatedAt DESC, sourceType ASC, id DESC; LIMIT 51.
  // A separately bounded trigram arm is eligible only below the FTS threshold
  // and only when TRIGRAM_INDEXED_SOURCE_CONTRACT contains that source.
}

async function recordSearch(input: SearchHistoryInput, tx: Tx): Promise<SearchHistoryRow> {
  // Normalize, deduplicate the immediately repeated query, insert and return;
  // never prune on this request path. L06-L01 owns scheduled bounded retention.
}
```

TASK-551-05 installs the required extensions, five CMS generated vectors, and
matching GIN plus evidence-selected normalized trigram indexes. Exact trigram
candidates are the stored generated `search_trigram_text` columns for pages,
content entries, posts, media, and users, with respective index names
`pages_search_trigram_idx`, `content_entries_search_trigram_idx`,
`posts_search_trigram_idx`, `media_search_trigram_idx`, and
`users_search_trigram_idx`, all `USING GIN (search_trigram_text gin_trgm_ops)`.
The generated text and parameter needle both use the TASK-551-05-owned literal
`lower(regexp_replace(btrim(coalesce(value, '')), '[[:space:]]+', ' ', 'g'))`;
source value concatenation is pinned there per table. This leaf consumes the
exported columns and `TRIGRAM_INDEXED_SOURCE_CONTRACT` without recreating SQL.

Fallback is bounded and parameterized and is enabled per source only when the
TASK-551-05-L02 large-fixture receipt proves that exact index node, bounded rows/
buffers, and accepted write cost. A rejected or missing candidate means FTS-only
for that source—never an unindexed `ILIKE` scan. Exact email lookup continues via
`emailHash`, never a searchable vector. Known errors are stable
`search_query_invalid`, `search_cursor_invalid`, and `search_unavailable`.

## Testing Requirements

- Import the landed schema columns and assert every FTS predicate references the
  appropriate generated column; a source-level guard rejects service-local
  `to_tsvector(...)` reconstruction.
- Re-run TASK-551-05's vector/migration drift suites read-only before ranked
  integration tests; any mismatch blocks this leaf rather than being patched
  from search services.
- Assert schema export, generated-column DDL, snapshot, catalog column/opclass/
  index name, query LHS, needle-normalization literal, and the L05-L02 selected-
  source receipt agree. Remove one receipt/index in a fixture and prove that
  source issues FTS only and never an unindexed trigram/ILIKE predicate.
- Search tests cover accents/Unicode, punctuation, prefix/fuzzy behavior,
  ties, dates, categories, public publication filters, admin authorization, and
  deterministic result identity across repeated runs.
- Large fixtures use `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` with sanitized
  binds; assert intended index nodes, bounded rows, `<= 4` statements, and no
  growing-table sequential scan. Small fixtures may choose a seq scan by cost
  and are judged by latency/rows rather than forced planner settings.
- Unknown fields, overlong query, invalid limit/source/date, SQL metacharacters,
  and unauthorized/private records fail safely without PII/SQL leakage.
- Instrument `recordSearch` and prove successful, duplicate, and failed inserts
  execute zero prune/retention SQL; L06's new service is not imported here.

## Security Contract

- `/admin/api/search` remains internal with session auth, current search RBAC,
  admin read rate-limit bucket, and strict reject-unknown validation; it has no
  write and no CSRF requirement.
- Existing public search route remains public read-only with its current public
  rate limit and publication/visibility filters. No nonce/HMAC/CAPTCHA is added
  because no public write exists.
- Query text is parameterized and length bounded. User email remains hash-exact
  under authorized admin scope; encrypted/plain email, hashes, tokens, private
  content, and binds never enter vectors, plan evidence, logs, or errors.

## Validation Commands

- `bunx vitest run tests/vitest/search/searchService.test.ts tests/vitest/search/searchIndexService.test.ts tests/vitest/db/searchVectorDefinitions.test.ts`
- `bun test tests/unit/search/searchServiceDateRange.test.ts tests/unit/search/searchHistoryService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/database/searchVectorMigration.test.ts tests/integration/routes/search.test.ts tests/integration/database/searchRankedQueries.test.ts tests/perf/database-search-plans.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs. Pass consumed vector/trigram fields and exact index names,
conditional fallback receipt, search-history retention handoff, limits, and
ranked-query plan evidence to TASK-551-10-L02.

## Quantified Acceptance

- All five CMS source queries use their TASK-551-05 generated column with 100%
  schema/query reference coverage and zero locally reconstructed vectors.
- Search reads at most 51 ranked rows, executes at most 4 statements, and meets
  the parent 10-100x large-fixture improvement target or records a stricter
  evidence-backed budget without weakening correctness.
- Large-fixture plans use the intended index and read no more than 10x the
  returned rows per selected source after unavoidable rank filtering.
- Search-history request writes execute exactly zero retention/prune statements;
  `searchHistoryService.ts` has exactly one TASK-551 writer (this leaf).
- Every touched production/test file is at most 1,000 physical lines.
