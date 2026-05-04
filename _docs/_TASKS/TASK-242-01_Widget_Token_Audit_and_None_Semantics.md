# TASK-242-01: Widget Token Audit and None Semantics

# FileName: TASK-242-01_Widget_Token_Audit_and_None_Semantics.md

**Priority:** High
**Category:** Widgets + Contract Design
**Estimated Effort:** Medium
**Dependencies:** TASK-242
**Status:** Done (2026-04-29)

---

## Overview

Lock the exact token inventory and define what `none` means before touching the
widget implementation. The purpose is to avoid adding `none` to structural
fields while still covering all visual options that currently force a preset.

## Sub-Tasks

- [x] TASK-242-01-01: Widget Config Token Inventory
- [x] TASK-242-01-02: None Token Semantics and Compatibility Helpers

## Files to Change

- `_docs/_TASKS/TASK-242*.md`
- optional helper owner in `core/widgets/types.ts` or a new focused helper only
  if the implementation proves repeated enough

## Security Contract

- Visibility: internal planning and widget contract work.
- Auth model: no auth or endpoint change.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: define the schema allowlist before implementation.
- Anti-abuse: keep token validation strict so user-controlled strings cannot
  become arbitrary class names.

## Pseudocode

Inventory script shape:

```ts
for (const widgetFile of coreWidgetFiles) {
  for (const enumField of findSchemaEnums(widgetFile)) {
    classify(enumField, {
      visualOffCapable: isSpacingGapPaddingRadiusSizeOrWidth(enumField),
      alreadyOffCapable: enumField.values.includes("none") || enumField.values.includes("0"),
      structural: isColumnRatioSpanSourceVariantOrAlignment(enumField),
    });
  }
}
```

## Testing Requirements

- No runtime tests required for this planning subtask.
- `git diff --check` after task docs are edited.

## Documentation Updates Required

- Update TASK-242 inventory if the code scan finds additional candidate fields.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Candidate fields are grouped by implementation owner.
2. Excluded structural fields are documented.
3. Legacy `"0"` compatibility behavior is defined.
4. Implementers can proceed without rediscovering the widget token surface.
