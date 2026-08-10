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
- new `core/services/documentation/release/docsReleaseTreeBinding.ts`;
- new
  `core/services/documentation/release/docsReleaseArtifactPairPromotion.ts`;
- new `scripts/docs/build-release-artifact.ts`;
- new `scripts/docs/verify-release-artifact.ts`;
- new `tests/unit/documentation/docsReleaseArtifact.test.ts`;
- new `tests/vitest/docs/docs-release-tree-binding.test.ts`;
- focused fixtures below `tests/fixtures/documentation/release-artifact/`.

It must not edit `.github/workflows/release.yml`, portal source, root
`package.json`, `bun.lock`, either PR workflow, or `docs/guide`. L02 consumes the
exported CLI/manifest contract without duplicating it. This leaf is also the
sole owner of the exact `DocsSearchPublicationReceiptV1` and
`DocsAssetsPublicationReceiptV1` schemas, normalizers, canonical serializers,
hash projections, and producer. L02 imports them for retained publication,
rollback, and post-deploy selection.

`docsReleaseSchemas.ts` is the single pure Core owner of every release manifest,
artifact-receipt and search/assets publication-receipt DTO, bound, normalizer and
canonical serializer below. `docsReleaseArtifact.ts` consumes portal DTOs only
through the server/build package boundary:

```ts
// docsReleaseArtifact.ts
import {
  normalizeDocsPortalManifestV1,
  normalizeDocsPortalSiteIndexCandidateV1,
  normalizeDocsPortalValidationReceiptV1,
  serializeDocsPortalManifestV1,
  serializeDocsPortalSiteIndexCandidateV1,
  serializeDocsPortalValidationReceiptV1,
  type DocsPortalManifestV1,
  type DocsPortalSiteIndexCandidateV1,
  type DocsPortalValidationReceiptV1,
} from "@coderso/docs-portal/publication-contracts";
// docsReleaseSchemas.ts
import { normalizeDocsReleaseTreeBindingV1,
  serializeDocsReleaseTreeBindingV1,
  type DocsReleaseTreeBindingV1,
} from "./docsReleaseTreeBinding";
```

Adjacent L02 Core modules import L01-owned values only from
`./docsReleaseSchemas`, `./docsReleaseArtifact` and `./docsReleaseTreeBinding`; no consumer deep-imports a
portal source file or redeclares a DTO.

## Artifact Contract

The exact manifest discriminator is `coderso.docs-release@v1`. Its normalized
fields are:

```ts
export const DOCS_RELEASE_LIMITS_V1 = {
  maxManifestBytes: 16_777_216,
  maxFiles: 100_000,
  maxPathBytes: 4_096,
  maxFileBytes: 26_214_400,
  maxAggregateFileBytes: 471_859_200,
  maxDiagnosticsBytes: 65_536,
  maxHashConcurrency: 16,
} as const;

export type DocsReleaseManifestV1 = {
  schema: "coderso.docs-release@v1";
  productVersion: string;
  gitTag: string;
  gitSha: string;
  runtimeTree: DocsReleaseTreeBindingV1;
  publicOrigin: string;
  publicBasePath: string;
  sourceHash: string;
  portalManifestSha256: string;
  payloadRootSha256: string;
  files: { path: string; bytes: number; sha256: string }[];
};

export function normalizeDocsReleaseManifestV1(
  value: unknown
): DocsReleaseManifestV1;
export function serializeCanonicalDocsReleaseManifestV1(
  value: DocsReleaseManifestV1
): Uint8Array;
```

These exported limits apply before allocation/decoding to manifest bytes,
records, normalized UTF-8 paths, each regular member, aggregate payload,
diagnostics and hashing concurrency. Exact-limit inputs pass; max-plus-one,
unsafe integers, or final tar overhead above
`DOCS_RELEASE_ARTIFACT_MAX_BYTES` fail closed.

## Release Runtime-Tree Binding Contract

L01's Bun/DB/settings/TASK-545/workflow-free `docsReleaseTreeBinding.ts` is the
sole DTO/bounds/normalizer/serializer/hash/constructor owner; L02 owns only the
Git adapter, while TASK-548-07 resume imports this pure API directly.

