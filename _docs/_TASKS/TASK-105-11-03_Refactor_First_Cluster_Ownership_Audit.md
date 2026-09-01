# TASK-105-11-03: Refactor-First Cluster Ownership Audit
# FileName: TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md

**Parent Task:** TASK-105-11
**Priority:** High
**Category:** QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-105-11-01, TASK-105-11-02
**Status:** 🚧 In Progress
**Reopened:** 2026-08-25

---

## Overview

Reopen and maintain the refactor-first audit for the remaining `tests/unit/*` clusters. The audit must distinguish Bun runtime/DB/security contracts from Bun-free Vitest contracts and must use physical child tasks for every newly identified migration slice. Child 08 is the newly audited schema-validator slice. It moves eight Bun-free behavior cases into existing or new validation-focused Vitest suites without production changes.

The parent is reopened because child 05 remains an open documentation handoff and child 08 is newly authored. An open physical child cannot remain beneath a terminal parent. Existing child order 01 through 07 is preserved exactly; child 08 is appended.

## Scope

1. `tests/unit/posts/*`
2. `tests/unit/forms/*`
3. `tests/unit/search/*`
4. `tests/unit/server/*`
5. `tests/unit/assistant/*`
6. `tests/unit/validation/*`

The scope is an ownership audit and task-contract coordination surface. It does not authorize product changes, test implementation, runner-document edits, manifest edits, or changelog edits by this parent contract.

## Audit Snapshot

The completed Sol audit and the current source shape establish the following disposition:

- `validation` is Bun-free. `tests/unit/server/schemaValidator.test.ts` is a pure validation consumer and is assigned to child 08 rather than retained in Bun.
- Child 08 migrates the source suite's eight behavior cases into `tests/vitest/validation/postSchemas.test.ts`, `contentSchemas.test.ts`, and `assistantActionSchemas.test.ts`. The generic `tests/vitest/validation/schemaValidator.test.ts` remains unchanged and read-only.
- `search` splits into Bun-free pure logic (`filterEngine`, `listingRuntimeService`, `searchIndexService`, and `searchService`) and Bun-owned `searchHistoryService` because the latter is DB-backed.
- `assistant` pure helpers are in `tests/vitest/assistant/*`; higher-level docs, indexing, provider, and orchestration cases remain refactor-first where their runtime seams require it.
- `posts` pure editor/domain leaves are Vitest-owned; DB/schema/runtime renderer cases remain Bun or require a separate audited refactor.
- `forms` pure contracts/settings/helpers are Vitest-owned; DB-coupled service and submission persistence flows remain Bun.
- `server` pure helpers and settings-bound helpers are Vitest-owned. The remaining true Bun server suites are exactly `adminAssetsRouting.test.ts` (runtime boundary), `publicBookingApi.test.ts` (DB/security), `publicFormsApi.test.ts` (mixed injected+DB/public-internal writes), and `publicFormsUploadApi.test.ts` (DB/media/public-internal writes). Child 05 owns only the documentation handoff for that classification.

## Exact Writer and Reader Scope

### Parent coordination writers

This parent task writes only its own contract and the ordered child-task map. The `TASK-105` parent author owns the parent-board row and Statistics synchronization. No product or test source is assigned to this parent. Existing child contracts retain their exact owners and order.

### Child 08 exact writers

The schema-validator migration has exactly these four test writers and no others:

- delete `tests/unit/server/schemaValidator.test.ts`;
- extend `tests/vitest/validation/postSchemas.test.ts`;
- create `tests/vitest/validation/contentSchemas.test.ts`;
- create `tests/vitest/validation/assistantActionSchemas.test.ts`.

Production validation modules, the generic `tests/vitest/validation/schemaValidator.test.ts`, runner documentation, and the manifest are read-only for child 08.

### Child 05 and downstream handoff owners

`TASK-105-11-03-05` is a documentation/ownership handoff only. It does not claim `tests/RUNNER_OWNERSHIP.md`, `tests/README.md`, the manifest, product/test source, board, or changelog. `TASK-105-08-11` owns the runner-ownership document and its permitted manifest follow-through. `TASK-105-11-04` owns the test README and family closure/changelog follow-through.

## Implementation Pseudocode

