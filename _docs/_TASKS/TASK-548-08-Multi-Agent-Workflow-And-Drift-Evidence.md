# TASK-548-08: Multi-Agent Workflow and Drift Evidence
# FileName: TASK-548-08-Multi-Agent-Workflow-And-Drift-Evidence.md

**Parent Task:** TASK-548
**Priority:** Critical
**Category:** Workflow / Contract Audit / Collision Safety
**Estimated Effort:** Large
**Dependencies:** TASK-545 exactly `✅ Done`; TASK-547 terminal (frozen
source/merge handoff current); the COMPLETE TASK-551 family terminal — parent
`✅ Done`, every physical descendant terminal, board/changelog synchronized —
with the exact TASK-551-02-L02/04-L02/05-L01 export-owner leaves present. The
current-state verification and dispatch-gate details are in the Complete
Terminal TASK-551 Family Gate section below.
**Pre-Bootstrap Gate:** the landed TASK-548 parent literal
overlap/serialization table must verify before the bounded workflow-infrastructure bootstrap, and
the complete terminal TASK-551 family gate (parent `✅ Done`, every physical
descendant terminal, current board/changelog synchronized, changelog 1263
present and valid, current required exports/contracts, current task files and
no unresolved drift — all verified by
`deriveAndVerifyTask551CurrentTerminalStateV1` on the CURRENT HEAD; no
expected-HEAD receipt and no unique historical commit/hash authority — and
every consumed export-owner leaf present — TASK-551-02-L02,
TASK-551-04-L02 and TASK-551-05-L01) must pass before either bootstrap mode or
any TASK-548-01-L03 dispatch; the current `⏳ To Do` TASK-551 state blocks
dispatch. The
committed bootstrap and a complete fresh authoring-audit round with all results
and cross-file reconcile are product-dispatch gates, not cyclic parent
dependencies; affected scopes repeat only after verified findings/changes.
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Own reproducible author, audit, implementation, fix, post-audit, and smoke
orchestration. This child writes tracked workflow wrappers/contracts/tests and
returns bounded in-process gate outcomes to 07; all product, product-test, docs,
canonical evidence, task-board, status and changelog edits remain with 01..07
single writers.

Product implementation begins only after the bounded workflow-infrastructure
bootstrap, one complete fresh authoring-audit round, and a fresh reconcile
report with zero HIGH/MEDIUM drift. Verified findings are fixed and only their
affected scopes/reconcile are rerun. The bootstrap is the sole pre-authoring-audit
implementation exception; it grants no product/source or status-write authority.
Missing, timed-out, malformed, or unparseable agent output fails the round; it
never creates a clean pass.

The current local/provisional TASK-548 authoring helper and any evidence it
produced before TASK-545 reaches `✅ Done` are non-authorizing research only.
It cannot be promoted by tracking its current ignored bytes. After both
dependency gates and the landed parent amendment, rebuild all six exact files
below against the tracked TASK-545 drivers and run only their pre-commit gates,
then hand their exact reviewed bytes to the owner for checkpoint/commit. Run the
separate post-commit tracked/HEAD-parity/clean-worktree gates from the resulting
new HEAD. Only that complete round plus any finding-driven affected-scope
reruns after the post-commit pass may authorize product implementation. These
are mutually exclusive modes:
`task548-bootstrap-build` must end after the owner checkpoint, while only a new
`task548-bootstrap-committed-resume` may validate the commit and continue; the
resume mode never rebuilds or reruns pre-commit gates.

## Complete Terminal TASK-551 Family Gate

Both bootstrap modes (`task548-bootstrap-build` AND
`task548-bootstrap-committed-resume`) and the immediate pre-01-L03 dispatch
gate (the first `01-L03` label in `TASK_548_FOUNDATION_EXECUTION_ORDER`) MUST
derive and verify the CURRENT terminal TASK-551 state with this child's
`deriveAndVerifyTask551CurrentTerminalStateV1` (below) fresh from the current
HEAD and working tree — the parent
`_docs/_TASKS/TASK-551_Scalable_Database_Query_And_Cache_Optimization.md` plus
every physical descendant file, discovered from the current tree, never from a
stale receipt, a cached list, or any unique historical commit — and require ALL
of the following before passing:

1. the TASK-551 parent status is exactly `✅ Done`;
2. every physical TASK-551 descendant is terminal (`✅ Done`,
   `⏭️ Superseded`, or `❌ Cancelled` — never `⏳ To Do`/`🚧 In Progress`);
3. the board (`_docs/_TASKS/README.md` rows and statistics) and changelog
   (`_docs/_CHANGELOG/README.md` plus the TASK-551 changelog 1263 entry) are
   synchronized with those terminal statuses on the CURRENT HEAD;
4. the changelog 1263 path is present and valid: exactly one current-tree path
   matches
   `_docs/_CHANGELOG/1263-YYYY-MM-DD-task-551-scalable-database-query-and-cache-optimization.md`
   (one regular file; zero or >1 matches block), the entry is parseable,
   terminal-bound and consistent with the current terminal statuses. The atomic
   commit shape that introduced 1263 may be noted operationally, but NO unique
   historical commit/hash (ADD commit, ancestor relation, or byte identity
   against a closure commit) is a product gate — the authority is the CURRENT
   state on the current HEAD. The complete 38-file TASK-551 graph is
   enumerated independently in the current tree (filesystem `readdir` of
   regular files directly under `_docs/_TASKS`, exact basename regex
   `^TASK-551(?:_|-).+\.md$`, sorted, exactly 38, and every match tracked via
   `git ls-files --error-unmatch` — an untracked matching file fails), that
   graph proves parent `✅ Done`/all descendants terminal with matching
   board/changelog index semantics, and the CURRENT task-file bytes are
   internally consistent with those terminal statuses;
5. every consumed export-owner leaf is present and tracked on the CURRENT HEAD:
   `TASK-551-02-L02` (dedicated-session API), `TASK-551-04-L02`
   (`docsDbRetriever.ts`/`assistantDocsCandidateQuery.ts` handoff) and
   `TASK-551-05-L01` (`SEARCH_VECTOR_SQL` expressions), matching the exact
   serialized-handoff receipts TASK-548-01-L03 consumes; and
6. there is no unresolved drift: current board/changelog semantic re-read
   matches the terminal statuses of the verified 38 files, and no
   uncommitted/post-terminal mutation of any TASK-551 task file or the 1263
   entry exists that would contradict the terminal state.

Any failure — including the current `⏳ To Do` TASK-551 parent, a single
non-terminal descendant, an out-of-sync board/changelog, a missing or
duplicate changelog 1263 path, an invalid/untracked/missing 38-file graph
member (an untracked matching file fails the `git ls-files --error-unmatch`
check), a zero-path or
unparseable discovery result, a graph or terminal-status mismatch, a
contradictory current board/changelog semantic re-read, or a missing
export-owner leaf — blocks the bootstrap mode and the
pre-01-L03
dispatch gate with a bounded structured result; the gate never substitutes a
stale receipt, a count-only check, an earlier HEAD, a unique historical
commit/hash, or any external
receipt/sidecar authority for the fresh current-state derivation. The
TASK-545 (`✅ Done`) and frozen TASK-547 terminal gates are preserved and run
independently of this gate; no gate weakens the other.
In `task548-bootstrap-committed-resume`, the gate is additionally required as
the FINAL gate: it repeats fresh AFTER the exact single-parent/HEAD, clean-tree,
checkpoint and `git show` byte-parity validation, immediately before the
authoring audit that authorizes 01-L03 dispatch; the pre-validation run is
defense in depth only and can never substitute for that final gate.

### `deriveAndVerifyTask551CurrentTerminalStateV1` (current-state authority)

This child owns one executable helper that derives and verifies the CURRENT
terminal TASK-551 state from the current HEAD and working tree — no
expected-HEAD receipt, checkpoint, sidecar, unique historical commit/hash, or
other external authority exists or is read. Its
38-file graph discovery is independent and executable: the
current tree is enumerated with filesystem `readdir` of regular files under
`_docs/_TASKS` (exact basename regex `^TASK-551(?:_|-).+\.md$`, sorted,
exactly 38, every match tracked via `git ls-files --error-unmatch`); no shell
glob expansion or pathspec that can return empty silently is used:

```ts
async function deriveAndVerifyTask551CurrentTerminalStateV1(): Promise<Readonly<{
  pass: true;
  task551Paths: readonly string[]; // the exact 38 current paths, sorted
  changelogPath: string; // the single matching 1263 path in the current tree
}>> {
  // 1. Exactly one current-tree path matches the strict changelog shape
  //    `_docs/_CHANGELOG/1263-YYYY-MM-DD-task-551-scalable-database-query-and-
  //    cache-optimization.md` (one regular file; zero or >1 matches block).
  //    The entry must be parseable and terminal-bound. The atomic commit
  //    shape that introduced 1263 is noted operationally only; NO unique
  //    historical commit/hash is a product gate.
  const changelogPath = await requireExactlyOneTask551Changelog1263Path();
  await requireValidTerminalBoundTask551Changelog1263(changelogPath);
  // 2. CURRENT-TREE graph discovery is independent and executable:
  //    `readdir` the regular files directly under `_docs/_TASKS` (no
  //    recursion, no shell glob, no pathspec), keep exactly the basenames
  //    matching `^TASK-551(?:_|-).+\.md$`, and sort; exactly 38 must match
  //    (the parent `TASK-551_Scalable_Database_Query_And_Cache_Optimization.md`
  //    plus 37 physical descendants (11 children + 26 executable leaves,
  //    including `TASK-551-05-L03`); any other count blocks) and EVERY
  //    matching path must be tracked — `git ls-files --error-unmatch <path>`
  //    per path, so an untracked matching file fails. A zero-path result
  //    (empty readdir, unreadable directory or parse failure) is a hard
  //    block, never an empty pass.
  const task551Paths = await requireExactCurrentTask551GraphFromReaddir();
  // 3. From the CURRENT bytes prove: parent status exactly `✅ Done`, every
  //    descendant terminal (`✅ Done` | `⏭️ Superseded` | `❌ Cancelled`), and
  //    matching board/changelog index semantics on the current HEAD
  //    (`_docs/_TASKS/README.md` row/statistics and
  //    `_docs/_CHANGELOG/README.md` 1263 row/next-free pointer consistent with
  //    those terminal statuses).
  await requireCurrentTerminalGraphAndIndexSemanticsV1(task551Paths, changelogPath);
  // 4. Re-read the CURRENT board/changelog semantically: the
  //    `_docs/_TASKS/README.md` row/statistics and
  //    `_docs/_CHANGELOG/README.md` 1263 index row/pointer in the working tree
  //    must match the terminal statuses of the 38 verified files, and no
  //    uncommitted/post-terminal mutation contradicts the terminal state
  //    (no unresolved drift).
  await requireCurrentBoardAndChangelogSemantics(task551Paths, changelogPath);
  return { pass: true, task551Paths, changelogPath };
}
```

Both bootstrap modes and the immediate pre-01-L03 dispatch gate call this
helper (plus the exact export-owner-leaf membership check of item 5) and block
on any missing/duplicate 1263 path, invalid/untracked 38-file graph member,
zero-path discovery
result, non-terminal status, graph mismatch, contradictory current
board/changelog semantics, or unresolved drift. The helper derives
the current terminal TASK-551 state from the CURRENT HEAD only — there is no
expected-HEAD receipt, no unique historical changelog-1263 ADD commit, and no
external receipt/sidecar authority.

## Exclusive Ownership and Collision Guards

- `_docs/_workflows/lib/task-548-contract.mjs`;
- `_docs/_workflows/task-548-author-audit.mjs`;
- `_docs/_workflows/task-548-fix.mjs`;
- `_docs/_workflows/task-548-implement.mjs`;
- `tests/unit/workflows/task548AuthorAudit.test.ts`;
- `tests/unit/workflows/task548WorkflowContracts.test.ts`.

The pre-authoring authorization order is exactly:

1. require TASK-545 to be exactly `✅ Done`;
2. require the complete terminal TASK-551 family gate (see the Complete
   Terminal TASK-551 Family Gate section): call
   `deriveAndVerifyTask551CurrentTerminalStateV1` — verify the CURRENT HEAD
   state: parent `✅ Done`, every descendant terminal, the
   board/changelog synchronized, changelog 1263 present and valid, current task
   files and required exports/contracts, and no unresolved drift (no
   expected-HEAD receipt and no unique historical commit/hash authority), and
   the exact TASK-551-02-L02/04-L02/05-L01 export-owner leaves present; the
   current `⏳ To Do` state blocks dispatch;
3. require terminal TASK-547 source `a13d186167a05901e644bf1a3a7aefee6f780471`
   through merge `963733cae23456622bea1eef1b734723aaab2350`;
4. require the landed TASK-548 parent handoff with every literal TASK-547
   overlap, serialized owner, and matching forbidden-path guard to remain exact;
5. select only `task548-bootstrap-build` and use the sole bounded pre-audit
   exception to rebuild only the six paths above,
   importing the tracked TASK-545 owners; before any owner checkpoint/commit,
   require only the exact six-file write set and forbidden-path gate, Node
   syntax checks, targeted workflow tests, line counts, and `git diff --check`;
6. hand the strict bounded TASK-548/schema/resume-mode checkpoint owner action,
   prior 40-hex HEAD, exact six sorted path/SHA-256 records, canonical aggregate,
   base64url checkpoint/hash and authoritative resume argv to the owner; only the
   owner stages and commits exactly those six paths; return immediately;
7. in a new invocation select only `task548-bootstrap-committed-resume`, strictly
   decode and timing-safe verify its current-process checkpoint, then require the
   new HEAD to be one exact single-parent commit over its recorded prior HEAD with
   the exact six-path diff,
   `git ls-files --error-unmatch` for all six paths, clean status and unstaged/
   staged diffs, `git show HEAD:<path>` byte parity for every path, and the
   clean-checkout/worktree tests; none of these post-commit gates may be required
   of the uncommitted rebuild; this mode cannot call rebuild/pre-commit helpers;
   the complete terminal TASK-551 family gate must be repeated FRESH via
   `deriveAndVerifyTask551CurrentTerminalStateV1` (step 2)
   after the exact HEAD/clean-tree/checkpoint/byte-parity validation above,
   immediately before the authoring audit that authorizes 01-L03 dispatch — the
   early step-2 run before checkpoint/HEAD validation is defense in depth only
   and can never be the required final gate;
8. only after that complete post-commit gate passes, run one complete fresh
   authoring-audit round with every required per-file result and one fresh
   reconcile; fix verified HIGH/MEDIUM findings and rerun only affected scopes
   plus reconcile until zero unresolved HIGH/MEDIUM remain;
   and
9. authorize only then the unchanged product implementation order
   `01 → 02 → 03 → 04 → 05 → 06 → 07`, while these wrappers orchestrate
   throughout; the immediate pre-01-L03 dispatch gate re-runs
   `deriveAndVerifyTask551CurrentTerminalStateV1` fresh before dispatching the
   `01-L03` label.

TASK-548-08 remains `⏳ To Do` during bootstrap. The exception cannot edit any
01..07 product/source/test path, task contract, product/developer documentation,
changelog, status, or evidence byte and cannot dispatch product implementation.
Any later change to one of the six bootstrap artifacts, any TASK-548 task
contract, or an imported TASK-545 driver invalidates every audit receipt whose
inputs changed. A contract-wide change requires one new complete round; a
scoped finding fix reruns only affected scopes plus reconcile.

The checkpoint is capped at 16,384 decoded bytes and encoded as canonical
unpadded base64url JSON. Strict schemas reject unknown/missing fields, duplicate
arguments/records/paths, unsorted or non-exact paths, malformed hashes/mode/task,
non-canonical transport, aggregate/hash mismatch, and a stale prior HEAD. Only
committed-resume decodes it; build emits the exact owner action and terminates.

Every 01..07 source/test/docs/task/changelog/screenshot path is forbidden.
Scripts may dispatch scoped writers but never mutate those files directly.
Only 07-L01 writes changelog 1261, closeout, the canonical manifest, and exactly
eight acceptance screenshots; TASK-545 `createResumeCheckpoint` phase 1 alone
writes `resume-checkpoint.json`. 08 verifies their receipt/hashes read-only and
returns bounded structured round/post-audit outcomes for current-process gating
plus the first-attempt post-resume structured final-drift result. No pre-pause
agent/runtime payload is claimed to survive either the release action or the
checkpoint owner action. Fresh release-resume authority comes only from its
strict current-process CLI fields plus revalidated committed HEAD/tree and
immutable release/deployment receipts. Post-resume closeout
uses only verified checkpoint identity/frozen revision/closure contract,
canonical report/manifest/eight screenshots, deterministic current frozen on-disk
product/task facts and durable repository receipts, and the existing
non-authorizing planning-audit record. It never reconstructs historical
authoring/post-audit, page-error, network, bundle/health, or cleanup outcomes
and never serializes dynamic final-drift findings/resolutions. None of these
values extend TASK-545 manifest/checkpoint schemas or create a standalone
evidence file. There is no separate 08 evidence tree. The only canonical
TASK-548 evidence directory is
`_docs/_workflows/_smoke/evidence/task-548/task-548-certification/`, with the
split byte ownership defined above.

Only during step 5 above may the four task-specific workflow modules and both
exact tests be created. Before the authoring audit, they must be committed,
tracked, byte-identical to `HEAD`, and present after a clean checkout.
`.gitignore` is never a reason to depend on an untracked local helper, ignored
test fixture, or workflow script. The provisional helper is a research input
only: it must be rebuilt as part of the exact six-file set and cannot be
promoted or authorize a run by merely adding its existing bytes. The wrappers
import the tracked TASK-545 shared contracts rather than copying count-only
logic:

```text
_docs/_workflows/lib/workflow-contracts.mjs
_docs/_workflows/lib/audit-rounds.mjs
_docs/_workflows/lib/post-audit.mjs
_docs/_workflows/smoke-evidence.schema.json
_docs/_workflows/smoke-evidence-checkpoint.schema.json
_docs/_workflows/lib/smoke-evidence.mjs
_docs/_workflows/lib/smoke-evidence.d.mts
tests/unit/workflows/workflowContracts.test.ts
tests/unit/workflows/auditRounds.test.ts
tests/unit/workflows/postAudit.test.ts
tests/unit/workflows/workflowStaticContract.test.ts
tests/unit/workflows/smokeEvidence.test.ts
```

The wrappers call the exact owner exports `requireAllResults`,
`runCanonicalAuditRounds`, `runCanonicalPostAudit`,
`createResumeCheckpoint`, `openWorkflowClosureResume`, and
`validateMetadataOnlyClosureDelta`, plus `VerifiedTask545Checkpoint`,
`Task545ClosureIdentity`, `VerifiedTask545MetadataRecoveryDelta`, and the typed
resume union. Both closure branches import and call
`writeOrResumeOrderedDurableChangelogFileThenIndexV1` directly with literal
`ordered-durable-changelog-file-then-index@v1`; no TASK-548 alias may mediate it.
Missing/untracked owner modules/tests,
any TASK-545 status other than `✅ Done`, or a local substitute blocks before
dispatch.

Before dispatch, verify the parent still carries the frozen terminal TASK-547/
TASK-552 identity and every literal final overlapping user/developer/shared-doc
path, then enforce its serialized single writer.
In particular, 07 cannot concurrently share
`_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/CMS_API.md`,
`_docs/ARCHITECTURE.md`, or `_docs/SECURITY_SPEC.md` with TASK-547.
Ambiguous, wildcard, missing, or concurrent ownership blocks.

## Canonical Authoring Audit Contract

The initial complete pass executes, in order:

1. fingerprint the exact task-file set, HEAD, and relevant dirty-worktree scope;
2. dispatch one parallel job set containing one fresh-context read-only audit
   per task file plus exactly one fresh cross-subtask reconcile; the reconcile
   independently reads the same on-disk contract and never consumes per-file
   agent results;
3. call `requireAllResults` once for the complete trusted identity set containing
   every `file:<repo-relative-path>` identity plus `reconcile`;
4. fingerprint again, reject any revision change, then verify and classify every
   structured finding against current files/diff;
5. when verified HIGH/MEDIUM findings exist, dispatch scoped per-file fixers
   plus one cross-file fixer only where required and capture the exact changed
   task-file identities;
6. return a bounded structured pass result including HEAD and dirty-worktree scope,
   used only for current-process authorization. It is never claimed to survive
   owner pause, persisted for closeout, added to the manifest/checkpoint, or
   written as a separate evidence file.

A complete pass with all expected results and zero HIGH/MEDIUM findings may
authorize implementation immediately. A fix invalidates the affected results;
the next pass fingerprints fresh bytes, reruns only the exact changed per-file
scopes, and includes one fresh reconcile over those changed files plus the
shared cross-subtask matrix. It again calls `requireAllResults` for that exact
affected identity set. Unchanged clean per-file scopes are not replayed for
ceremony, and there is no minimum round count or standalone reconcile that
bypasses the shared driver. An empty/unknown changed-scope set or missing result
fails closed.

## Pre-TASK-545 Planning-Audit History (Non-authorizing)

**Window / rerun state:** 2026-07-23–24; awaiting the mandatory fresh post-TASK-545 rerun.

**Observed HEAD checkpoints:** `d3286d6a` → `2a82d460` → `7af0fc62` → `e168df0e` → `9d439824` → `7a4665f0` → `741f61a8` → `ef2578f8` → `33e1c0e0` (the final value remained current while this record was written).

**Scope:** 26 TASK-548 files (1 parent + 8 children + 17 executable leaves), pinned changelog 1261, and the minimal TASK-545 dependency amendments. Concurrent TASK-539 work and owner notes `1.md`/`2.md`/`3.md` were preserved and excluded whenever present.

**Rounds 1–4:** established the strict corpus, visual, Help/Guide, portal, release, migration, closure and ownership foundations.
**Round 5:** corrected atomic loader/targets/release/migration contracts and made TASK-545/TASK-547/bootstrap blockers explicit.
**Round 6:** fixed identity, durable publication, `sourceHash`, CLI, preview, portal, baseline, coverage and closure drift.
**Round 7:** fixed localized paths, preparing states, validators/scripts/Docker, wildcard scope, portal/release and TASK-545 integration.
**Rounds 8–9:** verified and repaired respectively `2 HIGH + 4 MEDIUM` and `2 HIGH + 2 MEDIUM` findings.
**Round 10 family / final planning pass:** repaired promotion leases, CI recovery, parsers, reindex, DB-only Guide, path-free projections/hydration/client assets, Cloudflare publication, same-handle loaders, workflow recovery, release-tree binding, restartable per-source migration and durable artifact/coverage pairs; the last parallel pass reported `5 HIGH + 14 MEDIUM + 4 LOW`, all were repaired and locally rechecked after subagent quota exhaustion. This record and any ignored helper remain planning evidence only, not a canonical TASK-545 round result.
**Implementation authorization:** none. TASK-545 is still `⏳ To Do`;
the complete terminal TASK-551 family gate (parent `✅ Done`, every physical
descendant terminal, current board/changelog synchronized, changelog 1263
present and valid, current task files and no unresolved drift verified by
`deriveAndVerifyTask551CurrentTerminalStateV1`, exact
02-L02/04-L02/05-L01 export-owner leaves),
TASK-547 terminal/literal-overlap amendment, the tracked exact-six bootstrap,
and one complete fresh canonical shared-driver round with all results plus
reconcile on unchanged bytes remain mandatory. The future workflow never
rewrites this history or infers missing structured results from it.

## Cross-Subtask Reconcile Matrix

- exclusive writer paths, forbidden paths, changelog 1261 and the exact
  execution constant below; generated-artifact-only invocations of the
  already-landed compiler CLI do not transfer ownership
  or change TASK-548 status;
- exact discriminator, shared types/enums, stable IDs, targets and present-only rules;
- generated bundle/assets, renderer imports, Admin helpers, portal/release paths;
- shared permission/locale/version semantics, error codes, clamp/budget limits,
  hash algorithms and deterministic ordering;
- exact helper names defined by owners and consumed downstream;
- scenario/receipt/coverage identities, promised test filenames and commands;
- TASK-547 guide-path serialization and TASK-545 workflow-harness dependency;
- closure ownership, acceptance scenario order and screenshot/evidence paths.

```js
export const TASK_548_BOOTSTRAP_MODES = Object.freeze([
  "task548-bootstrap-build",
  "task548-bootstrap-committed-resume",
]);
// Mutually exclusive deploy-gated phase-resume modes; each verifies exact
// committed/deployed bytes plus the exact persisted DB cutover state before
// any further dispatch and never trusts prior-process memory.
export const TASK_548_PHASE_RESUME_MODES = Object.freeze([
  "task548-foundation-migration-resume",
  "task548-consumer-cutover-resume",
]);
// Discriminated execution-step contract: every phase-order member is either a
// real implemented LEAF label or a GENERATED-GATE. Generated gates are never
// implemented leaves: they carry an explicit already-landed compiler CLI
// invocation (the exact `bun scripts/docs/compile-corpus.ts` command), an
// exact generated-only write set (the generated bundle/report pair only), a
// clean human-authored tree invariant (zero human-authored source/task/status/
// docs/changelog/evidence bytes changed), their own handlers and their own
// gate. They are dispatched by the same sequential executor through the
// generated-gate handler and are NEVER listed in `implementedLeaves` or
// counted as leaves.
export type Task548ExecutionStepV1 =
  | Readonly<{ kind: "leaf"; label: string }>
  | Readonly<{
      kind: "generated-gate";
      label: string;
      invoke: "bun scripts/docs/compile-corpus.ts --write";
      generatedOnlyWriteSet: readonly string[]; // exact generated paths, e.g.
        // ["core/generated/docs/coderso-docs-v2.json",
        //  ".tmp/docs-corpus/migration-report-v1.json" (ignored pair member)]
      requireCleanHumanAuthoredTree: true; // proven before and after the gate
      handler: "runGeneratedArtifactOnlyCompilerInvocationV1";
      gate: "requireGeneratedGateAllPassV1";
    }>;
// Leaf-only projection: filters `kind === "leaf"` steps and returns their
// labels. `implementedLeaves` in every checkpoint/owner action uses ONLY this
// projection; generated-gate labels never appear in an implemented-leaves
// tuple, inventory, or count.
function implementedLeafLabels(
  order: readonly Task548ExecutionStepV1[]
): readonly string[]; // exact order-preserving leaf labels
async function implementSequentiallyWithPerLeafGates(
  order: readonly Task548ExecutionStepV1[],
  options?: Readonly<{
    beforeLabel: Readonly<Record<string, () => Promise<void>>>;
  }>
): Promise<void>; // dispatches leaf steps through the owning leaf handler and
  // generated-gate steps through `runGeneratedArtifactOnlyCompilerInvocationV1`
  // (with `requireGeneratedGateAllPassV1`), proving the clean
  // human-authored-tree invariant before and after every generated-gate step