```ts
export const DOCS_RELEASE_RUNTIME_TREE_DOMAIN_V1 =
  "coderso.task548-release-runtime-tree@v1" as const;
export const DOCS_RELEASE_TREE_MAX_ENTRIES = 250_000 as const;
export const DOCS_RELEASE_TREE_MAX_PATH_BYTES = 4_096 as const;
export const DOCS_RELEASE_TREE_RECORDS_MAX_BYTES = 67_108_864 as const;
export type DocsGitObjectFormatV1 = "sha1" | "sha256";
export type DocsReleaseTreeBindingV1 = {
  schema: "coderso.docs-release-tree-binding@v1";
  gitObjectFormat: DocsGitObjectFormatV1;
  gitSha: string; headGitTreeOid: string;
  entryCount: number; recordBytes: number; runtimeTreeSha256: string;
};
export type DocsReleaseTreeBindingSourceV1 = Omit<
  DocsReleaseTreeBindingV1, "schema" | "runtimeTreeSha256" | "recordBytes"
> & { records: Uint8Array };
export function hashDocsReleaseRuntimeTreeRecordsV1(records: Uint8Array): string;
export function createDocsReleaseTreeBindingV1(
  value: DocsReleaseTreeBindingSourceV1
): DocsReleaseTreeBindingV1;
export function normalizeDocsReleaseTreeBindingV1(value: unknown): DocsReleaseTreeBindingV1;
export function serializeDocsReleaseTreeBindingV1(value: DocsReleaseTreeBindingV1): Uint8Array;
```

`gitObjectFormat` selects exact lowercase OID width: `sha1` requires 40 hex and
`sha256` requires 64 hex for both `gitSha` and `headGitTreeOid`; mixed widths,
uppercase, abbreviation and all-zero OIDs reject. Counts are integers within the
displayed caps. The constructor counts terminal NULs in the untouched stream and
requires `entryCount` to equal that exact record count; zero entries require zero
record bytes, while nonzero entries require nonzero bytes ending in exactly one
NUL. `runtimeTreeSha256` is always lowercase 64-hex. Every
shape rejects unknown keys recursively and serializes in displayed key order as
canonical UTF-8 JSON plus one final LF.

The pure hash is exactly
`SHA256(UTF8(DOCS_RELEASE_RUNTIME_TREE_DOMAIN_V1) || NUL ||
u64be(records.length) || records)`. It rejects over-cap bytes and does not sort,
decode or rewrite the already validated canonical Git record stream. The empty,
one-SHA-1-record and one-SHA-256-record vectors are respectively
`a5d9e3524b32138dd85017232a0f92b353fd8e0cc5745e2e2f303f27e47f3e13`,
`e7c23fbdb4f1dfa8952f32a0edd4f9df22a5b04a367513e8e8faa4471a1b0969`, and
`7c225a3d9b8116f29dc9229a9cef9fd0b14b916b4b3c01e5a84144b35553e872`
for the exact test records defined below.

`productVersion` is exact SemVer and `gitTag` is exactly the same plain SemVer
bytes: `gitTag === productVersion`. A `v` prefix, build-metadata drift,
normalization-only equality or any alternate tag format rejects. `gitSha` must
equal `runtimeTree.gitSha`, use its object-format width, and be proven as tag
target plus checkout HEAD. `publicOrigin` is normalized HTTPS without
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

## Durable Artifact-Pair and Materialization Contract

L01's `docsReleaseArtifactPairPromotion.ts` is the sole local pair and
same-handle materialization owner:

```ts
export const DOCS_RELEASE_ARTIFACT_PAIR_JOURNAL_SCHEMA_V1 =
  "coderso.docs-release-artifact-pair-promotion@v1" as const;
export type DocsReleaseArtifactPairPromotionInputV1 = {
  outputRoot: string; stagedArchivePath: string; stagedReceiptPath: string;
  expected: DocsReleaseArtifactReceiptV1;
};
export async function promoteDocsReleaseArtifactPairV1(
  input: DocsReleaseArtifactPairPromotionInputV1
): Promise<VerifiedDocsReleaseArtifact>;
export async function recoverDocsReleaseArtifactPairPromotionV1(input: {
  outputRoot: string; productVersion: string; payloadRootSha256: string;
}): Promise<"none" | "complete">;
export async function withVerifiedDocsReleaseArtifactMaterializationV1<T>(
  input: { archivePath: string; receiptPath: string; destinationRoot: string },
  use: (value: { artifact: VerifiedDocsReleaseArtifact;
    materializedRoot: string }) => Promise<T>
): Promise<T>;
```

