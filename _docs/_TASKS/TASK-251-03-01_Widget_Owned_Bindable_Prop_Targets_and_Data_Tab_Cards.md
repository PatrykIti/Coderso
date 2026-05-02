# TASK-251-03-01: Widget-Owned Bindable Prop Targets and Data-Tab Cards
# FileName: TASK-251-03-01_Widget_Owned_Bindable_Prop_Targets_and_Data_Tab_Cards.md

**Priority:** High
**Category:** Coderso Custom Screens + Widgets + Binding UX
**Estimated Effort:** Large
**Dependencies:** TASK-251-03
**Status:** To Do

---

## Overview

Move bindable-prop ownership into the widget contract and render Data-tab cards
from that source of truth.

Today the Data tab is driven by `preferredBindingPropPaths` plus path detection
from current defaults. That is too brittle for widgets whose meaningful
bindable fields outnumber the defaults currently surfaced in the panel. The
fix must make the widget contract explicit while remaining backward-compatible
with already-saved custom prop paths.

Scope decision for this leaf:

- `screen-record-header` and `screen-field-value` join the widget-owned
  selected-entry binding-target contract.
- `screen-field-group` and `screen-two-column` keep their current
  `selected-content-type` read-only layout contract and therefore do not expose
  entry binding cards in the Data tab unless their source docs and widget
  metadata are explicitly changed in the same slice.
- already-saved legacy blocks that remain editable through the current fallback
  registry path keep a manual compatibility editor when they do not declare
  widget-owned binding targets.

## Sub-Tasks

No child task files.

## Files to Change

- `core/widgets/types.ts`
- `core/widgets/registry.ts`
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- `tests/vitest/widgets/widgetRegistryBindingTargets.test.ts`

## Implementation Pseudocode

```ts
export type WidgetBindingTarget = {
  propPath: string;
  label: string;
  description?: string;
};

export type WidgetDefinition<T = Record<string, unknown>> = {
  // existing fields...
  bindingTargets?: WidgetBindingTarget[];
};

function normalizeBindingTargets(targets: WidgetBindingTarget[] | undefined) {
  return (targets ?? []).map((target) => ({
    propPath: target.propPath.trim(),
    label: target.label.trim(),
    description: target.description?.trim() || undefined,
  }));
}
```

```ts
export const screenRecordHeaderBindingTargets: WidgetBindingTarget[] = [
  { propPath: "eyebrow", label: "Eyebrow" },
  { propPath: "title", label: "Title" },
  { propPath: "subtitle", label: "Subtitle" },
  { propPath: "description", label: "Description" },
  { propPath: "badge", label: "Badge" },
];
```

```tsx
// CustomScreenEditorPage.tsx
<FieldBindingPanel
  selectedBlock={selectedBlock}
  selectedWidget={selectedWidget ?? null}
  value={bindings}
  fields={contentFields}
  focusedPropPath={focusedBindingPropPath}
  onFocusedPropPathChange={setFocusedBindingPropPath}
  onChange={setBindings}
/>
```

```tsx
// FieldBindingPanel.tsx
const panelModel = resolveBindingPanelModel({
  selectedWidget,
  selectedBlock,
  selectedBindings,
});

return panelModel.mode === "declared-targets" ? (
  <div className="space-y-3">
    {panelModel.targets.map((target) => {
      const existing = selectedBindings.find((binding) => binding.propPath === target.propPath) ?? null;
      return (
        <div key={target.propPath} data-prop-path={target.propPath} className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{target.label}</p>
              <p className="text-xs text-muted-foreground">{target.propPath}</p>
            </div>
            {existing ? (
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeBinding(existing.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => addBinding(target.propPath)}>
                Add binding
              </Button>
            )}
          </div>
          {/* field + mode controls for existing or newly created binding */}
        </div>
      );
    })}
  </div>
) : panelModel.mode === "legacy-manual" ? (
  <LegacyBindingEditor
    selectedBindings={selectedBindings}
    propPathSuggestions={panelModel.suggestedPaths}
    onAddBinding={addBinding}
    onUpdateBinding={updateBinding}
  />
) : (
  <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
    This widget exposes layout and content-type settings only. Entry field bindings are not available here.
  </div>
);
```

If a persisted binding path is not in the declared target list, show it in a
separate `Custom bindings` section instead of dropping it.

Do not make `FieldBindingPanel` reach back into the global widget registry with
only a block type string unless that ownership is made explicit in the same
slice. The execution-ready path here is: `CustomScreenEditorPage` resolves the
active widget once, then passes that owner into the panel. Registry
normalization must preserve the declared `bindingTargets` so the panel and the
widget editors read the same contract after registration, not only before it.
To keep the leaf execution-ready, implement `resolveBindingPanelModel()` before
rewiring render branches so the panel can decide between declared-target cards,
legacy manual mode, and layout-only read-only mode from one explicit owner.
Preserved legacy blocks are the only exception: when the selected block remains
editable through the current fallback registry path but exposes no
`bindingTargets`, the panel should stay in manual compatibility mode instead of
dropping existing bindings.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged authenticated admin session.
- RBAC: unchanged `content:write` for persisted binding changes.
- CSRF: no new write route.
- Rate-limit bucket: unchanged `admin_write` for screen saves.
- Reject-unknown validation:
  - binding-target metadata extends widget definitions only,
  - persisted bindings still pass through the current Custom Screen definition
    schema and route validation.
- Anti-abuse: no public route or weakened validation contract is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/widgetRegistryBindingTargets.test.ts`
- Add assertions for:
  - `screen-record-header` exposes five target cards,
  - `screen-field-value` still exposes `value`, `label`, and `helper`,
  - `screen-field-group` and `screen-two-column` render the non-bindable layout
    empty state unless their documented contract changes in the same slice,
  - a saved custom prop path still renders in compatibility mode,
  - a preserved legacy widget keeps manual binding editability even without
    widget-owned `bindingTargets`,
  - `CustomScreenEditorPage` passes the resolved selected widget into the panel
    and the panel consumes that owner directly,
  - registry-level normalization preserves `bindingTargets` metadata for
    `screen-record-header` and `screen-field-value`,
  - widget-editor `Data` buttons and Data-tab cards stay aligned on the same
    target names,
  - `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
    owns the mounted jump/focus proof for the selected-widget to `Data` tab flow,
  - `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
    continues to prove legacy widget preservation in the editor surface.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md`
- `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md`
- `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- `_docs/_WIDGETS/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Bindable prop ownership lives in the widget contract instead of an ad-hoc
   local suggestion map.
2. The Data tab exposes cards for every declared bindable prop.
3. Existing custom prop paths remain editable and visible.
4. Preserved legacy blocks do not lose manual binding editability while the
   fallback registry path still exists.
