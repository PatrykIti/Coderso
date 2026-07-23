# TASK-548-05-L02: Tag-Pinned Publication, Latest Alias and Rollback
# FileName: TASK-548-05-L02-Tag-Pinned-Publication-Latest-Alias-And-Rollback.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-05
**Priority:** High
**Category:** Release Automation / GitHub Pages / Rollback
**Estimated Effort:** Large
**Dependencies:** TASK-548-05-L01 and TASK-548-02-L03; TASK-545 must be `✅ Done` and TASK-547 must be fully terminal before dispatch
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Extend the existing semantic-release workflow with a tag-pinned documentation
artifact and safe GitHub Pages publication. Validate the
TASK-548-02-L03-owned Docker compatibility contract without editing it and
preserve its GitHub App/tag/SHA pattern. Retain every exact version and immutable
publication capsule, promote mutable paths only by copying verified capsule bytes
after exact verification, serialize writers, and support explicit rollback to a
previously retained capsule.

## Exclusive Ownership

This leaf is the only TASK-548 writer for:

- `.github/workflows/release.yml`;
- new
  `core/services/documentation/release/docsPostDeployHealthReceipt.ts`;
- new
  `core/services/documentation/release/docsRetainedPagesValidationHandoff.ts`;
- new `scripts/docs/stage-pages-publication.ts`;
- new `tests/unit/documentation/docsPagesPublication.test.ts`;
- new `tests/unit/release/docsReleaseWorkflowContract.test.ts`.

It must not edit root `package.json`, `bun.lock`, `Dockerfile`,
`core/package.json`, `.github/workflows/coderso-pr-gates.yml`, L01 artifact
modules, portal source, or Guide content. Every newly referenced action is
pinned to a full commit SHA with an audited version comment.

Before L02 dispatch, the TASK-548-02-L03-owned contract must already have
landed: `Dockerfile` copies both
`packages/docs-renderer/package.json` and
`packages/docs-portal/package.json` before `bun install --frozen-lockfile`, and
`core/package.json` declares `"@coderso/docs-renderer": "workspace:*"` whenever
the L01/L02 core release modules import that package. L02 only validates the
exact copy-before-install order, frozen install, workspace dependency, Docker
build, and runtime import. A missing contract blocks L02 and returns to
TASK-548-02-L03; L02 never patches or claims either owner file.

## Release Workflow Contract

1. Run only after semantic-release reports `released == "true"`; use its exact
   `version` and `git_tag`.
2. Create the existing repository GitHub App token, checkout the generated tag
   with full history, and assert `HEAD == tag target` and
   `git_tag == version` as byte-identical plain SemVer. A `v` prefix or any
   normalized-but-not-identical value fails.
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
   Validate the portal, then build and independently verify L01's
   content-addressed tar plus strict sibling `DocsReleaseArtifactReceiptV1`.
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
   before Pages staging. Thus failure after the first upload is recoverable:
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
   `docs-portal-manifest.json`, `latest/**`, `routing/{redirects,headers}.json`,
   `global/{sitemap.xml,robots.txt,site-index.json}`, and
   `receipts/{search.json,assets.json}`. If any exact path exists, require
   byte/hash identity. Push this exact-only commit first with a lease check.
7. Re-fetch and verify both retained manifests, exact paths, capsule, L01
   receipts, and the current single-release site-index candidate. Strictly
   merge that candidate with the verified retained cumulative
   `/global/site-index.json`, then copy capsule `latest/**` to `/latest/**`,
   routing files to `/deployment/`, sitemap/robots candidates to root, and the
   canonical cumulative index bytes to both `/global/site-index.json` and
   `/site-index.json`; push a second commit. Never invoke a portal builder,
   route resolver, old-page renderer, or candidate generator. The only allowed
   serialization is L02's strict cumulative-index serializer defined below.
8. Upload the complete retained static tree to GitHub Pages and deploy through
   the protected `github-pages` environment. No deploy uses an unverified local
   candidate.

