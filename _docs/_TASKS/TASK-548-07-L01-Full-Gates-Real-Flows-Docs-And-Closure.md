# TASK-548-07-L01: Full Gates, Real Flows, Docs and Closure
# FileName: TASK-548-07-L01-Full-Gates-Real-Flows-Docs-And-Closure.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-07
**Priority:** Critical
**Category:** QA / Runtime Smoke / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** TASK-545 `✅ Done` and TASK-547 terminal before any
implementation;
the TASK-548 parent amended after TASK-547 with every literal final overlapping
user/developer/shared-doc path and serialized owner; TASK-548-05-L02,
TASK-548-06-L02; TASK-548-08 phased post-audit/final-drift handoffs
**Status:** ⏳ To Do
**Changelog:** 1261 (exclusive writer)

---

## Overview

Execute the dependency-shaped acceptance matrix, eight named real browser
flows, strict security/full gates, documentation updates, and final
descendant-first TASK-548 closure. This leaf is validation and closeout only:
implementation defects go back to the owning leaf, then every affected targeted
and downstream gate is rerun.

## Exclusive Single-Writer Ownership

- `tests/integration/documentation/docsPlatformAcceptance.test.ts`;
- `scripts/docs/run-acceptance-smoke.ts`;
- final canonical manifest plus exactly eight screenshots under
  `_docs/_workflows/_smoke/evidence/task-548/`; TASK-545 phase 1 retains sole
  ownership of the checkpoint byte in that directory;
- `README.md`, `docs/README.md`, `docs/guide/README.md`;
- `docs/develop/README.md`;
- `docs/develop/assistant.md`;
- `docs/develop/documentation-platform.md`;
- `docs/develop/documentation-visual-capture.md`;
- `docs/develop/documentation-release.md`;
- `_docs/ASSISTANT_GUIDE.md`;
- `_docs/ASSISTANT_SITE_BUILDER.md`;
- `_docs/ARCHITECTURE.md`, `_docs/DATA_MODEL.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/CMS_API.md`, `_docs/TESTING_STRATEGY.md`, `_docs/CODERSO_RELEASE_GATES.md`, and `_docs/RELEASE_PROCESS.md`;
- `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` only for cache changes;
- TASK-548 task status/completion fields, its board row/statistics;
- changelog 1261 file and its index row.

No other leaf writes changelog 1261 or closeout metadata. Read board/changelog
indexes fresh immediately before editing and change only TASK-548/1261 rows.
No wildcard `docs/develop/*` ownership exists. Before any shared-doc edit,
require TASK-547 terminal, amend the TASK-548 parent with every literal final
overlapping user/developer/shared-doc path, and serialize this leaf after its
final bytes; an unresolved/colliding path blocks all TASK-548 implementation.
This leaf must not share `_docs/ASSISTANT_SITE_BUILDER.md`,
`_docs/CMS_API.md`, `_docs/ARCHITECTURE.md`, or `_docs/SECURITY_SPEC.md`
concurrently with TASK-547.
TASK-548-01-L01 remains sole writer of `docs/guide/_TEMPLATE.md`; this leaf
validates its shipped v2 authoring contract read-only and does not add it to the
closeout writer set.

This leaf alone writes the canonical `manifest.json` and exactly these eight
screenshots:
`01-help-offline-local-search.png`,
`02-guide-no-provider-grounded-answer.png`,
`03-agent-unavailable-isolation.png`,
`04-permission-aware-open-cms.png`,
`05-visual-example-source-parity.png`,
`06-portal-local-exact-latest-rollback.png`,
`07-responsive-theme-keyboard.png`, and
`08-explicit-guide-agent-handoff.png`. Extra, missing, renamed, nested,
symlinked, untracked, or hash-unbound members fail. Every alternate TASK-548
acceptance/workflow evidence path is forbidden.

TASK-545 `createResumeCheckpoint` phase 1 is the sole byte writer of
`resume-checkpoint.json`. It atomically creates that file only after validating
the nine 07-owned files. Thus the exact post-phase-1 directory inventory is
manifest + eight screenshots + checkpoint, with explicitly split ownership;
this leaf never writes checkpoint bytes.