// Implementation is dispatched in three deploy-gated phases. Each phase ends
// at a strict owner commit/merge/deploy pause and is resumed only by a fresh,
// mutually exclusive mode that verifies exact committed/deployed bytes and the
// exact persisted DB cutover state before any further dispatch. No phase
// trusts prior-process memory; every resume validates strict
// checkpoint/HEAD/deployment/state inputs.
export const TASK_548_FOUNDATION_EXECUTION_ORDER = Object.freeze([
  { kind: "leaf", label: "01-L01" },
  { kind: "leaf", label: "01-L02" },
  { kind: "leaf", label: "01-L03" },
] as const satisfies readonly Task548ExecutionStepV1[]);
// Physical acyclic order: TASK-548-02-L02 owns ALL dependency-bearing
// toolchain bytes (root/core package manifests, root bun.lock, Dockerfile, all
// three documentation workspace manifests, root docs scripts, exact root
// devDependency pins `@playwright/cli: 0.1.18`/`pixelmatch: 7.2.0`, the one
// lock-producing `bun install --lockfile-only` reconciliation plus the
// separate `bun install --frozen-lockfile` verification, the
// repo-local-only dispatcher resolver and the Chromium install/verify) and
// lands/gates terminally BEFORE its pilots. TASK-548-02-L03 is one normal
// post-pilot leaf that consumes those bytes read-only and owns only the
// staleness/diff/recovery/CI implementation, PR workflow and focused tests.
// The `post-pilot-generated-bundle-refresh-gate` is a GENERATED-GATE step: a
// generated-artifact-only invocation of the already-landed compiler CLI (no
// agent writer, no human-authored source/task/status edit, its own gate) after
// 02-L02's pilots and before 02-L03; it is never an implemented leaf.
export const TASK_548_FACADE_EXECUTION_ORDER = Object.freeze([
  { kind: "leaf", label: "02-L01" },
  { kind: "leaf", label: "02-L02" },
  { kind: "generated-gate", label: "post-pilot-generated-bundle-refresh-gate",
    invoke: "bun scripts/docs/compile-corpus.ts --write",
    generatedOnlyWriteSet: [
      "core/generated/docs/coderso-docs-v2.json",
      ".tmp/docs-corpus/migration-report-v1.json",
    ],
    requireCleanHumanAuthoredTree: true,
    handler: "runGeneratedArtifactOnlyCompilerInvocationV1",
    gate: "requireGeneratedGateAllPassV1" },
  { kind: "leaf", label: "02-L03" },
  { kind: "leaf", label: "03-L01" },
  { kind: "leaf", label: "03-L02" },
  { kind: "leaf", label: "03-L03" },
] as const satisfies readonly Task548ExecutionStepV1[]);
export const TASK_548_CONSUMER_CUTOVER_EXECUTION_ORDER = Object.freeze([
  { kind: "leaf", label: "04-L01" },
  { kind: "leaf", label: "04-L02" },
  { kind: "leaf", label: "04-L03" },
  { kind: "leaf", label: "05-L01" },
  { kind: "leaf", label: "05-L02" },
  { kind: "leaf", label: "06-L01" },
  { kind: "generated-gate", label: "final-native-corpus-generated-bundle-handback-gate",
    invoke: "bun scripts/docs/compile-corpus.ts --write",
    generatedOnlyWriteSet: [
      "core/generated/docs/coderso-docs-v2.json",
      ".tmp/docs-corpus/migration-report-v1.json",
    ],
    requireCleanHumanAuthoredTree: true,
    handler: "runGeneratedArtifactOnlyCompilerInvocationV1",
    gate: "requireGeneratedGateAllPassV1" },
  { kind: "leaf", label: "06-L02" },
] as const satisfies readonly Task548ExecutionStepV1[]);
export const TASK_548_RELEASE_PAUSE_ORDER = Object.freeze([
  "07-L01-release-inputs-and-prerelease-gates",
  "08-prerelease-post-audit-lenses/fixes/revalidation",
  "07-L01-owner-commit-merge-release-branch-pause",
]);
export const TASK_548_RELEASE_RESUME_ORDER = Object.freeze([
  "07-L01-release-resume-committed-head-tree-and-receipt-validation",
  "08-release-resume-fresh-committed-head-drift-gate",
  "07-L01-runtime-docs-and-gates-preparation",
  "07-L01-final-smoke-phase1-owner-pause",
]);
export const TASK_548_CLOSURE_RESUME_ORDER = Object.freeze([
  "07-L01-owner-resume-tracked-parity",
  "08-final-read-only-drift",
  "07-L01-terminal-metadata-closeout-and-mechanical-delta-verification",
]);
```

The conditional retirement-restart invocation does not re-enter any phase order
array at its
beginning. After exact mode parsing, that invocation's complete dispatched order
ends at the owner release pause:

```text
07-L01-confirm-invalidated-checkpoint-retired
08-retirement-restart-fresh-current-tree-drift
derive-affected-owners-from-fresh-verified-findings
affected-owner-fixes-and-per-leaf-gates
07-L01-release-inputs-and-prerelease-gates
08-prerelease-post-audit-lenses/fixes/revalidation
07-L01-owner-commit-merge-release-branch-pause
```

That process terminates. Only after the owner creates the replacement release
may a separately parsed `task548-release-resume` run this distinct order:

```text
07-L01-release-resume-committed-head-tree-and-receipt-validation
08-release-resume-fresh-committed-head-drift-gate
07-L01-runtime-docs-and-gates-preparation
07-L01-final-smoke-phase1-owner-pause
```

There is exactly one post-pilot generated-bundle refresh after 02-L02's five
pilots and before 02-L03/TASK-548-03, and exactly one final native-corpus
generated-bundle handback after
06-L01 and before 06-L02 — both are generated-artifact-only invocations of the
already-landed compiler CLI (no agent writer, no human-authored source/task/
status edit, each with its own gate). All seven normal-path 07 labels and both conditional
checkpoint-retirement labels invoke the same physical 07-L01 owner, which
remains the only status/changelog writer and stays open until its terminal
metadata phase. Implementation runs in three deploy-gated phases. The initial
committed-bootstrap implementation dispatches ONLY the foundation order
(`TASK_548_FOUNDATION_EXECUTION_ORDER`), gates it, and ends at the 08-created
foundation owner action (`commit_merge_deploy_task548_foundation`); the
foundation phase never dispatches 02/03/04/05/06/07. A fresh, mutually
exclusive `task548-foundation-migration-resume` verifies the exact
committed/deployed foundation bytes (HEAD/clean-tree/checkpoint byte parity)
and the DB cutover state EXACTLY `shadow_parity_clean` (the operator freeze →
backfill → shadow-parity sequence happened under 01-L03), reruns the
current-tree audit, then dispatches ONLY the facade order
(`TASK_548_FACADE_EXECUTION_ORDER`), gates it, and ends at the 08-created
facade owner action (`commit_merge_deploy_task548_era_aware_facade`) while the
pointer stays V1. A fresh, mutually exclusive `task548-consumer-cutover-resume`
verifies the exact facade deployment, the persisted rollout receipt for that
build, every consumer ready, and the DB cutover state EXACTLY `v2_activated`
with the active pointer era EXACTLY `v2` (`v2_activated` atomically switches
the active pointer to V2),
reruns a current-tree read-only drift, then dispatches ONLY the consumer
cutover order (`TASK_548_CONSUMER_CUTOVER_EXECUTION_ORDER`) followed by the
prerelease post-audit and the final owner release pause
(`TASK_548_RELEASE_PAUSE_ORDER`). The 03-L03 facade dispatch gate is EXACTLY
`shadow_parity_clean` — never merely at/past `backfill_complete`. No phase
trusts prior-process memory: every resume revalidates strict
checkpoint/HEAD/deployment/state inputs and rejects stale or missing evidence.
Only an independently parsed fresh release-resume may
run its four labels, and that process ends at the evidence/checkpoint pause.
Only a separately parsed TASK-545 closure resume may run its three labels.
No result or object crosses either process boundary as authority.
`08-final-read-only-drift` is substantive and runs
after checkpoint-bound owner resume/tracked parity but before any terminal
status or changelog mutation. The final 07 phase then persists the bounded,
deterministic closeout, closes descendants before parents, and performs only
TASK-545's mechanical metadata-delta validation after the terminal writes.
The closure-resume labels describe the first `frozen` closure attempt. A
final-drift non-pass adds only the retirement-pause/confirmation exception
defined below. The returned restart argv selects a mutually exclusive
retirement-restart invocation whose first workflow action is
`07-L01-confirm-invalidated-checkpoint-retired`. That invocation skips
dependency/bootstrap, authoring and the already-landed full implementation
sequence; after exact 11-path absence is confirmed, it runs only the affected
owner fixes derived from a new current-tree read-only drift, their gates, and
the complete prerelease-inputs→post-audit→owner-release pause. It never reads
old unserialized findings or retired evidence. A fresh release-resume validates
the replacement release before preparation/smoke/new phase 1. Before the first
canonical changelog write, replay remains `frozen` and repeats final drift. A
crash after no-replace changelog fsync may leave valid `file-only`; after index
CAS rename/fsync it is `both`. Recovery skips smoke/final drift, validates the
exact ordered prefix and completes missing writes idempotently. Neither generated-artifact-only compiler invocation
reopens or changes 01-L02 status.

## Implementation Pseudocode

```ts
import type { Task548PhasePayloadMapV1 } from "../../scripts/docs/task548ClosurePhases.ts"; // exact 07-L01 owner export
import type { DocsReleaseTreeBindingV1 } from "../../core/services/documentation/release/docsReleaseTreeBinding";
import {
  TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1,
  requireTask548CommittedSixPathBootstrapAuthorizationV1,
  type Task548CommittedBootstrapFileV1,
  type Task548CommittedBootstrapSixFilesV1,
  type Task548CommittedSixPathBootstrapReceiptV1,
} from "./lib/smoke-evidence.mjs";
// dispatchSamePhysical07L01<L extends keyof Task548PhasePayloadMapV1>
// takes (label: L, payload: Task548PhasePayloadMapV1[L]); never redeclare the map.
const TASK_548_08_BOOTSTRAP_PATHS =
  TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1;

const TASK_548_BOOTSTRAP_CHECKPOINT_MAX_BYTES = 16_384;
// Explicit bounded decoded-byte gate for the deploy-gated PHASE checkpoints.
// The exact unique normalized path-sorted regular-file SHA-256 inventory may be
// large, so the phase budget is 1 MiB of decoded bytes; canonical unpadded
// base64url/hash verification MUST enforce this bound (an oversized decoded
// checkpoint fails closed before any field is trusted).
const TASK_548_PHASE_CHECKPOINT_MAX_BYTES = 1_048_576;
type Task548BootstrapFileV1 = Task548CommittedBootstrapFileV1;
type Task548BootstrapSixFilesV1 = Task548CommittedBootstrapSixFilesV1;
type Task548BootstrapCheckpointV1 = Readonly<{
  schemaVersion: 1; taskId: "TASK-548";
  mode: "task548-bootstrap-committed-resume";
  priorHead: string; // exactly 40 lowercase hex
  files: Task548BootstrapSixFilesV1; // exact path-sorted constant membership
  aggregateSha256: string; // canonical JSON of priorHead + files
}>;
type Task548BootstrapOwnerActionRequired = Readonly<{
  pass: false; code: "owner_action_required";
  action: "commit_task548_bootstrap"; taskId: "TASK-548"; schemaVersion: 1;
  mode: "task548-bootstrap-committed-resume"; priorHead: string;
  files: Task548BootstrapSixFilesV1; aggregateSha256: string;
  checkpointBase64url: string; checkpointSha256: string;
  resumeArgv: readonly [
    "--mode", "task548-bootstrap-committed-resume",
    "--bootstrap-checkpoint", string,
    "--bootstrap-checkpoint-sha256", string
  ];
}>;

// Deploy-gated phase owner actions (08-created, like the bootstrap action;
// 07/08 never commit, merge, deploy, tag or release). Each resume mode is a
// fresh mutually exclusive invocation that verifies exact committed/deployed
// bytes and the exact persisted DB cutover state before any further dispatch;
// no phase trusts prior-process memory. An owner action is created BEFORE the
// owner commits, so it binds the lowercase PRE-OWNER `priorHead` plus the
// exact phase-file inventory and never invents the future owner HEAD.
type Task548PhaseFileRecordV1 = Readonly<{
  path: string; // exact repo-relative path from the exact unique normalized
                // path-sorted regular-file inventory
  sha256: string; // lowercase 64-hex SHA-256 of the gated file bytes
}>;
// Canonical unique sorted deterministic phase gate-receipt records: one
// record per implemented leaf per gate kind, canonical unique-key JSON, sorted
// deterministically, with NO timestamps or durations. `phaseGateSha256` is
// DERIVED from the canonical serialization of these exact records, so a fresh
// resume re-projects the same deterministic records and reproduces the digest.
// The gate-kind set is CLOSED; an unknown/missing kind fails. Every record
// carries the canonical underlying gate-receipt digest: SHA-256 over the
// canonical serializer bytes of the leaf's gate receipt for that exact
// (leaf, gateKind) invocation (no timestamps/durations/paths in the bytes).
export type Task548PhaseGateKindV1 =
  | "lint-types" | "lint" | "vitest" | "bun-test" | "line-count" | "security";
// Exact code-owned canonical aggregate-invocation identities, one per gate
// kind. The receipt binds the commandId of the AGGREGATE invocation actually
// run for that (leaf, gateKind), so a passing unrelated command (different
// argv/command surface) can never be rebound to the same leaf/gateKind record.
export const TASK_548_LEAF_GATE_COMMAND_IDS_V1: Readonly<
  Record<Task548PhaseGateKindV1, string>> = {
  "lint-types": "task548-gate:lint-types@v1",
  "lint": "task548-gate:lint@v1",
  "vitest": "task548-gate:vitest@v1",
  "bun-test": "task548-gate:bun-test@v1",
  "line-count": "task548-gate:line-count@v1",
  "security": "task548-gate:security@v1",
};
export type Task548LeafGateReceiptV1 = Readonly<{
  schema: "coderso.task548-leaf-gate-receipt@v1";
  leaf: string; // exact implemented-leaf label from the phase execution order
  gateKind: Task548PhaseGateKindV1;
  commandId: string; // exact code-owned aggregate-invocation identity from
    // `TASK_548_LEAF_GATE_COMMAND_IDS_V1[gateKind]`; a mismatch between the
    // command actually executed and the recorded commandId rejects, so an
    // unrelated passing command cannot be rebound to this (leaf, gateKind)
  exitCode: 0; // only a passed invocation produces a canonical receipt
  outputSha256: string; // lowercase 64-hex over the bounded sanitized output
}>;
export function serializeTask548LeafGateReceiptV1(
  receipt: Task548LeafGateReceiptV1): Uint8Array; // compact canonical JSON+LF
  // (binds leaf, gateKind, commandId, exitCode, outputSha256)
type Task548PhaseGateReceiptRecordV1 = Readonly<{
  leaf: string; // exact implemented-leaf label from the phase execution order
  gateKind: Task548PhaseGateKindV1; // closed union, never free-form string
  result: "pass" | "failed";
  receiptSha256: string; // lowercase 64-hex over the canonical
    // `serializeTask548LeafGateReceiptV1` bytes of that leaf gate receipt
}>;
function serializeCanonicalTask548PhaseGateRecordsV1(
  records: readonly Task548PhaseGateReceiptRecordV1[]
): Uint8Array; // compact canonical JSON+LF; unique (leaf, gateKind) keys; sorted
// ALL-PASS INVARIANT: the canonical serializer, the fresh-rerun projection and
// the phase-digest hash all FAIL CLOSED when any record has `result:
// "failed"` (or a missing/duplicate/unknown (leaf, gateKind) key, a non-zero
// underlying exit, or an unverifiable receiptSha256). Failed gate records can
// never contribute a phaseGateSha256, so a phase checkpoint/owner action that
// binds a gate digest is only creatable from an all-pass record set.
function projectFreshRerunTask548PhaseGateRecordsV1(
  order: readonly Task548ExecutionStepV1[]
): Promise<readonly Task548PhaseGateReceiptRecordV1[]>;
// deterministic fresh-rerun projection over the exact order; timestamps and
// durations are never part of a record
function hashCanonicalTask548PhaseGateRecordsV1(
  records: readonly Task548PhaseGateReceiptRecordV1[]
): string; // SHA-256 over serializeCanonicalTask548PhaseGateRecordsV1; throws on
             // any failed record (all-pass invariant)
function requireAllPassTask548PhaseGateRecordsV1(
  records: readonly Task548PhaseGateReceiptRecordV1[]): void; // fails closed on
  // any `failed` record; called before any checkpoint/owner-action binding
type Task548PhaseCheckpointFoundationV1 = Readonly<{
  schemaVersion: 1; taskId: "TASK-548";
  phase: "foundation";
  resumeMode: "task548-foundation-migration-resume";
  priorHead: string; // lowercase 40-hex PRE-OWNER HEAD; the future owner HEAD
                     // is never invented by the action
  files: readonly Task548PhaseFileRecordV1[]; // exact unique normalized
                                              // path-sorted regular-file
                                              // SHA-256 inventory
  implementedLeaves: readonly ["01-L01", "01-L02", "01-L03"];
  phaseTreeSha256: string; // canonical runtime-tree digest
  phaseGateRecords: readonly Task548PhaseGateReceiptRecordV1[]; // canonical
    // unique sorted deterministic per-leaf gate-receipt records
  phaseGateSha256: string; // SHA-256 over the canonical gate-record
                           // serialization; derived, never ambient
}>;
type Task548PhaseCheckpointFacadeV1 = Readonly<{
  schemaVersion: 1; taskId: "TASK-548";
  phase: "facade";
  resumeMode: "task548-consumer-cutover-resume";
  priorHead: string; // lowercase 40-hex pre-owner HEAD
  files: readonly Task548PhaseFileRecordV1[];
  implementedLeaves: readonly ["02-L01", "02-L02",
    "02-L03",
    "03-L01", "03-L02", "03-L03"]; // only leaf steps; generated gates are
    // never implemented leaves
  phaseTreeSha256: string;
  phaseGateRecords: readonly Task548PhaseGateReceiptRecordV1[];
  phaseGateSha256: string;
  cutoverStateAtDispatch: "shadow_parity_clean"; // gate, never merely
                                                 // at/past backfill_complete
  pointerEraAtDispatch: "v1"; // facade deploys while the pointer stays V1
}>;
type Task548PhaseCheckpointV1 =
  | Task548PhaseCheckpointFoundationV1
  | Task548PhaseCheckpointFacadeV1;
