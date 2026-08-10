# TASK-548-05-L02: Tag-Pinned Publication, Latest Alias and Rollback
# FileName: TASK-548-05-L02-Tag-Pinned-Publication-Latest-Alias-And-Rollback.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-05
**Priority:** High
**Category:** Release Automation / Cloudflare Pages / Rollback
**Estimated Effort:** Large
**Dependencies:** TASK-548-05-L01; TASK-548-02-L02 (sole owner of ALL
    dependency-bearing toolchain bytes — see its file; consumed read-only by
    TASK-548-02-L03); TASK-545 `✅ Done` and TASK-547 fully terminal before
    dispatch
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Extend semantic-release with a tag-pinned docs artifact and safe Cloudflare Pages
publication. Validate the 02-L02 Docker contract without editing it; preserve its
App/tag/SHA pattern, retain exact versions/capsules, serialize writers, promote
only verified capsule bytes, and support explicit retained-capsule rollback that
is certifiable and deployable end-to-end (materialize → bind five certification
inputs → certify before mutation → lease-guarded mutable commit → pinned-Wrangler
deploy → rollback-specific post-deploy health receipt). The workflow dispatch is
a strict four-input DTO (`recovery_image_version`, `recovery_image_digest`,
`docs_rollback_version`, `docs_rollback_confirmation`) with three disjoint modes:
manual semantic release, Docker recovery (byte/contract compatible), and docs
rollback. Semantic-release is the sole release authority and the NORMAL
RELEASE publication path runs its docs jobs only when `released == "true"`
(the `docs-rollback` job requires only the exact normalized rollback mode plus
its own successful rollback job and NEVER requires the semantic-release
output).
The exact tag-built portal must first pass TASK-548-04-L03's registered
seven-flow certification suite through the shared runtime-smoke runner after the
Pinned Local Browser Install Contract (02-L02) verified the local browser.

## Exclusive Ownership

This leaf is the only TASK-548 writer for:

- `.github/workflows/release.yml`;
- new
  `core/services/documentation/release/docsPostDeployHealthReceipt.ts`;
- new
  `core/services/documentation/release/docsRetainedPagesValidationHandoff.ts`;
- new `core/services/documentation/release/docsPagesPublication.ts`;
- new `core/services/documentation/release/docsReleaseTreeBindingGit.ts`;
- new `scripts/docs/stage-pages-publication.ts`;
- new `tests/unit/documentation/docsPagesPublication.test.ts`;
- new `tests/unit/release/docsReleaseWorkflowContract.test.ts`.

It must not edit root `package.json`, `bun.lock`, `Dockerfile`, `core/package.json`,
PR gates, L01 artifact modules, portal source or Guide; actions are full-SHA-pinned.

Before dispatch, 02-L02 must have landed: Docker copies all three docs manifests
before frozen install, and Core declares exact contracts/renderer/portal workspace
dependencies. L02 validates order/dependencies/Docker/runtime import read-only;
a missing contract returns to 02-L02 and is never patched here.

## Release Workflow Contract

```ts
export type DocsPublicationInputV1 = { branchRoot: string; remoteSha: string;
  archivePath: string; receiptPath: string; taskOwnedTempRoot: string };
export function normalizeDocsPublicationInputV1(value: unknown): DocsPublicationInputV1;
```

Its owner rejects unknowns and validates roots/files plus repository-format commit OID before privileged effects.

## Git Runtime-Tree Adapter Contract

L02's runtime adapter imports only L01 `./docsReleaseTreeBinding`, has no
TASK-545/workflow-module dependency, and exports this exact release entrypoint;
TASK-548-07 resume imports the L01 pure API rather than this Git adapter:

```ts
import { DOCS_RELEASE_TREE_MAX_ENTRIES, DOCS_RELEASE_TREE_MAX_PATH_BYTES, DOCS_RELEASE_TREE_RECORDS_MAX_BYTES, createDocsReleaseTreeBindingV1, type DocsReleaseTreeBindingSourceV1, type DocsReleaseTreeBindingV1 } from "./docsReleaseTreeBinding";
export type DocsReleaseTreeBindingGitInputV1 = { checkoutRoot: string; expectedGitSha: string };
export function normalizeDocsReleaseTreeBindingGitInputV1(value: unknown): DocsReleaseTreeBindingGitInputV1;
export async function computeDocsReleaseTreeBindingFromGitV1(
  input: DocsReleaseTreeBindingGitInputV1
): Promise<DocsReleaseTreeBindingV1> {
  const config = normalizeDocsReleaseTreeBindingGitInputV1(input);
  const git = await openBoundedGitCheckoutV1(config.checkoutRoot);
  const before: Omit<DocsReleaseTreeBindingSourceV1, "entryCount" | "records"> = await git.readCleanIdentityV1(config.expectedGitSha);
  const records = await git.readExactBytesV1(["ls-tree", "-rz", "--full-tree", "HEAD"]);
  const entryCount = parseCanonicalGitLsTreeRecordsV1(records, before.gitObjectFormat);
  await git.assertCleanIdentityUnchangedV1(before);
  return createDocsReleaseTreeBindingV1({
    gitObjectFormat: before.gitObjectFormat, gitSha: before.gitSha,
    headGitTreeOid: before.headGitTreeOid, entryCount, records,
  });
}
```

Resolve a real task-owned checkout root, require it equals `git rev-parse
--show-toplevel`, and require empty bounded bytes from `git status
--porcelain=v1 -z --untracked-files=all --ignore-submodules=none`. Without a
shell, execute and cap `git rev-parse --show-object-format`, `git rev-parse
--verify HEAD^{commit}`, `git rev-parse --verify HEAD^{tree}`, then exact
`git ls-tree -rz --full-tree HEAD`. Object format is only `sha1` or `sha256`;
HEAD must byte-equal `expectedGitSha`, and commit/tree/entry OIDs must have its
exact lowercase 40/64-hex width.

Parse the untouched bounded stdout as ordered NUL records exactly
`<mode> SP <type> SP <oid> TAB <path> NUL`. Nonempty output must end in one NUL;
reject empty/malformed/duplicate/out-of-Git-tree-byte-order records, invalid
mode/type pairs, absolute/backslash/dot/traversal/control/non-UTF-8/non-NFC paths,
and entry/path/stream cap overflow. Accept only blob modes `100644`, `100755`,
`120000` and gitlink `160000 commit`; never sort or reserialize. Re-read
HEAD/tree/clean status after parsing, require byte identity, then call L01's
`createDocsReleaseTreeBindingV1()` once with the original record bytes.

1. The NORMAL RELEASE path runs only after semantic-release reports
   `released == "true"`; use its exact
   `version` and `git_tag`. Semantic-release is the SOLE public release
   authority: it alone creates the generated version/lock/changelog release
   commit, the plain SemVer tag and the GitHub release; this workflow never
   tags or releases and the owner never runs `git tag`/`gh release`. Docs
   rollback is a separate mutually exclusive job: it never depends on the
   semantic-release `released` output.
2. Create the App token, full-history tag checkout, and assert `HEAD == tag
   target` plus byte-identical plain-SemVer `git_tag == version`. Then call
   `computeDocsReleaseTreeBindingFromGitV1()` exactly once and pass its frozen
   result unchanged through artifact build, publication and health; drift fails.
3. Install with the frozen lockfile and validate the landed Docker workspace
   contract. Run read-only `bun run docs:check`, which performs workspace hazard
   inspection and compares recomputed canonical bytes/`sourceHash` with the
   tracked packaged bundle. The clean tag is expected to contain no ignored
   `.tmp` report, and release never recovers or regenerates the bundle/report
   pair. Build the portal from that strict packaged bundle with the exact
   environment mapping
   `DOCS_PRODUCT_VERSION=<semantic-release version>`,
   `DOCS_PUBLIC_ORIGIN=<validated configured HTTPS origin>`,
   `DOCS_PUBLIC_BASE_PATH=<validated configured base path>`, and
   `SOURCE_DATE_EPOCH=<validated target-commit Unix epoch from
   git show -s --format=%ct "$gitSha">`; there is no wall-clock/default source.
   Validate the portal. Before the certification command, execute
   TASK-548-02-L02's Pinned Local Browser Install Contract: verify the local
   pinned `@playwright/cli` package version (exact root devDependency pin
   `@playwright/cli: 0.1.18`, `pixelmatch: 7.2.0` for the reviewed diff lane)
   from the pinned manifest/lock,
   resolve the dispatch executable only as repo-local
   `./node_modules/.bin/playwright-cli` through the injected repo-local-only
   resolver (no ambient PATH/global/npx fallback), run
   `./node_modules/.bin/playwright install --with-deps chromium` (the exact
   local binary), and verify the underlying Playwright version and installed
   Chromium executable/revision; missing or version-drifted browser/package
   blocks with `docs_visual_tool_version_mismatch` before any browser work
   (global/`npx`-latest install paths are forbidden).
   Immediately after portal artifact validation and before
   building/verifying/uploading L01's tar and sibling receipt or
   any GitHub Release asset, writing the retained branch, changing `latest`,
   or invoking Cloudflare on the release path, run exactly:

   ```bash
   TASK548_PORTAL_ARTIFACT_ROOT=packages/docs-portal/dist \
   TASK548_PORTAL_PRODUCT_VERSION="$version" \
   TASK548_PORTAL_GIT_SHA="$gitSha" \
   TASK548_PORTAL_MANIFEST_SHA256="$portalManifestSha256" \
   TASK548_PORTAL_ARTIFACT_ROOT_SHA256="$portalArtifactRootSha256" \
     bun scripts/runtime-smoke.ts run \
       --suite task-548-portal --profile certification \
       --session task-548-portal-certification
   ```

   Values are an exact allowlisted projection derived from already normalized
   validator/runtime-tree output; no ambient fallback is accepted. Capture the
   runner's JSON stdout byte-for-byte as `report.json`, require the exact seven
   ordered L03 IDs with report-owned visible assertions, `pass: true`,
   `serverUp: true`, zero console errors, seven unique screenshot hashes and a
   passing top-level shared cleanup result. Do not wrap the command in another
   server/browser/worker/lifecycle/report implementation.

   Upload exactly NINE root regular members — `report.json`, the seven
   candidate PNGs, and the canonical prepublication receipt
   (`docs-portal-prepublication-receipt-v1.json`, serialized from
   `VerifiedPortalPrepublicationReceiptV1` by its canonical serializer) — as
   `docs-portal-prepublication-gate-<productVersion>-<gitSha>-<workflowRunId>`
   for release, or — for the docs-rollback path —
   `docs-portal-prepublication-gate-<targetVersion>-<originalGitSha>-<workflowRunId>`
   (target-bound: the certified rollback candidate's `targetVersion` and
   `originalGitSha`), with 90-day retention through the already full-SHA-pinned
   upload-artifact action; missing, extra, nested, link, device or duplicate
   members fail. The rollback upload happens INSIDE the
   `withVerifiedDocsRollbackCandidateV1` callback immediately after the gate
   passes and BEFORE any retained-branch/Cloudflare mutation; an upload failure
   aborts the callback before mutation, leaving the retained branch, Cloudflare
   and the GitHub Release untouched, with the same `finally` temp-root cleanup.
   Then, including on gate/upload failure, remove only the normalized
   `_docs/_workflows/_smoke/candidates/task-548-portal/task-548-portal-certification/`
   root through L03's exact tested candidate-evidence cleanup, prove it absent
   and nonsymlinked, and recheck the clean tag checkout. Publication jobs are
   conditioned on gate + artifact upload + cleanup + clean-tree success. The
   workflow artifact is audit evidence, never a substitute for this live gate
   and never a product publication mutation. Only after this succeeds, build
   and verify L01's tar plus sibling receipt using the already frozen exact
   runtime-tree binding; neither L01 nor a retry recomputes it.
