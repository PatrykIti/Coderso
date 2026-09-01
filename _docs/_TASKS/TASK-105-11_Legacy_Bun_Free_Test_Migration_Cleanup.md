# TASK-105-11: Legacy Bun-Free Test Migration Cleanup
# FileName: TASK-105-11_Legacy_Bun_Free_Test_Migration_Cleanup.md

**Priority:** High
**Category:** QA + Platform
**Estimated Effort:** Large
**Dependencies:** TASK-102, TASK-104, TASK-105
**Status:** 🚧 In Progress
**Reopened:** 2026-08-25

---

## Overview

Reopen the legacy Bun-free migration cleanup to reconcile the final schema-validator lane and the remaining server ownership handoffs after the hybrid Bun/Vitest model shipped.

This is not a "move everything to Vitest" task. The intended architecture remains:

- Bun owns the runtime kernel and runtime, plugin, performance, security, and DB-coupled suites.
- Vitest owns Bun-free admin/UI, SDK, schema-validation, and pure domain suites.
- Refactor-first clusters remain explicitly documented instead of being moved by directory convention.

The prior closure correctly covered the broad migration waves but left one Bun-free server schema-validator suite and a downstream runner-document ownership ambiguity. The parent is therefore open while child `TASK-105-11-03-08` delivers the exact schema split and child 05 hands the four true Bun server suites to their document owners.

## Scope

1. Remove or replace legacy `bun:test` suites that already have stronger Vitest-owned equivalents.
2. Migrate the remaining Bun-free schema-validator suite through the audited child-08 contract, without production changes.
3. Reconfirm and document which server suites still stay in Bun.
4. Re-audit refactor-first clusters before future migration waves touch them.
5. Preserve exact child ownership and send runner-document work to its declared downstream owners.

## Candidate Areas

- `tests/unit/ui/*`
- `tests/unit/admin/*`
- `tests/unit/sdk/*`
- `tests/unit/customScreens/*`
- follow-up audit for `tests/unit/posts/*`, `tests/unit/forms/*`, `tests/unit/search/*`, `tests/unit/server/*`, `tests/unit/assistant/*`, `tests/unit/validation/*`

## Current Disposition

The completed migration waves remain valid. The reopened work is bounded to the following additions and reconciliations:

- `tests/unit/server/schemaValidator.test.ts` is Bun-free and is owned by child 08.
- Child 08 has exactly four test writers: delete the legacy Bun suite, extend the post schema suite, and create the content and assistant action schema suites.
- The generic `tests/vitest/validation/schemaValidator.test.ts` remains an existing read-only Vitest consumer.
- The four remaining true Bun server suites are `adminAssetsRouting.test.ts` (runtime boundary), `publicBookingApi.test.ts` (DB/security), `publicFormsApi.test.ts` (mixed injected+DB/public-internal writes), and `publicFormsUploadApi.test.ts` (DB/media/public-internal writes).
- Child 05 is only the classification and ownership handoff. `TASK-105-08-11` owns `tests/RUNNER_OWNERSHIP.md` and its permitted manifest follow-through; `TASK-105-11-04` owns `tests/README.md`, closure, and changelog follow-through.

## Progress Notes

Historical completed slices remain recorded:

- removed duplicated Bun-free legacy suites in `tests/unit/ui/*`;
- removed duplicated Bun-free suites in the Bun-free part of `tests/unit/admin/*`;
- removed duplicated helper suites in `tests/unit/sdk/*`;
- moved `bindingResolver` into `tests/vitest/customScreens/*` and removed legacy Bun custom-screen duplicates;
- moved the previously eligible validation suites into `tests/vitest/validation/*`;
- moved Bun-free assistant helper/provider/planner suites into `tests/vitest/assistant/*`;
- moved Bun-free posts editor/model suites into `tests/vitest/posts/*`;
- moved Bun-free forms contract/helper suites into `tests/vitest/forms/*`;
- moved Bun-free server helper suites into `tests/vitest/server/*`;
- moved Bun-free search pure-logic suites into `tests/vitest/search/*`;
- moved Bun-free server settings-bound helper suites into `tests/vitest/server/*`.

Current remaining slices are the child-08 schema-validator migration, the child-05 four-suite server ownership receipt, and the downstream runner-document handoffs. No other broad legacy migration is authorized by this repair.

## Exact Writer and Reader Scope

### Parent writers

This parent owns its task contract, direct child hierarchy, and family-level coordination. The `TASK-105` parent author owns the task-board rows and Statistics. No product or test source is a writer for this parent contract.

Direct child order is unchanged:

1. `TASK-105-11-01_UI_Admin_and_SDK_Duplicate_Legacy_Suites_Move_to_Vitest.md`
2. `TASK-105-11-02_Custom_Screens_and_Pure_Domain_Legacy_Suites_Move_to_Vitest.md`
3. `TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md`
4. `TASK-105-11-04_QA_Docs_Changelog_and_Closure.md`

`TASK-105-11-03` owns nested children 01 through 08 in that order, with child 08 appended after child 07. Existing child contracts retain their own exact writers.

### Child-08 writers

The schema-validator leaf has exactly these four test writers and no production writer:

