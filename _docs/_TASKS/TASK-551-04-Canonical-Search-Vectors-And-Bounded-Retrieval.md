# TASK-551-04: Canonical Search Vectors and Bounded Retrieval
# FileName: TASK-551-04-Canonical-Search-Vectors-And-Bounded-Retrieval.md

**Parent Task:** TASK-551
**Priority:** Critical
**Category:** Database / Search / Performance
**Estimated Effort:** Large
**Dependencies:** TASK-551-03-L03, TASK-551-06-L03, and the
TASK-551-09-L04 INITIAL Admin-authority receipt for L01
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Replace expression-drifted, sequential, and unbounded search with one canonical
stored/generated-vector contract already landed by TASK-551-05, deterministic
database rank/order/limits that consume its matching GIN/trigram indexes, and a
bounded assistant candidate stage. Preserve search visibility, PII, and
public-route policy without reopening schema or migration ownership. Search
GETs become observably read-only; the user's recent-history mutation moves to a
strict, CSRF-protected, idempotent internal POST.

## Sub-Tasks

1. `TASK-551-04-L01` consumes TASK-551-05's canonical CMS generated columns and
   indexes after TASK-551-03-L03 and TASK-551-06-L03, then owns current search
   services/routes, admin search client/hook, ranked query semantics, read-only
   GETs, and the history POST. It imports L06's Bun-free history request/parser
   and idempotent persistence command without editing them. Its two Admin owners
   adopt L04 INITIAL's opaque installation/reset seam and return a receipt that
   L04 FINAL consumes without reopening those files.
2. `TASK-551-04-L02` consumes TASK-551-05's two local assistant vectors and
   bounds a joined/union candidate set before Bun-side intent reranking.

Neither leaf may edit schema or migrations. TASK-551-05-L01 is the sole
TASK-551 owner of generated-vector expressions, columns, GIN/trigram indexes,
Drizzle schema exports, and the migration triple; both leaves import and query
that landed contract read-only.

## Schema and Collision Guard

- Confirm TASK-551-03-L03 and TASK-551-06-L03 are terminal before dispatch;
  their dependency chain must also contain terminal TASK-551-05-L02 with green
  vector/index migration evidence. This preserves the compile-green order
  `01 -> 02 -> 08-L03 INITIAL -> 05 -> 03-L01 -> 06 -> 07-L01 ->
  09-L04 INITIAL -> 03-L02 -> 07-L02 -> 08-L01/L02/L03 FINAL ->
  03-L03 -> 04`. If the landed
  schema exports, generated expressions, or indexes cannot support the query
  contract, pause for a TASK-551-05 contract correction; do not patch schema or
  emit a second migration from this family.
- The parent external dispatch gate is mandatory. TASK-493 and the other three
  active collision families are terminal by default; only its exact fresh
  all-path serialized handoff may substitute. These leaves then optimize only
  existing search and assistant docs retrieval and never write SEO/GSC files.
- TASK-511 backup, TASK-517 entry/public runtime, TASK-518 migration, server
  cache, unrelated schema/service, task/changelog/workflow paths are forbidden.
  L01 may import only L04 INITIAL's Admin authority and existing cache-policy
  APIs read-only; it edits exactly its own search client/hook and returns the
  adoption receipt.

## Shared Acceptance

- Every query references the generated columns exported by TASK-551-05; no
  service reconstructs a `to_tsvector` expression at query time.
- FTS input uses exactly one input CTE binding literal
  `to_tsquery('simple',$1)`. The code-owned NFKC grammar accepts only Unicode
  letter/mark/number/underscore token runs, rejects rather than truncates more
  than 16 tokens or 64 code points per token, emits `token:*` joined by ` & `,
  and both predicate/rank reuse that bound tsquery alias. Predicate/rank are
  exactly `search_vector @@ query` and `ts_rank_cd(search_vector,query,32)`.
- All source text uses TASK-551-05's exact immutable-compatible
  `coalesce(...) || ' ' || ...` constants. Schema, migration, snapshot, and
  query-normalizer renders retain byte identity; no search service introduces
  a stable variadic concatenation helper.
