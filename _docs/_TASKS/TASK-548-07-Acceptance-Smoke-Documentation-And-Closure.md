# TASK-548-07: Acceptance, Smoke, Documentation and Closure
# FileName: TASK-548-07-Acceptance-Smoke-Documentation-And-Closure.md

**Parent Task:** TASK-548
**Priority:** Critical
**Category:** Acceptance / Runtime Smoke / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** TASK-545 `✅ Done` and TASK-547 terminal before any
implementation;
the TASK-548 parent amended after TASK-547 with every literal final overlapping
user/developer/shared-doc path and serialized owner; TASK-548-05-L02,
TASK-548-06-L02; TASK-548-08 phased post-audit/final-drift handoffs
**Status:** ⏳ To Do

---

## Overview

Prove the complete hybrid documentation platform as one installed product,
publish the final user/developer/architecture documentation, and close every
TASK-548 descendant in terminal order. This child adds acceptance-only
validation and evidence; defects return to their exclusive implementation
owner and all affected gates rerun.

TASK-548-07-L01 is the sole writer of changelog 1261, TASK-548 task statuses,
the task-board row/statistics, and final shared documentation. No earlier leaf
may perform partial closeout.

## Exclusive Ownership

- `tests/integration/documentation/docsPlatformAcceptance.test.ts`;
- `scripts/docs/run-acceptance-smoke.ts`;
- final canonical `manifest.json` plus exactly eight screenshot bytes under
  `_docs/_workflows/_smoke/evidence/task-548/`; TASK-545
  `createResumeCheckpoint` phase 1 is the sole byte writer of the sibling
  `resume-checkpoint.json`;
- final documentation files listed by the parent and L01;
- exact required assistant workflow sources
  `_docs/ASSISTANT_GUIDE.md` and `_docs/ASSISTANT_SITE_BUILDER.md`;
- all `TASK-548*.md` status/completion fields, the TASK-548 board row and
  statistics in `_docs/_TASKS/README.md`;
- changelog 1261 and its `_docs/_CHANGELOG/README.md` index row.

This child does not reopen schema, compiler, ingest, visual, Help, Guide,
Agent, portal, corpus, or release production files. A failure is assigned to
the leaf that owns the defective contract.

The final TASK-547 bytes must be available before any TASK-548 implementation.
After TASK-547 becomes terminal, the TASK-548 parent is amended with every
literal final overlapping path and its serialized writer. In particular, this
child may not edit `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/CMS_API.md`,
`_docs/ARCHITECTURE.md`, or `_docs/SECURITY_SPEC.md` concurrently with any
TASK-547 owner; an unresolved or wildcard ownership claim blocks.

## Required Real Browser Flows

Use a restarted runtime and named `playwright-cli -s=wf548smoke` session. The
ordered scenario IDs are:

1. `help-offline-local-search`;
2. `guide-no-provider-grounded-answer`;
3. `agent-unavailable-isolation`;
4. `permission-aware-open-cms`;
5. `visual-example-source-parity`;
6. `portal-local-exact-latest-rollback`;
7. `responsive-theme-keyboard`;
8. `explicit-guide-agent-handoff`.

Every scenario asserts a visible effect through computed style, geometry,
DOM/ARIA state, URL/state transition, or rendered evidence. Selector presence
alone is insufficient. Every flow requires zero console/page errors and no
unexpected network request.

The final canonical directory has a split single-writer contract.
TASK-548-07-L01 alone writes `manifest.json` and exactly these eight
screenshots:

```text
01-help-offline-local-search.png
02-guide-no-provider-grounded-answer.png
03-agent-unavailable-isolation.png
04-permission-aware-open-cms.png
05-visual-example-source-parity.png
06-portal-local-exact-latest-rollback.png
07-responsive-theme-keyboard.png
08-explicit-guide-agent-handoff.png
```

