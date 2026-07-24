# TASK-551-04-L01: Canonical FTS, Trigram, and Ranked SQL Contract
# FileName: TASK-551-04-L01-Canonical-FTS-Trigram-And-Ranked-SQL-Contract.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-04
**Priority:** Critical
**Category:** Database / Search / Performance
**Estimated Effort:** Large
**Dependencies:** TASK-551-03-L03, TASK-551-06-L03
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Consume the exact vector inputs, weights, text-search configuration, generated
columns, and matching indexes owned by TASK-551-05. Own the trigram fallback,
rank expression, projections, and deterministic limits for pages, entries,
posts, media, and users. Replace sequential per-source fetching with bounded
ranked SQL while retaining current source/category response semantics. Restore
safe-method semantics by making search GETs read-only and moving recent-history
persistence to one strict idempotent internal POST.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Production:** `core/services/search/searchContract.ts`,
`core/services/search/searchService.ts`,
`core/services/search/searchIndexService.ts`,
`core/server/routes/searchRoutes.ts`,
`core/admin/services/searchClient.ts`, and
`core/admin/ui/search/useSearchResults.ts`.

**Tests:** `tests/vitest/search/searchService.test.ts`,
`tests/vitest/search/searchIndexService.test.ts`,
`tests/vitest/admin/searchClient.test.ts`,
`tests/vitest/ui/use-search-results.test.tsx`,
`tests/unit/search/searchServiceDateRange.test.ts`,
`tests/integration/routes/search.test.ts`,
`tests/integration/server/task551SearchRankedQueries.test.ts`, and
`tests/perf/database-search-plans.test.ts`.

Every other path is forbidden, including all `core/db/schema*` and
`core/db/migrations/**` paths (TASK-551-05),
`core/services/search/searchHistoryContract.ts`,
`core/services/search/searchHistoryService.ts`,
`tests/vitest/search/searchHistoryContract.test.ts`, and
`tests/unit/search/searchHistoryService.test.ts` (sole TASK-551-06-L01
ownership; production contract imports are read-only), assistant service
consumers (L02), TASK-493 GSC files,
TASK-511/TASK-517/TASK-518 files, cache, task, changelog, and workflow files.
This leaf emits no DDL or migration metadata. It consumes the already-landed
TASK-551-06-L01 removal of inline `pruneHistory` and its strict idempotent
`recordSearch` command read-only. It does not edit that service/test; it removes
the only legacy string-input caller from GET and invokes only the command shape
from POST.

## Implementation Pseudocode

```ts
const SEARCH_SOURCE_CONTRACT = strictReadonly({
  pages: { vector: pages.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.pages, updatedAt: pages.updatedAt, id: pages.id },
  entries: { vector: contentEntries.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.entries, updatedAt: contentEntries.updatedAt, id: contentEntries.id },
  posts: { vector: posts.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.posts, updatedAt: posts.updatedAt, id: posts.id },
  media: { vector: media.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.media, updatedAt: media.createdAt, id: media.id },
  users: { vector: users.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.users, updatedAt: users.updatedAt, id: users.id },
});

// Imported read-only from core/db/schema/searchVectors.ts; never reconstructed.
const normalizedNeedle = normalizeTask551TrigramSql(parameterizedQueryText);

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

// Imported read-only from L06's Bun-free searchHistoryContract.ts:
// SearchHistoryWriteRequest, SearchHistoryWriteCommand, and the strict
// parseSearchHistoryWriteRequest(input) normalizer. Do not duplicate its keys,
// enums, bounds, UUID rule, or command mapping in route/browser code.

router.get("/search", requirePermission("content:read"), async (ctx) => {
  // Parse and run ranked search only. No recordSearch import/call and no DB,
  // cache, audit, or fire-and-forget mutation after the response is computed.
});

router.post("/search/history", requirePermission("content:read"), async (ctx) => {
  const actorId = requireSessionActorId(ctx);
  const command = parseSearchHistoryWriteRequest(ctx.body);
  try {
    return await recordSearch(actorId, command); // exact L06 command shape
  } catch (error) {
    throw mapSearchHistoryError(error); // idempotency conflict -> 409
  }
});

export async function recordSearchHistory(
  request: SearchHistoryWriteRequest,
  signal?: AbortSignal,
): Promise<{ recorded: boolean }> {
  return apiRequest("/search/history", {
    method: "POST", body: JSON.stringify(request), signal,
    headers: { "Content-Type": "application/json" },
  }, { withCsrf: true });
}

// useSearchResults owns user intent. Keep one randomUUID for the current
// normalized query+limit+dateRange request key across cache hydration and its
// background revalidation; a changed intent gets a new UUID. searchAllCached
// awaits a per-key single-flight recordSearchHistory after successful search,
// suppresses only that write's sanitized failure, and still returns the search
// result. Cleanup aborts search/history; non-UI/prefetch callers pass no history.
```

