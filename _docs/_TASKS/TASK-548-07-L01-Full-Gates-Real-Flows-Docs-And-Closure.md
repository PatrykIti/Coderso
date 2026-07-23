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

Read TASK-548-04-L03's landed portal evidence as a read-only handoff. Missing or
stale final-tree evidence aborts closure and returns to 04-L03; recapture occurs
outside closure, then preparation/post-audit/smoke restarts. Only 07-L01 writes
the canonical scenario-06 PNG and final manifest during its own final smoke.

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
6. `portal-local-exact-latest-rollback` — mount the landed two exact capsules
   and immutable pre-/post-rollback site-index snapshots read-only; open exact
   and latest section URLs in both recorded states and assert canonical/version/
   anchor/search/hash behavior while exact bytes remain unchanged. Invoke no
   publication, latest-promotion, or rollback writer.
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

## Exact Closure Validation Allowlist

`07-L01-runtime-docs-and-gates-preparation` reruns only the commands below.
They are read-only with respect to tracked/canonical corpus, visual, coverage,
release, and publication state. Named tests may use uniquely scoped DB/temp
fixtures and must restore them; frozen install and package builds may create
only dependency/build output and must leave every tracked input byte-identical.

```bash
bun install --frozen-lockfile

bunx vitest run --config vitest.config.ts \
  tests/vitest/documentation/docs-corpus-contract.test.ts \
  tests/vitest/documentation/docs-markdown-policy.test.ts \
  tests/vitest/documentation/docs-corpus-compiler.test.ts \
  tests/vitest/documentation/docs-corpus-native-migration.test.ts \
  tests/vitest/documentation/docs-coverage-reconciliation.test.ts \
  tests/vitest/documentation/docs-visual-scenario.test.ts \
  tests/vitest/documentation/docs-visual-fixtures.test.ts \
  tests/vitest/documentation/docs-visual-source-hash.test.ts \
  tests/vitest/documentation/docs-visual-staleness.test.ts \
  tests/vitest/documentation/docs-visual-diff.test.ts \
  tests/vitest/documentation/docs-visual-ci-contract.test.ts \
  tests/vitest/assistant/docsIngestService.test.ts \
  tests/vitest/assistant/docsDbRetriever.test.ts \
  tests/vitest/assistant/docsAnswerComposer.test.ts

bunx vitest run --config vitest.config.ts \
  tests/vitest/admin/admin-route-registry.test.tsx \
  tests/vitest/admin/adminApp.test.tsx \
  tests/vitest/admin/adminPaths.test.ts \
  tests/vitest/admin/authClient.test.ts \
  tests/vitest/ui/admin-shell-nav.test.tsx \
  tests/vitest/ui-integration/help-center.test.tsx \
  tests/vitest/docs/docs-renderer.test.tsx \
  tests/vitest/docs/docs-search.test.ts \
  tests/vitest/docs/docs-public-links.test.ts \
  tests/vitest/docs/docs-admin-actions.test.ts \
  tests/vitest/ui/assistant-guide-tab.test.tsx \
  tests/vitest/ui/assistant-agent-tab.test.tsx \
  tests/vitest/ui/assistant-tab-handoff.test.tsx \
  tests/vitest/ui/assistant-panel.test.tsx \
  tests/vitest/ui/assistant-panel-conversation.test.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/vitest/ui/assistant-panel-lazy-load.test.tsx \
  tests/vitest/ui/assistant-conversation-state.test.ts

bunx vitest run --config vitest.config.ts \
  tests/vitest/docs-portal/portal-shell.test.tsx \
  tests/vitest/docs-portal/portal-search.test.tsx \
  tests/vitest/docs-portal/portal-routes.test.ts \
  tests/vitest/docs-portal/portal-build.test.tsx \
  tests/vitest/docs-portal/portal-seo.test.ts \
  tests/vitest/docs-portal/portal-security.test.ts \
  tests/vitest/docs-portal/portal-accessibility.test.tsx

bun test \
  tests/unit/assistant/assistantService.test.ts \
  tests/unit/documentation/docsArtifactRecovery.test.ts \
  tests/unit/documentation/docsCorpusPromotionRecovery.test.ts \
  tests/unit/documentation/docsDockerWorkspaceContract.test.ts \
  tests/unit/documentation/docsGuideMigrationBaseline.test.ts \
  tests/unit/documentation/docsPagesPublication.test.ts \
  tests/unit/documentation/docsReleaseArtifact.test.ts \
  tests/unit/documentation/docsVisualCapture.test.ts \
  tests/unit/documentation/docsVisualPromotion.test.ts
bun test tests/unit/release

set -a && source .env && set +a && bun --eval 'import { canConnect } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); process.stdout.write(JSON.stringify({ configured, reachable })); if (!reachable) process.exit(1)'
set -a && source .env && set +a && bun test \
  tests/integration/server/assistantDocsIngestV2.test.ts \
  tests/integration/routes/assistant-reindex-v2.test.ts \
  tests/integration/server/docsVisualFixtureLifecycle.test.ts \
  tests/integration/routes/assistant.test.ts

bun run docs:check
bun run docs:visual:check -- --all
bun run docs:coverage -- --check

bun --cwd packages/docs-renderer check
tsc -p packages/docs-renderer/tsconfig.json --noEmit
bun --cwd packages/docs-portal check
tsc -p packages/docs-portal/tsconfig.json --noEmit
DOCS_PRODUCT_VERSION=0.0.0-test DOCS_PUBLIC_ORIGIN=https://docs.example.invalid DOCS_PUBLIC_BASE_PATH=/docs SOURCE_DATE_EPOCH=0 bun --cwd packages/docs-portal build
bun packages/docs-portal/scripts/validate-built-portal.ts packages/docs-portal/dist
bun --cwd core build:admin
bun --cwd core --eval 'const renderer = await import("@coderso/docs-renderer"); if (typeof renderer.DocsDocumentRenderer !== "function" || typeof renderer.selectDocumentsForPublicationTarget !== "function") throw new Error("docs_renderer_exports_invalid")'

bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun run check:admin-bundle
bun run test
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
trivy fs --scanners secret --exit-code 1 --timeout 5m packages/docs-portal/dist
git diff --check
```

