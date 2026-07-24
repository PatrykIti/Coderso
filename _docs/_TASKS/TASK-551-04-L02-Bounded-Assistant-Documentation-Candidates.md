# TASK-551-04-L02: Bounded Assistant Documentation Candidates
# FileName: TASK-551-04-L02-Bounded-Assistant-Documentation-Candidates.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-04
**Priority:** High
**Category:** Database / Assistant / Search / Performance
**Estimated Effort:** Medium
**Dependencies:** TASK-551-04-L01, TASK-551-05-L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Push assistant documentation candidate selection into one indexed, ranked, and
bounded SQL query over the two local vectors landed by TASK-551-05:
`assistant_docs` title/keywords and `assistant_doc_chunks` heading/content.
Preserve the existing explainable intent/BM25 refinement on only that bounded
joined candidate set and preserve final answer quality and citations.

## File Ownership

**Allowlist:** `core/services/assistant/assistantDocsCandidateQuery.ts`,
`core/services/assistant/docsDbRetriever.ts`,
`tests/vitest/assistant/docsDbRetriever.test.ts`,
`tests/integration/database/assistantDocsCandidateQuery.test.ts`, and
`tests/perf/database-assistant-docs-search.test.ts` only.

**Forbidden:** `docsIngestService.ts`, `docsIndexService.ts`, all search/vector
and migration files from L01/TASK-551-05, DB schema, assistant action/execution paths,
TASK-493/TASK-511/TASK-517/TASK-518 paths, cache, task/changelog/workflow files.

## Implementation Pseudocode

```ts
type CandidateQuery = StrictReadonly<{
  normalizedQuery: string;
  expandedTerms: readonly string[];
  candidateLimit: number; // default 100, max 200
}>;

async function listAssistantDocCandidates(input: CandidateQuery, db: Db): Promise<CandidateRow[]> {
  // One SQL statement:
  // 1. q = parameterized websearch/prefix tsquery.
  // 2. chunk_hits searches assistant_doc_chunks.search_vector, ordered by
  //    chunk rank/doc_id/chunk_index/id, capped at candidateLimit.
  // 3. doc_hits searches assistant_docs.search_vector, ordered by doc rank/
  //    source_path/id, capped at min(candidateLimit, 50).
  // 4. For each doc hit, one LATERAL indexed lookup selects at most two chunks
  //    by chunk_index/id. UNION ALL these ids with chunk_hits.
  // 5. GROUP BY chunk id, combine max chunk rank + max doc rank, order combined
  //    rank DESC, source_path ASC, chunk_index ASC, chunk id ASC, LIMIT once.
  // 6. Only then join assistant_docs + assistant_doc_chunks and project the
  //    exact reranker/citation fields. No cross-table generated expression.
}

async function retrieveDocs(query: string, options: Options, deps: Deps): Promise<DocsSearchHit[]> {
  const candidates = await deps.listCandidates(buildCandidateQuery(query, options));
  return rerankCandidates(candidates, inferIntent(query)).slice(0, resolveTopK(options.topK));
}
```

Candidate limits and query lengths are clamped/rejected before DB work. Empty
or tokenless queries return without a query. Preserve matched-term, score, path,
heading, line, and citation fields. Errors are stable `docs_query_invalid` and
`docs_retrieval_unavailable` without falling back to an unbounded full-table read.
Both FTS predicates reference the landed local generated columns directly; doc
title/keywords relevance enters chunk candidates through the bounded join/UNION,
never through an impossible cross-table chunk generated column.

## Regression-Test Shape

- Golden corpus compares current expected top-K identities, order, scores within
  declared tolerance, location/how/capability modes, Polish/English tokens, and
  deterministic tie breaks.
- Fixtures isolate title-only, keyword-only, heading-only, and content-only
  matches and prove each local vector contributes through the joined result;
  a chunk matching both branches is deduplicated deterministically.
- Instrument DB access: nonempty request is exactly 1 statement; candidate rows
  are `<= 200`; default is 100; final top-K is `<= 10`; empty query is 0 SQL.
- Large corpus test asserts indexed plan/no growing-table seq scan, p95 budget,
  bounded transferred bytes, and stable quality fixtures.
- Unknown options, query >200 chars, candidate limit >200, malformed tokens,
  and DB errors fail closed and never expose chunk content in logs/errors.

## Security Contract

- Internal assistant service only; existing assistant route session auth, RBAC,
  CSRF for assistant actions, assistant rate-limit/quota buckets, and provider
  redaction remain unchanged.
- This leaf adds no route or public write; nonce/HMAC/CAPTCHA is not applicable.
- Only the existing documentation corpus is searched. Strict input schema,
  parameterized SQL, bounded candidate bytes, and redacted telemetry prohibit
  prompt/provider secrets, private user data, raw binds, or full chunks in logs.

## Validation Commands

- `bunx vitest run tests/vitest/assistant/docsDbRetriever.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/database/assistantDocsCandidateQuery.test.ts tests/perf/database-assistant-docs-search.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs. Hand candidate/final limits, quality evidence, and failure policy
to TASK-551-10-L02 for assistant/ORM documentation.

## Quantified Acceptance

- One nonempty retrieval executes exactly 1 SQL statement, reads at most 200
  candidates, returns at most 10 hits, and transfers at most the L01 byte budget.
- Golden corpus top-K identity has 100% parity for mandatory fixtures and no
  documented relevance regression for secondary fixtures.
- At 100k chunks, p95 meets the parent budget and the plan uses the canonical
  assistant-doc and assistant-chunk vector indexes without an unbounded
  Bun-side candidate set or a cross-table generated expression.
