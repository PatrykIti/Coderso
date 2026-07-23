# TASK-548-05-L02: Tag-Pinned Publication, Latest Alias and Rollback
# FileName: TASK-548-05-L02-Tag-Pinned-Publication-Latest-Alias-And-Rollback.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-05
**Priority:** High
**Category:** Release Automation / GitHub Pages / Rollback
**Estimated Effort:** Large
**Dependencies:** TASK-548-05-L01
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Extend the existing semantic-release workflow with a tag-pinned documentation
artifact and safe GitHub Pages publication. Preserve current Docker behavior and
its GitHub App/tag/SHA pattern. Retain every exact version and immutable
publication capsule, promote mutable paths only by copying verified capsule bytes
after exact verification, serialize writers, and support explicit rollback to a
previously retained capsule.

## Exclusive Ownership

This leaf is the only TASK-548 writer for:

- `.github/workflows/release.yml`;
- new
  `core/services/documentation/release/docsPostDeployHealthReceipt.ts`;
- new `scripts/docs/stage-pages-publication.ts`;
- new `tests/unit/documentation/docsPagesPublication.test.ts`;
- new `tests/unit/release/docsReleaseWorkflowContract.test.ts`.

It must not edit root `package.json`, `bun.lock`,
`.github/workflows/coderso-pr-gates.yml`, L01 artifact modules, portal source, or
Guide content. Every newly referenced action is pinned to a full commit SHA with
an audited version comment.

## Release Workflow Contract

1. Run only after semantic-release reports `released == "true"`; use its exact
   `version` and `git_tag`.
2. Create the existing repository GitHub App token, checkout the generated tag
   with full history, and assert `HEAD == tag target` and
   `git_tag == version` as byte-identical plain SemVer. A `v` prefix or any
   normalized-but-not-identical value fails.
3. Install with the frozen lockfile, validate `DOCS_PUBLIC_ORIGIN` and
   `DOCS_PUBLIC_BASE_PATH`, run `bun run docs:compile` to recover/promote the
   exact bundle/report pair, build/validate the portal, then build and
   independently verify L01's content-addressed tar plus strict sibling
   `DocsReleaseArtifactReceiptV1`.
4. Upload manifest/archive/receipt to the matching GitHub Release without
   `--clobber`. An existing asset is an idempotent success only after download
   and full byte/schema/digest equality; a same-name or same-version conflict
   fails.
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
7. Re-fetch and verify both retained manifests, exact paths, capsule and receipts.
   Only then copy capsule `latest/**` to `/latest/**`, routing files to
   `/deployment/`, and global candidates to root
   `/{sitemap.xml,robots.txt,site-index.json}`; push a second commit. Never invoke
   a portal builder, route resolver, serializer, or candidate generator.
8. Upload the complete retained static tree to GitHub Pages and deploy through
   the protected `github-pages` environment. No deploy uses an unverified local
   candidate.

Use one repository-scoped concurrency group with `cancel-in-progress: false`.
Job permissions are explicit: build is `contents: read`; release/branch writes
use scoped `contents: write`; Pages deployment alone gets `pages: write` and
`id-token: write`. All other permissions are `none`.

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
all shared hashes, then copies only its retained latest/routing/global candidate
bytes to mutable destinations. It pushes with the same concurrency/lease guard
and deploys through the same environment.

Rollback never deletes, edits, reuploads, rebuilds `/v/<version>`, or regenerates
a candidate. It records selected version, actor, run, prior latest version, and
both immutable manifest digests in the commit/audit summary without logging
tokens. Invalid/missing/tampered versions fail before branch mutation.

## Post-Deploy Availability Contract

After `deploy-pages` returns its same-origin deployment URL, make at most five
read-only attempts with capped response bytes and per-attempt timeout/backoff.
Using one route selected from the retained portal manifest, verify:

- exact article status/body hash and versioned canonical URL;
- matching latest article status plus canonical/noindex/version behavior;
- both retained manifests at
  `/release-metadata/<version>/publication-capsule/`;
