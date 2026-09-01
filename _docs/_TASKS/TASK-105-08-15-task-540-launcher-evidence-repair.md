# TASK-105-08-15: TASK-540 Launcher and Evidence Repair
# FileName: TASK-105-08-15-task-540-launcher-evidence-repair.md

**Parent Task:** TASK-105-08
**Priority:** High
**Category:** Testing Infrastructure / Runtime Smoke
**Estimated Effort:** Small
**Dependencies:** TASK-105-08-14 focused request-shape repair; TASK-105-08-04 static and targeted-suite receipt
**Status:** 🚧 In Progress
**Started:** 2026-08-22

---

## Objective

Repair the two independent TASK-540 smoke-harness defects exposed after L14's request-shape repair.
The task105-l04-fast-20260822-r2 run generated a green in-process report, but its parent Node/tsx
launcher remained live because the routing-settings lease left its process-global PostgreSQL client
open. Its report also referenced 13 transient flat screenshot paths, so later restoration invalidated
all report-to-file hashes.

This leaf repairs the launcher/evidence boundary needed by a successful fast smoke: natural parent
termination and session-scoped screenshot evidence. Its one r3 command reached that boundary but
then failed before scenarios at the separate storage-preflight query-scope defect. L16 owns that
recovery and its sole eligible r4 retry. L15 remains harness recovery only: no custom-screen
product, route, schema, persistence, security, worker, or browser behavior changes. The r2 and r3
reports remain read-only diagnostic evidence and never become L04 acceptance receipts.

## Scope and Single-Writer Ownership

This leaf is the sole writer of exactly:

- scripts/runtime-smoke/adapters/task-540.ts;
- scripts/runtime-smoke/adapters/task-540/output-manifest.ts;
- scripts/runtime-smoke/adapters/task-540/suite/composition/suite.ts;
- tests/unit/runtime-smoke/task540-adapter.test.ts;
- tests/unit/runtime-smoke/task540-native-suite-boundary.test.ts.

This is a path-specific supersession only: task-540.ts and task540-adapter.test.ts were owned
by TASK-552-03-L02 and TASK-552-04-L03; the composition suite and
task540-native-suite-boundary.test.ts by TASK-552-04-L03; and output-manifest.ts plus the
canonical evidence boundary by TASK-577. TASK-560-03 is historical evidence-run protocol only,
not a source-path owner. This neither reopens terminal task documents nor grants authority over
any other historical TASK-540 source, test, or evidence path.

It may create only _docs/_workflows/_smoke/evidence/task-540/task105-l04-fast-20260822-r3/,
whose exact recursive tree is report.json plus screenshots/ containing exactly 13 PNG children.
The shared runner additionally appends its ignored ephemeral diagnostic log at
.tmp/runtime-smoke/task105-l04-fast-20260822-r3.diag.log; it is neither durable evidence nor a
git-visible repository artifact. A failed r3 directory remains read-only diagnostic evidence.
Do not edit, delete, or retrofit r2 evidence.

The immutable native plan writes its existing 13 flat adapter screenshots during the run. L15
captures their pre-run regular-file identities and bytes before the plan starts. It restores a
flat path only if its observed post-generation identity and SHA-256 still match the run-owned
output; a changed, symlinked, non-regular, or otherwise unverifiable path is a fail-closed drift
and is never blindly overwritten. That bounded safeguard cannot protect an unconstrained external
writer that races the native producer itself, so r3 requires a quiescent shared tree and an
orchestrator preflight that the exact r3 evidence directory does not exist. The existing shared
runner's precreation of report.json is a trusted runner precondition; L15's no-follow guarantee
starts when archive PNG handling begins. Guarded cleanup applies after a successful archive and
after an archive error whose generated source hashes are known. If a plan fails before it can
establish run-owned generated identities, it must not guess or overwrite any flat output; it
remains a failed diagnostic run and cannot yield an L04 receipt.

This leaf must not edit core, tests/vitest, task-540 browser/action/worker/route/schema modules,
shared lifecycle or runner modules, DB client code, TASK-569, or completed TASK-552/TASK-560
documentation. Do not add process.exit, forced child termination, a retry/rebase path, or manual
edits or copies of prior evidence.

