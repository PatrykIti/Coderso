# TASK-545-03-L04: Closure Metadata Delta and Closure-Delta CLI

# FileName: TASK-545-03-L04-Closure-Metadata-Delta-And-Closure-Delta-CLI.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-03
**Priority:** High
**Category:** Workflow Evidence / Closure Metadata / Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-545-03-L03
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)
**Split From:** TASK-545-03-L01 (2026-08-13)

---

## Overview

Own the closure metadata mutation plan, the ordered-durable
changelog-file-then-index writer, metadata-only delta validation, and the
`closure-delta` CLI. This leaf was split out of TASK-545-03-L01 on 2026-08-13.
It consumes the checkpoint, `closureIdentity`, and `Task545ClosureResume` from
TASK-545-03-L03 and applies only bounded metadata writes to the exact frozen
task/index/changelog allowlist; it never blesses source, test, workflow,
evidence, or HEAD drift.

## Sub-Tasks

None; this is an executable leaf with the exclusive file ownership below.

## Exclusive ownership

- new `_docs/_workflows/lib/smoke-evidence-closure.mjs` (all closure exports:
  `buildClosureMetadataMutationPlanV1`,
  `writeOrResumeOrderedDurableChangelogFileThenIndexV1`,
  `validateMetadataOnlyClosureDelta`, `buildExactClosureMetadataAllowlist`, and
  their private helpers, plus the `closure-delta` CLI entry)
- new `_docs/_workflows/lib/smoke-evidence-closure.d.mts` (closure type
  declarations)
- `_docs/_workflows/lib/smoke-evidence.mjs` ONLY as a thin re-export surface
  (`export { ... } from "./smoke-evidence-closure.mjs"`; a few lines, because
  the 1,000-line gate is why this family was split from L01)
- `_docs/_workflows/lib/smoke-evidence.d.mts` ONLY as a thin re-export type
  surface mirroring the `.mjs` re-export
- new `tests/unit/workflows/smokeEvidenceClosureDelta.test.ts`
- test fixtures under `tests/fixtures/workflows/smoke-evidence/closure/`

TASK-545-03-L03 owns the checkpoint/resume state machine and
`resolveOwnerControlledSupplementalClosureTaskFiles` (the TASK-414 → TASK-406
static mapping). This leaf consumes that frozen supplemental list but does not
broaden it.

## Implementation Pseudocode

The named exports below are the moved closures previously declared in
TASK-545-03-L01; the companion `_docs/_workflows/lib/smoke-evidence.d.mts`
declares them and the runtime exports them from `smoke-evidence.mjs`.

