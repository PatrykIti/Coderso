# TASK-548-05: Versioned Distribution and Release Publishing
# FileName: TASK-548-05-Versioned-Distribution-And-Release-Publishing.md

**Parent Task:** TASK-548
**Priority:** High
**Category:** Documentation Platform / Release / Distribution
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-04, TASK-545
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Package the validated static portal as an immutable, content-addressed SemVer
artifact and publication capsule, then publish it from the existing
semantic-release handoff. Exact versions remain permanently addressable, while
`latest` is a mutable byte-copy promoted only after the exact-version artifact
and retained Pages tree verify.

The public result is static read-only content. The CMS continues to consume its
local bundle and never queries this release channel per question. This task does
not create a documentation API, remote hot-update path, analytics beacon, or
public write surface.

## Locked Release Contract

- Input is the validated `packages/docs-portal/dist` artifact from TASK-548-04,
  including `docs-portal-manifest.json`; release code never rebuilds its route
  graph or rewrites article bytes.
- `docs-portal-manifest.json` is the sole file excluded from its own sorted
  `files[]`; every other `dist` byte is enumerated. The external release manifest
  hashes/binds the detached portal manifest and rejects any other exclusion.
- Identity is exact product SemVer plus a SHA-256 payload-root digest. The
  deterministic archive name includes both and is never reused for other bytes.
- The release manifest records `gitTag`, tag-resolved `gitSha`, public HTTPS
  origin, normalized base path, source/portal manifest hashes, bounded file
  records, payload-root hash, and schema discriminator.
- The repository's release tag is plain SemVer: `gitTag === productVersion`
  byte-for-byte (for example `1.2.3`, never `v1.2.3`). The tag must still
  resolve to `gitSha`, and the tag-pinned checkout `HEAD` must equal that SHA.
- L01 writes one strict canonical sibling
  `DocsReleaseArtifactReceiptV1` after reopening and verifying the final tar.
  The receipt binds release identity, portal/release manifest hashes, payload
  root, archive filename/path/bytes/hash and its own canonical sibling
  filename/path without hashing or inventorying itself.
- `DOCS_PUBLIC_ORIGIN` is HTTPS with no credentials, query, or fragment.
  `DOCS_PUBLIC_BASE_PATH` is one normalized confined URL prefix. Missing or
  invalid values stop publication.
- The workflow follows the existing release pattern: semantic-release exports
  the same plain SemVer as version/tag; a fresh checkout resolves that tag;
  `HEAD`, tag SHA, SemVer, artifact manifest and artifact receipt must agree
  before any upload.
- An existing exact-version directory or release asset passes only when its
  manifest and every hash are identical. Different bytes fail; no clobber,
  force-push, delete, or overwrite fallback exists.
- A dedicated retained Pages branch preserves prior `/v/<version>`,
  `/search/<version>`, content-addressed assets, and this exact immutable subtree:

```text
/release-metadata/<version>/publication-capsule/
  docs-release-manifest-v1.json
  docs-portal-manifest.json
  latest/**
  routing/redirects.json
  routing/headers.json
  global/sitemap.xml
  global/robots.txt
  global/site-index.json
  receipts/search.json
  receipts/assets.json
```

- L01 is the sole capsule producer. `latest/**` and global/routing candidates
  are prebuilt bytes from TASK-548-04; receipts are canonical projections of its
  verified manifest records. L02 only verifies and copies capsule bytes.
- The exact tree plus full capsule is pushed and re-read before a second commit
  copies mutable destinations. Rollback selects a retained capsule and never
  invokes portal rendering, route construction, or candidate regeneration.
- Workflow concurrency is serialized per repository with cancellation disabled.
  Rollback repoints `latest` to a verified retained version and never mutates or
  deletes an exact version.
- L02 writes a strict successful
  `DocsPostDeployHealthReceiptV1` to
  `.tmp/docs-release/post-deploy/docs-post-deploy-health-v1.json` and uploads it
  as the 90-day workflow artifact
  `docs-post-deploy-health-<version>-<gitSha>-<workflowRunId>`. TASK-548-07
  downloads that exact successful release/deployment-run artifact read-only. Its
  archive inventory must contain exactly one root regular member
  `docs-post-deploy-health-v1.json`, with no nested/extra/duplicate/symlink
  member. Closure rejects missing, failed, stale, wrong-identity, malformed,
  hash-drifted, or oversized evidence and never republishes production.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-548-05-L01 | Release artifact schema, deterministic archive builder, manifest, content hashing, and local verification tests | ⏳ To Do |
| TASK-548-05-L02 | `.github/workflows/release.yml`, retained Pages staging/publishing, no-overwrite/latest ordering, and rollback tests | ⏳ To Do |

**Land order:** `TASK-548-05-L01 → TASK-548-05-L02`.

TASK-548-02-L03 remains the sole writer of root `package.json`, `bun.lock`, and
`.github/workflows/coderso-pr-gates.yml`. L02 is the sole TASK-548 writer of
`.github/workflows/release.yml`. Neither leaf edits portal source or generated
Guide content.