`manifest.json` is exactly the TASK-545 canonical schema and receives no
TASK-548 extension fields. Pre-checkpoint page-error, unexpected-network,
bundle-identity, production-health and cleanup checks remain mandatory and
block phase 1 on failure, but are not persisted, reconstructed, or claimed as
historical closeout evidence after resume. Closeout uses only the verified
checkpoint identity/frozen revision/closure contract, canonical manifest/eight
screenshots, deterministic current frozen on-disk product/task facts and
durable repository receipts, and the existing non-authorizing planning-audit
record. The scenario-06 file above is the sole canonical portal screenshot; all
eight screenshots remain owned here.

Read TASK-548-04-L03 portal evidence as a handoff input. If current final-tree
portal evidence requires recapture, dispatch exactly one same-owner operational
04-L03 handback. It returns bounded result/screenshot bytes to this leaf without
reopening status or transferring ownership; only 07-L01 writes the canonical
scenario-06 PNG and final manifest.

## Production Health Receipt Handoff

Given the expected version, tag, 40-hex Git SHA, workflow run ID/attempt and
deployment ID, download only the exact artifact
`docs-post-deploy-health-<version>-<gitSha>-<workflowRunId>` from that successful
TASK-548-05-L02 release/deployment run. Extract into a resolved task-owned
temporary directory, inventory without following links, and require exactly one
root regular member `docs-post-deploy-health-v1.json`. Reject a missing,
duplicate, nested, extra, directory, symlink, device, or renamed member before
reading bytes and recursively validating exact discriminator
`coderso.docs-post-deploy-health@v1`. The producer's `.tmp` staging hierarchy is
never an artifact member.

Require identity equality for version/tag/SHA/run/attempt/deployment/origin/base
path; `attemptLimit: 5`; bounded complete results; exact indexable and latest
noindex status/body-hash/canonical/version facts; both retained manifest hashes;
one content-addressed asset path/hash; exact `search` with canonical BCP-47
locale, confined path, HTTP 200, bounded bytes and SHA-256; a matching
`results[]` attempt with `target: "search-index"`; canonical `checkedAt`; and
`status: "pass"`. Search locale/path/status/bytes/hash must link exactly to both
the selected `DocsSearchPublicationReceiptV1` record and detached portal
manifest, and `search.locale` must equal `selectedRoute.locale`. Missing
or divergent attempt path/status/bytes/body hash also rejects. Missing
artifact/file/result, unknown field, stale or
wrong-identity receipt, oversized evidence, failed status, or any hash/fact
mismatch blocks closure. The download is read-only. This leaf never invokes a
production publish, Pages deployment, latest promotion, or rollback.

## Ordered Browser Contract

Run exactly these ordered IDs with `playwright-cli -s=wf548smoke`:

1. `help-offline-local-search` — block public/provider origins; search, open,
   anchor-scroll and render a packaged article locally.
2. `guide-no-provider-grounded-answer` — disable provider; reindex/query and
   assert source evidence, Help/CMS actions, relevant visual/example, and
   official link all retain the owning canonical BCP-47
   `{ docId, locale, sectionId }`. Include two localized records sharing one
   `docId`; neither may supply the other locale's evidence/action/card, while
   `visualId` and `exampleId` remain bundle-global.
3. `agent-unavailable-isolation` — fail/disable Agent and prove Guide history,
   readiness, response and Help navigation remain unchanged.
4. `permission-aware-open-cms` — allowed user opens the canonical Admin route;
   denied user sees no actionable destination or leaked href.
5. `visual-example-source-parity` — assert Help and portal share exact
   `{ docId, locale, sectionId }`, bundle-global visual/example IDs, canonical
   PNG hash, alt/caption, example bytes and safe renderer output.
6. `portal-local-exact-latest-rollback` — against a disposable local retained
   Pages bare remote/static fixture, publish two verified capsules, open exact
   and latest section URLs, roll latest back, and assert canonical/version/
   anchor/search/hash behavior while exact bytes remain unchanged.