type Task548FoundationOwnerActionRequired = Readonly<{
  pass: false; code: "owner_action_required";
  action: "commit_merge_deploy_task548_foundation";
  taskId: "TASK-548"; schemaVersion: 1; phase: "foundation";
  priorHead: string; // lowercase 40-hex pre-owner HEAD; never the future
                     // owner HEAD
  files: readonly Task548PhaseFileRecordV1[]; // exact phase-file inventory
  implementedLeaves: readonly ["01-L01", "01-L02", "01-L03"];
  phaseTreeSha256: string; // canonical runtime-tree digest
  phaseGateRecords: readonly Task548PhaseGateReceiptRecordV1[];
  phaseGateSha256: string; // derived from the canonical gate-record serialization
  checkpointBase64url: string; // canonical unpadded base64url of the exact
                               // discriminated foundation checkpoint
  checkpointSha256: string; // 64-lowercase-hex over the canonical checkpoint
  resumeMode: "task548-foundation-migration-resume";
  requiredFutureResumeFields: readonly ["ownerHead", "deploymentIdentity",
    "servingBuildSha256", "cutoverState", "pointerEra", "dbFactsSha256"];
    // explicit names of the fields the fresh resume invocation supplies AFTER
    // the owner commit/deploy; the checkpoint and its hash are already action
    // fields and actual future values are never invented here
}>;
type Task548FacadeOwnerActionRequired = Readonly<{
  pass: false; code: "owner_action_required";
  action: "commit_merge_deploy_task548_era_aware_facade";
  taskId: "TASK-548"; schemaVersion: 1; phase: "facade";
  priorHead: string; // lowercase 40-hex pre-owner HEAD; never the future
                     // owner HEAD
  files: readonly Task548PhaseFileRecordV1[];
  implementedLeaves: readonly ["02-L01", "02-L02",
    "02-L03",
    "03-L01", "03-L02", "03-L03"]; // leaf steps only, never generated gates
  phaseTreeSha256: string;
  phaseGateRecords: readonly Task548PhaseGateReceiptRecordV1[];
  phaseGateSha256: string;
  cutoverStateAtDispatch: "shadow_parity_clean"; // gate, never merely
                                                 // at/past backfill_complete
  pointerEraAtDispatch: "v1"; // facade deploys while the pointer stays V1
  checkpointBase64url: string; // canonical unpadded base64url of the exact
                               // discriminated facade checkpoint
  checkpointSha256: string; // 64-lowercase-hex
  resumeMode: "task548-consumer-cutover-resume";
  requiredFutureResumeFields: readonly ["ownerHead", "deploymentIdentity",
    "servingBuildSha256", "rolloutReceiptSha256", "consumersReady",
    "cutoverState", "pointerEra", "dbFactsSha256"];
}>;
// Fresh resume union: carries checkpoint + hash, the ACTUAL ownerHead,
// authoritative deploymentIdentity, servingBuildSha256, the exact expected
// cutover state/pointer era, and dbFactsSha256 (recomputed, never trusted).
type Task548FoundationMigrationResumeRequestV1 = Readonly<{
  mode: "task548-foundation-migration-resume";
  checkpointBase64url: string; checkpointSha256: string; // decoded, hashed
    // and normalized FIRST; binds priorHead + exact files + tree/gate digests
  ownerHead: string; // ACTUAL owner commit HEAD; current clean HEAD must equal
                     // it and be exactly one direct child of
                     // checkpoint.priorHead (no merge, no extra commit)
  deploymentIdentity: string; // authoritative deployed migration-capable
                              // foundation build; metadata binds source
                              // HEAD/tree/build
  servingBuildSha256: string; // exact deployed foundation build
  cutoverState: "shadow_parity_clean"; // EXACT expected DB state: operator
                                       // freeze → backfill → parity happened
                                       // under 01-L03
  pointerEra: "v1"; // EXACT expected pointer era: the foundation deploys while
                    // the active pointer stays V1 (facade era, pre-activation)
  dbFactsSha256: string; // RECOMPUTED from one authoritative snapshot, never
                         // trusted as supplied
}>;
type Task548ConsumerCutoverResumeRequestV1 = Readonly<{
  mode: "task548-consumer-cutover-resume";
  checkpointBase64url: string; checkpointSha256: string; // decoded, hashed
    // and normalized FIRST
  ownerHead: string; // ACTUAL facade owner commit HEAD; one direct child of
                     // checkpoint.priorHead
  deploymentIdentity: string; // authoritative deployed facade build
  servingBuildSha256: string; // exact deployed facade build
  rolloutReceiptSha256: string; // persisted receipt for THAT build
  consumersReady: true; // every ASSISTANT_DOCS_V2_CONSUMER_IDS_V1 member
  cutoverState: "v2_activated"; // EXACT expected DB state
  pointerEra: "v2"; // EXACT expected pointer era: `v2_activated` atomically
                    // switches the active pointer to V2, so the consumer
                    // cutover resume requires era v2 — never v1
  dbFactsSha256: string; // RECOMPUTED from one authoritative snapshot
}>;

async function runTask548PrereleasePostAudit(initialPrerelease) {
  let prerelease = initialPrerelease;
  const result = await runCanonicalPostAudit({
    lenses: TASK_548_POST_AUDIT_LENSES,
    runLens: runFreshPostAuditLens,
    fix: async (blocking) => {
      const affectedOwners = await dispatchFixesToExactOwningLeaves(blocking);
      return {
        affectedLensKeys: deriveExactAffectedLensKeys(blocking),
        affectedOwners,
      };
    },
    validate: async (fixResult) => {
      await runAffectedTargetedGates(fixResult.affectedOwners);
      if (fixResult.affectedOwners.length > 0) prerelease = await dispatchSamePhysical07L01(
        "07-L01-release-inputs-and-prerelease-gates", {}
      );
    },
    fingerprint: fingerprintFinalTask548RuntimeTree,
    maximumFixPasses: 3,
    label: "TASK-548:prerelease-post-audit",
  });
  if (!result.pass) throw new Error("task548_prerelease_audit_not_converged");
  return { prerelease, postAudit: result };
}

// Parse this mode before every dependency/bootstrap/authoring/implementation,
// fix/gate/preparation/resume/checkpoint action. Modes cannot be mixed.
const invocation = readExactTask548InvocationModeFromCurrentProcess();
if (invocation.mode === "task548-release-resume") {
  const release = await dispatchSamePhysical07L01(
    "07-L01-release-resume-committed-head-tree-and-receipt-validation",
    { argv: invocation.argv }
  );
  const runtimeTree: DocsReleaseTreeBindingV1 = release.runtimeTree;
  const committedHeadDrift = await runFreshCommittedHeadDriftReadOnly({
    phase: "08-release-resume-fresh-committed-head-drift-gate",
    runtimeTree,
    receipts: release,
    forbidWritesAndFixes: true,
  });
  await requireZeroFindingCurrentHeadPass(committedHeadDrift, release);
  const preparation = await dispatchSamePhysical07L01(
    "07-L01-runtime-docs-and-gates-preparation",
    { release, committedHeadDrift }
  );
  const action = await dispatchSamePhysical07L01(
    "07-L01-final-smoke-phase1-owner-pause",
    { preparation }
  );
  await yieldOwnerActionRequired(action);
  return; // process ends; closure resume must be a separate invocation
}

if (invocation.mode === "task548-closure-resume") {
  const resumed = await dispatchSamePhysical07L01(
    "07-L01-owner-resume-tracked-parity",
    { argv: invocation.argv }
  );
  let closeoutInput;
  if (resumed.state === "frozen") {
    const finalDrift = await runFinalTask548DriftReadOnly({
      phase: "08-final-read-only-drift",
      frozenRuntimeRevision: resumed.checkpoint.frozenRuntime,
    });
    if (!finalDrift.pass || finalDrift.findings.length !== 0) {
      await abortResumeWithoutMetadataMutation();
      const retirement = await dispatchSamePhysical07L01(
        "07-L01-invalidated-checkpoint-owner-retirement-pause",
        { resume: resumed, finalDrift }
      );
      await yieldOwnerActionRequired(retirement);
      return;
    }
    closeoutInput = { resume: resumed, finalDrift };
  } else {
    closeoutInput = { resume: resumed };
  }
  const delta = await dispatchSamePhysical07L01(
    "07-L01-terminal-metadata-closeout-and-mechanical-delta-verification",
    closeoutInput
  );
  await handExactMetadataDeltaToOwner(delta);
  return; // the orchestrator emits exactly once; neither layer persists it
}

if (invocation.mode === "retirement-restart") {
  await requireExactMutuallyExclusiveRetirementRestartMode(invocation.argv, {
    forbidBootstrapAuthoringAndFullImplementationReplay: true,
    forbidFrozenOrMetadataRecoveryResume: true,
    forbidReleaseResume: true,
  });
  await dispatchSamePhysical07L01(
    "07-L01-confirm-invalidated-checkpoint-retired",
    { argv: invocation.argv }
  );
  const currentTreeDrift = await runFreshTask548CurrentTreeDriftReadOnly({
    phase: "08-retirement-restart-fresh-current-tree-drift",
    forbidRetiredEvidenceAccess: true,
    forbidPriorFinalDriftPayload: true,
  });
  await requireCompleteFreshRetirementDrift(currentTreeDrift);
  const affectedOwners =
    await deriveAffectedOwnersFromFreshVerifiedFindings(currentTreeDrift);
  await dispatchFreshRetirementDriftFixes(currentTreeDrift, affectedOwners);
  await runAffectedPerLeafGates(affectedOwners);
  const prerelease = await dispatchSamePhysical07L01(
    "07-L01-release-inputs-and-prerelease-gates", {}
  );
  const audited = await runTask548PrereleasePostAudit(prerelease);
  const releaseAction = await dispatchSamePhysical07L01(
    "07-L01-owner-commit-merge-release-branch-pause",
    { prerelease: audited.prerelease, postAudit: audited.postAudit }
  );
  await yieldOwnerActionRequired(releaseAction);
  // Owner reviews, commits and merges to the protected release branch and
  // waits for semantic-release (sole release authority); then a fresh
  // release-resume; no smoke in this process.
  return;
}

if (invocation.mode === "task548-foundation-migration-resume") {
  const request = parseExactTask548FoundationMigrationResumeRequest(
    invocation.argv
  );
  // 1. Decode, hash and normalize the canonical phase checkpoint FIRST (strict
  //    canonical unpadded base64url, timing-safe checkpoint SHA-256, reject
  //    unknown/missing/duplicate fields and a stale prior HEAD; the decoded
  //    byte bound `TASK_548_PHASE_CHECKPOINT_MAX_BYTES` (1 MiB) is enforced).
  //    The decoded checkpoint binds the lowercase pre-owner `priorHead`, the
  //    exact unique normalized path-sorted regular-file SHA-256 inventory, the
  //    foundation execution-order tuple, the phase tree digest and the phase
  //    gate digest.
  const checkpoint = await decodeAndVerifyTask548PhaseCheckpointV1({
    checkpointBase64url: request.checkpointBase64url,
    checkpointSha256: request.checkpointSha256,
    phase: "foundation",
    maxDecodedBytes: TASK_548_PHASE_CHECKPOINT_MAX_BYTES,
    requireCanonicalUnpaddedBase64url: true,
    timingSafeSha256Verification: true,
    rejectUnknownMissingDuplicateFields: true,
  });
  // 2. Verify the EXACT committed/deployed foundation bytes: the current clean
  //    HEAD equals the ACTUAL `ownerHead` and is exactly ONE direct child of
  //    checkpoint.priorHead (single parent, no merge and no extra commit) with
  //    the exact foundation write-set diff, `git ls-files --error-unmatch`
  //    for every foundation-owned path, clean status/unstaged/staged diffs, and
  //    `git show HEAD:<path>` byte parity.
  const foundation = await verifyExactCommittedDeployedFoundationV1({
    request, checkpoint,
    requireCleanHeadEqualsOwnerHead: true,
    requireExactlyOneDirectChildOfPriorHeadNoMergeNoExtraCommit: true,
  });
  // 3. Prove the exact changed path set equals checkpoint.files paths and the
  //    `git show` file hashes equal the checkpoint file records; then RECOMPUTE
  //    the phase tree digest AND re-project the canonical unique sorted
  //    deterministic phase gate-receipt records, recompute phaseGateSha256 from
  //    their canonical serialization, and require equality with
  //    checkpoint.phaseTreeSha256/phaseGateSha256 (never trust the recorded
  //    digests without recomputation).
  await requireExactPhaseChangedPathsAndGitShowFileHashesV1(foundation, checkpoint);
  await requireRecomputedPhaseTreeAndGateDigestsV1(foundation, checkpoint, {
    reprojectGateRecords: true,
    hashGateRecords: hashCanonicalTask548PhaseGateRecordsV1,
  });
  // 4. Verify the deployment metadata binds source HEAD/tree/build:
  //    request.deploymentIdentity and request.servingBuildSha256 must bind the
  //    verified ownerHead and phase tree digest; a mismatch blocks.
  await requireDeploymentMetadataBindsSourceHeadTreeBuildV1(request, foundation);
  // 5. Verify the exact persisted DB cutover state: read the authoritative
  //    cutover/pointer/snapshot/parity/ACL facts in ONE snapshot, RECOMPUTE
  //    rather than trust request.dbFactsSha256, require the cutover row EXACTLY
  //    `shadow_parity_clean` with exactly one complete prepared snapshot, the
  //    closed `legacy_acl_snapshot_id` binding and the recorded
  //    `shadowParityRunId`/`shadowParitySourceHash` (the operator freeze →
  //    backfill → shadow-parity sequence happened under 01-L03), and the active
  //    pointer era EXACTLY `v1` (the foundation/facade era is pre-activation),
  //    then RE-READ
  //    the revision/generation immediately before dispatch. Any other state —
  //    including merely `backfill_complete` — blocks before dispatch.
  await requireExactCutoverStateForFacadeDispatchV1(foundation, {
    request,
    exactState: "shadow_parity_clean",
    exactPointerEra: "v1",
    forbidMerelyBackfillComplete: true,
    recomputeDbFactsSha256: true,
    reReadRevisionAndGenerationBeforeDispatch: true,
  });
  // 6. Rerun the current-tree authoring/audit round and reconcile fresh from
  //    disk (never prior-process memory), then dispatch ONLY the facade order.
  const audit = await rerunCurrentTreeAuthoringAuditReadOnlyV1({
    phase: "task548-foundation-migration-resume",
  });
  await assertNoUnresolvedHighOrMediumFindings(audit);
  await implementSequentiallyWithPerLeafGates(
    TASK_548_FACADE_EXECUTION_ORDER,
    {
      beforeLabel: {
        "03-L03": requireExactCutoverStateForFacadeDispatchBefore03L03V1,
      },
    }
  );
  const phaseGateRecords = await projectFreshRerunTask548PhaseGateRecordsV1(
    TASK_548_FACADE_EXECUTION_ORDER
  );
  const facadeAction: Task548FacadeOwnerActionRequired =
    await createExactFacadeOwnerActionV1({
      priorHead: await requireLowercase40HexHead(),
      files: await inventoryExactPhaseFilesV1({
        implementedLeaves: implementedLeafLabels(TASK_548_FACADE_EXECUTION_ORDER),
        hash: "sha256",
      }),
      implementedLeaves: implementedLeafLabels(TASK_548_FACADE_EXECUTION_ORDER),
      phaseTreeSha256: await computeExactPhaseTreeDigestV1(),
      phaseGateRecords,
      phaseGateSha256: hashCanonicalTask548PhaseGateRecordsV1(phaseGateRecords),
      // all-pass invariant: `hashCanonicalTask548PhaseGateRecordsV1` already
      // throws on any failed record; the action validator below re-checks it
      cutoverStateAtDispatch: "shadow_parity_clean",
      pointerEraAtDispatch: "v1",
    });
  requireAllPassTask548PhaseGateRecordsV1(phaseGateRecords); // failed records
    // can never authorize a checkpoint/owner action
  await validateExactTask548FacadeOwnerAction(facadeAction);
  await yieldFacadeOwnerCommitMergeDeployRequired(facadeAction);
  return; // mandatory end: the owner commits/merges/deploys the era-aware
          // facade as one direct child of the recorded prior HEAD (fast-forward
          // compatible) while the pointer stays V1; consumer-cutover-resume is
          // a separate fresh invocation
}

