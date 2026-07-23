# TASK-548-02-L03: Visual Staleness, Diff and CI Gates
# FileName: TASK-548-02-L03-Visual-Staleness-Diff-And-CI-Gates.md

**Parent Subtask:** TASK-548-02
**Priority:** Critical
**Category:** Documentation Platform / CI / Visual Regression
**Estimated Effort:** Large
**Dependencies:** TASK-548-02-L02 and the one same-owner TASK-548-01-L02
post-pilot bundle/report refresh and complete compiler gate
**Status:** ⏳ To Do

---

## Overview

Make canonical visuals self-invalidating when their scenario or owning UI
changes. Add watch-path hashing, changed-scenario selection, deterministic image
comparison, machine-readable reports and PR/full CI gates. Own
`scripts/docs/check-visuals.ts`, `scripts/docs/recover-artifacts.ts`, focused
diff/staleness/recovery-orchestration modules, root `package.json`,
`core/package.json`, root `bun.lock`, `Dockerfile`,
`packages/docs-renderer/package.json`,
`packages/docs-portal/package.json`,
`.github/workflows/coderso-pr-gates.yml` and focused tests. No other TASK-548
leaf edits those shared files, either workspace manifest, the Dockerfile or the
core manifest.

Pin `@playwright/cli` and any small, reviewable PNG pixel-diff dependencies
needed by this tooling; do not add an unpinned global install. Package scripts
must expose the seven exact compile/check/recover/coverage, capture, promote
and visual-check commands below without changing the existing test/precommit
command meanings.

Implementation may begin only after TASK-548-02-L02 has promoted all five pilot
triples and the TASK-548-01-L02 owner has completed the one post-pilot
bundle/report refresh. This leaf never writes that bundle/report and never
requests a per-scenario refresh.

The ignored report is not a PR, clean-checkout, Docker, runtime, portal,
release, or read-only compiler-check prerequisite. `docs:check` invokes
TASK-548-01-L02's read-only workspace hazard inspector, accepts a strict
`packaged-bundle-only` clean clone as well as a valid linked authoring pair, and
compares the tracked bundle with recomputed canonical bytes/`sourceHash`.
Report-only state and transaction debris fail closed. `docs:recover` remains the
only explicit mutating interrupted-write recovery surface; it preserves a valid
bundle-only prestate and never synthesizes a missing report.

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
renderer source/tsconfig only. TASK-548-04-L01 owns portal shell/search source,
tsconfig and Vite config only; TASK-548-04-L02 owns `src/build/**`. Neither may
edit either manifest, the root package or the root lock.

The portal package's exact `build` script above calls only
`packages/docs-portal/src/build/buildDocsPortal.ts`. TASK-548-04-L02 exclusively
owns that exact entrypoint and its `DocsPortalBuildConfigV1`,
`normalizeDocsPortalBuildConfigV1` and
`readDocsPortalBuildConfigV1FromEnvironment` contracts. Its executable path
maps the environment only through the L02-owned reader:

```ts
await buildDocsPortal(
  readDocsPortalBuildConfigV1FromEnvironment(process.env)
);
```

That reader alone maps `DOCS_PRODUCT_VERSION`, `DOCS_PUBLIC_ORIGIN`,
`DOCS_PUBLIC_BASE_PATH` and `SOURCE_DATE_EPOCH` to the four exact configuration
fields and delegates to the same L02-owned normalizer. The package script
introduces no aliases, defaults, trimming or duplicate normalization.
TASK-548-04-L01 owns no build configuration/parser contract;
TASK-548-05-L02 supplies the release values.

When core imports renderer-owned Admin or release modules,
`core/package.json` must contain exactly:

```json
{
  "dependencies": {
    "@coderso/docs-renderer": "workspace:*"
  }
}
```

Merge that key into the live dependency object without rewriting unrelated
entries. Before the one frozen-lock install, `Dockerfile` must copy both new
workspace manifests in addition to the existing root/core/store/SDK manifests:

```dockerfile
COPY packages/docs-renderer/package.json packages/docs-renderer/package.json
COPY packages/docs-portal/package.json packages/docs-portal/package.json
RUN bun install --frozen-lockfile
```

Both `COPY` lines must precede that `RUN`; copying the workspace source later
does not satisfy dependency resolution. This leaf's gate runs the one
`bun install --frozen-lockfile` after the manifest/lock reconciliation and
statically parses the Dockerfile to prove both exact `COPY` instructions occur
before the existing frozen install. It also pins the exact later-owned
renderer package export entrypoint and portal build entrypoint strings in the
workspace manifests.

