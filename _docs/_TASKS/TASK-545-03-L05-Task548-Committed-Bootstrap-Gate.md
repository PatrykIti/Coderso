# TASK-545-03-L05: TASK-548 Committed Bootstrap Gate

# FileName: TASK-545-03-L05-Task548-Committed-Bootstrap-Gate.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-03
**Priority:** High
**Category:** Workflow Evidence / Bootstrap Integrity / TASK-548
**Estimated Effort:** Medium
**Dependencies:** TASK-545-03-L03
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)
**Split From:** TASK-545-03-L01 (2026-08-13)

---

## Overview

Own the TASK-548 six-path committed-bootstrap receipt types and the two
authorization functions that gate the exact-argument phase-1 call. This leaf was
split out of TASK-545-03-L01 on 2026-08-13. The receipt is the only mechanism by
which a TASK-548 workflow may claim a current-HEAD, exact-six-path committed
bootstrap before invoking `createResumeCheckpoint`; no TASK-548 fixture may call
phase 1 without immediately preceding it with this gate.

## Sub-Tasks

None; this is an executable leaf with the exclusive file ownership below.

## Exclusive ownership

- new `_docs/_workflows/lib/smoke-evidence-task548.mjs` (all TASK-548 bootstrap
  exports: `TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1`,
  `normalizeTask548CommittedSixPathBootstrapReceiptV1`,
  `requireTask548CommittedSixPathBootstrapAuthorizationV1`, and their private
  helpers)
- new `_docs/_workflows/lib/smoke-evidence-task548.d.mts` (TASK-548 receipt type
  declarations)
- `_docs/_workflows/lib/smoke-evidence.mjs` ONLY as a thin re-export surface
  (`export { ... } from "./smoke-evidence-task548.mjs"`; a few lines, because
  the 1,000-line gate is why this family was split from L01)
- `_docs/_workflows/lib/smoke-evidence.d.mts` ONLY as a thin re-export type
  surface mirroring the `.mjs` re-export
- new `tests/unit/workflows/smokeEvidenceTask548Bootstrap.test.ts`
- test fixtures under `tests/fixtures/workflows/smoke-evidence/task548/`

## Implementation Pseudocode

The named exports below are the moved TASK-548 declarations previously in
TASK-545-03-L01; the companion `_docs/_workflows/lib/smoke-evidence.d.mts`
declares them and the runtime exports them from `smoke-evidence.mjs`.

```ts
export declare const TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1: readonly [
  "_docs/_workflows/lib/task-548-contract.mjs",
  "_docs/_workflows/task-548-author-audit.mjs",
  "_docs/_workflows/task-548-fix.mjs",
  "_docs/_workflows/task-548-implement.mjs",
  "tests/unit/workflows/task548AuthorAudit.test.ts",
  "tests/unit/workflows/task548WorkflowContracts.test.ts",
];
export type Task548CommittedBootstrapFileV1 = Readonly<{
  path: typeof TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1[number];
  sha256: string;
}>;
export type Task548CommittedBootstrapSixFilesV1 = readonly [
  Task548CommittedBootstrapFileV1, Task548CommittedBootstrapFileV1,
  Task548CommittedBootstrapFileV1, Task548CommittedBootstrapFileV1,
  Task548CommittedBootstrapFileV1, Task548CommittedBootstrapFileV1
];
export type Task548CommittedSixPathBootstrapReceiptV1 = Readonly<{
  schema: "coderso.task548-committed-bootstrap@v1"; taskId: "TASK-548";
  priorHead: string; head: string;
  workflowEntry: "_docs/_workflows/task-548-implement.mjs";
  files: Task548CommittedBootstrapSixFilesV1; aggregateSha256: string;
}>;
declare const verifiedTask548Bootstrap: unique symbol;
export type VerifiedTask548CommittedSixPathBootstrapReceiptV1 = Readonly<
  Task548CommittedSixPathBootstrapReceiptV1 &
  { [verifiedTask548Bootstrap]: true }
>;
export function normalizeTask548CommittedSixPathBootstrapReceiptV1(
  value: unknown
): Task548CommittedSixPathBootstrapReceiptV1;
export function requireTask548CommittedSixPathBootstrapAuthorizationV1(
  options: { repoRoot: string; receipt: unknown }
): Promise<VerifiedTask548CommittedSixPathBootstrapReceiptV1>;

export async function requireTask548CommittedSixPathBootstrapAuthorizationV1(options) {
  requireExactKeys(options, ["repoRoot", "receipt"]);
  const receipt = normalizeTask548CommittedSixPathBootstrapReceiptV1(
    options.receipt
  );
  await requireExactCommittedTask548SixPathReceipt(receipt, {
    repoRoot: options.repoRoot,
    expectedTask: "TASK-548",
    expectedWorkflowEntry: "_docs/_workflows/task-548-implement.mjs",
    expectedPaths: TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1,
    requireExactSchemaTaskPriorHeadCurrentHeadFilesAndAggregate: true,
    requireCurrentHeadDirectParentEqualsPriorHead: true,
    requireCurrentHeadAndExactStaticImportGates: true,
  });
  return brandVerifiedTask548CommittedBootstrapReceipt(receipt);
}
```