7. `responsive-theme-keyboard` — wide/narrow, light/dark, reduced motion,
   skip-link, tab order, focus visibility/restore and no overflow.
8. `explicit-guide-agent-handoff` — verify redacted prefill, explicit switch,
   no auto-send, no response/plan/history transfer.

Save one distinct human-reviewable screenshot per ID and populate only the exact
TASK-545 manifest fields: top-level revision/generated-at/server-up values and,
for each ordered scenario, ID/title/surface/theme/viewport, visible assertions,
an empty `consoleErrors` array, and screenshot relative path/SHA-256 records.
Page-error, unexpected-network, bundle-identity and cleanup checks are mandatory
pre-checkpoint gates and block phase 1 on failure, but they are neither
manifest fields/extra evidence files nor historical claims reconstructed during
post-resume closeout.

## Security Contract

- **Internal routes:** preserve the existing authenticated Admin session cookie
  plus RBAC behavior, POST CSRF, strict schemas, error mapping, audit and the
  `assistant` rate bucket. This acceptance flow adds no alternate auth mode.
- **Public portal:** static read only; no public API/write, credential, cookie,
  CSRF, nonce/HMAC, CAPTCHA, tracker, provider call or remote image.
- **Release:** verify tag/SHA binding, HTTPS base origin, exact-version
  no-overwrite, manifest/hash closure, latest-after-exact-success, concurrency
  guard and non-destructive rollback.
- **Fixtures:** unique synthetic identities; bounded content; clean only owned
  rows/files/sessions/processes and restore prior settings/index state.
- **Evidence:** redact logs and scan outputs/screenshots for secrets, session
  state, PII, absolute paths and internal-only material.

## Exact Phased Execution

After 06-L02, invoke these phases in order:

```text
07-L01-runtime-docs-and-gates-preparation
08-post-audit-lenses/fixes/revalidation
07-L01-final-smoke-phase1-owner-pause
07-L01-owner-resume-tracked-parity
08-final-read-only-drift
07-L01-terminal-metadata-closeout-and-mechanical-delta-verification
```

The four 07 phase labels re-enter this same physical leaf owner. Preparation
does not close its status and does not run smoke or create evidence/checkpoint
bytes. Every non-metadata post-audit fix returns to the exact product leaf,
reruns its targeted gates, and restarts preparation plus the canonical 08
post-audit. Only a fresh pass authorizes final smoke. The smoke phase writes only
the exact TASK-545 manifest/eight screenshots, then TASK-545 phase 1 immediately
and atomically creates the sole checkpoint and returns `owner_action_required`.
07 performs no pre-phase-1 checkpoint or metadata write. The resume phase
verifies owner-reviewed tracked parity without changing
metadata. `08-final-read-only-drift` then performs the
substantive frozen-runtime audit before any terminal write. This leaf becomes
terminal only after that pass on a first `frozen` closure attempt. A crash
before the first metadata write leaves the replay `frozen` and requires a fresh
read-only final drift. Changelog 1261 is the first atomic deterministic
metadata write; a later crash returns `metadata_recovery`, which validates the
existing changes as an exact prefix of the same deterministic plan and
idempotently completes only missing metadata without rerunning smoke/final
drift or requiring a lost in-memory result. After terminal writes, only
TASK-545's narrow mechanical metadata-delta validation runs and its result is
returned externally.

## Implementation Pseudocode

