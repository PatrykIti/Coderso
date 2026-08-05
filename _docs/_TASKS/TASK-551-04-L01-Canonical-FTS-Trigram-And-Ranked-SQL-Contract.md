# TASK-551-04-L01: Canonical FTS, Trigram, and Ranked SQL Contract
# FileName: TASK-551-04-L01-Canonical-FTS-Trigram-And-Ranked-SQL-Contract.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-04
**Priority:** Critical
**Category:** Database / Search / Performance
**Estimated Effort:** Large
**Dependencies:** TASK-551-03-L03, TASK-551-06-L03, and the
TASK-551-09-L04 INITIAL Admin-authority receipt
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
`core/admin/utils/adminCacheAuthority.ts` and
`core/admin/services/cachePolicy.ts` are read-only L04 dependencies. This leaf
registers every `searchClient.ts` map/promise plus `useSearchResults.ts` delayed
search/history operation with the INITIAL reset authority, captures its opaque
installation token before async work, and verifies that token plus the current
intent generation before installing a result. It returns an adoption receipt;
L04 FINAL must not reopen either 04-owned file.

## Implementation Pseudocode

```ts
const SEARCH_SOURCE_CONTRACT = strictReadonly({
  pages: { vector: pages.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.pages, updatedAt: pages.updatedAt, id: pages.id },
  entries: { vector: contentEntries.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.entries, updatedAt: contentEntries.updatedAt, id: contentEntries.id },
  posts: { vector: posts.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.posts, updatedAt: posts.updatedAt, id: posts.id },
  media: { vector: media.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.media, updatedAt: media.createdAt, id: media.id },
  users: { vector: users.searchVector, trigram: TRIGRAM_INDEXED_SOURCE_CONTRACT.users, updatedAt: users.updatedAt, id: users.id },
});

export const TASK551_SEARCH_CONFIG = "simple";
export const TASK551_PREFIX_TOKEN_MAX = 16;
export const TASK551_PREFIX_TOKEN_CODE_POINT_MAX = 64;
export const TASK551_TRIGRAM_MIN_CODE_POINTS = 3;
export const TASK551_TRIGRAM_SIMILARITY_THRESHOLD = 0.3;
const TASK551_PREFIX_TOKEN_PATTERN = /[\p{L}\p{M}\p{N}_]+/gu;

function buildTask551PrefixTsquery(input: string): string {
  const normalized = input.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (codePointLength(normalized) < 2 || codePointLength(normalized) > 200 ||
      utf8ByteLength(normalized) > 800) throw new Error("search_query_invalid");
  const tokens = normalized.match(TASK551_PREFIX_TOKEN_PATTERN) ?? [];
  if (tokens.length === 0 || tokens.length > TASK551_PREFIX_TOKEN_MAX ||
      tokens.some((token) => codePointLength(token) > TASK551_PREFIX_TOKEN_CODE_POINT_MAX))
    throw new Error("search_query_invalid");
  // Every tsquery metacharacter is a separator, so no quote/backslash escape
  // routine or raw interpolation exists.
  return tokens.map((token) => `${token}:*`).join(" & ");
}

// Imported read-only from core/db/schema/searchVectors.ts; never reconstructed.
const normalizedNeedleSql = normalizeTask551TrigramSql(parameterizedQueryText);

function parseSearchRequest(input: unknown): StrictSearchRequest {
  // Reject unknown fields; normalize query; length 2..200; limit default 20/max 50.
}

async function searchAll(request: StrictSearchRequest, deps: SearchDeps): Promise<SearchItem[]> {
  const responseCap = request.limit + 1; // 2..51 including lookahead
  const prefixQuery = buildTask551PrefixTsquery(request.query);
  // parseSearchRequest already owns NFKC/whitespace normalization; SQL still
  // applies the imported canonical trigram normalizer to the bound needle.
  const trigramEligible = codePointLength(request.query) >=
    TASK551_TRIGRAM_MIN_CODE_POINTS;
  return deps.db.transaction(
    { isolationLevel: "repeatable read", readOnly: true },
    async (tx) => {
      if (trigramEligible && request.sources.some(isTrigramReceiptSelected)) {
        await tx.execute(sql.raw(
          "SET LOCAL pg_trgm.similarity_threshold = '0.300'",
        ));
        await assertSameBackendThreshold(tx, TASK551_TRIGRAM_SIMILARITY_THRESHOLD);
      }
      return executeRankedSearch(tx, { request, responseCap, prefixQuery,
        trigramEligible, normalizedNeedleSql });
    },
  );
  // One ranked statement builds exact-email (users only, 0..1), FTS and optional
  // trigram CTEs for each selected source. Authorization/publication/date
  // predicates are inside every source arm before its ORDER/LIMIT.
  // One input CTE binds literal `to_tsquery('simple',$1)` once. Each FTS arm
  // uses `search_vector @@ fts_query` and
  // `ts_rank_cd(search_vector, fts_query, 32)` exactly.
  //
  // Per source, exact-email consumes one slot when applicable; FTS consumes at
  // most the remaining responseCap slots. Trigram is emitted only for a source
  // selected by the L05 receipt and only when exact+FTS produced fewer than
  // responseCap rows. It anti-joins those bounded identities and receives
  // exactly responseCap-exactCount-ftsCount slots. Therefore all physical arms
  // emit <= responseCap rows per source, <= 5*51=255 before global ranking.
  //
  // UNION ALL retains provenance. Deduplicate by (sourceType,id) with exact
  // email before FTS before trigram; within a tier use score DESC, updatedAt
  // DESC, sourceType ASC, id DESC. Apply the same order globally and LIMIT
  // responseCap. FTS rank and trigram similarity are never compared across
  // tiers. Trigram is exactly `search_trigram_text % normalizedNeedle` scored by
  // `similarity(search_trigram_text, normalizedNeedle)`. The +1 row is internal
  // lookahead only; return the first request.limit items and add no cursor.
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

FTS parsing is closed and shared by Admin/public paths. Normalize NFKC and
whitespace, enforce 2..200 code points and at most 800 UTF-8 bytes, extract at
most 16 runs through the literal `/[\p{L}\p{M}\p{N}_]+/gu`, require each run at
most 64 code points, and reject
an empty/oversized token set rather than truncating. Punctuation—including
hyphen—and every `to_tsquery` metacharacter are separators. Therefore the only
emitted grammar is `token:*` joined by ` & ` and passed as one bind to
`to_tsquery('simple', ...)`; no user character is quoted, backslash-escaped, or
interpolated into SQL. `plainto_tsquery`, `websearch_to_tsquery`, and local
query-string variants are forbidden. Every FTS arm uses its generated column
with `@@` and exact `ts_rank_cd(...,32)` score.

Fallback is bounded and parameterized and is enabled per source only when the
TASK-551-05-L02 large-fixture receipt proves that exact index node, bounded rows/
buffers, and accepted write cost. A rejected or missing candidate means FTS-only
for that source—never an unindexed `ILIKE` scan. Exact email lookup continues via
`emailHash`, never a searchable vector, is available only under its existing
authorized Admin rule, returns at most one candidate and consumes one of that
source's 51 slots. The exact candidate accounting is closed: at most five source
arms, each `exact + FTS + non-overlapping trigram <= limit + 1 <= 51`, hence at
most 255 rows enter dedup/global rank and at most 51 leave it. `UNION ALL` is
mandatory; a window/`DISTINCT ON` identity pass chooses `exact_email`, then
`fts`, then `trigram` for the same `(sourceType,id)`. Match tier is ordered before
score so incomparable FTS rank and trigram similarity are never mixed.

For any selected fallback, query normalization uses the imported exact SQL
literal once. At fewer than three normalized code points the source is FTS-only.
Otherwise one read-only `REPEATABLE READ` transaction first executes only the
static `SET LOCAL pg_trgm.similarity_threshold = '0.300'`, verifies the same PID
observes numeric `0.3`, and runs retrieval on that transaction handle. Candidate
predicate and score are exactly `search_trigram_text % normalizedNeedle` and
`similarity(search_trigram_text, normalizedNeedle)`. Since there is no LIKE/
ILIKE/regex predicate, `%`, `_`, backslash and regex characters in the bound
needle have no wildcard-control semantics. Commit/rollback restores the prior
session setting; a subsequent checkout proves no leakage. A set/PID/threshold
failure is internal `search_trigram_session_invalid`, mapped to bounded public
`search_unavailable` without silently issuing an unindexed fallback or logging
the query/needle.

The “10x” budget language means only a checked-in per-fingerprint planner
ceiling; it is not calculated as rows read divided by the number of rows that
survive global top-k, because a valid selected source may contribute zero final
rows. Candidate materialization instead has the absolute 255-row ceiling above.
Index tuples, heap tuples fetched/rechecked, buffers and normalized p95 are each
checked against TASK-551-01's exact common/rare/unique/miss numeric receipt and
TASK-551-05-L02's corresponding sanitized plan. No arm may claim `LIMIT 51` as
proof that PostgreSQL read only 51 rows.

Known errors are stable `search_query_invalid`, `search_unavailable`, internal
`search_trigram_session_invalid`,
`search_history_invalid`, `search_history_idempotency_required`, and
`search_history_idempotency_conflict`; only the last maps to HTTP 409. There is
no search cursor field or cursor-specific error in this v1 contract.

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
- Table-drive NFKC, combining marks, Unicode letters/numbers, underscores,
  repeated whitespace, punctuation, hyphens and every tsquery metacharacter.
  Pin the exact 2/200-code-point, 800-byte, 16-token and 64-code-point-per-token
  boundaries; overflow/no-token inputs reject without SQL. Expected output is
  byte-exact `token:* & token:*`. Source/SQL guards require one bound
  `to_tsquery('simple',...)`, generated-column `@@`, and
  `ts_rank_cd(...,32)`, and reject plainto/websearch/local parser variants or
  raw interpolation.
- Search tests cover accents/Unicode, punctuation, prefix/fuzzy behavior,
  ties, dates, categories, public publication filters, admin authorization, and
  deterministic result identity across repeated runs.
- Pin request limits 1/50 and authorization/date cases leaving 1/5 eligible
  sources: each source's exact-email +
  FTS + non-overlapping trigram rows total at most `limit+1`, the five-source
  pre-rank set is at most 255, and final output is at most 51. Seed one identity
  in all eligible match arms and prove one result with precedence exact-email →
  FTS → trigram. Fill FTS to the per-source cap and prove zero trigram rows;
  leave N slots and prove trigram can emit at most N after anti-join. A source
  without the exact L05 receipt emits zero trigram SQL/rows.
- Use deliberately inverted numeric FTS/similarity scores and prove match tier,
  then score, update time, source type and ID is the exact total order. A source
  that loses global top-k remains valid and does not create a divide-by-zero or
  misleading per-final-row scan assertion.
- Large fixtures use `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` with sanitized
  binds; assert intended index nodes, one ranked retrieval statement (`<= 4`
  whole-endpoint statements), the absolute candidate caps, each receipt's exact
  index/heap-row, buffer and normalized-p95 ceiling, and no forbidden growing-
  table sequential scan. Rows read are planner evidence, not the 255 candidates
  or 51 response rows. Small fixtures may choose a seq scan by cost and are
  judged by their numeric receipt rather than forced planner settings.
- Trigram integration reserves/observes one backend PID, runs static `SET LOCAL
  pg_trgm.similarity_threshold = '0.300'` and retrieval in the same read-only
  transaction, then proves commit and rollback each restore the prior setting on
  reuse. Pin exact three-code-point eligibility, `%` predicate, `similarity`
  score, normalized-needle byte identity, code-owned `0.3`, and selected GIN/
  `gin_trgm_ops` plan. Remove/change SET LOCAL, PID, threshold, `%`, score or
  receipt and fail; no fallback to ILIKE/LIKE/regex is allowed. Literal `%`, `_`,
  backslash and regex metacharacter binds neither widen results nor leak to
  SQL/errors/telemetry. SET/PID failure maps through
  `search_trigram_session_invalid` to `search_unavailable`.
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
- Delay cached search, background revalidation and history completion across an
  L04 installation-authority transition. The completion may settle only for its
  original caller; it cannot install, emit history for the new audience or
  survive the registered reset. The L04 exhaustive matrix accepts the receipt
  for exactly `searchClient.ts` and `useSearchResults.ts` and L04 FINAL edits
  neither file.
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
- Admin search cache/history work is scoped by L04's opaque installation
  authority but never uses that browser token as authentication or RBAC; server
  session and `content:read` checks remain authoritative.

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
constructor/token/prefix grammar, code threshold/same-session behavior,
conditional fallback receipt, limits, ranked-query plan evidence, and the
read-only GET plus strict idempotent history-POST API/security delta to
TASK-551-10-L02. Its closure update must replace `_docs/SEARCH_SPEC.md`'s stale
`plainto_tsquery`/ILIKE wording with this exact `to_tsquery`/indexed `%` contract.

## Quantified Acceptance

- All five CMS source queries use their TASK-551-05 generated column with 100%
  schema/query reference coverage and zero locally reconstructed vectors.
- Search reads at most 51 ranked rows, executes at most 4 statements, and meets
  the parent 10-100x large-fixture improvement target or records a stricter
  evidence-backed budget without weakening correctness.
- Exact-email + FTS + non-overlapping trigram emits at most 51 candidates per
  selected source and 255 before global ranking. Dedup uses exact-email → FTS →
  trigram precedence and score is compared only within a match tier. Large-
  fixture planner reads/buffers/p95 satisfy their checked-in per-fingerprint
  numeric receipts; no ratio uses only the rows surviving global top-k.
- FTS constructor/token/prefix bytes and trigram predicate/score/threshold are
  exact across Admin/public SQL. Selected large plans prove GIN use; session
  threshold never leaks, and no LIKE/ILIKE/regex fallback exists.
- Every search GET is observably read-only. History persistence occurs only on
  the strict internal POST with CSRF/admin-write throttling and actor-scoped
  UUID idempotency; 50 exact replays add one row and mismatched reuse adds none.
- TASK-551-04 writes zero search-history production/test files, preserves L06's
  validated `pruneHistory` removal/idempotency behavior, and leaves zero
  production callers of its transitional string-input branch.
- Both owned Admin search modules return a complete L04 INITIAL authority/reset
  adoption receipt; no pre-transition result/history completion installs into a
  later audience and L04 FINAL does not reopen these files.
- Every touched production/test file is at most 1,000 physical lines.