The allowlist explicitly excludes the public
`bun scripts/docs/migrate-guide-corpus.ts --migration-run-id <id> --all-waves`
migration, `bun run docs:compile` and direct
`bun scripts/docs/compile-corpus.ts --write`, `bun run docs:recover` or any
workspace recovery API, `docs:visual:capture`, `docs:visual:promote`, every
Guide-visual capture/promotion API, `bun run docs:coverage -- --write`, release-artifact
regeneration, and real or disposable publication/deployment/rollback mutation.
CLI behavior for those producers is rerun only through the named tests above.
Closure consumes the already-landed packaged bundle, coverage report/matrix,
reviewed visual receipts/assets, release capsule/manifest receipt, search
publication receipt, detached portal manifest, and selected post-deploy health
artifact read-only. It never recreates them as acceptance evidence.

After the allowlist and package builds, compare all tracked/canonical input
hashes with the landed handoff. If any check requires recovery, regeneration,
recapture, promotion, coverage write, artifact rebuild, or publication mutation,
abort closure without invoking it and return to that exact owner. If a
checkpoint already exists, leave the frozen tree and checkpoint unchanged,
invalidate that snapshot, perform the owner work outside frozen closure, and
start preparation/post-audit/smoke again before creating a new checkpoint.

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
  await ctx.finishAllOwnedProductRuntimeDocumentation();
  await ctx.runExactReadOnlyDocsCheck("bun run docs:check");
  await assertNoDocsWorkspaceArtifactPromotionHazardsV1();
  const bundle = await loadPackagedDocsDistributionBundleV2();
  const landed = await ctx.loadAndValidateLandedDurableHandoffsReadOnly({
    bundle,
    coverageReport: "core/generated/docs/coderso-docs-coverage-v2.json",
    coverageMatrix: "docs/guide/_COVERAGE_MATRIX.md",
    visualReceiptsAndAssets: "docs/guide/assets",
    requireReleaseCapsuleManifestAndSearchReceipts: true,
  });
  await ctx.runExactClosureValidationAllowlist(landed);
  await ctx.assertNoCanonicalArtifactOrTrackedInputMutation(landed);
  await ctx.assertAllModifiedHumanProductionAndTestFilesAtMost(1000);
  return ctx.createRuntimeDocsAndGatesReceipt({ landed });
}

