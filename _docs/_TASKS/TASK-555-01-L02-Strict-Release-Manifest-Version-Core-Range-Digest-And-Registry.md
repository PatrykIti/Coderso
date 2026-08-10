# TASK-555-01-L02: Strict Release Manifest Version Core Range Digest and Registry
# FileName: TASK-555-01-L02-Strict-Release-Manifest-Version-Core-Range-Digest-And-Registry.md

**Parent Subtask:** TASK-555-01
**Priority:** High
**Category:** Release Contract / Registry / Compatibility
**Estimated Effort:** Medium
**Dependencies:** TASK-555-01-L01 and the unchanged parent workflow/start receipts
**Status:** ⏳ To Do

---

## Overview

Own the strict immutable release manifest and the only server-side curated-starter
registry. The registry represents every current legacy catalog kit through a
`solution-kit` source and FormaDom through a `full-site-package` release source.
It must not flatten package data, expose an artifact path, accept a callback/module
specifier, or let callers choose a provider.

## Sub-Tasks

None; this is an executable leaf.

## Exact Single-Writer Ownership

This leaf is the sole writer for exactly:

- `core/services/kits/curatedStarters/releaseManifest.ts` (new);
- `core/services/kits/curatedStarters/registry.ts` (new);
- `core/assets/curated-starters/formadom-studio/1.0.0/release.json` (new,
  generated manifest); and
- `tests/vitest/kits/curated-starter-release-registry.test.ts` (new).

`solutionKitsCatalog.ts`, `solutionKitTypes.ts`, the package artifact, and generator
are read-only inputs. The generated release JSON is exempt from the line gate.

## Dependencies and Land Order

Consume L01's exact bytes. Land before TASK-555-01-L03 and TASK-555-02-L01. Later
leaves import registry/types but may not duplicate or mutate registry entries.

## Forbidden Paths

- every TASK-414/489/545/547/548/551/554 task, foreign changelog/index,
  workflow/smoke path, and the read-only tracked TASK-555 workflow bootstrap;
- FormaDom generator/artifact bytes owned by L01;
- `solutionKitsCatalog.ts` (2,036-line read-only legacy catalog), Docker/runtime
  loader, API/Admin/Setup source, DB schema/migrations;
- all unrelated dirty files.

## Security Contract

- **Endpoint visibility:** none; this is a pure server contract.
- **Auth/RBAC/CSRF/rate limit:** not applicable.
- **Validation:** recursively exact manifest keys, strict SemVer, strict core range,
  lowercase 64-hex SHA-256, positive bounded byte count, exact package schema/key,
  and registry uniqueness.
- **Anti-abuse:** no public input, nonce, HMAC, or CAPTCHA. No registry scanning or
  arbitrary module/file source.
- **Secrets:** manifest/registry contain only release metadata and safe catalog
  labels; no credentials or package payload.

## Exact Release Manifest

```ts
type CuratedFullSiteReleaseManifestV1 = Readonly<{
  schemaVersion: 1;
  starterId: "formadom-studio";
  providerKind: "full-site-package";
  releaseVersion: "1.0.0";
  coreCompatibility: ">=1.0.0 <2.0.0";
  packageSchemaVersion: 1;
  packageKey: "formadom-studio";
  artifactBytes: 288066;
  artifactSha256: "307af7d9c61a2ad86d9ea038757c780f67636beee457f87ddb1b9861dbf36870";
  packageFingerprint: "418691434dcb4bc8044bad3789a031a59e71e8fb3783503522e1b30554f0a470";
  referenceSourceDigest: "d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e";
  releaseDescriptorDigest: "a4a98f5c462b65c18200c2c97d84b7c86b440454068c6be6bf172ed9502e6952";
}>;
```

The registry has exactly seven IDs in deterministic order:

1. `automotive-workshop`;
2. `medical-clinic`;
3. `beauty-salon`;
4. `local-service-business`;
5. `services-directory`;
6. `small-ecommerce`;
7. `formadom-studio`.