TASK-545 `createResumeCheckpoint` phase 1 alone atomically writes
`resume-checkpoint.json` after validating those nine 07-owned files. The exact
regular-file inventory after phase 1 is therefore the manifest, eight
screenshots, and checkpoint, but 07-L01 never writes checkpoint bytes.
No alternate acceptance or TASK-548-08 workflow-evidence tree is valid.
TASK-548-04-L03 hands its landed portal evidence to L01 read-only. Missing or
stale evidence aborts closure and returns to 04-L03; any recapture happens
outside closure, then the full preparation/post-audit/smoke lifecycle restarts.
07-L01 alone writes `06-portal-local-exact-latest-rollback.png` and the final
manifest during its own final smoke.

The manifest is exactly the TASK-545-owned canonical manifest schema. TASK-548
does not add audit, bundle, network, cleanup, workflow-summary, or other fields
to it. Pre-checkpoint page-error, unexpected-network, bundle-identity,
production-health and cleanup checks remain mandatory and any failure blocks
phase 1, but TASK-548 neither persists nor later reconstructs or claims those
historical results. Post-resume closeout may cite only facts durably present in
the verified checkpoint identity/frozen revision/closure contract, canonical
manifest/eight screenshots, deterministic current frozen on-disk product/task
facts and durable repository receipts, and the existing non-authorizing
planning-audit record. Among the eight screenshots,
`06-portal-local-exact-latest-rollback.png` is the sole canonical portal
screenshot.

## End-to-End Acceptance Matrix

- Local Help searches and reads the packaged bundle with the public origin
  blocked and no provider configured.
- Guide returns a DB-grounded answer whose evidence, visual/example resolution,
  `Open in Help`, `Open in CMS`, and public link all retain the owning canonical
  BCP-47 `{ docId, locale, sectionId }` tuple. `visualId` and `exampleId` remain
  bundle-global, and a same-`docId` answer in another locale cannot supply the
  card, action, or deep link.
- Agent disablement/provider failure stays inside Agent state and never hides,
  clears, or relabels Guide/Help.
- Allowed and denied permission snapshots produce canonical `adminPaths`
  behavior without leaking inaccessible destinations.
- Embedded and public renderers agree on `{ docId, locale, sectionId }`,
  bundle-global visual/example identity, safe content, hashes, captions, and alt
  text.
- Exactly one TASK-548-05-L02 operational
  `DocsRetainedPagesValidationHandoffV1` session contains two ordered plain-
  SemVer capsules, the exact local validation ref/first-parent commit chain,
  published/rolled-back/restored snapshots, and canonical publication/rollback/
  restore receipt hashes. Acceptance strictly validates the handoff, serves all
  three sealed roots read-only, verifies exact/latest behavior in every state,
  proves rollback preserves immutable bytes and restore equals published, then
  disposes it. Only the 05-L02 helper may drive writers against its scoped local
  bare repository before browsing; scenario 6 invokes no writer.
- Production availability is consumed only by downloading the exact
  TASK-548-05-L02 artifact
  `docs-post-deploy-health-<version>-<gitSha>-<workflowRunId>` from the selected
  successful release/deployment run, extracts it into a resolved task-owned
  temporary directory, and requires exactly one root regular member
  `docs-post-deploy-health-v1.json`. Missing, duplicate, nested, extra,
  directory, symlink, device, or renamed members fail before recursively
  validating `DocsPostDeployHealthReceiptV1`. It must cover exact/latest, both
  retained manifests, one hashed asset, and exact `search`. The `results`
  inventory must contain `target: "search-index"` and bind `search.locale`,
  `search.path`, HTTP 200 status, bounded bytes, and SHA-256 to both the selected
  `DocsSearchPublicationReceiptV1` record and detached portal manifest;
  `search.locale` must equal `selectedRoute.locale`, and the attempt's
  path/status/bytes/body hash must equal the `search` fact. Closure
  does not publish, deploy, promote, roll back, or otherwise mutate production.
- Wide/narrow, light/dark, reduced-motion, keyboard/focus and screen-reader
  semantics remain usable.
- Explicit handoff is redacted, bounded, prefilled, never auto-sent, and does
  not merge histories.

## Security Contract

- **Visibility/auth:** `/admin/help` and assistant routes remain internal to an
  authenticated Admin session; the portal remains static public read only.
- **RBAC:** exercise Help destination filtering plus the existing assistant
  read/write permissions without broadening them.
