# TASK-548-02-L03: Visual Staleness, Diff and CI Gates
# FileName: TASK-548-02-L03-Visual-Staleness-Diff-And-CI-Gates.md

**Parent Subtask:** TASK-548-02
**Priority:** Critical
**Category:** Documentation Platform / CI / Visual Regression
**Estimated Effort:** Large
**Dependencies:** TASK-548-02-L01 (whose staleness/diff contracts this leaf
imports); TASK-548-02-L02 (sole owner of ALL dependency-bearing toolchain
bytes — root/core package manifests, root bun.lock, Dockerfile, all three
documentation workspace manifests, root docs scripts, exact root devDependency
pins `@playwright/cli: 0.1.18`/`pixelmatch: 7.2.0`, the one lock-producing
`bun install --lockfile-only` reconciliation plus the separate
`bun install --frozen-lockfile` verification, repo-local-only dispatcher
resolver and Chromium install/verify — landing and gating terminally before
its pilots); plus the one post-pilot-generated-bundle-refresh-gate (see the
post-pilot generated-bundle sequencing in the body). This leaf consumes the
toolchain bytes READ-ONLY.
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Make visuals self-invalidating when scenarios/UI change. Add watch hashing, selection,
deterministic diff, bounded reports and PR/full gates. Own the docs check/recovery
CLIs and the focused diff/staleness/recovery/CI implementation: the three
`scripts/docs/visual/ci/{docsVisualCiArtifactsV1,docsVisualCiOwnershipV1,runDocsVisualCiDiffReportAndAwaitedUploadsV1}.ts`
modules, the PR workflow and focused tests. No other TASK-548 leaf
edits those files. TASK-548-02-L02 owns root/core packages, root bun.lock,
Dockerfile, all three documentation workspace manifests, root docs scripts and
the exact `@playwright/cli`/diff pins; this leaf consumes those bytes
read-only and never rewrites a manifest, lock, Dockerfile, script or pin.

TASK-548-02-L03 is one normal POST-PILOT leaf: it lands only after L02
promotes all five pilots and the post-pilot-generated-bundle-refresh-gate
passes. L02's toolchain bytes (including the exact `@playwright/cli` and diff
pins) are already landed and gated; this leaf verifies them read-only where it
consumes them (the pinned dispatch executable
`./node_modules/.bin/playwright-cli` and the exact install
`./node_modules/.bin/playwright install --with-deps chromium`, with
package/Playwright/Chromium version verification) and never re-reconciles the
lock or reinstalls the browser.

The exact `@playwright/cli` package is pinned by TASK-548-02-L02 in its
root
`package.json`/`bun.lock` manifest contract (exact-version pinned with NO
global install and NO `npx`-latest fallback; that manifest/lock contract is the
sole pin authority) together with the reviewed PNG-diff dependencies. The
seven exact root docs commands are L02-owned; this leaf consumes them.

The implementation begins only after L02 promotes all five
pilots and the post-pilot-generated-bundle-refresh-gate passes. This leaf never writes that bundle/report and never
requests a per-scenario refresh.
The ignored report is not a PR, clean-checkout, Docker, runtime, portal, release,
or read-only check prerequisite. `docs:check` invokes TASK-548-01-L02's
already-landed compiler; its byte
path calls the same zero-input atomic loader once, then compares normalized
packaged/recomputed bytes/hash with no separate workspace guard/read. Report-only
state and debris fail closed. Only `docs:recover` mutates interrupted-write state;
it preserves bundle-only and never synthesizes a missing report.

## Workspace and Lock Contract

TASK-548-02-L02 owns all dependency-bearing bytes below and lands them BEFORE
its pilots: the three documentation workspace manifests, the root
`package.json`/`bun.lock`, the three Core workspace dependencies and the
`Dockerfile` before the one L02 lock-producing `bun install --lockfile-only`
reconciliation (which MAY update `bun.lock`) plus the separate
`bun install --frozen-lockfile` verification, and the
pinned local Chromium install/verify. This leaf consumes those exact bytes
read-only (byte/hash comparison on read where it depends on them) and never
rewrites a manifest, lock, Dockerfile, script or pin.
Their exact initial contents are:

```json
{
  "name": "@coderso/docs-contracts",
  "version": "0.0.0", "private": true, "type": "module",
  "sideEffects": false,
  "exports": { ".": "./src/index.ts",
    "./node-artifact-guard": "./src/nodeArtifactGuard.ts", "./node-loader": "./src/nodeLoader.ts" },
  "scripts": { "check": "tsc -p tsconfig.json --noEmit" },
  "devDependencies": { "@types/node": "^26.1.1", "typescript": "6.0.3" }
}
```
```json
{
  "name": "@coderso/docs-renderer",
  "version": "0.0.0", "private": true, "type": "module",
  "sideEffects": false,
  "exports": {
    ".": "./src/index.ts",
    "./projection": "./src/publicationProjection.ts", "./client-search": "./src/clientSearch.ts"
  },
  "scripts": { "check": "tsc -p tsconfig.json --noEmit" },
  "dependencies": { "@coderso/docs-contracts": "workspace:*" },
  "peerDependencies": { "react": "^19.2.8" },
  "devDependencies": { "@types/react": "^19.2.17", "typescript": "6.0.3" }
}
```
```json
{
  "name": "@coderso/docs-portal",
  "version": "0.0.0", "private": true, "type": "module",
  "exports": { "./site-index": "./src/app/docsPortalSiteIndexV1.ts", "./publication-contracts": "./src/routes/docsPortalPublicationContractsV1.ts" },
  "scripts": {
    "build": "bun run src/build/buildDocsPortal.ts", "build:client": "vite build --config vite.config.ts",
    "check": "tsc -p tsconfig.json --noEmit", "preview": "vite preview --config vite.config.ts",
    "validate": "bun run scripts/validate-built-portal.ts dist"
  },
  "dependencies": {
    "@coderso/docs-contracts": "workspace:*", "@coderso/docs-renderer": "workspace:*",
    "react": "^19.2.8", "react-dom": "^19.2.8"
  },
  "devDependencies": { "@types/react": "^19.2.17", "@types/react-dom": "^19.2.3", "@vitejs/plugin-react": "^6.0.4", "typescript": "6.0.3", "vite": "^8.1.5" }
}
```

