# TASK-548-05-L01: Immutable Docs Artifact Manifest and Integrity
# FileName: TASK-548-05-L01-Immutable-Docs-Artifact-Manifest-And-Integrity.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-05
**Priority:** High
**Category:** Documentation Platform / Artifact Integrity
**Estimated Effort:** Large
**Dependencies:** TASK-548-04-L03; TASK-545 must be `✅ Done` and TASK-547 must be fully terminal before dispatch
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Create the strict, deterministic release envelope around
`packages/docs-portal/dist`. Bind all static bytes to an exact SemVer, release
tag, tag-resolved Git SHA, validated public base URL, portal input digest, and
content-addressed archive name. Produce the sole immutable publication capsule
consumed by L02. Verification must work before publication and after download
without trusting archive metadata or its filename.

## Exclusive Ownership

This leaf is the only writer for:

- new `core/services/documentation/release/docsReleaseArtifact.ts`;
- new `core/services/documentation/release/docsReleaseSchemas.ts`;
- new `scripts/docs/build-release-artifact.ts`;
- new `scripts/docs/verify-release-artifact.ts`;
- new `tests/unit/documentation/docsReleaseArtifact.test.ts`;
- focused fixtures below `tests/fixtures/documentation/release-artifact/`.

It must not edit `.github/workflows/release.yml`, portal source, root
`package.json`, `bun.lock`, either PR workflow, or `docs/guide`. L02 consumes the
exported CLI/manifest contract without duplicating it. This leaf is also the
sole owner of the exact `DocsSearchPublicationReceiptV1` and
`DocsAssetsPublicationReceiptV1` schemas, normalizers, canonical serializers,
hash projections, and producer. L02 imports them for retained publication,
rollback, and post-deploy selection.

## Artifact Contract

The exact manifest discriminator is `coderso.docs-release@v1`. Its normalized
fields are:

```ts
export type DocsReleaseManifestV1 = {
  schema: "coderso.docs-release@v1";
  productVersion: string;
  gitTag: string;
  gitSha: string;
  publicOrigin: string;
  publicBasePath: string;
  sourceHash: string;
  portalManifestSha256: string;
  payloadRootSha256: string;
  files: { path: string; bytes: number; sha256: string }[];
};
```

`productVersion` is exact SemVer and `gitTag` is exactly the same plain SemVer
bytes: `gitTag === productVersion`. A `v` prefix, build-metadata drift,
normalization-only equality or any alternate tag format rejects. `gitSha` is a
lowercase 40-hex commit that the caller proves is the tag target and current
tag-pinned checkout HEAD. `publicOrigin` is normalized HTTPS without
credentials, query, fragment, or trailing path; `publicBasePath` is `/` or a
normalized safe prefix. Both must exactly equal the normalized origin/base-path
fields in the verified portal manifest; a mismatch fails before artifact output.

The portal manifest is a detached control file: it is the sole `dist` file
excluded from its own sorted `files[]`. This release manifest externally records
its SHA-256 and rejects a self-record, second exclusion, unknown output or orphan.
L01 must call TASK-548-04-L03's validator and consume the exact
`DocsPortalManifestV1.sourceHash` plus
`DocsPortalValidationReceiptV1.manifestSha256`; it must not infer either value
from a filename, recompute `sourceHash` from portal output, or accept a
manifest-hash field inside the portal manifest.

L01 first builds verified capsule candidates under exactly:

```text
release-metadata/<productVersion>/publication-capsule/
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

`latest/**`, runtime, routing and global files are byte-identical copies of the
TASK-548-04-L02 portal outputs. `runtime/404.html`, `runtime/_headers`, and
`routing/client-assets.json` come only from portal `404.html`, `_headers`, and
`deployment/client-assets.json`; each must join its exact portal-manifest file
record by path/bytes/hash. `global/site-index.json` is the immutable
single-release candidate, not cumulative history; its three deployment hashes
must equal those same runtime/client portal-manifest records before capsule
closure. Search/asset receipts are the
strict L01-owned canonical sorted projections of the detached portal manifest
records defined below, not a rebuilt route graph.
The archive payload also
contains immutable `site/v/<version>`, `site/search/<version>` and
content-addressed `site/assets`.

The candidate phase must prove
`release-metadata/<productVersion>/publication-capsule/docs-release-manifest-v1.json`
does not yet exist. Release `files[]` then records every exact site/capsule
candidate byte; unlike the portal manifest, it includes and hashes
`docs-portal-manifest.json`. `payloadRootSha256` uses this exact owner contract:

```ts
export const DOCS_RELEASE_PAYLOAD_ROOT_DOMAIN_V1 =
  "coderso.docs-release.payload-root.v1" as const;

export function hashDocsReleasePayloadRootV1(
  records: readonly { path: string; bytes: number; sha256: string }[]
): string;
```

Normalize every `path` to confined NFC POSIX UTF-8 with `/`, no empty segment,
dot segment, backslash, absolute prefix, query, fragment, or case-colliding
peer. Require unique records sorted by raw UTF-8 path bytes. The exact hash
stream is:

```text
UTF8("coderso.docs-release.payload-root.v1") || 0x00 ||
u64be(recordCount) ||
for each sorted record:
  u32be(pathUtf8.length) || pathUtf8 ||
  u64be(bytes) ||
  raw32(lowercaseHexDecode(sha256))
```

`u32be` and `u64be` are unsigned fixed-width big-endian integers; `bytes` must
be a bounded non-negative safe integer that round-trips through `u64be`.
`sha256` is validated lowercase 64-hex and contributes its decoded raw 32
bytes, never 64 ASCII hex bytes. Length/count framing is complete, so there is
no record separator or final newline. The resulting SHA-256 is serialized as
lowercase 64-hex. The framing defines an empty set even though a release
payload must be non-empty:

```text
[] =>
  3a29b9bbbfbc53ef8eaa045131b218d7de7a5d72cd220c71ba259d75b66ffb8a
[{ path: "a.txt", bytes: 3,
   sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" }] =>
  ab088204acba6ebb246079480fb38d1b206f59e965f65782d5be77ba183aca8b
```

The producer and reopened archive verifier independently build this framed
stream from their own inventories. They may share only the literal domain and
strict record normalizer, not a producer-computed root.

Only after `files[]` and `payloadRootSha256` are final does L01 serialize the
canonical `DocsReleaseManifestV1` and insert those exact bytes at:

```text
release-metadata/<productVersion>/publication-capsule/docs-release-manifest-v1.json
```

That path is the release inventory's sole exclusion. The completed tar is then
finalized, reopened, and independently verified for the exact one-file
exclusion, every other site/capsule byte, canonical manifest bytes, payload
root, and full archive receipt. The detached tar receipt hashes the complete
archive including the inserted release manifest. Paths are slash-normalized and
confined; symlinks, devices, case collisions, dot segments, hidden source maps,
unknown files and broad roots reject.

The deterministic uncompressed tar uses fixed uid/gid/mode/mtime/order and LF
manifest bytes. Its name is
`coderso-docs-<productVersion>-<payloadRootSha256>.tar`; a sibling receipt
records the tar SHA-256 without creating a self-referential manifest. Wall-clock
time, absolute paths, owner names, machine data, and nondeterministic compression
are forbidden.

## Artifact Receipt Contract

The exact recursively reject-unknown shape is:

```ts
export const DOCS_RELEASE_ARTIFACT_MAX_BYTES = 536_870_912 as const;
export const DOCS_RELEASE_ARTIFACT_RECEIPT_MAX_BYTES = 16_384 as const;

export type DocsReleaseArtifactReceiptV1 = {
  schema: "coderso.docs-release-artifact-receipt@v1";
  productVersion: string;
  gitTag: string;
  gitSha: string;
  sourceHash: string;
  portalManifestSha256: string;
  releaseManifestSha256: string;
  payloadRootSha256: string;
  archiveFileName: string;
  archiveRelativePath: string;
  archiveBytes: number;
  archiveSha256: string;
  receiptFileName: string;
  receiptRelativePath: string;
};

export type VerifiedDocsReleaseArtifact = {
  manifest: DocsReleaseManifestV1;
  receipt: DocsReleaseArtifactReceiptV1;
};
```

For payload root `R` and version `V`, `archiveFileName` and
`archiveRelativePath` are both exactly `coderso-docs-V-R.tar`. The receipt is
its output-root sibling: `receiptFileName` and `receiptRelativePath` are both
exactly `coderso-docs-V-R.tar.receipt-v1.json`. Both paths are normalized safe
single-segment relative names; the output root is explicit, realpath-confined
and never serialized.

`productVersion === gitTag`; `gitSha` is lowercase 40-hex; `sourceHash` and
every `*Sha256` value are lowercase 64-hex. `archiveBytes` is an integer in
`1..DOCS_RELEASE_ARTIFACT_MAX_BYTES`, equals the independently reopened tar
size, and the receipt parser reads at most
`DOCS_RELEASE_ARTIFACT_RECEIPT_MAX_BYTES` before strict JSON normalization.
`releaseManifestSha256` hashes the exact canonical inserted release-manifest
bytes. `archiveSha256` hashes the complete reopened tar, including that
manifest. The other identity/hash fields equal the verified release and portal
manifests byte-for-byte.

Normalize and serialize keys in the displayed order as canonical JSON with LF
and one final newline. There are no arrays to reorder, timestamp, absolute
path, receipt byte count/hash, or receipt record in the tar, release
`files[]`, payload root, or release manifest. Thus the receipt binds the
archive but never itself. Write it atomically only after independent archive
reopen verification; an existing different sibling fails without replacing the
previous valid pair.

`build-release-artifact.ts` writes the tar and receipt and emits exactly the
canonical `DocsReleaseArtifactReceiptV1` bytes to stdout. The verifier requires
explicit `--archive` and `--receipt` siblings, revalidates both independently,
and emits those same canonical receipt bytes. Success writes no other stdout;
failure exits nonzero with bounded structured diagnostics on stderr.

## Search and Visual-Asset Publication Receipt Contract

L01 owns these exact recursively reject-unknown shapes and bounds:

```ts
export const DOCS_PUBLICATION_RECEIPT_MAX_BYTES = 8_388_608 as const;
export const DOCS_SEARCH_PUBLICATION_RECORD_MAX = 256 as const;
export const DOCS_ASSETS_PUBLICATION_RECORD_MAX = 50_000 as const;

type DocsSearchPublicationRecordV1 = {
  locale: string;
  path: string;
  bytes: number;
  sha256: string;
};

type DocsSearchPublicationReceiptV1 = {
  schema: "coderso.docs-search-publication-receipt@v1";
  productVersion: string;
  sourceHash: string;
  portalManifestSha256: string;
  recordsSha256: string;
  records: DocsSearchPublicationRecordV1[];
};

type DocsAssetsPublicationRecordV1 = {
  visualId: string;
  docId: string;
  locale: string;
  sectionId: string;
  path: string;
  bytes: number;
  sha256: string;
};

type DocsAssetsPublicationReceiptV1 = {
  schema: "coderso.docs-assets-publication-receipt@v1";
  productVersion: string;
  sourceHash: string;
  portalManifestSha256: string;
  recordsSha256: string;
  records: DocsAssetsPublicationRecordV1[];
};

normalizeDocsSearchPublicationReceiptV1(
  value: unknown
): DocsSearchPublicationReceiptV1;
serializeDocsSearchPublicationReceiptV1(
  value: DocsSearchPublicationReceiptV1
): Uint8Array;
normalizeDocsAssetsPublicationReceiptV1(
  value: unknown
): DocsAssetsPublicationReceiptV1;
serializeDocsAssetsPublicationReceiptV1(
  value: DocsAssetsPublicationReceiptV1
): Uint8Array;
```

Each receipt has `1..its-record-max` records and serializes keys in the
displayed order as canonical JSON with LF and one final newline. Search records
are unique and sorted by `(locale, path)`; each path is exactly
`search/<productVersion>/<locale>.json` and joins one detached portal-manifest
file record by identical path/bytes/hash. Asset records are unique and sorted
by `(visualId, locale, docId, sectionId, path)`; `visualId` is bundle-global,
and every record is copied exactly from one
`DocsPortalManifestV1.visualAssets[]` record owned by
`(docId, locale, sectionId)` and joins one manifest file record by identical
path/bytes/hash. No locale, owner, path, or digest is inferred from a filename.

`productVersion` and `sourceHash` equal the detached portal manifest exactly;
`portalManifestSha256` equals the external L03 validation receipt. All hashes
are lowercase SHA-256 and all paths, locales, identifiers, counts, and bytes are
bounded and canonical. For domain `D`, `recordsSha256` is exactly SHA-256 over
`UTF8(D + "\0")` followed by the canonical JSON bytes of `records` with no
trailing newline, where `D` is respectively
`coderso.docs-search-publication-records@v1` or
`coderso.docs-assets-publication-records@v1`. The normalizers recalculate and
constant-time compare this projection hash; they do not sort malformed input
into acceptance.

The only producer derives both receipts from the already validated detached
manifest and receipt:

```ts
buildDocsPublicationReceiptsV1(input: {
  portal: DocsPortalManifestV1;
  validation: DocsPortalValidationReceiptV1;
}): {
  search: DocsSearchPublicationReceiptV1;
  assets: DocsAssetsPublicationReceiptV1;
};
```

It writes their exact serialized bytes only to capsule
`receipts/search.json` and `receipts/assets.json`. L02 must parse them through
these functions before current publication, retained idempotency, rollback, or
post-deploy route/asset selection. No L02 schema copy, fallback receipt, or
reconstruction from retained HTML is valid.

## Security Contract

- **Endpoint visibility/auth/RBAC/CSRF/rate limit:** no endpoint; build and
  verification commands only.
- **Reject unknown:** release/portal manifests, CLI options, file records,
  artifact receipt, and both publication receipts are strict with recursive
  unknown-key rejection.
- **Path/URL policy:** realpath-confined explicit roots; no symlink, traversal,
  control character, URL-encoded separator, credentials, non-HTTPS origin, or
  unsafe base segment.
- **Anti-abuse:** cap file count, per-file/aggregate/archive bytes, path length,
  manifest bytes, diagnostics, and hash concurrency. No nonce/HMAC/CAPTCHA.
- **Secrets/privacy:** scan output inventory and public bytes using the existing
  release security lane; diagnostics expose safe relative paths/hashes only.
- **Integrity:** verify detached portal-manifest closure and public-base equality
  first, then capsule/file hashes, payload root, canonical manifest bytes, tar
  headers/order, archive hash, version/tag/SHA agreement; reject partial output.

## Implementation Pseudocode

```ts
export async function buildDocsReleaseArtifact(
  input: DocsReleaseBuildInput
): Promise<DocsReleaseArtifactReceiptV1> {
  const config = normalizeDocsReleaseBuildInput(input);
  const { manifest: portal, receipt } =
    await validateBuiltPortal(config.distRoot);
  assertDocsPortalValidationReceiptMatchesManifest(portal, receipt);
  assertReleaseAndPortalPublicBaseEqual(config, portal);
  const files = await inventoryConfinedPortalFiles(portal);
  const publicationReceipts = buildDocsPublicationReceiptsV1({
    portal,
    validation: receipt,
  });
  const capsuleCandidates =
    await buildPublicationCapsuleCandidatesWithoutReleaseManifest({
      portal,
      version: config.releaseIdentity.productVersion,
      publicationReceipts,
      exactRuntimeCopies: selectManifestBoundRuntimeCopiesV1(portal, files, {
        notFound: "404.html",
        cloudflareHeaders: "_headers",
        clientAssets: "deployment/client-assets.json",
      }),
    });
  assertReleaseManifestCandidateAbsent(capsuleCandidates);
  const payloadFiles = inventoryArchivePayload(files, capsuleCandidates);
  const manifest = normalizeDocsReleaseManifestV1({
    schema: "coderso.docs-release@v1",
    ...config.releaseIdentity,
    sourceHash: portal.sourceHash,
    portalManifestSha256: receipt.manifestSha256,
    payloadRootSha256: hashDocsReleasePayloadRootV1(payloadFiles),
    files: payloadFiles,
  });
  const manifestBytes = serializeCanonicalDocsReleaseManifestV1(manifest);
  const releaseManifestSha256 = sha256(manifestBytes);
  const capsule = insertReleaseManifestBytesAtExactCapsulePath(
    capsuleCandidates,
    manifest.productVersion,
    manifestBytes
  );
  const written = await writeDeterministicTarAtomically(config.outputRoot, {
    files,
    capsule,
  });
  const archive = await reopenAndVerifyFinalTar(written, {
    manifest,
    manifestBytes,
    soleExcludedPath:
      `release-metadata/${manifest.productVersion}/publication-capsule/` +
      "docs-release-manifest-v1.json",
  });
  return writeCanonicalSiblingArtifactReceiptV1({
    schema: "coderso.docs-release-artifact-receipt@v1",
    productVersion: manifest.productVersion,
    gitTag: manifest.gitTag,
    gitSha: manifest.gitSha,
    sourceHash: manifest.sourceHash,
    portalManifestSha256: manifest.portalManifestSha256,
    releaseManifestSha256,
    payloadRootSha256: manifest.payloadRootSha256,
    archiveFileName: archive.fileName,
    archiveRelativePath: archive.fileName,
    archiveBytes: archive.bytes,
    archiveSha256: archive.sha256,
    receiptFileName: `${archive.fileName}.receipt-v1.json`,
    receiptRelativePath: `${archive.fileName}.receipt-v1.json`,
  });
}

export async function verifyDocsReleaseArtifact(input: {
  archivePath: string;
  receiptPath: string;
}): Promise<VerifiedDocsReleaseArtifact> {
  const receipt = await readAndNormalizeArtifactReceiptV1(input.receiptPath);
  assertExactSiblingPaths(input, receipt);
  const archive = await openBoundedTar(input.archivePath);
  const manifest = normalizeDocsReleaseManifestV1(archive.readManifest());
  assertCanonicalTarCapsuleAndClosedInventory(archive, manifest);
  await assertReceiptMatchesManifestAndArchive(receipt, manifest, archive);
  return { manifest, receipt };
}
```

**Data flow:** explicit plain-SemVer release identity + validated portal root →
detached portal-manifest/origin/base equality → confined inventory → immutable
capsule → per-file hashes → canonical payload root/release manifest →
task-scoped tar write → independent re-open/verification → atomic final tar
rename → strict canonical sibling receipt → independent tar+receipt verification.

**Error handling:** use `docs_release_input_invalid`,
`docs_release_origin_invalid`, `docs_release_tag_mismatch`,
`docs_release_path_invalid`, `docs_release_portal_invalid`,
`docs_release_hash_mismatch`, `docs_release_archive_invalid`,
`docs_release_capsule_invalid`, `docs_release_public_base_mismatch`,
`docs_release_receipt_invalid`, `docs_release_nondeterministic`, and
`docs_release_cleanup_failed`. Preserve the last valid tar/receipt pair; clean
only a resolved task-owned temporary directory.

## Regression Tests

- identical portal bytes under two absolute roots and timezones produce identical
  manifest, tar, payload-root, and archive hashes;
- independent producer/verifier framing tests pin the literal payload-root
  domain, NFC POSIX raw-byte path order, `u64be` record count, `u32be` path
  length, `u64be` file length, raw 32-byte digest decoding, no implicit
  separators, the empty-set vector, and the one-record `a.txt`/`abc` vector
  above; a little-endian integer, ASCII-hex digest, missing domain NUL, changed
  order, or added newline produces a different rejected root;
- one-byte file, portal-manifest, source-hash, record, tar-header, name, or
  receipt tampering fails;
- accept only `gitTag === productVersion`; reject `v` prefix, tag/version/HEAD/
  target drift, unknown fields, noncanonical SemVer/SHA, unsafe origin/base path, symlink,
  traversal, case collision, extra/missing file, source map, and size limits fail;
- portal/release origin or base-path mismatch, portal-manifest self-record/second
  exclusion, capsule path/name/candidate mutation, regenerated alias, and
  search/asset receipt drift fail; 404, `_headers`, or client-assets copy
  path/bytes/hash drift and any regenerated runtime/deployment byte fail;
- search/assets publication-receipt fixtures pin exact discriminators, key
  order, bounds, canonical record order and `recordsSha256`; reject unknown
  keys, missing/duplicate/unsorted records, bad locale or owner tuple,
  non-global `visualId`, and any portal/validation identity, path, byte, or hash
  tamper;
- producer/consumer fixtures prove L01 emits the only accepted receipt bytes and
  expose those exact fixtures to L02 retained, rollback, and post-deploy
  selection tests; a localized asset can be selected only by its exact
  `(docId, locale, sectionId)` owner;
- mismatched portal `sourceHash`, validator discriminator/status,
  `manifestSha256`, files/artifact root closure, counts, or an attempted
  manifest self-hash field fail;
- file enumeration order and filesystem metadata cannot change artifact bytes;
- sequence failures before candidate closure, payload-root calculation,
  manifest serialization/insertion, tar finalization, reopen verification, or
  full-tar receipt preserve the previous artifact and never leave a partial
  capsule; pre-existing/duplicate/missing manifest insertion and any exclusion
  other than the exact release-manifest path fail;
- interrupted write leaves the previous artifact and cleans the exact temp path;
- receipt fixtures pin the exact discriminator/key set/order, sibling names/
  paths, archive bytes/hash, portal/release-manifest/payload hashes, safe bounds,
  exact-max acceptance and max-plus-one rejection, final LF, no self
  hash/inventory, and different-existing-sibling refusal;
- build/verify CLIs emit the same single canonical receipt JSON on stdout,
  require explicit archive+receipt input for verification, and derive trust from
  bytes rather than requested filenames.

## Sub-Tasks

- [ ] Implement strict release manifest/input/receipt schemas and normalization.
- [ ] Build the exact immutable publication capsule, content-addressed tar and
  atomic receipt writer.
- [ ] Add independent byte-level tar+receipt verifier and bounded failure diagnostics.
- [ ] Add tamper, determinism, limits, and cleanup regression coverage.

## Testing Requirements

```bash
bun test tests/unit/documentation/docsReleaseArtifact.test.ts
bun scripts/docs/build-release-artifact.ts --help
bun scripts/docs/verify-release-artifact.ts --help
DOCS_PRODUCT_VERSION=0.0.0-test \
DOCS_PUBLIC_ORIGIN=https://docs.example.invalid \
DOCS_PUBLIC_BASE_PATH=/docs \
SOURCE_DATE_EPOCH=0 \
  bun --cwd packages/docs-portal build
bun --cwd core lint:types
bun --cwd core lint
wc -l core/services/documentation/release/*.ts \
  scripts/docs/*release-artifact.ts \
  tests/unit/documentation/docsReleaseArtifact.test.ts
find tests/fixtures/documentation/release-artifact \
  -type f -exec wc -l {} +
git diff --check
```

The line-count gate inventories every human-authored L01-owned fixture file,
regardless of extension, in addition to source and test modules. Each must
remain at most 1,000 lines. Re-run a named failure alone before classifying it.

## Documentation Updates Required

Pass the exact manifest/CLI/capsule contract to L02 and the detached-manifest,
public-base equality, artifact layout, verification, integrity-failure, and
cleanup runbook to TASK-548-07.