- **CSRF/rate limit:** assistant POST routes retain CSRF and the `assistant`
  bucket. The static portal has no write, CSRF, nonce/HMAC, or CAPTCHA surface.
- **Validation:** run strict reject-unknown, path, URL, hash, link, route,
  permission, artifact, and renderer hostile fixtures.
- **Privacy:** use synthetic scoped fixtures only. Evidence must contain no
  cookie, session/CSRF value, provider key/prompt, real user data, or PII.
- **Cleanup:** remove only task-owned rows/files/processes/sessions even on
  failure and verify the prior settings/index state is restored.

## Phased Implementation Shape

The exact post-06-L02 order is:

```text
07-L01-runtime-docs-and-gates-preparation
08-post-audit-lenses/fixes/revalidation
07-L01-final-smoke-phase1-owner-pause
07-L01-owner-resume-tracked-parity
08-final-read-only-drift
07-L01-terminal-metadata-closeout-and-mechanical-delta-verification
```

All four normal-path 07 phases, plus the conditional retirement-pause and
retirement-confirmation labels, invoke the same physical TASK-548-07-L01 owner.
Its status remains open through preparation, smoke, checkpoint pause, tracked
resume, and substantive final drift. A non-metadata finding returns to its exact
owning leaf, reruns affected gates and preparation, and then obtains a fresh 08
post-audit pass. Final smoke and checkpoint creation happen only after that
pass. Final smoke writes only the exact TASK-545 manifest/eight screenshots,
then TASK-545 phase 1 immediately and atomically creates the sole checkpoint and
returns `owner_action_required`. 07 performs no pre-phase-1 checkpoint write and
no task, changelog, board, status, or other metadata write. After owner
resume verifies tracked parity, 08 performs the substantive final drift
read-only before any terminal mutation. Only its pass authorizes the last 07
phase in the first `frozen` closure attempt. If that process crashes before any
metadata write, replay remains `frozen` and reruns a fresh read-only final
drift. No preparation allowlist command or upstream producer runs after
checkpoint creation. Changelog 1261 is then the first atomic deterministic
metadata write,
followed by descendant-before-parent closeout and the mechanical metadata-delta
validator. If a crash occurs after that first write, TASK-545 returns
`metadata_recovery`; replay validates the existing changes as an exact prefix
of the deterministic metadata plan and completes only its missing writes. It
does not rerun smoke/final drift or require a lost in-memory result. Nothing
substantive runs after terminal metadata.

If substantive final drift is non-pass, 08 first returns through this same leaf
the exact `Task548InvalidatedCheckpointOwnerActionRequired`; it performs no
metadata or evidence mutation. Its expected paths are exactly the manifest,
the eight named PNGs, and `resume-checkpoint.json` in the canonical TASK-548
evidence directory. TASK-545 remains the sole checkpoint-byte writer, and
agents never delete or unstage reviewed evidence. The owner verifies the
task/run/path/checkpoint hash, unstages only those ten paths, and either archives
them outside the repository or removes them before invoking `restartArgv`.
The new normal invocation first runs
`confirmTask548InvalidatedCheckpointRetired()`, requiring those exact paths
absent from index and worktree and the canonical directory absent or empty
without a symlink. Wrong args, partial retirement, a remaining path, extra
member or no-overwrite checkpoint conflict blocks before fixes or phase 1.
After confirmation, the owning fix/gates and the complete
preparation→post-audit→smoke→new phase-1 lifecycle rerun. This owner-mediated
transition is neither evidence nor closeout metadata; `metadata_recovery` and a
clean pre-metadata crash never use it.

The exact preparation command surface is the
TASK-548-07-L01 **Exact Closure Validation Allowlist**: its named
Vitest/Bun/DB tests, read-only `bun run docs:check`,
`bun run docs:visual:check -- --all`,
`bun run docs:coverage -- --check`, package checks/builds, lint/type/admin
checks, full gates, strict security scan, and diff/line audits. It consumes the
landed packaged bundle, coverage outputs, reviewed visual assets/receipts,
release capsule/manifest receipt, search publication receipt, detached portal
manifest, and selected post-deploy health artifact read-only.