```ts
export type Task548OwnerActionRequired = {
  pass: false;
  code: "owner_action_required";
  action: "review_and_stage_evidence";
  taskId: "TASK-548";
  evidenceDirectory: "_docs/_workflows/_smoke/evidence/task-548";
  checkpointPath:
    "_docs/_workflows/_smoke/evidence/task-548/resume-checkpoint.json";
  checkpointSha256: string;
  runId: string;
  resumeArgv: string[];
  resumeCommand: string;
  frozenRuntimeRevision: {
    gitHead: string;
    workingTreeDirty: boolean;
    workingTreeSha256: string;
  };
};

export type Task548MetadataDeltaReceipt = {
  pass: true;
  taskId: "TASK-548";
  runId: string;
  closureMetadataRevision: {
    gitHead: string;
    workingTreeDirty: boolean;
    workingTreeSha256: string;
  };
  changedPaths: string[];
};

export type PassedTask548FinalDrift = {
  pass: true;
  frozenRuntimeRevisionSha256: string;
  findings: [];
};

export type Task548ClosureResume =
  | {
      state: "frozen";
      checkpoint: VerifiedTask545Checkpoint;
      closureIdentity: Task545ClosureIdentity;
    }
  | {
      state: "metadata_recovery";
      checkpoint: VerifiedTask545Checkpoint;
      closureIdentity: Task545ClosureIdentity;
      delta: VerifiedTask545MetadataRecoveryDelta;
    };

// A pass is bound to the frozen runtime and has no unresolved finding. Its
// dynamic payload is never serialized into closure metadata.

export async function prepareTask548RuntimeDocsAndGates(
  ctx: CloseoutContext
): Promise<RuntimeDocsAndGatesReceipt> {
  await assertImplementationThroughTask54806L02Complete();
  await ctx.requireTask548WorkflowOwnerImplementationReady();
  await ctx.runTargetedGatesInDependencyOrder();
  await recoverDocsWorkspaceArtifactPromotionV1();
  await ctx.buildAndVerifyCorpusPortalRelease();
  await ctx.finishAllOwnedProductRuntimeDocumentation();
  await ctx.runFullRepositoryAndStrictSecurityGates();
  await ctx.assertAllModifiedHumanProductionAndTestFilesAtMost(1000);
  return ctx.createRuntimeDocsAndGatesReceipt();
}

export async function runTask548FinalSmokePhase1(
  ctx: CloseoutContext,
  postAudit: PassedTask548PostAudit
): Promise<Task548OwnerActionRequired> {
  await ctx.requireFreshPassedPostAudit(postAudit);
  await ctx.runExactCommand(
    "bun test tests/integration/documentation/docsPlatformAcceptance.test.ts"
  );
  const downloaded = await ctx.downloadExactSuccessfulRunArtifact(
    `docs-post-deploy-health-${ctx.version}-${ctx.gitSha}-${ctx.workflowRunId}`
  );
  const health = await ctx.extractExactSingleRootRegularFile(downloaded, {
    member: "docs-post-deploy-health-v1.json",
    outputRoot: ctx.ownedHealthArtifactTempRoot,
  });
  await ctx.validateDocsPostDeployHealthReceiptV1(health, {
    expectedRelease: ctx.expectedReleaseIdentity,
    requireSearch: {
      attemptTarget: "search-index",
      linkAttemptToSearchFact: true,
      linkToSearchReceipt: true,
      linkToPortalManifest: true,
    },
  });
  await ctx.prepareDisposableRetainedPagesBareRemote();
  await ctx.restartOwnedServers();
  let result: Task548AcceptanceSmokeResult;
  try {
    await ctx.obtainPortalScenarioEvidenceFrom04L03IfRecaptureRequired();
    result = await ctx.runExactAcceptanceSmokeCommand(
      "bun scripts/docs/run-acceptance-smoke.ts",
      REQUIRED_FLOW_IDS,
      "wf548smoke"
    );
    await assertCompleteVisibleEvidence(result, { consoleErrors: 0 });
  } finally {
    await ctx.cleanupAndAssertPriorState();
  }
  await ctx.writeExactTask545CanonicalManifestAndEightScreenshots(result);
  return ctx.createTask545ResumeCheckpoint({
    exactTaskId: "TASK-548",
    exactManifestSchemaOwner: "TASK-545",
  });
  // Returns owner_action_required immediately. No metadata write, stage,
  // commit, or post-phase-1 action.
}

export async function resumeTask548TrackedParity(
  ctx: CloseoutResumeContext
): Promise<Task548ClosureResume> {
  const resume = await ctx.openExactOwningWorkflowResume();
  await ctx.requireOwnerReviewedTrackedEvidenceParity();
  return resume;
}

export async function completeTask548TerminalCloseout(
  ctx: CloseoutResumeContext,
  input:
    | {
        resume: Extract<Task548ClosureResume, { state: "frozen" }>;
        finalDrift: PassedTask548FinalDrift;
      }
    | {
        resume: Extract<Task548ClosureResume, {
          state: "metadata_recovery";
        }>;
        finalDrift?: never;
      }
): Promise<Task548MetadataDeltaReceipt> {
  await ctx.requireTrackedResumeBoundToCurrentCheckpoint(input.resume);
  const durable = await ctx.readDeterministicDurableCloseoutSources({
    checkpointIdentity: input.resume.checkpoint,
    closureIdentity: input.resume.closureIdentity,
    canonicalEvidence:
      await ctx.readExactCanonicalManifestAndEightScreenshots(),
    frozenOnDiskFacts:
      await ctx.readCurrentFrozenOnDiskProductTaskFactsAndDurableReceipts(),
    planningAudit:
      await ctx.readExistingOnDiskNonAuthorizingPlanningAuditRecord(),
  });
  const plan = await ctx.buildDeterministicTask548MetadataPlan(durable, {
    firstWrite: "changelog-1261",
    finalDriftGate: "passed-before-closure",
  });
  if (input.resume.state === "frozen") {
    await ctx.requirePassedFinalDriftBoundToFrozenRuntime(input.finalDrift, {
      exactFindings: [],
    });
    await ctx.createChangelog1261ForFirstTime(plan.changelog1261);
  } else {
    await ctx.requireNoFinalDriftPayload(input);
    await ctx.validateExactMetadataRecoveryPrefix(input.resume.delta, plan, {
      requireFirstWrite: "changelog-1261",
    });
  }
  await ctx.completeMissingDeterministicMetadataWritesIdempotently(plan);
  const delta = await ctx.validateExactMetadataOnlyClosureDelta({
    exactKeys: [
      "pass",
      "taskId",
      "runId",
      "closureMetadataRevision",
      "changedPaths",
    ],
  });
  await ctx.returnExternalOwnerHandoff(delta);
  return delta; // external structured result; never persisted
}
```

