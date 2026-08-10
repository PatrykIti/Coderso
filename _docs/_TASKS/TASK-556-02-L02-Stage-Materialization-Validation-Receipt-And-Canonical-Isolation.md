# TASK-556-02-L02: Stage Materialization Validation Receipt and Canonical Isolation
# FileName: TASK-556-02-L02-Stage-Materialization-Validation-Receipt-And-Canonical-Isolation.md

**Parent Task:** TASK-556
**Parent Subtask:** TASK-556-02
**Priority:** High
**Category:** Designer / Transaction B / Receipt / Isolation
**Estimated Effort:** Large
**Dependencies:** TASK-556 external terminal gate; TASK-556-02-L01
**Start Receipt:** TASK-556-02-L01 reviewed landed diff, green commands, budgets, and line counts
**Completion Receipt:** Reviewed owned diff plus every command/budget below green
**Status:** ⏳ To Do
**Changelog:** 1270 pinned

---

## Overview

Implement replay-first Transaction B, deterministic failure terminalization,
atomic stage/receipt/ready CAS, and canonical-isolation evidence.

## Sub-Tasks

None; this is an executable leaf.

## Exact Writer and Forbidden Paths

Sole writer paths:

- `core/services/designer/staticSources/staticStageMaterializationService.ts`;
- exact additive regions in `core/services/designer/validationReceiptContract.ts`,
  `core/services/designer/validationReceiptService.ts`, and
  `core/services/designer/stageMaterializationService.ts`;
- `tests/vitest/designer/designer-static-validation-receipt.test.ts`;
- `tests/integration/server/task556StaticStageMaterialization.test.ts`;
- `tests/integration/server/task556StaticStageRecovery.test.ts`;
- `tests/integration/server/task556StaticCanonicalIsolation.test.ts`;
- `tests/integration/server/task556StaticPreviewConsumption.test.ts`;
- `tests/security/designerStaticStage.security.test.ts`;
- `tests/perf/designerStaticStarterStage.test.ts`.

Forbidden paths: all external dependency source; prior TASK-556 files except
imports; terminal promotion/activation/cache source; `core/server/**`,
`core/admin/**`, capability/smoke files, canonical CMS/install/Agent/Assistant
files, task/changelog indexes, root config, `AGENTS.md`, `_TMP*`, non-TASK-556 tasks.

## Transaction B and Failure Contract

1. 03-L01's orchestration uses 01-L01's bounded key/binding preflight before
   release I/O. An exact same-key retained ready/failed result returns there with **0** TASK-555
   accessor calls, **0** compiles, and **0** writes; this leaf receives only a
   current dispatch fence plus 02-L01's prepared pure output.
2. Begin short Transaction B and lock binding -> workspace -> current static
   revision -> current static generation run -> claim in terminal order.
3. Validate immutable owner/binding/revision/run/claim identity first, including
   source/release/request/binding digests, the normalized <=512 KiB generation-run
   `static_brief`, its canonical `designerBriefDigest`, persisted-or-current
   contribution/registry/compiler versions returned by Transaction A, and the
   compiled graph/plan/native/receipt identity. This step does not require the
   claim still to be live or the workspace still to be not-ready.
4. Read the immutable receipt by that exact generation run. If it exists, require
   byte-identical receipt/stage/preview identity and the static revision/run in
   their exact receipt-bound ready projection. The workspace may already reflect
   later authorized Designer work, so return `replayed` plus its current navigable
   active revision/version/state from those same locked rows. This happens before
   current-pointer, workspace-version/not-ready, or live-fence checks. A changed,
   partial, foreign, or receipt-without-ready projection conflicts and writes
   nothing.
5. Only when the receipt is absent, require that the dispatched initial-or-single-
   retry static revision/run are still current for the not-yet-ready workspace,
   verify workspace version and live bound fence, and recheck no conflicting stage
   evidence.
6. Insert terminal staged resources/edges plus the terminal stage-owned preview
   manifest/artifacts, immutable run-bound receipt, event, then CAS run/revision/
   workspace to `ready` and set every still-null alias `purgeAfter` from the same
   referenced run terminal timestamp plus 30 days in one bounded statement; commit
   all or none. The
   deferred alias/run trigger pair verifies the lifecycle. There is no second
   preview repository. Return the original operation outcome and authoritative
   workspace ID/active revision/version/state from the post-CAS locked snapshot.