- Search has deterministic `rank DESC, updated_at DESC, id DESC` (or documented
  equivalent), database-side limits, and at most 4 statements for global/public
  CMS search and 1 statement for assistant candidates. L01's exact global
  algorithm orders match tier (`exact_email`, FTS, trigram), then score/time/
  source/ID; incomparable FTS rank and trigram similarity are never mixed.
- Selected trigram fallback runs in the same read-only transaction/backend as
  retrieval after static `SET LOCAL pg_trgm.similarity_threshold = '0.300'`.
  It requires at least three normalized code points and uses exactly indexed
  `search_trigram_text % :normalizedNeedle` plus
  `similarity(search_trigram_text,:normalizedNeedle)`; there is no LIKE/ILIKE/
  regex wildcard-escaping path or session-setting leakage.
- For each of at most five sources, exact-email + FTS + non-overlapping trigram
  emits at most `limit+1<=51`; at most 255 candidates enter global rank and at
  most 51 leave it. `UNION ALL` retains provenance and identity dedup prefers
  exact-email, then FTS, then trigram. Planner rows/buffers/p95 use exact checked-
  in per-fingerprint receipts; no ratio divides by only the rows surviving
  global top-k.
- Large-fixture plans use the intended GIN/trigram indexes, do not sequentially
  scan growing source tables, and meet TASK-551-01 budgets.
- Search results do not expose unpublished/unauthorized records, encrypted
  fields, hashes, or raw email except under the existing authorized admin rule.
- GET `/admin/api/search` and every other search GET execute zero history
  mutation. POST `/admin/api/search/history` is the sole write and reuses one
  actor-scoped UUID key across cache/background retries of one UI intent.
- Delayed search/cache/history work cannot install across L04's Admin
  installation-authority transition; this browser guard never substitutes for
  session/RBAC enforcement.

## Security Contract

- GET `/admin/api/search` remains internal with session auth, current search
  RBAC, the admin-read rate-limit bucket, strict validation, and no write/CSRF.
  POST `/admin/api/search/history` is internal session-only, `content:read`,
  CSRF protected, admin-write rate limited, strict reject-unknown, and
  actor/idempotency bound; it returns only `{recorded:boolean}` and has no
  public/API-key alias. The
  existing public search route remains read-only with its publication/
  visibility filters and public-read limit. No public write exists, so nonce/
  HMAC and CAPTCHA remain inapplicable.
- Query text is length-bounded and parameterized. Per-source authorization is
  applied before candidate limits and ranking. Trigram fallback is enabled only
  for a source whose TASK-551-05 evidence receipt proves its exact matching
  index; there is no unindexed growing-table fallback.
- V1 has no search cursor. It returns at most the requested 50 items after an
  internal one-row lookahead; no cursor field or cursor-specific error exists.
- Email remains hash-exact under existing authorized admin scope and is excluded
  from vectors/trigram text. Logs/plans/errors omit query binds, private content,
  emails/hashes, credentials, tokens, and customer payloads.

## Testing Requirements

Run both leaves' targeted Vitest, DB integration, and performance suites plus
TASK-551-05's vector drift test read-only, then `bun run gates:coderso:perf`,
`bun --cwd core lint:types`, and
`bun --cwd core lint`. TASK-551-06-L01 already owns
the Bun-free search-history contract, `searchHistoryService.ts`, their direct
tests, actual `pruneHistory` removal, and idempotent command; TASK-551-04
consumes that landed behavior read-only and must not reopen those files. L01's
route/client/hook tests prove GET no-write plus POST auth/RBAC/CSRF/rate-limit/
strict-validation/idempotency behavior.
L01 also pins its 51-per-source/255-global candidate accounting, match-tier
dedup precedence, per-fingerprint planner receipts and L04 authority adoption.

## Documentation Updates Required

No shared docs are edited here. L01/L02 hand exact vector/trigram columns,
constructor/token/prefix grammar, threshold/session behavior, conditional-
fallback evidence, limits, visibility, and plan results to TASK-551-10-L02.
Closure must update `_docs/SEARCH_SPEC.md`: its current `plainto_tsquery` and
ILIKE wording is obsolete and cannot remain after this `to_tsquery`/indexed `%`
contract lands. Shared docs and changelog 1263 remain closure's sole ownership.
