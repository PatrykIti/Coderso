# TASK-105-11-03-05: Server Cluster Bun Ownership Freeze
# FileName: TASK-105-11-03-05_Server_Cluster_Bun_Ownership_Freeze.md

**Parent Subtask:** TASK-105-11-03
**Priority:** Medium
**Category:** QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-105-11-03; TASK-105-08-11 (tests/RUNNER_OWNERSHIP.md and authorized manifest handoff)
**Status:** ⏳ To Do
**Reopened:** 2026-08-25

---

## Overview

Freeze the audited ownership of the remaining `tests/unit/server/*` suites without widening this leaf into a product or runner-document implementation. This is an explicit documentation and ownership handoff. The server schema-validator case is not part of the remaining Bun cluster: `TASK-105-11-03-08` owns its eight Bun-free behavior cases and their exact Vitest test writers.

This leaf is intentionally reopened because its former broad completion statement did not distinguish runtime/DB-boundary suites from the Bun-free schema-validator migration, and it claimed downstream documentation that belongs to other task owners.

## Scope

1. Record the four remaining true Bun suites and the reason each stays in Bun.
2. Record that `tests/unit/server/schemaValidator.test.ts` is removed from the Bun cluster and is owned by `TASK-105-11-03-08`.
3. Produce an ownership receipt that can be consumed by the downstream runner-document owners.
4. Preserve the existing family order and exact writer boundaries. Do not classify an unlisted suite by broad directory convention; an unexpected suite is a blocking audit finding.

### Remaining Bun suites

| Suite | Required lane | Ownership reason |
|---|---|---|
| `tests/unit/server/adminAssetsRouting.test.ts` | Bun | Exercises the runtime/admin asset boundary through `core/server/httpServer`; it is not a Bun-free pure helper contract. |
| `tests/unit/server/publicBookingApi.test.ts` | Bun | Uses the database and public-write security controls, including nonce/API-key behavior, so its contract is DB/security-bound. |
| `tests/unit/server/publicFormsApi.test.ts` | Bun | Combines injected seams with database-backed public and internal write behavior, so it remains a mixed runtime/DB integration contract. |
| `tests/unit/server/publicFormsUploadApi.test.ts` | Bun | Exercises database, media, and public/internal write boundaries and therefore remains a runtime-backed contract. |

The schema-validator suite is not a fifth Bun case. Its eight behavior cases move to the post, content, and assistant Vitest suites under child 08. The existing generic `tests/vitest/validation/schemaValidator.test.ts` remains read-only and is not a replacement writer in this leaf.

## Exact Writer and Reader Scope

### Writers owned by this leaf

This leaf has no product or test implementation writer. Its claimed authored artifact is this task-contract/handoff file only. It does not claim any of the following paths:

- `tests/RUNNER_OWNERSHIP.md`
- `tests/README.md`
- `tests/bun-lane-manifest.json`
- product or test source files
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`

### Read-only inputs

The audit may read the four named Bun suites, `tests/unit/server/schemaValidator.test.ts`, the generic and destination Vitest validation suites, the validation modules they import, the current `tests/bun-lane-manifest.json`, and the task/dependency receipts. It may inspect `tests/RUNNER_OWNERSHIP.md` and `tests/README.md` for handoff context, but may not edit them.

### Downstream readers and owners

- `TASK-105-08-11` is the sole downstream owner for the `tests/RUNNER_OWNERSHIP.md` update and any manifest verification or update allowed by that task's contract.
- `TASK-105-11-04` is the sole downstream owner for the `tests/README.md` update and family closure/changelog work.
- The `TASK-105` parent author owns the task-board row and Statistics synchronization. This leaf supplies evidence but does not claim the board file.

## Implementation Pseudocode

1. Read the current four named server suites and record their imports, runtime/DB/media/security seams, and stable Bun-lane reason. Treat any additional candidate as an explicit audit error rather than silently adding it.
2. Read the child-08 contract and verify that `tests/unit/server/schemaValidator.test.ts` is represented by its exact four test writers and that no production file is assigned to that migration.
3. Emit one bounded ownership receipt containing the four retained suite paths, one reason per path, the schema-validator transfer, the two downstream owners, and the unchanged-manifest statement.
4. Send the receipt to `TASK-105-08-11` first, then to `TASK-105-11-04` as a downstream closure consumer. Neither receipt consumer is a prerequisite of this classification leaf. Do not edit either downstream document, the manifest, product/test source, the board, or a changelog from this leaf.
5. If a path, reason, owner, or receipt dependency is missing, stop with a machine-readable documentation finding. Do not close the leaf on a partial directory-level claim.

## Security Contract

This is not an API, route, authentication, authorization, CSRF, rate-limit, persistence, or public-write implementation. No endpoint visibility or security behavior changes. The four Bun reasons are recorded precisely because their existing DB, media, runtime, and public-write security boundaries must not be weakened by a runner move. Receipts must contain paths and classifications only, never credentials, nonce values, raw user data, or provider secrets.

## Testing Requirements

This contract-only authoring pass runs no product or test suites. Future completion must validate:

- read-only ownership classification for all four named Bun suites;
- presence of the child-08 transfer and both downstream handoff owners;
- Markdown fence parity, ancestry, canonical status, board synchronization, and line-cap checks;
- `git diff --check` for the authored documentation.

A Bun test run is not required to prove this documentation handoff. The four retained suites remain available to their owning runtime/DB/security tasks, while child 08 owns the exact Vitest migration receipt.

## Documentation Updates Required

This leaf records handoffs and does not directly edit downstream documentation:

1. `TASK-105-08-11` consumes the four-suite classification and owns `tests/RUNNER_OWNERSHIP.md`; it decides any corresponding manifest action under its own audited contract.
2. `TASK-105-11-04` consumes the same receipt and owns `tests/README.md`, final closure, and changelog handling.
3. The `TASK-105` parent author synchronizes the board row and Statistics for the reopened family and child 08.
4. Preserve the currently dirty `tests/bun-lane-manifest.json` as an input. This leaf must not rewrite, regenerate, or clean it.

## Receipt, Ordering, and Line-Cap Rules

- The receipt must list exactly four retained Bun suites, the schema-validator transfer, both downstream owners, and the manifest handoff.
- Classification precedes downstream runner-document updates. Child 08's migration receipt must be available before the final runner ownership table is closed; `TASK-105-08-11` and `TASK-105-11-04` remain their own writers.
- Every authored task/document file must remain at or below 1,000 physical lines. The current `tests/unit/server/publicFormsApi.test.ts` is a 2,038-line read-only legacy input; this contract grants no line-cap waiver and any split is a separate audited task.
- Receipts must be deterministic, bounded, secret-safe, and reference exact paths. Do not add generated hashes, retry ledgers, or terminal envelopes as independent gates.

## Sub-Tasks

1. Reconfirm the four retained Bun suite classifications.
2. Reconcile the schema-validator transfer with child 08.
3. Hand the bounded receipt to `TASK-105-08-11` and `TASK-105-11-04` without claiming their files.

## Acceptance Criteria

1. Exactly four remaining Bun suites are listed with concrete runtime, DB, media, or security reasons.
2. `tests/unit/server/schemaValidator.test.ts` is explicitly assigned to child 08, and the generic Vitest schema-validator suite remains read-only.
3. The contract names `TASK-105-08-11` and `TASK-105-11-04` as downstream owners and does not claim their documentation paths.
4. The manifest, product/test source, board, and changelog remain outside this leaf's writer scope.
5. The ownership receipt and all line-cap, ancestry, status, and Markdown checks are complete before closure.