7. Release failure before Transaction A leaves no claim. If pure compilation
   after dispatch deterministically fails, open a separate short transaction,
   lock the same claim, verify fence/nonterminal state, persist only terminal
   safe failure code/digest, CAS failed, and set the run's still-null alias
  `purgeAfter` from the referenced run terminal timestamp plus 30 days in one
   bounded statement. Same-key
   replay returns it. Process
    crash/timeout before this transaction leaves resumable in-progress. The same
    key returns in-progress while live and never redispatches; after expiry it
    returns the bounded fresh-key idempotency conflict. Only a fresh key may take
    over after the bounded claim lease expires and Transaction A rotates the
    fence.

Receipt source includes the three upstream digests plus Designer
`designerBriefDigest`, `bindingDigest`, and `seedRequestDigest`, as well as
contribution/registry/compiler/capability/native/graph/plan/preview facts.
`designerBriefDigest` equals the immutable Transaction-A revision/run evidence.
The full `static_brief` is not copied into the receipt; Transaction B validates
its normalized bytes/digest against the locked run before receipt handling.
`receiptDigest` excludes `createdAt`, `updatedAt`, event timestamps and process
time; timestamps remain non-digested audit metadata. Prompt/private receipt bytes
remain unchanged.

This leaf consumes 02-L01's already completed single TASK-556 compiler-side
normalize/canonical-byte/fingerprint/reference-plan pass. Receipt building,
Transaction B, replay, and preview projection call none of those package helpers;
there is no third end-to-end validation.

No canonical CMS, active-generation, public/search/cache, Solution Kit run,
TASK-555 install, or Agent state is written before terminal promotion.

## Numeric Budgets

- Exact retained replay follows the 01-L01 service budget (see
  `TASK-556-01-L01` Numeric Budgets, the single owner): <=3 SQL statements, <=50
  ms p95, 0 locks held across I/O.
- Transaction B new materialization: <=14 SQL statements plus two bounded set-based
  stage inserts and one bounded alias-lifecycle update, <=512 resource rows,
  <=4,096 edge rows, <=1 receipt and <=1
  preview manifest; no per-row N+1.
- Lock wait timeout 1,000 ms; statement timeout 2,000 ms; Transaction B <=500 ms
  p95 on representative package; deterministic-failure transaction <=100 ms p95.
- Receipt/manifest selected payload <=256 KiB; diagnostics <=100/64 KiB.
- Canonical isolation canaries use <=20 bounded point/count queries, no broad JSON/text scans.
- `tests/perf/designerStaticStarterStage.test.ts` runs alone with
  `--parallel=1`, warms only its owned fixture, and pins Transaction-B statement,
  set-based row, lock-wait, p95, and payload budgets without competing load.

## Implementation Pseudocode

```ts
export async function materializeClaimedStaticStage(command, prepared, deps) {
  return deps.db.transaction(async (tx) => {
    const locked = await deps.stage.lockBindingWorkspaceRevisionRunClaimTx(tx, command);
    assertExactImmutableSubtypeBriefAndCompiledFacts(locked, command, prepared);
    const existing = await deps.receipts.findByGenerationRunTx(
      tx,
      command.runId,
    );
    if (existing) {
      const replay = assertExactReceiptBoundStaticReadyReplay(
        locked,
        existing,
        prepared.receiptDigest,
      );
      return projectOperationAndWorkspaceFromLockedSnapshot(replay, "replayed");
    }
    assertCurrentNotReadyLiveFenceForFirstWrite(locked, command);
    await deps.stage.insertGraphSetBasedTx(tx, prepared.stage);
    await deps.receipts.insertImmutableTx(tx, prepared.receipt);
    const completed = await deps.stage.completeReadyWithPreviewCasTx(
      tx,
      command,
      prepared.preview,
      prepared.receiptDigest,
    );
    return projectOperationAndWorkspaceFromLockedSnapshot(
      completed,
      command.operationOutcome,
    );
  });
}
```

**Data flow:** service replay miss -> trusted release -> Transaction-A dispatch
fence plus persisted takeover/retry facts or current new/promoted-fork facts ->
pure compile -> Transaction-B binding/claim/run-bound fact/receipt recheck ->
terminal set-based stage/preview/receipt/ready CAS -> operation outcome plus owner-
private workspace projection from the same final locked snapshot. There is no
unlocked reload between operation classification and response projection.