```ts
export async function buildClosureMetadataMutationPlanV1(
  checkpoint,
  closureIdentity,
  options,
) {
  requireCheckpointAndEvidenceStillExact(checkpoint, {
    closureIdentity,
    repoRoot: options.repoRoot,
  });
  const frozenBytes = await readFrozenTaskIndexAndChangelogBytes(checkpoint);
  const freshIndexes = await readFreshIndexes(options.repoRoot);
  // Deeply frozen records: { path, beforeSha256, operations, expectedAfterSha256 }.
  const records = buildExactClosureMetadataMutationRecords({
    checkpoint,
    closureIdentity,
    frozenBytes,
    freshIndexes,
    supplementalMapping: checkpoint.closureContract.supplementalTaskFiles,
  });
  validateExactMutationRecordSet(records, {
    requireSortedUniquePaths: true,
    rejectUnknownKeys: true,
    rejectNonMetadataOperations: true,
  });
  return Object.freeze(records);
}

function buildExactClosureMetadataAllowlist({
  frozenContract,
  pinnedChangelogPath,
  closureUtcDate,
}) {
  validateExactFrozenClosureContract(frozenContract, {
    requireSortedUniqueTaskAndSupplementalFiles: true,
    requireDisjointTaskAndSupplementalFiles: true,
    rejectUnknownKeys: true,
  });
  requirePinnedChangelogPathMatchesFrozenNumberSlugAndDate(
    pinnedChangelogPath,
    frozenContract,
    closureUtcDate,
  );
  return new Set([
    ...frozenContract.taskFiles,
    ...frozenContract.supplementalTaskFiles,
    frozenContract.taskIndex,
    frozenContract.changelogIndex,
    pinnedChangelogPath,
  ]);
}

export async function writeOrResumeOrderedDurableChangelogFileThenIndexV1(options) {
  requireExactKeys(options, ["repoRoot", "checkpoint", "runId", "closureIdentity",
    "changelogBytes", "changelogIndexMutation", "protocol"]);
  requireExactProtocolMarker(
    options.protocol, "ordered-durable-changelog-file-then-index@v1"
  );
  requireTaskRunAndIdentityBinding(options);
  const tx = deriveCheckpointRunBoundSameRepoTransaction(options);
  await createOrVerifyJournalViaTempFsyncRenameAndDirectoryFsync(tx);
  let state = await inspectBoundOrderedChangelogPair(
    options.checkpoint, options, {
      validStates: ["none", "file-only", "both"],
      rejectIndexOnlyCorruptOrMultiple: true,
    }
  );
  if (state.state === "none") {
    await writeCanonicalChangelogRegularFileNoReplace(tx, options.changelogBytes);
    await fsyncFileThenContainingDirectory(tx.changelogPath);
    state = await requireExactPairState(tx, "file-only");
  }
  if (state.state === "file-only") {
    const indexBytes = await applyExactChangelogIndexMutation(
      tx, options.changelogIndexMutation
    );
    const temp = await writeSameDirectoryIndexCasTemp(tx, indexBytes);
    await fsyncFile(temp);
    await requireIndexBaseSha256Unchanged(tx);
    await renameTempOverIndex(temp, tx.changelogIndex);
    await fsyncContainingDirectory(tx.changelogIndex);
  }
  await requireExactPairState(tx, "both");
  await removeBoundTempAndJournalThenFsyncDirectory(tx);
  return advanceClosureIdentity(options.closureIdentity, "both");
}

export async function validateMetadataOnlyClosureDelta(
  checkpoint, closureIdentity, repoRoot
): Promise<VerifiedTask545MetadataRecoveryDelta> {
  await requireCheckpointAndEvidenceStillExact(checkpoint, { closureIdentity, repoRoot });
  const current = await computeWorkingTreeRevision(
    repoRoot,
    closureIdentity.taskId,
    closureIdentity.session
  );
  if (current.gitHead !== checkpoint.frozenRuntime.gitHead) fail("smoke_head_changed");
  await requireExactOrderedChangelogPrefix(checkpoint, closureIdentity, current);
  const changed = diffCanonicalRecords(checkpoint.frozenRuntime.records, current.records);
  const allowlist = buildExactClosureMetadataAllowlist({
    frozenContract: checkpoint.closureContract,
    pinnedChangelogPath: closureIdentity.pinnedChangelogPath,
    closureUtcDate: closureIdentity.closureUtcDate,
  });
  if (changed.some((entry) => !allowlist.has(entry.path))) {
    fail("smoke_non_metadata_delta");
  }
  return {
    pass: true,
    taskId: closureIdentity.taskId,
    runId: checkpoint.runId,
    closureMetadataRevision: publicRevision(current),
    changedPaths: uniqueSorted(changed.map((entry) => entry.path)),
  };
}
```

Allowed metadata operations are limited to canonical task `Status` plus
dedicated `Started`/`Completed`/`Superseded By` fields; the exact owning board
row and Statistics values; the pinned changelog file generated from a strict
bounded closure-evidence template; and the exact changelog index row/next
pointer. The TASK-414 supplemental TASK-406 plan may change only those same
terminal fields and its own board row. Scenario inventories, acceptance text,
dependencies, pseudocode, security contracts, arbitrary prose, another board
row, another statistic, and duplicate/ambiguous board rows or statistics fail
closed (for example `duplicateBoardStatisticRejected`).

## Closure-delta CLI

```text
node smoke-evidence.mjs closure-delta --repo-root <root> --task TASK-###
  --suite <registered-suite> --profile <fast|certification> --session <session>
  --checkpoint <canonical-path> --checkpoint-sha256 <sha> --run-id <run-id>
```

The diagnostic recovers the identity from the checkpoint plus strict on-disk
changelog/index facts; callers never supply a path, hunk, or date. Exit 0 is
emitted only on success. `closure-delta` recomputes each final SHA-256 and
requires exact equality with the plan; a caller-provided path/hunk/hash is never
accepted. Every failure is structured JSON without raw identities.

