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
drift audit, sequential implementation dispatch, exact final validation,
three-session runtime-smoke verification, post-closure lenses and final drift
evidence. This child changes workflow/evidence files only and never edits
package, installer, generator, CLI, product UI/source or product test contracts.

**Single-writer ownership:** `_docs/_workflows/task-547-*.mjs`, private
`_docs/_workflows/lib/task-547-*.mjs` modules and distinct
`_docs/_workflows/_smoke/task-547/audit-evidence/*`. TASK-547-06 exclusively
writes screenshots and the scenario manifest; this child only verifies their
hashes read-only and writes separate audit evidence.

The three workflow entrypoints are exactly `task-547-author-audit.mjs`,
`task-547-implement.mjs` and `task-547-fix.mjs`. Cohesive reference-manifest,
ownership, operational-access, safe-file, repository-guard, bounded-audit,
phase-scope, private-result-transport, final-validation, full-PNG, typed public
smoke, Form Design smoke and Page Editor smoke helpers live under
`lib/task-547-*.mjs`. Each entrypoint and ownership helper derives the
repository root from its own module location; only the operator-owned temporary
host names the active worktree when launching Codex.

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
- The orchestrator does not scan the main repository or probe any TASK-540
  worktree. It reads only the twelve pinned reference files above. TASK-540 is
  enforced lexically in prompts/owned-path declarations and by the explicit
  Codex sandbox; the workflow makes no filesystem-observation claim about that
  forbidden sibling.
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
  227 executable-leaf declarations plus the 19-path TASK-547-07 process bucket,
  exactly 246 declarations, and checks every pair including directory/child
  overlap. Workflow scripts and self-tests derive that total from the canonical
  map and pin the current expected count so missing or extra declarations fail.
  `SINGLE_WRITER_SYMBOL_MAP` separately pins
  `scripts/projekty-domow/content/buildFormaDomContentResources.ts::buildFormaDomContentResources`
  to TASK-547-03-L03 and
  `scripts/projekty-domow/pages/index.ts::buildFormaDomPages` plus
  `scripts/projekty-domow/pages/shared.ts::*` to TASK-547-04-L01. Every other leaf
  receives these paths as forbidden/read-only. The symbol map documents seams;
  it never replaces or transfers path ownership.
  `core/services/pages/pageRuntimeBindingContract.ts` and
  `tests/vitest/pages/page-data-block-presentation.test.tsx` are likewise owned
  by TASK-547-04-L01; TASK-547-04-L03 consumes the binding contract read-only.
- Missing agent output is a failed audit round, never a clean pass.
- Every dispatch passes an explicit `read-only` or `workspace-write` intent;
  the host rejects a missing/unknown intent instead of inferring authority from
  a label. Audits, verification and start gates are read-only. Owned mutations
  and command-executing zero-delta regates are workspace-write; the full
  command-validation
  lane is explicitly workspace-write because build/test tools may need their
  own temporary or ignored artifacts, while its owned repository delta remains
  empty and guarded. The schema and full structured response live in a fresh
  mode-`0700` private per-call directory through the repository-owned,
  self-tested `task-547-result-transport.mjs`; the host rejects redirected,
  symlinked, multiply-linked or oversized results, opens with `O_NOFOLLOW`,
  verifies stable identity, bounds/redacts JSON, normalizes the direct result
  to mode `0600` and always removes the per-call directory. Only the exact
  documented DB source prefix may survive redaction inside final-validation
  `argv`; no environment value can. A separate mode-`0700` private run-level
  directory receives exclusive mode-`0600` sanitized diagnostic copies. A
  successful finding-free run removes the run-level directory automatically.
  A successful run that
  encountered any structured HIGH/MEDIUM/LOW finding retains it for review
  (including remediated earlier-round H/M and residual LOW), while failure
  retains it for the current remediation review; the operator removes it
  immediately after review or before the corrected fresh rerun.
  Git commands run with global/system config disabled, optional locks disabled
  and terminal prompting disabled so observation does not refresh or mutate the
  index.