**Errors:** `designer_static_replay_conflict`, `designer_static_claim_stale`,
`designer_static_receipt_invalid`, `designer_static_stage_invalid`,
`designer_static_stage_timeout`, `designer_static_compile_invalid`,
`designer_static_canonical_isolation_failed`; unknown errors use terminal safe map.
03-L01 consumes this closed error union and maps every member exhaustively.

## Tests

- Exact owner/revision/run-bound receipt replay proves zero accessor/compiler/write
  calls and stable digest across timestamps; immutable identity is checked before
  receipt lookup, but exact ready replay returns before live-fence/current/not-ready
  checks. A foreign/different run or receipt without a ready static run/revision
  projection never replays; later valid workspace activity is returned from the
  final locked workspace row rather than treated as static-receipt drift.
- Transaction-A revision, static run/claim/binding, compiler input, receipt, and
  preview all carry the same canonical `designerBriefDigest`; the run carries the
  strict normalized <=512 KiB `static_brief`, and one-field/byte/size mismatch fails
  before receipt return or stage writes.
- Takeover/retry after registry, brief, or compiler evolution carries the exact
  persisted normalized run `static_brief`, version triple, and binding identity through
  compiler input and receipt. New/promoted-fork carries current facts; crossing
  either source fails before writes.
- Crash checkpoints after Transaction A, accessor, compile, every Transaction-B
  insert/CAS; same-key no-redispatch and terminal replay; fresh-key expired
  takeover; other-key live conflict with no alias insert/cap consumption;
  race-to-cap attempt then expiry recovery; deterministic failure replay.
- Concurrent Transaction B yields one receipt/ready revision. A loser entering
  after the winner's commit sees a no-longer-live fence and ready workspace but
  returns exact replay because the identical receipt is read first; changed bytes
  conflict. No replay performs stage/receipt/CAS writes.
- Ready and deterministic-failure terminalization set every run alias
  `purgeAfter` atomically to the referenced run terminal timestamp plus 30 days;
  late aliases and restored aliases retain the same deadline. Rollback, refresh,
  live-run non-null, terminal-run null, or insertion-time-derived cases fail.
- Set-based counts and all numeric query/row/latency/lock/timeout/payload budgets.
- Focused serial DB performance proof runs with no competing worker/test and
  asserts exact TASK-556 compiler-pass count through injected dependencies, not
  production runtime telemetry.
- Canonical/installer/run/Agent/cache/public canaries unchanged on success/replay/failure.
- Provider-offline private preview consumes ready stage with no fallback and no-store/noindex.
- Seed/resume/reopen/replay outcome plus workspace ID/active revision/version/state
  are projected from one final locked snapshot. A concurrent later provider
  revision cannot produce a mixed outcome/workspace response, and no unlocked
  reload helper is called.

## Security Contract

- **Visibility:** internal service/private stage only.
- **Authentication/RBAC:** trusted owner and exact fenced claim rechecked under lock.
- **CSRF/rate:** upstream POST owns CSRF and the shared `admin_write` policy.
- **Validation:** strict compiled/receipt/manifest, identities, CAS/fence and DB constraints.
- **Anti-abuse:** no public write/provider/external I/O in transaction/canonical apply.
- **Privacy:** safe codes/projections only; no bodies, paths, SQL, secrets or foreign identity.

## Testing Requirements

After safe `.env` load and DB reachability:

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/designer/designer-static-validation-receipt.test.ts
bun test tests/integration/server/task556StaticStageMaterialization.test.ts tests/integration/server/task556StaticStageRecovery.test.ts tests/integration/server/task556StaticCanonicalIsolation.test.ts tests/integration/server/task556StaticPreviewConsumption.test.ts tests/security/designerStaticStage.security.test.ts
set -a && source .env && set +a && bun test --parallel=1 --timeout 360000 tests/perf/designerStaticStarterStage.test.ts
bun run scan:security:strict
git diff --check
```

Run the focused performance command with no other test, smoke, worker, or load
generator competing for the database. Run terminal TASK-414 stage/receipt/
preview regressions, numeric budget tests, and `wc -l` on every touched human-
authored production/test file; fail above 1,000.

## Documentation Updates Required

Record receipt fields/digest exclusion, transaction/failure/replay protocol,
budgets and isolation evidence for TASK-556-04-L02. Edit no shared docs/metadata.
