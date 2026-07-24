# TASK-547-07: Multi-Agent Workflow and Drift Evidence
# FileName: TASK-547-07-Multi-Agent-Workflow-And-Drift-Evidence.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Workflow / Audit / Collision Safety
**Estimated Effort:** Medium
**Dependencies:** None; runs throughout TASK-547
**Status:** 🚧 In Progress
**Validation:** Workflow scripts remain implemented; current-tree audit evidence,
post-audits and final screenshot hashes are pending regeneration.

---

## Overview

Own the reproducible TASK-547 multi-agent orchestration, five-round contract
drift audit, implementation dispatch/gates, post-audit lenses and final smoke
evidence. This child changes workflow/evidence files only and never edits package,
installer, generator, CLI, or product test contracts.

**Single-writer ownership:** `_docs/_workflows/task-547-*.mjs`, private
`_docs/_workflows/lib/task-547-*.mjs` modules and distinct
`_docs/_workflows/_smoke/task-547/audit-evidence/*`. TASK-547-06 exclusively
writes screenshots and the scenario manifest; this child only verifies their
hashes read-only and writes separate audit evidence.

The three workflow entrypoints are exactly `task-547-author-audit.mjs`,
`task-547-implement.mjs` and `task-547-fix.mjs`. Cohesive reference-manifest,
ownership, operational-access, safe-file, repository-guard and smoke-schema
helpers live under `lib/task-547-*.mjs`, including
`lib/task-547-git-guard.mjs`. Each
entrypoint and ownership helper derives the repository root from its own module
location; no module hardcodes this or any previous worktree path.

## Reference Provenance

The only main-repository access permitted to a contract-audit agent is read-only
access to these exact files under
`/home/coder/project/Coderso/_docs/projekty-domow-wow-site/`:
`README.md`, `index.html`, `oferta.html`, `projekty.html`, `proces.html`,
`cennik.html`, `o-nas.html`, `kontakt.html`, `projekt-aurora.html`,
`assets/app.js`, `assets/styles.css`, and `assets/favicon.svg`.

Their individual SHA-256 values are pinned in
`lib/task-547-reference-manifest.mjs`. Hashing the ordered `sha256sum` output
yields `d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e`.
The orchestrator verifies all twelve direct regular files before and after every
agent dispatch and fails closed on absence, redirection or byte drift. Evidence
persists only the logical label `projekty-domow-wow-site` and aggregate digest,
never the absolute path or raw reference contents.

Implementation, fixer and smoke agents receive one additional operational rule
which auditors never receive: only for a DB-backed test or dev-server command,
they may execute exactly
`set -a && source /home/coder/project/Coderso/.env && set +a`. They must never
inspect/read the file directly, copy it, print/log its contents, hash it, persist
it, store it as evidence or pass its values outside the authorized DB/dev
process. `.env` is neither reference evidence nor a worktree input, and its path
or contents never join audit digests.

## Collision Guards

- Forbidden product paths: every file owned by TASK-547-01..06.
- Contract-audit dispatches forbid all other `/home/coder/project/Coderso` paths.
  Implementation/fix/smoke dispatches forbid them too except for the exact
  source-only `.env` operation above. Every dispatch forbids all
  `/home/coder/project/Coderso-task540*` paths; the active worktree root is
  derived from the workflow module location.
- The orchestrator does not scan the main repository. It reads only the twelve
  pinned reference files above and performs redacted existence/canonical-collision
  sentinel checks for TASK-540 worktrees.
- Every reference, smoke-artifact and deterministic-evidence read/hash uses
  `lib/task-547-safe-files.mjs`: reject secret-like lexical names before any
  filesystem access; `lstat` every path component; reject final and parent
  symlinks/non-regular files; require canonical-root containment; open with
  `O_NOFOLLOW`; compare pre-open/opened/named identities; read through the file
  handle and reject mid-read drift. Reference and smoke validators return the
  bytes/hashes they verified, so later persistence never reopens a path.
  `lib/task-547-git-guard.mjs` applies the same direct-descriptor,
  no-follow/identity checks to repository state while deliberately recording
  only metadata plus index identity for secret-like repository names.
- Deterministic evidence writes validate every parent as a direct in-root
  directory, use an exclusive `O_NOFOLLOW` task-owned temporary regular file,
  flush/close it and atomically rename it over only the exact evidence target.
  A pre-existing target symlink is rejected rather than followed.