Use one repository-scoped concurrency group with `cancel-in-progress: false`.
Job permissions are explicit: build is `contents: read`; release/branch writes
use scoped `contents: write`; Pages deployment alone gets `pages: write` and
`id-token: write`. All other permissions are `none`.

## Cumulative Site-Index Merge Contract

L02 is the sole owner of the retained merge and imports, without copying, the
04-L01 `DocsPortalSiteIndexV1`,
`normalizeDocsPortalSiteIndexV1()` and
`serializeDocsPortalSiteIndexV1()` contracts. It also strictly parses the
04-L02 `coderso.docs-site-index-candidate@v1` capsule member through
`normalizeDocsPortalSiteIndexCandidateV1()` and verifies
`serializeDocsPortalSiteIndexCandidateV1()` byte identity. Both recursively
reject unknown keys and enforce the upstream bounds and canonical ordering.

```ts
type DocsPortalSiteIndexMergeInputV1 =
  | {
      mode: "publish";
      retained: DocsPortalSiteIndexV1 | null;
      candidate: DocsPortalSiteIndexCandidateV1;
      portalManifestSha256: string;
      releaseManifestSha256: string;
      siteIndexCandidateSha256: string;
    }
  | {
      mode: "rollback";
      retained: DocsPortalSiteIndexV1;
      selectedVersion: string;
    };

mergeDocsPortalSiteIndexV1(
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
`releaseManifestSha256`, `siteIndexCandidateSha256`, and canonical base-free
routes. It preserves every retained version record byte-for-byte. An existing
same-version record is accepted only when the complete normalized record is
identical; any conflict is `docs_site_index_no_clobber` and no output is
written. New records join the list in descending SemVer order and
`latestVersion` becomes the verified current version.

For rollback, no candidate is added: the exact selected version must already
exist and its three hashes/routes must agree with the selected retained
capsule, manifests, and L01 search/assets receipts. The merge changes only
`latestVersion`; it never removes, rewrites, reorders, or regenerates a retained
version record or old portal page. Both modes canonical-serialize once, compute
`sha256` over those exact bytes (the hash is an audit result, not a self-field),
write the same bytes to `/global/site-index.json` and `/site-index.json`, reread
and hash both, then lease-push. The portal selector fetches the latter
same-origin cumulative file; a capsule's `global/site-index.json` always
remains its immutable single-release candidate.

## Rollback Contract

The exact recursive reject-unknown dispatch payload is:

```ts
type RollbackInputV1 = {
  docs_rollback_version: string;
  docs_rollback_confirmation: string;
};
```

Both keys are required strings with no defaults. `docs_rollback_version` is
bounded exact plain SemVer. `docs_rollback_confirmation` must byte-equal
`ROLLBACK ${docs_rollback_version}` after no trimming or case folding. Blank,
whitespace-only, missing, non-string, unknown/extra, `v`-prefixed, normalized-
only, mismatched-version or wrong-case input fails before token creation,
checkout, artifact download, worktree creation or branch mutation.

The `workflow_dispatch` YAML exposes exactly those two typed string inputs for
the rollback branch. A validated rollback skips semantic-release and Docker,
fetches the retained branch, verifies the selected exact version, capsule and
all shared hashes and both L01 receipt schemas. It copies only retained
latest/routing/sitemap/robots candidate bytes, applies the strict retained-index
rollback merge above to change `latestVersion`, and writes the cumulative bytes
to both site-index destinations. It pushes with the same concurrency/lease
guard and deploys through the same environment.

Rollback never deletes, edits, reuploads, rebuilds `/v/<version>`, or regenerates
a candidate. It records selected version, actor, run, prior latest version, and
both immutable manifest digests in the commit/audit summary without logging
tokens. Invalid/missing/tampered versions fail before branch mutation.

## Retained-Pages Validation Handoff

L02 also owns one bounded, operational-only handoff used by TASK-548-07 scenario
6. It is not a tracked fixture, workflow artifact, closure sidecar, or canonical
evidence file. The L02 helper creates a uniquely scoped local bare repository
under the caller's validated task-owned temporary root, publishes two synthetic
plain-SemVer capsules through the real L02 functions, rolls latest back to the
older version, restores latest to the newer version, seals three read-only
snapshot roots, and returns this strict in-memory value:

```ts
type DocsRetainedPagesValidationVersionV1 = {
  slot: "rollback-target" | "published-latest";
  productVersion: string;
  exactParentCommitSha: string;
  exactCommitSha: string;
  publicationParentCommitSha: string;
  publicationCommitSha: string;
  capsuleSha256: string;
  publicationReceiptSha256: string;
};