`searchHistoryContract.ts` and its direct contract test remain solely L06-owned;
the route and browser client import its strict request/command types and parser
read-only rather than adding validation state to the already single-writer
route index. The internal `/admin/api` HTTP
layer already applies session/CSRF middleware and selects `admin_write` for
POST; the route retains `content:read` because recording a user's own successful
search does not grant content mutation authority. `searchClient.ts` must pass
`withCsrf:true`. There is no public history endpoint, nonce, CAPTCHA, API-key
mode, or GET mutation.

The idempotency key is one UUID per explicit normalized UI search intent, not
per fetch retry. Cache hydration plus forced background revalidation, CSRF token
refresh, concurrent hook settlement, and an exact client retry reuse the same
key; changing query/limit/date range after debounce creates a new key. The
client's in-flight map is removed on settlement and stores no result long-term.
History-write failure never erases or relabels a valid search response. L06's
actor/key-derived primary-key contract makes the server authoritative for
replay/conflict behavior; the raw key never appears in logs/telemetry/recent
response data.

TASK-551-05 installs the required extensions, five CMS generated vectors, and
matching GIN plus evidence-selected normalized trigram indexes. Exact trigram
candidates are the stored generated `search_trigram_text` columns for pages,
content entries, posts, media, and users, with respective index names
`pages_search_trigram_idx`, `content_entries_search_trigram_idx`,
`posts_search_trigram_idx`, `media_search_trigram_idx`, and
`users_search_trigram_idx`, all `USING GIN (search_trigram_text gin_trgm_ops)`.
Generated text and parameter needle both call TASK-551-05's exported
`normalizeTask551TrigramSql`; source concatenation and all seven exact weighted
`SEARCH_VECTOR_SQL` expressions remain owned there. This leaf imports those
contracts read-only and never reconstructs normalization, `coalesce`, JSON
casts, concatenation, configuration, or A/B weights. Every multi-field source
is the exact immutable-compatible `coalesce(...) || ' ' || ...` byte sequence
from L05-L01; a stable variadic concatenation helper is forbidden. The rendered
query-normalizer literal must be byte-identical to the schema/migration constant
before PostgreSQL parsing, while live catalog equivalence remains a second
semantic check.

Fallback is bounded and parameterized and is enabled per source only when the
TASK-551-05-L02 large-fixture receipt proves that exact index node, bounded rows/
buffers, and accepted write cost. A rejected or missing candidate means FTS-only
for that source—never an unindexed `ILIKE` scan. Exact email lookup continues via
`emailHash`, never a searchable vector. Known errors are stable
`search_query_invalid`, `search_cursor_invalid`, `search_unavailable`,
`search_history_invalid`, `search_history_idempotency_required`, and
`search_history_idempotency_conflict`; only the last maps to HTTP 409.

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
- Mutate one imported vector weight/coalesce/JSON cast or locally spell the
  trigram normalizer; the drift/source guard must fail. Pin exact schema/query/
  migration bytes for each imported source and reject a changed `|| ' ' ||`
  separator or stable variadic helper.
- Search tests cover accents/Unicode, punctuation, prefix/fuzzy behavior,
  ties, dates, categories, public publication filters, admin authorization, and
  deterministic result identity across repeated runs.
- Large fixtures use `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` with sanitized
  binds; assert intended index nodes, bounded rows, `<= 4` statements, and no
  growing-table sequential scan. Small fixtures may choose a seq scan by cost
  and are judged by latency/rows rather than forced planner settings.
- Unknown fields, overlong query, invalid limit/source/date, SQL metacharacters,
  and unauthorized/private records fail safely without PII/SQL leakage.