if (invocation.mode === "task548-consumer-cutover-resume") {
  const request = parseExactTask548ConsumerCutoverResumeRequest(
    invocation.argv
  );
  // 1. Decode, hash and normalize the canonical FACADE phase checkpoint FIRST;
  //    it binds the facade priorHead, file inventory, execution-order tuple,
  //    phase tree/gate digests and the facade dispatch state/pointer facts.
  //    The decoded byte bound `TASK_548_PHASE_CHECKPOINT_MAX_BYTES` (1 MiB) is
  //    enforced before any field is trusted.
  const checkpoint = await decodeAndVerifyTask548PhaseCheckpointV1({
    checkpointBase64url: request.checkpointBase64url,
    checkpointSha256: request.checkpointSha256,
    phase: "facade",
    maxDecodedBytes: TASK_548_PHASE_CHECKPOINT_MAX_BYTES,
    requireCanonicalUnpaddedBase64url: true,
    timingSafeSha256Verification: true,
    rejectUnknownMissingDuplicateFields: true,
  });
  // 2. Verify the EXACT committed/deployed facade bytes: the current clean HEAD
  //    equals the ACTUAL `ownerHead` and is exactly ONE direct child of
  //    checkpoint.priorHead (no merge or extra commit); prove the exact changed
  //    path set and `git show` file hashes; RECOMPUTE the facade tree digest
  //    and re-project the canonical gate-receipt records, recompute
  //    phaseGateSha256 from their canonical serialization, and require equality
  //    with the checkpoint values.
  const facade = await verifyExactCommittedDeployedFacadeV1({
    request, checkpoint,
    requireCleanHeadEqualsOwnerHead: true,
    requireExactlyOneDirectChildOfPriorHeadNoMergeNoExtraCommit: true,
  });
  await requireExactPhaseChangedPathsAndGitShowFileHashesV1(facade, checkpoint);
  await requireRecomputedPhaseTreeAndGateDigestsV1(facade, checkpoint, {
    reprojectGateRecords: true,
    hashGateRecords: hashCanonicalTask548PhaseGateRecordsV1,
  });
  // 3. Verify the EXACT facade deployment: request.deploymentIdentity and
  //    servingBuildSha256 bind source HEAD/tree/build, the persisted cutover
  //    `rollout_receipt` matches that build and the row's
  //    `deploymentIdentity`/`rolloutGeneration` (recorded AFTER deployment),
  //    every `ASSISTANT_DOCS_V2_CONSUMER_IDS_V1` consumer declared ready, and
  //    the DB cutover state/pointer era are EXACTLY `v2_activated`/era `v2`
  //    (`v2_activated` atomically switches the active pointer to V2, so the
  //    consumer-cutover resume requires era v2, never v1) — read
  //    the authoritative DB facts in ONE snapshot, RECOMPUTE rather than trust
  //    request.dbFactsSha256, then RE-READ revision/generation immediately
  //    before dispatch. Missing, mismatched or stale receipt/consumers/state
  //    blocks before any 04/05/06 dispatch.
  await verifyExactDeployedFacadeRolloutAndActivationV1(request, {
    checkpoint, facade,
    exactCutoverState: "v2_activated",
    exactPointerEra: "v2",
    recomputeDbFactsSha256: true,
    reReadRevisionAndGenerationBeforeDispatch: true,
  });
  // 4. Rerun a fresh current-tree read-only drift, then dispatch ONLY the
  //    consumer cutover order and enter the prerelease post-audit/release
  //    pause.
  const drift = await runFreshTask548CurrentTreeDriftReadOnly({
    phase: "task548-consumer-cutover-resume",
  });
  await requireZeroFindingCurrentTreePass(drift);
  await implementSequentiallyWithPerLeafGates(
    TASK_548_CONSUMER_CUTOVER_EXECUTION_ORDER
  );
  const prerelease = await dispatchSamePhysical07L01(
    "07-L01-release-inputs-and-prerelease-gates", {}
  );
  const audited = await runTask548PrereleasePostAudit(prerelease);
  const releaseAction = await dispatchSamePhysical07L01(
    "07-L01-owner-commit-merge-release-branch-pause",
    { prerelease: audited.prerelease, postAudit: audited.postAudit }
  );
  await yieldOwnerActionRequired(releaseAction);
  return; // release-branch owner pause; semantic-release is the sole release
          // authority; fresh release-resume afterwards
}

if (invocation.mode === "task548-bootstrap-build") {
  await requireTask545ExactlyDone();
  await requireTask547Terminal();
  // Complete terminal TASK-551 family gate:
  // `deriveAndVerifyTask551CurrentTerminalStateV1` verifies the CURRENT HEAD
  // state (exactly one changelog-1263 path, parseable and terminal-bound —
  // no unique historical ADD commit/ancestor/byte-identity gate — parent
  // `✅ Done`, every descendant terminal,
  // the 38-file graph + current board/changelog index semantics, and
  // no unresolved drift from the current task files plus the changelog file),
  // then
  // re-reads the current board/changelog semantically. No expected-HEAD
  // receipt or external sidecar exists. The current `⏳ To Do` state blocks
  // this bootstrap mode.
  await deriveAndVerifyTask551CurrentTerminalStateV1();
  await requireLiteralTask547OverlapSerializationInTask548Parent();
  const bootstrap = await rebuildTask548WorkflowInfrastructure({
    paths: TASK_548_08_BOOTSTRAP_PATHS,
    importOnlyTrackedTask545Owners: true,
    ignoreProvisionalHelperBytes: true,
  });
  await assertExactWriteSet(bootstrap, TASK_548_08_BOOTSTRAP_PATHS);
  await assertNoProductTaskDocsChangelogStatusOrEvidenceWrite(bootstrap);
  await runTask548BootstrapPreCommitGates(bootstrap, {
    exactWriteSet: TASK_548_08_BOOTSTRAP_PATHS,
    requireForbiddenPathsClean: true, requireNodeSyntaxChecks: true,
    requireTargetedWorkflowTests: true, requireLineCountsAtMost1000: true,
    requireGitDiffCheck: true,
  });
  const ownerAction: Task548BootstrapOwnerActionRequired =
    await createExactBootstrapOwnerAction({
      bootstrap, schemaVersion: 1, taskId: "TASK-548",
      mode: "task548-bootstrap-committed-resume",
      priorHead: await requireLowercase40HexHead(),
      exactSortedPaths: TASK_548_08_BOOTSTRAP_PATHS,
      hash: "sha256", aggregateOver: "canonical-json-priorHead-and-files",
      checkpointTransport: "canonical-unpadded-base64url",
      maxCheckpointBytes: TASK_548_BOOTSTRAP_CHECKPOINT_MAX_BYTES,
    });
  await validateExactTask548BootstrapOwnerAction(ownerAction);
  await yieldBootstrapOwnerCommitRequired(ownerAction);
  return; // mandatory end: only the owner commits these reviewed bytes
}

await requireExactBootstrapCommittedResumeMode(invocation, {
  exactMode: "task548-bootstrap-committed-resume",
  forbidRebuildAndPreCommitGates: true,
  forbidReleaseClosureOrRetirementArgs: true,
});
await requireTask545ExactlyDone();
await requireTask547Terminal();
// DEFENSE-IN-DEPTH only: the complete terminal TASK-551 family gate
// (`deriveAndVerifyTask551CurrentTerminalStateV1`; the current `⏳ To Do` state blocks
// this committed-resume mode) also
// runs early, BEFORE checkpoint/HEAD/byte-parity validation. This early run is
// NOT the required final gate: committed-resume MUST repeat the complete gate
// AFTER exact HEAD, clean-tree, checkpoint and byte-parity validation,
// immediately before the authoring audit/01-L03 dispatch (see the final gate
// below).
await deriveAndVerifyTask551CurrentTerminalStateV1();
await requireLiteralTask547OverlapSerializationInTask548Parent();
const checkpoint = await decodeAndVerifyTask548BootstrapCheckpointV1({
  argv: invocation.argv,
  exactArgvShape: [
    "--mode", "task548-bootstrap-committed-resume",
    "--bootstrap-checkpoint", "<canonical-base64url>",
    "--bootstrap-checkpoint-sha256", "<64-lowercase-hex>",
  ],
  maxDecodedBytes: TASK_548_BOOTSTRAP_CHECKPOINT_MAX_BYTES,
  requireCanonicalUnpaddedBase64url: true,
  timingSafeSha256Verification: true,
  rejectUnknownMissingDuplicateFields: true,
  requireExactSchemaTaskModeAndLowercase40HexPriorHead: true,
  requireExactSixSortedUniquePathSha256Records: TASK_548_08_BOOTSTRAP_PATHS,
  requireCanonicalAggregateSha256: true,
});
const committedBootstrap: Task548CommittedSixPathBootstrapReceiptV1 =
  await requireCommittedTask548WorkflowBootstrap({
  checkpoint,
  paths: TASK_548_08_BOOTSTRAP_PATHS,
});
await requireExactSingleParentOwnerCommitAndDiff(committedBootstrap, {
  expectedOnlyParent: checkpoint.priorHead,
  exactChangedPaths: TASK_548_08_BOOTSTRAP_PATHS,
  rejectStaleCheckpoint: true,
});
await requireHeadFileHashesAndAggregateEqualCheckpoint(
  committedBootstrap,
  checkpoint
);
await requireGitLsFilesForEveryBootstrapPath(TASK_548_08_BOOTSTRAP_PATHS);
await requireCleanStatusAndUnstagedStagedDiffs();
await requireGitShowHeadByteParityForEveryBootstrapPath(
  TASK_548_08_BOOTSTRAP_PATHS
);
await runTask548BootstrapCleanCheckoutWorktreeTests({
  paths: TASK_548_08_BOOTSTRAP_PATHS,
  head: committedBootstrap.head,
});
await requireTask548CommittedSixPathBootstrapAuthorizationV1({
  repoRoot, receipt: committedBootstrap,
});
await requireTask54808Status("⏳ To Do");
// REQUIRED FINAL GATE: repeat the complete terminal TASK-551 family gate AFTER
// the exact HEAD/clean-tree/checkpoint/byte-parity validation above and
// immediately before the authoring audit that authorizes 01-L03 dispatch — the
// early defense-in-depth run above can never substitute for it.
// `deriveAndVerifyTask551CurrentTerminalStateV1` re-verifies the CURRENT HEAD
// state fresh (exactly one changelog-1263 path, parseable and terminal-bound;
// no unique historical commit/hash authority) and proves the 38-file graph +
// terminal statuses +
// current board/changelog semantics plus no unresolved drift from the current
// task files and the changelog file, then re-reads the current
// board/changelog semantically; exact 02-L02/04-L02/05-L01 export-owner
// leaves present; the current `⏳ To Do` state blocks authoring/01-L03
// dispatch. No expected-HEAD receipt or external sidecar authority exists.
await deriveAndVerifyTask551CurrentTerminalStateV1();

const authoringBaseline = await fingerprintBootstrapTasksAndTask545Drivers();

const authoring = await runCanonicalAuditRounds({
  maximumFixPasses: 8,
  groups: TASK_548_TASK_FILE_GROUPS,
  auditFile: runFreshPerFileAudit,
  reconcile: runExactlyOneCrossTaskReconcile,
  fix: runOwnershipScopedFixers,
  fingerprint: fingerprintTask548ContractAndDirtyScope,
  label: "TASK-548:authoring",
});
assertInitialRoundHasEveryRequiredResult(authoring);
assertEveryChangedScopeHasFreshAuditAndReconcile(authoring);
assertNoUnresolvedHighOrMediumFindings(authoring);
await assertBootstrapTasksAndTask545DriversUnchanged(authoringBaseline);
await assertAuthoringGateAllowsImplementationInCurrentRun(authoring);

// The tracked TASK-548-08 wrappers orchestrate the deploy-gated phase orders.
// The immediate pre-01-L03 dispatch gate re-runs
// `deriveAndVerifyTask551CurrentTerminalStateV1` fresh (parent `✅ Done`, every
// physical descendant terminal, current board/changelog synchronized, changelog
// 1263 present and valid, current task files and no unresolved drift, exact
// 02-L02/04-L02/05-L01 export-owner
// leaves present) BEFORE the
// `01-L03` label is dispatched; the current `⏳ To Do` state blocks dispatch.
// The committed-bootstrap implementation dispatches ONLY the foundation order
// `[01-L01, 01-L02, 01-L03]`, gates it, and returns the foundation
// owner action; it NEVER dispatches 02/03/04/05/06/07 in this process.
await implementSequentiallyWithPerLeafGates(
  TASK_548_FOUNDATION_EXECUTION_ORDER,
  {
    beforeLabel: {
      "01-L03": deriveAndVerifyTask551CurrentTerminalStateV1Before01L03DispatchV1,
    },
  }
);
const foundationPhaseGateRecords =
  await projectFreshRerunTask548PhaseGateRecordsV1(
    TASK_548_FOUNDATION_EXECUTION_ORDER
  );
  const foundationAction: Task548FoundationOwnerActionRequired =
    await createExactFoundationOwnerActionV1({
      priorHead: await requireLowercase40HexHead(), // pre-owner HEAD; the future
        // owner HEAD is never invented by the action
      files: await inventoryExactPhaseFilesV1({
        implementedLeaves: implementedLeafLabels(
          TASK_548_FOUNDATION_EXECUTION_ORDER), hash: "sha256",
      }),
    implementedLeaves: implementedLeafLabels(
      TASK_548_FOUNDATION_EXECUTION_ORDER),
    phaseTreeSha256: await computeExactPhaseTreeDigestV1(),
    phaseGateRecords: foundationPhaseGateRecords,
    phaseGateSha256: hashCanonicalTask548PhaseGateRecordsV1(
      foundationPhaseGateRecords),
  });
  requireAllPassTask548PhaseGateRecordsV1(foundationPhaseGateRecords); // failed
    // records can never authorize a checkpoint/owner action