`artifactSha256`, terminal TASK-547 `packageFingerprint`, and reference provenance
`referenceSourceDigest` are distinct. `releaseDescriptorDigest` is SHA-256 over
`u32be(domain length)||domain||u64be(payload length)||payload`, domain
`coderso.curated-starter.release-descriptor.v1`, and canonical recursively-key-sorted
JSON of exactly `starterId,providerKind,releaseVersion,coreCompatibility,
packageSchemaVersion,packageKey,artifactBytes,artifactSha256,packageFingerprint`.

Legacy entries pin literal release version `1.0.0`, core range
`>=1.0.0 <2.0.0`, and both literal digests from the parent table. Their
`catalogDefinitionDigest` uses the same frame, domain
`coderso.curated-starter.catalog-definition.v1`, and owner-normalized
`SolutionKitDefinition`. Their `releaseDescriptorDigest` uses domain
`coderso.curated-starter.release-descriptor.v1` over canonical JSON of exactly
`starterId,providerKind,releaseVersion,coreCompatibility,catalogDefinitionDigest`.
It is not an artifact/package digest. The source remains only
`{kind:"solution-kit",kitId}`. Any definition change must intentionally bump the
release metadata and checked-in literals; expected and actual may not be computed
from the same live object. FormaDom source is only
`{kind:"full-site-package",releaseKey:"formadom-studio@1.0.0"}`.

## Implementation Pseudocode

```ts
export type CuratedStarterSourceV1 =
  | Readonly<{ kind: "solution-kit"; kitId: SolutionKitId }>
  | Readonly<{
      kind: "full-site-package";
      releaseKey: "formadom-studio@1.0.0";
    }>;

const definitions = Object.freeze([
  ...solutionKitIds.map((kitId) => definePinnedCatalogStarter(kitId)),
  defineFullSiteStarter({
    id: "formadom-studio",
    source: { kind: "full-site-package", releaseKey: "formadom-studio@1.0.0" },
    manifest: normalizeCuratedReleaseManifest(FORMA_DOM_RELEASE_JSON),
  }),
]);

export function requireCuratedStarter(id: unknown): CuratedStarterDefinitionV1 {
  const normalizedId = readExactCuratedStarterId(id);
  const value = byId.get(normalizedId);
  if (!value) throw new Error("curated_starter_not_found");
  return value;
}
```

Definitions are deeply frozen and projected through copy-safe readers. The artifact
locator itself belongs to L03 and is not a manifest/DTO field.

## Data Flow

Pinned release JSON + read-only catalog IDs/definitions -> strict normalizer ->
digest/version compatibility checks -> closed deterministic registry -> copy-safe
lookup/list APIs.

## Error Handling

- Unknown/duplicate IDs: `curated_starter_not_found` / `curated_starter_registry_invalid`.
- Invalid manifest/version/range/digest/count/key: `curated_starter_release_invalid`.
- Catalog digest drift without release update: `curated_starter_release_drift`.
- Errors contain no package content, path, or raw catalog definition.

## Regression Tests

- Exact seven IDs/order and exact six-to-one provider-kind split.
- Server and registry catalog IDs are set-equal; `local-service-business` is present.
- FormaDom manifest exact fields/values and immutable digest/count.
- Every manifest/entry rejects unknown/missing/prototype keys, bad SemVer/range,
  uppercase/short digest, wrong package key/schema, duplicate ID/release key.
- Catalog digest computation is canonical and each pinned digest matches its current
  owner-normalized definition; all six literal release descriptor digests and the
  FormaDom literal are independently pinned.
- No registry field contains a path, URL, module specifier, callback, package, or
  resource blueprint for FormaDom.
- Deep mutation attempts cannot alter a later list/detail result.

## Testing Requirements

```bash
NODE_ENV=test vitest run --config vitest.config.ts \
  tests/vitest/kits/curated-starter-release-registry.test.ts
bun run lint:repo:types
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Run `wc -l` over every modified human-authored source/test file and fail above 1,000.

## Documentation Updates Required

None here. TASK-555-07-L01 owns release/registry documentation before smoke; L03 is
closure metadata only.