No 07 phase invokes the public Guide migration CLI, `bun run docs:compile` or
direct compiler `--write`, `bun run docs:recover` or a workspace recovery API,
Guide-visual capture/promotion, coverage `--write`, release-artifact regeneration, or
real publication/deployment/rollback mutation. Producer behavior is exercised
only by the exact named isolated tests, except that final smoke requests exactly
one TASK-548-05-L02-owned
`createDocsRetainedPagesValidationSessionV1()` against its validated,
credential-free task-owned local bare repository. The helper completes
publish→rollback→restore before scenario 6, returns only its strict operational
handoff and sealed snapshot roots, and is disposed in `finally`; 07 neither
implements nor directly calls a publication primitive. If any other producer
write becomes necessary, closure returns to that exact owner without invoking
it. A frozen attempt never recreates the ephemeral session; a final-drift
non-pass first returns the owner-retirement action defined above.

The 07-owned `runWithTask548CleanupV1()` enters its body before health-artifact
download or session creation, then always runs both named cleanup domains with
`Promise.allSettled`: L02 session disposal (when created) and general
server/DB/settings/session/health-temp cleanup. It preserves the primary error
and every bounded cleanup code in one `task548_cleanup_failed` result; one
cleanup rejection never skips the other. The verified session is mounted on
loopback only at `/published/**`, `/rolled-back/**`, and `/restored/**`.
Exactly `TASK548_RETAINED_PAGES_VALIDATION_ORIGIN` and
`TASK548_RETAINED_PAGES_VALIDATION_RUN_ID` are passed ephemerally to both the
integration acceptance command and browser-smoke process; values are never
logged or persisted. Both consumers use this single session.
Inside that body, `runWithRetainedPagesPostUseVerificationV1()` implements a
nested `try/finally`: it always runs the exact `phase: "post-use"` verifier
after a successful pre-mount verification, including when mount, integration,
server restart or smoke fails. It preserves both the primary and bounded
post-use verification error before the outer two-domain cleanup runs.

