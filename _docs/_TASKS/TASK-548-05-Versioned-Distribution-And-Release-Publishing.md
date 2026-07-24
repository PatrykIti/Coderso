# TASK-548-05: Versioned Distribution and Release Publishing
# FileName: TASK-548-05-Versioned-Distribution-And-Release-Publishing.md

**Parent Task:** TASK-548
**Priority:** High
**Category:** Documentation Platform / Release / Distribution
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-04 and TASK-548-02-L03; TASK-545 must be `✅ Done` and TASK-547 must be fully terminal before dispatch
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Package the validated static portal as an immutable, content-addressed SemVer
artifact and publication capsule, then publish it from the existing
semantic-release handoff. Exact versions remain permanently addressable, while
`latest` is a mutable byte-copy promoted only after the exact-version artifact
and retained documentation tree verify. GitHub Actions orchestrates release,
but production hosting is Cloudflare Pages so the verified root `_headers`
artifact is actually applied to responses.

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
  records, payload-root hash, and the exact runtime-tree binding computed once
  from canonical `git ls-tree -rz --full-tree HEAD` bytes.
- The repository's release tag is plain SemVer: `gitTag === productVersion`
  byte-for-byte (for example `1.2.3`, never `v1.2.3`). The tag must still
  resolve to `gitSha`, and the tag-pinned checkout `HEAD` must equal that SHA.
- L01 writes one strict canonical sibling
  `DocsReleaseArtifactReceiptV1` after reopening and verifying the final tar.
  The receipt binds release identity, portal/release manifest hashes, payload
  root, the identical runtime-tree object, archive filename/path/bytes/hash and its own canonical sibling
  filename/path without hashing or inventorying itself.
- `DOCS_PUBLIC_ORIGIN` is HTTPS with no credentials, query, or fragment.
  `DOCS_PUBLIC_BASE_PATH` is one normalized confined URL prefix. Missing or
  invalid values stop publication.
- Release portal configuration maps exactly
  `DOCS_PRODUCT_VERSION` from semantic-release's plain `version`,
  `DOCS_PUBLIC_ORIGIN` and `DOCS_PUBLIC_BASE_PATH` from their validated
  repository/environment configuration, and `SOURCE_DATE_EPOCH` from the
  tag-target commit's canonical Unix epoch. No release value comes from wall
  clock time, a default, a `v`-prefixed tag, or another variable.
- The workflow follows the existing release pattern: semantic-release exports
  the same plain SemVer as version/tag; a fresh checkout resolves that tag;
  `HEAD`, tag SHA, SemVer, artifact manifest and artifact receipt must agree
  before any upload.
- An existing exact-version directory or release asset passes only when its
  manifest and every hash are identical. Different bytes fail; no clobber,
  force-push, delete, or overwrite fallback exists.
- The matching GitHub Release contains exactly two documentation assets: the
  content-addressed tar and its strict sibling receipt. The release manifest is
  embedded in the tar, never uploaded as a third standalone asset; an
  idempotency check downloads both assets and re-verifies that embedded
  manifest before accepting equality.
- A dedicated retained `docs-pages` branch preserves prior `/v/<version>`,
  `/search/<version>`, content-addressed assets, and this exact immutable subtree:

```text
/release-metadata/<version>/publication-capsule/
  docs-release-manifest-v1.json
  docs-portal-manifest.json
  latest/**
  runtime/404.html
  runtime/_headers
  routing/redirects.json
  routing/headers.json
  routing/client-assets.json
  global/sitemap.xml
  global/robots.txt
  global/site-index.json
  receipts/search.json
  receipts/assets.json
```

- L01 is the sole capsule producer. `latest/**` and global/runtime/routing candidates
  are prebuilt bytes from TASK-548-04; L01 solely owns the strict
  `DocsSearchPublicationReceiptV1` and `DocsAssetsPublicationReceiptV1`
  schemas, normalizers, serializers, and canonical projections from the
  verified detached portal manifest. Visual receipt ownership is exact
  `(docId, locale, sectionId)` while `visualId` is bundle-global. L02 imports
  these contracts and never duplicates them.
- The runtime/routing copies bind portal `404.html`, `_headers`, and
  `deployment/client-assets.json` byte-for-byte. Their hashes join the immutable
  site-index candidate and every cumulative version record. Publish/rollback
  copies the selected `runtime/*` bytes to root and the client inventory to
  `/deployment/client-assets.json`; neither path regenerates policy or HTML.
