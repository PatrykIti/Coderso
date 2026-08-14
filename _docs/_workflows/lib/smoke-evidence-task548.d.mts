// Type declarations for _docs/_workflows/lib/smoke-evidence-task548.mjs
// (single owner: TASK-545-03-L05). Declares the exact six-path TASK-548
// committed-bootstrap constant, the strict receipt schema types, and the two
// phase-1 gate functions. The runtime file is valid plain JavaScript;
// consumers import the exact owner types from ./lib/smoke-evidence-task548.mjs
// (or the thin re-export on smoke-evidence.mjs) without local substitutes.

// Opaque brand: not exported, so only the authorization function's return type
// can carry it; a caller can never construct the verified type by hand.
declare const verifiedTask548Bootstrap: unique symbol;

export const TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1: readonly [
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
  Task548CommittedBootstrapFileV1,
  Task548CommittedBootstrapFileV1,
  Task548CommittedBootstrapFileV1,
  Task548CommittedBootstrapFileV1,
  Task548CommittedBootstrapFileV1,
  Task548CommittedBootstrapFileV1,
];

export type Task548CommittedSixPathBootstrapReceiptV1 = Readonly<{
  schema: "coderso.task548-committed-bootstrap@v1";
  taskId: "TASK-548";
  priorHead: string;
  head: string;
  workflowEntry: "_docs/_workflows/task-548-implement.mjs";
  files: Task548CommittedBootstrapSixFilesV1;
  aggregateSha256: string;
}>;

export type VerifiedTask548CommittedSixPathBootstrapReceiptV1 = Readonly<
  Task548CommittedSixPathBootstrapReceiptV1 & { [verifiedTask548Bootstrap]: true }
>;

export function normalizeTask548CommittedSixPathBootstrapReceiptV1(
  value: unknown
): Task548CommittedSixPathBootstrapReceiptV1;

export function requireTask548CommittedSixPathBootstrapAuthorizationV1(options: {
  repoRoot: string;
  receipt: unknown;
}): Promise<VerifiedTask548CommittedSixPathBootstrapReceiptV1>;
