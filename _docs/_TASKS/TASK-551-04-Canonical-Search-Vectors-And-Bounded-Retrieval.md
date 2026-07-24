# TASK-551-04: Canonical Search Vectors and Bounded Retrieval
# FileName: TASK-551-04-Canonical-Search-Vectors-And-Bounded-Retrieval.md

**Parent Task:** TASK-551
**Priority:** Critical
**Category:** Database / Search / Performance
**Estimated Effort:** Large
**Dependencies:** TASK-551-03
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Replace expression-drifted, sequential, and unbounded search with one canonical
stored/generated-vector contract already landed by TASK-551-05, deterministic
database rank/order/limits that consume its matching GIN/trigram indexes, and a
bounded assistant candidate stage. Preserve search visibility, PII, and
public-route policy without reopening schema or migration ownership.

## Sub-Tasks

1. `TASK-551-04-L01` consumes TASK-551-05's canonical CMS generated columns and
   indexes, then owns current search services/routes and ranked query semantics.
2. `TASK-551-04-L02` consumes TASK-551-05's two local assistant vectors and
   bounds a joined/union candidate set before Bun-side intent reranking.

Neither leaf may edit schema or migrations. TASK-551-05-L01 is the sole
TASK-551 owner of generated-vector expressions, columns, GIN/trigram indexes,
Drizzle schema exports, and the migration triple; both leaves import and query
that landed contract read-only.

## Schema and Collision Guard

- Confirm TASK-551-05-L02 is terminal and its vector/index migration evidence is
  green before dispatch. If the landed schema exports, generated expressions,
  or indexes cannot support the query contract, pause for a TASK-551-05 contract
  correction; do not patch schema or emit a second migration from this family.
- The parent external dispatch gate is mandatory. TASK-493 and the other three
  active collision families are terminal by default; only its exact fresh
  all-path serialized handoff may substitute. These leaves then optimize only
  existing search and assistant docs retrieval and never write SEO/GSC files.
- TASK-511 backup, TASK-517 entry/public runtime, TASK-518 migration, cache,
  unrelated schema/service, task/changelog/workflow paths are forbidden.

## Shared Acceptance

- Every query references the generated columns exported by TASK-551-05; no
  service reconstructs a `to_tsvector` expression at query time.
- Search has deterministic `rank DESC, updated_at DESC, id DESC` (or documented
  equivalent), database-side limits, and at most 4 statements for global/public
  CMS search and 1 statement for assistant candidates.
- Large-fixture plans use the intended GIN/trigram indexes, do not sequentially
  scan growing source tables, and meet TASK-551-01 budgets.
- Search results do not expose unpublished/unauthorized records, encrypted
  fields, hashes, or raw email except under the existing authorized admin rule.

## Security Contract

- `/admin/api/search` remains internal with session auth, current search RBAC,
  the admin read rate-limit bucket, and strict reject-unknown validation. The
  existing public search route remains read-only with its publication/
  visibility filters and public-read limit; neither route adds a write or CSRF,
  nonce/HMAC, or CAPTCHA requirement.
- Query text is length-bounded and parameterized. Per-source authorization is
  applied before candidate limits and ranking. Trigram fallback is enabled only
  for a source whose TASK-551-05 evidence receipt proves its exact matching
  index; there is no unindexed growing-table fallback.
- Email remains hash-exact under existing authorized admin scope and is excluded
  from vectors/trigram text. Logs/plans/errors omit query binds, private content,
  emails/hashes, credentials, tokens, and customer payloads.

## Testing Requirements

Run both leaves' targeted Vitest, DB integration, and performance suites plus
TASK-551-05's vector drift test read-only, then `bun run gates:coderso:perf`,
`bun --cwd core lint:types`, and
`bun --cwd core lint`. The search-history write-path test must prove zero inline
retention SQL after L01; L06-L01 separately owns the new bounded retention
service.

## Documentation Updates Required

No shared docs are edited here. L01/L02 hand exact vector/trigram columns,
conditional-fallback evidence, limits, visibility, and plan results to
TASK-551-10-L02; shared docs and changelog 1263 remain its sole ownership.