**Data flow:** current validated sources → recovery → deterministic compile/
reindex/build/package → completed product/runtime documentation → targeted/full
gates and all-human-file line audit → one canonical 08 post-audit call with at
most one fix, validation, and a complete fresh second pass → exact
successful-run read-only production health artifact → local
CMS/portal and disposable retained-Pages bare remote → optional same-owner
04-L03 recapture handback → ordered visible flows and eight candidate screenshot
hashes → unconditional cleanup → exact TASK-545 manifest/eight canonical
screenshots → TASK-545 phase 1 immediately and atomically creates the sole
checkpoint and exact payload →
`owner_action_required` pause with no metadata write → owner review/stage only
→ exact owning-workflow resume/tracked parity → 08 substantive read-only final
drift against the frozen runtime revision on a first `frozen` attempt → require
`{ pass: true, findings: [] }` without serializing its dynamic payload →
deterministic metadata plan derived only from the verified checkpoint
identity/frozen revision/closure contract, exact canonical manifest/eight
screenshots, rereadable frozen on-disk product/task facts and durable repository
receipts, and the existing non-authorizing planning-audit record → changelog
1261 created as the first metadata write → every descendant/parent status,
board/index/statistics, and changelog update → exact five-key mechanical
metadata delta returned externally and never persisted. A crash before that
first write re-enters `frozen` and reruns final drift; a crash afterward
re-enters `metadata_recovery`, validates the exact changelog-first deterministic
plan prefix, and idempotently completes missing metadata without smoke, final
drift, or any lost in-memory payload.

**Error handling:** preserve the previous valid corpus/artifact and evidence on
failure. A missing/malformed result, hash mismatch, stale receipt, console/page
error, missing/malformed/oversized/wrong-identity production receipt, unsafe
network call, skipped command, inaccessible DB, cleanup drift, unresolved
finding, or >1,000-line touched file returns nonzero and stops before metadata
closure. Any non-metadata mutation after the final smoke snapshot, any evidence
mutation after owner review, or any later source/test/config/runtime-doc/workflow
change invalidates the snapshot and audit. Resume never dispatches
implementation, fixes, canonical post-audit, or smoke. Before any metadata
mutation it may dispatch only the substantive read-only final-drift phase. A
final-drift finding aborts resume without an edit, invalidates the snapshot,
and returns through a new normal run at the owning leaf. Any pre-phase-1
task/changelog/board/status write, summary sidecar,
manifest/checkpoint extension, recovery delta without exact
changelog-first deterministic-prefix parity, or claim that an unavailable
pre-pause agent/runtime payload survived also blocks. Nothing is fixed after
terminal metadata.

