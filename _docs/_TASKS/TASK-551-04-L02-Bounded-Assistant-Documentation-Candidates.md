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

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Allowlist:** `core/services/assistant/assistantDocsCandidateQuery.ts`,
`core/services/assistant/docsDbRetriever.ts`,
`tests/vitest/assistant/docsDbRetriever.test.ts`,
`tests/integration/server/task551AssistantDocsCandidateQuery.test.ts`, and
`tests/perf/database-assistant-docs-search.test.ts` only.

**Forbidden:** `docsIngestService.ts`, `docsIndexService.ts`, all search/vector
and migration files from L01/TASK-551-05, DB schema, assistant action/execution paths,
TASK-493/TASK-511/TASK-517/TASK-518 paths, cache, task/changelog/workflow files.

After terminal TASK-551, TASK-548-01-L03 is the one serialized successor writer
of `docsDbRetriever.ts` and `assistantDocsCandidateQuery.ts`. It preserves this
leaf's exact one-CTE tsquery contract, candidate
limits, reranker fields, ordering, quality fixtures and query-plan budgets while
adding V2 snapshot/SQL authorization predicates plus exactly ONE combined
evidence-bearing V2 chunk generated vector/index: the SQL is exactly the
imported TASK-551 legacy `assistantDocChunks` heading/content EXPRESSION plus
the single additive evidence weight term, and the unused separate legacy-chunk
V2 column/index is removed from this handoff. V2 retrieval runs only
against the separate cohesive V2 table set that imports the exact
document vector EXPRESSION and that single combined chunk vector; no V2 column
or vector is ever added
to the V1 tables. Its era-aware facade
(`searchAssistantDocsAuthoritativeV2`) must also preserve the
same one-input CTE, indexed candidate bound and Bun reranker contract in its
pre-activation V1 branch (one bounded ACL-joined statement, authorization
before projection/LIMIT) and its V2 branch — exactly one backend per question,
never both; it cannot
replace or silently respell TASK-551's expressions. TASK-551 does not reopen
after that handoff and the two leaves cannot run concurrently.

## Implementation Pseudocode

```ts
type CandidateQuery = StrictReadonly<{
  normalizedQuery: string;
  candidateLimit: number; // default 100, max 200
}>;

async function listAssistantDocCandidates(input: CandidateQuery, db: Db): Promise<CandidateRow[]> {
  // Import buildTask551PrefixTsquery, TASK551_SEARCH_CONFIG,
  // TASK551_PREFIX_TOKEN_MAX, and TASK551_PREFIX_TOKEN_CODE_POINT_MAX from
  // L01-owned searchContract.ts. Do not copy or wrap its parser.
  const prefixQuery = buildTask551PrefixTsquery(input.normalizedQuery);
  // One SQL statement and one prefixQuery bind:
  // 1. input = SELECT to_tsquery('simple',$1) AS prefix_query.
  // 2. chunk_hits searches assistant_doc_chunks.search_vector, ordered by
  //    chunk rank/doc_id/chunk_index/id, capped at candidateLimit.
  // 3. doc_hits searches assistant_docs.search_vector, ordered by doc rank/
  //    source_path/id, capped at min(candidateLimit, 50).
  // 4. For each doc hit, one LATERAL indexed lookup selects at most two chunks
  //    by chunk_index/id. UNION ALL these ids with chunk_hits.
  // 5. Both predicates and both ts_rank_cd(...,32) calls CROSS JOIN input and
  //    reuse input.prefix_query; no constructor or second tsquery bind exists.
  // 6. GROUP BY chunk id, combine max chunk rank + max doc rank, order combined
  //    rank DESC, source_path ASC, chunk_index ASC, chunk id ASC, LIMIT once.
  // 7. Only then join assistant_docs + assistant_doc_chunks and project the
  //    exact reranker/citation fields. No cross-table generated expression.
}

async function retrieveDocs(query: string, options: Options, deps: Deps): Promise<DocsSearchHit[]> {
  const candidates = await deps.listCandidates(buildCandidateQuery(query, options));
  return rerankCandidates(candidates, inferIntent(query)).slice(0, resolveTopK(options.topK));
}
```