- one content-addressed asset against its receipt/hash; and
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
    | "release-manifest"
    | "portal-manifest"
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
  asset: {
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
deployment ID, origin/base path, both manifest hashes, selected route and asset
to the successful release inputs and retained capsule. `results` contains only
bounded same-origin reads, uses attempts `1..5`, and closes every required
target. Exact must be indexable and latest must be `noindex`; both must expose
the expected versioned canonical URL and version fact. Hashes are lowercase
SHA-256, paths are normalized confined public paths, counts/bytes are bounded,
and `checkedAt` is bounded canonical ISO-8601. `gitTag` must byte-equal the same
plain `productVersion`; `v`-prefixed or divergent health identity rejects.

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
  closure; confined branch paths; reject-unknown retained manifests.
- **Anti-abuse:** no public write, nonce/HMAC/CAPTCHA. Bound downloads, retained
  manifests, file bytes/counts, retries, and workflow timeout.
- **Secrets/privacy:** use GitHub secret contexts only in credentialed steps,
  disable credential persistence where feasible, mask tokens, and upload no
  cookies, `.env`, logs with headers, traces, or source maps.

## Implementation Pseudocode

```ts
export async function stagePagesPublication(input: PagesPublicationInput) {
  const retained = await openRetainedTreeAtObservedSha(input.branchRoot);
  const artifact = await verifyDocsReleaseArtifact({
    archivePath: input.archivePath,
    receiptPath: input.receiptPath,
  });
  const exact = stageExactVersionAndCapsuleNoOverwrite(retained, artifact);
  await atomicCommitAndPush(exact, { expectedRemoteSha: input.remoteSha });
  const verified = await refetchAndVerifyExactCapsule(artifact.manifest);
  const mutable = copyRetainedCapsuleCandidates(verified.capsule);
  return atomicCommitAndPush(mutable, { expectedRemoteSha: verified.remoteSha });
}

export async function stageDocsRollback(input: RollbackInputV1) {
  const rollback = normalizeRollbackInputV1(input);
  const capsule = await verifyRetainedPublicationCapsule(
    rollback.docs_rollback_version
  );
  return commitCopiedMutableCandidatesOnly(capsule);
}

const health = await verifyPublishedDocsReadOnly({
  deploymentUrl,
  version,
  gitTag,
  gitSha,
  workflowRunId,
  workflowRunAttempt,
  deploymentId,
  maxAttempts: 5,
});
await writeAndUploadDocsPostDeployHealthReceiptV1(health);
```

**Data flow:** semantic metadata/dispatch → pinned checkout or retained branch →
artifact verification → release asset no-clobber → exact/capsule branch
commit/re-read → retained-candidate byte-copy commit → protected Pages deploy →
bounded same-origin availability verification → audit summary.

**Error handling:** plain-tag/version/target/HEAD drift, origin failure,
artifact-receipt conflict, invalid rollback key/type/confirmation, remote branch
race, exact/capsule path mismatch, retained-manifest/hash failure, attempted
candidate regeneration, Pages deployment or post-deploy health failure is
blocking. Always remove only owned worktrees and revoke/expire step credentials;
never retry via force or clobber.

## Regression Tests

- workflow contract pins every action, keeps current Docker release conditions,
  and asserts exact job permissions/environment/concurrency plus plain
  `git_tag == version`, tag-target and checkout-HEAD checks;
- first publish, identical retry, different-byte conflict, branch race, partial
  exact push, malformed/tampered/missing artifact receipt, and failed alias
  stage preserve invariants;
- latest is never copied before a re-read of the remote exact tree and full
  capsule; no publication/rollback path imports a portal builder;
- two retained versions coexist byte-identically; sitemap and redirects are
  deterministic and contain only verified routes;
- rollback copies mutable paths only, rejects absent/tampered capsules, records
  audit identity, and does not run semantic-release/Docker;
- workflow-dispatch fixtures accept the exact two-key string payload plus
  `ROLLBACK <same-plain-version>` and reject missing/extra/non-string/blank/
  whitespace, `v` prefix, case drift, normalized-only value, mismatched version
  and confirmation before any privileged side effect;
- availability covers success, transient recovery, five-attempt exhaustion,
  hash/canonical/version mismatch, cross-origin redirect and oversized response;
- post-deploy receipt tests cover strict recursive unknown-key rejection,
  exact workflow/deployment/release identity including plain
  `gitTag === productVersion`, rejection of `v` prefix, both manifest hashes, exact
  indexability, latest noindex, incomplete target results, wrong status/body/
  canonical/version/asset facts, atomic cleanup, exact artifact naming and
  90-day retention; the uploaded artifact inventory rejects missing, duplicate,
  nested, extra, directory, symlink, device, or renamed members; failure can
  never emit a pass receipt;
- cleanup cannot remove the repository/shared root or another worktree.

## Sub-Tasks

- [ ] Extend the release workflow without changing current Docker semantics.
- [ ] Add no-clobber exact/capsule staging and retained-byte-copy promotion.
- [ ] Add protected Pages deployment, bounded health check and capsule rollback.
- [ ] Add workflow/publication race, integrity, permission, and cleanup tests.

## Testing Requirements

```bash
bun test tests/unit/documentation/docsPagesPublication.test.ts \
  tests/unit/release/docsReleaseWorkflowContract.test.ts
bun scripts/docs/stage-pages-publication.ts --help
bun --cwd core lint:types
bun --cwd core lint
bun run precommit:check
wc -l scripts/docs/stage-pages-publication.ts \
  core/services/documentation/release/docsPostDeployHealthReceipt.ts \
  tests/unit/documentation/docsPagesPublication.test.ts \
  tests/unit/release/docsReleaseWorkflowContract.test.ts
git diff --check
```

Exercise publication and rollback against a disposable local bare remote plus a
dry-run workflow fixture; never mutate the real Pages branch during tests.

## Documentation Updates Required

Send the capsule publication/rollback and post-deploy health runbook, exact
receipt schema/path/artifact name and retention, repository variables,
branch/environment protection settings, and recovery procedure to TASK-548-07.