The phase-1 result must have exactly `{ pass, code, action, taskId,
evidenceDirectory, checkpointPath, checkpointSha256, runId, resumeArgv,
resumeCommand, frozenRuntimeRevision }` with the literal values/types declared
above. Missing or extra keys reject. The metadata result is produced only after
all closure metadata writes and has exactly `{ pass, taskId, runId,
closureMetadataRevision, changedPaths }`; missing/extra keys or a non-allowlisted
path reject. It is a mechanical external owner handoff and is never persisted.
The reconstructed closeout records only durable facts from the bounded sources
above plus the fixed literal `final-drift: passed-before-closure`. It never
reconstructs historical authoring/post-audit, page-error, unexpected-network,
bundle, production-health, or cleanup outcomes; serializes dynamic final-drift
findings/resolutions; or invents pass fields. No substantive audit runs after
this terminal closeout.

**Regression-test shape:** the acceptance suite asserts exact flow identity/
order, Help offline behavior, Guide provider independence, Agent isolation,
permission-safe route resolution, stable visual/example joins, exact/latest
hash parity, responsive/a11y effects, handoff boundaries, and idempotent cleanup.

## Sub-Tasks

- [ ] Run every targeted/full gate and verify cleanup plus line counts.
- [ ] Execute all eight ordered real flows and hash the evidence.
- [ ] Finish runtime/product docs before the final snapshot, require fresh
  post-audit success, pause for owner evidence review/staging, resume for tracked
  parity and final read-only drift, then perform descendant-first metadata-only
  closure and mechanical delta verification.

## Testing Requirements

1. Load `.env`; prove DB reachability before DB/settings suites.
2. Run every targeted command promised by TASK-548-01..06 in land order,
   including route/error-map, migration, hostile-render, visual, portal,
   artifact, release-workflow and coverage suites.
3. Call `recoverDocsWorkspaceArtifactPromotionV1()` before portal/release/
   coverage workspace inputs. Run `bun run docs:check` and
   `bun run docs:visual:check -- --all`; never promote from CI/smoke. Finish
   every owned product/runtime documentation file before the final smoke
   snapshot.
4. Build and validate `packages/docs-portal/dist`, verify the immutable
   SemVer/content-addressed capsule, and exercise publication/rollback only
   against a disposable local bare remote; never write real release/Pages state.
5. Download TASK-548-05-L02's exact named 90-day artifact from the selected
   successful release/deployment run; extract into owned temp and require exactly
   root regular member `docs-post-deploy-health-v1.json`, rejecting missing,
   duplicate, nested, extra, directory, symlink, device, or renamed inventory.
   Then reject unknown, oversized, stale, wrong
   version/tag/SHA/run/attempt/deployment/origin/base, incomplete, non-pass,
   hash-drifted, or fact-drifted
   `DocsPostDeployHealthReceiptV1`. Require exact `search` and one
   `results[].target: "search-index"` attempt; reject missing/duplicate,
   wrong-locale/path/status/bytes/hash, or linkage drift against both the search
   receipt and detached portal manifest. Do not publish or deploy production. Then
   restart owned CMS/local portal servers, verify health, run exactly
   `bun test tests/integration/documentation/docsPlatformAcceptance.test.ts`
   and exactly `bun scripts/docs/run-acceptance-smoke.ts`, execute all eight
   flows, close the named session and verify the exact canonical
   screenshots/manifest inventory and hashes.
6. Run `bun --cwd core lint`, `bun --cwd core lint:types`, `bun run test`,
   `bun run precommit:check`, `bun run gates:coderso`, and
   `bun run scan:security:strict`.