The six paths are exact and order-sensitive. `_docs/_workflows/task-548-closeout.mjs`
is not part of the constant; the constant is
`_docs/_workflows/lib/task-548-contract.mjs`, `task-548-author-audit.mjs`,
`task-548-fix.mjs`, `task-548-implement.mjs`, and the two `task548*` unit tests
listed above. The normalizer recursively rejects unknowns, requires path-sorted
constant membership in exact order, lowercase 40-hex `priorHead`/`head`, and
lowercase 64-hex file/aggregate hashes, and recomputes the aggregate over the
checkpoint-compatible canonical JSON `{ priorHead, files }` with displayed key
order and one final LF.

## Authorization contract

`requireTask548CommittedSixPathBootstrapAuthorizationV1` additionally proves the
live Git facts before returning the branded receipt: current HEAD equals `head`,
is the single direct child of `priorHead`, its exact diff is those six regular
non-symlink paths, each tracked HEAD byte hash matches, the worktree/index are
clean for them, and the exact workflow static/import gates pass. The branded
receipt is returned only after those live checks; a caller-supplied hash, path
order, or receipt body is never trusted on its own.

A TASK-548 fixture must require this current-HEAD, exact-six-path
committed-bootstrap gate immediately before the exact-argument phase-1 call.
Missing, stale, or wrong-entry receipts reject; reordering the six paths, an
intervening action between the gate and the phase-1 call, an unknown phase-1
option, or passing the receipt into `createResumeCheckpoint` rejects. The
receipt carries no root, timestamp, body, command output, or override.

## Error/compatibility flow

Every mutation of a root/nested key, path/order/hash/HEAD/parent/aggregate/
workflow entry rejects. A non-`TASK-548` task, a non-canonical workflow entry, a
symlink or non-regular path, a dirty/mismatched index, or a `priorHead` that is
not the exact direct parent of `head` returns a machine-readable failure without
leaking receipt bodies.

## Regression-test shape owned by this leaf

`tests/unit/workflows/smokeEvidenceTask548Bootstrap.test.ts` owns:

- receipt round-trip plus every root/nested key, path/order/hash/HEAD/parent/
  aggregate/workflow-entry mutation rejection;
- missing/stale/wrong-entry receipt rejection, reordering, an intervening
  action, and an unknown phase-1 option rejection;
- passing the receipt into `createResumeCheckpoint` rejection;
- the branded receipt returned only after live Git direct-parent/diff/
  tracked-byte checks, and failure when any live check is absent or faked.

Checkpoint/resume, closure metadata/delta, and ordered-durable marker fixture
shapes belong to TASK-545-03-L03 and TASK-545-03-L04, not this leaf.

## Testing Requirements

```bash
node --check _docs/_workflows/lib/smoke-evidence.mjs
node --check _docs/_workflows/lib/smoke-evidence-task548.mjs
bun test tests/unit/workflows/smokeEvidenceTask548Bootstrap.test.ts
bun test tests/unit/workflows/smokeEvidenceCheckpoint.test.ts
bun run lint:repo:types
git diff --check
wc -l _docs/_workflows/lib/smoke-evidence.mjs \
  _docs/_workflows/lib/smoke-evidence-task548.mjs \
  _docs/_workflows/lib/smoke-evidence.d.mts \
  _docs/_workflows/lib/smoke-evidence-task548.d.mts \
  tests/unit/workflows/smokeEvidenceTask548Bootstrap.test.ts
```

## Documentation Updates Required

- No guidance file is edited here; TASK-545-03-L02 owns the evidence guide and
  the generic cookbook recipe.
- Record closure only in changelog 1257 and the TASK-545 board family through
  TASK-545-04-L03.
