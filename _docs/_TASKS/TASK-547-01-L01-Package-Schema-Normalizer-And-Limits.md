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

Freeze `PACKAGE_LIMITS` to 8 MiB per file, 512 total resources, 256 resources per
collection, 4,096 edges, graph depth 64 and 100 diagnostics. Embedded native
payloads continue to enforce their own stricter limits.

Implement the parent’s exact strict `VisualResidual` shape with bounded evidence,
constraint, approximation, difference and remediation strings plus literal-false
functional/accessibility/data/security/test-integrity flags.

## Security Contract

Pure Bun-free code; no endpoint. Reject unknown keys, forbidden settings/secrets,
oversized files/resources/strings/diagnostics and raw bytes/base64.

## Implementation Pseudocode

```ts
export function normalizeFullSitePackageForWrite(value: unknown) {
  const root = assertStrictRoot(value);
  assertPackageComplexity(root, PACKAGE_LIMITS);
  return canonicalize(normalizePackageOwnedShapes(root));
}
```

Data flow: unknown input → size/shape limits → strict package-owned records →
canonical structural output → L02 graph validation. Errors use
`site_package_invalid|too_large|too_complex` and bounded safe paths.

Regression tests: valid canonical package; all ten `{key,desired}` envelopes;
reject package DB IDs and unknown envelope keys; every exact limit edge and
one-over case; bounded 100-diagnostic truncation; secret namespace/raw-byte
corpus; complete residual object accept; bare-code/unknown-key/non-false-impact
rejection; complete desired-snapshot equality; and idempotent normalize. A
schema-only limit test may accept a ref-shaped object solely to count reference
edges; it must state that this is not full-package validity and leave bad-path
rejection to L02 and the consumer pre-DB regression.

## Sub-Tasks

- [x] Implement types/schema/limits/normalizer.
- [x] Add `tests/vitest/kits/full-site-package-schema.test.ts`.

## Testing Requirements

`bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-schema.test.ts`;
core lint/types; touched-file line counts.

## Documentation Updates Required

Send verified schema/limit notes to TASK-547-06.
