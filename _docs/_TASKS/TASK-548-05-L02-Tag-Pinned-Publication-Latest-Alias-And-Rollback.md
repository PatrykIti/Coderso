# TASK-548-05-L02: Tag-Pinned Publication, Latest Alias and Rollback
# FileName: TASK-548-05-L02-Tag-Pinned-Publication-Latest-Alias-And-Rollback.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-05
**Priority:** High
**Category:** Release Automation / Cloudflare Pages / Rollback
**Estimated Effort:** Large
**Dependencies:** TASK-548-05-L01 and TASK-548-02-L03; TASK-545 must be `✅ Done` and TASK-547 must be fully terminal before dispatch
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Extend semantic-release with a tag-pinned docs artifact and safe Cloudflare Pages
publication. Validate the 02-L03 Docker contract without editing it; preserve its
App/tag/SHA pattern, retain exact versions/capsules, serialize writers, promote
only verified capsule bytes, and support explicit retained-capsule rollback.

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

Before dispatch, 02-L03 must have landed: Docker copies all three docs manifests
before frozen install, and Core declares exact contracts/renderer/portal workspace
dependencies. L02 validates order/dependencies/Docker/runtime import read-only;
a missing contract returns to 02-L03 and is never patched here.

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

1. Run only after semantic-release reports `released == "true"`; use its exact
   `version` and `git_tag`.
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
   Validate the portal, then build/verify L01's tar plus sibling receipt using
   that exact runtime-tree binding; neither L01 nor a retry recomputes it.
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

The workflow preserves both existing release triggers. A push to `main`, or a
manual dispatch whose two exact inputs are both byte-empty, selects normal
semantic release. A manual dispatch with both values present selects rollback;
exactly one empty value is invalid. Normalize before token creation:

```ts
export type RollbackInputV1 = {
  docs_rollback_version: string;
  docs_rollback_confirmation: string;
};
export type DocsReleaseWorkflowDispatchModeV1 =
  | { mode: "manual-release" }
  | { mode: "rollback"; input: RollbackInputV1 };
export function normalizeDocsReleaseWorkflowDispatchModeV1(
  value: unknown
): DocsReleaseWorkflowDispatchModeV1;
```