export async function runTask548FinalSmokePhase1(
  ctx: CloseoutContext,
  preparation: RuntimeDocsAndGatesReceipt,
  postAudit: PassedTask548PostAudit
): Promise<Task548OwnerActionRequired> {
  await ctx.requireFreshRuntimeDocsAndGatesReceipt(preparation);
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
  await ctx.requireCurrentLandedPortalEvidenceReadOnly(preparation.landed);
  await ctx.mountLandedRetainedPagesSnapshotsReadOnly(preparation.landed);
  await ctx.restartOwnedServers();
  let result: Task548AcceptanceSmokeResult;
  try {
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

**Data flow:** completed product/runtime documentation → current canonical
sources → read-only `docs:check` byte/source equality → read-only workspace
hazard inspection → strict fixed-path packaged bundle load, valid in a clean
checkout with the ignored migration report absent → read-only validation of
landed coverage/visual/release/search/publication receipts and artifacts → exact
named-test, read-only check, package-build and full-gate allowlist → proof that
tracked/canonical handoff bytes did not change → all-human-file line audit → one
canonical 08 post-audit call with at most one fix, validation, and a complete
fresh second pass → exact successful-run read-only production health artifact
→ local CMS/portal plus landed retained-Pages snapshots mounted read-only →
current landed 04-L03 portal-evidence validation → ordered visible flows and eight candidate
screenshot hashes → unconditional cleanup → exact TASK-545 manifest/eight
canonical screenshots → TASK-545 phase 1 immediately and atomically creates the
sole checkpoint and exact payload →
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
closure. A workspace journal/staging/backup hazard, report-only state, stale
packaged bundle or canonical-byte/source mismatch blocks this read-only
consumer and returns to the declared TASK-548-01-L02 authoring/migration write
handback. This leaf never invokes workspace recovery, creates the ignored
migration report, regenerates the bundle/report pair, or becomes a
generated-artifact writer. Any required migration, compile write, recovery,
Guide-visual capture/promotion, coverage write, release-artifact regeneration, or
publication/deployment/rollback mutation aborts closure and returns to its exact
owner before a new preparation/post-audit/smoke snapshot. If already frozen,
the current checkpoint stays untouched and is invalidated; no producer runs
inside that frozen attempt. Any non-metadata mutation after the final smoke
snapshot, any evidence mutation after owner review, or any later
source/test/config/runtime-doc/workflow change invalidates the snapshot and
audit. Resume never dispatches
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
2. Run exactly the named Vitest/Bun/DB tests, read-only checks, package builds,
   linters, full gates, strict security scan, and diff check in **Exact Closure
   Validation Allowlist**; no other upstream producer command is authorized.
   Tests exercise migration, route/error-map, hostile-render, visual, artifact,
   publication and release-workflow behavior only in isolated fixtures.
3. Run read-only `bun run docs:check`, `bun run docs:visual:check -- --all`, and
   `bun run docs:coverage -- --check`; then require the exact
   `assertNoDocsWorkspaceArtifactPromotionHazardsV1()` inspection and
   `loadPackagedDocsDistributionBundleV2()` before consuming landed portal,
   release, coverage, visual, search and publication handoffs. A clean
   tag/checkout fixture with the tracked bundle and ignored migration report
   absent must pass; filesystem-mutator spies must prove the three checks
   perform no recovery, report creation, bundle/report or coverage regeneration,
   rename, delete, or fsync. Recovery/write-required fixtures fail closed and
   return to the exact owner before a new snapshot.
4. Build and validate only the renderer/Admin/portal packages from the landed
   packaged bundle, and rerun the named Docker workspace/runtime contract test.
   Validate the already-landed immutable
   SemVer/content-addressed capsule, manifest and publication/rollback receipts
   read-only; never rebuild the release artifact or invoke a real/disposable
   publication, deployment, latest promotion, or rollback command.
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
6. Run the exact lint/type/admin-boundary/package/full/security commands in the
   allowlist. Immediately afterward prove every landed artifact/receipt and
   tracked canonical input retains its pre-validation hash.
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
    No allowlisted preparation command or excluded producer may run in either
    frozen resume branch. A newly discovered write/recovery need exits frozen
    closure unchanged, returns to the exact owner, and requires a new snapshot.
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
