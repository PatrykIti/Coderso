# TASK-250-01-02: Binding-Aware Editor Controls for `screen-record-header` and `screen-field-value`
# FileName: TASK-250-01-02_Binding_Aware_Editor_Controls_for_Record_Header_and_Field_Value.md

**Priority:** High
**Category:** Coderso Custom Screens + Binding UX
**Estimated Effort:** Large
**Dependencies:** TASK-250-01-01
**Status:** To Do

---

## Overview

Make the widget editors for `screen-record-header` and `screen-field-value`
respect the fact that these widgets are `selected-entry` / binding-aware
surfaces instead of literal-only content forms.

This does not mean duplicating the current `FieldBindingPanel` contract inside
every widget editor. The binding panel remains the owner of `propPath -> field`
mapping state. This leaf improves the widget editors so they:

- expose clearer literal-vs-bound intent,
- surface which areas are typically driven by bindings,
- guide the user into the existing `Data` tab flow instead of forcing blind
  trial-and-error with plain text inputs.

The same pass must keep or improve the existing `clear` semantics for any
surface, border, badge, or similar style controls already owned by these
widgets.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `tests/vitest/widgets/screenEditorsBindingAware.test.tsx`

## Implementation Pseudocode

```tsx
function BindingFriendlyTextControl(props: {
  label: string;
  value: string;
  suggestedBindingPropPath?: string | null;
  bindingState: "literal" | "bound" | "mixed";
  onValueChange: (next: string) => void;
  onJumpToBindingPanel?: (propPath: string) => void;
}) {
  // show the literal value editor, current binding state, and a direct affordance
  // to focus the matching prop path in the existing FieldBindingPanel flow
}
```

```tsx
function focusEditorDataTab(input: {
  propPath: string;
  setActiveInspectorTab: (tab: "screen" | "data" | "widget") => void;
  setFocusedBindingPropPath: (propPath: string | null) => void;
}) {
  input.setActiveInspectorTab("data");
  input.setFocusedBindingPropPath(input.propPath);
}
```

```tsx
<ScreenRecordHeaderVisualEditor
  titleControl={<BindingFriendlyTextControl label="Title" suggestedBindingPropPath="title" ... />}
  subtitleControl={<BindingFriendlyTextControl label="Subtitle" suggestedBindingPropPath="subtitle" ... />}
  descriptionControl={<BindingFriendlyTextControl label="Description" suggestedBindingPropPath="description" ... />}
/>
```

```ts
function summarizeScreenWidgetBindingState(input: {
  widgetType: string;
  bindings: CustomScreenBinding[];
}) {
  return {
    title: findBindingForPropPath(input.bindings, "title"),
    subtitle: findBindingForPropPath(input.bindings, "subtitle"),
    description: findBindingForPropPath(input.bindings, "description"),
    badge: findBindingForPropPath(input.bindings, "badge"),
  };
}
```

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session.
- RBAC: screen widget configuration writes require `content:write`.
- CSRF: unchanged current screen-save path.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation:
  - editor controls remain backed by widget schema/defaults/normalizer owners,
  - binding-aware controls must not smuggle arbitrary unknown keys into widget
    data.
- Style-removal rule:
  - any touched color/border/chrome controls must support explicit `clear` /
    `none` behavior and continue to remove style keys rather than replacing them
    with placeholder sentinels.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - header/value editors expose visible binding-friendly affordances,
  - widget editors guide users toward the existing binding-panel flow instead of
    duplicating binding state management,
  - no invalid prop targets such as `align` or `style.*` reappear in the
    record-header flow,
  - touched style controls keep `clear` / `none` behavior.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. `screen-record-header` and `screen-field-value` no longer feel like
   literal-only widgets.
2. The widget editor layer complements the existing binding panel instead of
   reimplementing it.
3. The “jump to binding” affordance is wired to the real `Data` tab owner in
   `CustomScreenEditorPage`, not only mocked inside widget-local state.
4. Existing removable style controls stay removable through explicit `clear` /
   `none` semantics.