type DocsRetainedPagesValidationSnapshotV1 = {
  state: "published" | "rolled-back" | "restored";
  parentCommitSha: string;
  commitSha: string;
  rootTreeSha256: string;
  immutableExactTreeSha256: string;
  siteIndexSha256: string;
  latestVersion: string;
  operationReceiptSha256: string;
};

type DocsRetainedPagesValidationOperationReceiptV1 = {
  schema: "coderso.docs-retained-pages-validation-operation@v1";
  operation: "publish" | "rollback" | "restore";
  productVersion: string;
  fromCommitSha: string;
  toCommitSha: string;
  fromLatestVersion: string | null;
  toLatestVersion: string;
  rootTreeSha256: string;
  immutableExactTreeSha256: string;
  siteIndexSha256: string;
};

type DocsRetainedPagesValidationHandoffV1 = {
  schema: "coderso.docs-retained-pages-validation-handoff@v1";
  runId: string;
  repositoryKind: "task-owned-local-bare";
  branchRef: string;
  baseCommitSha: string;
  versions: [
    DocsRetainedPagesValidationVersionV1 & { slot: "rollback-target" },
    DocsRetainedPagesValidationVersionV1 & { slot: "published-latest" },
  ];
  snapshots: {
    published: DocsRetainedPagesValidationSnapshotV1 & { state: "published" };
    rolledBack: DocsRetainedPagesValidationSnapshotV1 & {
      state: "rolled-back";
    };
    restored: DocsRetainedPagesValidationSnapshotV1 & { state: "restored" };
  };
};

export type DocsRetainedPagesValidationSessionV1 = {
  handoff: DocsRetainedPagesValidationHandoffV1;
  receiptBytes: {
    rollbackTargetPublication: Uint8Array;
    publishedLatestPublication: Uint8Array;
    rollback: Uint8Array;
    restore: Uint8Array;
  };
  snapshotRoots: {
    published: string;
    rolledBack: string;
    restored: string;
  };
  dispose(): Promise<void>;
};

export type DocsRetainedPagesValidationInputV1 = {
  runId: string;
  taskOwnedTempRoot: string;
  fixture: "coderso-retained-pages-minimal-v1";
};

export type VerifiedDocsRetainedPagesValidationSessionV1 = {
  session: DocsRetainedPagesValidationSessionV1;
  handoff: DocsRetainedPagesValidationHandoffV1;
  handoffSha256: string;
  verified: true;
};

export type DocsRetainedPagesValidationSessionExpectedV1 =
  | {
      phase: "pre-mount";
      runId: string;
      taskOwnedTempRoot: string;
    }
  | {
      phase: "post-use";
      runId: string;
      taskOwnedTempRoot: string;
      handoffSha256: string;
    };

export function normalizeDocsRetainedPagesValidationSessionExpectedV1(
  value: unknown
): DocsRetainedPagesValidationSessionExpectedV1;