The transaction identity hashes version, payload root, both final names and
staged byte hashes. Its one strict journal is
`.tmp/docs-release/artifact-transactions/<version>-<payloadRootSha256>/artifact-pair-promotion-v1.json`
and advances durably through `preparing → prepared → archive-installed →
receipt-installed → verified-commit`, with journal-temp write/fsync/rename and
parent-directory fsync at every transition. Both staged regular files are
reopened, bounded, canonical and pair-verified before `prepared`; final installs
are no-replace and each rename is directory-fsynced. Stable state is only both
absent or a complete byte-identical pair. A singleton is accepted only with its
matching valid journal and is completed or rolled back idempotently; an
unjournaled, foreign, missing, linked, changed or ambiguous singleton fails.
Cleanup starts only after `verified-commit` and removes the resolved transaction
root; cleanup failure preserves the journal for retry.

The materializer resolves explicit task-owned roots, uses no-follow opens, and
keeps the exact archive and receipt handles held from bounded reads through
canonical pair verification and tar extraction. It extracts only verified
regular members to a fresh confined root, applies all release limits, fsyncs and
rescans the complete tree, invokes `use`, rescans after use, and disposes only
that root in `finally`. It never verifies one pathname then reopens that pathname
for extraction; path/inode/type/link-count/size/mtime/ctime drift fails.

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
  runtimeTree: DocsReleaseTreeBindingV1;
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