- The current nested executor cannot create a Bubblewrap namespace. The host
  therefore explicitly enables Codex's deprecated `use_legacy_landlock`
  backend for both sandbox intents; a same-model/effort read-only shell probe
  must return `READ_OK` before a full run. This is a sandbox-backend fallback,
  not `danger-full-access` or approval bypass. Record it in closeout evidence
  and remove the flag once the runtime provides a working supported sandbox.
- These guards prove repository mutations and the twelve pinned reference
  identities. They do not claim filesystem observation of TASK-540, arbitrary
  ignored paths outside the scoped TASK-547 trees or every external read;
  explicit prompt policy and the host sandbox remain the control for those
  residuals. Evidence must state that boundary rather than report broader
  enforcement.

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
- implementation drift: `preclosure-drift.json` and `final-drift.json`;
- each complete ordered final-command pass:
  `final-validation-<phase-slug>.json`;
- five post-closure lenses:
  `post-closure-<lens-slug>-round-<n>.json`;
- final task-graph/closeout pass: `final-consistency.json`;
- all three screenshot/manifest verification sets:
  `smoke-manifest-hashes.json`.

`<task-file-slug>` and `<lens-slug>` are lowercase ASCII slugs from the frozen
input lists, not agent-provided filenames. The orchestrator schema-validates,
redacts secrets/absolute forbidden-root paths/submission data, canonicalizes key
order, and atomically writes each file. Re-running the same phase replaces only
its exact deterministic file; filenames use no timestamps or random suffixes,
and no raw agent output is written. Required final-command start/end timestamps
remain structured JSON fields.

Post-closure audits use five independent lenses after terminal task/changelog
closure and a complete final-manifest rerun: exact pinned-reference
fidelity; strict model/native/fail-closed behavior; ledger/saga/rollback and
cross-stream safety; present-only/byte identity/determinism; and test integrity/
visible runtime/security/cleanup. Reference-sensitive lenses compare public copy,
facts, prices, contact data, project taxonomy/order, form strings, SEO, design
tokens and declared residual IDs directly with the pinned source. Every lens
reports all HIGH/MEDIUM/LOW findings. Any finding reopens the scoped fixer,
complete final manifest, three-session smoke when invalidated and terminal
closeout, then restarts all five lenses from lens one. Zero LOW is required;
TASK-9999 deferral is not used by this workflow.

Every finding is bounded and sanitized before it can be forwarded to a fixer.
It must carry one or more repository-relative `file:line` anchors and may not
contain traversal, absolute paths, secret-like filenames, raw logs, credentials,
submission/user data or control characters. Summary/area/finding/evidence/
recommendation byte limits are schema- and runtime-enforced. The host supplies
each auditor with exact HEAD OID/ref plus dirty tracked/untracked/scoped-ignored
counts, digests and bounded redacted paths; auditors do not inspect `.git`.

The public smoke validator requires the exact TASK-547-06 root
`{reference,preflight,scenarios,consoleErrors,pageErrors,screenshots,failures,pass}`,
exact reference digest, port/restart/admin/front preflight and eight ordered
scenario objects. Typed semantic expectations own every assertion value,
including the ordered contact
`contact-reference-native-presentation` proof: exactly four nonblank Polish
stage options, first/default `Mam działkę`, no blank prompt, five textarea rows,
and visible pending label `Wysyłanie...`. The ordered `aurora-detail` contract
also pins `aurora-six-slug-eligibility` (Aurora 200 with exact metadata/body and
canonical resolved as `new URL("/projekty/aurora",
"http://127.0.0.1:3000").href`, plus five exact 404 objects with
`status:404`, `resolverOutcome:"detail_not_found_before_metadata"` and empty
`resolvedDetailDocumentKeys`, `renderedProjectDetailRootSelectors`,
`renderedProjectDetailBlockIds`, `installedProjectTitleMatches`,
`installedProjectDetailCorpusMatches`, `dynamicDetailSeoTitleMatches`,
`dynamicDetailSeoDescriptionMatches` and `canonicalHrefs`). Those closed scans
cover the complete renderer root registry, all seven project-detail block IDs,
all six installed titles, the full TASK-547-03-L01 project corpus,
TASK-547-03-L02 static detail/CTA corpus and every installed dynamic detail SEO
pair; neutral generic 404 copy remains allowed. The same assertion pins material
primary/secondary hero IDs with `8/12/12` and `4/12/12` spans, `xl` minimum
height, resolved theme backgrounds and nonzero rectangles, and exact CTA
`{label:"Chcę podobny dom",href:"/kontakt",
previousBlock:"project-statistics",nextBlock:"project-assumptions"}`. The
ordered `contact-form` contract pins the exact installed internal mount for a
coherent session with `forms:write`, valid CSRF, `admin_write` and accepted
outcome; an API key with `forms.submit`, non-applicable cookie CSRF,
`admin_write` and accepted outcome; and anonymous 401 with
`createdSubmissionIds:[]`. Separate strict manifests cover five
`wf547formdesign` flows and the current five `wf547pageeditor` flows from
TASK-547-04-L01. Before each run the orchestrator captures predecessor
identity/hash, removes only the exact 21 smoke-owned outputs, proves an empty
fixed-path baseline, then accepts only newly created artifacts whose identity
and hash differ from any predecessor. Every PNG is fully decoded with
signature/chunk order/length/CRC/IHDR/IDAT/IEND/scanline validation; all 18
screenshots are byte-distinct and their manifest hashes/dimensions match bytes.