export function verifyDocsRetainedPagesValidationSessionV1(
  session: DocsRetainedPagesValidationSessionV1,
  expected: DocsRetainedPagesValidationSessionExpectedV1
): Promise<VerifiedDocsRetainedPagesValidationSessionV1>;
```

`normalizeDocsRetainedPagesValidationHandoffV1()` recursively rejects unknown
keys and bounds every string, path, count and byte source. Both versions are
distinct, ascending plain SemVer values and the two tuple slots occur exactly
once. All commit IDs are lowercase 40-hex and all content/receipt hashes are
lowercase SHA-256. `branchRef` must byte-equal
`refs/heads/task-548-retained-pages-validation/<runId>` with a bounded safe
`runId`; the resolved bare repository and every checkout must remain beneath
the caller's task-owned temporary root, contain no symlink, and use no network,
credential or real Pages ref.

There is no hidden artifact input. For the exact fixture discriminator above,
L02 constructs two task-local `VerifiedDocsReleaseArtifact` values internally.
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
- both retained manifests at
  `/release-metadata/<version>/publication-capsule/`;
- both L01-owned search/assets publication receipts and the selected locale's
  search-index status, byte count, and hash, bound to both its search receipt
  record and detached portal-manifest file record;
- one content-addressed visual against its receipt/hash and exact
  `(docId, locale, sectionId)` ownership; and
- no cross-origin redirect, credentialed request, cookie, write, or analytics
  call.

Exhaustion fails the release and emits bounded paths/status/hashes only. It never
changes an exact tree or bypasses environment protection; retry or rollback uses
the same immutable capsule.

L02 owns this exact recursively reject-unknown evidence contract:

```ts
type DocsPostDeployAttemptResultV1 = {
  attempt: number;
  target:
    | "exact"
    | "latest"
    | "site-index"
    | "release-manifest"
    | "portal-manifest"
    | "search-receipt"
    | "assets-receipt"
    | "search-index"
    | "asset";
  path: string;
  httpStatus: number;
  bytes: number;
  bodySha256: string;
  passed: true;
};

type DocsPostDeployRouteFactV1 = {
  path: string;
  httpStatus: 200;
  bodySha256: string;
  canonicalHref: string;
  canonicalMatches: true;
  productVersion: string;
  versionMatches: true;
  noindex: boolean;
};