- The exact tree plus full capsule is pushed and re-read before a second commit
  copies mutable destinations. L02 strictly merges the current immutable
  candidate with the verified retained cumulative `/global/site-index.json`,
  preserves every old version entry without rebuilding old portal pages, and
  writes byte-identical cumulative bytes to `/global/site-index.json` and
  `/site-index.json`. Rollback changes only its verified `latestVersion` plus
  the other mutable byte copies; it never removes an index version, invokes
  portal rendering/route construction, or regenerates a candidate.
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
- Release computes the L01-normalized `DocsReleaseTreeBindingV1` once in the
  clean exact-tag checkout. Manifest, artifact receipt, retained capsule,
  idempotent retry, rollback selection and post-deploy health carry that same
  object byte-for-byte; no downstream phase recomputes or substitutes it.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-548-05-L01 | Release artifact schema, deterministic archive builder, manifest, content hashing, and local verification tests | ⏳ To Do |
| TASK-548-05-L02 | `.github/workflows/release.yml`, retained-tree staging, Cloudflare Pages publishing, no-overwrite/latest ordering, and rollback tests | ⏳ To Do |

**Land order:** `TASK-548-05-L01 → TASK-548-05-L02`.

Public handoffs are single-owner and exact:

| Owning module | Imported surface |
|---|---|
| `@coderso/docs-portal/publication-contracts` (04-L02) | strict portal/client-assets/site-index-candidate/validation-receipt DTOs plus paired normalizers/serializers |
| `@coderso/docs-portal/site-index` (04-L01) | cumulative-index DTO, normalizer and serializer |
| `./docsReleaseSchemas` (05-L01 Core) | release/artifact/search/assets receipt DTOs, bounds, normalizers and serializers |
| `./docsReleaseTreeBinding` (05-L01 Core) | pure tree-binding DTO, caps, constructor/hash, normalizer and serializer |
| `./docsReleaseArtifact` (05-L01 Core) | publication-receipt builder plus artifact build/verifier functions |
| `./docsReleaseTreeBindingGit` (05-L02 Core) | clean-checkout Git parser and one-shot compute adapter |
| `./docsPagesPublication` (05-L02 Core) | exact/capsule staging, cumulative merge and rollback |
| `./docsPostDeployHealthReceipt` (05-L02 Core) | health DTO, normalizer, serializer, artifact-name and atomic write/upload API |

Core release code never deep-imports portal source and no consumer redeclares a
handoff shape. Every retained/network/archive JSON value passes the owning
reject-unknown normalizer and canonical serialize→parse→normalize round trip
before mutation; hash checks use those exact canonical bytes.

TASK-548-02-L03 remains the sole writer of root `package.json`, `bun.lock`, and
`.github/workflows/coderso-pr-gates.yml`, and it owns the prerequisite
Dockerfile/core-package compatibility contract: all three documentation workspace
manifests are copied before frozen install, and `core/package.json` declares
contracts, renderer and portal workspace dependencies required by release code. Wave 05 consumes
and validates that landed contract only; it never edits `Dockerfile` or
`core/package.json`. L02 is the sole TASK-548 writer of
`.github/workflows/release.yml`. Neither leaf edits portal source or generated
Guide content.

## Security Contract

- **Endpoint visibility:** public static reads only; no application route or API
  is introduced.
- **Auth/RBAC:** none for readers. Retained-branch writes use the existing
  repository GitHub App token. Cloudflare deployment runs only in protected
  `docs-production`, with `contents: read` and no GitHub `pages`/`id-token`
  grant, using one environment-scoped API token limited to Pages Edit for the
  configured account and no broader DNS/Workers/account permission.
- **CSRF/rate limit:** not applicable to static reads or CI-to-GitHub
  publication. CDN read controls remain hosting policy, not an app endpoint.
- **Validation:** strict reject-unknown manifests/tree binding; confined paths;
  bounded Git entries/path/record bytes and artifact files; SemVer/tag/SHA/tree/
  origin/base/hash closure; SHA-pinned actions.
- **Anti-abuse:** no public write, nonce/HMAC, or CAPTCHA. Release concurrency,
  environment protection, no-clobber semantics, and bounded artifact handling
  protect the privileged publication path.
- **Secrets/privacy:** tokens exist only in step environment; manifests/logs/
  artifacts exclude credentials, cookies, source maps, absolute paths, PII, and
  build-host metadata.

## Implementation Pseudocode