## Security Contract

No endpoint or permission changes. Audit prompts are read-only, never receive the
`.env` operational rule, and must exclude
secrets, credentials, private keys, raw sensitive logs, submission payloads and
unredacted user data. Implementation/fix/smoke prompts may source `.env` only
through the exact command above and must never expose or persist its contents.
Structured findings contain bounded repository-relative file/line evidence only.
Final command records contain exact pinned `argv`, ISO start/end, zero exit,
`pass:true` and redacted stdout/stderr byte counts, never raw diagnostics.
Public/Form Design/Page Editor smoke evidence contains only normalized URLs,
material live observations, hashes/dimensions and empty error arrays; live Page,
Form and submission IDs are redacted. Each of the three smoke submission
sets pre-registers every submission marker and immediately attaches every
returned ID in one outer cleanup ledger. One fresh temporary evidence directory
per session is atomically registered in the same ledger. Every entry is deleted
independently and idempotently in `finally`, and zero-row/zero-directory
receipts are verified before evidence is written.

## Implementation Pseudocode

```ts
for (let round = 1; round <= 5; round += 1) {
  let perFile = await runParallelContractAuditsWithMandatoryAfterGuard(
    TASK_547_TASK_FILES, hostCapturedHeadAndDirtyProvenance(),
  );
  assertEveryAuditReturned(perFile);
  let reconcile = await runReadOnlyReconcileWithMandatoryAfterGuard({
    pathOwnership: SINGLE_WRITER_PATH_MAP,
    symbolOwnership: SINGLE_WRITER_SYMBOL_MAP,
    sharedShapes: PACKAGE_RESOURCE_KINDS,
    landOrder: LEAF_LAND_ORDER,
    changelog: 1260,
  });
  const perFileFindings = collectAllHighMediumLow(perFile);
  if (perFileFindings.length > 0) {
    await runSanitizedPerFileFixers(perFileFindings);
    reconcile = await runFreshReadOnlyReconcile(); // never forward stale reconcile
  }
  const crossFindings = collectAllHighMediumLow([reconcile]);
  if (crossFindings.length > 0) {
    await runSanitizedCrossFileFixer(crossFindings);
  }
  writeRedactedRoundEvidenceDeterministically(
    round, perFile, reconcile, perFileFindings, crossFindings,
  );
  if (round === 5 && perFileFindings.length + crossFindings.length > 0) {
    throw new Error("Contracts changed in round 5; restart all five fresh rounds");
  }
}
const finalReconcile = await assertFinalFreshReconcilePass();
assertNoHighMediumLow(finalReconcile);
writeRedactedEvidence("final-reconcile.json", finalReconcile);
```