export function normalizeDocsReleaseArtifactReceiptV1(
  value: unknown
): DocsReleaseArtifactReceiptV1;
export function serializeDocsReleaseArtifactReceiptV1(
  value: DocsReleaseArtifactReceiptV1
): Uint8Array;
```

For payload root `R` and version `V`, `archiveFileName` and
`archiveRelativePath` are both exactly `coderso-docs-V-R.tar`. The receipt is
its output-root sibling: `receiptFileName` and `receiptRelativePath` are both
exactly `coderso-docs-V-R.tar.receipt-v1.json`. Both paths are normalized safe
single-segment relative names; the output root is explicit, realpath-confined
and never serialized.

`productVersion === gitTag`; `gitSha` and both binding OIDs use the selected
Git object-format width; `sourceHash`, `runtimeTree.runtimeTreeSha256`, and
every `*Sha256` value are lowercase 64-hex. `archiveBytes` is an integer in
`1..DOCS_RELEASE_ARTIFACT_MAX_BYTES`, equals the independently reopened tar
size, and the receipt parser reads at most
`DOCS_RELEASE_ARTIFACT_RECEIPT_MAX_BYTES` before strict JSON normalization.
`releaseManifestSha256` hashes the exact canonical inserted release-manifest
bytes. `archiveSha256` hashes the complete reopened tar, including that
manifest. The other identity/hash fields equal the verified release and portal
manifests byte-for-byte.

`runtimeTree` is one required explicit allowlist key in both release-manifest
and artifact-receipt schemas. Each delegates to the sole binding normalizer;
missing/extra/nested-unknown or merely normalization-equivalent values reject.

Normalize and serialize keys in the displayed order as canonical JSON with LF
and one final newline. There are no arrays to reorder, timestamp, absolute
path, receipt byte count/hash, or receipt record in the tar, release
`files[]`, payload root, or release manifest. Thus the receipt binds the
archive but never itself. Stage it only after independent staged-archive reopen
verification, then publish both siblings through the durable pair owner above;
an existing different pair fails without replacement.

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

export type DocsSearchPublicationRecordV1 = {
  locale: string;
  path: string;
  bytes: number;
  sha256: string;
};

export type DocsSearchPublicationReceiptV1 = {
  schema: "coderso.docs-search-publication-receipt@v1";
  productVersion: string;
  sourceHash: string;
  portalManifestSha256: string;
  recordsSha256: string;
  records: DocsSearchPublicationRecordV1[];
};

export type DocsAssetsPublicationRecordV1 = {
  visualId: string;
  docId: string;
  locale: string;
  sectionId: string;
  path: string;
  bytes: number;
  sha256: string;
};

export type DocsAssetsPublicationReceiptV1 = {
  schema: "coderso.docs-assets-publication-receipt@v1";
  productVersion: string;
  sourceHash: string;
  portalManifestSha256: string;
  recordsSha256: string;
  records: DocsAssetsPublicationRecordV1[];
};

export function normalizeDocsSearchPublicationReceiptV1(
  value: unknown
): DocsSearchPublicationReceiptV1;
export function serializeDocsSearchPublicationReceiptV1(
  value: DocsSearchPublicationReceiptV1
): Uint8Array;
export function normalizeDocsAssetsPublicationReceiptV1(
  value: unknown
): DocsAssetsPublicationReceiptV1;
export function serializeDocsAssetsPublicationReceiptV1(
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
export function buildDocsPublicationReceiptsV1(input: {
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
- **Integrity:** verify runtime-tree/checkout identity, detached portal-manifest
  closure and public-base equality, then capsule/file hashes, canonical manifest,
  tar headers/order, archive hash, version/tag/SHA agreement, durable pair state,
  and same-handle materialization; reject partial output and path replacement.

## Implementation Pseudocode

```ts
export async function buildDocsReleaseArtifact(
  input: DocsReleaseBuildInput
): Promise<DocsReleaseArtifactReceiptV1> {
  const config = normalizeDocsReleaseBuildInput(input);
  const runtimeTree = normalizeDocsReleaseTreeBindingV1(config.runtimeTree);
  assertReleaseIdentityMatchesRuntimeTreeV1(config.releaseIdentity, runtimeTree);
  const { manifest: portal, receipt: receiptValue, receiptBytes } =
    await validateBuiltPortal(config.distRoot);
  const receipt = normalizeDocsPortalValidationReceiptV1(receiptValue);
  assertBytesEqual(receiptBytes, serializeDocsPortalValidationReceiptV1(receipt));
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
    runtimeTree,
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
  await recoverDocsReleaseArtifactPairPromotionV1({
    outputRoot: config.outputRoot,
    productVersion: manifest.productVersion,
    payloadRootSha256: manifest.payloadRootSha256,
  });
  const transaction = await createDocsReleaseArtifactPairStagingV1({
    outputRoot: config.outputRoot,
    productVersion: manifest.productVersion,
    payloadRootSha256: manifest.payloadRootSha256,
  });
  const written = await writeDeterministicTarToStaging(transaction, {
    files,
    capsule,
  });
  const archive = await reopenAndVerifyStagedTar(written, {
    manifest,
    manifestBytes,
    soleExcludedPath:
      `release-metadata/${manifest.productVersion}/publication-capsule/` +
      "docs-release-manifest-v1.json",
  });
  const artifactReceipt = normalizeDocsReleaseArtifactReceiptV1({
    schema: "coderso.docs-release-artifact-receipt@v1",
    productVersion: manifest.productVersion,
    gitTag: manifest.gitTag,
    gitSha: manifest.gitSha,
    runtimeTree: manifest.runtimeTree,
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
  await writeCanonicalStagedArtifactReceiptV1(transaction, artifactReceipt);
  const promoted = await promoteDocsReleaseArtifactPairV1({
    outputRoot: config.outputRoot,
    stagedArchivePath: transaction.archivePath,
    stagedReceiptPath: transaction.receiptPath,
    expected: artifactReceipt,
  });
  return promoted.receipt;
}

export async function verifyDocsReleaseArtifact(input: {
  archivePath: string;
  receiptPath: string;
}): Promise<VerifiedDocsReleaseArtifact> {
  return withHeldNoFollowDocsReleaseArtifactPairV1(input, async (held) => {
    const receipt = await held.readAndNormalizeReceiptV1();
    const archive = await held.openBoundedTarV1();
    const manifest = normalizeDocsReleaseManifestV1(archive.readManifest());
    assertReleaseRuntimeTreeEqualV1(receipt.runtimeTree, manifest.runtimeTree);
    assertCanonicalTarCapsuleAndClosedInventory(archive, manifest);
    await assertReceiptMatchesManifestAndArchive(receipt, manifest, archive);
    await held.assertIdentityUnchangedV1();
    return { manifest, receipt };
  });
}
```

**Data flow:** normalized one-shot runtime-tree binding + plain-SemVer identity + validated portal root →
detached portal-manifest/origin/base equality → confined inventory → immutable
capsule → bounded files/hashes → canonical payload root/release manifest →
staged tar reopen/verification → staged canonical receipt → journaled two-member
promotion/recovery → final same-handle pair verification/materialization.

**Error handling:** use `docs_release_input_invalid`,
`docs_release_origin_invalid`, `docs_release_tag_mismatch`,
`docs_release_path_invalid`, `docs_release_portal_invalid`,
`docs_release_hash_mismatch`, `docs_release_archive_invalid`,
`docs_release_capsule_invalid`, `docs_release_public_base_mismatch`,
`docs_release_runtime_tree_invalid`,
`docs_release_receipt_invalid`, `docs_release_pair_recovery_required`,
`docs_release_materialization_invalid`, `docs_release_nondeterministic`, and
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
- pure tree-binding tests pin domain/NUL/`u64be`, caps and exact empty plus
  `100644 blob f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f\ta.txt\0`
  SHA-1 and `100644 blob aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\ta.txt\0` SHA-256 vectors above;
  wrong length/endian/domain, claimed-vs-NUL record count, over-cap bytes/count,
  mixed/all-zero/uppercase/
  abbreviated OIDs, nested unknown keys and noncanonical serializer bytes fail;
- one-byte file, portal-manifest, source-hash, record, tar-header, name, or
  receipt tampering fails;
- accept only `gitTag === productVersion`; reject `v` prefix, tag/version/HEAD/
  target drift, unknown fields, noncanonical SemVer/SHA, unsafe origin/base path, symlink,
  traversal, case collision, extra/missing file, source map, and size limits fail;
- portal/release origin or base-path mismatch, portal-manifest self-record/second
  exclusion, capsule path/name/candidate mutation, regenerated alias, and
  search/asset receipt drift fail; 404, `_headers`, or client-assets copy
  path/bytes/hash drift and any regenerated runtime/deployment byte fail;
- exact `@coderso/docs-portal/publication-contracts`, `./docsReleaseSchemas` and
  `./docsReleaseArtifact` imports compile without deep imports or duplicate DTOs;
- portal/validation/tree/release/artifact/search/assets fixtures pin exact discriminators, key
  order, bounds, canonical record order and `recordsSha256`; every owning
  normalize→serialize→parse→normalize round trip is byte-identical; reject unknown
  keys, missing/duplicate/unsorted records, bad locale or owner tuple,
  non-global `visualId`, and any portal/validation identity, path, byte, or hash
  tamper;
- producer/consumer fixtures import L01's exact named types/functions, prove L01
  emits the only accepted receipt bytes, and expose those fixtures to L02 retained, rollback, and post-deploy
  selection tests; a localized asset can be selected only by its exact
  `(docId, locale, sectionId)` owner;
- mismatched portal `sourceHash`, validator discriminator/status,
  `manifestSha256`, files/artifact root closure, counts, or an attempted
  manifest self-hash field fail;
- file enumeration order and filesystem metadata cannot change artifact bytes;
- sequence failures before candidate closure, payload-root calculation,
  manifest insertion, staged-tar verification, receipt staging or durable pair
  commit preserve the prior pair; pre-existing/duplicate/missing insertion and
  any non-exact exclusion fail;
- real child processes die after every pair preparing/prepared/member rename,
  journal temp-write/fsync/rename/directory-fsync and final-directory fsync;
  recovery exposes only none/complete, completes or rolls back a journal-bound
  singleton idempotently, and rejects unjournaled/foreign/tampered state;
- same-handle materialization tests swap archive/receipt paths at every
  open/read/verify/extract/rescan boundary and prove only the held verified bytes
  reach a confined regular-file-only tree;
- receipt fixtures pin the exact discriminator/key set/order, sibling names/
  paths, archive bytes/hash, portal/release-manifest/payload hashes, safe bounds,
  exact runtime-tree object-format/SHA/tree/hash/count/bytes equality,
  exact-max acceptance and max-plus-one rejection, final LF, no self
  hash/inventory, and different-existing-sibling refusal;
- every exported release limit accepts its exact boundary and rejects max-plus-one
  before allocation/read; aggregate payload plus tar overhead must remain below
  the archive cap;
- build/verify CLIs emit the same single canonical receipt JSON on stdout,
  require explicit archive+receipt input for verification, and derive trust from
  bytes rather than requested filenames.

## Sub-Tasks

- [ ] Implement strict release manifest/input/receipt schemas and normalization.
- [ ] Implement the pure runtime-tree binding DTO/constructor/hash/serializer.
- [ ] Build the immutable capsule and journaled recoverable tar/receipt pair.
- [ ] Add independent byte-level tar+receipt verifier and bounded failure diagnostics.
- [ ] Add tamper, determinism, limits, and cleanup regression coverage.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts tests/vitest/docs/docs-release-tree-binding.test.ts
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
git diff --check
```

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

Re-run a named failure alone before classifying it.

## Documentation Updates Required

Pass the exact manifest/CLI/capsule contract to L02 and the detached-manifest,
public-base equality, artifact layout, verification, integrity-failure, and
cleanup runbook to TASK-548-07.