Those versions match the verified root/core toolchain at authoring; re-read the live manifests before writing and reconcile any moved stack first.
TASK-548-01-L01 owns contracts source/tsconfig except L02-owned private
`docsMigrationReport.ts`, server-only `nodeFixedWorkspace.ts`/public
`nodeArtifactGuard.ts`, and L03-owned `nodeLoader.ts`; L02's permanent report/
atomic-loader named Core shims use confined repo-relative source edges. This leaf
activates but never rewrites source. TASK-548-03-L02 owns renderer source/tsconfig;
TASK-548-04-L01 owns portal shell/client and L02 `src/build/**`.
None may edit these manifests, root package or lock.
The workspace graph is `docs-contracts -> []`, `docs-renderer -> docs-contracts`,
`core -> docs-contracts + docs-renderer`, `docs-portal -> docs-contracts + docs-renderer`. Checks
reject reverse imports/cycles and Core deep imports except L01 shims and L02's
exact report/loader shims. Top-level contracts stay browser/Bun/DB/Core-free.
Public Node entries import only private fixed-workspace; it imports the private
report owner, exact `node:fs`/`node:fs/promises` and pure contracts. Client/Vite
rejects both Node entries and both private sources.
Portal bytes use only the public loader, never `../../core` or guard→load;
Admin path/RBAC stays Core-only.

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

For every direct Core package import landing from this activation onward,
`core/package.json` must contain exactly:

```json
{
  "dependencies": { "@coderso/docs-contracts": "workspace:*",
    "@coderso/docs-renderer": "workspace:*" }
}
```

Merge both keys into the live dependency object without rewriting unrelated
entries. Before the separate frozen-lockfile verification, `Dockerfile` must copy all three
new workspace manifests in addition to existing root/core/store/SDK manifests:

```dockerfile
COPY packages/docs-contracts/package.json packages/docs-contracts/package.json
COPY packages/docs-renderer/package.json packages/docs-renderer/package.json
COPY packages/docs-portal/package.json packages/docs-portal/package.json
RUN bun install --frozen-lockfile
```

All three `COPY` lines must precede that `RUN`; copying workspace source later
does not satisfy dependency resolution. TASK-548-02-L02's gate runs the one
lock-producing `bun install --lockfile-only` reconciliation (which may update
`bun.lock`) and then the separate `bun install --frozen-lockfile` verification
after the manifest/lock reconciliation; this
leaf consumes the landed result read-only and
statically parses the Dockerfile: all exact `COPY` instructions precede the
frozen install; later source copy retains all four later-owner source files and
the tracked bundle, but excludes `.tmp`. It pins contracts `.`, both Node
subpaths, all renderer exports (`.`, `./projection`, `./client-search`), portal
`./site-index` plus pure server/build-only `./publication-contracts` with zero
React/Vite/client side effects; Vite/client graphs reject it. It pins the build entrypoint.

Contracts source/private owners/Core shims now exist; renderer/portal build do
not. The direct compiler/tsconfig gate covers private report/fixed sources. After
L02 installs, this leaf imports `.`, `./node-artifact-guard` and `./node-loader`, rejects
`./migration-report`, but does not check renderer/portal or build/run the image.
TASK-548-03-L02 first imports renderer `.`, `./projection` and `./client-search`.
TASK-548-04-L02 proves portal/final-Docker frozen exports. Both consume the
L02-owned manifests, lock, Core dependencies and Dockerfile read-only.

The root docs scripts added by TASK-548-02-L02 are exactly (consumed here):

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

## Pinned Local Browser Install Contract

Every fresh runner that starts a real browser — the changed-visual CI job and
every release/rollback certification runner — MUST install and verify the LOCAL
pinned browser before any certification suite executes. TASK-548-02-L02's owned
manifest/lock contract is the sole `@playwright/cli` pin authority (L02 lands
it, the one lock-producing `bun install --lockfile-only` reconciliation plus the separate `bun install --frozen-lockfile` verification and the Chromium install/verify BEFORE its
pilots); there is no
global install and no `npx`-latest fallback:

1. Resolve the exact local DISPATCH executable ONLY from the L02-pinned
   manifest/lock at `./node_modules/.bin/playwright-cli` and the exact
   local install binary at `./node_modules/.bin/playwright` (both repo-local).
   A missing package, a non-local resolution, or any ambient PATH/global/
   `npx`-latest fallback blocks before any browser work. A repo-local-only
   resolver is injected into `BrowserTransport`/`PlaywrightCliDispatcher`; it
   resolves only `./node_modules/.bin/playwright-cli` relative to the pinned
   repository root and never consults ambient PATH, a global install, or `npx`.
2. Verify the installed local `@playwright/cli` package version equals the
   exact pinned version declared in the L02 manifest contract and that the
   dispatched `./node_modules/.bin/playwright-cli` binary is the pinned
   package's own binary; version drift, a substituted binary, or an unpinned
   resolution blocks with `docs_visual_tool_version_mismatch`.
3. Run the local install binary exactly:
   `./node_modules/.bin/playwright install --with-deps chromium`. No other
   install command, browser or revision is acceptable.
4. Verify the underlying Playwright version and the installed Chromium
   executable/revision (the exact browser revision the pinned package
   expects); missing browser, missing/version-drifted package or executable
   blocks with `docs_visual_tool_version_mismatch` before any suite starts.
5. Only then start the app and run the selected scenarios/certification.

Missing browser, package, or version drift is a blocking environment failure,
never a skipped success. This leaf consumes the contract read-only and never
re-reconciles the lock or reinstalls the browser. The same contract is executed
by TASK-548-05-L02
before its release and rollback certification runs and is cross-referenced by
TASK-548-04-L03/TASK-548-07-L01 runners.

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
`scripts/docs/recover-artifacts.ts`. The reusable helper first resolves
cross-root CI ownership, then wires the unchanged TASK-548-01-L02 owners to
the unchanged TASK-548-02-L02 pair-validator factory exactly:

```ts
export async function recoverDocsArtifactsV1() {
  const visualCi = await recoverDocsVisualCiStartupV1();
  await recoverDocsVisualCaptureStartupV1();
  const workspace = await recoverDocsWorkspaceArtifactPromotionV1();
  const visuals = await recoverAllDocsVisualPairPromotionsV1({
    validateStablePairForVisual: createDocsVisualStablePairValidatorV1,
  });
  return normalizeBoundedDocsArtifactRecoveryResultV1({
    visualCi, workspace, visuals,
  });
}
```

