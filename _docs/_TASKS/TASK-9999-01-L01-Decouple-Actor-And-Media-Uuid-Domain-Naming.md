# TASK-9999-01-L01: Decouple Actor and Media UUID Domain Naming

# FileName: TASK-9999-01-L01-Decouple-Actor-And-Media-Uuid-Domain-Naming.md

**Parent Task:** TASK-9999
**Parent Subtask:** TASK-9999-01
**Source Task:** TASK-540
**Priority:** Low
**Category:** Custom Screens / Domain Naming
**Estimated Effort:** Small
**Dependencies:** TASK-540 closure
**Status:** ⏳ To Do

---

## Overview

Actor identity validation currently calls `isScreenMediaAssetUuid`, although the shared
UUID grammar is correct for both domains. Introduce a neutrally named UUID-shape owner,
retain the media-specific predicate as a delegating compatibility API, and point actor
and `updatedBy` validation at the neutral predicate without changing accepted values,
error codes, storage, transport bytes, or the shared first-valid media selector.

## Exclusive Ownership

- `core/services/customScreens/screenMediaIdentity.ts`
- `core/services/customScreens/customScreenSchemas.ts`, only for the explicit public
  compatibility re-export
- `core/services/customScreens/screenEntryPresentationOverrideContract.ts`
- `core/services/customScreens/screenEntryPresentationOverrides.ts`
- `tests/vitest/admin/custom-screen-stored-read-repair.test.ts`
- `tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts`

Do not change routes, database schemas, migrations, payload fields, UUID canonicalization,
media resolution, or Admin UI.

## Security Contract

No endpoint or permission model changes. Existing internal session auth, RBAC, CSRF,
rate limits, reject-unknown payload validation, and machine-readable error mapping remain
byte-identical. The same case-insensitive UUID grammar must reject the same invalid actor
and media values; no value is logged, exposed, normalized to a different case, or stored
differently.

## Sub-Tasks

- [ ] Add one neutral UUID-shape predicate while retaining the media-named API.
- [ ] Move actor and `updatedBy` call sites to the neutral predicate.
- [ ] Preserve `firstScreenMediaAssetUuid` scalar/array selection and exact casing.
- [ ] Pin exact acceptance/rejection and byte-preservation parity in existing Vitest lanes.
- [ ] Run static checks, targeted tests, and diff validation.

## Implementation Pseudocode

```ts
const SCREEN_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value);

export function isScreenUuid(value: unknown): value is string {
  return typeof value === "string" && SCREEN_UUID.test(value);
}

// Compatibility/domain wrapper: media consumers retain their expressive API.
export function isScreenMediaAssetUuid(value: unknown): value is string {
  return isScreenUuid(value);
}

// Existing selector behavior and public name stay unchanged.
export function firstScreenMediaAssetUuid(value: unknown): string | null {
  if (isScreenMediaAssetUuid(value)) return value;
  if (!isUnknownArray(value)) return null;
  return value.find(isScreenMediaAssetUuid) ?? null;
}

const normalizeUpdatedBy = (value: unknown): string | null => {
  if (value === null) return null;
  if (!isScreenUuid(value)) throw invalidOverride();
  return value;
};

const normalizeActorId = (value: unknown): string => {
  if (!isScreenUuid(value)) {
    throw createOverrideError("custom_screen_override_invalid");
  }
  return value;
};
```

**Data flow:** external actor/media value -> the same UUID grammar -> the existing
domain-specific normalizer -> unchanged stored/transport value.

**Error handling:** preserve `custom_screen_override_invalid`, repository/transport
invalid-record behavior, `null` handling for `updatedBy`, uppercase acceptance, and
exact input case. Do not broaden accepted primitives or introduce coercion.

**Regression-test shape:** use one valid lowercase UUID, one valid uppercase UUID, and
the existing invalid corpus to prove `isScreenUuid` and `isScreenMediaAssetUuid` have
identical truth tables. Prove the first-valid selector retains scalar/array choice and
exact casing before and after the neutral rename. In the override suite, prove valid actor and `updatedBy` values
round-trip exactly and the same invalid values still fail with the same domain error.

## Testing Requirements

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `tsc -p tsconfig.json --noEmit`
- `bunx vitest run --config vitest.config.ts tests/vitest/admin/custom-screen-stored-read-repair.test.ts tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts`
- `git diff --check`

## Documentation Updates Required

- Record validation results and completion metadata in this leaf.
- Add this physical ID to the TASK-9999-01 closure changelog.
- Update TASK-9999-01 and TASK-9999 parent tables after closure; leave TASK-9999 In
  Progress.
