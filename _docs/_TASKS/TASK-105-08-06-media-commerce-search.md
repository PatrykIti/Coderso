# TASK-105-08-06: Media, Commerce, and Search UI
# FileName: TASK-105-08-06-media-commerce-search.md

**Priority:** High
**Category:** QA + Coverage + Test Integrity
**Estimated Effort:** Reconciliation plus two test-only type-repair leaves
**Dependencies:** TASK-105-08; fresh L12 artifact reconciliation; current root TypeScript diagnostic map
**Parent Task:** TASK-105-08
**Status:** ⏳ To Do

---

## Overview

The former 27-file / 469-line scope is a historical planning snapshot. The current L12
extraction has five residual records in this cluster. Fresh source review proves all five
are unreachable; therefore no executable coverage child is authorized for those source
rows. This task remains open until L12 records that disposition against a fresh canonical
artifact. Its two direct children are a separate, test-integrity-only repair of the named
root TypeScript diagnostics; they neither reopen the five-row coverage disposition nor
claim coverage for a source line.

## Current Reconciliation Scope

| Source line | Disposition | Source evidence |
|---|---|---|
| core/admin/ui/media/MediaLibraryPage.tsx:485 | UNREACHABLE | A deferred failure is recorded only at 442-447. Every successful folder mutation broadcasts mediaFolders before its promise returns (core/admin/services/mediaFoldersClient.ts:225-282); local cache handlers run synchronously (core/admin/utils/cacheBus.ts:151-153), and the page listener starts a new load generation (MediaLibraryPage.tsx:528-540, 421) before the mutation calls the flush at 875-877. The deferred generation consequently fails isCurrentFolderLoad at 484. The post-mutation feedback can instead use the fallback at 448-453. |
| core/admin/ui/commerce/hooks/useCommerceCatalog.ts:158,169 | UNREACHABLE | Each outer catch wraps a refresh function whose only await is already caught; its synchronous helpers and finally blocks do not throw. |
| core/admin/ui/commerce/components/AttributesEditor.tsx:131 | UNREACHABLE | The Add button is disabled until both drafts are nonblank, but controlled input changes auto-commit and clear drafts as soon as the second value becomes usable. A disabled native button cannot click. |
| core/admin/ui/media/MediaLibraryPage.tsx:754 | UNREACHABLE | Retry reads and validates the current feedback/token synchronously immediately before runFolderOperation rereads it; no intervening await can make the exact retry stale. |

The raw L12 row was 4 UNREACHABLE / 1 REACHABLE-GAP. The verified local correction for
line 485 changes this cluster to **5 UNREACHABLE / 0 REACHABLE-GAP**.

## Root TypeScript Test-Repair Scope

The following leaves own only the exact inherited Vitest files named in their own
single-writer tables. They may repair typed fixtures, mocks, DOM narrowing, and assertions
so that those existing tests compile against current public contracts. They do not own a
coverage line, production source, fixture/helper outside the exact list, coverage
configuration, L12 artifact, task board, changelog, or commit.

| Child | Status | Exact test-only scope | Purpose |
|---|---|---|---|
| TASK-105-08-06-L01 | To Do | seven commerce Vitest files; 15 root TypeScript diagnostics | Repair commerce test types without changing commerce behavior or source. |
| TASK-105-08-06-L02 | To Do | six media Vitest files; 17 root TypeScript diagnostics | Repair media test types without changing media behavior or source. |

The two leaves must re-read the current diff for every adopted draft and must not reset,
clean, stage, or commit another writer's work. If a correct repair requires a source,
shared-fixture, route, client, or coverage-config change, stop and author a new exact-owner
contract first.

## Test-Integrity Note

tests/vitest/ui/media-library-invalidation.test.tsx:84-148 is an untracked draft from
another stream. It drives a real pending-create/cache-event flow and validly proves visible
post-success load feedback, but isolated V8 evidence records hit counts 444: 1, 453: 1,
and 485: 0. It must not be claimed as coverage for line 485. Its owner may clarify its
name/comment when adopting it, but this reconciliation contract itself grants no test-file
ownership. The L01/L02 type-repair leaves also exclude this draft.

MediaLibraryPage.tsx is 1,421 physical lines. No source repair is authorized here; any
future production change must first receive a separate cohesive split contract.

## Implementation Pseudocode

~~~ts
const candidate = readL12Record("core/admin/ui/media/MediaLibraryPage.tsx", 485);
assert(candidate.classification === "UNREACHABLE");
assertNoNewTestExistsOnlyToHit(candidate);
recordArtifactReconciliationAfterFreshCoverage();
~~~

The reconciliation slice performs no code/test edit. The L01/L02 leaves have their own
test-only pseudocode and gates. A future reviewer re-runs the existing targeted suite only
as diagnostic evidence and confirms that visible feedback remains covered by its actual
fallback path, not by a mocked/private flush path.

## Testing Requirements

Diagnostic command (not a coverage receipt for line 485):

~~~bash
export TMPDIR=/tmp && set -a && . ./.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/media-library-invalidation.test.tsx
~~~

Final disposition is validated by L12 with:

~~~bash
bun scripts/run-vitest-coverage.ts
bun scripts/analyze-vitest-gaps.ts
git diff --check
~~~

The L01/L02 root-TypeScript attribution, targeted Vitest, static, and line-count commands
are specified only in their child contracts. Their results are test-integrity receipts, not
V8 evidence for the five source rows above.

## 1000-Line Rule

The reconciliation contract edits no source or test file. The 1,421-line MediaLibraryPage.tsx
cannot be touched without a split-first task; the 379-line draft suite stays outside every
L06 writer scope. Each L01/L02 test writer must run its own per-file 1,000-line gate.

## Security Contract

Non-API reconciliation only. No endpoint, authentication, RBAC, CSRF, cache policy,
validation, persistence, or anti-abuse behavior changes. Do not manufacture a client route
or alter broadcast timing merely to make a defensive branch testable.

## Sub-Tasks

- TASK-105-08-06-L01-commerce-test-type-repair.md — To Do; exact commerce test-type repair.
- TASK-105-08-06-L02-media-test-type-repair.md — To Do; exact media test-type repair.

No coverage leaf is authorized for the five source-proven unreachable L12 rows.

## Documentation Updates Required

L12 must retain the line-485 proof and the 4/1 → 5/0 cluster delta. L01/L02 return only
their own type-repair receipts. Do not update board statistics, changelog, status board, or
commits from this parent.

## Acceptance Criteria

1. No test claims to cover MediaLibraryPage.tsx:485 unless a future source change creates
   a real path.
2. L12 records the five-unreachable/zero-reachable disposition against fresh coverage evidence.
3. L01/L02 have exclusive, non-overlapping ownership of the named root-TypeScript test
   diagnostics and do not claim an L12 coverage change.