The CLI invokes only this helper and emits its one bounded canonical JSON
result. CI-owner recovery precedes remaining non-CI capture recovery; only
after all claimed capture leases are released do workspace recovery and sorted
visual-pair recovery run in that order. The exact same
`createDocsVisualStablePairValidatorV1` function reference is used by this
mutating recovery, the compiler's active visual mode and the staleness
inspector; this leaf does not reopen TASK-548-01-L02, wrap the factory with
weaker semantics, or substitute an absence-/existence-only validator.
With no workspace journal, the workspace owner accepts and preserves exact
`bootstrap-none`, `packaged-bundle-only`, or `linked-pair` state; report-only
state rejects. Visual recovery still rejects every partial image/receipt pair.

## Diff and Approval Contract

Each selected scenario first receives one collision-checked
`createDocsVisualRunIdV1({ scope: "ci" })` result. L03 passes the sorted exact
five-field requests to L02's lease-scoped batch owner and never calls capture,
the evidence loader or discard directly:

```ts
import {
  DOCS_VISUAL_CI_CAPTURE_CONCURRENCY_V1,
  verifyDocsVisualCiDiscardAuthorizationV1,
  withReconstructedDocsVisualCiRecoveryV1,
  withVerifiedDocsVisualCiCaptureBatchV1,
  type CaptureResult,
  type DocsVisualCiBatchBindingV1,
  type DocsVisualCiCallbackHandoffV1,
  type DocsVisualCiCaptureOutcomeV1,
  type DocsVisualCiCaptureRequestV1,
  type DocsVisualCiRecoveryHandoffV1,
  type DocsVisualCiRecoveryIntentInputV1,
  type DocsVisualCiRecoverySnapshotV1,
  type DocsVisualCiVerifiedDiscardAuthorizationV1,
  type DocsVisualCiVerifiedCaptureV1,
} from "./visual/capture/docsVisualCaptureRunV1";
```

`DOCS_VISUAL_CI_CAPTURE_CONCURRENCY_V1` is exactly `2`. The batch starts at
most two captures, settles every worker and calls one awaited callback with
canonical request-identity-ordered outcomes. Every fulfilled
`DocsVisualCiVerifiedCaptureV1` contains the exact `CaptureResult` and L02-owned
`VerifiedDocsVisualCaptureEvidenceV1`; every rejected outcome contains only its
request plus a bounded safe failure. L02 holds every fulfilled run's already
acquired kernel lease continuously across verification and the whole callback.
It terminally discards or quarantines every run, then releases each lease last,
after the callback settles. Capture/verification failures terminalize and
release before their rejected outcome. L02 combines sorted, capped capture,
callback, terminalization and release failures and cannot return success if any
capture failed. Destructive terminalization additionally requires the callback's
L02-owned `DocsVisualCiVerifiedDiscardAuthorizationV1`; no throw/boolean/path
assertion substitutes for it. There is no capture-return → lease-release →
later-reclaim gap.
L03 correlates outcomes to prepared scenarios only by exact full localized
identity plus unchanged run ID; a duplicate, missing, unexpected or
noncanonical identity fails before any artifact workspace is created.

The callback performs every evidence consumption, diff/report
canonical-or-candidate read, decode/diff, report construction, privacy decision
and local or remote upload read while those leases remain held. The
pre-capture staleness snapshot is read before capture, then its exact canonical
identity is revalidated in the callback before sealing artifacts. A rejected
outcome blocks every pixel read, staging and upload for the batch; the callback
awaits only a bounded metadata diagnostic upload and returns, after which L02
reports the capture failure. No callback work escapes through a detached
promise, stream or file handle. L03 never writes any entry under
`.tmp/docs-visuals/**`; that tree's strict L02 inventory remains capture-only.

### Durable CI ownership and restart recovery

L02's pre-landed `docsVisualCaptureRunV1.ts` is the single owner of the exact
run-marker and external intent/captures/callback/delivery/discard wire types,
strict normalizers, canonical serializers and domain-separated hashes.
`docsVisualCiOwnershipV1.ts` imports those values and is the sole filesystem/
capability owner. It creates this exact control inventory before capture:

```text
.tmp/docs-visual-ci/<batchId>/
  .ci-owner-v1.lock
  .ci-owner-v1/
    intent.json
    captures.json       # present before the exported callback helper
    callback.json       # present before artifact mutation
    delivery.json       # present before upload or explicit no-upload
    discard.json        # present before L02 terminal discard
```

The files have exactly L02's schemas
`coderso.docs-visual-ci-owner-intent@v1`,
`coderso.docs-visual-ci-captures@v1`,
`coderso.docs-visual-ci-callback@v1`,
`coderso.docs-visual-ci-delivery@v1` and
`coderso.docs-visual-ci-discard@v1`, exact union keys/discriminators and exact
intent→captures→callback→optional-delivery→discard predecessor chain. Their
hashes use L02's corresponding `coderso.docs-visual-ci-*-hash@v1` domains and
NUL+uint64-length framing. No L03 lookalike parser/type/hash is permitted.
Records contain no actions, fixture values, DOM/accessibility text, origins,
URLs, headers, cookies, tokens or credentials.

Each record is recursively strict, bounded canonical JSON+LF and committed
through only `<name>.tmp`: write, file fsync, no-replace rename, owner-directory
fsync. Phases are append-only; pre-delivery failure may take callback→discard.
They are never rewritten, and temp/final coexistence or an unknown entry fails
closed.
The batch root/lock and owner directory are also created no-follow/no-replace.
The owner helper returns an opaque inode-bound capability and holds its kernel
lease from intent creation through callback, L02 terminalization and final
owner cleanup. Persisted `workRoot` is only an invariant: no writer, cleanup or
recovery reconstructs authority from that string.

`createDocsVisualCiBatchOwnershipIntentV1` commits `intent.json` before L02
capture work. `bindDocsVisualCiCapturedOutcomesV1` verifies exact prepared
bindings/outcome correlation and commits `captures.json` before invoking the
exported diff helper. It returns the only
`DocsVisualCiCapturedBatchOwnershipV1` capability:

```ts
declare const docsVisualCiCapturedBatchOwnershipBrandV1: unique symbol; // private
export type DocsVisualCiCapturedBatchOwnershipV1 = Readonly<{
  batchId: string;
  readonly [docsVisualCiCapturedBatchOwnershipBrandV1]: true;
}>;
```