7. Re-run each named failure once in isolation. No broad failure may be called
   pre-existing until isolated and evidenced.
8. Audit every added/modified production and test file with `wc -l`; any count
   above 1,000 fails.
9. After `07-L01-runtime-docs-and-gates-preparation`, require
   `08-post-audit-lenses/fixes/revalidation` against the runtime/product-doc
   tree through exactly one canonical driver call. Its one optional fix invokes
   affected gates plus preparation in the validation callback before the full
   fresh second pass; a non-pass blocks without an outer retry loop. Only a pass
   allows final smoke. After smoke/cleanup, write only the exact canonical
   TASK-545 manifest/eight screenshots, then invoke TASK-545 phase 1 immediately
   as the sole atomic checkpoint creator; 07 performs zero pre-phase-1
   checkpoint or task/changelog/board/status writes. It must return exactly
   `{ pass, code, action, taskId, evidenceDirectory, checkpointPath,
   checkpointSha256, runId, resumeArgv, resumeCommand,
   frozenRuntimeRevision }` under the literal contract above; stop without
   staging, committing, metadata writes, sidecars, or evidence-schema extensions.
10. Validate TASK-548-01-L01's owned `docs/guide/_TEMPLATE.md` read-only.
11. After the owner reviews and stages only
    `_docs/_workflows/_smoke/evidence/task-548/`, invoke the returned exact
    owning-workflow resume and require tracked parity without a metadata write.
    If `openWorkflowClosureResume` returns `frozen`, dispatch a fresh
    `08-final-read-only-drift` against the checkpoint-frozen runtime before any
    terminal status/changelog edit and require exactly no findings. Any finding
    aborts resume unchanged, invalidates smoke/post-audit, and requires a new
    normal run plus phase 1. If it returns `metadata_recovery`, do not rerun
    smoke or final drift and do not require an unavailable prior result.
12. Derive one deterministic metadata plan from only the verified checkpoint
    identity/frozen revision/closure contract, exact canonical
    manifest/screenshots, current rereadable frozen on-disk product/task facts
    and durable repository receipts, and the existing on-disk non-authorizing
    planning-audit record. In `frozen`, validate the in-memory final-drift pass
    but serialize only the fixed `final-drift: passed-before-closure` marker,
    then create changelog 1261 as the first metadata write. In
    `metadata_recovery`, require an exact changelog-first prefix of that plan and
    complete only missing writes idempotently. Complete every descendant before
    its parent, update board/index/statistics and changelog, and only then run
    the narrow mechanical validator requiring exactly
    `{ pass, taskId, runId, closureMetadataRevision, changedPaths }`. Return that
    result externally; never persist it. Any source/test/config/runtime-doc/
    workflow/evidence/HEAD or other-task delta fails. No substantive audit or
    mutation follows terminal metadata.
13. Prove the TASK-545 manifest has its exact owner schema and the directory has
    no audit/bundle/network/cleanup summary file or field. Prove closeout never
    reconstructs or claims historical page-error, unexpected-network,
    bundle/health, cleanup, authoring/post-audit, or dynamic final-drift details
    that are absent from the durable sources.

## Documentation Updates Required

Update only the exact owned files above. Explain one-source compilation, visual
promotion, Help, Guide/Agent isolation, offline behavior, reindex, portal
versioning, capsule release/rollback, post-deploy health, security and
validation. `_docs/ASSISTANT_GUIDE.md` and
`_docs/ASSISTANT_SITE_BUILDER.md` are mandatory shared assistant-workflow
updates, not conditional files. Claim only actually shipped locales, never
Polish/Admin UI parity.

## Acceptance Criteria

- All gates and eight flows pass with SHA-256 evidence, zero errors, and cleanup.
- Docs match shipped contracts; no planned TASK-547 path is called shipped.
- TASK-548-08 has no unresolved HIGH/MEDIUM drift or missing agent result.
- Final drift passes before terminal metadata; deterministic closeout is first
  written afterward, the mechanical delta receipt remains external, and no
  substantive work follows closure.
- Changelog/board update once; leaves close before parents and TASK-548 last.
