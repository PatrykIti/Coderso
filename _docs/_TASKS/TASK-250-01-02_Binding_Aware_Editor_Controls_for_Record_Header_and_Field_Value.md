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

Because `screen-*` editors are mounted through the shared `BlockSettings` and
builder panel stack, this leaf must extend that shared editor-prop seam
additively. The implementation should not invent screen-local props that only
`ScreenEditors.tsx` can see.

The same pass must keep or improve the existing `clear` semantics for any
surface, border, badge, or similar style controls already owned by these
widgets.

## Sub-Tasks

No child task files.

## Files to Change

- `core/widgets/types.ts`
- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/admin/ui/pages/builder/WizardPanel.tsx`
- `core/admin/ui/pages/builder/VisualPanel.tsx`
- `core/admin/ui/pages/builder/AdvancedPanel.tsx`
- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- new `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`

## Implementation Pseudocode

```ts
type WidgetEditorContext = {
  surface: WidgetSurface;
  jumpToBindingPropPath?: (propPath: string) => void;
  getBindingState?: (propPath: string) => "literal" | "bound" | "mixed";
};

type WidgetEditorProps<T> = {
  value: T;
  onChange: (next: T) => void;
  variant: string;
  onVariantChange?: (next: string) => void;
  context?: WidgetEditorContext;
};
```

```tsx
function buildAdminEditorViewContext(input: {
  activeInspectorTab: "screen" | "data" | "widget";
  setActiveInspectorTab: (tab: "screen" | "data" | "widget") => void;
  focusedBindingPropPath: string | null;
  setFocusedBindingPropPath: (propPath: string | null) => void;
  bindings: CustomScreenBinding[];
  selectedBlockId: string | null;
}) {
  return {
    surface: "admin-editor-view",
    jumpToBindingPropPath: (propPath: string) => {
      input.setActiveInspectorTab("data");
      input.setFocusedBindingPropPath(propPath);
    },
    getBindingState: (propPath: string) =>
      resolveBindingState(input.bindings, input.selectedBlockId, propPath),
  } satisfies WidgetEditorContext;
}
```

```tsx
const [activeInspectorTab, setActiveInspectorTab] = useState<"screen" | "data" | "widget">(
  "screen"
);
const [focusedBindingPropPath, setFocusedBindingPropPath] = useState<string | null>(null);

<Tabs value={activeInspectorTab} onValueChange={(next) => setActiveInspectorTab(next as typeof activeInspectorTab)}>
  <TabsContent value="data">
    <FieldBindingPanel
      focusedPropPath={focusedBindingPropPath}
      onFocusedPropPathChange={setFocusedBindingPropPath}
      ...
    />
  </TabsContent>
</Tabs>
```

```tsx
function BindingFriendlyTextControl(props: {
  label: string;
  value: string;
  suggestedBindingPropPath?: string | null;
  bindingState: "literal" | "bound" | "mixed";
  onValueChange: (next: string) => void;
  onJumpToBindingPanel?: (propPath: string) => void;
}) {
  // show current literal value + binding badge
  // when editor context is missing, render the literal control only
  // do not create or mutate bindings implicitly from this button
}
```

```ts
function resolveBindingState(
  bindings: CustomScreenBinding[];
  selectedBlockId: string | null;
  propPath: string
) {
  const binding = bindings.find(
    (entry) => entry.widgetId === selectedBlockId && entry.propPath === propPath
  );
  return binding ? "bound" : "literal";
}

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

```tsx
<FieldBindingPanel
  selectedBlock={selectedBlock}
  focusedPropPath={focusedBindingPropPath}
  onFocusedPropPathChange={setFocusedBindingPropPath}
  ...
/>
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
  - shared builder panels pass optional editor context only for
    `admin-editor-view`, while non-screen surfaces still mount without binding
    context,
  - `CustomScreenEditorPage` owns the inspector tab as controlled state so a
    jump action can deterministically activate `data`,
  - header/value editors expose visible binding-friendly affordances,
  - widget editors guide users toward the existing binding-panel flow instead of
    duplicating binding state management,
  - “jump to binding” focuses the real `Data` tab and prop-path owner in
    `CustomScreenEditorPage` / `FieldBindingPanel`,
  - page-level handoff from selected widget settings into the `Data` tab is
    covered by a happy-dom/ui-integration flow instead of only by static page
    rendering,
  - no invalid prop targets such as `align` or `style.*` reappear in the
    record-header flow,
  - touched style controls keep `clear` / `none` behavior.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- create/update `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md` if missing
- create/update `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md` if missing
- `_docs/_WIDGETS/README.md`
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
5. The shared widget editor contract remains additive: non-screen surfaces can
   keep omitting binding-aware context without breaking editor mounting.