4. Reconcile exactly the archive and sibling receipt with the matching GitHub
   Release without `--clobber`. The release manifest remains embedded in the
   archive and is never a standalone release asset. Inventory is a strict
   `0 | 1 | 2` state machine keyed by the two names in the verified
   `DocsReleaseArtifactReceiptV1`:
   - **0 assets:** upload the archive and receipt in either deterministic
     workflow order, without replacement;
   - **1 asset:** its name must be exactly the expected archive or receipt.
     Download it fully under the owner byte cap and independently verify its
     canonical bytes, schema, identity and digest against the local
     `VerifiedDocsReleaseArtifact`; only then upload the missing sibling;
   - **2 assets:** names must be exactly the expected pair. Download both fully
     and run `verifyDocsReleaseArtifact()` plus exact local verified-result
     equality; upload nothing.
   Any extra/duplicate/unexpected asset, expected-name byte conflict, partial
   download, same-version identity conflict, or attempt to delete, replace,
   rename or clobber fails. After either upload path, download both final assets
   again, independently verify the bounded tar/embedded manifest and canonical
   sibling receipt, and require exact equality with the local verified result
   before retained-tree staging. Thus failure after the first upload is recoverable:
   retry enters one-asset state, proves the present asset, uploads only the
   missing sibling, then verifies the final downloaded pair.
   `VerifiedDocsReleaseArtifact` is imported as the exact L01 verifier-result
   type; L02 defines no release-artifact projection or duplicate shape.
5. Fetch a dedicated retained `docs-pages` branch at its observed SHA into a
   task-scoped worktree. Never run code from that branch.
6. Stage immutable `/v/<version>`, `/search/<version>`, content-addressed assets,
   and the complete
   `/release-metadata/<version>/publication-capsule/` from L01. The capsule paths
   and contents are exactly `docs-release-manifest-v1.json`,
   `docs-portal-manifest.json`, `latest/**`, `runtime/{404.html,_headers}`,
   `routing/{redirects,headers,client-assets}.json`,
   `global/{sitemap.xml,robots.txt,site-index.json}`, and
   `receipts/{search.json,assets.json}`. If any exact path exists, require
   byte/hash identity. Push this exact-only commit first with a lease check.
7. Re-fetch and verify both retained manifests, exact paths, capsule, L01
   receipts, and the current single-release site-index candidate. Strictly
   merge that candidate with the verified retained cumulative
   `/global/site-index.json`, then copy capsule `latest/**` to `/latest/**`,
   `runtime/{404.html,_headers}` to root, routing files to `/deployment/`,
   sitemap/robots candidates to root, and the
   canonical cumulative index bytes to both `/global/site-index.json` and
   `/site-index.json`; push a second commit. Never invoke a portal builder,
   route resolver, old-page renderer, or candidate generator. The only allowed
   serialization is L02's strict cumulative-index serializer defined below.
8. Materialize a no-follow task-scoped Cloudflare upload tree from that exact
   retained commit. For base `/`, public bytes stay at root; otherwise public
   bytes are mounted below the normalized base prefix while the verified
   `404.html` and Cloudflare control `_headers` remain at upload root. Run the
   `cloudflare/wrangler-action@ebbaa1584979971c8614a24965b4405ff95890e0`
   (`v4.0.0`) with exact `wranglerVersion: "4.114.0"`; its `command` input is
   `pages deploy <exact-root> --project-name
   <exact-project> --branch production --commit-hash <mutable-commit>` through
   protected `docs-production`, yielding the effective CLI
   `wrangler pages deploy`. Re-read the resulting deployment identity; no
   deploy uses an unverified candidate or rebuilds any byte. Bounded health
   reads use the configured production HTTPS origin/base after proving the
   returned account/project/production-branch/deployment ID, never a preview URL.

Before the first retained-branch write, materialize the complete prospective
post-promotion tree locally from the observed branch plus L01's held verified
artifact materialization and run the same strict gate used again on the final
remote-derived upload tree:

```ts
export const DOCS_CLOUDFLARE_PAGES_LIMITS_V1 = {
  free: { maxFiles: 20_000, maxFileBytes: 26_214_400 },
  paidV4: { maxFiles: 100_000, maxFileBytes: 26_214_400 },
} as const;
export type DocsCloudflarePagesAssetTierV1 = "free" | "paid-v4";
export async function assertDocsCloudflarePagesUploadInventoryV1(input: {
  uploadRoot: string; tier: DocsCloudflarePagesAssetTierV1;
  wranglerVersion: "4.114.0";
}): Promise<void>;
```

`DOCS_CLOUDFLARE_PAGES_ASSET_TIER` is exact protected configuration, never
caller input. The gate no-follow inventories unique NFC confined regular files,
rejects links/devices/unknown control files, caps paths/aggregate bytes, and
enforces the selected count plus 25-MiB per-file boundary before mutation.
`paid-v4` also requires project setting `PAGES_WRANGLER_MAJOR_VERSION=4` and the
pinned v4 action/CLI. After both remote commits are re-read, rerun the gate on
the authoritative upload tree before deploy and require prospective/final
inventory parity. Limit failure leaves the observed branch and production intact.

Use one repository-scoped concurrency group with `cancel-in-progress: false`.
Job permissions are explicit: build/deploy is `contents: read`; release/branch
writes alone use scoped `contents: write`; GitHub `pages: write` and
`id-token: write` are absent. The environment-scoped
`CLOUDFLARE_API_TOKEN` is passed only as the masked Wrangler-action secret
input, is never a shell argument/output/artifact, and is restricted to
Cloudflare Pages Edit on the exact account. `CLOUDFLARE_ACCOUNT_ID`,
`DOCS_CLOUDFLARE_PAGES_PROJECT`, and the asset tier are strict protected variables,
not caller input. All other permissions are `none`.

## Cumulative Site-Index Merge Contract

`docsPagesPublication.ts` is the sole retained-merge owner and uses these exact
imports; the CLI imports its functions through
`../../core/services/documentation/release/docsPagesPublication`:

```ts
import { normalizeDocsPortalSiteIndexV1, serializeDocsPortalSiteIndexV1, type DocsPortalSiteIndexV1 } from "@coderso/docs-portal/site-index";
import { normalizeDocsPortalSiteIndexCandidateV1, serializeDocsPortalSiteIndexCandidateV1, type DocsPortalSiteIndexCandidateV1 } from "@coderso/docs-portal/publication-contracts";
import { normalizeDocsAssetsPublicationReceiptV1, normalizeDocsSearchPublicationReceiptV1, serializeDocsAssetsPublicationReceiptV1, serializeDocsSearchPublicationReceiptV1, type VerifiedDocsReleaseArtifact } from "./docsReleaseSchemas";
import { verifyDocsReleaseArtifact } from "./docsReleaseArtifact";
import { withVerifiedDocsReleaseArtifactMaterializationV1 } from "./docsReleaseArtifactPairPromotion";
```

No portal deep import or copied DTO is valid. Every imported normalizer rejects
unknown keys recursively; canonical bytes must round-trip through its paired
serializer unchanged before any retained-tree mutation.

```ts
export type DocsPortalSiteIndexMergeInputV1 =
  | {
      mode: "publish"; retained: DocsPortalSiteIndexV1 | null;
      candidate: DocsPortalSiteIndexCandidateV1; portalManifestSha256: string;
      releaseManifestSha256: string; siteIndexCandidateSha256: string;
    }
  | {
      mode: "rollback"; retained: DocsPortalSiteIndexV1; selectedVersion: string;
    };

export function mergeDocsPortalSiteIndexV1(
  input: DocsPortalSiteIndexMergeInputV1
): {
  index: DocsPortalSiteIndexV1;
  bytes: Uint8Array;
  sha256: string;
};
```

On first publication, `retained: null` is permitted only when both
`/global/site-index.json` and `/site-index.json` are absent on the observed
empty branch. On every later publication or rollback, both files must exist,
be byte-identical, be canonical serializer output, and pass the exact strict
normalizer before mutation. A missing counterpart, unknown field, unsorted or
duplicate version/route, stale `latestVersion`, malformed path/hash, or byte
drift fails before a worktree write.

For publish, L02 verifies the candidate bytes against the retained capsule,
portal manifest file record, `siteIndexCandidateSha256`, and both immutable
manifests. It maps the candidate's current entry into the exact L01-owned
published-version record, including `sourceHash`, `portalManifestSha256`,
`releaseManifestSha256`, `siteIndexCandidateSha256`, `notFoundSha256`,
`cloudflareHeadersSha256`, `clientAssetsManifestSha256`, and canonical
base-free routes. Each deployment hash joins the corresponding portal-manifest
record and capsule runtime/routing bytes. It preserves every retained version
record byte-for-byte. An existing
same-version record is accepted only when the complete normalized record is
identical; any conflict is `docs_site_index_no_clobber` and no output is
written. New records join the list in descending SemVer order and
`latestVersion` becomes the verified current version.

For rollback, no candidate is added: the exact selected version must already
exist and all identity/deployment hashes plus routes must agree with the selected retained
capsule, manifests, runtime-tree binding, and L01 receipts. The merge changes only
`latestVersion`; it never removes, rewrites, reorders, or regenerates a retained
version record or old portal page. Both modes canonical-serialize once, compute
`sha256` over those exact bytes (the hash is an audit result, not a self-field),
write the same bytes to `/global/site-index.json` and `/site-index.json`, reread
and hash both, then lease-push. The portal selector fetches the latter
same-origin cumulative file; a capsule's `global/site-index.json` always
remains its immutable single-release candidate.

Publish and rollback copy the selected capsule's exact `runtime/404.html` and
`runtime/_headers` to root and `routing/client-assets.json` to
`/deployment/client-assets.json` in the same lease-guarded commit as latest/
index candidates. Missing or hash-drifted bytes abort before mutation; policy,
404 HTML and client inventory are never reconstructed.

## Rollback Contract

The workflow preserves the existing release triggers and adds the existing
Docker recovery trigger with one strict four-input dispatch DTO. A push to
`main`, or a manual dispatch whose exact four inputs are ALL byte-empty,
selects normal semantic release. A manual dispatch with the exact recovery pair
present and the docs pair byte-empty selects Docker recovery; a manual dispatch
with the exact docs pair present and the recovery pair byte-empty selects docs
rollback. Any partial, mixed, unknown or missing combination fails before any
privileged effect. Normalize before token creation:

```ts
export type DocsDockerRecoveryInputV1 = {
  recovery_image_version: string;
  recovery_image_digest: string;
};
export type RollbackInputV1 = {
  docs_rollback_version: string;
  docs_rollback_confirmation: string;
};
export type DocsReleaseWorkflowDispatchInputV1 = Readonly<{
  recovery_image_version: string;
  recovery_image_digest: string;
  docs_rollback_version: string;
  docs_rollback_confirmation: string;
}>;
export type DocsReleaseWorkflowDispatchModeV1 =
  | { mode: "manual-release" }
  | { mode: "docker-recovery"; input: DocsDockerRecoveryInputV1 }
  | { mode: "rollback"; input: RollbackInputV1 };
export function normalizeDocsReleaseWorkflowDispatchModeV1(
  value: unknown
): DocsReleaseWorkflowDispatchModeV1;
```