## Implementation Pseudocode

1. In the composition suite, build a frozen exact archive manifest before its before snapshot.
   Its ordered 13 rows map every immutable flat required-screenshot path to one unique
   evidence/task-540/session/screenshots/basename.png path. Source paths, archive paths, and
   filenames must each be unique. Different rows may have the same SHA-256. Capture the flat
   baseline before native execution and snapshot all current git-visible paths plus the 13 flat
   and 13 archive paths. Flat paths are deliberately not allowed to differ in the final
   comparison: their captured baselines must be restored first.

        const manifest = buildExactTask540ArchiveManifest(input, plan.requiredScreenshotPaths);
        const baseline = await captureTask540FlatScreenshotBaseline(root, manifest);
        const guardPaths = Object.freeze([...manifest.sourcePaths, ...manifest.archivePaths]);
        const before = await context.repository.snapshot(guardPaths);

2. Preserve native evidence unchanged, including its flat-path projection and visible-effect
   validation. Once it succeeds, archive only its 13 hash-validated PNG bytes. The adapter
   validates a separate archived projection and returns only full repo-relative archive paths to
   the shared report. It must not mutate or reinterpret native evidence.

        const nativeEvidence = await executeTask540NativePlan(...);
        const archived = await archiveTask540Screenshots(root, manifest, nativeEvidence.screenshots);
        assertExactTask540EvidenceDirectory(root, input, manifest);
        const archivedResult = projectTask540ArchivedScreenshots(archived);

3. The archive helper uses no-follow reads and writes. It accepts only bounded regular files with
   one link, verifies stable source identity and source/destination SHA-256, rejects escapes,
   duplicate paths, unexpected directory entries, and overwrite attempts, and creates new mode
   0600 files. The before/after RepositoryGuard comparison includes all 26 flat/archive paths
   but permits only the 13 archive paths; it proves every flat path remains restored through
   final cleanup. The exact recursive
   session tree while the adapter runs is a regular single-link mode-0600 report.json at the
   session root plus a non-symlink screenshots directory containing exactly 13 regular
   single-link mode-0600 PNGs and no other entries. The runner writes final report contents only
   after the adapter returns.

4. In finally, invoke one narrow injected finalizer. It independently attempts routing restore and
   then exactly one lazily imported closeDatabase call whenever a lease was created. It aggregates
   primary, restore, and close errors through the existing fail-closed preserveFailure path and
   attempts the DB close even after a restore failure.

        async function finalizeTask540RoutingLease(input: {
          routingLease: Pick<RuntimeSmokeRoutingSettingsLease, "restore"> | null;
          routingRestored: boolean;
          primary: unknown;
          closeDatabase(): Promise<void>;
        }): Promise<{ primary: unknown; routingRestored: boolean }> {
          // restore first; close once; aggregate every failure
        }

5. After native evidence has supplied generated hashes, run guarded flat restoration in both the
   successful archive path and the archive-error path. Use a no-follow, observed
   identity-and-hash-checked atomic replacement only when the current file still equals the
   run-owned output. If identity drift is observed, preserve the current file and r3 evidence,
   report a classified failure, and do not advance L04. Finally take the after snapshot and
   assert that only the allowed archive paths changed during the run.

6. Extend the two owned Bun suites. Archive coverage proves the exact ordered map, distinct
   archive paths, duplicate-hash acceptance, safe no-overwrite behavior, successful restoration,
   archive-error restoration, and adversarial identity-drift refusal. Finalizer coverage proves
   normal, primary-failure, restore-failure, and close-failure cases: restore precedes exactly
   one close and failures are aggregated fail-closed.

## Security Contract

This is loopback-only internal smoke infrastructure. Existing authenticated admin sessions,
content:write RBAC, CSRF, rate-limit bucket, and reject-unknown API validation remain unchanged.
The repair adds no endpoint, public input, API schema, database mutation, or credential surface.
Session names are validated by the shared CLI before paths are constructed. The archive fails
closed on filesystem identity drift. Evidence must remain redacted: no cookies, CSRF values,
credentials, database URLs, raw response bodies, or secret-bearing logs may enter the report or
PNG archive.

## Validation Gates