await validateExactTask548FoundationOwnerAction(foundationAction);
await yieldFoundationOwnerCommitMergeDeployRequired(foundationAction);
return; // mandatory end: only the owner commits/merges/deploys the
        // migration-capable foundation as one direct child of the recorded
        // prior HEAD (fast-forward compatible); task548-foundation-migration-
        // resume is a separate fresh invocation
```

**Data flow:** `task548-bootstrap-build` dependency/parent gates (TASK-545
`✅ Done`, the complete terminal TASK-551 family gate via
`deriveAndVerifyTask551CurrentTerminalStateV1` — current HEAD state verified
fresh, terminal TASK-547 identity, landed parent amendment) → exact six-file
rebuild/pre-commit gate → strict hashed checkpoint/owner action → mandatory return
→ fresh mutually exclusive `task548-bootstrap-committed-resume` decode/integrity/
single-parent exact-diff/HEAD/clean-
checkout validation with no rebuild (the complete terminal TASK-551 family gate
is re-derived and re-verified AFTER the committed HEAD validation — the
required final gate —
immediately before the authoring round that authorizes 01-L03 dispatch; the
early pre-validation run is defense in depth only) → one complete fresh authoring round and
finding-driven affected-scope reruns/reconcile → FOUNDATION phase
implementation/gates ONLY (`[01-L01, 01-L02, 01-L03]`; the immediate
pre-01-L03 dispatch gate re-runs
`deriveAndVerifyTask551CurrentTerminalStateV1` fresh before the `01-L03` label) → exact
08-created foundation owner action (`commit_merge_deploy_task548_foundation`,
binding the canonical phase gate-receipt records and their derived
phaseGateSha256)
→ terminate. Fresh mutually exclusive `task548-foundation-migration-resume`
verifies the exact committed/deployed foundation bytes and the DB cutover state
EXACTLY `shadow_parity_clean` (decode/hash/normalize the canonical phase
checkpoint first; clean HEAD equals the actual ownerHead and is exactly one
direct child of the checkpoint's pre-owner priorHead; exact changed path set
and `git show` file hashes; recomputed tree digest and re-projected canonical
gate-receipt records with recomputed phaseGateSha256; deployment metadata
binds source HEAD/tree/build; authoritative DB facts read in one snapshot and
recomputed, never trusted, with revision/generation re-read before dispatch),
reruns the current-tree audit, then implements
the FACADE phase (leaf steps `02-L01, 02-L02, 02-L03, 03-L01, 03-L02, 03-L03`
plus the discriminated `post-pilot-generated-bundle-refresh-gate` generated-gate
step — never an implemented leaf;
the 03-L03 facade dispatch is gated at EXACTLY
`shadow_parity_clean`, never merely at/past `backfill_complete`) → exact
08-created facade owner action (`commit_merge_deploy_task548_era_aware_facade`,
binding the pre-owner priorHead plus the exact phase-file inventory, the
canonical phase gate-receipt records and the canonical phase checkpoint,
pointer stays V1) → terminate. Fresh mutually exclusive
`task548-consumer-cutover-resume` verifies the exact facade deployment, the
persisted rollout receipt for that build, consumers ready and the DB cutover
state EXACTLY `v2_activated` with the active pointer era EXACTLY `v2`,
reruns a fresh current-tree drift, then
implements the CONSUMER CUTOVER phase (leaf steps `04-L01, 04-L02, 04-L03,
05-L01, 05-L02, 06-L01, 06-L02`
plus the discriminated `final-native-corpus-generated-bundle-handback-gate`
generated-gate step — never an implemented leaf)
→ 07 release
inputs/prerelease gates → canonical
08 prerelease post-audit/fix/revalidation → owner-only commit/merge-to-release-
branch pause (the owner reviews, commits and merges to the protected release
branch and WAITS; semantic-release is the SOLE release authority and alone
creates the generated version/lock/changelog release commit, the plain SemVer
tag and the GitHub release; TASK-548-05-L02's NORMAL RELEASE publication
deploys Cloudflare only when
`released == "true"` (the rollback job never requires the semantic-release
output); the owner never runs `git tag`/`gh release`) → terminate.
A fresh release-resume parses its recursively strict
`runKind: "release" | "rollback"` union (release: version/tag/gitSha/run/
attempt/deployment/origin/basePath; rollback: targetVersion/originalGitSha/run/
attempt/deployment/origin/basePath; mixed/opposite keys reject), fetches the
authoritative selected run/attempt metadata and derives the run kind from
exclusive workflow event/input/job metadata (Docker recovery ALWAYS rejected;
`released == "true"` required only for release; rollback requires a successful
`workflow_dispatch` with the exact rollback dispatch mode/target; mismatched
kind or mixed artifacts reject) → release proves clean HEAD/tag
target = gitSha while rollback proves clean HEAD = the workflow run head and
separately resolves the target release/tag/capsule to originalGitSha (the run
HEAD and the target SHA are never equated) → TWO tree identities: `runtimeTree`
from the clean workflow-run HEAD (committed-head drift/preparation identity)
and `publicRuntimeTree` (equal to runtimeTree for release; derived from the
verified target release/tag/capsule for rollback, never from the workflow-run
HEAD) → 07 validates one bounded untouched canonical Git record stream, calls
L01's pure create/normalize/serialize API directly, produces the exact
`DocsReleaseTreeBindingV1` objects, and proves byte-identical PUBLIC binding
through manifest/artifact/retained/rollback/health receipts (committed-head
drift downstream stays bound to `runtimeTree`);
the selected-run health artifacts are enumerated and exactly one matching
family is required — release downloads only `docs-post-deploy-health-*` and
calls only `validateDocsPostDeployHealthReceiptV1`, rollback downloads only
`docs-post-deploy-rollback-health-*` and calls only
`validateDocsPostDeployRollbackHealthReceiptV1`; opposite/both/duplicate
artifacts fail and a discriminated health receipt/hash is returned
(HEAD/tag/GitHub release are semantic-release-generated; the resume trusts only
verified workflow outputs and the generated release commit/tree)
→ 08 runs a zero-finding committed-HEAD drift gate → 07 read-only full
preparation/gates and smoke → exact manifest/eight screenshots → TASK-545
checkpoint → second owner pause and termination. The separate closure resume
does tracked parity → final drift → date-stable changelog-first closeout → 07
returns the mechanical delta and 08 emits it exactly once. No pre-pause memory
authorizes any resume. Retirement confirms exact absence, runs a new current-
tree drift, derives owners only from its verified findings, then scoped fixes/
gates and the prerelease/release path; the
replacement release-resume must pass before any new smoke/checkpoint.

**Error handling:** nonzero agent exit, missing result, duplicate result,
malformed JSON, stale HEAD/diff scope, forbidden write, conflicting owner,
failed gate, dirty unowned path, or unresolved HIGH/MEDIUM stops dispatch.
Wrong dependency status/order (including a non-terminal TASK-551 family on the
CURRENT HEAD — the
parent not exactly `✅ Done`, any physical descendant non-terminal, an
out-of-sync board/changelog, a missing, duplicate, unparseable or
non-terminal-bound changelog-1263 path, an untracked or missing 38-file graph
member, a
zero-path or unparseable discovery result, a 38-file graph or terminal-status
mismatch, a contradictory current semantic board/changelog re-read (unresolved
drift), or a
missing TASK-551-02-L02/04-L02/05-L01 export-owner leaf — which blocks BOTH
bootstrap modes and the immediate pre-01-L03 dispatch gate; no unique
historical commit/hash is ever a product gate), an unlanded parent amendment, a bootstrap write
outside the six exact paths, an untracked wrapper/shared owner/test, HEAD-byte
mismatch, dirty clean-checkout gate, provisional-helper promotion, provisional
pre-TASK-545 result, count-only local substitute, evidence path outside the
canonical directory, or attempt by 08 to stage/commit/write final evidence also
stops. Agents never stage or commit the bootstrap; absent owner checkpoint/
commit stops before audit. Any change after that commit to a bootstrap artifact,
TASK-548 task contract, an imported TASK-545 driver, or any TASK-551 family
file invalidates every receipt
whose input fingerprint changed (the TASK-551 gate re-verifies the current
terminal state
fresh via `deriveAndVerifyTask551CurrentTerminalStateV1` and never trusts a stale
receipt, a unique historical commit/hash, or any external sidecar). A contract-wide input change restarts one
complete round; a verified scoped fix reruns only its affected audits plus
reconcile. Unchanged clean receipts may be retained. Never retry by weakening a test,
suppressing a scanner, or treating absence as success.
A mixed/missing bootstrap mode, build-mode continuation after its checkpoint,
committed-resume rebuild/pre-commit call, malformed/non-canonical/oversized
base64url, unknown/missing/duplicate owner-action/checkpoint fields or argv, wrong record
order/count/path/hash/aggregate, stale prior HEAD, non-single-parent commit, wrong
diff, or authoring before exact committed path/HEAD/clean-checkout validation stops.
A missing/duplicate/unknown/unbounded release field, a mixed or opposite
`runKind` branch (release vs rollback keys), a wrong-kind or duplicate health
artifact family, Docker recovery at any time, a missing `released == "true"`
output on a release run, a rollback run that is not a successful
`workflow_dispatch` with the exact rollback dispatch mode/target, a
workflow-run-head versus public-tree target mismatch (the run HEAD and the
target SHA/tree are never equated), mixed invocation modes,
wrong SHA-1/SHA-256 object format/OID width, HEAD/tag commit, clean checkout, or
noncanonical/divergent `DocsReleaseTreeBindingV1` (runtime or public),
mutable/conflicting release asset,
wrong 05-L02 workflow/deployment identity, malformed health receipt, or any
attempt to reuse prerelease memory stops before committed-HEAD drift,
preparation or smoke. 08 never stages, commits, merges, deploys, tags, releases,
publishes or deploys; the foundation/facade owner actions are 08-created strict
owner actions and 07/08 never perform those mutations. A post-release failure
requires a new release identity. Phase-gate failures are exact: the
foundation-migration-resume rejects a wrong foundation HEAD/tree/gate receipt,
unclean tree, or any DB cutover state other than EXACTLY `shadow_parity_clean`
(including merely `backfill_complete`) before any 02/03 dispatch; the
consumer-cutover-resume rejects a missing/mismatched facade deployment,
rollout receipt, consumer declaration, or any DB cutover state other than
EXACTLY `v2_activated` (and any active pointer era other than EXACTLY `v2`,
since `v2_activated` atomically switches the pointer to V2) before any
04/05/06 dispatch; a phase resume never
replays a prior phase's implementation and never trusts prior-process memory.
A final-drift result is read-only and runs before any terminal metadata write.
Every finding makes it non-pass; resume aborts without a closeout/evidence edit
and returns the exact 07-owned
`retire_invalidated_task548_checkpoint` owner action bound to task, run,
canonical eleven-path inventory and checkpoint hash. Agents neither unstage nor
delete it. The owner retires only that reviewed inventory; the next mutually
exclusive retirement-restart invocation supplies the returned restart argv and
07 confirms
the eleven paths are absent from index/worktree and the directory is absent/empty
before a fresh current-tree drift. Missing/malformed drift, owner derivation from
old findings, or any retired-evidence access blocks before fixes/gates.
Late confirmation, any bootstrap/authoring/full
implementation replay, or any retired checkpoint/evidence access or mutation
blocks before affected work. Partial/wrong retirement blocks. This transition
is never used for `metadata_recovery` or a clean pre-metadata crash. A
`metadata_recovery` delta
that is not an exact ordered prefix of the deterministic plan, or has index-only/
corrupt/multiple/wrong TASK-548 1261 path/index/date state, blocks. After terminal metadata, only the narrow TASK-545
mechanical delta validator may run; its structured result is an external owner
handoff emitted exactly once by 08 and never persisted by either layer.

**Regression-test shape:** bootstrap fixtures pin both mutually exclusive modes
and all prerequisite steps: build dependency/parent gates (TASK-545 `✅ Done`,
the complete terminal TASK-551 family gate read FRESH — see below —, terminal
TASK-547 identity, landed parent amendment); exact six-file rebuild; pre-commit exact
write-set/forbidden-path, Node syntax, targeted-test, line-count and diff-check
gates; exact strict owner action, capped canonical base64url checkpoint, timing-
safe digest, six sorted file hashes and aggregate; then an owner-only direct-child
commit with exact diff and post-commit clean
status/diffs, `git ls-files` membership, `git show HEAD:<path>` byte parity and
clean-checkout/worktree tests before any authoring round. Build returns after
the checkpoint; committed-resume never rebuilds. TASK-548-08 remains To
Do and imports tracked TASK-545 owners throughout. Fixtures seed the
ignored provisional helper with distinguishable bytes and prove it is rebuilt,
not promoted; every product/source/task/docs/changelog/status/evidence write is
rejected. Complete-terminal-TASK-551-family fixtures prove BOTH bootstrap
modes and the immediate pre-01-L03 dispatch gate call
`deriveAndVerifyTask551CurrentTerminalStateV1` fresh (never a stale receipt, cached
list, expected-HEAD receipt, unique historical commit/hash, or external
sidecar) and block when the parent is
not exactly `✅ Done` (including the current
`⏳ To Do` state), when any physical descendant is non-terminal, when the
board/changelog is out of sync, when the changelog-1263 path is missing,
duplicated, unparseable or not terminal-bound, when the 38-file graph or its
current terminal/board/changelog-index semantics mismatch, when
an untracked matching TASK-551 file fails the per-path
`git ls-files --error-unmatch` check, when discovery returns
zero paths or an unparseable result (an empty `readdir` is a hard block, never
an empty pass; no
shell glob expansion or pathspec that can return empty silently is used, and
argv fixtures prove the helper and its pre-01-L03 dispatch wrapper reject any
glob/pathspec/path-list argument — discovery is always derived from disk/Git,
never passed), when the current semantic board/changelog re-read contradicts
the terminal statuses (unresolved drift), or when any of the
exact TASK-551-02-L02/04-L02/05-L01 export-owner leaves is missing; a change to any
TASK-551 family file after a PASS invalidates the affected gate result and
requires a fresh current-state derivation before the next dispatch. No unique
historical commit/hash is asserted: the atomic commit shape that introduced
changelog 1263 may be noted operationally, but it is never a product gate.
Mutating any bootstrap artifact, TASK-548 task contract, or imported
TASK-545 driver after a PASS proves that every stale receipt is rejected and a
new complete round runs from the new HEAD. Workflow smoke fixtures also prove
one complete initial round cannot short-circuit, all-results false-clean
protection, exactly one reconcile for the complete round and each affected
rerun wave, scoped fixer dispatch, forbidden-path enforcement, the deploy-gated
foundation/facade/consumer-cutover phase land order, stale-evidence rejection,
structured schema validation,
and nonzero failure behavior. Mode fixtures pin all terminating owner pauses —
the foundation deploy pause, the facade deploy pause, the final release-branch
pause and the checkpoint pause —
the exact foundation/facade/consumer-cutover/release-resume/closure-resume/
retirement orders, the recursively strict `runKind: "release" | "rollback"`
release-resume union (release: version/tag/gitSha/run/attempt/deployment/
origin/basePath; rollback: targetVersion/originalGitSha/run/attempt/deployment/
origin/basePath; mixed/opposite keys reject), repository-format Git OIDs and
exact runtime-tree binding joins
through manifest/artifact/retained/rollback/health receipts, no cross-
process payload authority, no release mutation, one 07 return plus one 08 emit,
and frozen-current-date versus cross-UTC-day on-disk recovery-date behavior.

## Sequential Implementation and Gates

- Dispatch only after the two exclusive bootstrap modes and through the six
  exact post-bootstrap execution-order constants
  (`TASK_548_FOUNDATION_EXECUTION_ORDER`,
  `TASK_548_FACADE_EXECUTION_ORDER`,
  `TASK_548_CONSUMER_CUTOVER_EXECUTION_ORDER`, `TASK_548_RELEASE_PAUSE_ORDER`,
  `TASK_548_RELEASE_RESUME_ORDER`, and `TASK_548_CLOSURE_RESUME_ORDER`), in the
  three deploy-gated
  phases, including the initial
  01-L02 bundle/report, one discriminated `post-pilot-generated-bundle-refresh-gate`
  generated-gate step (generated-artifact-only invocation of the already-landed
  compiler CLI with an exact generated-only write set, a proven clean
  human-authored tree and its own gate; never an implemented leaf) before
  02-L03,
  and one discriminated `final-native-corpus-generated-bundle-handback-gate`
  generated-gate step between 06-L01
  and 06-L02. The immediate
  pre-01-L03 dispatch gate re-runs `deriveAndVerifyTask551CurrentTerminalStateV1`
  fresh (see
  the Complete Terminal TASK-551 Family Gate section) before the `01-L03`
  label dispatches; the current `⏳ To Do` state blocks dispatch. Operational
  owner reruns do not reopen/change status or create a second writer. Each
  dispatch receives only its owned paths and current on-disk shared contracts.
- The committed-bootstrap implementation dispatches ONLY the foundation order
  and ends at the 08-created foundation owner action. `task548-foundation-migration-resume`
  verifies exact committed/deployed foundation bytes and the DB cutover state
  EXACTLY `shadow_parity_clean` (never merely at/past `backfill_complete`),
  reruns the current-tree audit, dispatches ONLY the facade order, and ends at
  the 08-created facade owner action while the pointer stays V1.
  `task548-consumer-cutover-resume` verifies the exact facade deployment, the
  rollout receipt for that build, consumers ready and the DB cutover state
  EXACTLY `v2_activated` with the active pointer era EXACTLY `v2`, reruns a
  fresh current-tree drift, dispatches ONLY
  the consumer cutover order, then runs prerelease gates, the canonical
  post-audit and the final release-branch owner pause. No phase replays
  another phase's leaves, and no phase trusts prior-process memory.
- After each leaf, run `bun --cwd core lint:types`,
  `bun --cwd core lint`, and its targeted Vitest/Bun/DB/security lane.
- Allow at most three scoped fix rounds before escalation. Fix source when it
  violates the contract; rebaseline only an explicitly intended contract
  change and never weaken a behavior assertion.
- A task/source/test/validation-contract change after a pass makes the pass
  stale. Rerun affected gates and audits.
- A retirement-restart invocation is mutually exclusive with initial, phase-resume, release-resume and
  closure-resume modes. Read its exact argv first, dispatch
  `07-L01-confirm-invalidated-checkpoint-retired` as the first workflow action,
  and only after exact 11-path absence run a new current-tree read-only drift,
  derive owners from that result, then scoped fixes/gates, prerelease audit and
  the owner release-branch pause. A later fresh
  release-resume must verify the new release before smoke/phase 1. Do not rerun
  bootstrap, authoring or full implementation or access retired evidence.
- After 06-L02, TASK-548-07 completes docs, release inputs and prerelease gates.
  08 then calls the canonical TASK-545 post-audit driver exactly once. The
  driver owns the complete initial exact-lens pass and each bounded verified
  fix/validation cycle. After a fix it reruns only affected lens IDs, never the
  unchanged clean set. There is no outer retry loop and no invented result
  field. Its validation callback reruns affected targeted gates and the
  complete 07 release-input receipt after each fix. Only a current pass may return
  the owner release-branch action (owner reviews, commits and merges to the
  protected release branch and waits for semantic-release — the sole release
  authority), and that process terminates. A fresh release-resume
  validates committed HEAD/tree/receipts; 08 then runs a read-only committed-HEAD
  drift gate before 07 preparation/full gates and final smoke, ending at the
  checkpoint owner pause.
- The distinct checkpoint resume, after owner evidence review/staging, verifies
  only checkpoint/tracked
  parity. For `frozen`, 08 runs the substantive final drift read-only before
  closeout; a zero-finding pass authorizes 07's ordered no-replace changelog then
  index-CAS/fsync transaction before statuses. For `metadata_recovery`, 08 does
  not rerun final drift: 07 validates `file-only|both`, completes the index when
  absent, and then only missing metadata. After terminal writes, 07 returns the
  mechanical delta and 08 emits it exactly once.

## Post-Implementation Audit

Run exactly these six independent fresh-context lens IDs:

1. `scope-and-single-writer` — scope fidelity, single-writer ownership and no
   out-of-scope Designer/API;
2. `schema-byte-identity-and-legacy` — schema, stable identity, deterministic
   bytes, fail-closed and legacy safety;
3. `security-privacy-and-release` — auth/RBAC/CSRF/privacy/content safety and
   release immutability;
4. `guide-agent-a11y-renderer` — Help/Guide/Agent offline isolation, UX,
   accessibility and renderer parity;
5. `corpus-route-visual-publication` — corpus/route/visual/publication coverage
   and TASK-547 serialization; and
6. `test-evidence-and-cleanup-integrity` — test integrity, required gates,
   evidence/hash completeness and cleanup.

`TASK_548_POST_AUDIT_LENSES` is the deeply frozen tuple of those exact IDs in
that order. Validate every result identity/count and verify every reported line
locally before release. Call `runCanonicalPostAudit` exactly once in the
prerelease invocation. Its initial complete set may trigger bounded owning-leaf
HIGH/MEDIUM fixes; after each verified fix its validation boundary reruns
affected gates plus 07 release-input gates, then the driver dispatches only the
affected lens IDs. A missing result, non-convergence, or non-pass blocks. LOW
may be deferred only
through an execution-ready TASK-9999 leaf with the repository-required
zero-impact evidence; otherwise it is fixed before closure.

## Canonical Evidence and Closure Boundary

TASK-548-07-L01 finishes product/runtime docs and prerelease gates, then 08
completes one canonical prerelease post-audit. 07 returns the exact owner
release-branch action and the process stops; 07/08
never perform those mutations. The owner reviews, commits and merges to the
protected release branch and waits for the protected semantic-release workflow;
semantic-release is the SOLE public release authority and alone creates the
generated version/lock/changelog release commit, the plain SemVer tag and the
GitHub release, and TASK-548-05-L02's NORMAL RELEASE publication deploys
Cloudflare only when
`released == "true"` (docs rollback never requires the semantic-release
output). The owner never runs `git tag`/`gh release` and never
guesses a version or tag. The foundation and facade phases end at their own
08-created strict owner actions (`commit_merge_deploy_task548_foundation` and
`commit_merge_deploy_task548_era_aware_facade`); 07/08 never commit, merge,
deploy, tag or release. A fresh release-resume trusts only its bounded
CLI fields and revalidates clean HEAD/tag identity (tag/GitHub release are
semantic-release-generated; the resume trusts verified workflow outputs and the
generated release commit/tree), then validates one bounded
untouched canonical Git record stream and calls L01's pure create/normalize/serialize API directly to require the same canonical runtime-tree
binding in release, retained, rollback and health receipts. After a fresh
read-only committed-HEAD drift pass, 07 runs
full preparation/gates and final smoke in that same invocation.
After smoke/cleanup, 07 writes only the canonical shared-runner `report.json`,
the exact TASK-545 `manifest.json`, and eight screenshots under
`_docs/_workflows/_smoke/evidence/task-548/task-548-certification/`. TASK-545 first validates
the exact-six-path committed-bootstrap receipt; exact phase-1 args pin
1261/`task-548-hybrid-visual-documentation` and derive the owning
`_docs/_workflows/task-548-implement.mjs` only from its `import.meta.url` and creates the sole
`resume-checkpoint.json` and returns
exactly `{ pass, code, action, taskId, evidenceDirectory, checkpointPath,
checkpointSha256, runId, resumeArgv, resumeCommand, frozenRuntimeRevision }`
under 07's pinned literals/types. Agents never stage or commit. The manifest
stays byte-for-byte within the TASK-545 schema; audit, bundle, network, cleanup,
or workflow-summary additions reject. 07 never writes a pre-phase-1 checkpoint.
Before returning `owner_action_required`, it writes no task, changelog, board,
status, or other metadata; after phase 1 it performs no further action.

Only a separate closure-resume process, after the owner reviews and stages that
exact directory, may use the returned `resumeArgv`. Resume verifies
tracked parity and cannot dispatch authoring, implementation, fix, canonical
post-audit, or smoke.

When TASK-545 returns `frozen`, 08 dispatches
`08-final-read-only-drift`, a substantive read-only audit bound to the frozen
runtime revision, before any closeout mutation. A pass has exactly no findings.
Any finding aborts resume without metadata, returns to the exact owner, and
returns the exact checkpoint-retirement owner action. Only after the owner
unstages/retires the bound eleven-path inventory may a new mutually exclusive
retirement-restart invocation confirm absence as its first workflow action and
run a new current-tree drift, derive affected owners solely from those fresh
verified findings, then scoped fixes/gates/prerelease audit/release pause. Its
replacement release-resume must verify the new release before smoke/new phase 1.
It skips bootstrap, authoring/full implementation replay and never reads or
mutates retired bytes. The dynamic result is current-process-only.
If the process crashes before the first metadata write after a clean final
drift, replay remains `frozen` and reruns a fresh final drift without retirement.

07 derives its deterministic metadata plan from only:

1. verified checkpoint task/run/workflow identity, frozen revision, and closure
   contract;
2. the exact canonical manifest plus eight screenshots and their schema fields/
   hashes;
3. current frozen on-disk product/task facts and durable repository receipts
   that can be reread deterministically; and
4. the existing on-disk non-authorizing planning-audit record; and
5. TASK-545's returned `resume.closureIdentity`, never an 07/08 clock read or
   independently resolved path.

The plan contains a fixed `final-drift: passed-before-closure` marker, never
dynamic final-drift records. It does not reconstruct historical per-agent,
authoring/post-audit, page-error, unexpected-network, bundle/production-health,
or cleanup outcomes and does not claim that an in-memory pre-pause payload
survived. Pre-checkpoint checks remain mandatory and block phase 1 on failure,
but their absent fields are not invented after resume.

On `frozen`, TASK-545 permits only canonical state `none`; bound temp/journal-only
residue is cleaned and cannot supply date authority. 07 consumes its UTC identity,
then invokes `writeOrResumeOrderedDurableChangelogFileThenIndexV1` with marker
`ordered-durable-changelog-file-then-index@v1` to write/fsync canonical
`1261-YYYY-MM-DD-task-548-hybrid-visual-documentation.md`
no-replace before index CAS-temp/rename/fsync and later metadata. Recovery does
not run smoke/final drift. Before allowlisting, TASK-545 derives identity from one
strict regular non-symlink file and zero (`file-only`) or one (`both`) matching
index row/date. It rejects index-only/corrupt/multiple states; 07 consumes the
identity directly, completes file-only's index, and validates both.
Thus a UTC-day rollover after the first write cannot change closure identity.

07 changes only checkpoint-allowlisted TASK-548 task/index and pinned changelog
metadata, completing every required descendant before its parent and moving
TASK-548 to terminal only after all required work is complete. After terminal
writes, the only substantive operation is TASK-545's narrow validator returning
exactly `{ pass, taskId, runId, closureMetadataRevision, changedPaths }`. That
result is returned by 07, emitted exactly once by 08, and never persisted. No
substantive audit runs after terminal metadata. 08 never writes statuses,
closeout, or the final canonical evidence set.

## Security Contract

No endpoint or permission changes. Prompts/results exclude credentials, provider
keys, cookies, private logs, raw user data and unredacted payloads. Evidence
contains only safe relative file/line anchors, command outcomes and hashes.
Agents default read only; writer dispatch is limited to the explicit owner map.

## Sub-Tasks

- [ ] Implement author-audit, sequential implement, and scoped-fix workflows.
- [ ] Prove one complete round, affected-scope reruns, all-results guards,
      reconcile, collision, and staleness.
- [ ] Prove bounded audit identities authorize only the current process, verify
  post-resume deterministic closeout reconstruction, and inspect the exact
  07-owned manifest/eight screenshots plus TASK-545-owned checkpoint read-only.

## Testing Requirements

Both bootstrap modes AND the immediate pre-01-L03 dispatch gate first run the
complete terminal TASK-551 family gate via `deriveAndVerifyTask551CurrentTerminalStateV1`
(fresh verification of the CURRENT HEAD state: exactly one changelog-1263
path, parseable and terminal-bound — no unique historical commit/hash
authority — parent `✅ Done`, every
descendant terminal, current board/
changelog synchronized, no unresolved drift from the current 38 task
files plus the changelog file — no expected-HEAD receipt — and the exact
TASK-551-02-L02/04-L02/05-L01 export-owner leaves present; the current
`⏳ To Do` state blocks). Only when that gate passes may the mode-specific
blocks below run.
In `task548-bootstrap-committed-resume`, that first run is defense in depth
only: the gate MUST be repeated fresh AFTER the exact single-parent/HEAD,
clean-tree, checkpoint and `git show` byte-parity validation, immediately
before the authoring audit/01-L03 dispatch — fixtures pin the final-gate
ordering (a TASK-551 family mutation after the early gate but before the final
gate still blocks authoring/01-L03 dispatch).

Only `task548-bootstrap-build` may prove the exact six-file
write set and all forbidden paths, then runs only this pre-commit block:

```bash
node --check _docs/_workflows/task-548-author-audit.mjs
node --check _docs/_workflows/task-548-implement.mjs
node --check _docs/_workflows/task-548-fix.mjs
node --check _docs/_workflows/lib/task-548-contract.mjs
bun test tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts \
  tests/unit/workflows/workflowContracts.test.ts \
  tests/unit/workflows/auditRounds.test.ts \
  tests/unit/workflows/postAudit.test.ts \
  tests/unit/workflows/workflowStaticContract.test.ts \
  tests/unit/workflows/smokeEvidence.test.ts