The YAML exposes exactly those two optional typed strings with default `""` so
GitHub always supplies both keys. Empty-empty is the sole manual-release value
and retains the current semantic-release/Docker flow. For rollback,
`docs_rollback_version` is bounded exact plain SemVer and confirmation must byte-equal
`ROLLBACK ${docs_rollback_version}` after no trimming or case folding. Blank,
whitespace-only, partial-empty, missing/non-string/unknown, `v`-prefixed,
normalized-only, mismatched or wrong-case input fails before any privileged
effect. Push events cannot carry rollback input; rollback never runs semantic
release/Docker, while empty-empty manual dispatch never enters rollback.

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
export type DocsPostDeployHealthReceiptV1 = {
  schema: "coderso.docs-post-deploy-health@v1"; productVersion: string; gitTag: string; gitSha: string;
  runtimeTree: DocsReleaseTreeBindingV1; workflowRunId: string; workflowRunAttempt: number; deploymentId: string;
  publicOrigin: string; publicBasePath: string; attemptLimit: 5;
  results: DocsPostDeployAttemptResultV1[]; selectedRoute: {
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
  checkedAt: string; status: "pass";
};
export function normalizeDocsPostDeployHealthReceiptV1(value: unknown): DocsPostDeployHealthReceiptV1;
export function serializeDocsPostDeployHealthReceiptV1(value: DocsPostDeployHealthReceiptV1): Uint8Array;
```

The normalizer binds version/tag/SHA to the exact L01-normalized 40/64-OID tree,
workflow/deployment identity, origin/base, both manifest and cumulative hashes,
both L01 receipt hashes, all three cumulative deployment hashes, selected
route/search/client-asset/404 facts, effective headers, and localized visual
asset to the successful release inputs and retained capsule.
`runtimeTree` is a required allowlist key; the health loader bounded-downloads/verifies the exact
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
const dispatch = normalizeDocsReleaseWorkflowDispatchModeV1(rawDispatchInputs);
if (dispatch.mode === "manual-release") await runExistingSemanticReleaseAndDockerFlow();
else await stageDocsRollback(dispatch.input);

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

export async function stageDocsRollback(input: RollbackInputV1) {
  const rollback = normalizeRollbackInputV1(input);
  const artifact = await downloadAndVerifyExactReleaseAssetPairV1(rollback.docs_rollback_version);
  const capsule = await verifyRetainedPublicationCapsule(rollback.docs_rollback_version);
  assertArtifactReceiptAndRetainedTreeEqualV1(artifact, capsule);
  const cumulative = mergeDocsPortalSiteIndexV1({
    mode: "rollback",
    retained: await readRequiredRetainedCumulativeIndex(),
    selectedVersion: capsule.manifest.productVersion,
  });
  return commitCopiedMutableCandidatesOnly(capsule, {
    cumulativeSiteIndexBytes: cumulative.bytes,
  });
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

**Data flow:** semantic metadata/dispatch → pinned checkout/retained branch → one runtime-tree binding →
artifact verification → exact two-asset release no-clobber → exact/capsule
branch commit/re-read → strict cumulative site-index merge plus retained
candidate byte-copy commit → protected Cloudflare Pages deploy → receipt-backed bounded
same-origin availability verification → audit summary. The separately invoked
validation helper drives the same publish/rollback functions only against one
scoped local bare repository, seals an in-memory publish/rollback/restore
handoff, and always disposes it.

**Error handling:** plain-tag/version/target/HEAD drift, origin failure,
artifact-receipt conflict, invalid rollback key/type/confirmation, remote branch
race, exact/capsule path mismatch, retained-manifest/receipt/hash failure,
malformed or conflicting cumulative index, localized visual-owner mismatch,
attempted candidate regeneration, Cloudflare deployment or post-deploy health
failure is blocking. Always remove only owned worktrees and revoke/expire step
credentials; never retry via force or clobber.

## Regression Tests

- workflow contract pins every action, keeps current Docker release conditions,
  validates the TASK-548-02-L03-owned manifest-copy-before-frozen-install and
  acyclic Core→contracts+renderer+portal graph plus portal subpaths without writing owner files, and asserts exact
  job permissions/environment/concurrency, no GitHub Pages/OIDC permission,
  protected `docs-production`, the exact Wrangler-action SHA/`4.114.0` CLI and
  literal `wrangler pages deploy` account/project/branch/commit mapping; token
  scope/masking/non-logging plus plain `git_tag == version`,
  tag-target/checkout-HEAD checks and all four release build-environment
  mappings including target-commit epoch; a clean-tag fixture with the tracked
  bundle and no `.tmp` tree/report passes `docs:check`, while transaction debris,
  report-only state, stale source equality, or a tampered bundle blocks without
  mutation; Docker-repeat fixtures require task-scoped `mktemp`, `--iidfile`,
  strict image-ID validation and exact EXIT cleanup, and reject a fixed tag,
  foreign image ID, broad temp path, or second-run collision;
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
- workflow-dispatch fixtures preserve push and empty-empty manual semantic
  release, accept only a complete exact rollback pair, and reject one-empty,
  missing/extra/non-string/whitespace/`v`/case/normalized/version drift before
  token creation; modes never execute each other's semantic/Docker/rollback path;
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
  read-only TASK-548-02-L03 Docker/core workspace contract.
- [ ] Add exact two-asset release upload, no-clobber exact/capsule staging, and
  retained-byte-copy promotion.
- [ ] Add strict cumulative site-index publish/rollback merge and hash gates.
- [ ] Add protected Cloudflare deployment, bounded health check and capsule rollback.
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
wc -l .github/workflows/release.yml \
  scripts/docs/stage-pages-publication.ts core/services/documentation/release/docsPagesPublication.ts \
  core/services/documentation/release/docsPostDeployHealthReceipt.ts core/services/documentation/release/docsReleaseTreeBindingGit.ts \
  core/services/documentation/release/docsRetainedPagesValidationHandoff.ts \
  tests/unit/documentation/docsPagesPublication.test.ts \
  tests/unit/release/docsReleaseWorkflowContract.test.ts
git diff --check
```

Exercise publication, rollback, restore and the exact operational validation
handoff against a disposable local bare remote plus a dry-run workflow fixture;
never mutate the real retained branch or Cloudflare project during tests. The
Docker commands validate only the already-landed TASK-548-02-L03 owner
contract; any failure returns to that owner and is not patched by L02. Every
repeat allocates a validated task-scoped `mktemp -d`, captures the new image
through `docker build --iidfile`, requires an exact
`sha256:<64-lowercase-hex>` ID, and uses an `EXIT` trap to remove only that
exact image and validated temp directory. A fixed/shared tag or broad/unresolved
cleanup target is forbidden.

## Documentation Updates Required

Send the capsule publication/rollback and post-deploy health runbook, exact
receipt schema/path/artifact name and retention, the operational retained-Pages
handoff/session contract, repository variables, branch/environment protection
settings, and recovery procedure to TASK-548-07.
