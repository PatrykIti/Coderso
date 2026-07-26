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
and downstream gate is rerun. Its normal path has three mutually exclusive
invocations (plus the existing conditional retirement-restart invocation):
pre-release preparation ending in an owner-only release pause, a fresh
post-release verification/smoke invocation, and the existing checkpoint-bound
closure resume. No object from an earlier invocation authorizes a later one.

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
outside closure, then prerelease audit, owner release, verified release-resume
and smoke restart. Only 07-L01 writes
the canonical scenario-06 PNG and final manifest during its own final smoke.

## Production Health Receipt Handoff

Only the fresh `task548-release-resume` invocation accepts the expected version,
tag, repository-format lowercase 40/64-hex Git SHA, workflow run ID/attempt,
deployment ID, origin and base path as strict bounded CLI fields. Bounds and
canonical forms come from TASK-548-05-L02's release-identity/post-deploy
normalizers, never local copies. It proves `HEAD` and the tag target equal the
commit SHA, proves clean index/worktree parity, validates one bounded untouched
canonical Git record stream, and passes it directly through L01's pure
create/normalize/serialize API. It binds the exact
`DocsReleaseTreeBindingV1` object and canonical bytes to every receipt. A commit
SHA is never compared with or described as a tree OID. It then verifies
the immutable TASK-548-05-L02 GitHub Release asset/receipt pair plus retained
publication/capsule receipts against the same identity. It then downloads only
the exact artifact
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
mismatch blocks before preparation or smoke. The temporary artifact is removed
before the verified current-invocation handoff returns. The download is
read-only. This leaf never stages, commits, merges, tags, creates a release,
publishes retained bytes, invokes Cloudflare Pages, promotes `latest`, or rolls
back production.

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
6. `portal-local-exact-latest-rollback` — validate the exact TASK-548-05-L02
   operational handoff and mount its two exact capsules plus published,
   rolled-back and restored snapshots read-only. Open exact/latest section URLs
   in all three states; assert canonical/version/anchor/search/hash behavior,
   immutable exact-byte parity and restored/published equality. The 05-L02
   helper completes task-local publish→rollback→restore before the browser
   starts; this scenario invokes no writer.
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
07-L01-release-inputs-and-prerelease-gates
08-prerelease-post-audit-lenses/fixes/revalidation
07-L01-owner-commit-merge-tag-release-cloudflare-deploy-pause
--- process terminates ---
07-L01-release-resume-committed-head-tree-and-receipt-validation
08-release-resume-fresh-committed-head-drift-gate
07-L01-runtime-docs-and-gates-preparation
07-L01-final-smoke-phase1-owner-pause
--- process terminates ---
07-L01-owner-resume-tracked-parity
08-final-read-only-drift
07-L01-terminal-metadata-closeout-and-mechanical-delta-verification
```

All seven normal-path 07 labels, plus the conditional retirement-pause and
retirement-confirmation labels, re-enter this same physical leaf owner. The
first invocation finishes owned runtime/product docs, derives bounded release
inputs, runs prerelease gates, and then 08 runs the canonical prerelease
post-audit. Every fix returns to its exact product leaf and reruns affected
gates plus the release-input phase. A pass returns an exact owner action asking
the owner to review, commit/merge, create the plain-SemVer tag and release, and
let the protected TASK-548-05-L02 workflow deploy Cloudflare; the process then
terminates. 07 performs none of those mutations.

A separate fresh invocation must select only `task548-release-resume` and
provide all eight strict fields. It cannot receive or trust release inputs,
post-audit results, or any other in-memory payload from before the pause. It
validates the HEAD commit, separate Git tree OID, clean index/worktree,
canonical runtime-tree digest, immutable 05-L02 release/publication
receipts and post-deploy receipt, then 08 performs one fresh read-only drift
gate against that committed HEAD. Any failure requires owner-mediated fixes and
a new release identity; the immutable released tree is never patched in place.
Only that pass allows the same invocation to run read-only preparation/full
gates and final smoke. Preparation does not close status and does not create
evidence/checkpoint bytes. The smoke phase writes only
the exact TASK-545 manifest/eight screenshots, then TASK-545 phase 1 immediately
derives `_docs/_workflows/task-548-implement.mjs` only from its executing
`import.meta.url`, rechecks the committed exact-six bootstrap/static gates,
atomically creates the sole checkpoint and returns `owner_action_required`.
That process also terminates. The later closure-resume invocation accepts only
TASK-545 checkpoint-bound resume arguments; release-resume fields are forbidden.
It verifies owner-reviewed tracked parity without changing metadata.
`08-final-read-only-drift` then performs the
substantive frozen-runtime audit before any terminal write. This leaf becomes
terminal only after that pass on a first `frozen` closure attempt. A crash
before the first metadata write leaves the replay `frozen` and requires a fresh
read-only final drift. The first ordered transaction writes/fsyncs changelog
1261 no-replace, then CAS-temp/renames/fsyncs its index row. A crash may leave
the valid `file-only` prefix; `metadata_recovery` validates that exact prefix,
finishes the index idempotently, then completes only missing metadata without rerunning smoke/final
drift or requiring a lost in-memory result. After terminal writes, only
TASK-545's narrow mechanical metadata-delta validation runs and its result is
returned to 08 for its sole external emit.

If substantive final drift is non-pass, 08 first returns through this same leaf
the exact `Task548InvalidatedCheckpointOwnerActionRequired`; no metadata or
evidence byte changes. Its expected paths are exactly the manifest, eight named
PNGs and `resume-checkpoint.json` in the canonical TASK-548 directory.
TASK-545 stays sole checkpoint-byte writer, and agents never delete or unstage
reviewed evidence. The owner verifies task/run/path/checkpoint hash, unstages
only those ten paths, and archives them outside the repository or removes them
before invoking `restartArgv`. The `retirement-restart invocation` first calls
`confirmTask548InvalidatedCheckpointRetired()`, which requires the exact paths
absent from index/worktree and the directory absent or empty without symlink.
Wrong args, partial retirement, extra members or a remaining no-overwrite
checkpoint blocks before fixes/phase 1. Only then do the owning fix/gates and
the full prerelease-inputs→post-audit→owner-release-pause lifecycle rerun, but
only after a new current-tree read-only drift derives affected owners solely
from its fresh findings. Old findings and retired evidence are never read. A
new release-resume invocation must then verify the replacement immutable
release before preparation→smoke→new phase 1. This
owner-mediated transition is never evidence/metadata and is forbidden for
`metadata_recovery` or a clean pre-metadata crash.

## Exact Closure Validation Allowlist

`07-L01-runtime-docs-and-gates-preparation` reruns only the commands below.
It requires the current fresh release-resume receipt and committed-HEAD drift
pass. Every command is read-only with respect to tracked/canonical corpus,
visual, coverage, release, and publication state. Named tests may use uniquely
scoped DB/temp fixtures and must restore them; frozen install and package builds
may create only dependency/build output and must leave every tracked input
byte-identical to the already released commit.

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
  tests/vitest/assistant/docsPermissionSnapshot.test.ts \
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
  tests/vitest/docs/help-visual-asset-registry.test.ts \
  tests/vitest/ui-integration/docs-help-host-adapter.test.ts \
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
  tests/unit/assistant/guideVisualAssetRegistry.test.ts \
  tests/unit/documentation/docsArtifactRecovery.test.ts \
  tests/unit/documentation/docsCorpusPromotionRecovery.test.ts \
  tests/unit/documentation/docsDockerWorkspaceContract.test.ts \
  tests/unit/documentation/docsGuideMigrationBaseline.test.ts \
  tests/unit/documentation/helpBuildAssetVerification.test.ts \
  tests/unit/documentation/docsPagesPublication.test.ts \
  tests/unit/documentation/docsReleaseArtifact.test.ts \
  tests/unit/documentation/docsVisualCapture.test.ts \
  tests/unit/documentation/docsVisualPromotion.test.ts
bun test tests/unit/release

set -a && source .env && set +a && bun --eval 'import { canConnect } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); process.stdout.write(JSON.stringify({ configured, reachable })); if (!reachable) process.exit(1)'
set -a && source .env && set +a && bun test \
  tests/integration/server/assistantDocsIngestV2.test.ts \
  tests/integration/routes/assistant-guide-rbac.test.ts \
  tests/integration/routes/assistant-reindex-v2.test.ts \
  tests/integration/server/docsVisualFixtureLifecycle.test.ts \
  tests/integration/routes/assistant.test.ts

bun run docs:check
bun run docs:visual:check -- --all
bun run docs:coverage -- --check

bun --cwd packages/docs-contracts check
tsc -p packages/docs-contracts/tsconfig.json --noEmit
bun --cwd packages/docs-renderer check
tsc -p packages/docs-renderer/tsconfig.json --noEmit
bun --cwd packages/docs-portal check
tsc -p packages/docs-portal/tsconfig.json --noEmit
DOCS_PRODUCT_VERSION=0.0.0-test DOCS_PUBLIC_ORIGIN=https://docs.example.invalid DOCS_PUBLIC_BASE_PATH=/docs SOURCE_DATE_EPOCH=0 bun --cwd packages/docs-portal build
bun packages/docs-portal/scripts/validate-built-portal.ts packages/docs-portal/dist
bun --cwd core build:admin
bun --cwd core --eval 'const contracts = await import("@coderso/docs-contracts"); const renderer = await import("@coderso/docs-renderer"); const projection = await import("@coderso/docs-renderer/projection"); const helpAssets = await import("./admin/ui/help/helpBuildAssetVerification.ts"); if (typeof contracts.normalizeDocsDistributionBundleV2 !== "function" || typeof contracts.normalizeDocsPublicationPayloadV1 !== "function" || typeof renderer.DocsDocumentRenderer !== "function" || typeof renderer.selectDocumentsForPublicationTarget !== "function" || typeof projection.createDocsPublicationProjectionV1 !== "function" || typeof projection.createDocsPublicationProjectionFromPayloadV1 !== "function" || typeof helpAssets.normalizeEmbeddedHelpAssetReceiptV1 !== "function" || typeof helpAssets.resolveEmbeddedHelpBuildAssetFileV1 !== "function") throw new Error("docs_workspace_exports_invalid")'

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
regeneration, and real publication/deployment/rollback mutation. CLI behavior
for those producers is rerun only through the named tests above. The sole
bounded exception after a fresh post-audit pass is one direct call to the
TASK-548-05-L02-owned
`createDocsRetainedPagesValidationSessionV1()` during final smoke. It may use
only its credential-free task-owned local bare repository, must complete
publish→rollback→restore before browsing, returns no persistent artifact, and
is disposed before checkpoint creation.

The release-resume verifier removes its owned health-artifact temporary tree
before returning. The 07-owned `runWithTask548CleanupV1()` then encloses the one
session, both consumers and all servers. It always settles both cleanup domains
(L02 session disposal when present, plus general server/DB/settings/session/
health-temp restoration), preserves the primary error and every bounded cleanup
code, and never lets one cleanup rejection skip the other. The verified session
is exposed only on loopback at `/published/**`, `/rolled-back/**`, and
`/restored/**`; exact ephemeral environment keys
`TASK548_RETAINED_PAGES_VALIDATION_ORIGIN` and
`TASK548_RETAINED_PAGES_VALIDATION_RUN_ID` bind the integration test and browser
smoke to that same single session and are never logged or persisted.
Inside the outer cleanup body,
`runWithRetainedPagesPostUseVerificationV1()` implements a nested
`try/finally`: it always runs the exact `phase: "post-use"` verifier after
pre-mount success, even when mount, integration, restart or smoke fails, and
preserves the primary plus bounded verifier error before outer cleanup.
Closure consumes the already-landed packaged bundle, coverage report/matrix,
reviewed visual receipts/assets and the current-invocation verified immutable
release capsule/manifest, search publication, detached portal-manifest and
post-deploy-health handoff read-only. It never recreates them as acceptance
evidence.

After the allowlist and package builds, compare all tracked/canonical input
hashes with the landed handoff. If any check requires recovery, regeneration,
recapture, promotion, coverage write, artifact rebuild, or publication mutation,
abort closure without invoking it and return to that exact owner. If a
checkpoint already exists, leave the frozen tree and checkpoint unchanged,
invalidate that snapshot, perform the owner work outside frozen closure, and
start a new prerelease/owner-release/release-resume cycle before another smoke.

## Implementation Pseudocode

```ts
import { createResumeCheckpoint, requireTask548CommittedSixPathBootstrapAuthorizationV1, writeOrResumeOrderedDurableChangelogFileThenIndexV1, type Task548CommittedSixPathBootstrapReceiptV1 } from "./lib/smoke-evidence.mjs";
import type { VerifiedTask545Checkpoint, Task545ClosureIdentity, VerifiedTask545MetadataRecoveryDelta, Task545ClosureResume } from "./lib/smoke-evidence.mjs"; // exact owner exports
import { createDocsReleaseTreeBindingV1, normalizeDocsReleaseTreeBindingV1, serializeDocsReleaseTreeBindingV1, type DocsReleaseTreeBindingV1 } from "../../core/services/documentation/release/docsReleaseTreeBinding";
export type Task548ReleaseResumeRequestV1 = Readonly<{
  version: string; tag: string; gitSha: string; // repository-format commit OID
  workflowRunId: string; workflowRunAttempt: number; deploymentId: string; origin: string; basePath: string;
}>;
export type Task548ReleaseOwnerActionRequired = {
  pass: false; code: "owner_action_required";
  action: "commit_merge_tag_release_and_cloudflare_deploy"; taskId: "TASK-548";
  plannedVersion: string; plannedTag: string;
  plannedOrigin: string; plannedBasePath: string;
  releaseResumeMode: "task548-release-resume";
  requiredReleaseResumeFields: readonly [
    "version", "tag", "gitSha", "workflowRunId", "workflowRunAttempt",
    "deploymentId", "origin", "basePath"
  ];
};
export type PassedTask548ReleaseResume = Readonly<{
  pass: true; request: Task548ReleaseResumeRequestV1; runtimeTree: DocsReleaseTreeBindingV1;
  cleanIndexAndWorktree: true; immutableReleaseHandoffsSha256: string; postDeployHealthSha256: string;
  currentInvocationBinding: CurrentProcessOnly; }>;
export type PassedTask548CommittedHeadDriftGate = Readonly<{
  pass: true; runtimeTree: DocsReleaseTreeBindingV1; findings: []; currentInvocationBinding: CurrentProcessOnly;
}>;
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
export const TASK_548_MANIFEST_EIGHT_PNGS_AND_CHECKPOINT = [
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
export const REQUIRED_FLOW_IDS = [
  "help-offline-local-search", "guide-no-provider-grounded-answer",
  "agent-unavailable-isolation", "permission-aware-open-cms",
  "visual-example-source-parity", "portal-local-exact-latest-rollback",
  "responsive-theme-keyboard", "explicit-guide-agent-handoff",
] as const;
export type Task548InvalidatedCheckpointOwnerActionRequired = {
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
type Task548MetadataDeltaReceipt = VerifiedTask545MetadataRecoveryDelta;
export type PassedTask548FinalDrift = {
  pass: true; frozenRuntimeRevisionSha256: string; findings: [];
};
type VerifiedTask548DriftFinding = Readonly<{ severity: "HIGH" | "MEDIUM" | "LOW"; area: string; finding: string; evidence: string; recommendation: string }>;
export type NonPassingTask548FinalDrift = Readonly<{
  pass: false; frozenRuntimeRevisionSha256: string;
  findings: readonly VerifiedTask548DriftFinding[];
}>;
type Task548ClosureResume = Task545ClosureResume;
type EmptyTask548PhasePayload = Readonly<Record<string, never>>;
type Task548TerminalCloseoutPayloadV1 =
  | Readonly<{ resume: Extract<Task548ClosureResume, { state: "frozen" }>;
      finalDrift: PassedTask548FinalDrift }>
  | Readonly<{ resume: Extract<Task548ClosureResume, { state: "metadata_recovery" }>;
      finalDrift?: never }>;
export type Task548PhasePayloadMapV1 = Readonly<{
  "07-L01-release-inputs-and-prerelease-gates": EmptyTask548PhasePayload;
  "07-L01-owner-commit-merge-tag-release-cloudflare-deploy-pause": Readonly<{ prerelease: Task548PrereleaseReceipt; postAudit: PassedTask548PostAudit }>;
  "07-L01-release-resume-committed-head-tree-and-receipt-validation": Readonly<{ argv: readonly string[] }>;
  "07-L01-runtime-docs-and-gates-preparation": Readonly<{ release: PassedTask548ReleaseResume; committedHeadDrift: PassedTask548CommittedHeadDriftGate }>;
  "07-L01-final-smoke-phase1-owner-pause": Readonly<{ preparation: RuntimeDocsAndGatesReceipt }>;
  "07-L01-owner-resume-tracked-parity": Readonly<{ argv: readonly string[] }>;
  "07-L01-invalidated-checkpoint-owner-retirement-pause": Readonly<{ resume: Extract<Task548ClosureResume, { state: "frozen" }>; finalDrift: NonPassingTask548FinalDrift }>;
  "07-L01-confirm-invalidated-checkpoint-retired": Readonly<{ argv: readonly string[] }>;
  "07-L01-terminal-metadata-closeout-and-mechanical-delta-verification": Task548TerminalCloseoutPayloadV1;
}>;
// A pass is bound to the frozen runtime and has no unresolved finding. Its
// dynamic payload is never serialized into closure metadata.
export async function prepareTask548ReleaseInputsAndPrereleaseGates(
  ctx: CloseoutContext,
  _payload: Task548PhasePayloadMapV1["07-L01-release-inputs-and-prerelease-gates"]
): Promise<Task548PrereleaseReceipt> {
  await assertImplementationThroughTask54806L02Complete();
  await ctx.requireTask548WorkflowOwnerImplementationReady();
  await ctx.finishAllOwnedProductRuntimeDocumentation();
  const releaseInputs = await ctx.resolveStrictPlannedReleaseInputsReadOnly({
    requirePlainSemVerTagEquality: true,
    requireHttpsOriginAndCanonicalBasePath: true,
  });
  await ctx.runPrereleaseDependencyShapedGates();
  await ctx.assertAllModifiedHumanProductionAndTestFilesAtMost(1000);
  return ctx.createPrereleaseReceiptBoundToCurrentTree(releaseInputs);
}
export async function pauseTask548ForOwnerRelease(
  ctx: CloseoutContext,
  { prerelease, postAudit }: Task548PhasePayloadMapV1["07-L01-owner-commit-merge-tag-release-cloudflare-deploy-pause"]
): Promise<Task548ReleaseOwnerActionRequired> {
  await ctx.requireFreshPrereleaseReceiptAndPostAuditForCurrentTree(
    prerelease,
    postAudit
  );
  await ctx.requireNoReleaseOrRepositoryMutationByTask54807();
  return ctx.createExactOwnerReleaseAction(prerelease.releaseInputs);
  // The orchestrator yields this instruction and terminates. It does not stage,
  // commit, merge, tag, release, deploy, or continue in this process.
}
export async function resumeTask548AfterOwnerRelease(
  ctx: CloseoutContext,
  { argv }: Task548PhasePayloadMapV1["07-L01-release-resume-committed-head-tree-and-receipt-validation"]
): Promise<PassedTask548ReleaseResume> {
  await ctx.requireFreshMutuallyExclusiveInvocation("task548-release-resume", {
    forbidClosureResumeOrRetirementArgs: true,
    forbidPriorProcessPayload: true,
  });
  const request = ctx.parseExactReleaseResumeArgs(argv, {
    exactKeys: ["version", "tag", "gitSha", "workflowRunId",
      "workflowRunAttempt", "deploymentId", "origin", "basePath"],
    rejectUnknownMissingDuplicateOrUnbounded: true,
    boundsOwner: "TASK-548-05-L02 release/health normalizers",
    gitSha: /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/,
    rejectAllZeroGitSha: true,
    requirePlainSemVerTagEquality: true,
    requireHttpsOriginAndCanonicalBasePath: true,
  });
  const checkout = await ctx.requireCleanCommittedReleaseCheckout({
    headCommitSha: request.gitSha,
    tag: request.tag,
    requireTagTargetCommitEqualsHeadCommit: true,
    requireIndexAndWorktreeClean: true,
  });
  const source = await ctx.readCanonicalDocsReleaseTreeBindingSourceV1(checkout, {
    requireOriginalBoundedGitRecordBytes: true, requireRepositorySelectedSha1OrSha256: true,
  });
  const runtimeTree = normalizeDocsReleaseTreeBindingV1(
    createDocsReleaseTreeBindingV1(source));
  const runtimeTreeBytes = serializeDocsReleaseTreeBindingV1(runtimeTree);
  const immutable =
    await ctx.downloadAndVerifyImmutableTask54805L02ReleaseHandoffs(request, {
      requireExactNoClobberReleaseAssetAndReceiptPair: true,
      requireRetainedCapsuleManifestSearchAndAssetReceipts: true,
      expectedRuntimeTree: runtimeTree,
      expectedRuntimeTreeBytes: runtimeTreeBytes,
      requireRuntimeTreeByteIdentityAcross: ["release-manifest",
        "artifact-receipt", "retained-publication-capsule",
        "rollback-selection", "rollback-receipt"],
    });
  const health = await ctx.withOwnedHealthArtifactTemp(async (outputRoot) => {
    const downloaded = await ctx.downloadExactSuccessfulRunArtifact(
      `docs-post-deploy-health-${request.version}-${request.gitSha}-${request.workflowRunId}`
    );
    const receipt = await ctx.extractExactSingleRootRegularFile(downloaded, {
      member: "docs-post-deploy-health-v1.json",
      outputRoot,
    });
    return ctx.validateDocsPostDeployHealthReceiptV1(receipt, {
      expectedRelease: request,
      immutableReleaseHandoffs: immutable,
      expectedRuntimeTree: runtimeTree,
      expectedRuntimeTreeBytes: runtimeTreeBytes,
      requireReleaseArtifactRetainedRollbackAndHealthTreeIdentity: true,
      requireSearch: { attemptTarget: "search-index",
        linkAttemptToSearchFact: true, linkToSearchReceipt: true,
        linkToPortalManifest: true },
    });
  });
  return ctx.createCurrentInvocationReleaseResumeReceipt({
    request, runtimeTree, cleanIndexAndWorktree: true, immutable, health,
  });
}
export async function prepareTask548RuntimeDocsAndGates(
  ctx: CloseoutContext,
  { release, committedHeadDrift }: Task548PhasePayloadMapV1["07-L01-runtime-docs-and-gates-preparation"]
): Promise<RuntimeDocsAndGatesReceipt> {
  await ctx.requireFreshCurrentInvocationReleaseResume(release);
  await ctx.requireFreshCommittedHeadDriftGate(
    committedHeadDrift,
    { runtimeTree: release.runtimeTree }
  );
  await ctx.runExactReadOnlyDocsCheck("bun run docs:check");
  const bundle = await loadPackagedDocsDistributionBundleV2();
  const landed = await ctx.loadAndValidateLandedDurableHandoffsReadOnly({
    bundle,
    coverageReport: "core/generated/docs/coderso-docs-coverage-v2.json",
    coverageMatrix: "docs/guide/_COVERAGE_MATRIX.md",
    visualReceiptsAndAssets: "docs/guide/assets",
    requireReleaseCapsuleManifestAndSearchReceipts: true,
    expectedRelease: release.request,
    verifiedReleaseResume: release,
  });
  await ctx.runExactClosureValidationAllowlist(landed);
  await ctx.assertNoCanonicalArtifactOrTrackedInputMutation(landed);
  await ctx.assertAllModifiedHumanProductionAndTestFilesAtMost(1000);
  return ctx.createRuntimeDocsAndGatesReceipt({ landed });
}
export async function runTask548FinalSmokePhase1(
  ctx: CloseoutContext,
  { preparation }: Task548PhasePayloadMapV1["07-L01-final-smoke-phase1-owner-pause"]
): Promise<Task548OwnerActionRequired> {
  await ctx.requireFreshRuntimeDocsAndGatesReceipt(preparation);
  let retainedPages: DocsRetainedPagesValidationSessionV1 | null = null;
  const result = await ctx.runWithTask548CleanupV1({
    body: async () => {
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
          await ctx.runExactCommand(
            "bun test tests/integration/documentation/docsPlatformAcceptance.test.ts",
            { env: mount.exactChildProcessEnv }
          );
          await ctx.restartOwnedServers();
          const smokeResult = await ctx.runExactAcceptanceSmokeCommand(
            "bun scripts/docs/run-acceptance-smoke.ts",
            REQUIRED_FLOW_IDS,
            "wf548smoke",
            { env: mount.exactChildProcessEnv }
          );
          await assertCompleteVisibleEvidence(smokeResult, { consoleErrors: 0 });
          return smokeResult;
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
        run: async () => ctx.cleanupAndAssertPriorState(),
      },
    ],
  });
  await ctx.writeExactTask545CanonicalManifestAndEightScreenshots(result);
  const bootstrapReceipt: Task548CommittedSixPathBootstrapReceiptV1 =
    await ctx.requireCurrentCommittedExactSixPathBootstrapGate();
  await requireTask548CommittedSixPathBootstrapAuthorizationV1({
    repoRoot: ctx.repoRoot, receipt: bootstrapReceipt,
  });
  return createResumeCheckpoint({
    repoRoot: ctx.repoRoot,
    expectedTask: "TASK-548",
    pinnedChangelogNumber: 1261,
    pinnedChangelogSlug: "task-548-hybrid-visual-documentation",
    expectedWorkflowRole: "implement",
    executingImportMetaUrl: import.meta.url,
    runtimeResult: result,
  });
  // Returns owner_action_required immediately. No metadata write, stage,
  // commit, or post-phase-1 action.
}
export async function resumeTask548TrackedParity(
  ctx: CloseoutResumeContext,
  { argv }: Task548PhasePayloadMapV1["07-L01-owner-resume-tracked-parity"]
): Promise<Task548ClosureResume> {
  const resume = await ctx.openExactOwningWorkflowResume({
    argv,
    expectedTask: "TASK-548", expectedWorkflowRole: "implement",
    executingImportMetaUrl: import.meta.url,
  });
  await ctx.requireOwnerReviewedTrackedEvidenceParity();
  return resume;
}
export async function requireTask548InvalidatedCheckpointOwnerRetirement(
  ctx: CloseoutResumeContext,
  { resume, finalDrift }: Task548PhasePayloadMapV1["07-L01-invalidated-checkpoint-owner-retirement-pause"]
): Promise<Task548InvalidatedCheckpointOwnerActionRequired> {
  await ctx.requireExactNonPassingFinalDrift(finalDrift);
  return ctx.createExactInvalidatedCheckpointOwnerAction(resume, {
    reason: "final_drift_nonpass",
    expectedEvidencePaths: TASK_548_MANIFEST_EIGHT_PNGS_AND_CHECKPOINT,
  });
}
export async function confirmTask548InvalidatedCheckpointRetired(
  ctx: CloseoutContext,
  { argv }: Task548PhasePayloadMapV1["07-L01-confirm-invalidated-checkpoint-retired"]
): Promise<void> {
  await ctx.requireExactRestartArgsFromPriorRetirementAction(argv);
  await ctx.requireCanonicalEvidencePathsAbsentFromIndexAndWorktree(
    TASK_548_MANIFEST_EIGHT_PNGS_AND_CHECKPOINT
  );
  await ctx.requireEvidenceDirectoryAbsentOrEmptyNoSymlink();
}
export async function completeTask548TerminalCloseout(
  ctx: CloseoutResumeContext,
  input: Task548PhasePayloadMapV1["07-L01-terminal-metadata-closeout-and-mechanical-delta-verification"]
): Promise<Task548MetadataDeltaReceipt> {
  await ctx.requireTrackedResumeBoundToCurrentCheckpoint(input.resume);
  const checkpoint: VerifiedTask545Checkpoint = input.resume.checkpoint;
  const closureIdentity: Task545ClosureIdentity = input.resume.closureIdentity;
  const durable = await ctx.readDeterministicDurableCloseoutSources({
    checkpointIdentity: checkpoint,
    closureIdentity,
    canonicalEvidence:
      await ctx.readExactCanonicalManifestAndEightScreenshots(),
    frozenOnDiskFacts:
      await ctx.readCurrentFrozenOnDiskProductTaskFactsAndDurableReceipts(),
    planningAudit:
      await ctx.readExistingOnDiskNonAuthorizingPlanningAuditRecord(),
  });
  const plan = await ctx.buildDeterministicTask548MetadataPlan(durable, {
    firstWrite: "ordered-durable-changelog-file-then-index@v1",
    finalDriftGate: "passed-before-closure",
    closureIdentity,
  });
  if (input.resume.state === "frozen") {
    await ctx.requirePassedFinalDriftBoundToFrozenRuntime(input.finalDrift, {
      exactFindings: [],
    });
  } else {
    await ctx.requireNoFinalDriftPayload(input);
    await ctx.validateExactMetadataRecoveryPrefix(input.resume.delta, plan, {
      requireInitialState: ["file-only", "both"],
    });
  }
  const completedClosureIdentity =
    await writeOrResumeOrderedDurableChangelogFileThenIndexV1({
      repoRoot: ctx.repoRoot,
      checkpoint,
      runId: checkpoint.runId,
      closureIdentity,
      changelogBytes: plan.changelog1261,
      changelogIndexMutation: plan.changelogIndex1261,
      protocol: "ordered-durable-changelog-file-then-index@v1",
    });
  await ctx.completeMissingDeterministicMetadataWritesIdempotently(plan);
  const delta = await ctx.validateExactMetadataOnlyClosureDelta({
    closureIdentity: completedClosureIdentity,
    exactKeys: [
      "pass",
      "taskId",
      "runId",
      "closureMetadataRevision",
      "changedPaths",
    ],
  });
  return delta; // orchestrator emits this once; 07 never emits or persists it
}
```

**Data flow:** final implementation → owned runtime/product docs → bounded
plain-SemVer release inputs and prerelease gates → canonical 08 prerelease
post-audit/fix/revalidation → exact owner commit/merge/tag/release/Cloudflare
action → terminate. A fresh `task548-release-resume` parses only its eight CLI
fields → HEAD/tag-target commit equality → clean index/worktree parity → one
bounded untouched Git record stream → L01 pure create/normalize/serialize → exact
`DocsReleaseTreeBindingV1` byte identity across manifest, artifact, retained
publication, rollback and post-deploy health receipts → fresh HEAD 08 drift
gate → read-only `docs:check`, one zero-input atomic packaged-bundle load and the exact
full-gate allowlist → one task-local retained-Pages validation session → current
04-L03 portal evidence → eight ordered visible flows → unconditional cleanup →
exact manifest/eight screenshots → TASK-545 phase 1 checkpoint → second owner
pause and process termination. Neither fresh invocation receives authority from
an earlier process.

The separate checkpoint-bound closure resume verifies tracked parity and final
drift. TASK-545 returns the sole `closureIdentity`: on `frozen` it has required
canonical state `none` and selected current canonical UTC; on recovery it has
discovered one strict regular non-symlink TASK-548 changelog and zero (`file-only`)
or one (`both`) matching index row before delta allowlisting. 07 consumes that identity
directly, never rereads current time or resolves the path. It closes descendants before parents and returns (but does not emit) the
five-key delta; 08 emits it once. A pre-write crash may choose the new current
date, while a post-write UTC-boundary crash preserves the changelog date.

**Error handling:** missing/duplicate/unknown/unbounded release-resume fields;
non-plain or unequal version/tag; wrong repository object format/OID width,
all-zero/mixed-width/uppercase commit or tree OID, wrong HEAD/tag commit, dirty
index/worktree or noncanonical/divergent runtime-tree binding; mismatched run/attempt/deployment/origin/base; mutable/conflicting
05-L02 assets; or invalid post-deploy evidence blocks before drift, preparation
or smoke. The prerelease owner action terminates the process, and 07 never
stages, commits, merges, tags, releases, publishes, deploys or rolls back. A
post-release drift/gate defect returns to its owner and requires a newly
committed/released identity; released bytes are never repaired in place.

Malformed results, hash drift, console/page/network errors, inaccessible DB,
cleanup drift, unresolved findings, workspace hazards, stale packaged bytes or
a >1,000-line touched file also stop before metadata. This leaf never recovers
or regenerates corpus/bundle/coverage/visual/release/publication state. If a
checkpoint exists, it remains untouched until the owner retires its exact ten
paths; the replacement flow restarts at prerelease inputs and obtains a new
release before smoke. Release-resume, checkpoint resume and retirement-restart invocation
arguments are mutually exclusive. Any evidence or non-metadata mutation after
smoke invalidates the snapshot. A final-drift finding writes nothing and returns
the retirement action. Pre-phase-1 metadata, schema sidecars/extensions,
non-prefix recovery, unavailable pre-pause payload claims, or substantive work
after terminal metadata rejects. Recovery also rejects index-only/corrupt/multiple
state or any filename/body/index date, task, number or path mismatch.

Phase 1 pins changelog 1261 and slug `task-548-hybrid-visual-documentation`;
its final metadata returns exactly the declared key set. Closeout
persists only durable facts plus `final-drift: passed-before-closure`; it never
reconstructs authoring/post-audit, page/network, bundle/health/cleanup or dynamic
final-drift history.

**Regression-test shape:** fixtures pin the three exclusive invocation modes,
both mandatory termination points, exact eight release-resume fields, clean
HEAD/tag commit, SHA-1/SHA-256 Git/tree OIDs, exact runtime-tree binding joins
through manifest/artifact/retained/rollback/health receipts, and
rejection of injected pre-pause objects. They pin TASK-545's returned frozen/
recovery identity, no 07 clock/path resolution, and a post-changelog UTC rollover.
Child-process kills cover every journal/temp write, fsync, rename and directory-
fsync boundary; only none/file-only/both recover, with index-only/corrupt blocked.
Type checks import TASK-545's checkpoint/identity/delta/resume exports without redeclaration.
They prove no 07 release mutation, no preparation/smoke before fresh committed-
HEAD drift, and a new release after any post-release fix. Acceptance fixtures
also pin exact flow order, offline/isolation/RBAC/a11y behavior, immutable
retained-Pages ancestry/tree/receipt joins, eight hashes and idempotent cleanup;
wrong identity, path, symlink, receipt or sealed snapshot fails before evidence.

## Sub-Tasks

- [ ] Run every targeted/full gate and verify cleanup plus line counts.
- [ ] Execute all eight ordered real flows and hash the evidence.
- [ ] Finish docs before the prerelease audit; enforce the owner release pause,
  fresh release-resume verification/smoke, separate checkpoint resume, final
  drift and descendant-first metadata-only closeout.

## Testing Requirements

1. Finish owned docs, derive strict planned release inputs, run prerelease
   gates, and require one canonical 08 prerelease post-audit. Assert the exact
   owner commit/merge/plain-tag/release/Cloudflare action, immediate process
   termination, and zero 07 repository/release/deployment mutation.
2. In a fresh process accept only `task548-release-resume` with exact bounded
   version/tag/SHA/run/attempt/deployment/origin/base fields. Reject missing,
   duplicate, unknown, normalized-only, oversized and mixed closure/retirement
   args, plus every attempt to inject or reuse a pre-pause object.
3. Prove HEAD/tag target equal the repository-format lowercase 40/64-hex commit
   OID; validate one bounded untouched canonical Git record stream, then call L01's
   pure create/normalize/serialize API directly to derive `DocsReleaseTreeBindingV1` from the clean checkout.
   The binding is not an extra CLI field and must remain exact through the
   05-L02 manifest/artifact pair, retained capsule, rollback selection/receipt,
   health receipt, workflow/deployment identity and
   exact one-member 90-day post-deploy artifact. Reject every identity, hash,
   inventory, search-attempt or portal-receipt mismatch and clean its temp tree.
4. Run a fresh read-only 08 committed-HEAD drift gate before 07 preparation.
   A failure runs neither preparation nor smoke and requires a new commit/tag/
   release/deploy cycle; never mutate an immutable released identity.
5. Load `.env` and prove DB reachability. Run exactly the Vitest/Bun/DB,
   read-only docs/visual/coverage checks, package builds, lint/type/admin/full/
   security/diff commands in the allowlist; compare every tracked input hash.
   Re-run a named failure once in isolation. No excluded producer is authorized.
6. Prove the sole zero-input `loadPackagedDocsDistributionBundleV2()` atomically
   inspects hazards and loads/validates a clean checkout without the ignored report; no separate consumer guard or recovery,
   regeneration, rename, delete or fsync. Validate `docs/guide/_TEMPLATE.md`
   read-only and all landed coverage/visual/release/publication handoffs.
7. Use only the disposable 05-L02 local retained-Pages helper in final smoke.
   Pin its two slots, ancestry, trees, receipts and three sealed snapshots; run
   pre-mount and unconditional post-use verification, both exact consumers,
   all eight ordered flows, zero errors, exact manifest/PNG hashes and cleanup.
8. Write only TASK-545's manifest/eight screenshots, invoke its sole checkpoint
   writer, assert the exact phase-1 key set, then terminate without metadata,
   staging, commit, sidecar or later action.
9. In a separate checkpoint-bound closure resume, after owner staging, require
    `_docs/_workflows/_smoke/evidence/task-548/`, invoke the returned exact
    owning-workflow resume and require tracked parity without a metadata write.
    If `openWorkflowClosureResume` returns `frozen`, dispatch a fresh
    `08-final-read-only-drift` against the checkpoint-frozen runtime before any
    terminal status/changelog edit and require exactly no findings. Any finding
    aborts resume unchanged and returns the exact
    `retire_invalidated_task548_checkpoint` action. Verify the owner then
    unstages/retires exactly the bound manifest/eight PNGs/checkpoint, and require
    the returned argv plus absent index/worktree inventory before a new current-
    tree drift derives scoped fixes and a new phase 1. Partial retirement fails. If it returns
    `metadata_recovery`, do not rerun
    smoke or final drift and do not require an unavailable prior result.
    No allowlisted preparation command or excluded producer may run in either
    frozen resume branch. A newly discovered write/recovery need exits frozen
    closure unchanged, returns to the exact owner, and requires a new release
    and snapshot.
10. Derive one deterministic metadata plan from only the verified checkpoint
   identity/frozen revision/closure contract and TASK-545-returned
   `closureIdentity`, exact canonical
    manifest/screenshots, current rereadable frozen on-disk product/task facts
    and durable repository receipts, and the existing on-disk non-authorizing
   planning-audit record. In `frozen`, validate final drift and consume TASK-545's
   `none` identity. Write the fixed drift marker only through TASK-545's exact
   `writeOrResumeOrderedDurableChangelogFileThenIndexV1` call with
   `ordered-durable-changelog-file-then-index@v1`: checkpoint/run-bound journal;
   no-replace changelog + fsync;
   then index CAS temp/rename + fsync. In `metadata_recovery`, consume its strict
   `file-only|both` identity and immutable date, require the exact prefix, finish
   file-only's index idempotently, validate both, then
    complete only missing writes idempotently. Complete every descendant before
    its parent, update board/index/statistics and changelog, and only then run
    the narrow mechanical validator requiring exactly
    `{ pass, taskId, runId, closureMetadataRevision, changedPaths }`. Return it
    to 08 for exactly one external emit; never persist it. Any source/test/config/runtime-doc/
    workflow/evidence/HEAD or other-task delta fails. No substantive audit or
    mutation follows terminal metadata.
11. Prove the TASK-545 manifest has its exact owner schema and the directory has
    no audit/bundle/network/cleanup summary file or field. Prove closeout never
    reconstructs or claims historical page-error, unexpected-network,
    bundle/health, cleanup, authoring/post-audit, or dynamic final-drift details
    that are absent from the durable sources.
12. Audit every added/modified production and test file with `wc -l`; any count
    above 1,000 fails.

## Documentation Updates Required

Update only the exact owned files above. Explain one-source compilation, visual
promotion, Help, Guide/Agent isolation, offline behavior, reindex, portal
versioning, capsule release/rollback, post-deploy health, security and
validation. `_docs/ASSISTANT_GUIDE.md` and
`_docs/ASSISTANT_SITE_BUILDER.md` are mandatory shared assistant-workflow
updates, not conditional files. Claim only actually shipped locales, never
Polish/Admin UI parity.

## Acceptance Criteria

- Prerelease audit, owner release pause, fresh committed-HEAD/receipt gate, all
  full gates and eight flows pass with SHA-256 evidence, zero errors and cleanup.
- Docs match shipped contracts; no planned TASK-547 path is called shipped.
- TASK-548-08 has no unresolved HIGH/MEDIUM drift or missing agent result.
- Final drift passes before terminal metadata; deterministic closeout is first
  written afterward, the mechanical delta receipt remains external, and no
  substantive work follows closure.
- Changelog/board update once; leaves close before parents and TASK-548 last.
