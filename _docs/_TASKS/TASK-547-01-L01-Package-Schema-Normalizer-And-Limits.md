# TASK-547-01-L01: Package Schema, Normalizer and Limits
# FileName: TASK-547-01-L01-Package-Schema-Normalizer-And-Limits.md

**Parent Subtask:** TASK-547-01
**Priority:** Critical
**Category:** Solution Kits / Schema
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** 🚧 In Progress
**Reopened:** 2026-07-23 — implementation remains present; fresh final audit and
validation evidence are pending after drift remediation.

## Overview

Create bounded `FullSitePackageV1` types, strict schema and canonical package-aware
normalizer. Own new `core/services/kits/fullSitePackage/{types,schema,normalize}.ts`.
Do not change native Page/Menu/Form/content schemas.

This leaf owns structural package normalization only. It deliberately does not
decide whether a ref-shaped object appears at an allowed path or resolves to a
unique resource. Every full-package consumer must immediately pass this leaf's
normalized result to TASK-547-01-L02 `buildReferencePlan` before acquiring any
lazy DB-backed dependency. Do not add a wrapper helper or a second validation
path.

Every one of the ten resource arrays contains only a strict
`ResourceSeed<TDesired> = { key: string; desired: TDesired }`. Package JSON
contains no database IDs in package-owned seed envelopes. Lifecycle state only
where the native owner supports it, ordered children where supported, and all
other intended domain state are explicit inside
`desired`; canonical snapshot/equality is over the complete normalized
`desired`, never a partial projection.

Freeze the package-owned canonical key grammar to
`^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$`. It applies to the package key,
every non-setting seed key and each verification scenario ID. L02 applies the
same grammar to `PackageRef.key`. A setting seed key bypasses that regex and must equal:
`site.name`, `site.locale`, `site.homepageId`, `site.navigationMenuId`,
`site.footerTemplateId`, `site.contentRoutes`, `design.tokens`. No prefix,
namespace or regex-based setting admission is allowed.

Freeze this exact final package limit map:

```ts
const PACKAGE_LIMITS = {
  fileBytes: 8 * 1024 * 1024,
  resourcesTotal: 512,
  resourcesPerCollection: 256,
  referenceEdges: 4_096,
  depth: 64,
  diagnostics: 100,
  keyLength: 128,
  metadataNameLength: 200,
  metadataLocaleLength: 35,
  metadataDescriptionLength: 2_000,
  residualIdLength: 128,
  residualTextLength: 2_000,
  verificationScenarios: 100,
  stringLength: 100_000,
} as const;
```

The permanent historic name `fileBytes` measures only the
`JSON.stringify`/UTF-8 bytes of the in-memory value passed to the package
normalizer; overage is `site_package_too_large`. It is not a raw-file promise or
a shared loader cap. TASK-547-05 owns the separate
`FULL_SITE_PACKAGE_RAW_SOURCE_BYTES`; its raw-file failures map to
`site_package_file_invalid`.

`VerificationPlan` is exactly `{ scenarioIds: string[] }`. Reject an unknown key,
non-array, non-string, empty/non-canonical ID or 101st input entry; accept exactly
100. Canonicalization preserves first declaration order and collapses each later
duplicate, so repeated normalization is identical and no sort changes scenario
execution order. Embedded native payloads retain their own stricter limits, but
this leaf does not certify native-domain write validity.

Implement the parent’s exact strict `VisualResidual` shape with bounded evidence,
constraint, approximation, difference and remediation strings plus literal-false
functional/accessibility/data/security/test-integrity flags.

## Security Contract

Pure Bun-free code; no endpoint. Reject unknown keys, forbidden settings/secrets,
oversized serialized values/resources/strings/diagnostics and raw bytes/base64.
Setting keys use only the exact allowlist above, never the package-key regex.

## Implementation Pseudocode

```ts
export function normalizeFullSitePackageForWrite(value: unknown) {
  assertPackageByteSize(value); // existing export; measures serialized JSON bytes
  const root = assertStrictRoot(value);
  assertPackageComplexity(root, PACKAGE_LIMITS);
  const normalized = normalizePackageOwnedShapes(root);
  assertExactAllowedSettingKeys(normalized.resources.settings);
  return canonicalize(normalized);
}
```

Data flow: unknown input → serialized-size/shape limits → strict package-owned
records and exact setting allowlist → canonical structural output → L02 graph
validation. Errors use
`site_package_invalid|site_package_too_large|site_package_too_complex` and
bounded safe paths.

Regression tests: valid canonical package; all ten `{key,desired}` envelopes;
reject package DB IDs and unknown envelope keys; every exact limit edge and
one-over case, including serialized in-memory 8 MiB and 100/101 verification
entries; package/non-setting/scenario canonical-key grammar (L02 owns ref keys); all seven and
only seven setting keys without applying the package-key reader; strict
verification unknown/type/ID checks and stable first-occurrence dedupe; bounded
100-diagnostic truncation; secret namespace/raw-byte corpus; complete residual
object accept; bare-code/unknown-key/non-false-impact rejection; complete
desired-snapshot equality; and idempotent normalize. A schema-only limit test may
accept a ref-shaped object solely to count reference edges; it must state that
this is not full-package validity and leave path/ref-key rejection to L02 and the
consumer pre-DB regression. Native desired-document acceptance/rejection tests
belong to TASK-547-02 after reference substitution. Pin `fileBytes` as the exact
serialized-object boundary and prove the raw-source reader never consumes it.

## Sub-Tasks

- [x] Implement types/schema/limits/normalizer.
- [x] Add `tests/vitest/kits/full-site-package-schema.test.ts`.
- [ ] Correct serialized-size semantics, exact verification/setting contracts and
  their boundary regressions, then run fresh gates.

## Testing Requirements

`bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-schema.test.ts`;
core lint/types; touched-file line counts.

## Documentation Updates Required

Send verified schema/limit notes to TASK-547-06.