- delete `tests/unit/server/schemaValidator.test.ts`;
- extend `tests/vitest/validation/postSchemas.test.ts`;
- create `tests/vitest/validation/contentSchemas.test.ts`;
- create `tests/vitest/validation/assistantActionSchemas.test.ts`.

The generic `tests/vitest/validation/schemaValidator.test.ts`, validation production modules, `tests/RUNNER_OWNERSHIP.md`, `tests/README.md`, `tests/bun-lane-manifest.json`, and changelog files are read-only for child 08.

### Handoff readers and owners

- `TASK-105-11-03-05` reads the four remaining server suites and emits their classification receipt; it does not claim runner docs or the manifest.
- `TASK-105-08-11` consumes the receipt and owns `tests/RUNNER_OWNERSHIP.md` plus any contract-authorized manifest follow-through.
- `TASK-105-11-04` consumes migration/classification receipts and owns `tests/README.md`, closure, and changelog work.

## Implementation Pseudocode

1. Read the current task hierarchy, the completed Sol audit, and the source/test anchors. Verify every path against the current worktree before relying on it.
2. Keep direct children 01 through 04 unchanged and keep nested server-audit children 01 through 07 unchanged. Append child 08 under `TASK-105-11-03`.
3. Pass the schema-validator behavior map to child 08: preserve all eight behavior cases, route post/content/assistant cases to their owning Vitest suites, retain the generic schema-validator suite, and make no production change.
4. Pass the four-suite server classification to child 05. Require explicit runtime, DB, media, or public-write reasons and reject broad "server directory" claims.
5. Send the resulting receipts to `TASK-105-08-11` and `TASK-105-11-04` in order. Do not edit their files from this parent or claim their manifest/changelog authority.
6. Close the family only when all physical descendants are terminal, the board and Statistics match the physical tree, and downstream documentation owners have accepted the bounded receipts.

## Security Contract

This is not an API, route, authentication, authorization, CSRF, rate-limit, persistence, or public-write implementation. No runtime security behavior changes. The retained Bun classifications protect existing DB, media, runtime, and public-write security boundaries, while the schema-validator migration must preserve strict validation and exact rejection behavior. Receipts must be secret-safe and must not contain credentials, nonce values, raw user data, or provider keys.

## Testing Requirements

This contract-authoring pass runs no product or test suites. Future family validation must include:

- exact child ancestry/order, canonical statuses, Markdown fence parity, and board/statistics synchronization;
- line counts at or below 1,000 for authored task contracts;
- child-08 targeted Vitest receipts for its four exact writer paths plus the retained generic suite;
- child-05 classification and downstream handoff receipts;
- `git diff --check` over the documentation scope.

The four retained server suites remain Bun-owned and are validated by their runtime/DB/security owners. No runner-document or manifest edit is authorized in this contract-only repair.

## Documentation Updates Required

1. Keep this parent and all physical descendants synchronized with the board using canonical status values.
2. Child 08 supplies the schema-validator migration receipt but does not edit runner docs, the manifest, the board, or changelog.
3. Child 05 supplies the four-suite classification and does not edit `tests/RUNNER_OWNERSHIP.md` or `tests/README.md`.
4. `TASK-105-08-11` owns `tests/RUNNER_OWNERSHIP.md` and its permitted manifest follow-through.
5. `TASK-105-11-04` owns `tests/README.md`, closure, and changelog follow-through.
6. Preserve historical changelog files and the currently dirty `tests/bun-lane-manifest.json` as read-only inputs.

## Receipt, Ordering, and Line-Cap Rules

- Direct child order and nested child order are immutable contract data. No child is silently renamed, reordered, or reassigned.
- The schema-validator receipt and four-suite server receipt precede downstream runner-document updates. Downstream owners retain sole write authority for their paths.
- Every touched task/contract file must remain at or below 1,000 physical lines. Product/test files are read-only inputs, and this repair creates no line-cap waiver.
- Receipts must be deterministic, bounded, exact-path, and secret-safe. Generated hashes, retry counts, and terminal envelopes are not independent product gates.

## Sub-Tasks

1. `TASK-105-11-01_UI_Admin_and_SDK_Duplicate_Legacy_Suites_Move_to_Vitest.md`
2. `TASK-105-11-02_Custom_Screens_and_Pure_Domain_Legacy_Suites_Move_to_Vitest.md`
3. `TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md`
4. `TASK-105-11-04_QA_Docs_Changelog_and_Closure.md`

The third direct child contains the physical nested sequence 01 through 08. The family remains open while child 03 and its open leaves are active; child 04's historical closure contract is consumed later for final closure.

## Acceptance Criteria

1. The parent is `🚧 In Progress` with a canonical status and explicit reopen date.
2. Direct child order 01 through 04 is unchanged, and child 08 is represented only under `TASK-105-11-03` after child 07.
3. The eight schema-validator behavior cases, exact four test writers, retained generic suite, and no-production-change rule are explicit.
4. Exactly four true Bun server suites remain documented with their boundary reasons.
5. Downstream ownership for runner docs, manifest follow-through, README/closure, and changelog is explicit and not claimed by this repair.
6. Ancestry, status/count, fence, line-cap, and diff checks pass before implementation proceeds.