```ts
type Task548OwnerActionRequired = {
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

const TASK_548_MANIFEST_EIGHT_PNGS_AND_CHECKPOINT = [
  "_docs/_workflows/_smoke/evidence/task-548/manifest.json",
  "_docs/_workflows/_smoke/evidence/task-548/01-help-offline-local-search.png",
  "_docs/_workflows/_smoke/evidence/task-548/02-guide-no-provider-grounded-answer.png",
  "_docs/_workflows/_smoke/evidence/task-548/03-agent-unavailable-isolation.png",
  "_docs/_workflows/_smoke/evidence/task-548/04-permission-aware-open-cms.png",
  "_docs/_workflows/_smoke/evidence/task-548/05-visual-example-source-parity.png",
  "_docs/_workflows/_smoke/evidence/task-548/06-portal-local-exact-latest-rollback.png",
  "_docs/_workflows/_smoke/evidence/task-548/07-responsive-theme-keyboard.png",
  "_docs/_workflows/_smoke/evidence/task-548/08-explicit-guide-agent-handoff.png",
  "_docs/_workflows/_smoke/evidence/task-548/resume-checkpoint.json",
] as const;

type Task548InvalidatedCheckpointOwnerActionRequired = {
  pass: false;
  code: "owner_action_required";
  action: "retire_invalidated_task548_checkpoint";
  reason: "final_drift_nonpass";
  taskId: "TASK-548";
  evidenceDirectory: "_docs/_workflows/_smoke/evidence/task-548";
  checkpointPath:
    "_docs/_workflows/_smoke/evidence/task-548/resume-checkpoint.json";
  checkpointSha256: string;
  runId: string;
  expectedEvidencePaths: typeof TASK_548_MANIFEST_EIGHT_PNGS_AND_CHECKPOINT;
  restartArgv: string[];
  restartCommand: string;
};

type Task548MetadataDeltaReceipt = {
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

type PassedTask548FinalDrift = {
  pass: true;
  frozenRuntimeRevisionSha256: string;
  findings: [];
};

type Task548ClosureResume =
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

async function prepareTask548RuntimeDocsAndGates(
  ctx: DocsAcceptanceContext
): Promise<RuntimeDocsAndGatesReceipt> {
  await ctx.finishAllProductRuntimeDocumentation();
  await ctx.runExactReadOnlyDocsCheck("bun run docs:check");
  await assertNoDocsWorkspaceArtifactPromotionHazardsV1();
  const bundle = await loadPackagedDocsDistributionBundleV2();
  const landed = await ctx.loadAndValidateLandedDurableHandoffsReadOnly({
    bundle,
    requireCoverageVisualReleaseSearchAndPublicationReceipts: true,
  });
  await ctx.runTask548L01ExactClosureValidationAllowlist(landed);
  await ctx.assertNoCanonicalArtifactOrTrackedInputMutation(landed);
  await ctx.runLineAudit();
  return ctx.createRuntimeDocsAndGatesReceipt({ landed });
}

async function runTask548FinalSmokePhase1(
  ctx: DocsAcceptanceContext,
  preparation: RuntimeDocsAndGatesReceipt,
  postAudit: PassedTask548PostAudit
): Promise<Task548OwnerActionRequired> {
  await ctx.requireFreshRuntimeDocsAndGatesReceipt(preparation);
  await ctx.requireFreshPassedPostAudit(postAudit);
  let retainedPages: DocsRetainedPagesValidationSessionV1 | null = null;
  const scenarios = await ctx.runWithTask548CleanupV1({
    body: async () => {
      const artifact =
        await ctx.downloadPostDeployHealthArtifactFromExactSuccessfulRun();
      const health = await ctx.extractExactSingleRootHealthReceiptToOwnedTemp(
        artifact,
        "docs-post-deploy-health-v1.json"
      );
      await ctx.verifyReleaseArtifactCorpusCoverageAndDeployHealthReceipt(health);
      await ctx.requireCurrentLandedPortalEvidenceReadOnly(preparation.landed);
      const session = await createDocsRetainedPagesValidationSessionV1({
        runId: ctx.runId,
        taskOwnedTempRoot: ctx.retainedPagesValidationTempRoot,
        fixture: "coderso-retained-pages-minimal-v1",
      });
      retainedPages = session;
      const verified = await verifyDocsRetainedPagesValidationSessionV1(
        session,
        {
          phase: "pre-mount",
          runId: ctx.runId,
          taskOwnedTempRoot: ctx.retainedPagesValidationTempRoot,
        }
      );
      return ctx.runWithRetainedPagesPostUseVerificationV1({
        body: async () => {
          const mount =
            await ctx.mountVerifiedRetainedPagesSessionReadOnly(verified);
          await ctx.runExactAcceptanceCommand(
            "bun test tests/integration/documentation/docsPlatformAcceptance.test.ts",
            { env: mount.exactChildProcessEnv }
          );
          await ctx.restartRuntimeAndPortal();
          const result = await ctx.runExactAcceptanceSmokeCommand(
            "bun scripts/docs/run-acceptance-smoke.ts",
            REQUIRED_FLOW_IDS,
            { env: mount.exactChildProcessEnv }
          );
          await ctx.assertEvidence({
            scenarios: result,
            consoleErrors: 0,
            pageErrors: 0,
            verifySha256: true,
          });
          return result;
        },
        verify: async () =>
          verifyDocsRetainedPagesValidationSessionV1(session, {
            phase: "post-use",
            runId: ctx.runId,
            taskOwnedTempRoot: ctx.retainedPagesValidationTempRoot,
            handoffSha256: verified.handoffSha256,
          }),
      });
    },
    cleanups: [
      {
        name: "retained-pages",
        run: async () => retainedPages?.dispose(),
      },
      {
        name: "acceptance-state",
        run: async () => ctx.cleanupOwnedFixturesAndAssertRestored(),
      },
    ],
  });
  await ctx.writeExactTask545CanonicalManifestAndEightScreenshots(scenarios);
  return ctx.createCanonicalEvidenceCheckpointPhase1({
    exactManifestSchemaOwner: "TASK-545",
  });
  // Returns owner_action_required immediately. No metadata write, git add,
  // commit, or post-phase-1 action.
}

async function resumeTask548TrackedParity(
  ctx: DocsClosureResumeContext
): Promise<Task548ClosureResume> {
  const resume = await ctx.openExactOwningWorkflowResume();
  await ctx.requireOwnerReviewedTrackedEvidenceParity();
  return resume;
}

async function requireTask548InvalidatedCheckpointOwnerRetirement(
  ctx: DocsClosureResumeContext,
  resume: Extract<Task548ClosureResume, { state: "frozen" }>
): Promise<Task548InvalidatedCheckpointOwnerActionRequired> {
  return ctx.createExactInvalidatedCheckpointOwnerAction(resume, {
    reason: "final_drift_nonpass",
    expectedEvidencePaths: TASK_548_MANIFEST_EIGHT_PNGS_AND_CHECKPOINT,
  });
}

async function confirmTask548InvalidatedCheckpointRetired(
  ctx: DocsAcceptanceContext
): Promise<void> {
  await ctx.requireExactRestartArgsFromPriorRetirementAction();
  await ctx.requireCanonicalEvidencePathsAbsentFromIndexAndWorktree(
    TASK_548_MANIFEST_EIGHT_PNGS_AND_CHECKPOINT
  );
  await ctx.requireEvidenceDirectoryAbsentOrEmptyNoSymlink();
}

async function completeTask548TerminalCloseout(
  ctx: DocsClosureResumeContext,
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
  return delta; // never persisted in task/changelog/evidence
}
```