```ts
for (const leaf of LEAF_LAND_ORDER.slice(0, -1)) {
  await implementExactlyOwnedLeaf(leaf);
  await runDependencyShapedLeafGate(leaf);
}
await prepareAcceptanceOnly(TASK_547_06_ACCEPTANCE_PATHS);
await remediateFreshPreclosureAuditToZeroFindings();
await runCompleteFinalManifestWorkspaceWrite("pre-smoke");
await runThreeSessionSmokeWithGuaranteedCleanup({
  public: "wf547smoke",
  formDesign: "wf547formdesign",
  pageEditor: "wf547pageeditor",
  registerEachSubmissionImmediately: true,
  registerEveryTemporaryDirectoryImmediately: true,
  freezeValidatedBytesBeforeCleanupAndWriteOnlyAfterEquality: true,
  proveAllRegisteredResourcesAbsentBeforeEvidence: true,
});
await prepareDraftCloseoutWithoutTerminalStatuses();
await runCompleteFinalManifestWorkspaceWrite("post-draft-closeout");
await remediateFreshFinalDrift({
  afterEveryMutation: [runCompleteFinalManifestWorkspaceWrite, rerunThreeSessionSmoke],
});
await terminalizeDescendantsThenParentsAndUpdateBoardLast();
await runCompleteFinalManifestWorkspaceWrite("terminal-closure");

for (let round = 1; round <= 4; round += 1) {
  const lenses = await runFiveFreshIndependentPostClosureLenses();
  if (collectAllHighMediumLow(lenses).length === 0) break;
  if (round === 4) throw new Error("post-closure drift did not converge");
  await runPhaseScopedFixersWithRealDeltas(lenses);
  await runCompleteFinalManifestWorkspaceWrite(`post-closure-${round}`);
  await rerunThreeSessionSmoke();
  await refreshTerminalCloseout();
  await runCompleteFinalManifestWorkspaceWrite(`closeout-${round}`);
}
await runAndPersistFinalTaskGraphConsistency();
await repeatReadOnlyConsistencyAgainstCompleteEvidenceTree();
```

```ts
async function runStandaloneFix(request: FixRequest) {
  const finding = sanitizeBoundedAnchoredFinding(request.finding);
  const origin = validateOriginatingAuditIdentity(request.originatingAudit);
  const before = await rerunSameLens(origin);
  assertExactFindingReproduced(before, finding);
  const scope = resolveOneCurrentPhaseScope(finding); // acceptance/docs; never smoke
  const delta = await fixOnlyOwnedPaths(scope, finding);
  assertNonEmptyExactDelta(delta);
  await runInvalidatedDependencyGates(request.invalidatedTests);
  await runCompleteFinalManifestWorkspaceWrite("standalone-fix");
  const after = await rerunSameLens(origin);
  assertOriginatingFindingAbsent(after, finding);
  return explicitRemainingFindingHandoffs(after);
}
```

**Data flow:** host-captured HEAD/ref + bounded dirty summaries + current
task/source/docs/tests/reference digests → strict structured read-only audits →
sanitized anchored findings → single-writer/current-phase fixes → exact observed
delta → dependency gates → complete ordered final manifest → three typed smoke
manifests and decoded PNGs → draft/final closeout → five clean post-closure
lenses → final task graph.

**Error handling:** false-clean, timeout, malformed output, missing result or any
post-invocation guard failure fails the round. Round-five blockers are fixed only
to leave a coherent tree, then force a complete five-round restart; they never
fall through to final reconcile. Do not implement from stale audit evidence
after any contract change. A generic TASK-547-06 fixer never receives the
combined acceptance/smoke/closeout bucket: evidence resolves to exactly one
current phase; smoke findings invoke only the dedicated three-session refresh.
A standalone fix that makes no actual delta, does not reproduce the originating
finding or leaves that finding in the fresh same-lens audit fails. Any final-tree
mutation invalidates the complete final manifest; runtime-affecting or smoke
findings also invalidate all three smoke sets. HIGH/MEDIUM/LOW are all
unresolved until removed.

