# TASK-101-09-04-01: Action Registry, Dry-Run Diff, and Conflict Model
# FileName: TASK-101-09-04-01_Action_Registry_Dry_Run_Diff_and_Conflict_Model.md

**Priority:** High  
**Category:** Core/Assistant + Validation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-04  
**Status:** In Progress (2026-04-11)

---

## Overview

Kazda akcja musi miec jawny wpis w registry i preview path zwracajacy:
- resource target,
- expected mutation,
- conflicts,
- dependencies,
- warnings.

## Files to Change

- `core/services/assistant/actionRegistry.ts` (new, ~160-240 LOC)
- `core/services/assistant/actionDiffService.ts` (new, ~140-220 LOC)
- `core/services/assistant/actions/*` (new/update, ~200-360 LOC)
- `tests/vitest/assistant/action-registry.test.ts` (new, ~120-180 LOC)
- `tests/vitest/assistant/action-diff-service.test.ts` (new, ~120-180 LOC)

## Pseudocode

```ts
return {
  target: { kind: "content-type", id: slug },
  changeType: "upsert",
  before,
  after,
  conflicts: detectConflicts(before, after),
};
```

## Sub-Tasks

1. Register preview handlers for core action families.
2. Emit stable diff objects with machine-readable conflict codes.
3. Cover no-op and already-in-sync previews.

## Testing Requirements

- Vitest unit for registry lookup and unsupported action errors.
- Vitest unit for diff and conflict behavior.

## Documentation Updates Required

- `_docs/CMS_API.md`

## Audit Notes (2026-04-11)

- Dry-run diff objects are implemented through `actionDiffService`.
- Unsupported-action handling is covered by typed discriminated unions.
- Dedicated registry module and broader conflict-code model remain open.