**Data flow:** completed product/runtime docs → current canonical sources →
read-only `docs:check` byte/source equality → read-only workspace hazard
inspection → strict fixed-path packaged bundle load, valid with the ignored
migration report absent → read-only landed coverage/visual/release/search/
publication handoffs → exact named-test, read-only check, package-build and
full-gate allowlist → tracked/canonical byte-identity proof plus line audit →
TASK-548-08 post-audit lenses/fixes/revalidation → fresh pass → exact-run read-only
post-deploy receipt → scoped CMS plus landed retained-Pages snapshots mounted
read-only through one L02-owned task-local publish/rollback/restore session →
restarted Admin/local static portal → eight real flows → cleanup/restoration →
exact TASK-545 manifest/eight canonical screenshots → TASK-545 phase 1
immediately and atomically creates the sole checkpoint/exact payload →
`owner_action_required` owner review/stage pause with no metadata write → exact
owning-workflow resume/tracked parity → TASK-548-08 substantive final read-only
drift against the frozen runtime revision on a first `frozen` attempt → require
`{ pass: true, findings: [] }` without serializing the dynamic result →
deterministic metadata plan derived solely from the verified checkpoint
identity/frozen revision/closure contract, exact canonical manifest/eight
screenshots, rereadable frozen on-disk product/task facts and durable repository
receipts, and the existing non-authorizing planning-audit record → changelog
1261 created as the first metadata write → all descendant/parent status,
board/index/statistics, and changelog updates → exact five-key mechanical
metadata delta returned externally and never persisted. A crash before the
first metadata write re-enters `frozen` and reruns final drift; a crash after it
re-enters `metadata_recovery`, validates the existing exact deterministic plan
prefix, and idempotently completes missing writes without smoke, final drift, or
an in-memory pre-crash payload.