The brand/constructor are not exported; only the binder constructs it after
committed captures verification, and every use rechecks the held owner
lease/inode and captures hash. Object literals, casts and deserialization are
not construction paths. The callback module imports this name with
`import type` from `docsVisualCiOwnershipV1.ts`; runtime operations are explicit
owner functions, never duplicated capability logic.

Artifact helpers attach to that capability. The callback commits callback and
delivery before their effects, awaits delivery/no-upload, and all-settles every
artifact run. Only after successful external cleanup does it commit
`discard.json`, call L02's capability-handle verifier (which re-fsyncs/reopens
the exact final chain), and return `DocsVisualCiCallbackHandoffV1`. A callback
primary is returned as its bounded `callbackFailure`; discard commit/verification
failure throws the combined error and returns no authorization. Consequently
L02 retains/quarantines every marker-bound capture root intact. Only after L02
uses a matching authorization to discard/release captures may
`settleDocsVisualCiOwnedBatchV1` delete the control capsule/root and release the
batch lease. Missing/ambiguous transitions preserve it for startup recovery,
and no failure masks an earlier primary.

On capture-mode startup and at `docs:recover`,
`recoverDocsVisualCiStartupV1` claims sorted batch-owner leases under
`.tmp/docs-visual-ci/.ci-scan-v1.lock`, skips live owners, releases the scan
lock and validates the intent plus longest prefix through its inode-held
capability. It cleans only an exact partial artifact inventory, then performs
this one-way L03→L02 call:

```ts
const ownerDirectory = getDocsVisualCiOwnerDirectoryHandleV1(ownership);
await withReconstructedDocsVisualCiRecoveryV1({
  ownerDirectory, binding: ownership.captureBinding, requests: ownership.requests,
} satisfies DocsVisualCiRecoveryIntentInputV1, async (snapshot) => {
  const recovered =
    await bindOrVerifyDocsVisualCiRecoveredOutcomesV1({ ownership, snapshot });
  await commitOrVerifyDocsVisualCiRecoveryNoResumeChainV1(recovered);
  const discardAuthorization = await verifyDocsVisualCiDiscardAuthorizationV1({
    ownerDirectory, binding: snapshot.binding,
  });
  return { snapshot, discardAuthorization }
    satisfies DocsVisualCiRecoveryHandoffV1;
});
```

L02 reconstructs outcomes under scan/run leases before L03 commits/verifies
`captures.json`; the callback appends/verifies recovery-no-resume callback and
discard without retrying diff/upload. Existing delivery means ambiguous already
attempted effect and is never replayed. The binder accepts only the L02-branded
snapshot/same owner. L02 consumes the same-snapshot handoff, terminalizes and
releases last; then L03 settles its owner. Existing captures must match bytes;
absent fulfilled requires final discard, while absent rejected is allowed.
Unknown links/mismatches/unsafe cleanup fail closed without cross-mutation.

The callback module exclusively exports these non-closure shapes and function:

```ts
export type DocsVisualCiPreparedScenarioV1 = Readonly<{
  scenario: DocsVisualScenarioV1;
  canonicalIdentity: DocsVisualCanonicalPairIdentityV1;
  preCaptureStaleness: DocsVisualStalenessResultV1;
  request: DocsVisualCiCaptureRequestV1;
}>;
export type RunDocsVisualCiDiffReportAndAwaitedUploadsInputV1 = Readonly<{
  prepared: readonly DocsVisualCiPreparedScenarioV1[];
  outcomes: readonly DocsVisualCiCaptureOutcomeV1[];
  batchId: string; workRoot: string;
  ownership: DocsVisualCiCapturedBatchOwnershipV1;
}>;
export async function runDocsVisualCiDiffReportAndAwaitedUploadsV1(
  input: RunDocsVisualCiDiffReportAndAwaitedUploadsInputV1
): Promise<DocsVisualCiCallbackHandoffV1>;
```

That module uses `import type` for both
`DocsVisualCiCapturedBatchOwnershipV1` and
`DocsVisualCiCallbackHandoffV1`; only ownership-module functions are value
imports. Compile/non-forgeability tests prove a literal, spread, JSON value,
wrong inode or released owner cannot satisfy/use the captured capability.

L03 exclusively owns the independent ephemeral artifact lifecycle:

```text
.tmp/docs-visual-ci/<batchId>/
  <runId>/
    manifest.json
    report.json
    canonical.png
    candidate.png
    diff.png
```

The exact manifest shape is:

```ts
type DocsVisualCiArtifactManifestV1 = {
  schema: "coderso.docs-visual-ci-artifacts@v1";
  batchId: string;
  identity: {
    docId: string; locale: string; sectionId: string; visualId: string;
    runId: string;
  };
  members: readonly [
    { name: "report.json"; bytes: number; sha256: string },
    { name: "canonical.png"; bytes: number; sha256: string },
    { name: "candidate.png"; bytes: number; sha256: string },
    { name: "diff.png"; bytes: number; sha256: string },
  ];
};
```

`batchId` is a bounded collision-checked CSPRNG ID from
`createDocsVisualCiBatchIdV1`; `runId` is the unchanged request ID.
In addition to the exact control inventory above, the batch root may contain
only one directory for each fulfilled request; each run directory must contain
exactly the five entries above before privacy validation or upload.
`manifest.json` is a strict recursively
reject-unknown L03 schema binding batch ID, full localized identity, run ID,
the exact canonical-order member tuple, bounded byte counts and lowercase
SHA-256 hashes. All four data members are mandatory, including a deterministic
zero-change `diff.png`. Rejected requests create no run directory. No fixed
`ci`, `latest`, shared report, symlink, hard link, device, socket or additional
entry is allowed.

`createDocsVisualCiArtifactWorkspaceV1` verifies the captured owner capability,
attaches to its existing batch root and creates the run directories no-follow
and no-replace; no cleanup or writer reconstructs authority from a string path.
Each data
member is written to a same-directory capability-tracked
`.write-<member-name>-<32-lowercase-hex>.tmp`, bounded, fsynced, no-replace
renamed and directory-fsynced. No other transient grammar is valid. The
manifest is generated from no-follow reopens of those committed members and is
atomically committed last.
Workspace creation is transactional: the owner helper already holds the batch
capability, and any run-creation error all-settles its known partial inventory
before rejecting while preserving both errors and the durable control capsule.
Before every diff input or upload read, reopen through the capability, require
regular single-link members, compare the full inventory and manifest hashes,
and reject replacement, truncation, growth or identity drift. Temporaries are
allowed only during the active atomic write and must be absent at seal/read
time. The uploader receives owned open handles, never reusable path strings,
and verifies byte count, streaming SHA-256 and `fstat` identity before and after
each awaited transfer before it commits the remote artifact. A partial, unknown
or tampered inventory fails closed before pixel upload.