**Regression-test shape:** workflow smoke proves all-results guard, five
sequential rounds, reconcile invocation, round-five restart, the complete
246-declaration
collision map, strict/unique/exact `changedPaths`, forbidden-path enforcement,
mandatory post-call verification after a thrown invocation, result schema and
non-zero exit on false-clean. Synthetic Git tests use a temporary repository and
prove HEAD/ref, raw-index/stage/flag, byte, mode, type and scoped-ignored-path
detection. Synthetic safe-file tests use no real secret and
prove a direct-file happy path, secret-like rejection before filesystem access,
final/dangling/parent-directory symlink rejection and safe atomic evidence
writes. Private-result tests reject redirects/symlinks/hard links and prove
bounded redaction plus the single exact DB-source `argv` exception. Audit tests
reject missing anchors, traversal, absolute/secret-like paths and oversize text.
Final-manifest tests reject missing, duplicate, reordered, weakened or
unexecuted commands and malformed timestamps/diagnostic records. Phase-scope
tests reject mixed acceptance/closeout evidence and smoke writes through a
generic fixer. Smoke-schema self-tests reject generic/string/boolean proxy
observations, wrong/reordered per-scenario IDs, wrong SEO/content/filter/
lifecycle/CAPTCHA/native-presentation values, unsafe detail-slug eligibility,
late resolver outcome and each of the eight closed 404 arrays independently
made nonempty, shallow hero-art geometry, wrong Aurora CTA, weakened internal
session/API-key security or anonymous persistence,
stale/pseudo/corrupt/trailing-byte PNGs,
mismatched metadata, an incomplete zero-row/zero-directory cleanup receipt,
repeated screenshot bytes and any console/page error.
The public manifest pins eight flows, Form Design pins five, and Page Editor pins
the current five TASK-547-04-L01 flows. Each validator requires the exact
normalized URL/viewport/semantic assertion matrix owned by its helper.

## Sub-Tasks

- [x] Add `task-547-author-audit.mjs` with five sequential rounds.
- [x] Add exact `task-547-implement.mjs` and `task-547-fix.mjs` dispatch scripts
  with per-child gates and derived-root/forbidden-root assertions.
- [x] Add workflow smoke fixtures and all-results/collision assertions.
- [ ] Record fresh pre-implementation and final drift evidence.
- [ ] Preserve final Playwright screenshot manifest hashes from the new smoke run.

## Testing Requirements

- `node --check _docs/_workflows/task-547-author-audit.mjs`
- `node --check _docs/_workflows/task-547-implement.mjs`
- `node --check _docs/_workflows/task-547-fix.mjs`
- `for file in _docs/_workflows/lib/task-547-*.mjs; do node --check "$file"; done`
- `node _docs/_workflows/task-547-author-audit.mjs --self-test`
- `node _docs/_workflows/task-547-implement.mjs --self-test`
- `node _docs/_workflows/task-547-fix.mjs --self-test`
- `node _docs/_workflows/lib/task-547-final-validation-contract.mjs`
- nested read-only sandbox probe with preserved
  `--enable use_legacy_landlock` and exact `READ_OK`;
- synthetic repository/index/mandatory-after, safe-file/result-transport,
  audit-anchor/phase-scope, semantic public/Form Design/Page Editor,
  full-PNG/fresh-artifact and false-clean negative tests;
- task graph/H1/FileName/parent/status/changelog/statistics audit;
- baseline-to-final touched production/test physical-line counts and
  workflow-owned file counts, all at most 1,000.

The sole final manifest is
`lib/task-547-final-validation-contract.mjs`. Its current 21 ordered records
cover all TASK-547-01..05 targeted Vitest/Bun paths, bounded pass/fail-only
database reachability, the three explicit serial 360,000 ms DB acceptance
commands, core lint/types, `bun run lint:repo:types`, root tests, precommit,
Coderso gates, strict security scan, site build, canonical generator
byte/zero-diff, touched-file line counts, `git diff --check`, syntax and all
three workflow entrypoint self-tests. Each record returns the exact pinned
three-element `argv`, ISO start/end, zero exit, `pass:true` and redacted
diagnostic byte counts. Missing, duplicate, reordered, skipped, weakened or
non-zero records fail.

## Documentation Updates Required

Record audit summaries that materially changed the contract in TASK-547 and
changelog 1260 at closure.