The YAML retains/ADDs all four optional typed strings with default `""` so
GitHub always supplies all four keys:
`recovery_image_version`, `recovery_image_digest`, `docs_rollback_version`,
`docs_rollback_confirmation`. The `semantic-release`, `recover-docker-image`
and `docs-rollback` jobs use the normalized MUTUALLY EXCLUSIVE conditions:
all four empty → `semantic-release` only; exact recovery pair present (both
non-empty) with the docs pair byte-empty → `recover-docker-image` only; exact
docs pair present (both non-empty) with the recovery pair byte-empty →
`docs-rollback` only. Partial (exactly one of a pair), mixed (any cross-pair
non-empty combination), unknown, missing or non-string input fails before token
creation and before any privileged effect; modes never execute each other's
semantic/Docker/rollback path. Push events cannot carry workflow_dispatch
inputs: push selects `manual-release` only. The existing Docker recovery
behavior (the `recover-docker-image` job's build/verification flow) remains
byte/contract compatible — only the dispatch normalization and job conditions
change.

For docs rollback,
`docs_rollback_version` is bounded exact plain SemVer and confirmation must byte-equal
`ROLLBACK ${docs_rollback_version}` after no trimming or case folding. Blank,
whitespace-only, partial-empty, missing/non-string/unknown, `v`-prefixed,
normalized-only, mismatched or wrong-case input fails before any privileged
effect. For Docker recovery, `recovery_image_version` is bounded exact plain
SemVer and `recovery_image_digest` is the exact lowercase
`sha256:<64-hex>` form; any other shape fails before any privileged effect.
Rollback never runs semantic release/Docker, Docker recovery never runs
semantic release/rollback, and the all-empty manual dispatch never enters
either recovery path.

Validated rollback fetches the retained branch
and bounded exact two-asset GitHub Release pair, runs L01's artifact verifier,
and requires its manifest/receipt binding and hashes equal the selected retained
manifest/capsule/receipts before mutation. It then copies only retained mutable
candidates, applies the strict rollback index merge, writes both index aliases,
and pushes/deploys through the same concurrency, lease and environment guards.

Rollback never deletes, edits, reuploads, rebuilds `/v/<version>`, or regenerates
a candidate. It records selected version, actor, run, prior latest version, and
both immutable manifest digests in the commit/audit summary without logging
tokens. Invalid/missing/tampered versions fail before branch mutation.

## Rollback Materialization and Certification Contract

Docs rollback is certifiable and deployable end-to-end. L02 owns the exact
materialization owner `materializeVerifiedDocsRollbackCandidateV1` and the
strict `VerifiedDocsRollbackCandidateV1`:

```ts
export type VerifiedDocsRollbackCandidateV1 = Readonly<{
  schema: "coderso.docs-verified-rollback-candidate@v1";
  targetVersion: string;            // exact selected plain SemVer
  originalGitSha: string;           // 40/64-hex ORIGINAL release identity of the
                                    // target capsule (never the current checkout)
  portalManifestSha256: string;     // detached portal-manifest hash of the target
                                    // retained capsule
  artifactRootSha256: string;       // portal artifact-root hash of the target
                                    // retained capsule
  materializedRootSha256: string;   // SHA-256 over the complete materialized
                                    // public tree
  artifactRoot: string;             // confined task-owned temp root (never
                                    // retained, never a checkout path)
  retainedCommitSha: string;        // authoritative retained-branch commit
                                    // carrying the selected capsule
  releaseAssetPairVerified: true;
  retainedCapsuleVerified: true;
}>;
export function normalizeVerifiedDocsRollbackCandidateV1(value: unknown):
  VerifiedDocsRollbackCandidateV1;
// Normalized materialization input (no already-started Promise and no
// caller-supplied factory are accepted).
export type DocsRollbackMaterializationInputV1 = Readonly<{
  taskOwnedTempRoot: string; // validated base root; the helper creates and owns
                             // the concrete temp root INSIDE its try/finally
  selectedVersion: string;   // exact plain SemVer
}>;
export function normalizeDocsRollbackMaterializationInputV1(value: unknown):
  DocsRollbackMaterializationInputV1;
export async function materializeVerifiedDocsRollbackCandidateV1(
  input: DocsRollbackMaterializationInputV1
): Promise<VerifiedDocsRollbackCandidateV1>;
// Test-only dependency injection; no caller-supplied factory may allocate
// outside the owned root. Every override receives the helper-owned root.
export type DocsRollbackCandidateLifetimeDepsV1 = Readonly<{
  materialize?: typeof materializeVerifiedDocsRollbackCandidateV1; // default
  createOwnedRoot?: (baseRoot: string) => Promise<string>; // default mkdtemp
  proveOwnedRootAbsent?: (root: string) => Promise<void>; // absent+nonsymlinked
}>;
export async function withVerifiedDocsRollbackCandidateV1<T>(
  input: DocsRollbackMaterializationInputV1, // normalized ONLY; no factory
  use: (candidate: VerifiedDocsRollbackCandidateV1) => Promise<T>,
  deps?: DocsRollbackCandidateLifetimeDepsV1
): Promise<T>;
```

The `withVerifiedDocsRollbackCandidateV1` helper is the ONLY lifetime owner of
the path-bearing candidate and of the concrete temp root. It accepts ONLY the
NORMALIZED materialization input —
never an already-started Promise, never an ambient temp root, and never a
caller-supplied factory — creates and
owns the concrete no-follow task-owned temp root INSIDE its own `try/finally`
beneath the validated `taskOwnedTempRoot`, invokes the materializer inside
that same `try/finally` WITH that owned root, and only then calls `use`; it
places BOTH the materialized
candidate tree AND the Cloudflare upload subtrees beneath that root. Test
dependencies may be injected through the helper's `deps` object (materializer,
owned-root creation, absence proof), but every override receives the
helper-owned root and no caller-supplied factory may allocate outside it. A
materializer rejection AFTER allocation still runs the same `finally` cleanup
(proves the root absent and nonsymlinked), and every child allocation
(candidate tree, upload tree, worktrees) is covered by the same cleanup. It
awaits the materializer, invokes the callback
while the confined no-follow temp root exists, and in `finally` removes the
temp root and proves it absent and nonsymlinked. ALL rollback work stays inside
the callback: portal certification (with its target-bound artifact upload),
rollback staging/mutation (lease-guarded
mutable commit, authoritative refetch/inventory, Cloudflare upload-tree
verification, pinned-Wrangler deploy) and the rollback-health upload. The
callback returns ONLY a path-free durable result (for example
`{ rollbackHealthSha256 }`); the path-bearing `VerifiedDocsRollbackCandidateV1`
is never returned from or used after the callback, and no caller may capture it
across the cleanup boundary. A failed certification pass still runs the same
`finally` cleanup and leaves branch/Cloudflare untouched.

Exact flow (each step fail-closed; an invalid gate leaves the retained branch
and Cloudflare untouched):

1. Bounded release-asset + retained-capsule verification for the selected
   version: download/verify the exact two-asset GitHub Release pair through
   L01's artifact verifier and require manifest/receipt binding and hashes equal
   the selected retained manifest/capsule/receipts (existing verifier, exact
   identity).
2. Materialize the COMPLETE selected retained public capsule/tree (the exact
   version subtree, capsule, cumulative-index candidates and runtime/routing
   bytes) into a confined no-follow task-owned temporary root beneath the
   validated `taskOwnedTempRoot`; reject symlinks, traversal, unknown entries
   and any network/real-ref use.
3. Derive and bind ALL FIVE portal-certification inputs from verified bytes:
   `artifactRoot` = the materialized tree root; `productVersion` = the selected
   version; `originalGitSha` = the capsule's original release gitSha;
   `portalManifestSha256` and `artifactRootSha256` = the capsule's verified
   detached-manifest/artifact-root hashes. NEVER from ambient environment, the
   current checkout, a guessed value or wall clock.
4. Run the EXACT `task-548-portal` certification gate (mode rollback) with those
   five inputs BEFORE any retained mutation; a failed gate aborts with the
   retained branch and Cloudflare untouched.
5. Only a pass proceeds: lease-guarded mutable index/candidate commit (strict
   rollback index merge + byte-copy mutable candidates, existing guards),
   refetch/inventory the authoritative commit, materialize/verify the Cloudflare
   upload tree, deploy with the pinned Wrangler under protected
   `docs-production`, and run/upload a rollback-specific post-deploy health
   receipt binding from/to latest, target version, target original
   identity/hashes, retained commit and deployment.
6. `finally` cleanup removes the confined temp root and proves it absent and
   nonsymlinked. A crash leaves the same recovery shape as the release path and
   never mutates the retained branch or Cloudflare before the certification
   pass.

The rollback-specific health receipt is exact and embeds the shared
`DocsPostDeployReadFactsV1` (same strict shape and owner as the release-side
receipt, bound to the selected public `DocsReleaseTreeBindingV1`), adding the
rollback identity:

```ts
export type DocsPostDeployRollbackHealthReceiptV1 = Readonly<{
  schema: "coderso.docs-post-deploy-rollback-health@v1";
  fromLatestVersion: string;        // prior latest version (pre-rollback)
  toLatestVersion: string;          // selected target version (post-rollback)
  targetVersion: string;            // exact selected plain SemVer
  originalGitSha: string;           // target capsule's original release gitSha
  portalManifestSha256: string;     // target capsule's detached-manifest hash
  artifactRootSha256: string;       // target capsule's artifact-root hash
  retainedCommitSha: string;        // authoritative retained commit carrying the
                                    // selected capsule
  deploymentId: string;
  workflowRunId: string; workflowRunAttempt: number;
  publicOrigin: string; publicBasePath: string;
  readFacts: DocsPostDeployReadFactsV1; // shared closure-required read facts
  status: "pass";
}>;
export function normalizeDocsPostDeployRollbackHealthReceiptV1(value: unknown):
  DocsPostDeployRollbackHealthReceiptV1;
export function serializeDocsPostDeployRollbackHealthReceiptV1(
  value: DocsPostDeployRollbackHealthReceiptV1): Uint8Array;
// The ONLY write/upload helper: atomically stages the canonical receipt under
// `.tmp/docs-release/post-deploy/`, uploads the 90-day artifact
// `docs-post-deploy-rollback-health-<targetVersion>-<originalGitSha>-<workflowRunId>`,
// and returns the canonical durable receipt digest — SHA-256 over
// `serializeDocsPostDeployRollbackHealthReceiptV1` of the exact receipt bytes
// that were written and uploaded. The digest is never read from any input; a
// failed/partial write or upload rejects instead of returning a digest.
export async function writeAndUploadDocsPostDeployRollbackHealthReceiptV1(
  health: DocsPostDeployRollbackHealthReceiptV1
): Promise<string>; // 64-lowercase-hex durable receipt digest
```

The rollback receipt is written through the same atomic
`.tmp/docs-release/post-deploy/` staging rule (distinct
`docs-post-deploy-rollback-health-v1.json` root member) and uploaded as
`docs-post-deploy-rollback-health-<targetVersion>-<originalGitSha>-<workflowRunId>`
with 90-day retention; TASK-548-07 validates it read-only when the selected
successful run is a docs rollback. TASK-548-07 enumerates the selected run's
health artifacts and requires exactly ONE matching family: release runs
contain only `docs-post-deploy-health-*` (validated only by
`validateDocsPostDeployHealthReceiptV1`) and rollback runs contain only
`docs-post-deploy-rollback-health-*` (validated only by
`validateDocsPostDeployRollbackHealthReceiptV1`); opposite, both or duplicate
families fail. `toLatestVersion` must byte-equal
`targetVersion`; the bounded same-origin reads reuse the exact release-side
selection/verification helper.

## Retained-Tree Validation Handoff

L02 also owns one bounded, operational-only handoff used by TASK-548-07 scenario
6. It is not a tracked fixture, workflow artifact, closure sidecar, or canonical
evidence file. The L02 helper creates a uniquely scoped SHA-1 local bare repository
under the caller's validated task-owned temporary root, publishes two synthetic
plain-SemVer capsules through the real L02 functions, rolls latest back to the
older version, restores latest to the newer version, seals three read-only
snapshot roots, and returns this strict in-memory value:

```ts
export type DocsRetainedPagesValidationVersionV1 = {
  slot: "rollback-target" | "published-latest"; productVersion: string;
  exactParentCommitSha: string; exactCommitSha: string;
  publicationParentCommitSha: string; publicationCommitSha: string;
  capsuleSha256: string; publicationReceiptSha256: string;
};
export type DocsRetainedPagesValidationSnapshotV1 = {
  state: "published" | "rolled-back" | "restored"; parentCommitSha: string; commitSha: string;
  rootTreeSha256: string; immutableExactTreeSha256: string;
  siteIndexSha256: string; latestVersion: string; operationReceiptSha256: string;
};
export type DocsRetainedPagesValidationOperationReceiptV1 = {
  schema: "coderso.docs-retained-pages-validation-operation@v1";
  operation: "publish" | "rollback" | "restore"; productVersion: string;
  fromCommitSha: string; toCommitSha: string; fromLatestVersion: string | null;
  toLatestVersion: string;
  rootTreeSha256: string; immutableExactTreeSha256: string; siteIndexSha256: string;
};
export type DocsRetainedPagesValidationHandoffV1 = {
  schema: "coderso.docs-retained-pages-validation-handoff@v1";
  runId: string; repositoryKind: "task-owned-local-bare"; branchRef: string; baseCommitSha: string;
  versions: [DocsRetainedPagesValidationVersionV1 & { slot: "rollback-target" },
    DocsRetainedPagesValidationVersionV1 & { slot: "published-latest" }];
  snapshots: {
    published: DocsRetainedPagesValidationSnapshotV1 & { state: "published" };
    rolledBack: DocsRetainedPagesValidationSnapshotV1 & { state: "rolled-back" };
    restored: DocsRetainedPagesValidationSnapshotV1 & { state: "restored" };
  };
};
export function normalizeDocsRetainedPagesValidationHandoffV1(value: unknown): DocsRetainedPagesValidationHandoffV1;
export type DocsRetainedPagesValidationSessionV1 = {
  handoff: DocsRetainedPagesValidationHandoffV1;
  receiptBytes: { rollbackTargetPublication: Uint8Array;
    publishedLatestPublication: Uint8Array; rollback: Uint8Array; restore: Uint8Array };
  snapshotRoots: { published: string; rolledBack: string; restored: string };
  dispose(): Promise<void>;
};
export type DocsRetainedPagesValidationInputV1 = {
  runId: string; taskOwnedTempRoot: string; fixture: "coderso-retained-pages-minimal-v1";
};
export type VerifiedDocsRetainedPagesValidationSessionV1 = {
  session: DocsRetainedPagesValidationSessionV1;
  handoff: DocsRetainedPagesValidationHandoffV1; handoffSha256: string; verified: true;
};
export type DocsRetainedPagesValidationSessionExpectedV1 =
  | { phase: "pre-mount"; runId: string; taskOwnedTempRoot: string }
  | { phase: "post-use"; runId: string; taskOwnedTempRoot: string; handoffSha256: string };
export function normalizeDocsRetainedPagesValidationSessionExpectedV1(value: unknown):
  DocsRetainedPagesValidationSessionExpectedV1;
export function verifyDocsRetainedPagesValidationSessionV1(
  session: DocsRetainedPagesValidationSessionV1, expected: DocsRetainedPagesValidationSessionExpectedV1
): Promise<VerifiedDocsRetainedPagesValidationSessionV1>;
```

Repository creation executes without a shell as exact argv `git -c
init.defaultObjectFormat=sha256 init --bare --object-format=sha1 <resolved-root>`
and immediately requires `git rev-parse --show-object-format` to return `sha1`;
the hostile ambient override proves the explicit format wins. Then
`normalizeDocsRetainedPagesValidationHandoffV1()` recursively rejects unknown
keys and bounds every string, path, count and byte source. Both versions are
distinct, ascending plain SemVer values and the two tuple slots occur exactly
once. All commit IDs are lowercase 40-hex and all content/receipt hashes are
lowercase SHA-256. `branchRef` must byte-equal
`refs/heads/task-548-retained-pages-validation/<runId>` with a bounded safe
`runId`; the resolved bare repository and every checkout must remain beneath
the caller's task-owned temporary root, contain no symlink, and use no network,
credential or real Pages ref.

There is no hidden input; for the exact fixture discriminator, L02 constructs two task-local `VerifiedDocsReleaseArtifact` values internally.
That name is the exact L01 export and exact `verifyDocsReleaseArtifact()` result,
not an L02 projection. The values use fixed synthetic versions `0.0.0` and
`0.0.1`, locale `en`, document
`retained-pages-validation`, section `overview`, and one hashed search/visual
record. It imports the L01/04 strict schemas and canonical serializers; it does
not import a portal builder, read a workspace/release artifact, use the current
product version, clock, environment, network, or caller-selected content.
Commit author/committer identity, timestamps and messages are fixed literals.
This validation-only fixture construction is part of the one L02 session call,
writes only below `taskOwnedTempRoot`, and is not release-artifact regeneration
for the packaged product.

L02 solely owns `hashDocsRetainedPagesValidationTreeV1(domain, root, paths)`.
It inventories no-follow regular `100644` files only, rejects empty/duplicate/
non-NFC/unsafe paths and unexpected entries, converts paths to base-relative
POSIX UTF-8, and sorts by raw UTF-8 bytes. The SHA-256 input is
`UTF8(domain) + NUL`, followed for each file by
`u32be(pathBytes.length) + pathBytes + u32be(6) + UTF8("100644") +
u64be(fileBytes.length) + rawSha256(fileBytes)`. The only domains/path sets are:

- `coderso.docs-retained-pages-validation.capsule.v1`: every regular member
  below one exact
  `release-metadata/<version>/publication-capsule/`;
- `coderso.docs-retained-pages-validation.immutable.v1`: both versions'
  complete `v/<version>/`, `search/<version>/`, matching content-addressed
  assets, and `release-metadata/<version>/` trees; and
- `coderso.docs-retained-pages-validation.root.v1`: every regular file in one
  sealed snapshot root.

`siteIndexSha256` remains SHA-256 of the exact canonical `/site-index.json`
bytes, which must equal `/global/site-index.json`; receipt hashes remain
SHA-256 of their exact canonical JSON-plus-final-LF bytes. Producer and verifier
independently use the same owned helper and exact allowlists.

After shape normalization,
`verifyDocsRetainedPagesValidationSessionV1(session, expected)` returns only
`VerifiedDocsRetainedPagesValidationSessionV1` and verifies this exact
first-parent chain against the local repository, roots and canonical receipt
bytes:
`base → rollback-target exact → rollback-target publication → published-latest
exact → published-latest publication/published → rolled-back → restored`.
Every recorded parent/commit must equal the observed Git object, tree and ref.
The published snapshot commit equals the newer publication commit; rollback
selects only the older version; restore selects only the newer version.
Immutable `/v`, `/search`, content-addressed assets and release-metadata bytes
have one identical `immutableExactTreeSha256` in all three snapshots. Restored
`rootTreeSha256`, `siteIndexSha256`, latest version and all mounted bytes must
equal published byte-for-byte; rolled-back changes only the approved mutable
copies and `latestVersion`. Each operation receipt is canonical strict bytes
of `DocsRetainedPagesValidationOperationReceiptV1`; its exact operation,
from/to commit, from/to latest version, tree/index hashes and product version
join the corresponding version/snapshot field. Canonical key order and a final
LF are mandatory, and its SHA-256 joins the matching handoff hash.

The expected-value discriminator is phase-exact and recursively
reject-unknown. `pre-mount` accepts only `phase`, `runId`, and
`taskOwnedTempRoot`; a supplied handoff hash is invalid. `post-use` requires
those same fields plus lowercase-hex `handoffSha256`, which must byte-equal the
verified canonical handoff hash; an omitted or different hash is invalid. Both
phases rerun the complete repository, snapshot, receipt, tree, identity, and
handoff verification. Post-use verification is not a hash-only shortcut.

`createDocsRetainedPagesValidationSessionV1(input)` accepts only the exact
`DocsRetainedPagesValidationInputV1` and returns the normalized handoff,
canonical receipt bytes, and resolved `published`, `rolledBack`, and `restored`
snapshot roots plus an idempotent `dispose()`. Those operational roots/receipt
bytes are never serialized into the handoff, logs, TASK-545 manifest, or an
evidence file. TASK-548-07 may request exactly one session immediately before
its final browser smoke, mount the three sealed roots read-only, rehash them
after scenario 6, and dispose the complete scoped repository/root in `finally`.
A crash before TASK-545 checkpoint creation restarts the ordinary smoke and
creates a new scoped session; checkpoint resume never reconstructs or invokes
this ephemeral handoff. Construction failure performs the same exact-root
cleanup before returning a machine-readable non-pass error.

## Post-Deploy Availability Contract

After `deploy-pages` returns its same-origin deployment URL, make at most five
read-only attempts with capped response bytes and per-attempt timeout/backoff.
Using one deterministic route/visual/search tuple selected through the
cumulative index, retained portal manifest, and L01 receipts, verify:

- cumulative `/site-index.json` strict bytes/hash and the selected retained
  version entry;
- exact article status/body hash and versioned canonical URL;
- matching latest article status plus canonical/noindex/version behavior;
- deterministic missing-path status 404, exact root-404 body hash, noindex and
  no redirect/SPA fallback;
- both retained manifests at
  `/release-metadata/<version>/publication-capsule/`;
- both L01-owned search/assets publication receipts and the selected locale's
  search-index status, byte count, and hash, bound to both its search receipt
  record and detached portal-manifest file record;
- one content-addressed visual against its receipt/hash and exact
  `(docId, locale, sectionId)` ownership; and
- the capsule `_headers` and client-assets inventory against their cumulative-
  version/portal-manifest hashes, one referenced JS or CSS byte, and effective
  CSP, X-Frame-Options, nosniff, referrer, permissions and cache headers on
  exact/latest/404/client-asset responses; and
- no cross-origin redirect, credentialed request, cookie, write, or analytics
  call.

Exhaustion fails the release and emits bounded paths/status/hashes only. It never
changes an exact tree or bypasses environment protection; retry or rollback uses
the same immutable capsule.

L02 owns this exact recursively reject-unknown evidence contract:

`docsPostDeployHealthReceipt.ts` imports portal/client DTOs from publication
contracts, cumulative index from portal site-index, search/assets receipts from
`./docsReleaseSchemas`, and binding DTO/normalizer/serializer only from
`./docsReleaseTreeBinding`; it imports no builder, renderer, React/Vite/client,
deep source, TASK-545/workflow module or copied schema.

```ts
export type DocsPostDeployAttemptResultV1 = {
  attempt: number; target: "exact" | "latest" | "not-found" | "site-index" | "release-manifest"
    | "portal-manifest" | "search-receipt" | "assets-receipt" | "search-index" | "asset" | "client-assets-manifest" | "client-asset"
    | "cloudflare-headers";
  path: string; httpStatus: number; bytes: number; bodySha256: string; passed: true;
  responseHeaders: { contentSecurityPolicy: string; xFrameOptions: "DENY";
    xContentTypeOptions: "nosniff"; referrerPolicy: "no-referrer"; permissionsPolicy: string; cacheControl: string };
};
export type DocsPostDeployRouteFactV1 = {
  path: string; httpStatus: 200; bodySha256: string; canonicalHref: string; canonicalMatches: true;
  productVersion: string; versionMatches: true; noindex: boolean;
};
// SHARED strict post-deploy read-facts owner: the closure-required same-origin
// facts bound to the selected PUBLIC DocsReleaseTreeBindingV1. BOTH the
// release and the rollback health receipts embed this exact shape; its
// normalizer/serializer are the single authority for those facts, and every
// 05/07 mirror pins the same fields.
export type DocsPostDeployReadFactsV1 = {
  schema: "coderso.docs-post-deploy-read-facts@v1";
  publicRuntimeTree: DocsReleaseTreeBindingV1; // selected PUBLIC docs tree
  attemptLimit: 5;
  results: DocsPostDeployAttemptResultV1[];
  selectedRoute: {
    docId: string; locale: string; slug: string; exactPath: string; latestPath: string };
  exact: DocsPostDeployRouteFactV1 & { noindex: false }; latest: DocsPostDeployRouteFactV1 & { noindex: true };
  notFound: { path: string; httpStatus: 404; bodySha256: string; noindex: true };
  releaseManifestSha256: string; portalManifestSha256: string; siteIndexSha256: string;
  searchReceiptSha256: string; assetsReceiptSha256: string; cloudflareHeadersSha256: string;
  clientAssetsManifestSha256: string;
  search: { locale: string; path: string; httpStatus: 200; bytes: number; sha256: string };
  asset: { visualId: string; docId: string; locale: string; sectionId: string;
    path: string; httpStatus: 200; bytes: number; sha256: string };
  clientAsset: { kind: "entry-js" | "css"; path: string; httpStatus: 200; bytes: number; sha256: string };
  checkedAt: string;
};
export function normalizeDocsPostDeployReadFactsV1(value: unknown): DocsPostDeployReadFactsV1;
export function serializeDocsPostDeployReadFactsV1(value: DocsPostDeployReadFactsV1): Uint8Array;
export type DocsPostDeployHealthReceiptV1 = {
  schema: "coderso.docs-post-deploy-health@v1";
  productVersion: string; gitTag: string; gitSha: string;
  workflowRunId: string; workflowRunAttempt: number; deploymentId: string;
  publicOrigin: string; publicBasePath: string;
  readFacts: DocsPostDeployReadFactsV1; // shared closure-required read facts
  status: "pass";
};
export function normalizeDocsPostDeployHealthReceiptV1(value: unknown): DocsPostDeployHealthReceiptV1;
export function serializeDocsPostDeployHealthReceiptV1(value: DocsPostDeployHealthReceiptV1): Uint8Array;
```