Inside the one L02 callback, an outer `try/finally` awaits the selected
pixel/metadata-only uploader or the explicit no-upload decision, then runs
`settleDocsVisualCiArtifactRunCleanupV1` before returning or throwing. Cleanup
all-settles every capability-owned run, preserves the control capsule/root for
the post-L02 owner settle, removes only the same no-follow/inode-verified owned
entries, and leaves ambiguity intact with a bounded safe failure. It closes all
upload streams before unlinking. `throwDocsVisualCiCallbackFailuresV1` preserves the normalized
diff/privacy/upload/staleness primary failure and separately sorted, capped
artifact-cleanup failures. L02 then preserves that combined callback failure
while adding, never masking it with, any terminal discard/quarantine/release
failure.

CI compares bounded decoded pixels and geometry to the canonical PNG.
Thresholds are explicit and conservative; dimension changes always fail.
`assertVisualArtifactUploadSafe` accepts only the exact fulfilled owner values
plus sealed L03 artifact capabilities. It validates L02's already verified
synthetic-fixture/privacy result, no-follow reopens and sanitizes actual
candidate/diff bytes, proves lineage to the bound raw/canonical hashes, rejects
forbidden PNG chunks and bounds the report/path set. On failure, it awaits a
metadata-only diagnostic upload with safe identity, hashes and reason codes—
never DOM/accessibility text, fixture values, origins, request records or
pixels—then artifact cleanup runs before the callback settles.

CI never invokes promotion, modifies `docs/guide/assets`, writes a review
receipt or updates a baseline. Uploaded CI diffs are review evidence, never
promotion input. A human/agent must perform a fresh explicit local capture,
inspect its staged bytes, run promotion with that capture's SHA-256, and commit
the reviewed image/receipt.

Staleness is computed and retained before any optional capture. In read-only
mode, the first selected stale/malformed receipt fails immediately without
starting a browser. In capture mode, pre-capture staleness is evidence rather
than an early return: the checker still captures the candidate, computes
geometry/pixel diff, consumes L02's already verified privacy evidence, and
emits the bounded report. It then fails on the retained stale reason and/or
mismatch.
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
  canonical PNG/receipt hashes, L02-verified capture evidence, bounded pixel
  decode/diff, strict sealed L03 artifact inventory and schema-validated JSON
  report.
- **Anti-abuse:** no public write, nonce/HMAC or CAPTCHA. Bound file count,
  decoded pixels, memory, retry/time budgets and uploaded artifact bytes; the
  exact non-configurable L02 capture-session maximum is two.
- **Supply chain/privacy:** pin new dependencies and GitHub actions; do not
  upload `.env`, cookies, traces, full logs or unreviewed screenshots containing
  unexpected data. CI fixtures remain synthetic. Pixel upload is reachable only
  inside the lease-held callback after `assertVisualArtifactUploadSafe`;
  privacy/capture failure emits metadata-only evidence and never uploads pixels.
- **Cleanup:** close exact CLI sessions, clear routes, remove scoped fixtures and
  stop only owned processes even when diff/check fails. Await all uploader reads,
  all-settle its artifact run directories before the callback returns, retain
  the durable batch control capsule until L02 terminally discards/quarantines
  and releases capture leases last, then settle the exact owner root/lease.
  Never promote, cross-delete or rewrite canonical assets.

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

function localizedIdentityOf(scenario: DocsVisualScenarioV1) {
  return {
    docId: scenario.docId,
    locale: scenario.locale,
    sectionId: scenario.sectionId,
    visualId: scenario.visualId,
  };
}

export async function runDocsVisualCiDiffReportAndAwaitedUploadsV1(
  input: RunDocsVisualCiDiffReportAndAwaitedUploadsInputV1
): Promise<DocsVisualCiCallbackHandoffV1> {
  assertExactDocsVisualCiCallbackInputMatchesOwnershipV1(input);
  await writeDocsVisualCiCallbackIntentNoReplaceV1(input.ownership);
  let workspace: DocsVisualCiArtifactWorkspaceV1 | undefined;
  let primaryError: unknown;
  let artifactCleanupFailure: DocsVisualCiArtifactCleanupFailureV1 | undefined;
  try {
    const decision = correlateDocsVisualCiOutcomesV1({
      prepared: input.prepared,
      outcomes: input.outcomes,
    });
    if (!decision.allFulfilled) {
      await writeDocsVisualCiDeliveryIntentNoReplaceV1({
        ownership: input.ownership,
        mode: "metadata-only",
        diagnosticHashes: decision.safeDiagnosticHashes,
      });
      await uploadMetadataOnlyDocsVisualDiagnosticsAndWaitV1(
        decision.safeDiagnostics
      );
    } else {
      workspace = await createDocsVisualCiArtifactWorkspaceV1({
        ownership: input.ownership,
        batchId: input.batchId,
        workRoot: input.workRoot,
        requests: decision.fulfilled.map(({ request }) => request),
      });
      const completed: DocsVisualCiCompletedArtifactV1[] = [];
      for (const item of decision.fulfilled) {
        const verified: DocsVisualCiVerifiedCaptureV1 = item.value;
        const candidate: CaptureResult = verified.result;
        assertCaptureIdentity(candidate, item.request);
        const diff = await compareCanonicalAndCandidateInsideHeldLeaseV1({
          scenario: item.prepared.scenario,
          candidate,
          evidence: verified.evidence,
        });
        await assertCanonicalVisualPairIdentityUnchanged(
          item.prepared.scenario,
          item.prepared.canonicalIdentity
        );
        const report = buildVisualDiffReport({
          scenario: item.prepared.scenario,
          preCaptureStaleness: item.prepared.preCaptureStaleness,
          diff,
        });
        const artifacts = await writeAndSealDocsVisualCiArtifactsV1({
          workspace, request: item.request, verified, diff, report,
        });
        completed.push({ verified, report, diff, artifacts });
      }
      const uploadDecision = await assertVisualArtifactUploadSafe({
        completed,
        reopenSealedArtifact: reopenSealedDocsVisualCiArtifactNoFollowV1,
      });
      if (!uploadDecision.safe) {
        const diagnostic = buildMetadataOnlyPrivacyDiagnostic(uploadDecision);
        await writeDocsVisualCiDeliveryIntentNoReplaceV1({
          ownership: input.ownership,
          mode: "metadata-only",
          diagnosticHashes: [diagnostic.sha256],
        });
        await uploadMetadataOnlyDocsVisualDiagnosticsAndWaitV1([diagnostic]);
        throw new Error("docs_visual_artifact_privacy_blocked");
      }
      const reports = completed.map(({ report }) => report);
      const gateDecision = buildDocsVisualCiGateDecisionV1(reports);
      if (gateDecision.uploadFailurePixels) {
        await writeDocsVisualCiDeliveryIntentNoReplaceV1({
          ownership: input.ownership,
          mode: "sealed-pixels",
          manifestHashes: uploadDecision.manifestHashes,
        });
        await uploadSealedDocsVisualCiArtifactsAndWaitV1({
          workspace,
          approved: uploadDecision.artifacts,
        });
      } else {
        await writeDocsVisualCiDeliveryIntentNoReplaceV1({
          ownership: input.ownership, mode: "no-upload",
        });
        await settleExplicitDocsVisualCiNoUploadDecisionV1();
      }
      assertNoRetainedStalenessOrVisualMismatch(reports);
    }
  } catch (error) {
    primaryError = normalizeDocsVisualCiPrimaryFailureV1(error);
  } finally {
    artifactCleanupFailure = workspace
      ? await settleDocsVisualCiArtifactRunCleanupV1(workspace)
      : undefined;
  }
  const callbackFailure = normalizeDocsVisualCiCallbackFailureV1({
    primaryError, artifactCleanupFailure,
  });
  if (artifactCleanupFailure) throw callbackFailure;
  let discardAuthorization: DocsVisualCiVerifiedDiscardAuthorizationV1;
  try {
    await writeDocsVisualCiDiscardIntentNoReplaceV1(input.ownership);
    discardAuthorization = await verifyDocsVisualCiDiscardAuthorizationV1({
      ownerDirectory: getDocsVisualCiOwnerDirectoryHandleV1(input.ownership),
      binding: getDocsVisualCiBatchBindingV1(input.ownership),
    });
  } catch (discardFailure) {
    throw combineDocsVisualCiCallbackAndDiscardFailuresV1(
      callbackFailure, discardFailure
    );
  }
  return { discardAuthorization, callbackFailure };
}