1. Read the current child contracts, source/test anchors, and the completed Sol audit. Treat every seed path as a hint to verify, not as an authority.
2. Preserve the existing physical child order exactly: children 01, 02, 03, 04, 05, 06, and 07 remain in place. Append child 08 at the end of the server cluster list.
3. Keep the four server Bun boundary reasons and the schema-validator transfer synchronized across this parent, child 05, child 08, and the parent board. If any file names, reasons, or writer sets diverge, block closure and repair the contract before implementation.
4. Require child 08's migration receipt to name all eight source behavior cases, the four exact writers, the retained generic suite, and no production changes.
5. Require child 05's classification receipt before downstream runner-document work. Route that receipt to `TASK-105-08-11` and `TASK-105-11-04`; neither handoff is a claim by this parent.
6. Close this parent only after every physical descendant is terminal and all board/statistics/documentation evidence is synchronized. Do not use a generated workflow receipt as a substitute for repository evidence.

## Security Contract

This is not an API, route, authentication, authorization, CSRF, rate-limit, persistence, or public-write implementation. No security behavior changes. The audit must fail closed when a runtime, database, media, or public-write boundary is misclassified. Receipts must be bounded and secret-safe, with no credentials, nonce values, raw user data, or provider keys.

## Testing Requirements

This contract-authoring pass runs no product or test suites. Future validation must include:

- Markdown fence parity and canonical H1/FileName/parent metadata for every touched task file;
- physical ancestry and child-order checks, including appended child 08;
- board bucket and Statistics checks after the parent-author board update;
- exact writer-set checks for child 08 and the four retained Bun suite reasons;
- line counts at or below 1,000 for every authored task contract;
- `git diff --check` for the documentation scope.

Implementation of child 08 owns its exact Vitest validation. Child 05's retained Bun suites remain in the Bun lane and are not moved by this audit contract.

## Documentation Updates Required

1. Keep this parent and its child hierarchy synchronized with the board, using canonical status values.
2. `TASK-105-11-03-05` supplies a classification/handoff receipt but does not edit `tests/RUNNER_OWNERSHIP.md` or `tests/README.md`.
3. `TASK-105-08-11` consumes the runner ownership handoff and owns its runner document and any contract-authorized manifest action.
4. `TASK-105-11-04` consumes the final migration/classification receipts and owns `tests/README.md`, closure, and changelog work.
5. Preserve the dirty `tests/bun-lane-manifest.json` as a read-only input in this contract repair.

## Receipt, Ordering, and Line-Cap Rules

- The ordered child list is a contract. No child may be silently renamed, reordered, or reassigned.
- Child 08's receipt precedes final runner-lane reconciliation. Child 05's four-suite receipt precedes downstream runner-document updates. The downstream owners retain sole write authority for their files.
- Every touched task/contract file must remain at or below 1,000 physical lines. Legacy product/test files are read-only inputs; no line-cap waiver is granted by this audit.
- Receipts must include exact paths, lane reasons, writer sets, dependency owners, and validation results without generated hashes, retry counts, or terminal envelopes.

## Sub-Tasks

1. `TASK-105-11-03-01_Validation_and_Search_Pure_Suites_Move_to_Vitest.md`
2. `TASK-105-11-03-02_Assistant_Pure_Service_Suites_Move_to_Vitest.md`
3. `TASK-105-11-03-03_Posts_Pure_Editor_Model_Suites_Move_to_Vitest.md`
4. `TASK-105-11-03-04_Forms_Pure_Contracts_and_Helper_Suites_Move_to_Vitest.md`
5. `TASK-105-11-03-05_Server_Cluster_Bun_Ownership_Freeze.md`
6. `TASK-105-11-03-06_Server_Pure_Helper_Suites_Move_to_Vitest.md`
7. `TASK-105-11-03-07_Server_Settings_Bound_Helper_Suites_Move_to_Vitest.md`
8. `TASK-105-11-03-08-Server-Schema-Validator-Vitest-Migration.md`

Child 08 is `⏳ To Do`. Child 05 remains `⏳ To Do` as a documentation handoff. The other historical child states are preserved in their own files; this repair does not rewrite them.

## Acceptance Criteria

1. The parent is `🚧 In Progress` with a canonical status and an explicit reopen date.
2. Children 01 through 07 remain in their recorded order and child 08 is appended with a parent-subtask relationship.
3. The exact four remaining Bun server suites and their boundary reasons are consistent with child 05 and the board.
4. The schema-validator migration has exactly four test writers, retains the generic Vitest suite, and makes no production change.
5. Downstream ownership for runner docs, README/closure, and manifest follow-through is explicit and not claimed by this parent or child 05.
6. All ancestry, status/count, fence, diff, and line-cap checks pass before implementation begins.