The normalizer binds version/tag/SHA to the exact L01-normalized 40/64-OID tree,
workflow/deployment identity, origin/base, both manifest and cumulative hashes,
both L01 receipt hashes, all three cumulative deployment hashes, selected
route/search/client-asset/404 facts, effective headers, and localized visual
asset to the successful release inputs and retained capsule.
`readFacts.publicRuntimeTree` is a required allowlist key (the selected PUBLIC
docs tree, equal to `runtimeTree` for release and to the verified target
capsule tree for rollback); the health loader bounded-downloads/verifies the exact
release pair and requires its receipt and retained-manifest owner bytes equal, including rollback.
Before network selection, L02 parses receipts only with
`normalizeDocsSearchPublicationReceiptV1()`/`normalizeDocsAssetsPublicationReceiptV1()`
and requires raw bytes to equal their paired serializer output. It selects a
visual record, then requires its `(docId, locale)` route and `sectionId` owner
to exist in the same retained version; its bundle-global `visualId`, path,
bytes, and hash must match the detached portal manifest. It selects the same
locale's unique search record and cumulative-index route. The strict `search`
fact must copy that selected `DocsSearchPublicationRecordV1` locale, path,
bytes, and SHA-256 byte-for-byte, require `httpStatus: 200`, and join exactly one
detached portal-manifest file record by identical path/bytes/hash. Its locale
must equal `selectedRoute.locale`, and its path must be exactly
`search/<productVersion>/<locale>.json`; no leading-slash rewrite, filename
inference, locale fallback, or normalization-only equality is accepted.
Retained publish, rollback, and post-deploy paths use this identical selection
helper.

`results` contains only bounded same-origin reads, uses attempts `1..5`, and
closes every required target. It contains exactly one successful
`target: "search-index"` result whose path, `httpStatus`, bytes, and
`bodySha256` equal the strict `search` fact byte-for-byte; a missing or duplicate
success, wrong locale/path/status/bytes/hash, or result that does not join the
selected search receipt and portal-manifest record rejects. Exact is indexable;
latest and 404 are `noindex`, and both articles expose the expected canonical
version. The 404 response is status 404 with the exact capsule body hash, no
redirect and no SPA 200. `cloudflare-headers` reads the served capsule copy,
not root control metadata; it and the client manifest match the cumulative
version/portal records. A selected JS/CSS record alone identifies the fetched
client byte. Exact/latest/404/client-asset effective security headers equal the
normalized `_headers` policy; cache is immutable only for exact/client bytes
and revalidating for latest/404. Hashes are lowercase SHA-256, locales and paths
are canonical, paths are normalized confined public paths, counts/bytes are
bounded, and `checkedAt` is bounded canonical ISO-8601. `gitTag` must byte-equal
the same plain `productVersion`; `v`-prefixed or divergent health identity
rejects.

Only after every assertion passes, atomically write:

```text
.tmp/docs-release/post-deploy/docs-post-deploy-health-v1.json
```

The L02 owner module exposes only this exact evidence API:

```ts
export const DOCS_POST_DEPLOY_HEALTH_STAGING_PATH =
  ".tmp/docs-release/post-deploy/docs-post-deploy-health-v1.json" as const;
export const DOCS_POST_DEPLOY_HEALTH_ROOT_MEMBER = "docs-post-deploy-health-v1.json" as const;
export const DOCS_POST_DEPLOY_HEALTH_RETENTION_DAYS = 90 as const;
export function buildDocsPostDeployHealthArtifactNameV1(health: DocsPostDeployHealthReceiptV1): string;
```

The name is exactly
`docs-post-deploy-health-<productVersion>-<gitSha>-<workflowRunId>` only from
the validated health identity. The only write/upload helper signature is:

```ts
export async function writeAndUploadDocsPostDeployHealthReceiptV1(
  health: DocsPostDeployHealthReceiptV1
): Promise<void>;
```

The workflow artifact has exactly one root regular member named
`docs-post-deploy-health-v1.json`, no directory/nested/duplicate/extra/link/device
entry. Local `.tmp` is not archived; retention is exactly 90 days. Missing or
failed checks, wrong identity/tree/hash, partial write or unexpected inventory
never emits `status: "pass"`; bounded non-pass diagnostics stay separate.

## Security Contract

- **Endpoint visibility:** public read-only static files; no API or write route.
- **Auth/RBAC:** workflow App token only; protected `docs-production` uses scoped Cloudflare token.
- **CSRF/rate limit:** N/A; branch/environment/concurrency/lease guard writes.
- **Validation:** strict inputs; tag/SHA/tree/SemVer/base/artifact closure; capped
  canonical Git records/paths; reject unknown retained/index/candidate/runtime/
  client/publication/health shapes and require selected-search result closure.
- **Anti-abuse:** no public write; bound Git/output/download bytes, Pages plan
  file count/25-MiB members, retries and timeout; reject partial rollback mode.
- **Secrets/privacy:** credential-step contexts only; mask tokens and upload no cookies,
  `.env`, header logs, traces or source maps.

## Implementation Pseudocode