At this land point, `packages/docs-renderer/src/**`, its `tsconfig.json`, and
`packages/docs-portal/src/build/buildDocsPortal.ts` do not exist yet.
Consequently this leaf must not run the renderer `check` script, import
`@coderso/docs-renderer` from core, invoke `bun --cwd packages/docs-portal
build`, or build/run the final Docker image. TASK-548-03-L02 performs the first
executable renderer-package and core-import validation after it creates the
renderer source. TASK-548-04-L02 performs the first executable portal build
and combined Docker image/runtime validation after both renderer and portal
source exist. Those later validations are read-only consumers of this leaf's
manifests, lockfile, core dependency, and Dockerfile; they never receive write
ownership of them.

Root scripts added here are exactly:

```json
{
  "docs:compile": "bun scripts/docs/compile-corpus.ts --write",
  "docs:check": "bun scripts/docs/compile-corpus.ts --check",
  "docs:recover": "bun scripts/docs/recover-artifacts.ts",
  "docs:coverage": "bun scripts/docs/generate-coverage-matrix.ts",
  "docs:visual:capture": "bun scripts/docs/capture-visual.ts",
  "docs:visual:promote": "bun scripts/docs/promote-visual.ts",
  "docs:visual:check": "bun scripts/docs/check-visuals.ts"
}
```

Any new visual dependency is exact-version pinned, license reviewed and
included in the same reconciliation.

## Staleness Contract

TASK-548-02-L01 exclusively owns
`DOCS_VISUAL_BASE_WATCH_PATTERNS_V1`,
`DocsVisualSourceHashInputV1` and
`computeDocsVisualSourceHashV1`. This leaf imports them. Its watch collector
resolves the exact scenario, fixture, referenced document/section metadata,
mandatory-base, scenario-watch and pinned-tool-version inputs required by that
contract, then passes them to the helper unchanged; it defines no local
sort/hash algorithm or alternate base set.

An empty required match, symlink escape, ignored generated directory, case
collision or path outside the repository fails closed. A receipt is current
only when its exact `docId`, canonical BCP-47 `locale`, `sectionId` and
bundle-global `visualId` equal the scenario/path identity and its scenario
hash, imported-helper source hash, image hash and dimensions all match. Before
building the watch graph, loading any receipt or reading any canonical PNG,
the checker calls TASK-548-01-L02's read-only inspector with TASK-548-02-L02's
exact factory:

```ts
await assertNoDocsVisualPairPromotionHazardsV1({
  validateStablePairForVisual: createDocsVisualStablePairValidatorV1,
});
```

A live or tampered journal in any phase, orphan preparing-journal temp, owned
member temp/staging/backup artifact or mixed/invalid pair blocks staleness and
diff as `docs_compile_recovery_required`; the checker directs the operator to
`bun run docs:recover` and never mutates recovery state.

Changed-only selection maps the Git merge-base diff to scenarios through the
same watch graph. Changes to the contract, runner, shared admin shell/theme,
fixture registry or compiler select all scenarios. Deleted paths still select
their prior dependents. `--all` validates and optionally recaptures the complete
matrix for nightly/manual release use.

## Recovery Orchestration Contract

This leaf exclusively owns
`scripts/docs/recovery/recoverDocsArtifactsV1.ts` and
`scripts/docs/recover-artifacts.ts`. The reusable helper wires the unchanged
TASK-548-01-L02 owners to the unchanged TASK-548-02-L02 factory exactly:

```ts
export async function recoverDocsArtifactsV1() {
  const workspace = await recoverDocsWorkspaceArtifactPromotionV1();
  const visuals = await recoverAllDocsVisualPairPromotionsV1({
    validateStablePairForVisual: createDocsVisualStablePairValidatorV1,
  });
  return normalizeBoundedDocsArtifactRecoveryResultV1({
    workspace,
    visuals,
  });
}
```

The CLI invokes only this helper and emits its one bounded canonical JSON
result. Workspace recovery precedes sorted visual recovery. The exact same
`createDocsVisualStablePairValidatorV1` function reference is used by this
mutating recovery, the compiler's active visual mode and the staleness
inspector; this leaf does not reopen TASK-548-01-L02, wrap the factory with
weaker semantics, or substitute an absence-/existence-only validator.
With no workspace journal, the workspace owner accepts and preserves exact
`bootstrap-none`, `packaged-bundle-only`, or `linked-pair` state; report-only
state rejects. Visual recovery still rejects every partial image/receipt pair.

## Diff and Approval Contract

Every CI capture first obtains
`createDocsVisualRunIdV1({ scope: "ci" })` and writes its candidate, report and
local canonical/candidate/diff artifacts only below
`.tmp/docs-visuals/<runId>/`. There is no fixed `.tmp/docs-visuals/ci/` alias.
CI compares decoded pixels and
geometry to the canonical PNG and writes a bounded JSON report plus local
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