git diff --check -- \
  _docs/_workflows/task-548-author-audit.mjs \
  _docs/_workflows/task-548-implement.mjs \
  _docs/_workflows/task-548-fix.mjs \
  _docs/_workflows/lib/task-548-contract.mjs \
  tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts
```

Stop and return after producing the reviewed-byte checkpoint. Agents do not
commit. After the owner commits exactly those six paths, only a new
`task548-bootstrap-committed-resume` may strictly decode and timing-safe verify
it, require the exact single parent plus six-path diff and checkpoint-bound file/
aggregate hashes, and run this post-commit
block from the new HEAD:

```bash
git ls-files --error-unmatch \
  _docs/_workflows/task-548-author-audit.mjs \
  _docs/_workflows/task-548-implement.mjs \
  _docs/_workflows/task-548-fix.mjs \
  _docs/_workflows/lib/task-548-contract.mjs \
  tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts
git diff --exit-code
git diff --cached --exit-code
test -z "$(git status --short --untracked-files=all)"
set -o pipefail
for task548_bootstrap_path in \
  _docs/_workflows/task-548-author-audit.mjs \
  _docs/_workflows/task-548-implement.mjs \
  _docs/_workflows/task-548-fix.mjs \
  _docs/_workflows/lib/task-548-contract.mjs \
  tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts; do
  git show "HEAD:$task548_bootstrap_path" | \
    cmp -s -- "$task548_bootstrap_path" -