1. Run:

        bun test tests/unit/runtime-smoke/task540-adapter.test.ts tests/unit/runtime-smoke/task540-native-suite-boundary.test.ts

2. Run:

        bun test tests/unit/runtime-smoke
        bun --cwd core lint:types
        bun --cwd core lint
        ./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false

   Attribute every root TypeScript diagnostic to a named leaf and require zero L15-owned paths.
3. Run git diff --check and a physical line-count check over all five owned source/test files;
   each must contain at most 1,000 lines.
4. The prescribed one r3 command was run after its focused gates. It exited naturally but failed
   before scenario execution with `wf540_task_traffic_baseline_overflow`; its report records
   `pass:false`, zero scenarios, and zero screenshots. Preserve its evidence directory and ignored
   diagnostic log unchanged. Do not rerun or retrofit r3. L16 owns the sole eligible r4 command
   and its preflight/terminal/hash validation.
5. Run a fresh read-only post-implementation audit of L14, L15, L16, and L04 acceptance after
   L16's r4 result. It must verify archive/restore results and receipt fields against command
   output and hashes.

## Acceptance Criteria

1. The injected finalizer proves, on normal and failure paths, routing restore is attempted
   before one DB close, DB close is still attempted after restore failure, and all shutdown
   failures are fail-closed. The naturally terminated r3 diagnostic proves the launcher boundary
   on its early-failure path; L16's successful r4 must prove it on the complete smoke path.
2. A successful report references 13 immutable session-scoped PNGs whose exact bytes match their
   SHA-256 values. No report relies on a mutable flat screenshot path. Its directory contains only
   the expected report and archive set, and ordered path-to-hash records may repeat a hash.
3. L15 does not claim the full smoke acceptance: r3 failed before scenarios and remains
   diagnostic. L16's r4 must prove all 420 browser plus 76 runtime receipts, visible effects,
   seven scenarios, zero console/page errors, deterministic cleanup, guarded flat-output
   restoration, and terminal exit.
4. Only the five owned source/test files and the named r3 evidence directory persistently change;
   the shared runner's ignored r3 diagnostic log is an expected ephemeral exception. Every
   touched production/test file has at most 1,000 physical lines.

## Completion Policy

L14 and L15 remain 🚧 In Progress until the family changelog permits terminal closure. L15's r3
is failed diagnostic evidence and does not supply L04 acceptance or permit L05 to begin. L16's
clean r4 is the sole remaining runtime receipt. Leaves may not edit task documents. After
independently verifying r4, the orchestrator alone may append bounded L15/L16/L04 receipts:
command, exit, no-live-session processes, report path, exact 13/13 archive hash check,
flat-restoration result, gates, audit verdict, and the L05-start decision. This exception
authorizes no board status, changelog, source, or test ownership.

## Bounded Post-r4 Receipt (2026-08-22)

The sole eligible command completed naturally with exit `0`:

```bash
bun scripts/runtime-smoke.ts run --suite task-540 --profile fast --session task105-l04-fast-20260822-r4
```

- The session process and its Playwright children are absent after exit. Its report is
  `_docs/_workflows/_smoke/evidence/task-540/task105-l04-fast-20260822-r4/report.json` and
  records `pass:true`, `serverUp:true`, cleanup pass, seven passing scenarios, and zero
  console/page failures.
- The report references exactly 13 session-archive screenshots. Independent read-only validation
  re-hashed all `13/13`, verified the exact `report.json` plus `screenshots/` tree, regular
  single-link `0600` report/PNG files, and permitted duplicate content hashes at distinct paths.
  All 13 flat PNG baselines were independently restored byte-for-byte and with their prior mode.
- The report has no standalone logical-action counter. The `496` total remains the separately
  validated current native-plan invariant; the successful native-suite path validates its
  420-browser/76-runtime receipt contract rather than treating `report.snapshots` as that count.
- The focused and full runtime-smoke Bun gates passed (`321/321` in the full lane); scoped
  lint/format/diff/line gates passed, and root TypeScript attribution contains zero L15-owned
  diagnostics. Fresh post-r4 evidence and contract audits found no HIGH or MEDIUM drift.

This satisfies L15's complete-path launcher/evidence acceptance. It changes no terminal status,
board row, changelog, source, or test ownership.