`expandedTerms` is deliberately absent from `CandidateQuery` and from SQL.
Existing synonym expansion remains an in-memory BM25/reranker signal only after
the bounded candidate rows arrive; it cannot widen, narrow, or independently
parse the database candidate query. L02 imports L01's exported helper and
constants read-only. If that export is absent when L02 starts, implementation
returns to L01 contract correction rather than adding an assistant-local parser.

Candidate limits and query lengths are clamped/rejected before DB work. Empty
or tokenless queries return without a query. Preserve matched-term, score, path,
heading, line, and citation fields. Errors are stable `docs_query_invalid` and
`docs_retrieval_unavailable` without falling back to an unbounded full-table read.
Both FTS predicates reference the landed local generated columns directly; doc
title/keywords relevance enters chunk candidates through the bounded join/UNION,
never through an impossible cross-table chunk generated column.

## Testing Requirements

- Golden corpus compares current expected top-K identities, order, scores within
  declared tolerance, location/how/capability modes, Polish/English tokens, and
  deterministic tie breaks.
- Fixtures isolate title-only, keyword-only, heading-only, and content-only
  matches and prove each local vector contributes through the joined result;
  a chunk matching both branches is deduplicated deterministically.
- Instrument DB access: nonempty request is exactly 1 statement; candidate rows
  are `<= 200`; default is 100; final top-K is `<= 10`; empty query is 0 SQL.
- Inspect the rendered SQL: one input CTE contains literal
  `to_tsquery('simple',$1)`, the doc/chunk predicates and ranks reuse that one
  alias/bind, and `websearch_to_tsquery`, `plainto_tsquery`, a local token parser,
  raw query interpolation, or a second tsquery constructor/bind fails the test.
- Import L01's helper/constants and table-drive the shared NFKC, Unicode
  `L/M/N/_`, punctuation/metacharacter separation, 2/200-code-point, 800-byte,
  16-token, and 64-code-point-per-token boundaries. Pin byte-exact
  `token:* & token:*`; tokenless/overflow input performs zero SQL.
- Large corpus test asserts indexed plan/no growing-table seq scan, p95 budget,
  bounded transferred bytes, and stable quality fixtures.
- Unknown options, query outside 2..200 code points or above 800 UTF-8 bytes,
  candidate limit >200, malformed tokens, and DB errors fail closed and never
  expose chunk content in logs/errors.

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
- `set -a && source .env && set +a && bun test tests/integration/server/task551AssistantDocsCandidateQuery.test.ts tests/perf/database-assistant-docs-search.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`
- `git diff --check`
- canonical baseline+untracked NUL-safe line-count gate over the leaf write
  set (a file above 1,000 makes the gate fail with `exit 1`, including a
  non-newline final line):

  ```bash
  # The pinned pre-family baseline spans intermediate commits and staging;
  # neither can narrow this production/test/workflow inventory.
  TASK_FAMILY_BASELINE_SHA="963733cae23456622bea1eef1b734723aaab2350"
  git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}" || { echo "invalid/missing baseline commit ${TASK_FAMILY_BASELINE_SHA}" >&2; exit 1; }
  failed=0
  while IFS= read -r -d '' f; do
    lines=$(awk 'END { print NR }' "$f")
    if [ "$lines" -gt 1000 ]; then
      printf 'OVER-LIMIT %s %s\n' "$lines" "$f"
      failed=1
    fi
  done < <({ git diff --name-only -z --diff-filter=ACMRT "$TASK_FAMILY_BASELINE_SHA" -- core packages scripts tests _docs/_workflows; git ls-files --others --exclude-standard -z -- core packages scripts tests _docs/_workflows; } | grep -zE '\.(ts|tsx|mjs|cjs|js|jsx|mts|cts)$' | grep -zvE '\.generated\.(ts|js|mjs|mts|cts)$' | sort -zu)
  exit "$failed"
  ```

  Every touched human-authored production/test module is at most 1,000
  physical lines; the baseline is the verified pre-task tree and intermediate
  commits never narrow it.

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