## Recovery and reconstruction rules

The writer applies the frozen plan in memory to the exact frozen bytes, refuses
a missing/duplicate/ambiguous field or row, writes with the ordered-durable
protocol, and rereads every file. Recovery reconstructs the identical plan from
checkpoint, `closureIdentity`, and the durable current prefix and may complete
only its next missing operation. Only `none`, `file-only`, and `both` recover.
`file-only` is the exact recoverable first prefix; recovery finishes the index
before later metadata, while `both` is revalidated. Stale temp/journal-only
residue is cleaned and directory-fsynced only after identity verification.
Index-only, corruption, duplicate/mismatched rows, zero/multiple files,
non-regular files, and symlinks fail. A UTC rollover after the no-replace
changelog write retains that file's date. Thus an arbitrary edit inside an
allowlisted file fails just as an unallowlisted path does.

## Error/compatibility flow

- Closure-delta success permits only bounded metadata drift; it never blesses
  source drift.
- Ordered-pair recovery never accepts index-only/corrupt/multiple state or
  treats stale temp/journal bytes as date authority.
- Any non-allowlisted delta invalidates the smoke and requires a new runtime
  smoke/phase 1. No file may change after the final pass.

## Regression-test shape owned by this leaf

`tests/unit/workflows/smokeEvidenceClosureDelta.test.ts` owns metadata-delta and
kill/recovery fixtures on the TASK-545-03-L01 temporary Git-repository corpus:

- Metadata-delta cases prove the exact planned status/completion/board/
  statistics/pinned-changelog operations and after-hashes pass while source,
  tests, config, runtime/security docs, workflow/evidence, HEAD, another
  task/changelog, new same-family task files absent from the frozen list, wrong
  number/slug/date, traversal, prefix-lookalike changes, arbitrary prose in an
  allowed task, a changed scenario or dependency line, another board row, an
  unplanned statistic, a duplicate/ambiguous board statistic, and declared
  after-hash drift fail.
- Kill/recovery fixtures prove every prefix rebuilds the same plan and cannot
  skip or add an operation; repeated delta validation is idempotent and returns
  a deterministic sorted path list.
- Both `frozen` and `metadata_recovery` fixtures call the exact owner export
  `writeOrResumeOrderedDurableChangelogFileThenIndexV1` with literal marker
  `ordered-durable-changelog-file-then-index@v1`; a task-local alias, skipped
  recovery call, wrong marker, or index-before-file implementation fails.
- Child-process fixtures kill after every journal/temp write, file fsync,
  rename, and directory-fsync boundary. They prove only none/file-only/both
  recover, stale temp/journal-only cleanup restarts safely, file-only completes
  the index once, both validates, bound residue accompanying either state is
  cleaned only after identity verification, and index-only/corrupt/multiple
  state fails. A UTC rollover after the no-replace changelog write retains its
  date. Strict path/body/row mismatches fail before allowlist validation.

Checkpoint/resume, TASK-548 bootstrap, and entry-bound fixture shapes belong to
TASK-545-03-L03 and TASK-545-03-L05, not this leaf.

## Testing Requirements

```bash
node --check _docs/_workflows/lib/smoke-evidence.mjs
node --check _docs/_workflows/lib/smoke-evidence-closure.mjs
node _docs/_workflows/lib/smoke-evidence.mjs closure-delta --help
bun test tests/unit/workflows/smokeEvidenceClosureDelta.test.ts
bun test tests/unit/workflows/smokeEvidenceCheckpoint.test.ts
bun run lint:repo:types
git diff --check
wc -l _docs/_workflows/lib/smoke-evidence.mjs \
  _docs/_workflows/lib/smoke-evidence-closure.mjs \
  _docs/_workflows/lib/smoke-evidence.d.mts \
  _docs/_workflows/lib/smoke-evidence-closure.d.mts \
  tests/unit/workflows/smokeEvidenceClosureDelta.test.ts
```

## Documentation Updates Required

- No guidance file is edited here; TASK-545-03-L02 owns the evidence guide and
  the generic cookbook recipe.
- Record closure only in changelog 1257 and the TASK-545 board family through
  TASK-545-04-L03.