**Error handling:** a missing result/screenshot/hash, skipped lane, stale visual,
broken link, missing/malformed/oversized/stale/wrong-run/wrong-version/wrong-tag/
wrong-SHA/wrong-deployment post-deploy receipt, receipt identity/hash mismatch,
missing/extra/unknown retained-Pages handoff key, unsafe ref/root, wrong
commit ancestry/tree/site-index/receipt hash, mutable exact byte, failed
published/restore parity, escaped cleanup,
unexpected request, console/page error, dirty cleanup, unresolved HIGH/MEDIUM
finding, or touched file above 1,000 lines blocks closure.
Any workspace journal/staging/backup hazard, report-only state, stale packaged
bundle or canonical-byte/source mismatch blocks read-only acceptance and is
returned to the declared TASK-548-01-L02 authoring/migration write handback.
Closure never invokes recovery, creates a migration report, regenerates the
bundle/report pair, or becomes a generated-artifact writer.
Any required migration, compile write, recovery, Guide-visual capture/promotion,
coverage write, release-artifact regeneration, or publication/deployment/
rollback mutation outside the exact ephemeral 05-L02 validation-session helper
aborts closure and returns to its exact owner before a new
preparation/post-audit/smoke snapshot. In `frozen`, the checkpoint remains
unchanged while the exact retirement owner action is returned; no producer runs
in that frozen attempt.
Any product/runtime/docs/workflow/evidence/source/test/config change after the
final smoke snapshot, or any non-metadata change after tracked resume,
invalidates smoke/audit and requires a fresh pre-checkpoint run. The final drift
audit is read-only and precedes every terminal write; any finding makes it
non-pass, aborts resume without metadata mutation, invalidates the snapshot,
and returns to its owner before the normal validation/smoke/checkpoint lifecycle
reruns only after exact owner retirement is confirmed. Any
pre-phase-1 task/changelog/board/status write, recovery delta without exact
changelog-first deterministic-prefix parity, extra summary file,
manifest/checkpoint extension, or claim that an unavailable pre-pause agent or
runtime payload survived blocks resume. No finding is fixed after terminal
metadata.

The phase-1 result has exactly the fields shown in
`Task548OwnerActionRequired`; missing or extra fields fail. After every
descendant and parent status plus board/index/statistics and changelog update,
the metadata delta has exactly `{ pass, taskId, runId,
closureMetadataRevision, changedPaths }`. This mechanical result is the final
external owner handoff and is never written to task/changelog, the TASK-545
manifest/checkpoint, or another evidence file. The closure-only branch records
only durable facts from the bounded sources above plus the fixed literal
`final-drift: passed-before-closure`. It does not reconstruct historical
authoring/post-audit, page-error, unexpected-network, bundle, production-health,
or cleanup results; serialize dynamic final-drift findings/resolutions; or
fabricate `authoring.pass`/`postAudit.pass` fields.

**Regression shape:** acceptance pins ordered scenario IDs, stable evidence
joins, strict two-slot retained-Pages ref/commit/tree/receipt closure, immutable
rollback plus published/restored parity, production health-receipt
verification, offline/no-provider independence, separate tab state, safe CMS
links, responsive/a11y visible effects, and cleanup idempotency.

## Sub-Tasks

- [ ] **TASK-548-07-L01** — run targeted and full gates, execute eight real
  browser flows, publish docs/evidence/changelog, and close the family.

## Testing Requirements

- exactly the named tests and commands in TASK-548-07-L01's **Exact Closure
  Validation Allowlist**, including read-only `bun run docs:check`,
  `bun run docs:visual:check -- --all`, and
  `bun run docs:coverage -- --check`; the vague 01..06 producer-command set is
  not a closure command surface;
- exact workspace hazard inspection and strict
  `loadPackagedDocsDistributionBundleV2()` before landed coverage/visual/
  release/search/publication handoff validation. A clean-checkout fixture with
  the tracked bundle and ignored migration report absent must pass with zero
  bundle/report recovery, generation, or mutation;
- renderer/Admin/portal package builds from the landed bundle, the named Docker
  workspace/runtime contract test, and read-only immutable release
  capsule/manifest, publication/rollback receipt, and production-health receipt
  validation; no artifact rebuild or publication/deployment/rollback mutation;
- exact successful-run health-artifact download and hostile receipt validation;
- exact `health.search` plus `results[].target: "search-index"` validation:
  canonical locale/path, HTTP 200, bounded bytes and SHA-256 must match the
  search publication receipt and detached portal manifest; missing, duplicate,
  wrong-locale/path/status/bytes/hash, or unlinked search evidence fails;
- exact one-root-regular-member artifact inventory, with missing, duplicate,
  nested, extra, directory and symlink fixtures;
- exactly one 05-L02 task-local retained-Pages session with fixed no-hidden-input
  fixture, exact `phase: "pre-mount"` verifier before mount and guaranteed
  nested-finally `phase: "post-use"` verifier after success, mount rejection or
  later consumer failure,
  domain-separated tree/receipt/ref/ancestry closure, the same two ephemeral
  environment keys for integration and smoke, and all-settled cleanup;
