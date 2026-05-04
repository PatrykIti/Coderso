# TASK-250-01-01: Distinct Wizard, Visual, and Advanced Flows for `screen-*`
# FileName: TASK-250-01-01_Distinct_Wizard_Visual_and_Advanced_Flows_for_Screen_Widgets.md

**Priority:** High
**Category:** Coderso Custom Screens + Widget Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-250-01
**Status:** Done
**Completed:** 2026-05-02

---

## Overview

Replace the current aliasing of `wizard`, `visual`, and `advanced` for
`screen-record-header`, `screen-field-value`, `screen-field-group`, and
`screen-two-column` with distinct flows that match the shared widget editor
contract more closely.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`
- new `tests/vitest/widgets/screenEditorsModeParity.test.tsx`

## Implementation Pseudocode

```tsx
export function ScreenRecordHeaderWizardEditor(props) {
  // fast onboarding: choose a starter variant, decide which major content
  // regions are present, and surface a clear next step into Visual
}

export function ScreenRecordHeaderVisualEditor(props) {
  // content + variant + style controls with the main product-facing editing
  // affordances exposed here
}

export function ScreenRecordHeaderAdvancedEditor(props) {
  // low-level tokens, expert-only overrides, and any validation-heavy options
}
```

```ts
function registerScreenWidgetEditors() {
  return {
    recordHeader: {
      wizard: ScreenRecordHeaderWizardEditor,
      visual: ScreenRecordHeaderVisualEditor,
      advanced: ScreenRecordHeaderAdvancedEditor,
    },
    fieldValue: {
      wizard: ScreenFieldValueWizardEditor,
      visual: ScreenFieldValueVisualEditor,
      advanced: ScreenFieldValueAdvancedEditor,
    },
    fieldGroup: {
      wizard: ScreenFieldGroupWizardEditor,
      visual: ScreenFieldGroupVisualEditor,
      advanced: ScreenFieldGroupAdvancedEditor,
    },
    twoColumn: {
      wizard: ScreenTwoColumnWizardEditor,
      visual: ScreenTwoColumnVisualEditor,
      advanced: ScreenTwoColumnAdvancedEditor,
    },
  };
}
```

```ts
const modeParityMatrix = [
  {
    widget: "screen-record-header",
    wizard: ["variant choice", "visible content areas", "next-step hint"],
    visual: ["content", "surface styling", "preview-oriented controls"],
    advanced: ["expert overrides", "raw token controls"],
  },
  // repeat for field-value / field-group / two-column
];
```

The live aliasing seam today is the direct export mapping in
`ScreenEditors.tsx`. Keep registry wiring unchanged unless the implementation
needs a new editor capability flag or a different shared editor-contract shape.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session.
- RBAC: widget configuration writes require `content:write`.
- CSRF: unchanged current screen-save path.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: all edited values still pass through the shared
  widget schema and normalizer.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - each touched screen widget exposes distinct `wizard`, `visual`, and
    `advanced` outputs/controls,
  - mode-specific controls are asserted instead of only checking shared style
    clear behavior,
  - regression tests verify that `wizard`, `visual`, and `advanced` are no
    longer aliases of the same component export.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- create/update `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md` if missing
- create/update `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md` if missing
- create/update `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md` if missing
- `_docs/_WIDGETS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Mode separation for `screen-*` is observable and test-covered.
2. Screen widget editors stop aliasing one shared component across all modes.
3. The implementer can map which controls belong to each mode without
   rediscovering the split during coding.