```ts
// Canonical strict portal-prepublication receipt. One canonical serializer
// produces the exact receipt bytes; the receipt is the NINTH uploaded artifact
// member (report + seven PNGs + receipt) and is validated by TASK-548-07's
// `validateTask548PortalPrepublicationGate` together with all eight evidence
// members. Every field binds verified values: workflow identity (run id,
// attempt, path, event, run head), the exact release-or-rollback target
// identity, deployment identity when known, the canonical report digest, the
// seven exact screenshot name/hash records, the PUBLIC runtime-tree identity/
// hashes, the portal manifest hash and the artifact-root hash. `status` is
// exactly `"pass"`; any failed gate never produces a receipt.
export type VerifiedPortalPrepublicationReceiptV1 = Readonly<{
  schema: "coderso.docs-portal-prepublication-receipt@v1";
  workflow: Readonly<{
    workflowRunId: string; workflowRunAttempt: number;
    workflowPath: ".github/workflows/release.yml";
    event: "push" | "workflow_dispatch";
    runHeadSha: string; // repository-format run-head commit OID
  }>; // projected EXCLUSIVELY from the input `workflow` context; the receipt
     // bytes bind the exact workflowRunId/workflowRunAttempt/runHeadSha, so a
     // receipt projected for one attempt can never validate for another
  target: Readonly<
    | { mode: "release"; productVersion: string; gitSha: string }
    | { mode: "rollback"; targetVersion: string; originalGitSha: string }
  >;
  deploymentId: string | null; // resolved deployment identity when known
  reportSha256: string; // SHA-256 over the canonical report.json bytes
  screenshots: ReadonlyArray<Readonly<{
    name: string; // exact `<scenarioId>.png`
    sha256: string;
  }>>; // exactly seven unique records in the exact frozen scenario-ID order
    // (the `TASK_548_PORTAL_SCENARIO_IDS` order); no alternative ordering
  publicRuntimeTreeSha256: string; // canonical PUBLIC tree serialization hash
  publicRuntimeTree: DocsReleaseTreeBindingV1;
  portalManifestSha256: string;
  artifactRootSha256: string;
  status: "pass";
}>;
export function serializeVerifiedPortalPrepublicationReceiptV1(
  value: VerifiedPortalPrepublicationReceiptV1): Uint8Array; // compact
  // canonical JSON+LF, reject-unknown on read, exact key order
// Strict normalized workflow context: the ONLY source of workflow facts for
// the receipt. It is populated from normalized GitHub context (workflow run
// id/attempt, workflow path, event, run-head SHA, resolved deployment id)
// BEFORE the gate call and passed as the shared `workflow` input of BOTH
// release and rollback variants; the gate, the receipt projection and the
// artifact upload read NO ambient workflow facts and have no fallback.
export type Task548PortalPrepublicationWorkflowContextV1 = Readonly<{
  workflowRunId: string; workflowRunAttempt: number;
  workflowPath: ".github/workflows/release.yml";
  event: "push" | "workflow_dispatch";
  runHeadSha: string; // repository-format run-head commit OID
  deploymentId: string | null; // resolved deployment identity when known
}>;
export function normalizeTask548PortalPrepublicationWorkflowContextV1(
  value: unknown): Task548PortalPrepublicationWorkflowContextV1; // strict
  // reject-unknown normalizer over the normalized GitHub context; missing or
  // unknown fields fail before any gate work
// Strict discriminated gate input: NO ambient derivation. The release branch
// explicitly carries the shared strict `workflow` context plus runtimeTree and
// ALL FIVE verified values; the rollback branch carries the shared strict
// `workflow` context plus the verified candidate only.
type Task548PortalPrepublicationGateInputV1 =
  | {
      mode: "release";
      workflow: Task548PortalPrepublicationWorkflowContextV1; // shared strict
        // workflow facts; the sole workflow source for the receipt/upload
      runtimeTree: DocsReleaseTreeBindingV1;
      artifactRoot: string; productVersion: string; gitSha: string;
      portalManifestSha256: string; artifactRootSha256: string;
    }
  | {
      mode: "rollback";
      workflow: Task548PortalPrepublicationWorkflowContextV1; // shared strict
        // workflow facts; the sole workflow source for the receipt/upload
      candidate: VerifiedDocsRollbackCandidateV1; // binds the five
        // certification inputs from verified candidate bytes
    };
async function runRequiredPortalPrepublicationGate(
  input: Task548PortalPrepublicationGateInputV1
): Promise<VerifiedPortalPrepublicationReceiptV1> {
  const session = "task-548-portal-certification" as const;
  try {
    const gate = await runExactRegisteredRuntimeSmokeAndCaptureStdout({
      suite: "task-548-portal",
      profile: "certification",
      session,
      environment: projectExactPortalGateEnvironment(input),
    });
    const verified = requireExactTask548PortalCertificationReport(
      gate,
      input,
    );
    // The receipt workflow facts come EXCLUSIVELY from input.workflow (the
    // normalized GitHub context): workflowRunId, workflowRunAttempt,
    // workflowPath, event, runHeadSha and deploymentId. There is no ambient
    // environment/process-memory fallback; a missing/unknown workflow input
    // fails before the projection.
    const receipt = projectVerifiedPortalPrepublicationReceipt(
      verified, input,
    ); // canonical strict receipt; status "pass" only from a passed gate
    await uploadExactPortalPrepublicationEvidenceArtifact(verified, {
      retentionDays: 90,
      input,
      receipt, // ninth member: canonical serializer bytes of the receipt
      // The artifact name is identity-bound and target-bound and uses
      // `input.workflow.workflowRunId` as its run identity: release uses
      // `docs-portal-prepublication-gate-<productVersion>-<gitSha>-<workflowRunId>`,
      // rollback uses
      // `docs-portal-prepublication-gate-<targetVersion>-<originalGitSha>-<workflowRunId>`
      // (derived from the certified candidate's targetVersion/originalGitSha,
      // never from the workflow-run HEAD). In rollback mode this upload runs
      // inside the withVerifiedDocsRollbackCandidateV1 callback immediately
      // after the gate passes and BEFORE any retained/Cloudflare mutation; an
      // upload failure aborts before mutation, leaves product state untouched,
      // and the same `finally` cleanup removes the confined temp root.
    });
    return receipt;
  } finally {
    await removeTask548PortalCandidateEvidenceSubset({ repoRoot, session });
  }
}

// ONE normalized portal-prepublication workflow context, constructed BEFORE
// the dispatch branch from the exact named normalized GitHub workflow-context
// source and reused read-only by BOTH gate calls below (release and rollback).
// No branch reconstructs, re-reads, or patches this value and there is no
// ambient environment/process-memory fallback; a missing/unknown source
// fails here before any branch executes.
const portalPrepublicationWorkflow =
  normalizeTask548PortalPrepublicationWorkflowContextV1(
    readNormalizedGitHubWorkflowContextV1());

const dispatch = normalizeDocsReleaseWorkflowDispatchModeV1(rawDispatchInputs);
if (dispatch.mode === "manual-release") {
  const releaseBuild = await runExistingSemanticReleasePortalBuildAndValidation();
  await runRequiredPortalPrepublicationGate({
    mode: "release",
    workflow: portalPrepublicationWorkflow, // shared strict workflow context
    runtimeTree: releaseBuild.runtimeTree,
    artifactRoot: releaseBuild.artifactRoot, // verified dist root
    productVersion: releaseBuild.productVersion,
    gitSha: releaseBuild.gitSha,
    portalManifestSha256: releaseBuild.portalManifestSha256,
    artifactRootSha256: releaseBuild.artifactRootSha256,
  });
  await requireCleanTagCheckoutUnchangedSinceRuntimeTreeBinding(releaseBuild);
  await continueExistingReleaseArtifactAndPublicationFlow(releaseBuild);
} else if (dispatch.mode === "docker-recovery") {
  // Byte/contract-compatible existing Docker recovery behavior; only the
  // dispatch normalization/conditions changed.
  await runExistingDockerRecoveryJobV1(dispatch.input);
} else {
  // docs rollback: materialize the complete selected retained public
  // capsule/tree into a confined no-follow task-owned temp root, derive and
  // bind ALL FIVE portal-certification inputs (artifactRoot, productVersion,
  // originalGitSha, portalManifestSha256, artifactRootSha256) from verified
  // bytes, and run the EXACT certification gate BEFORE any retained mutation.
  // A failed gate leaves the retained branch and Cloudflare untouched; the
  // temp root is removed in `finally`.
  // Portal certification, rollback staging/mutation, deployment AND the
  // rollback-health upload all happen INSIDE the withVerifiedDocsRollbackCandidateV1
  // callback while the confined candidate root is guaranteed to exist; the
  // path-bearing candidate NEVER escapes the callback.
  const rollbackResult = await withVerifiedDocsRollbackCandidateV1(
    normalizeDocsRollbackMaterializationInputV1({
      taskOwnedTempRoot,
      selectedVersion: dispatch.input.docs_rollback_version,
    }),
    async (candidate) => {
      // The certification gate above is immediately before the first rollback
      // mutation.
      await runRequiredPortalPrepublicationGate({
        mode: "rollback",
        workflow: portalPrepublicationWorkflow, // the SAME pre-branch
          // normalized workflow context, reused read-only; never
          // reconstructed inside the rollback branch
        candidate, // binds the five certification inputs from
                   // verified candidate bytes
      });
      const rollbackHealthInput = await stageDocsRollbackWithCertifiedCandidate(
        dispatch.input, candidate
      );
      // The completed write/upload returns the canonical durable receipt
      // digest (SHA-256 over the canonical serialized rollback-health receipt
      // bytes); the digest is NEVER read from the pre-health input.
      const rollbackHealthSha256 = await runAndUploadRollbackPostDeployHealthV1(
        rollbackHealthInput
      );
      return { rollbackHealthSha256 };
      // Path-free durable result only: after the callback, `finally` cleanup
      // removes the confined temp root and the candidate value is never
      // returned or used again.
    }
  );
  // Only the path-free durable result may be used after cleanup; the
  // path-bearing candidate is gone.
  assertPathFreeDocsRollbackResultV1(rollbackResult);
}

export async function reconcileDocsReleaseAssetsNoClobberV1(input: {
  release: GitHubReleaseAssetClient; archivePath: string; receiptPath: string;
  local: VerifiedDocsReleaseArtifact;
}): Promise<VerifiedDocsReleaseArtifact> {
  const state = await classifyExactDocsReleaseAssetPairV1(input);
  switch (state.kind) {
    case "none":
      await uploadExpectedAssetWithoutClobber(input.release, input.archivePath);
      await uploadExpectedAssetWithoutClobber(input.release, input.receiptPath);
      break;
    case "archive-only":
      await downloadAndVerifyPresentReleaseAssetV1(input, state.archive);
      await uploadExpectedAssetWithoutClobber(input.release, input.receiptPath);
      break;
    case "receipt-only":
      await downloadAndVerifyPresentReleaseAssetV1(input, state.receipt);
      await uploadExpectedAssetWithoutClobber(input.release, input.archivePath);
      break;
    case "complete":
      return downloadAndVerifyFinalReleaseAssetPairV1(input, state);
  }
  return downloadAndVerifyFinalReleaseAssetPairV1(
    input,
    await classifyRequiredCompleteDocsReleaseAssetPairV1(input)
  );
}

export async function stageDocsPublication(input: DocsPublicationInputV1) {
  const publication = normalizeDocsPublicationInputV1(input);
  const retained = await openRetainedTreeAtObservedSha(publication.branchRoot);
  const tier = requireProtectedDocsCloudflarePagesAssetTierV1();
  return withVerifiedDocsReleaseArtifactMaterializationV1({
    archivePath: publication.archivePath, receiptPath: publication.receiptPath,
    destinationRoot: await createTaskOwnedPublicationTempRootV1(publication),
  }, async ({ artifact, materializedRoot }) => {
    const prospective = await stageProspectiveFinalPagesTreeV1({
      retained, artifact, materializedRoot,
    });
    await assertDocsCloudflarePagesUploadInventoryV1({
      uploadRoot: prospective.root, tier, wranglerVersion: "4.114.0",
    });
    const exact = stageExactVersionAndCapsuleNoOverwrite(
      retained, artifact, materializedRoot);
    await atomicCommitAndPush(exact, { expectedRemoteSha: publication.remoteSha });
    const verified = await refetchAndVerifyExactCapsule(artifact.manifest);
    const cumulative = mergeDocsPortalSiteIndexV1({
      mode: "publish", retained: await readVerifiedRetainedCumulativeIndex(verified),
      candidate: verified.siteIndexCandidate,
      portalManifestSha256: verified.portalManifestSha256,
      releaseManifestSha256: verified.releaseManifestSha256,
      siteIndexCandidateSha256: verified.siteIndexCandidateSha256,
    });
    const mutable = copyVerifiedMutableCandidates(verified.capsule, {
      cumulativeSiteIndexBytes: cumulative.bytes,
    });
    const retainedCommit = await atomicCommitAndPush(mutable, {
      expectedRemoteSha: verified.remoteSha,
    });
    return { retainedCommit, prospectiveInventorySha256:
      prospective.inventorySha256, tier };
  });
}

export async function stageDocsRollbackWithCertifiedCandidate(
  input: RollbackInputV1,
  candidate: VerifiedDocsRollbackCandidateV1
): Promise<DocsPostDeployRollbackHealthInputV1> {
  const rollback = normalizeRollbackInputV1(input);
  assertCandidateTargetEqualsInput(rollback, candidate);
  const artifact = await downloadAndVerifyExactReleaseAssetPairV1(rollback.docs_rollback_version);
  const capsule = await verifyRetainedPublicationCapsule(rollback.docs_rollback_version);
  assertArtifactReceiptAndRetainedTreeEqualV1(artifact, capsule);
  // The certified candidate's original identity/hashes MUST equal the verified
  // release-asset and retained-capsule bytes; drift fails before mutation.
  assertCandidateBindingsEqualVerifiedBytes(candidate, artifact, capsule);
  const cumulative = mergeDocsPortalSiteIndexV1({
    mode: "rollback",
    retained: await readRequiredRetainedCumulativeIndex(),
    selectedVersion: capsule.manifest.productVersion,
  });
  const mutableCommit = await commitCopiedMutableCandidatesOnly(capsule, {
    cumulativeSiteIndexBytes: cumulative.bytes,
  });
  // Refetch/inventory the authoritative commit, then materialize/verify the
  // Cloudflare upload tree and deploy with the pinned Wrangler under the
  // protected environment.
  await refetchAndInventoryAuthoritativeCommit(mutableCommit);
  const uploadRoot = await stageVerifiedCloudflareUploadTreeV1({
    retainedCommit: mutableCommit, publicBasePath, taskOwnedTempRoot,
  });
  await assertDocsCloudflarePagesUploadInventoryV1({
    uploadRoot, tier: requireProtectedDocsCloudflarePagesAssetTierV1(),
    wranglerVersion: "4.114.0",
  });
  const deployment = await wranglerPagesDeployV1(uploadRoot, {
    accountId: requireProtectedVariable("CLOUDFLARE_ACCOUNT_ID"),
    projectName: requireProtectedVariable("DOCS_CLOUDFLARE_PAGES_PROJECT"),
    branch: "production", commitHash: mutableCommit,
  });
  return buildRollbackHealthInputV1({
    candidate, mutableCommit, deployment,
    fromLatestVersion: cumulative.index.latestVersionBeforeRollback,
  });
}

// Strict rollback-health INPUT carries only verified pre-health facts (target
// identity, deployment, retained commit, read facts); it NEVER carries any
// receipt digest. The canonical durable receipt digest is returned by the
// completed write/upload helper below.
export type DocsPostDeployRollbackHealthInputV1 = Readonly<{
  candidate: VerifiedDocsRollbackCandidateV1; // target identity/hashes
  fromLatestVersion: string; // prior latest version (pre-rollback)
  mutableCommit: string; retainedCommit: string;
  deployment: Readonly<{ deploymentId: string; url: string }>;
  publicOrigin: string; publicBasePath: string;
  workflowRunId: string; workflowRunAttempt: number;
  readFactsInput: Readonly<Record<string, unknown>>; // normalized read-fact
    // inputs only; validated through the shared DocsPostDeployReadFactsV1 owner
}>;
export async function runAndUploadRollbackPostDeployHealthV1(
  input: DocsPostDeployRollbackHealthInputV1
): Promise<string> {
  const health = await verifyRollbackPublishedDocsReadOnly({
    deploymentUrl: requireConfiguredProductionOrigin(input.deployment, input.publicOrigin),
    input,
    requiredTargets: ["not-found", "cloudflare-headers", "client-asset"],
    maxAttempts: 5,
  });
  // Exact rollback-specific receipt binding from/to latest, target version,
  // target original identity/hashes, retained commit and deployment; written
  // atomically under .tmp/docs-release/post-deploy/ and uploaded with 90-day
  // retention; failure never emits status: "pass".
  return writeAndUploadDocsPostDeployRollbackHealthReceiptV1(health);
}

const retainedPagesValidation = await createDocsRetainedPagesValidationSessionV1({
  runId: validationRunId, taskOwnedTempRoot,
  fixture: "coderso-retained-pages-minimal-v1",
});
try {
  const verified = await verifyDocsRetainedPagesValidationSessionV1(
    retainedPagesValidation, {
      phase: "pre-mount", runId: validationRunId, taskOwnedTempRoot,
    },
  );
  try {
    await consumeVerifiedRetainedPagesSessionReadOnly(verified);
  } finally {
    await verifyDocsRetainedPagesValidationSessionV1(
      retainedPagesValidation, {
        phase: "post-use", runId: validationRunId, taskOwnedTempRoot,
        handoffSha256: verified.handoffSha256,
      },
    );
  }
} finally {
  await retainedPagesValidation.dispose();
}

const { retainedCommit, prospectiveInventorySha256, tier } =
  await stageDocsPublication(publicationInput);
const uploadRoot = await stageVerifiedCloudflareUploadTreeV1({
  retainedCommit, publicBasePath, taskOwnedTempRoot,
});
await assertProspectiveAndFinalPagesInventoryEqualV1({
  expectedSha256: prospectiveInventorySha256, uploadRoot,
});
await assertDocsCloudflarePagesUploadInventoryV1({
  uploadRoot, tier, wranglerVersion: "4.114.0",
});
const deployment = await wranglerPagesDeployV1(uploadRoot, {
  accountId: requireProtectedVariable("CLOUDFLARE_ACCOUNT_ID"),
  projectName: requireProtectedVariable("DOCS_CLOUDFLARE_PAGES_PROJECT"),
  branch: "production", commitHash: retainedCommit,
});

const retainedHealthInput = await loadVerifiedRetainedPublicationForHealth({
  deploymentUrl: requireConfiguredProductionOrigin(deployment, publicOrigin),
  version,
});
const selected = selectDeterministicDocsPostDeployTupleV1({
  index: retainedHealthInput.cumulativeIndex,
  portal: retainedHealthInput.portalManifest,
  searchReceipt: normalizeDocsSearchPublicationReceiptV1(retainedHealthInput.searchReceipt),
  assetsReceipt: normalizeDocsAssetsPublicationReceiptV1(retainedHealthInput.assetsReceipt),
  clientAssets: normalizeDocsPortalClientAssetsManifestV1(retainedHealthInput.clientAssets),
  cloudflareHeaders: retainedHealthInput.cloudflareHeaders,
});
assertSelectedSearchJoinsRouteReceiptAndPortalManifestV1(selected);
const health = await verifyPublishedDocsReadOnly({
  deploymentUrl,
  version,
  gitTag,
  gitSha,
  runtimeTree: requireExactReleaseRuntimeTreeV1(
    retainedHealthInput.releaseManifest.runtimeTree,
    retainedHealthInput.verifiedArtifact.receipt.runtimeTree),
  workflowRunId, workflowRunAttempt, deploymentId, selected,
  requiredTargets: ["search-index", "not-found", "client-assets-manifest",
    "client-asset", "cloudflare-headers"],
  maxAttempts: 5,
});
await writeAndUploadDocsPostDeployHealthReceiptV1(health);
```