- read-only validation of TASK-548-01-L01's owned `docs/guide/_TEMPLATE.md`; this
  closure task does not edit that file;
- `bun --cwd core lint` and `bun --cwd core lint:types`;
- `bun run test`, `bun run precommit:check`, `bun run gates:coderso`;
- `bun run scan:security:strict`;
- task graph/H1/FileName/status and touched-file line-count audits;
- exact
  `bun test tests/integration/documentation/docsPlatformAcceptance.test.ts`;
- exact `bun scripts/docs/run-acceptance-smoke.ts`;
- eight-flow `playwright-cli` smoke, TASK-545 phase1
  exact `{ pass, code, action, taskId, evidenceDirectory, checkpointPath,
  checkpointSha256, runId, resumeArgv, resumeCommand, frozenRuntimeRevision }`
  owner-action payload/owner-stage/resume/tracked-parity lifecycle;
- exact post-06-L02 six-phase normal order, same physical 07-L01 owner in all
  four normal and both conditional retirement phases, nonterminal status
  through final drift, post-audit before final smoke, and non-metadata-fix
  loopback tests. A write/recovery need returns to the exact
  owner; a final-drift non-pass returns the exact ten-path retirement payload
  without mutating its checkpoint, and only owner-confirmed absence permits a
  fresh preparation/post-audit/smoke/checkpoint lifecycle;
- pre-phase-1 lifecycle fixtures prove zero task/changelog/board/status or
  checkpoint writes by 07, exact manifest/eight-screenshot inventory, immediate
  TASK-545 phase 1 as sole atomic checkpoint creator, pause, and no summary
  sidecar or manifest/checkpoint extension;
- resume fixtures prove `frozen` reruns a fresh final drift and requires
  `{ pass: true, findings: [] }`, while `metadata_recovery` never reruns smoke
  or final drift and never requires a lost final-drift object. Both derive the
  same deterministic metadata plan only from verified checkpoint
  identity/frozen revision/closure contract, exact canonical manifest/eight
  screenshots, rereadable frozen on-disk facts/durable repository receipts, and
  the existing non-authorizing planning record. Recovery accepts only an exact
  changelog-first prefix, idempotently completes missing writes, and rejects
  unavailable agent/runtime payloads, invented authoring/post-audit pass fields,
  and dynamic final-drift serialization;
- exact metadata-only
  `{ pass, taskId, runId, closureMetadataRevision, changedPaths }` validation
  after every descendant/parent/index/changelog update; it is external-only,
  and no substantive audit follows terminal metadata;
- exact TASK-545 manifest and eight-file screenshot inventory tests reject
  audit/bundle/network/cleanup fields and alternate evidence files.
- same-`docId`/different-canonical-locale fixtures prove Guide evidence, local
  Help/CMS actions, public links, visuals, and examples remain bound to the
  owning `{ docId, locale, sectionId }` while visual/example IDs stay
  bundle-global.

Load `.env` before DB/settings lanes and first prove `DATABASE_URL` reachable.
Re-run a named failure alone before classifying it. Any skipped or unavailable
lane is recorded as blocking rather than silently accepted.

## Documentation Updates Required

TASK-548-07-L01 writes every parent-required user, developer, architecture,
security, release/health, testing, changelog, board, and closeout update exactly
once. `_docs/ASSISTANT_GUIDE.md` and `_docs/ASSISTANT_SITE_BUILDER.md` are
mandatory because Guide/Agent separation changes the shared assistant workflow.
The Guide authoring template remains TASK-548-01-L01-owned and is validated
read-only here.

## Closure Rule

Close leaves before their technical parent and technical parents before
TASK-548. Update board statistics exactly once. Changelog 1261 records final
durable browser-manifest facts/hashes, deterministic shipped-tree facts, the
non-authorizing planning-audit reference, and the fixed
`final-drift: passed-before-closure` marker. It does not claim non-persisted
command, page-error, network, bundle/health, cleanup, authoring/post-audit, or
dynamic final-drift details. Required pre-checkpoint lanes still block phase 1
when unavailable or failed.
