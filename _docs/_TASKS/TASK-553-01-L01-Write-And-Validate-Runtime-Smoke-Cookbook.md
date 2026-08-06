# TASK-553-01-L01: Write and Validate Runtime Smoke Cookbook
# FileName: TASK-553-01-L01-Write-And-Validate-Runtime-Smoke-Cookbook.md

**Parent Subtask:** TASK-553-01
**Priority:** High
**Category:** Testing / Developer Experience / Documentation
**Estimated Effort:** Small
**Dependencies:** TASK-553-01 contract
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1265 (family closure)

---

## Overview

Write the canonical contributor cookbook from verified TASK-552 source APIs,
link it from all runtime-smoke documentation entry points, and close the small
TASK-553 documentation family with targeted evidence.

## Sub-Tasks

None. This file is the executable leaf.

## Owned Files

- `docs/develop/runtime-smoke-cookbook.md`
- `docs/develop/README.md`
- `docs/develop/testing.md`
- `tests/README.md`
- `_docs/TESTING_STRATEGY.md`
- `AGENTS.md`
- `_docs/_TASKS/TASK-553*.md`
- TASK-553 row/statistics in `_docs/_TASKS/README.md`
- changelog 1265 and its `_docs/_CHANGELOG/README.md` row

## Implementation Pseudocode

```text
readAdapterContracts():
  verify suite IDs, CLI profiles, registry paths/descriptors, adapter result,
  lifecycle, process supervisor, timing, repository guard, and report APIs

readWorkerAndDatabaseContracts():
  verify operation identity/validators, worker entry/pool/retry semantics,
  profile isolation, fixture ledger waves, batch limits, transaction cleanup,
  uncertain-result reconciliation, counters, and stable result projection

readBrowserAndCheckpointContracts():
  verify logical barriers, post-materialization source splitting, frame and
  first-failure contracts, named session cleanup, evidence validation, seal
  prerequisites, storage behavior, and actual adapter consumption status

authorCookbook():
  publish one canonical step-by-step recipe with small copyable skeletons
  clearly separate shared-platform responsibilities from suite responsibilities
  state fail-closed behavior and current limitations without benchmark claims

linkCookbook():
  update handbook, testing overview, test README, internal strategy, and AGENTS

validateDocs():
  resolve local Markdown links
  validate task H1/FileName/parent/status/changelog graph
  validate board/changelog statistics and index rows
  run git diff --check
  fail any added file or touched production/test module over 1000 lines
```

If a reference conflicts with source, the source contract wins and the cookbook
must be corrected. A broken link, stale checkpoint/resume claim, unsafe example,
or inconsistent task/changelog state blocks closure.

## Regression-Test Shape

This leaf changes documentation only. Validation therefore checks link targets,
task graph metadata, changelog coverage, whitespace, and line limits. It does
not run or re-baseline product, worker, DB, Playwright, or release-gate tests.

## Security Contract

- **Visibility:** no endpoint or executable behavior.
- **Auth/RBAC/CSRF/rate limits:** unchanged.
- **Validation:** documentation examples retain exact allowlists, strict
  schemas, bounded frames, ownership checks, and absence proofs.
- **Anti-abuse/secrets:** examples must not pass arbitrary commands/paths or
  include secrets, customer data, raw SQL/binds, cookies, headers, DOM, or logs
  in worker/browser/checkpoint/report payloads.

## Testing Requirements

```bash
bun <task-scoped Markdown link checker>
bun <task-scoped TASK-553 graph/changelog checker>
git diff --check
wc -l <all added or modified human-authored files>
```

## Documentation Updates Required

All implementation output is documentation and is listed under Owned Files.

## Completion Evidence

- Source-grounded cookbook authored and linked.
- All local links and TASK-553 family/changelog relationships validated.
- Whitespace, added-file line counts, and the empty production/test touched-file
  gate passed.
- No executable file changed, so no runtime smoke or product gate was replayed.