type DocsPostDeployHealthReceiptV1 = {
  schema: "coderso.docs-post-deploy-health@v1";
  productVersion: string;
  gitTag: string;
  gitSha: string;
  workflowRunId: string;
  workflowRunAttempt: number;
  deploymentId: string;
  publicOrigin: string;
  publicBasePath: string;
  attemptLimit: 5;
  results: DocsPostDeployAttemptResultV1[];
  selectedRoute: {
    docId: string;
    locale: string;
    slug: string;
    exactPath: string;
    latestPath: string;
  };
  exact: DocsPostDeployRouteFactV1 & { noindex: false };
  latest: DocsPostDeployRouteFactV1 & { noindex: true };
  releaseManifestSha256: string;
  portalManifestSha256: string;
  siteIndexSha256: string;
  searchReceiptSha256: string;
  assetsReceiptSha256: string;
  search: {
    locale: string;
    path: string;
    httpStatus: 200;
    bytes: number;
    sha256: string;
  };
  asset: {
    visualId: string;
    docId: string;
    locale: string;
    sectionId: string;
    path: string;
    httpStatus: 200;
    bytes: number;
    sha256: string;
  };
  checkedAt: string;
  status: "pass";
};
```

The normalizer binds `productVersion`, `gitTag`, `gitSha`, workflow run/attempt,
deployment ID, origin/base path, both manifest hashes, cumulative-index hash,
both L01 receipt hashes, selected route, selected search-index fact, and
localized visual asset to the successful release inputs and retained capsule.
Before network selection, L02 parses the receipts only with
`normalizeDocsSearchPublicationReceiptV1()` and
`normalizeDocsAssetsPublicationReceiptV1()`. It deterministically selects a
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
selected search receipt and portal-manifest record rejects. Exact must be
indexable and latest must be `noindex`; both expose the expected versioned
canonical URL and version fact. Hashes are lowercase SHA-256, locales and paths
are canonical, paths are normalized confined public paths, counts/bytes are
bounded, and `checkedAt` is bounded canonical ISO-8601. `gitTag` must byte-equal
the same plain `productVersion`; `v`-prefixed or divergent health identity
rejects.

Only after every assertion passes, atomically write:

```text
.tmp/docs-release/post-deploy/docs-post-deploy-health-v1.json
```

The L02 owner module exports exact constants for that staging path, root member
`docs-post-deploy-health-v1.json`, and retention `90`. It derives the exact
artifact name
`docs-post-deploy-health-<productVersion>-<gitSha>-<workflowRunId>` only from
the validated health identity. The only write/upload helper signature is:

```ts
writeAndUploadDocsPostDeployHealthReceiptV1(
  health: DocsPostDeployHealthReceiptV1
): Promise<void>;
```

The uploaded workflow artifact contains exactly one root regular-file member
named `docs-post-deploy-health-v1.json`: no directory entry, nested path,
duplicate, extra member, symlink, device, or alternate filename is permitted.
The local `.tmp` hierarchy is staging only and is not reproduced inside the
artifact. Upload retention is exactly 90 days from the same successful
release/deployment run. A missing check, exhausted retry, malformed response,
deployment failure, wrong identity/hash, partial write, or unexpected upload
inventory never creates or uploads a receipt with `status: "pass"`. Failure
diagnostics are separate bounded non-pass output.

## Security Contract

- **Endpoint visibility:** public read-only static files; no API or write route.
- **Auth/RBAC:** release mutation is GitHub workflow-only with App token and
  protected Pages environment; readers require no account.
- **CSRF/rate limit:** not applicable. Branch protection, environment approval,
  concurrency, and lease checks guard release writes.
- **Validation:** strict dispatch inputs; tag/SHA/SemVer/base URL/artifact hash
  closure; confined branch paths; reject-unknown retained manifests, cumulative
  site index, single-release candidate, both L01 publication receipts, and the
  post-deploy receipt including exact selected-search and `search-index` result
  closure.
- **Anti-abuse:** no public write, nonce/HMAC/CAPTCHA. Bound downloads, retained
  manifests, file bytes/counts, retries, and workflow timeout.
- **Secrets/privacy:** use GitHub secret contexts only in credentialed steps,
  disable credential persistence where feasible, mask tokens, and upload no
  cookies, `.env`, logs with headers, traces, or source maps.

## Implementation Pseudocode

```ts
export async function reconcileDocsReleaseAssetsNoClobberV1(input: {
  release: GitHubReleaseAssetClient;
  archivePath: string;
  receiptPath: string;
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

export async function stagePagesPublication(input: PagesPublicationInput) {
  const retained = await openRetainedTreeAtObservedSha(input.branchRoot);
  const artifact = await verifyDocsReleaseArtifact({
    archivePath: input.archivePath,
    receiptPath: input.receiptPath,
  });
  const exact = stageExactVersionAndCapsuleNoOverwrite(retained, artifact);
  await atomicCommitAndPush(exact, { expectedRemoteSha: input.remoteSha });
  const verified = await refetchAndVerifyExactCapsule(artifact.manifest);
  const cumulative = mergeDocsPortalSiteIndexV1({
    mode: "publish",
    retained: await readVerifiedRetainedCumulativeIndex(verified),
    candidate: verified.siteIndexCandidate,
    portalManifestSha256: verified.portalManifestSha256,
    releaseManifestSha256: verified.releaseManifestSha256,
    siteIndexCandidateSha256: verified.siteIndexCandidateSha256,
  });
  const mutable = copyVerifiedMutableCandidates(verified.capsule, {
    cumulativeSiteIndexBytes: cumulative.bytes,
  });
  return atomicCommitAndPush(mutable, { expectedRemoteSha: verified.remoteSha });
}

export async function stageDocsRollback(input: RollbackInputV1) {
  const rollback = normalizeRollbackInputV1(input);
  const capsule = await verifyRetainedPublicationCapsule(
    rollback.docs_rollback_version
  );
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
  runId: validationRunId,
  taskOwnedTempRoot,
  fixture: "coderso-retained-pages-minimal-v1",
});
try {
  const verified = await verifyDocsRetainedPagesValidationSessionV1(
    retainedPagesValidation,
    {
      phase: "pre-mount",
      runId: validationRunId,
      taskOwnedTempRoot,
    }
  );
  try {
    await consumeVerifiedRetainedPagesSessionReadOnly(verified);
  } finally {
    await verifyDocsRetainedPagesValidationSessionV1(
      retainedPagesValidation,
      {
        phase: "post-use",
        runId: validationRunId,
        taskOwnedTempRoot,
        handoffSha256: verified.handoffSha256,
      }
    );
  }
} finally {
  await retainedPagesValidation.dispose();
}

const retainedHealthInput = await loadVerifiedRetainedPublicationForHealth({
  deploymentUrl,
  version,
});
const selected = selectDeterministicDocsPostDeployTupleV1({
  index: retainedHealthInput.cumulativeIndex,
  portal: retainedHealthInput.portalManifest,
  searchReceipt: normalizeDocsSearchPublicationReceiptV1(
    retainedHealthInput.searchReceipt
  ),
  assetsReceipt: normalizeDocsAssetsPublicationReceiptV1(
    retainedHealthInput.assetsReceipt
  ),
});
assertSelectedSearchJoinsRouteReceiptAndPortalManifestV1(selected);
const health = await verifyPublishedDocsReadOnly({
  deploymentUrl,
  version,
  gitTag,
  gitSha,
  workflowRunId,
  workflowRunAttempt,
  deploymentId,
  selected,
  requiredSearchTarget: "search-index",
  maxAttempts: 5,
});
await writeAndUploadDocsPostDeployHealthReceiptV1(health);
```

**Data flow:** semantic metadata/dispatch → pinned checkout or retained branch →
artifact verification → exact two-asset release no-clobber → exact/capsule
branch commit/re-read → strict cumulative site-index merge plus retained
candidate byte-copy commit → protected Pages deploy → receipt-backed bounded
same-origin availability verification → audit summary. The separately invoked
validation helper drives the same publish/rollback functions only against one
scoped local bare repository, seals an in-memory publish/rollback/restore
handoff, and always disposes it.

**Error handling:** plain-tag/version/target/HEAD drift, origin failure,
artifact-receipt conflict, invalid rollback key/type/confirmation, remote branch
race, exact/capsule path mismatch, retained-manifest/receipt/hash failure,
malformed or conflicting cumulative index, localized visual-owner mismatch,
attempted candidate regeneration, Pages deployment or post-deploy health
failure is blocking. Always remove only owned worktrees and revoke/expire step
credentials; never retry via force or clobber.

## Regression Tests

- workflow contract pins every action, keeps current Docker release conditions,
  validates the TASK-548-02-L03-owned manifest-copy-before-frozen-install and
  core renderer dependency without writing either owner file, and asserts exact
  job permissions/environment/concurrency plus plain `git_tag == version`,
  tag-target/checkout-HEAD checks and all four release build-environment
  mappings including target-commit epoch; a clean-tag fixture with the tracked
  bundle and no `.tmp` tree/report passes `docs:check`, while transaction debris,
  report-only state, stale source equality, or a tampered bundle blocks without
  mutation; Docker-repeat fixtures require task-scoped `mktemp`, `--iidfile`,
  strict image-ID validation and exact EXIT cleanup, and reject a fixed tag,
  foreign image ID, broad temp path, or second-run collision;
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
- latest is never copied before a re-read of the remote exact tree and full
  capsule; no publication/rollback path imports a portal builder;
- cumulative-index fixtures pin the exact imported reject-unknown normalizer,
  discriminator/key sets, descending SemVer and route order, first-release
  absence rule, canonical serialization/hash, two-version merge, idempotent
  equality, same-version no-clobber conflict, root/global byte parity, retained
  record preservation, branch race, and no old-page rebuild;
- two retained versions coexist byte-identically; sitemap and redirects contain
  only verified routes; rollback changes only `latestVersion` plus approved
  mutable copies, preserves all index entries, rejects absent/tampered capsules,
  records audit identity, and does not run semantic-release/Docker;
- retained-Pages validation-session fixtures require the exact discriminator,
  no hidden input, fixed two-version/route/search/visual fixture, fixed Git
  identity/time, two ordered version slots, safe task-owned ref/root, complete
  first-parent chain, observed commit/tree/ref equality, canonical
  publication/rollback/restore receipt hashes, the three exact domain-separated
  tree streams/path sets, unchanged immutable trees, rollback-only mutable
  differences, and published/restored byte identity. The exact owner verifier
  runs its full verification before mount and after use; pre-mount forbids a
  handoff hash, while post-use requires the exact prior `handoffSha256`.
  Missing or wrong phase/hash, duplicate, reordered, unknown,
  wrong-ref, wrong-parent/commit/tree/hash/version/receipt/domain/path/mode/
  length, symlink, network, real-Pages-ref, escaped-root or cleanup drift
  rejects;
- producer-consumer fixtures import L01's exact search/assets receipt
  normalizers and canonical bytes. Current, retained, rollback, and post-deploy
  selection reject unknown/unsorted/duplicate/tampered receipt records,
  projection-hash drift, locale/owner/section/path/hash drift, or a reused
  bundle-global `visualId`; selected-search fixtures require the route locale,
  exact `search/<productVersion>/<locale>.json` record, and matching detached
  portal-manifest path/bytes/hash without filename inference or fallback;
- workflow-dispatch fixtures accept the exact two-key string payload plus
  `ROLLBACK <same-plain-version>` and reject missing/extra/non-string/blank/
  whitespace, `v` prefix, case drift, normalized-only value, mismatched version
  and confirmation before any privileged side effect;
- availability covers success, transient recovery, five-attempt exhaustion,
  hash/canonical/version mismatch, cross-origin redirect, oversized response,
  and exactly one successful `search-index` fetch bound byte-for-byte to the
  selected search record and portal-manifest record;
- post-deploy receipt tests cover strict recursive unknown-key rejection,
  exact workflow/deployment/release identity including plain
  `gitTag === productVersion`, rejection of `v` prefix, both manifest hashes,
  cumulative index and receipt hashes, exact indexability, latest noindex,
  the exact `search` field and complete target-literal inventory including
  `search-index`, incomplete or duplicate target results, and missing/duplicate/
  wrong-locale/path/status/bytes/hash selected-search facts or result joins;
  wrong route status/body/canonical/version or localized visual ownership facts,
  atomic cleanup, exact artifact naming and 90-day retention; the uploaded
  artifact inventory rejects missing, duplicate, nested, extra, directory,
  symlink, device, or renamed members; failure can never emit a pass receipt;
- cleanup cannot remove the repository/shared root or another worktree.

## Sub-Tasks

- [ ] Extend the release workflow and validate, without editing, the
  TASK-548-02-L03-owned Docker/core workspace contract.
- [ ] Add exact two-asset release upload, no-clobber exact/capsule staging, and
  retained-byte-copy promotion.
- [ ] Add strict cumulative site-index publish/rollback merge and hash gates.
- [ ] Add protected Pages deployment, bounded health check and capsule rollback.
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
  --eval 'await import("@coderso/docs-renderer")'
bun --cwd core lint:types
bun --cwd core lint
bun run precommit:check
wc -l .github/workflows/release.yml \
  scripts/docs/stage-pages-publication.ts \
  core/services/documentation/release/docsPostDeployHealthReceipt.ts \
  core/services/documentation/release/docsRetainedPagesValidationHandoff.ts \
  tests/unit/documentation/docsPagesPublication.test.ts \
  tests/unit/release/docsReleaseWorkflowContract.test.ts
git diff --check
```

Exercise publication, rollback, restore and the exact operational validation
handoff against a disposable local bare remote plus a dry-run workflow fixture;
never mutate the real Pages branch during tests. The
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
