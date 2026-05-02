# TASK-250-01-01: Distinct Wizard, Visual, and Advanced Flows for `screen-*`
# FileName: TASK-250-01-01_Distinct_Wizard_Visual_and_Advanced_Flows_for_Screen_Widgets.md

**Priority:** High
**Category:** Coderso Custom Screens + Widget Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-250-01
**Status:** To Do

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
- `core/widgets/core/index.ts`
- `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`
- new `tests/vitest/widgets/screenEditorsModeParity.test.tsx`

## Implementation Pseudocode

```tsx
export function ScreenRecordHeaderWizardEditor(props) {
  // fast onboarding: choose variant, pick which bound content areas are visible,
  // set a compact starter chrome, and surface "next step" guidance
}

export function ScreenRecordHeaderVisualEditor(props) {
  // content + variant + surface controls with concrete preview-oriented affordances
}

export function ScreenRecordHeaderAdvancedEditor(props) {
  // low-level style/layout switches and any expert-only overrides
}
```

```ts
registerWidget({
  ...screenRecordHeaderDef,
  editor: {
    wizard: ScreenRecordHeaderWizardEditor,
    visual: ScreenRecordHeaderVisualEditor,
    advanced: ScreenRecordHeaderAdvancedEditor,
  },
});
```

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
    clear behavior.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Mode separation for `screen-*` is observable and test-covered.
2. Screen widget editors stop aliasing one shared component across all modes.