- Safe-method tests instrument `recordSearch` plus the DB and prove `/search`,
  `/search/recent`, `/search/public-preview`, and public search GET/HEAD paths
  execute zero history mutation under success, miss, invalid, unauthorized and
  repeated calls. A source guard rejects any `recordSearch` call in a GET
  handler, `void` persistence promise, or write-on-response hook.
- POST route tests pin the exact four-key body and reject missing/unknown/
  coerced/invalid query, limit, dateRange and UUID before service execution.
  They prove session auth, `content:read`, global CSRF enforcement, the
  `admin_write` rate bucket, actor binding, first `{recorded:true}`, exact replay
  `{recorded:false}`, mismatched replay 409, and no raw key/query/filters in
  errors/logs. The route passes L06's exact command object and never accepts an
  actor ID from the body.
- `searchClient.test.ts` asserts `POST /search/history`, JSON body,
  `withCsrf:true` (including CSRF refresh reuse), and one in-flight call per key.
  `use-search-results.test.tsx` pins one UUID across cache hydrate + background
  revalidation/retry, a new UUID after query/limit/date change, no POST below two
  characters or on failed search, abort on cleanup, and successful result UI
  despite a sanitized history-write failure. Non-hook/prefetch search calls
  record nothing.
- Assert this leaf neither edits/imports a replacement for nor directly tests
  `searchHistoryService.ts`; TASK-551-06-L01's landed `pruneHistory` removal and
  idempotency implementation remain unchanged. Source guards require zero
  production legacy string-input callers after this leaf.

## Security Contract

- `GET /admin/api/search` remains internal with session auth, `content:read`, the
  admin-read rate-limit bucket, strict query validation, zero mutation, and no
  CSRF requirement. `GET /admin/api/search/recent` has the same read contract.
- `POST /admin/api/search/history` is the sole history write: internal only,
  session actor required, `content:read`, shared CSRF middleware, admin-write
  rate-limit bucket, strict reject-unknown four-key body, actor-bound UUID
  idempotency, and no API-key mode. It returns only `{recorded:boolean}`. Because
  it is not public, nonce/HMAC and CAPTCHA are not applicable; no weaker public
  alias is added.
- Existing public search route remains public read-only with its current public
  rate limit and publication/visibility filters. No nonce/HMAC/CAPTCHA is added
  because no public write exists.
- Query text is parameterized and length bounded. User email remains hash-exact
  under authorized admin scope; encrypted/plain email, hashes, tokens, private
  content, and binds never enter vectors, plan evidence, logs, or errors.

## Validation Commands

- `bunx vitest run tests/vitest/search/searchService.test.ts tests/vitest/search/searchIndexService.test.ts tests/vitest/db/searchVectorDefinitions.test.ts`
- `bunx vitest run tests/vitest/admin/searchClient.test.ts tests/vitest/ui/use-search-results.test.tsx`
- `bun test tests/unit/search/searchServiceDateRange.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/server/task551SearchVectorMigration.test.ts tests/integration/routes/search.test.ts tests/integration/server/task551SearchRankedQueries.test.ts tests/perf/database-search-plans.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs. Pass consumed vector/trigram fields and exact index names,
conditional fallback receipt, limits, ranked-query plan evidence, and the
read-only GET plus strict idempotent history-POST API/security delta to
TASK-551-10-L02.

## Quantified Acceptance

- All five CMS source queries use their TASK-551-05 generated column with 100%
  schema/query reference coverage and zero locally reconstructed vectors.
- Search reads at most 51 ranked rows, executes at most 4 statements, and meets
  the parent 10-100x large-fixture improvement target or records a stricter
  evidence-backed budget without weakening correctness.
- Large-fixture plans use the intended index and read no more than 10x the
  returned rows per selected source after unavoidable rank filtering.
- Every search GET is observably read-only. History persistence occurs only on
  the strict internal POST with CSRF/admin-write throttling and actor-scoped
  UUID idempotency; 50 exact replays add one row and mismatched reuse adds none.
- TASK-551-04 writes zero search-history production/test files, preserves L06's
  validated `pruneHistory` removal/idempotency behavior, and leaves zero
  production callers of its transitional string-input branch.
- Every touched production/test file is at most 1,000 physical lines.