**Data flow:** strict four-input workflow dispatch (all four empty →
manual-release; exact recovery pair → docker-recovery; exact docs pair →
rollback; partial/mixed/unknown/missing fails before privileged effects; push
selects release only) → ONE normalized portal-prepublication workflow context
is constructed BEFORE the dispatch branch from the exact named normalized
GitHub workflow-context source
(`portalPrepublicationWorkflow =
normalizeTask548PortalPrepublicationWorkflowContextV1(
readNormalizedGitHubWorkflowContextV1())`) and reused read-only by BOTH
release and rollback certification gate calls — no branch reconstructs it and
no ambient fallback exists → the NORMAL RELEASE publication job runs only when
`released ==
"true"` (semantic-release is the SOLE release authority: it alone creates the
generated version/lock/changelog release commit, the plain SemVer tag and the
GitHub release; the owner never runs `git tag`/`gh release`) → pinned
checkout/retained branch → one runtime-tree binding →
portal build/validator → pinned local browser install/verification →
shared seven-flow certification → exact noncanonical
report/PNG upload → candidate cleanup and clean-tag recheck → artifact
verification → exact two-asset release no-clobber → exact/capsule
branch commit/re-read → strict cumulative site-index merge plus retained
candidate byte-copy commit → protected Cloudflare Pages deploy → receipt-backed bounded
same-origin availability verification → audit summary. Rollback materializes
the complete selected retained public capsule/tree into a confined no-follow
task-owned temp root, derives and binds ALL FIVE certification inputs
(artifactRoot, productVersion, originalGitSha, portalManifestSha256,
artifactRootSha256) from verified bytes, runs the EXACT certification gate
BEFORE any retained mutation and uploads the target-bound prepublication
artifact
`docs-portal-prepublication-gate-<targetVersion>-<originalGitSha>-<workflowRunId>`
immediately after the gate passes and BEFORE any retained/Cloudflare mutation
(a failed gate or upload leaves branch/Cloudflare untouched; an upload failure
aborts before mutation and leaves product state untouched), then performs the
lease-guarded mutable commit, authoritative refetch/inventory, Cloudflare
upload-tree verification, pinned-Wrangler deploy and a rollback-specific
post-deploy health receipt binding from/to latest, target version, target
original identity/hashes, retained commit and deployment — ALL inside the
`withVerifiedDocsRollbackCandidateV1` callback, after which `finally` removes
the confined temp root and only a path-free durable result survives. The separately invoked
validation helper drives the same publish/rollback functions only against one
scoped local bare repository, seals an in-memory publish/rollback/restore
handoff, and always disposes it.

**Error handling:** plain-tag/version/target/HEAD drift, origin failure,
artifact-receipt conflict, invalid rollback key/type/confirmation, invalid
Docker recovery key/digest, partial/mixed/unknown/missing dispatch input,
remote branch
race, exact/capsule path mismatch, retained-manifest/receipt/hash failure,
malformed or conflicting cumulative index, localized visual-owner mismatch,
attempted candidate regeneration, rollback materialization/certification
failure (an invalid gate leaves the retained branch and Cloudflare untouched;
the path-bearing candidate never escapes the
`withVerifiedDocsRollbackCandidateV1` callback and cleanup always removes the
confined temp root),
portal gate/report/screenshot/artifact upload
(including a rollback target-bound prepublication upload failure, which aborts
before any retained/Cloudflare mutation)
or candidate-cleanup drift, pinned-browser install/version failure, dirty
checkout, Cloudflare deployment or
post-deploy health failure is blocking. Always remove only owned worktrees and
exact candidate roots and revoke/expire step credentials; never retry via force
or clobber.

## Regression Tests

- workflow contract pins every action, keeps the current Docker recovery
  conditions byte-compatible (only the four-input dispatch normalization and
  job conditions change), keeps the current Docker release conditions,
  validates the TASK-548-02-L02-owned manifest-copy-before-frozen-install and
  acyclic Core→contracts+renderer+portal graph plus portal subpaths without writing owner files, and asserts exact
  job permissions/environment/concurrency, no GitHub Pages/OIDC permission,
  protected `docs-production`, the exact Wrangler-action SHA/`4.114.0` CLI and
  literal `wrangler pages deploy` account/project/branch/commit mapping; token
  scope/masking/non-logging plus plain `git_tag == version`,
  tag-target/checkout-HEAD checks and all four release build-environment
  mappings including target-commit epoch; the workflow contract pins the four
  YAML inputs (`recovery_image_version`, `recovery_image_digest`,
  `docs_rollback_version`, `docs_rollback_confirmation`) and the mutually
  exclusive semantic-release/recover-docker-image/docs-rollback job conditions
  (push and all-empty → release only; exact recovery pair → Docker recovery
  only; exact docs pair → rollback only; partial/mixed fails before token
  creation), and pins that semantic-release is the sole release authority
  (`released == "true"` gating for the NORMAL RELEASE publication only;
  docs rollback never requires the semantic-release output; no owner-created
  tag/release); a clean-tag
  fixture with the tracked
  bundle and no `.tmp` tree/report passes `docs:check`, while transaction debris,
  report-only state, stale source equality, or a tampered bundle blocks without
  mutation; Docker-repeat fixtures require task-scoped `mktemp`, `--iidfile`,
  strict image-ID validation and exact EXIT cleanup, and reject a fixed tag,
  foreign image ID, broad temp path, or second-run collision;
- workflow ordering fixtures require portal build/verified rollback target +
  L03 validator + exact `task-548-portal` certification immediately before the
  first release or rollback mutation; pin the five-key environment projection,
  exact seven report-backed scenarios/screenshots, canonical stdout capture,
  full-SHA upload action, artifact name/inventory and 90-day retention.
  Prepublication-receipt fixtures pin the strict normalized
  `Task548PortalPrepublicationWorkflowContextV1` input: the gate input carries
  the shared `workflow` context in BOTH release and rollback variants
  (workflowRunId, workflowRunAttempt, workflowPath, event, runHeadSha,
  deploymentId), the receipt/artifact projection reads ONLY that input, and a
  receipt projected from attempt-1 bytes (same run id and runHeadSha) FAILS
  validation for attempt 2 — the serialized receipt bytes bind the exact
  attempt, so attempt 1 can never satisfy attempt 2. A missing, unknown-field,
  or altered `workflow` input fails before any gate/upload work and there is NO
  ambient environment/process-memory fallback (deleting the input proves the
  failure). For
  rollback, the five certification inputs are derived and bound from the
  materialized retained-capsule bytes (`VerifiedDocsRollbackCandidateV1`:
  artifactRoot, productVersion, originalGitSha, portalManifestSha256,
  artifactRootSha256), never ambient/current-checkout values; the certification
  runs BEFORE any retained mutation and the target-bound prepublication
  artifact `docs-portal-prepublication-gate-<targetVersion>-<originalGitSha>-<workflowRunId>`
  uploads inside the candidate callback immediately after the gate passes and
  BEFORE any retained/Cloudflare mutation (an upload failure aborts before
  mutation and leaves product state untouched); an invalid gate leaves
  branch/Cloudflare
  untouched; the confined temp root is removed in `finally` and proven absent.
  Gate,
  report, screenshot, upload, cleanup, symlink or post-clean-status failure
  leaves every publication mutation untouched; no task-local lifecycle,
  Playwright invocation or report synthesizer is permitted; release and
  rollback certification runners first execute the Pinned Local Browser Install
  Contract (local pinned `@playwright/cli` version verification from the exact
  L02 root devDependency pins `@playwright/cli: 0.1.18` / `pixelmatch: 7.2.0`,
  `./node_modules/.bin/playwright install --with-deps chromium`, underlying
  Playwright version and Chromium executable/revision verification;
  missing/version drift blocks with `docs_visual_tool_version_mismatch`);
- rollback materialization fixtures pin the exact
  `VerifiedDocsRollbackCandidateV1` schema, the no-follow confined materialized
  tree (reject symlinks/traversal/unknown entries/network), the five derived
  certification inputs bound from verified bytes, gate-before-mutation ordering,
  lease-guarded mutable commit, authoritative refetch/inventory, upload-tree
  verification, pinned-Wrangler deploy, the rollback-specific post-deploy
  health receipt (`DocsPostDeployRollbackHealthReceiptV1` binding from/to
  latest, target version, target original identity/hashes, retained commit and
  deployment; `toLatestVersion === targetVersion`; atomic staging write,
  exact artifact name and 90-day retention) and `finally` temp-root cleanup;
  EVERY rollback step — certification, staging/mutation, deployment and
  rollback-health upload — settles inside the
  `withVerifiedDocsRollbackCandidateV1` callback, the callback returns only a
  path-free durable result, and the path-bearing candidate is never returned
  from or used after the callback; the helper accepts ONLY the normalized
  `DocsRollbackMaterializationInputV1` — a caller-supplied factory, an
  already-started Promise, or an ambient temp root is rejected before any
  allocation — it creates the owned root, invokes the materializer inside its
  own `try/finally` with that root, and then calls `use`;
  `DocsRollbackCandidateLifetimeDepsV1` overrides receive only the
  helper-owned root and may never allocate outside it; materializer rejection
  after allocation and every child allocation still run the same `finally`
  cleanup (absent, nonsymlinked);
  every failure before the certification pass proves branch/Cloudflare
  byte-untouched;
