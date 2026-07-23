# TASK-548-02-L03: Visual Staleness, Diff and CI Gates
# FileName: TASK-548-02-L03-Visual-Staleness-Diff-And-CI-Gates.md

**Parent Subtask:** TASK-548-02
**Priority:** Critical
**Category:** Documentation Platform / CI / Visual Regression
**Estimated Effort:** Large
**Dependencies:** TASK-548-02-L02
**Status:** ⏳ To Do

---

## Overview

Make canonical visuals self-invalidating when their scenario or owning UI
changes. Add watch-path hashing, changed-scenario selection, deterministic image
comparison, machine-readable reports and PR/full CI gates. Own
`scripts/docs/check-visuals.ts`, focused diff/staleness modules,
root `package.json`, root `bun.lock`,
`packages/docs-renderer/package.json`,
`packages/docs-portal/package.json`,
`.github/workflows/coderso-pr-gates.yml` and focused tests. No other TASK-548
leaf edits those shared files or either workspace manifest.

Pin `@playwright/cli` and any small, reviewable PNG pixel-diff dependencies
needed by this tooling; do not add an unpinned global install. Package scripts
must expose compile/check, capture, promote and visual-check commands without
changing the existing test/precommit command meanings.

## Workspace and Lock Contract

This leaf creates both downstream workspace manifests before the one TASK-548
`bun install`/lock reconciliation. Their exact initial contents are:

```json
{
  "name": "@coderso/docs-renderer",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "sideEffects": false,
  "exports": { ".": "./src/index.ts" },
  "scripts": { "check": "tsc -p tsconfig.json --noEmit" },
  "peerDependencies": { "react": "^19.2.8" },
  "devDependencies": {
    "@types/react": "^19.2.17",
    "typescript": "6.0.3"
  }
}
```

```json
{
  "name": "@coderso/docs-portal",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "bun run src/build/buildDocsPortal.ts",
    "build:client": "vite build --config vite.config.ts",
    "check": "tsc -p tsconfig.json --noEmit",
    "preview": "vite preview --config vite.config.ts",
    "validate": "bun run scripts/validate-built-portal.ts dist"
  },
  "dependencies": {
    "@coderso/docs-renderer": "workspace:*",
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.4",
    "typescript": "6.0.3",
    "vite": "^8.1.5"
  }
}
```

Those versions match the verified root/core toolchain at authoring. Re-read the
live manifests before writing; if that stack intentionally moved, amend this
contract before implementation, then reconcile once. TASK-548-03-L02 owns
renderer source/tsconfig only. TASK-548-04-L01 owns portal
source/tsconfig/Vite config only. Neither may edit either manifest, the root
package or the root lock. Root scripts added here are exactly:

```json
{
  "docs:compile": "bun scripts/docs/compile-corpus.ts --write",
  "docs:check": "bun scripts/docs/compile-corpus.ts --check",
  "docs:visual:capture": "bun scripts/docs/capture-visual.ts",
  "docs:visual:promote": "bun scripts/docs/promote-visual.ts",
  "docs:visual:check": "bun scripts/docs/check-visuals.ts"
}
```

Any new visual dependency is exact-version pinned, license reviewed and
included in the same reconciliation.

## Staleness Contract

`sourceHash` is SHA-256 over canonical relative path + exact bytes for:

1. the strict scenario and fixture-profile contract;
2. the referenced v2 document/section metadata;
3. required shared runner/theme/navigation files from a code-owned base watch
   set;
4. every scenario `watchPaths` match, sorted and confined to the repository;
5. fixed viewport/theme/locale/timezone and pinned browser/tool versions.

An empty glob, symlink escape, ignored generated directory, case collision or
path outside the repository fails closed. Authors may extend the base watch set
but cannot remove its mandatory entries. A receipt is current only when
`visualId`, scenario hash, source hash, image hash and dimensions all match.

Changed-only selection maps the Git merge-base diff to scenarios through the
same watch graph. Changes to the contract, runner, shared admin shell/theme,
fixture registry or compiler select all scenarios. Deleted paths still select
their prior dependents. `--all` validates and optionally recaptures the complete
matrix for nightly/manual release use.

## Diff and Approval Contract

CI captures candidates into `.tmp/docs-visuals/ci/`, compares decoded pixels and
geometry to the canonical PNG, and writes a bounded JSON report plus local
canonical/candidate/diff artifacts. Thresholds are explicit and conservative;
dimension changes always fail. A mismatch fails CI with the visual ID and safe
watch reasons.