Staleness is computed and retained before any optional capture. In read-only
mode, the first selected stale/malformed receipt fails immediately without
starting a browser. In capture mode, pre-capture staleness is evidence rather
than an early return: the checker still captures the candidate, computes
geometry/pixel diff, gathers and validates privacy evidence, and emits the
bounded report. It then fails on the retained stale reason and/or mismatch.
Capture never refreshes, replaces, promotes or otherwise mutates the canonical
PNG/receipt baseline, and post-capture code must not recompute away the retained
pre-capture staleness.

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
  const sourceHashInput = await collectDocsVisualSourceHashInputV1(scenario);
  const sourceHash = computeDocsVisualSourceHashV1(sourceHashInput);
  const identity = {
    docId: scenario.docId,
    locale: scenario.locale,
    sectionId: scenario.sectionId,
    visualId: scenario.visualId,
  };
  const image = await inspectCanonicalImage(identity);
  return {
    current:
      receipt.docId === identity.docId &&
      receipt.locale === identity.locale &&
      receipt.sectionId === identity.sectionId &&
      receipt.visualId === identity.visualId &&
      receipt.sourceHash === sourceHash &&
      receipt.canonicalImageSha256 === image.sha256 &&
      receipt.width === image.width &&
      receipt.height === image.height,
    sourceHash,
    reasons: explainHashInputsWithoutFileContents(sourceHashInput, receipt),
  };
}