export async function checkDocsVisuals(options: CheckVisualsOptions) {
  await assertNoDocsVisualPairPromotionHazardsV1({
    validateStablePairForVisual: createDocsVisualStablePairValidatorV1,
  });
  const graph = await buildVisualWatchGraph();
  const selected = sortDocsVisualScenariosByLocalizedIdentityV1(
    options.all ? graph.all : selectChangedScenarios(graph, options.mergeBase)
  );
  if (!options.capture) {
    for (const scenario of selected) {
      const receipt = await loadReceipt(localizedIdentityOf(scenario));
      assertCurrentReceipt(
        await computeVisualStaleness(scenario, receipt)
      );
    }
    return;
  }
  await recoverDocsVisualCiStartupV1();
  await recoverDocsVisualCaptureStartupV1();
  assertExactCiCaptureLimit(
    DOCS_VISUAL_CI_CAPTURE_CONCURRENCY_V1,
    2
  );
  const prepared = await prepareDocsVisualCiRequestsV1(selected, async (
    scenario
  ) => {
    const identity = localizedIdentityOf(scenario);
    const receipt = await loadReceipt(identity);
    return {
      scenario,
      canonicalIdentity: await readCanonicalVisualPairIdentity(identity),
      preCaptureStaleness:
        await computeVisualStaleness(scenario, receipt),
      request: {
        ...identity,
        runId: await createDocsVisualRunIdV1({ scope: "ci" }),
      } satisfies DocsVisualCiCaptureRequestV1,
    };
  });
  const requests = prepared.map(({ request }) => request);
  const batchId = await createDocsVisualCiBatchIdV1();
  const workRoot = `.tmp/docs-visual-ci/${batchId}`;
  const ownership = await createDocsVisualCiBatchOwnershipIntentV1({
    batchId, workRoot, prepared,
  });
  return settleDocsVisualCiOwnedBatchV1(ownership, () =>
    withVerifiedDocsVisualCiCaptureBatchV1({
      binding: ownership.captureBinding,
      requests,
    }, async (outcomes) => {
      const capturedOwnership =
        await bindDocsVisualCiCapturedOutcomesV1({ ownership, outcomes });
      return runDocsVisualCiDiffReportAndAwaitedUploadsV1({
        prepared, outcomes, batchId, workRoot,
        ownership: capturedOwnership,
      });
    })
  );
}
```

**Data flow:** read-only durable image/receipt hazard validation → Git diff/all
selector → strict watch graph → L01 owner hash helper → retained pre-capture
localized receipt/image identity and hash validation → caller-owned
bounded CSPRNG batch/run IDs → fsynced owner intent → one L02-owned two-worker
settled batch → continuously lease-held fulfilled values or safe rejected
outcomes → fsynced exact outcome binding → one exported argument-only callback
→ rejected-outcome metadata-only path or
bounded diff → atomic sealed `.tmp/docs-visual-ci/<batchId>/<runId>/`
inventory → privacy decision → awaited upload/no-upload → all-settled L03
artifact cleanup → fsynced/reopened external discard authorization → L02
terminal capture cleanup and lease release-last → owner cleanup/release →
combined pass/fail. The compiler check runs afterward so
corpus, image and receipt cannot drift independently. No L03 artifact enters
the L02 capture root and no upload file read outlives the callback.

**Error handling:** use `docs_visual_watch_invalid`,
`docs_visual_stale`, `docs_visual_receipt_invalid`,
`docs_visual_tool_version_mismatch`, `docs_visual_diff_mismatch`,
`docs_visual_artifact_privacy_blocked`,
`docs_visual_ci_environment_invalid`, `docs_visual_ci_owner_invalid`,
`docs_visual_ci_recovery_required` and `docs_visual_cleanup_failed`.
Reports list safe relative paths/reasons, never file bodies, fixture values or
credentials. `throwDocsVisualCiCallbackFailuresV1` preserves the normalized
callback primary and a separately capped, localized-identity-sorted artifact
cleanup array. L02's batch owner then combines that result with capture,
terminalization and release failures. Cleanup-only failures still fail the gate;
combined failures never mask an earlier primary code or expose raw helper
errors. External discard write/temp fsync/rename/directory-fsync or verification
failure returns no authorization, preserves the control capsule and forces L02
to retain/quarantine marker-bound capture roots without destructive deletion.

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
with a visual mismatch and with both stale+mismatch. An import/ordered spy proves
L03 calls only `withVerifiedDocsVisualCiCaptureBatchV1`, consumes every
fulfilled evidence value inside its one callback, and never imports or calls
capture, the evidence loader or discard. Remove the ready seal or privacy
member, restart from each unready tombstone state, and tamper each tuple/run/
scenario/source/raw/evidence binding: L02 must supply a rejected outcome, L03
must create no pixel workspace, and the awaited metadata-only upload must finish
before callback return. Safe synthetic pixels may proceed; secret-like target
text, unmatched requests, third-party images or unsafe upload bytes block
pixels.

Pin the exact `.tmp/docs-visual-ci/<batchId>/<runId>/` five-entry inventory.
Reject traversal, collision, symlink/hard-link/non-regular members, unknown or
missing entries, leftover writer temporaries, replacement, truncation, growth,
manifest unknown keys and every member hash/size mismatch. Interrupt before and
after every file fsync/rename and manifest commit; the opaque ownership
capability must all-settle only its known root without cross-deletion. Static
tests prove L03 never adds a capture-root entry and L02's strict capture
inventory remains unchanged.

Use an ordered batch-callback/uploader/artifact-cleanup/L02-terminalization spy
for pass/no-upload, stale, mismatch, privacy failure, diff/report/write failure
and uploader success/failure. Every selected uploader/no-upload decision settles
before the first artifact unlink; all L03 artifact cleanup settles before the
callback does; only then may L02 discard/quarantine and release each capture
lease last. Hold a competing startup/promoter during the callback to prove it
cannot claim or read a fulfilled run. With three scenarios, make one capture
reject and two fulfill: the callback must run once, upload only bounded metadata,
create zero CI artifact run directories, and let L02 terminalize all three.
Inject artifact cleanup plus callback primary failure, and separately L02
discard/release failure: bounded sorted diagnostics remain machine-readable and
neither layer masks the earlier primary. A static call-graph test also forbids
promotion, canonical writes, baseline mutation, detached uploads and a
path-derived recursive remover.

## CI Shape

- PR gate always runs strict corpus compile `--check`, referential/orphan checks
  and read-only receipt/staleness validation. A clean-clone fixture containing
  the tracked bundle and no `.tmp` tree/report must pass with zero mutation.
- A dedicated changed-visual job FIRST executes the Pinned Local Browser
  Install Contract above (local pinned `@playwright/cli` version verification,
  repo-local `./node_modules/.bin/playwright-cli` dispatch binary through the
  injected repo-local-only resolver with no ambient PATH/global/npx fallback,
  `./node_modules/.bin/playwright install --with-deps chromium`, underlying
  Playwright version and Chromium executable/revision verification; missing or
  drifted browser/package blocks with `docs_visual_tool_version_mismatch`
  before any scenario), then starts the real app,
  runs selected scenarios with the exact maximum of two captures,
  requires zero console/page errors and invokes the bounded awaited uploader
  from inside the batch callback. No later workflow step reads artifact paths
  after the command returns. Diffs upload on failure only after the executable
  privacy gate; capture/privacy failure uploads metadata-only diagnostics.
- Nightly/manual `--all --capture` runs the complete scenario matrix across the
  fixed viewport/theme variants required by manifests.
- CI detects a changed baseline but never accepts it. Missing DB/tool/browser
  prerequisites are blocking environment failures, not skipped success.

## Sub-Tasks

TASK-548-02-L02 owns the dependency-bearing toolchain bytes (root/core package
manifests, root bun.lock, Dockerfile, all three documentation workspace
manifests, root docs scripts, exact root devDependency pins
`@playwright/cli: 0.1.18`/`pixelmatch: 7.2.0`, the one lock-producing
`bun install --lockfile-only` reconciliation plus the separate
`bun install --frozen-lockfile` verification, repo-local-only dispatcher
resolver and Chromium install/verify) and lands them BEFORE its pilots, then
completes and gates
terminally. This leaf is one normal post-pilot leaf and consumes those bytes
read-only; it owns ONLY the staleness/diff/recovery/CI implementation, the PR
workflow and focused tests:

- [ ] Verify the landed toolchain bytes read-only (root/core package
  manifests, root lock, Dockerfile, all three workspace manifests, root
  scripts and dependency pins match the L02-landed byte identity; the pinned
  dispatch executable `./node_modules/.bin/playwright-cli` and the exact
  install `./node_modules/.bin/playwright install --with-deps chromium` with
  package/Playwright/Chromium version verification resolve repo-local with no
  ambient PATH/global/npx fallback); any drift returns to TASK-548-02-L02.
- [ ] Add watch graph, staleness, pixel/geometry diff and bounded report modules.
- [ ] Consume L02's exact lease-scoped CI batch API and add the independently
  capability-confined, atomic, sealed and always-cleaned
  `.tmp/docs-visual-ci/<batchId>/<runId>/` artifact lifecycle.
- [ ] Reject every unresolved durable image/receipt transaction through the
  read-only hazard inspector before reads; retain pre-capture staleness and
  enforce the distinct read-only/capture-mode order.
- [ ] Own `recoverDocsArtifactsV1` plus its CLI: recover durable CI owners,
  remaining capture runs, workspace and visual pairs in the pinned order, using
  the exact L02 lease/recovery helpers and validator factory.
- [ ] Add changed-only PR plus full scheduled/manual workflow steps with pinned
  actions, privacy-gated artifacts, metadata-only failure evidence and
  unconditional cleanup.
- [ ] Add `tests/vitest/documentation/docs-visual-staleness.test.ts`,
  `docs-visual-diff.test.ts`, `docs-visual-ci-contract.test.ts`, plus sole-owner
  `tests/unit/documentation/docsArtifactRecovery.test.ts` and
  `tests/unit/documentation/docsDockerWorkspaceContract.test.ts`.

## Testing Requirements

TASK-548-02-L02's toolchain gates (owned by L02, executed before its pilots):
the ONE lock-producing reconciliation (`bun install --lockfile-only`, which
may update `bun.lock`) followed by the SEPARATE
`bun install --frozen-lockfile` verification, and the
pinned-toolchain install/verification — exact root devDependency pins
`@playwright/cli: 0.1.18` and `pixelmatch: 7.2.0`
in the L02-owned manifest/lock contract, repo-local
`./node_modules/.bin/playwright-cli` dispatch binary verification,
`./node_modules/.bin/playwright install --with-deps chromium`, underlying
Playwright version and Chromium executable/revision verification; any
ambient PATH/global/npx resolution, missing package or version-drifted
browser blocks with `docs_visual_tool_version_mismatch`.

This leaf's gates run after L02's pilots and the
post-pilot-generated-bundle-refresh-gate, first proving the L02 toolchain
bytes unchanged read-only (manifest/lock/Docker/script/pin byte identity),
then:

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
- bounded-worker regression with at least three scenarios proves no more than
  two simultaneous browser captures, distinct unchanged run IDs, busy live-run
  skip with zero cross-cleanup, canonical output ordering under reversed
  completion and settle-all failure with zero pixel staging/upload; L03 receives
  one outcome array/callback, while L02 owns every capture terminal state and
  lease release
- workspace/package test pins three manifests, exact contracts `.`/two Node
  exports and absent `./migration-report`, renderer targets, both portal
  subpaths, seven scripts, the exact acyclic package graph, Docker/lock/owners; it rejects private report/fixed exports,
  public path APIs, deep/reverse/client Node edges, and requires the exact L02
  report/loader Core shims plus public loader alias to resolve by identity
- portal package contract statically pins only
  `"build": "bun run src/build/buildDocsPortal.ts"`; the four exact
  environment mappings above remain a downstream TASK-548-04-L02 handoff and
  this leaf does not invoke or source-verify that future entrypoint
- Docker contract pins three manifest `COPY` lines before frozen install,
  contracts `.`, both Node subpaths, renderer `.`, `./projection`/`./client-search`,
  portal `./site-index`/`./publication-contracts`,
  all four later-owner sources, tracked bundle retention and `.tmp` exclusion; it
  does not build/run the image at this leaf, while 03-L02/04-L02 own the exact
  frozen-import and portal/Docker build/runtime gates
- a negative land-order regression fails if this leaf's command/test surface
  invokes `packages/docs-renderer/src/**`,
  `packages/docs-portal/src/build/buildDocsPortal.ts`,
  `@coderso/docs-renderer` at runtime, or `docker build`/`docker run`
- staleness integration proves it imports L01's helper, CI passes its generated
  ID unchanged, resolves canonical files through the full localized identity,
  writes no entry under `.tmp/docs-visuals/**`, and confines every report/pixel
  to `.tmp/docs-visual-ci/<batchId>/<runId>/` until callback cleanup
- `recoverDocsArtifactsV1` spies prove CI-owner → remaining-capture → workspace
  → visual-pair ordering and the unchanged L02 validator reference;
  fresh-process fixtures preserve valid bundle-only state, reject report-only
  and cover preparing/prepared/promoted/verified-commit without synthesizing a
  missing report
- unresolved journal/journal-temp/member-temp/staging/backup/mixed-pair
  fixtures prove the checker invokes the same factory, makes no recovery
  mutation and returns the `docs:recover` diagnostic
- a clean-clone/tag fixture with the tracked bundle and no ignored report proves
  `docs:check`, the frozen install, and the static Docker workspace contract pass
  without filesystem mutation; stale/tampered packaged bytes still fail
- pinned-browser fixtures prove the exact `@playwright/cli` pin in the owned
  manifest/lock contract (no global/`npx`-latest resolution), the repo-local
  `./node_modules/.bin/playwright-cli` dispatch binary resolution through the
  injected repo-local-only resolver (ambient PATH/global/npx fallback blocks),
  the local `./node_modules/.bin/playwright install --with-deps chromium`
  invocation, the
  local package/Playwright/Chromium executable-revision verification steps, and
  that a missing package, missing/version-drifted Chromium, or any global
  resolution blocks with `docs_visual_tool_version_mismatch` before a suite
  starts; release/rollback certification runners execute the same contract
- import-contract test pins the type-only capture/binding/request/outcome,
  `DocsVisualCiRecoveryIntentInputV1`, `DocsVisualCiRecoverySnapshotV1` and
  `DocsVisualCiRecoveryHandoffV1`, plus the exact constant, verifier, live-batch
  and `withReconstructedDocsVisualCiRecoveryV1` value imports. A land-order
  fixture compiles L02 alone before L03 and proves its runtime graph contains no
  L03/private type; L03 has no direct capture/loader/lease/discard call or
  second schema/parser/browser run
- artifact-lifecycle tests pin the five-member inventory, same-directory atomic
  commits, seal-last rule, no-follow hash reopens, every tamper case and
  all-settled capability cleanup; no L03 code may write below the capture root
- crash matrix kills fresh processes at owner intent with absent/unready/ready
  request roots, recovery snapshot/captured-outcome intent, workspace, writes and
  upload/no-upload delivery boundary,
  artifact cleanup, discard, L02 terminalization and owner cleanup. Recovery
  must claim through both scan locks, skip live owners, discard only marker-bound
  runs, validate/remove or quarantine only the inode-held external root, release
  capture then owner leases last, never retry an ambiguous upload, and preserve
  unrelated runs/batches plus every canonical asset byte
- module-contract test imports the exported callback helper and exact input
  type, supplies two different `prepared`/batch/root/outcome objects, and proves
  all correlation and writes use only the current argument with no closure state
- cleanup/order tests prove all local/remote upload reads settle before L03
  artifact cleanup, callback completion precedes L02 terminal
  discard/quarantine/release-last, and nested primary/cleanup failures combine
  without masking
- safe upload plus secret/PII/request/origin/PNG failures prove only sealed
  capabilities bound to L02-verified values can upload and every failure is
  metadata-only
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit:check`
- the canonical NUL-safe line-count gate over the leaf write set (identical
  contract in every TASK-548 task file; a file above 1,000 makes the gate fail
  with `exit 1`, including a non-newline final line; the baseline spans the
  full task/family dirty scope and commits/staging do not narrow it):

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

## Documentation Updates Required

Send the watch-path, regeneration, review, CI and failure-triage runbook to the
TASK-548 closure owner. Record pinned versions and any scanner/config exception
with owner, reason, expiry and ticket.