- Changelog 1260 is pinned; only TASK-547-06 edits task/changelog closeout.
- Each implementer receives an explicit owned-file list and reads current on-disk
  shared seams before editing.
- Every author, implementation, audit and fixer dispatch runs through the shared
  mandatory-after guard. It captures state before invocation and always captures
  and compares state after invocation, including when the host call, agent,
  structured-output schema or result validator throws. If invocation and guard
  both fail, both errors remain available in one aggregate error.
- The repository guard pins HEAD object and symbolic ref, the raw index plus
  stage and flag views, and the type, mode and content identity of every tracked,
  non-ignored untracked and explicitly scoped TASK-547 ignored path. It rejects
  staging, commits, ref switches, file/symlink/type swaps, executable-bit drift
  and byte drift outside the exact owned mutation. Returned `changedPaths` are
  unique strict repository-relative paths and must equal the observed delta;
  read-only calls return an empty array. Directory ownership, the dynamic
  changelog-1260 declaration and required-output checks remain enforced after
  that exact-delta comparison.
- The frozen `LEAF_LAND_ORDER` is exactly `547-01-L01`, `547-01-L02`,
  `547-02-L01`, `547-02-L02`, `547-02-L03`, `547-03-L01`, `547-03-L02`,
  `547-03-L03`, `547-04-L01`, `547-04-L02`, `547-04-L03`, `547-05-L01`,
  `547-06-L01`. `LEAVES` derives from that sequence, and the executable-leaf
  portion of `SINGLE_WRITER_PATH_MAP` contains the current source/test/closure
  paths declared by those 13 leaf contracts. The complete collision audit covers
  214 executable-leaf declarations plus the 11-path TASK-547-07 process bucket,
  exactly 225 declarations, and checks every pair including directory/child
  overlap. Workflow scripts and self-tests derive that total from the canonical
  map and pin the current expected count so missing or extra declarations fail.
  `SINGLE_WRITER_SYMBOL_MAP` separately pins
  `scripts/projekty-domow/content/buildFormaDomContentResources.ts::buildFormaDomContentResources`
  to TASK-547-03-L03 and
  `scripts/projekty-domow/pages/index.ts::buildFormaDomPages` plus
  `scripts/projekty-domow/pages/shared.ts::*` to TASK-547-04-L01. Every other leaf
  receives these paths as forbidden/read-only. The symbol map documents seams;
  it never replaces or transfers path ownership.
- Missing agent output is a failed audit round, never a clean pass.
- Every dispatch passes an explicit `read-only` or `workspace-write` intent;
  the host rejects a missing/unknown intent instead of inferring authority from
  a label. Audits, verification, start gates and zero-write regates are
  read-only. Owned mutations are workspace-write; the full command-validation
  lane is explicitly workspace-write because build/test tools may need their
  own temporary or ignored artifacts, while its owned repository delta remains
  empty and guarded. The schema and full structured response live in a fresh
  private per-call temporary directory; the host rejects a redirected result,
  normalizes the direct Codex result file to mode `0600` before read and always
  removes this per-call directory. A separate private run-level directory
  receives exclusive mode-`0600` diagnostic copies. Success removes the
  run-level directory automatically; failure retains it only for the current
  remediation review and the operator removes it immediately afterward.
  Git commands run with global/system config disabled, optional locks disabled
  and terminal prompting disabled so observation does not refresh or mutate the
  index.
- These guards prove repository mutations, the twelve pinned reference
  identities and TASK-540 existence/canonical-collision sentinels. They do not
  claim cryptographic observation of arbitrary ignored paths outside the scoped
  TASK-547 trees or of every external read; prompt policy and the host sandbox
  remain the control for those residuals. Evidence must state that boundary
  rather than report broader enforcement.

## Audit Evidence Contract

TASK-547-07's local orchestrator process is the sole evidence writer. Child
stdout is ignored. Each dispatched agent returns its structured result through
the host-designated direct regular file in a private per-call temporary
directory; the host parses it, optionally retains a private diagnostic copy for
the current review, and agents cannot write
`_docs/_workflows/_smoke/task-547/audit-evidence/`.

Evidence filenames are deterministic and collision-free:

- `round-01` through `round-05`: `round-NN-per-file-<task-file-slug>.json`,
  `round-NN-reconcile.json` and `round-NN-fixes.json`;
- final contract pass: `final-reconcile.json`;
- post-implementation lenses: `post-audit-<lens-slug>.json`;
- final drift pass: `final-drift.json`;
- screenshot verification only: `smoke-manifest-hashes.json`.