export async function checkDocsVisuals(options: CheckVisualsOptions) {
  await assertNoDocsVisualPairPromotionHazardsV1({
    validateStablePairForVisual: createDocsVisualStablePairValidatorV1,
  });
  const graph = await buildVisualWatchGraph();
  const selected = options.all ? graph.all : selectChangedScenarios(graph, options.mergeBase);
  const reports: DocsVisualDiffReport[] = [];
  const privacyEvidence: DocsVisualArtifactPrivacyEvidenceV1[] = [];
  for (const scenario of selected) {
    const identity = {
      docId: scenario.docId,
      locale: scenario.locale,
      sectionId: scenario.sectionId,
      visualId: scenario.visualId,
    };
    const receipt = await loadReceipt(identity);
    const canonicalIdentity = await readCanonicalVisualPairIdentity(identity);
    const preCaptureStaleness = await computeVisualStaleness(scenario, receipt);
    if (!options.capture) {
      assertCurrentReceipt(preCaptureStaleness);
      continue;
    }
    const runId = await createDocsVisualRunIdV1({ scope: "ci" });
    const candidate = await captureDocsVisual({
      ...identity,
      runId,
    });
    const diff = await compareCanonicalAndCandidate(scenario, candidate);
    const evidence = await loadCapturePrivacyEvidence(candidate);
    await assertCanonicalVisualPairIdentityUnchanged(
      scenario,
      canonicalIdentity
    );
    const report = buildVisualDiffReport({
      scenario,
      preCaptureStaleness,
      diff,
    });
    await writeBoundedVisualReport(runId, [report]);
    reports.push(report);
    privacyEvidence.push(evidence);
  }
  if (!options.capture) return;
  const uploadDecision = await assertVisualArtifactUploadSafe({
    reports,
    evidence: privacyEvidence,
  });
  if (!uploadDecision.safe) {
    await writeMetadataOnlyPrivacyDiagnostic(uploadDecision);
    throw new Error("docs_visual_artifact_privacy_blocked");
  }
  await stageApprovedPixelArtifactsForCiUpload(uploadDecision.artifactPaths);
  assertNoRetainedStalenessOrVisualMismatch(reports);
}
```

**Data flow:** read-only durable image/receipt hazard validation → Git diff/all
selector → strict watch graph → L01 owner hash helper → retained pre-capture
localized receipt/image identity and hash validation → caller-owned
bounded collision-checked CSPRNG CI run ID → optional real recapture through
the `visualId` registry boundary → bounded
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
always cleans up. Prove CI run IDs come from the shared CSPRNG generator, are
bounded/collision-checked and pass unchanged to capture; deterministic tests
inject fixed entropy, while production IDs are not deterministic and scenario
paths are never capture inputs. In read-only mode, prove the first stale
selection fails before browser startup. In capture mode, change a watched file
after pre-capture staleness is retained and prove candidate capture, diff and
privacy validation still run, the stale reason survives in the report, the
final result fails, and canonical image/receipt bytes remain unchanged. Repeat
with a visual mismatch and with both stale+mismatch. Prove safe synthetic pixels
may be staged, while secret-like target text, third-party images, unsafe
metadata, missing inspection evidence or an exception blocks pixels and emits
  only bounded metadata. For a multi-scenario capture, prove each per-scenario
  report/canonical/candidate/diff/privacy artifact is written only below that
  scenario's exact `.tmp/docs-visuals/<runId>/` root and no aggregate/fixed-path
  report escapes those roots.

## CI Shape

- PR gate always runs strict corpus compile `--check`, referential/orphan checks
  and read-only receipt/staleness validation. A clean-clone fixture containing
  the tracked bundle and no `.tmp` tree/report must pass with zero mutation.
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
- [ ] Reject every unresolved durable image/receipt transaction through the
  read-only hazard inspector before reads; retain pre-capture staleness and
  enforce the distinct read-only/capture-mode order.
- [ ] Pin tooling dependencies and add `docs:compile`, `docs:check`,
  exact mutating `docs:recover`, `docs:coverage`, `docs:visual:capture`,
  `docs:visual:promote` and `docs:visual:check` scripts (seven exact root
  scripts total).
- [ ] Pre-create both exact docs workspace manifests, then reconcile root
  `package.json` and `bun.lock` once; add the exact core renderer workspace
  dependency and preinstall Docker manifest copies; statically pin the
  later-owned renderer export and portal build entrypoint references; forbid
  later TASK-548 manifest/lock/core-package/Dockerfile writers in contract
  tests.
- [ ] Own `recoverDocsArtifactsV1` plus its CLI, wiring workspace recovery then
  visual recovery with the exact L02 validator factory; add fresh-process
  orchestration coverage.
- [ ] Add changed-only PR plus full scheduled/manual workflow steps with pinned
  actions, privacy-gated artifacts, metadata-only failure evidence and
  unconditional cleanup.
- [ ] Add `tests/vitest/documentation/docs-visual-staleness.test.ts`,
  `docs-visual-diff.test.ts`, plus sole-owner
  `tests/unit/documentation/docsArtifactRecovery.test.ts` and
  `tests/unit/documentation/docsDockerWorkspaceContract.test.ts`.

## Testing Requirements

- `bun install --frozen-lockfile`
- `bun run docs:check`
- `bun run docs:visual:check -- --all`
- `bunx vitest run --config vitest.config.ts tests/vitest/documentation/docs-visual-staleness.test.ts tests/vitest/documentation/docs-visual-diff.test.ts tests/vitest/documentation/docs-visual-ci-contract.test.ts`
- `bun test tests/unit/documentation/docsArtifactRecovery.test.ts tests/unit/documentation/docsDockerWorkspaceContract.test.ts`
- changed-only CI dry-run against a synthetic merge-base fixture, plus one
  intentional safe diff proving artifact/failure behavior and no baseline
  write, plus one privacy failure proving zero pixel upload
- changed-watch ordering regression: retain stale state, mutate the watched
  source before capture, complete capture/diff/privacy work, fail afterward,
  and prove canonical image/receipt byte identity
- workspace/package contract test pinning both exact manifests, the seven root
  scripts (including exact `docs:coverage`), the core renderer dependency,
  preinstall Docker manifest copies, sole-writer ownership and one lock
  reconciliation; this test parses files but never imports future renderer
  source or builds future portal source, while the separate exact frozen
  install command above proves lock/workspace resolution
- portal package contract statically pins only
  `"build": "bun run src/build/buildDocsPortal.ts"`; the four exact
  environment mappings above remain a downstream TASK-548-04-L02 handoff and
  this leaf does not invoke or source-verify that future entrypoint
- Docker workspace contract statically pins the exact two manifest `COPY`
  lines before `RUN bun install --frozen-lockfile`, source-copy/runtime
  references needed by the later image, and forbidden-artifact exclusions; it
  does not build or run the image at this leaf
- a negative land-order regression fails if this leaf's command/test surface
  invokes `packages/docs-renderer/src/**`,
  `packages/docs-portal/src/build/buildDocsPortal.ts`,
  `@coderso/docs-renderer` at runtime, or `docker build`/`docker run`
- staleness integration proves it imports L01's helper, CI passes its generated
  ID unchanged, resolves canonical files through the full localized identity,
  and all CI artifacts stay below `.tmp/docs-visuals/<runId>/`
- `recoverDocsArtifactsV1` spy/integration tests prove workspace-first ordering
  and pass the exact L02 factory unchanged to visual recovery; fresh-process
  preparing/prepared/promoted/verified-commit fixtures prove safe recovery;
  no-journal bundle-only is preserved, report-only rejects, and no recovery path
  creates a report merely because it is absent
- unresolved journal/journal-temp/member-temp/staging/backup/mixed-pair
  fixtures prove the checker invokes the same factory, makes no recovery
  mutation and returns the `docs:recover` diagnostic
- a clean-clone/tag fixture with the tracked bundle and no ignored report proves
  `docs:check`, the frozen install, and the static Docker workspace contract pass
  without filesystem mutation; stale/tampered packaged bytes still fail
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