done
```

The post-commit invocation then runs
`runTask548BootstrapCleanCheckoutWorktreeTests()` against a task-scoped clean
checkout of that HEAD, proving all six paths, tracked TASK-545 imports, Node
syntax and targeted workflow tests work there without copying local provisional
bytes. The exact single parent/diff, checkpoint hashes, `git ls-files`, clean status/diffs,
`git show HEAD:<path>` byte parity, and clean-checkout/worktree tests are
post-commit gates only. An extra/missing commit path or failure blocks before
authoring. This mode never calls rebuild or pre-commit gates.

The `wc -l` inventory of
every added or modified human-authored production module and test file from
the pre-task baseline remains a secondary informational check only. The
failing gate is the canonical NUL-safe line-count gate over every
added/modified production and test file in the leaf write set (identical
contract in every TASK-548 task file; a file above 1,000 makes the gate fail
with `exit 1`, including a non-newline final line); the verified pre-family
baseline is the pinned commit `963733cae23456622bea1eef1b734723aaab2350`,
spans all intermediate commits and staging, and commits/staging cannot narrow
the measured scope:

```bash
# Canonical NUL-safe line-count gate over the leaf write set (identical
# contract in every TASK-548 task file; a file above 1,000 makes the gate fail
# with exit 1, including a non-newline final line). The verified pre-family
# baseline is the pinned commit 963733cae23456622bea1eef1b734723aaab2350;
# commits/staging cannot narrow the measured scope.
TASK_FAMILY_BASELINE_SHA="963733cae23456622bea1eef1b734723aaab2350"
git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}" || { echo "invalid/missing baseline commit ${TASK_FAMILY_BASELINE_SHA}" >&2; exit 1; }
failed=0
while IFS= read -r -d '' f; do
  lines=$(awk 'END { print NR }' "$f")
  if [ "$lines" -gt 1000 ]; then
    printf 'OVER-LIMIT %s %s\n' "$lines" "$f"
    failed=1
  fi
done < <({ git diff --name-only -z --diff-filter=ACMRT "$TASK_FAMILY_BASELINE_SHA" -- core packages scripts tests _docs/_workflows; git ls-files --others --exclude-standard -z -- core packages scripts tests _docs/_workflows; } | grep -zE '\.(ts|tsx|mjs|cjs|js|jsx|mts|cts)$' | grep -zvE '\.generated\.(ts|tsx|js|jsx|cjs|mjs|mts|cts)$' | sort -zu)
exit "$failed"
```

Fixtures cover missing results, bad schema, timeout, stale evidence, collision,
wrong exact constant (including either missing 01-L02 operational rerun),
incomplete rounds, provisional pre-TASK-545 input, untracked/missing shared
owner files/tests, count-only local guards, and unresolved reconcile findings.
They also cover skipped/reordered dependency/bootstrap steps, a missing/extra
bootstrap commit path, merge/root/wrong-parent commit, stale prior HEAD, malformed/
oversized/non-canonical transport, digest/aggregate/file-hash mismatch, unknown/
missing/duplicate fields/argv/records, dirty checkout, HEAD-byte mismatch, direct promotion of
the ignored provisional helper, build-mode continuation, committed-resume
rebuild, and stale-receipt invalidation plus one new complete round after each
of the three protected input classes changes. Also run the task graph/H1/FileName/
parent/status audit and one dry workflow proving no direct product/task/docs/
changelog/status/evidence writes by 08.

Phase-order fixtures pin two bootstrap modes, the six exact post-bootstrap
execution-order constants (foundation, facade, consumer-cutover, release-pause,
release-resume, closure-resume), ALL terminating
owner pauses — the foundation deploy pause, the facade deploy pause, the final
release-branch pause and the checkpoint pause — and the same physical 07-L01
owner across seven normal and two
conditional retirement phases. They prove prerelease post-audit precedes the
release pause; release-resume accepts only the strict `runKind` union with
bounded per-kind fields — release: version/tag/repository-format lowercase
40/64-hex nonzero gitSha/run/attempt/deployment/origin/base; rollback:
targetVersion/originalGitSha/run/attempt/deployment/origin/base — and mixed or
opposite keys reject; Docker recovery is always rejected, `released == "true"`
is required only for release, and rollback requires a successful
`workflow_dispatch` with the exact rollback dispatch mode/target; the two tree
identities (`runtimeTree` from the clean workflow-run HEAD for committed-head
drift; `publicRuntimeTree` equal to runtimeTree for release and derived from
the verified target capsule for rollback) are pinned; the computed
`DocsReleaseTreeBindingV1` fields
are not inputs; HEAD/tag commit, clean parity and immutable receipt bindings
precede fresh committed-HEAD drift; and preparation/smoke
cannot run on stale pre-pause memory. Phase-checkpoint fixtures decode the
discriminated foundation/facade checkpoints through the two exact
`checkpointBase64url`/`checkpointSha256` request fields, enforce the canonical
unpadded base64url form, the timing-safe hash and the
`TASK_548_PHASE_CHECKPOINT_MAX_BYTES` (1 MiB) decoded-byte bound, and reject
unknown/missing/duplicate fields, a stale priorHead, or an oversized decoded
checkpoint before any field is trusted; the phase owner actions carry no
`resumeArgv` (the checkpoint/hash are action fields and
`requiredFutureResumeFields` name only the values supplied later).
Phase gate-receipt fixtures pin the canonical unique sorted deterministic
`Task548PhaseGateReceiptRecordV1` fields (leaf, closed `Task548PhaseGateKindV1`
union member, result, receiptSha256 — no timestamps or durations), the
canonical underlying `Task548LeafGateReceiptV1` schema and its canonical
serializer bytes (the receipt digest is SHA-256 over those serializer bytes;
the bytes bind the exact code-owned `commandId` from
`TASK_548_LEAF_GATE_COMMAND_IDS_V1` for the AGGREGATE invocation actually
executed, so a passing unrelated command with a different argv/command
identity can never be rebound to the same (leaf, gateKind); a non-zero
underlying exit produces no canonical receipt), the canonical
serializer
`serializeCanonicalTask548PhaseGateRecordsV1`, the fresh-rerun projection
`projectFreshRerunTask548PhaseGateRecordsV1` over the exact phase order, and
`hashCanonicalTask548PhaseGateRecordsV1`, proving the fresh resume reproduces
`phaseGateSha256` from the re-projected records and rejects reordered,
duplicated, timestamped, unknown-kind, wrong-commandId or missing records. The
ALL-PASS
invariant is pinned: any single `failed` record (or an unverifiable
receiptSha256) makes `serializeCanonicalTask548PhaseGateRecordsV1`/
`hashCanonicalTask548PhaseGateRecordsV1` throw and blocks every phase
checkpoint/owner-action binding — failed records can never authorize a
checkpoint. Phase-gate fixtures prove the
committed-bootstrap implementation dispatches ONLY the foundation order and
ends at the exact 08-created foundation owner action
(`commit_merge_deploy_task548_foundation`); `task548-foundation-migration-resume`
rejects a wrong foundation HEAD/tree/gate receipt, an unclean tree, or any DB
cutover state other than EXACTLY `shadow_parity_clean` (including merely
`backfill_complete`) before any 02/03 dispatch, then implements ONLY the facade
order and ends at the exact 08-created facade owner action
(`commit_merge_deploy_task548_era_aware_facade`) with the pointer era still
`v1`; `task548-consumer-cutover-resume` rejects a missing/mismatched facade
deployment (`servingBuildSha256`), rollout receipt for that build, consumer
declaration, or any DB cutover state other than EXACTLY `v2_activated` (and
any active pointer era other than EXACTLY `v2`) before
any 04/05/06 dispatch; no phase replays another phase's leaves and no phase
trusts prior-process memory. They also pin nonterminal status through
final drift, owner-scoped non-metadata loopback, substantive
read-only final drift after owner-resume parity but before closeout on
`frozen`, and only mechanical metadata-delta validation after terminal
metadata. Replay fixtures prove a pre-metadata crash remains `frozen` and reruns
final drift, while a post-changelog crash returns `metadata_recovery` and skips
smoke/final drift. A non-pass final drift returns the exact owner-retirement
payload, performs no deletion/unstage itself, rejects wrong/partial eleven-path
retirement, and requires only the `retirement-restart invocation` mode.
Fixtures prove restart argv is read before every other workflow action,
the same-owner confirmation is first, exact absent index/worktree inventory and
an absent/empty no-symlink directory precede a new current-tree drift; only its
fresh findings derive affected owners/fixes/gates/prerelease, while old findings
and retired evidence remain unread,
bootstrap/authoring/full implementation and closure resume are not called, the
retired checkpoint/evidence is never accessed or mutated, and the normal
args-absent first-implementation order remains byte-for-byte unchanged. That
invocation ends at its new prerelease audit/owner release-branch pause. Only a separate
verified release-resume process may run smoke and fresh no-overwrite phase 1.

Evidence tests require only
`_docs/_workflows/_smoke/evidence/task-548/task-548-certification/`, exact
report/manifest/checkpoint/screenshot
inventory with split byte ownership, phase1 `owner_action_required`,
owner-stage pause, exact workflow-bound resume, tracked parity, metadata-only
delta and invalidation on any later non-metadata mutation. They prove 07 alone
writes no release/deployment state, the prerelease release action terminates,
release-resume and closure-resume are distinct fresh processes, and no
pre-pause payload authorizes either. They prove 07 alone writes manifest/eight
screenshots; only committed, clean `_docs/_workflows/task-548-implement.mjs`
derived from its `import.meta.url` after exact-six gates may invoke TASK-545 phase
1 and write the checkpoint. Caller override/untracked/dirty/wrong-task/symlink
entries fail. Final drift blocks every terminal write, and phase 1 has zero
pre-pause task/changelog/board/status writes; the TASK-545 bootstrap-receipt gate
immediately precedes the exact ten-key phase-1 call, which immediately returns owner action,
and has no later action. Closeout accepts TASK-545's returned `none|file-only|both`
identity. Child-process kills cover every journal/temp write, fsync, rename and
directory-fsync boundary: stale-artifact cleanup restarts none, file-only finishes
the index once, both validates, and index-only/corrupt/multiple fail. UTC rollover
after the changelog write keeps its date. Tests also reject wrong identity/bytes,
invented history, dynamic final-drift serialization and unavailable payloads. The final
delta is returned by 07, emitted exactly once by 08, and never persisted. The exact TASK-545 manifest rejects audit, bundle, network,
cleanup, or summary fields and no summary evidence file may exist. Legacy
acceptance/workflow evidence paths fail. This child never edits changelog,
status, canonical evidence, or screenshot/checkpoint bytes.

The canonical line-gate contract cases — every line-gate extraction and
disposable temp-repo execution case — are owned by the existing bootstrap
`tests/unit/workflows/task548WorkflowContracts.test.ts` (one of the exact six
bootstrap files listed under Exclusive Ownership; there is NO separate
`tests/unit/workflows/task548LineCountGateContract.test.ts` and no seventh
bootstrap writer/file). That file must:

- enumerate the exact 26 `_docs/_TASKS/TASK-548*.md` files from the repository
  glob, extract exactly one canonical NUL-safe line-count block per file (from
  the `# Canonical NUL-safe line-count gate over the leaf write set` comment
  through its `exit "$failed"` line), assert exactly one block per file, and
  prove all 26 extracted blocks are byte-identical modulo markdown
  indentation; each block must pin
  `TASK_FAMILY_BASELINE_SHA="963733cae23456622bea1eef1b734723aaab2350"`,
  validate the baseline with
  `git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}"` before inventory,
  union the NUL-safe diff/untracked inventory over exactly
  `core packages scripts tests _docs/_workflows`, filter only the human-authored
  TS/JS extensions plus the `*.generated.{ts,tsx,js,jsx,cjs,mjs,mts,cts}`
  exemptions, and
  contain no pre-repair baseline placeholder literal;
- execute the extracted gate in disposable `mktemp -d` Git fixtures (never the
  real worktree, which must stay byte-identical before/after), substituting a
  fixture baseline commit SHA for the pinned SHA in the extracted bytes, and
  prove: a tracked human-authored file of exactly 1,000 lines passes (exit 0);
  a tracked file of 1,001 lines fails with an `OVER-LIMIT` offender line
  (exit 1); an untracked 1,001-line file fails; a path containing spaces is
  inventoried and counted correctly; a 1,001st final line without a trailing
  newline still fails; a tracked human-authored `.mts` file of 1,001 lines
  fails with an `OVER-LIMIT` offender line; a tracked human-authored `.cts`
  file of 1,001 lines fails with an `OVER-LIMIT` offender line;
  `*.generated.ts`/`*.generated.tsx`/`*.generated.js`/`*.generated.jsx`/
  `*.generated.cjs`/`*.generated.mjs`/`*.generated.mts`/
  `*.generated.cts` files over 1,000 lines remain exempt; a file over 1,000
  lines under `_docs/_workflows` fails; and an invalid or missing baseline SHA
  fails at the `git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}"` step
  before any inventory/counting output. Fixture cleanup removes only the owned
  `mktemp -d` directories.

## Documentation Updates Required

Keep all task-specific wrappers/modules/tests tracked in clean checkout. Only 07
serializes the canonical report/manifest/eight screenshots and deterministic closeout;
TASK-545 phase 1 alone serializes the checkpoint. Closeout uses only the durable
sources above and does not claim absent runtime history. This child edits no
shared product docs, evidence, task status, or changelog.
