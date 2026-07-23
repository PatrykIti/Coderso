# TASK-547-01-L01: Package Schema, Normalizer and Limits
# FileName: TASK-547-01-L01-Package-Schema-Normalizer-And-Limits.md

**Parent Subtask:** TASK-547-01
**Priority:** Critical
**Category:** Solution Kits / Schema
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

## Overview

Create bounded `FullSitePackageV1` types, strict schema and canonical package-aware
normalizer. Own new `core/services/kits/fullSitePackage/{types,schema,normalize}.ts`.
Do not change native Page/Menu/Form/content schemas.

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

Data flow: unknown input → size/shape limits → strict records → canonical output.
Errors use `site_package_invalid|too_large|too_complex` and bounded safe paths.

Regression tests: valid canonical package, unknown-key matrix, every limit edge,
secret namespace/raw-byte corpus, complete residual object accept, bare-code/
unknown-key/non-false-impact rejection, and idempotent normalize.

## Sub-Tasks

- [ ] Implement types/schema/limits/normalizer.
- [ ] Add `tests/vitest/kits/full-site-package-schema.test.ts`.

## Testing Requirements

`bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-package-schema.test.ts`;
core lint/types; touched-file line counts.

## Documentation Updates Required

Send verified schema/limit notes to TASK-547-06.