```ts
const productVersion = assertPlainSemVer(semanticRelease.version);
const gitTag = assertPlainSemVerTagEqualsVersion(
  semanticRelease.gitTag,
  productVersion
);
const gitSha = resolveTagSha(gitTag);
assertCheckoutHeadEqualsTagTarget(readCheckoutHeadSha(), gitSha);
const sourceDateEpoch = assertCanonicalCommitEpoch(
  resolveCommitEpoch(gitSha)
);
const runtimeTree = await computeDocsReleaseTreeBindingFromGitV1({
  checkoutRoot: process.cwd(), expectedGitSha: gitSha,
});
await buildDocsPortalFromExactEnvironment({
  DOCS_PRODUCT_VERSION: productVersion,
  DOCS_PUBLIC_ORIGIN: assertConfiguredDocsOrigin(
    process.env.DOCS_PUBLIC_ORIGIN
  ),
  DOCS_PUBLIC_BASE_PATH: assertConfiguredDocsBasePath(
    process.env.DOCS_PUBLIC_BASE_PATH
  ),
  SOURCE_DATE_EPOCH: String(sourceDateEpoch),
});
const release = await buildDocsReleaseArtifact({
  distRoot: "packages/docs-portal/dist",
  version: productVersion,
  gitTag,
  gitSha,
  origin: process.env.DOCS_PUBLIC_ORIGIN,
  basePath: process.env.DOCS_PUBLIC_BASE_PATH,
  runtimeTree,
});
const verified = await verifyDocsReleaseArtifact({
  archivePath: release.archiveRelativePath,
  receiptPath: release.receiptRelativePath,
});
await publishExactVersionAndCapsuleNoOverwrite(verified);
await verifyRetainedExactVersion(verified);
await copyCapsuleCandidatesAndDeployCloudflarePages(
  verified.manifest.productVersion
);
const health = await verifyPublishedDocsReadOnly({ maxAttempts: 5 });
await writeAndUploadDocsPostDeployHealthReceiptV1(health);
```

**Data flow:** tag-pinned clean checkout → one canonical runtime-tree binding → portal validation → detached
portal-manifest binding → content-addressed archive + capsule → exact two-asset
no-clobber release upload → retained exact tree/capsule → verified cumulative
site-index merge plus byte-copy latest/global/runtime commit → protected
Cloudflare Pages deployment → bounded same-origin read-only health verification → strict
successful post-deploy receipt for read-only closure validation.

**Error handling:** a `v`-prefixed/different/blank tag, tag/SHA/HEAD drift,
invalid version/base URL, malformed artifact receipt, manifest/payload/archive
hash/tree mismatch, malformed Git record stream, nondeterministic archive, remote digest conflict, concurrent
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
permissions/actions/conditions pinned. Verify retained/rollback/post-deploy
consumers use L01's exact publication receipts, cumulative site-index merge is
strict/no-clobber/hash-stable, runtime-tree identity stays byte-equal through
release/rollback/health, and Docker compatibility is validated without a
Wave 05 write to its owner files.

## Acceptance Criteria

- Every released docs artifact is reproducible, SemVer-bound, content-addressed,
  tag/SHA/tree-pinned, hash-closed, and independently verifiable.
- Version and `gitTag` are the same plain SemVer, the tag target equals
  checkout HEAD, and the strict sibling artifact receipt independently closes
  the tar plus both manifest identities without self-reference.
- The GitHub Release uploads exactly the tar and sibling receipt, then verifies
  the embedded release manifest after any download.
- Release assets and exact public version directories cannot be overwritten with
  different bytes; identical retries are safe no-ops.
- Latest changes only after exact publication verifies; a failed attempt retains
  the previous alias.
- Rollback is explicit, auditable, capsule-copy-only, and never changes exact
  content.
- Cloudflare Pages publication uses protected `docs-production`, an exact
  account-scoped Pages-Edit token plus exact project allowlist, root `_headers`, and the retained branch without
  exposing credentials or expanding public behavior beyond static reads.
- Five-attempt bounded same-origin checks prove exact/latest canonical/version,
  root-404 status/body, one client asset, and effective CSP/frame/nosniff/
  referrer/permissions/cache behavior plus both retained manifests, then
  produce the exact identity-bound 90-day `DocsPostDeployHealthReceiptV1`
  artifact consumed by TASK-548-07.

## Testing Requirements

- focused artifact and publication Bun/Vitest tests from both leaves
- two clean builds and byte/hash comparison
- workflow contract tests for tag/SHA, pinned actions, permissions, concurrency,
  environment, SHA-1/SHA-256 tree parsing/binding, no-clobber, capsule layout, rollback,
  post-deploy health, and cleanup
- `DOCS_PRODUCT_VERSION=0.0.0-test DOCS_PUBLIC_ORIGIN=https://docs.example.invalid DOCS_PUBLIC_BASE_PATH=/docs SOURCE_DATE_EPOCH=0 bun --cwd packages/docs-portal build`
- validate the TASK-548-02-L03-owned Dockerfile/core-package frozen-workspace
  contract and build the existing Docker image without modifying either owner
  file
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run precommit:check`
- touched-file line counts and `git diff --check`

## Documentation Updates Required

Send artifact/capsule layout, detached-manifest verification, origin/base-path
configuration, retained-branch and Cloudflare protection, post-deploy health, release retry,
rollback, and incident-recovery notes to TASK-548-07.
Only TASK-548-07 writes changelog 1261 and shared closeout documentation.