## Security Contract

- **Endpoint visibility:** public static reads only; no application route or API
  is introduced.
- **Auth/RBAC:** none for readers. Release writes use the existing repository
  GitHub App token and Pages environment with the minimum job-scoped
  `contents`, `pages`, and `id-token` permissions.
- **CSRF/rate limit:** not applicable to static reads or CI-to-GitHub
  publication. CDN read controls remain hosting policy, not an app endpoint.
- **Validation:** strict reject-unknown manifests; confined paths; bounded file
  count/bytes; SemVer/tag/SHA/origin/base-path/hash closure; SHA-pinned actions.
- **Anti-abuse:** no public write, nonce/HMAC, or CAPTCHA. Release concurrency,
  environment protection, no-clobber semantics, and bounded artifact handling
  protect the privileged publication path.
- **Secrets/privacy:** tokens exist only in step environment; manifests/logs/
  artifacts exclude credentials, cookies, source maps, absolute paths, PII, and
  build-host metadata.

## Implementation Pseudocode

```ts
const release = await buildDocsReleaseArtifact({
  distRoot: "packages/docs-portal/dist",
  version: semanticRelease.version,
  gitTag: assertPlainSemVerTagEqualsVersion(
    semanticRelease.gitTag,
    semanticRelease.version
  ),
  gitSha: resolveTagSha(semanticRelease.gitTag),
  origin: process.env.DOCS_PUBLIC_ORIGIN,
  basePath: process.env.DOCS_PUBLIC_BASE_PATH,
});
const verified = await verifyDocsReleaseArtifact({
  archivePath: release.archiveRelativePath,
  receiptPath: release.receiptRelativePath,
});
await publishExactVersionAndCapsuleNoOverwrite(verified);
await verifyRetainedExactVersion(verified);
await copyCapsuleCandidatesAndDeployPages(verified.manifest.productVersion);
const health = await verifyPublishedDocsReadOnly({ maxAttempts: 5 });
await writeAndUploadDocsPostDeployHealthReceiptV1(health);
```

**Data flow:** tag-pinned checkout → deterministic portal validation → detached
portal-manifest binding → content-addressed archive + capsule → no-clobber
release asset → retained exact tree/capsule → byte-copy latest/global commit →
protected Pages deployment → bounded same-origin read-only health verification →
strict successful post-deploy receipt for read-only closure validation.

**Error handling:** a `v`-prefixed/different/blank tag, tag/SHA/HEAD drift,
invalid version/base URL, malformed artifact receipt, manifest/payload/archive
hash mismatch, nondeterministic archive, remote digest conflict, concurrent
branch movement, invalid rollback input, missing retained rollback version, or
deployment failure is blocking. A failure before latest promotion leaves the
prior alias intact. A failed post-deploy check fails the release and preserves
exact history for safe retry/rollback.

**Regression-test shape:** reproduce identical archive bytes under different
temporary roots; tamper every manifest boundary; test first/idempotent/conflict
publication; race the retained branch; prove exact/capsule-before-latest ordering;
rollback among two retained capsules; reject any regenerated candidate; assert
old exact bytes never change; pin canonical receipt bytes/CLI parity; accept a
plain SemVer tag and reject `v`-prefix/tag-target drift; exercise exact rollback
keys and version-bound confirmation positives/negatives; and keep workflow
permissions/actions/conditions pinned.

## Acceptance Criteria

- Every released docs artifact is reproducible, SemVer-bound, content-addressed,
  tag/SHA-pinned, hash-closed, and independently verifiable.
- Version and `gitTag` are the same plain SemVer, the tag target equals
  checkout HEAD, and the strict sibling artifact receipt independently closes
  the tar plus both manifest identities without self-reference.
- Release assets and exact public version directories cannot be overwritten with
  different bytes; identical retries are safe no-ops.
- Latest changes only after exact publication verifies; a failed attempt retains
  the previous alias.
- Rollback is explicit, auditable, capsule-copy-only, and never changes exact
  content.
- GitHub Pages publication uses a protected environment and retained branch
  without exposing credentials or expanding public behavior beyond static reads.
- Five-attempt bounded same-origin checks prove exact/latest canonical/version
  behavior, both retained manifests and one hashed asset after deployment, then
  produce the exact identity-bound 90-day `DocsPostDeployHealthReceiptV1`
  artifact consumed by TASK-548-07.

## Testing Requirements

- focused artifact and publication Bun/Vitest tests from both leaves
- two clean builds and byte/hash comparison
- workflow contract tests for tag/SHA, pinned actions, permissions, concurrency,
  environment, no-clobber, capsule layout, latest byte-copy ordering, rollback,
  post-deploy health, and cleanup
- `bun --cwd packages/docs-portal build`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run precommit:check`
- touched-file line counts and `git diff --check`

## Documentation Updates Required

Send artifact/capsule layout, detached-manifest verification, origin/base-path
configuration, Pages branch protection, post-deploy health, release retry,
rollback, and incident-recovery notes to TASK-548-07.
Only TASK-548-07 writes changelog 1261 and shared closeout documentation.