- fault each boundary before/after invoke, partial report, each of seven PNGs,
  report validation, artifact upload and return. `finally` cleanup receives only
  the pinned session, accepts any subset of the exact report+seven-PNG allowlist,
  rejects foreign/nested/symlink members, and proves absence for both release
  and rollback paths without requiring a successful report object;
- SHA-1/SHA-256 temp repos pin ordered `git rev-parse --show-toplevel` →
  `git status --porcelain=v1 -z --untracked-files=all --ignore-submodules=none` →
  `git rev-parse --show-object-format` → `git rev-parse --verify HEAD^{commit}` →
  `git rev-parse --verify HEAD^{tree}` → `git ls-tree -rz --full-tree HEAD` → exact
  repeated commit/tree/status argv; one raw NUL stream and one constructor; reject dirty/
  untracked/raced HEAD/tree, malformed/duplicate/out-of-order records, bad
  mode/type/OID/path/UTF-8/NFC, all cap overflows, shell use or a second compute;
  manifest, artifact receipt, retained retry/rollback and health binding must match;
- first publish, identical retry, different-byte conflict, branch race, partial
  exact push, malformed/tampered/missing artifact receipt, and failed alias
  stage preserve invariants; release upload fixtures cover the strict zero,
  archive-only, receipt-only, and complete states. Failure immediately after
  the archive-first upload and immediately after the receipt-first upload both
  retry through the matching singleton state, fully verify the present asset,
  upload only its missing sibling without clobber, then redownload and verify
  the final pair. Complete state uploads nothing. Duplicate, extra, unexpected,
  partial, conflicting, renamed, replacement, or clobber cases fail; a
  standalone manifest is never accepted, and every final tar is reopened to
  verify its embedded manifest and exact local `VerifiedDocsReleaseArtifact`;
- publication imports L01's exact materializer, holds archive/receipt handles
  through verify/extract, and rejects path/inode swaps at every boundary; only
  its sealed regular-file tree may stage exact/capsule bytes;
- latest/runtime/client inventory are never copied before a re-read of the
  remote exact tree/full capsule; no publication/rollback imports a portal builder;
- cumulative-index fixtures pin the exact imported reject-unknown normalizer,
  discriminator/key sets, descending SemVer and route order, first-release
  absence rule, canonical serialization/hash, two-version merge, idempotent
  equality, same-version no-clobber conflict, root/global byte parity, retained
  record preservation, exact 404/_headers/client-manifest hashes, branch race,
  and no old-page rebuild;
- two retained versions coexist byte-identically; runtime `_headers`/404,
  client inventory, sitemap and redirects contain
  only verified routes; rollback changes only `latestVersion` plus approved
  mutable copies, preserves all index entries, rejects absent/tampered capsules,
  records audit identity, and does not run semantic-release/Docker;
- retained-Pages validation-session fixtures require the exact discriminator,
  no hidden input, explicit `--object-format=sha1` despite hostile ambient
  `init.defaultObjectFormat=sha256`, fixed two-version fixture and fixed Git
  identity/time, two ordered version slots, safe task-owned ref/root, complete
  first-parent chain, observed commit/tree/ref equality, canonical
  publication/rollback/restore receipt hashes, the three exact domain-separated
  tree streams/path sets, unchanged immutable trees, rollback-only mutable
  differences, and published/restored byte identity. The exact owner verifier
  runs its full verification before mount and after use; pre-mount forbids a
  handoff hash, while post-use requires the exact prior `handoffSha256`.
  Missing or wrong phase/hash, duplicate, reordered, unknown,
  wrong-ref, wrong-parent/commit/tree/hash/version/receipt/domain/path/mode/
  length, symlink, network, real-production-ref, escaped-root or cleanup drift
  rejects;
- producer-consumer fixtures import L01's exact search/assets receipt
  normalizers and canonical bytes. Current, retained, rollback, and post-deploy
  selection reject unknown/unsorted/duplicate/tampered receipt records,
  projection-hash drift, locale/owner/section/path/hash drift, or a reused
  bundle-global `visualId`; selected-search fixtures require the route locale,
  exact `search/<productVersion>/<locale>.json` record, and matching detached
  portal-manifest path/bytes/hash without filename inference or fallback;
- workflow-dispatch fixtures preserve push and all-four-empty manual semantic
  release, accept only a complete exact rollback pair (docs pair present,
  recovery pair byte-empty) and only a complete exact Docker recovery pair
  (recovery pair present, docs pair byte-empty), and reject one-empty,
  partial, mixed, missing/extra/non-string/whitespace/`v`/case/normalized/
  version/digest drift before
  token creation; modes never execute each other's semantic/Docker/rollback path;
  push events select release only; `recovery_image_digest` is exactly lowercase
  `sha256:<64-hex>`;
- pre-mutation and final-upload inventory tests pin Free 20,000, paid-v4
  100,000, exact 25-MiB member limits, hostile links/control files, aggregate
  bounds, prospective/final hash parity, required project v4 setting and pinned
  Wrangler; every exact boundary passes and max-plus-one leaves branch/deploy untouched;
- availability covers success/recovery/exhaustion, hash/canonical/version
  mismatch, redirects/oversize, exact 404-not-200 body, client JS/CSS bytes,
  capsule `_headers`, and effective exact/latest/404/asset CSP/frame/nosniff/
  referrer/permissions/cache plus one receipt-bound `search-index` fetch;
- post-deploy receipt tests pin displayed order/final LF, binding-sensitive bytes/hash and byte-identical
  normalize→serialize→parse→normalize, reject recursive unknown keys, and cover exact
  workflow/deployment/release identity, plain tag/version and nested tree equality, both manifest hashes,
  cumulative index/receipt/deployment hashes, exact indexability, latest/404 noindex,
  exact `search` plus complete target inventory including `search-index`,
  404, client manifest/asset and `_headers`; incomplete/duplicate targets and missing/duplicate/
  wrong-locale/path/status/bytes/hash selected-search facts or result joins;
  wrong route/404/client-asset status/body/cache/security-header/canonical/
  version or localized visual ownership facts,
  atomic cleanup, exact artifact naming and 90-day retention; the uploaded
  artifact inventory rejects missing, duplicate, nested, extra, directory,
  symlink, device, or renamed members; failure can never emit a pass receipt;
- cleanup cannot remove the repository/shared root or another worktree.

## Sub-Tasks

- [ ] Compute one Git runtime-tree binding, extend release, and validate the
  read-only TASK-548-02-L02 Docker/core workspace contract.
- [ ] Add exact two-asset release upload, no-clobber exact/capsule staging, and
  retained-byte-copy promotion.
- [ ] Add strict cumulative site-index publish/rollback merge and hash gates.
- [ ] Add the strict four-input workflow dispatch DTO
      (`recovery_image_version`, `recovery_image_digest`,
      `docs_rollback_version`, `docs_rollback_confirmation`) with the three
      disjoint modes (manual semantic release / Docker recovery / docs
      rollback), the four YAML inputs and mutually exclusive job conditions;
      keep the existing Docker recovery behavior byte/contract compatible.
- [ ] Add the rollback materialization owner
      (`VerifiedDocsRollbackCandidateV1` /
      `materializeVerifiedDocsRollbackCandidateV1`): materialize the complete
      selected retained public capsule/tree into a confined no-follow task-owned
      temp root, bind all five certification inputs from verified bytes, run the
      exact certification gate BEFORE any retained mutation, then
      lease-guarded mutable commit, authoritative refetch/inventory, Cloudflare
      upload-tree verification, pinned-Wrangler deploy, and the rollback-specific
      post-deploy health receipt (`DocsPostDeployRollbackHealthReceiptV1`
      binding from/to latest, target version, target original identity/hashes,
      retained commit and deployment); `finally` removes the temp root and an
      invalid gate leaves branch/Cloudflare untouched.
- [ ] Add protected Cloudflare deployment, bounded health check and capsule rollback.
- [ ] Insert the shared seven-flow portal certification (with the Pinned Local
      Browser Install Contract executed first) and exact evidence
      upload/cleanup gate immediately before every release or rollback mutation.
- [ ] Add workflow/publication race, integrity, permission, and cleanup tests.

## Testing Requirements

```bash
bun test tests/unit/release
bun test tests/unit/documentation/docsPagesPublication.test.ts \
  tests/unit/release/docsReleaseWorkflowContract.test.ts
bun scripts/docs/stage-pages-publication.ts --help
bun run docs:check
DOCS_PRODUCT_VERSION=0.0.0-test \
DOCS_PUBLIC_ORIGIN=https://docs.example.invalid \
DOCS_PUBLIC_BASE_PATH=/docs \
SOURCE_DATE_EPOCH=0 \
  bun --cwd packages/docs-portal build
bun packages/docs-portal/scripts/validate-built-portal.ts \
  packages/docs-portal/dist
# docsReleaseWorkflowContract.test.ts executes the certification command with
# the exact version, git SHA, manifest SHA-256 and artifact-root SHA-256 parsed
# from the canonical validator receipt; literal placeholders and ambient
# fallbacks are forbidden.
task548_release_docker_parent="$(realpath "${TMPDIR:-/tmp}")"
task548_release_docker_tmp="$(
  mktemp -d \
    "$task548_release_docker_parent/coderso-task548-release-docker.XXXXXX"
)"
task548_release_docker_real="$(realpath "$task548_release_docker_tmp")"
case "$task548_release_docker_real" in
  "$task548_release_docker_parent"/coderso-task548-release-docker.*) ;;
  *) exit 1 ;;
esac
task548_release_docker_iid="$task548_release_docker_real/image-id"
task548_release_docker_image=""
task548_release_docker_cleanup() {
  if [[ "$task548_release_docker_image" =~ ^sha256:[0-9a-f]{64}$ ]]; then
    docker image rm "$task548_release_docker_image" >/dev/null 2>&1 || true
  fi
  case "$task548_release_docker_real" in
    "$task548_release_docker_parent"/coderso-task548-release-docker.*)
      rm -rf -- "$task548_release_docker_real"
      ;;
  esac
}
trap task548_release_docker_cleanup EXIT
docker build --build-arg APP_VERSION=0.0.0-test \
  --iidfile "$task548_release_docker_iid" .
task548_release_docker_image="$(
  tr -d '\r\n' < "$task548_release_docker_iid"
)"
[[ "$task548_release_docker_image" =~ ^sha256:[0-9a-f]{64}$ ]] || exit 1
docker run --rm --entrypoint bun "$task548_release_docker_image" \
  --eval 'await Promise.all([import("@coderso/docs-renderer"), import("@coderso/docs-portal/site-index"), import("@coderso/docs-portal/publication-contracts")])'
bun --cwd core lint:types
bun --cwd core lint
bun run precommit:check
git diff --check
```

Exercise publication, rollback, restore and the exact operational validation
handoff against a disposable local bare remote plus a dry-run workflow fixture;
never mutate the real retained branch or Cloudflare project during tests. The
Docker commands validate only the already-landed TASK-548-02-L02 owner
contract; any failure returns to that owner and is not patched by this leaf. Every
repeat allocates a validated task-scoped `mktemp -d`, captures the new image
through `docker build --iidfile`, requires an exact
`sha256:<64-lowercase-hex>` ID, and uses an `EXIT` trap to remove only that
exact image and validated temp directory. A fixed/shared tag or broad/unresolved
cleanup target is forbidden.

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

Send the capsule publication/rollback and post-deploy health runbook, exact
receipt schema/path/artifact name and retention, the operational retained-Pages
handoff/session contract, repository variables, branch/environment protection
settings, and recovery procedure to TASK-548-07.
