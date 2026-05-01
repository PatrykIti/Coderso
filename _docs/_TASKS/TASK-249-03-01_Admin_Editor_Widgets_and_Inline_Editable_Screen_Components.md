# TASK-249-03-01: Admin Editor Widgets and Inline Editable Screen Components
# FileName: TASK-249-03-01_Admin_Editor_Widgets_and_Inline_Editable_Screen_Components.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-249-01-01, TASK-249-02-01
**Status:** To Do

---

## Overview

Build the admin-editor widget layer needed for a real inline-editable record
canvas. The goal is to extend and harden the existing `screen-*` admin widget
contract into a real inline-editable record surface, not to replace it with an
unrelated parallel widget platform.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/EditorViewDesigner.tsx`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- `core/admin/ui/widgets/registry.ts`
- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `core/widgets/registry.ts`
- `core/widgets/types.ts`
- `core/widgets/core/index.ts`
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- new `core/widgets/core/screenEntry*.tsx` owner files only when the current
  `screen-*` contract cannot express the required inline editing behavior
- `tests/unit/widgets/registry.test.ts`
- `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`
- `tests/vitest/customScreens/bindingResolver.test.ts`

## Widget Contract

- `admin-editor-view` becomes the only palette surface for new V3 editor
  widgets.
- Extend the current `screen-record-header`, `screen-field-value`,
  `screen-field-group`, and `screen-two-column` contracts first.
- New editing widgets declare explicit selected-entry read/write data access.
- Legacy `custom-screen-builder` fallback is not used for new V3 create/edit
  insertions.
- The record canvas must support inline editing for:
  - title/header,
  - supported scalar fields,
  - media and gallery content,
  - supported relation summaries/selectors.
- Every newly introduced widget owner must include:
  - runtime/schema/defaults/normalizer ownership in `core/widgets/core/*`,
  - editor surfaces in `core/admin/ui/widgets/editors/ScreenEditors.tsx`,
  - registry wiring in `core/widgets/core/index.ts` and `core/widgets/registry.ts`.
- If any widget becomes module-facing instead of admin-only, update
  `core/widgets/modulePackMatrix.ts`, `_docs/WIDGET_PACK_MATRIX.md`, and the
  relevant `_docs/_WIDGETS/*` docs in the same slice. Otherwise document that
  the widget remains admin-only.

## Implementation Pseudocode

```ts
registerWidget({
  type: "screen-record-header",
  title: "Record Header",
  category: "Entry",
  surfaces: ["admin-editor-view"],
  dataAccess: {
    source: "selected-entry",
    modes: ["read", "write"],
  },
  schema: screenRecordHeaderSchema,
  defaults: screenRecordHeaderDefaults,
});
```

```tsx
function renderAdminEditorWidget(node: ScreenEditorNode) {
  switch (node.type) {
    case "screen-record-header":
      return <InlineRecordHeaderControl {...nodeProps} />;
    case "screen-field-value":
      return <InlineFieldValueControl {...nodeProps} />;
    default:
      return <WidgetRenderer block={node.block} />;
  }
}
```

## Security Contract

- Visibility: internal admin UI metadata and runtime only.
- Auth model: unchanged authenticated admin session.
- RBAC: widgets may read/write only through the existing selected-entry
  permission model.
- CSRF: downstream writes continue through existing entry clients.
- Rate-limit bucket: unchanged existing admin buckets for downstream mutations.
- Reject-unknown validation:
  - registered editor widgets keep schema/defaults/normalizer contracts,
  - admin-editor widgets must declare selected-entry read/write access
    explicitly,
  - public-only widgets remain hidden from the V3 editor palette.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/registry.test.ts`
- Vitest:
  - admin-editor palette shows the new inline widgets,
  - public-only widgets stay hidden,
  - binding resolver supports the new widget field model,
  - legacy `custom-screen-builder` widgets are not offered for new V3 insertions.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md` when any widget becomes module-facing
- relevant `_docs/_WIDGETS/*` docs
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. The editor palette exposes proper admin-entry widgets for inline editing.
2. New V3 screens no longer depend on legacy screen-widget fallbacks for create
   or edit insertions.
3. Widget surface ownership is explicit and test-covered.