`<task-file-slug>` and `<lens-slug>` are lowercase ASCII slugs from the frozen
input lists, not agent-provided filenames. The orchestrator schema-validates,
redacts secrets/absolute forbidden-root paths/submission data, canonicalizes key
order, and atomically writes each file. Re-running the same phase replaces only
its exact deterministic file; no timestamps, random suffixes or raw agent output
are written.

Post-implementation audits use five independent lenses: exact pinned-reference
fidelity; strict model/native/fail-closed behavior; ledger/saga/rollback and
cross-stream safety; present-only/byte identity/determinism; and test integrity/
visible runtime/security/cleanup. Reference-sensitive lenses compare public copy,
facts, prices, contact data, project taxonomy/order, form strings, SEO, design
tokens and declared residual IDs directly with the pinned source.

## Security Contract

No endpoint or permission changes. Audit prompts are read-only, never receive the
`.env` operational rule, and must exclude
secrets, credentials, private keys, raw sensitive logs, submission payloads and
unredacted user data. Implementation/fix/smoke prompts may source `.env` only
through the exact command above and must never expose or persist its contents.
Structured results contain file/line evidence only.

## Implementation Pseudocode

```ts
for (let round = 1; round <= 5; round += 1) {
  const perFile = await runParallelContractAuditsWithMandatoryAfterGuard(
    TASK_547_TASK_FILES,
  );
  assertEveryAuditReturned(perFile);
  const reconcile = await runReadOnlyReconcileWithMandatoryAfterGuard({
    pathOwnership: SINGLE_WRITER_PATH_MAP,
    symbolOwnership: SINGLE_WRITER_SYMBOL_MAP,
    sharedShapes: PACKAGE_RESOURCE_KINDS,
    landOrder: LEAF_LAND_ORDER,
    changelog: 1260,
  });
  const findings = collectHighMedium(perFile, reconcile);
  if (findings.length) {
    await runScopedFixersWithMandatoryAfterGuard(findings);
  }
  writeRedactedRoundEvidenceDeterministically(round, perFile, reconcile, findings);
  if (round === 5 && findings.length) {
    throw new Error("Contracts changed in round 5; restart all five fresh rounds");
  }
}
const finalReconcile = await assertFinalFreshReconcilePass();
writeRedactedEvidence("final-reconcile.json", finalReconcile);
```

**Data flow:** current HEAD/status/diff + task/source/docs/tests → structured
read-only audits → verified findings → scoped fixes → fresh audits.

**Error handling:** false-clean, timeout, malformed output, missing result or any
post-invocation guard failure fails the round. Round-five blockers are fixed only
to leave a coherent tree, then force a complete five-round restart; they never
fall through to final reconcile. Do not implement from stale audit evidence
after any contract change.

**Regression-test shape:** workflow smoke proves all-results guard, five sequential
rounds, reconcile invocation, round-five restart, the complete 225-declaration
collision map, strict/unique/exact `changedPaths`, forbidden-path enforcement,
mandatory post-call verification after a thrown invocation, result schema and
non-zero exit on false-clean. Synthetic Git tests use a temporary repository and
prove HEAD/ref, raw-index/stage/flag, byte, mode, type and scoped-ignored-path
detection. Synthetic safe-file tests use no real secret and
prove a direct-file happy path, secret-like rejection before filesystem access,
final/dangling/parent-directory symlink rejection and safe atomic evidence
writes. Smoke-schema self-tests reject string-only scenarios, boolean-only
observations, wrong per-scenario assertion IDs, mismatched PNG metadata, stale
artifacts and any console error. They also reject any home switcher evidence
whose exact target is not `[role="tablist"]` or whose expected/observed value is
not `Wybór stylu domu`.

## Sub-Tasks

- [x] Add `task-547-author-audit.mjs` with five sequential rounds.
- [x] Add exact `task-547-implement.mjs` and `task-547-fix.mjs` dispatch scripts
  with per-child gates and derived-root/forbidden-root assertions.
- [x] Add workflow smoke fixtures and all-results/collision assertions.
- [ ] Record fresh pre-implementation and final drift evidence.
- [ ] Preserve final Playwright screenshot manifest hashes from the new smoke run.

## Testing Requirements

- workflow script syntax/unit smoke
- task graph/H1/FileName/parent/status audit
- forbidden-path collision smoke
- structured-output false-clean smoke
- touched-file line counts

## Documentation Updates Required

Record audit summaries that materially changed the contract in TASK-547 and
changelog 1260 at closure.