Before any pixel artifact upload, executable
`assertVisualArtifactUploadSafe` verifies the strict synthetic fixture profile,
bounded capture target, sanitized PNG chunks, captured target
DOM/accessibility text against secret/PII and credential-URL detectors, zero
third-party image responses, and a bounded allowlisted report. Missing evidence
fails closed. On failure all pixels remain only in the task-owned workspace and
CI uploads a metadata-only diagnostic with visual ID, hashes and safe reason
codes—never DOM text, fixture values or pixels.

The evidence input is exact and recursively reject-unknown:

```ts
type DocsVisualArtifactPrivacyEvidenceV1 = {
  schema: "coderso.docs-visual-privacy-evidence@v1";
  visualId: string;
  syntheticFixture: {
    profile: string;
    runId: string;
    verified: true;
  };
  imagePolicy: {
    rawValidatedWithoutMutation: true;
    uploadBytesSanitized: true;
    forbiddenChunks: 0;
  };
  targetTextScan: {
    scanned: true;
    secretMatches: 0;
    piiMatches: 0;
    credentialUrlMatches: 0;
  };
  networkOrigins: {
    inspected: true;
    localOrigins: string[];
    thirdPartyImageOrigins: [];
  };
};
```

All strings, arrays and aggregate bytes are bounded; local origins are
allowlisted and sorted. Missing, malformed, uninspected or unsafe evidence
blocks all pixel staging and yields metadata-only reason codes.

CI never invokes promotion, modifies `docs/guide/assets`, writes a review
receipt or updates a baseline. A human/agent must inspect the artifact locally,
rerun the explicit promotion command with the staged SHA-256, and commit the
reviewed image/receipt.

## Security Contract

- **Endpoint visibility:** no new endpoint. CI uses existing admin routes on a
  task-owned local server.
- **Auth/RBAC:** scenario-scoped synthetic accounts and declared permissions;
  credentials live only in CI secrets/runtime environment and are redacted.
- **CSRF/rate limit:** real flows preserve existing protections/buckets.
- **Validation:** strict watch graph, confined paths, pinned tool versions,
  canonical PNG/receipt hashes, bounded pixel decode/diff and schema-validated
  JSON report.
- **Anti-abuse:** no public write, nonce/HMAC or CAPTCHA. Bound file count,
  decoded pixels, memory, parallel sessions, retry/time budgets and uploaded
  artifact bytes.
- **Supply chain/privacy:** pin new dependencies and GitHub actions; do not
  upload `.env`, cookies, traces, full logs or unreviewed screenshots containing
  unexpected data. CI fixtures remain synthetic. Pixel upload is reachable only
  after `assertVisualArtifactUploadSafe`; privacy failure emits metadata-only
  evidence and keeps all pixels local.
- **Cleanup:** close exact CLI sessions, clear routes, remove scoped fixtures and
  stop only owned processes even when diff/check fails.

## Implementation Pseudocode

```ts
export async function computeVisualStaleness(
  scenario: DocsVisualScenarioV1,
  receipt: DocsVisualReceiptV1
) {
  const watchedFiles = await resolveMandatoryAndScenarioWatchPaths(scenario);
  const sourceHash = hashCanonicalWatchedFiles(watchedFiles, scenario);
  const image = await inspectCanonicalImage(scenario.visualId);
  return {
    current:
      receipt.sourceHash === sourceHash &&
      receipt.canonicalImageSha256 === image.sha256 &&
      receipt.width === image.width &&
      receipt.height === image.height,
    sourceHash,
    reasons: explainHashInputsWithoutFileContents(watchedFiles, receipt),
  };
}

export async function checkDocsVisuals(options: CheckVisualsOptions) {
  const graph = await buildVisualWatchGraph();
  const selected = options.all ? graph.all : selectChangedScenarios(graph, options.mergeBase);
  const reports: DocsVisualDiffReport[] = [];
  const privacyEvidence: DocsVisualArtifactPrivacyEvidenceV1[] = [];
  for (const scenario of selected) {
    assertCurrentReceipt(await computeVisualStaleness(scenario, await loadReceipt(scenario)));
    if (options.capture) {
      const runId = await createCollisionCheckedCiVisualRunId({
        visualId: scenario.visualId,
        attempt: 0,
      });
      const candidate = await captureDocsVisual({
        visualId: scenario.visualId,
        runId,
      });
      reports.push(await compareCanonicalAndCandidate(scenario, candidate));
      privacyEvidence.push(await loadCapturePrivacyEvidence(candidate));
    }
  }
  await writeBoundedVisualReport(reports);
  const uploadDecision = await assertVisualArtifactUploadSafe({
    reports,
    evidence: privacyEvidence,
  });
  if (!uploadDecision.safe) {
    await writeMetadataOnlyPrivacyDiagnostic(uploadDecision);
    throw new Error("docs_visual_artifact_privacy_blocked");
  }
  await stageApprovedPixelArtifactsForCiUpload(uploadDecision.artifactPaths);
  assertNoVisualMismatch(reports);
}
```

**Data flow:** Git diff/all selector → strict watch graph → receipt/hash
validation → deterministic bounded/collision-checked CI run ID → optional real
recapture through the `visualId` registry boundary → bounded
decode/geometry/pixel diff →
JSON/artifact → pass/fail and unconditional cleanup. The compiler check runs
afterward so corpus, image and receipt cannot drift independently. Pixel
artifacts remain local until the explicit privacy decision; only paths returned
by that decision reach the workflow upload step.

**Error handling:** use `docs_visual_watch_invalid`,
`docs_visual_stale`, `docs_visual_receipt_invalid`,
`docs_visual_tool_version_mismatch`, `docs_visual_diff_mismatch`,
`docs_visual_artifact_privacy_blocked`,
`docs_visual_ci_environment_invalid` and `docs_visual_cleanup_failed`.
Reports list safe relative paths/reasons, never file bodies, fixture values or
credentials.

**Regression-test shape:** unchanged hash passes; each scenario/base watch input
change selects the right scenario; contract/shared-shell changes select all;
deletion and rename remain detectable; traversal/symlink/empty glob fails;
receipt/image tampering fails; identical pixels pass; dimension and over-threshold
pixel changes fail; report remains bounded; CI code has no promotion path and
always cleans up. Prove CI run IDs are deterministic, bounded,
collision-checked and passed unchanged to capture; scenario paths are never
capture inputs. Prove safe synthetic pixels may be staged, while secret-like
target text, third-party images, unsafe metadata, missing inspection evidence
or an exception blocks pixels and emits only bounded metadata.

## CI Shape

- PR gate always runs strict corpus compile `--check`, referential/orphan checks
  and read-only receipt/staleness validation.
- A dedicated changed-visual job starts the real app, installs the pinned CLI
  browser, runs selected scenarios with low bounded parallelism, requires zero
  console/page errors and uploads diffs on failure only after the executable
  privacy gate. On privacy failure it uploads metadata-only diagnostics.
- Nightly/manual `--all --capture` runs the complete scenario matrix across the
  fixed viewport/theme variants required by manifests.
- CI detects a changed baseline but never accepts it. Missing DB/tool/browser
  prerequisites are blocking environment failures, not skipped success.

## Sub-Tasks

- [ ] Add watch graph, staleness, pixel/geometry diff and bounded report modules.
- [ ] Pin tooling dependencies and add `docs:compile`, `docs:check`,
  `docs:visual:capture`, `docs:visual:promote` and `docs:visual:check` scripts.
- [ ] Pre-create both exact docs workspace manifests, then reconcile root
  `package.json` and `bun.lock` once; forbid later TASK-548 manifest/lock
  writers in contract tests.
- [ ] Add changed-only PR plus full scheduled/manual workflow steps with pinned
  actions, privacy-gated artifacts, metadata-only failure evidence and
  unconditional cleanup.
- [ ] Add `tests/vitest/documentation/docs-visual-staleness.test.ts`,
  `docs-visual-diff.test.ts` and a workflow/package contract test.

## Testing Requirements

- `bun run docs:check`
- `bun run docs:visual:check -- --all`
- `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-visual-staleness.test.ts tests/vitest/documentation/docs-visual-diff.test.ts tests/vitest/documentation/docs-visual-ci-contract.test.ts`
- changed-only CI dry-run against a synthetic merge-base fixture, plus one
  intentional safe diff proving artifact/failure behavior and no baseline
  write, plus one privacy failure proving zero pixel upload
- workspace/package contract test pinning both exact manifests, the five root
  scripts, sole-writer ownership and one lock reconciliation
- privacy evidence schema/limit/reject-unknown tests plus missing/unsafe
  evidence metadata-only upload tests
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit:check`
- touched-file line counts

## Documentation Updates Required

Send the watch-path, regeneration, review, CI and failure-triage runbook to the
TASK-548 closure owner. Record pinned versions and any scanner/config exception
with owner, reason, expiry and ticket.
