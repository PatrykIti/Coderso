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
- `screen-field-value` keeps the current per-prop mode split: `value` remains
  read/write, while `label` and `helper` remain read-only until the
  dedicated-editor/runtime contract is explicitly widened in the same slice.
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
- `core/widgets/core/index.ts` as the actual owner seam where core screen-widget
  metadata is attached during registration
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- `core/admin/ui/widgets/registry.ts` as the admin consumer seam for
  `getRegisteredWidget()` / `listRegisteredWidgetsForSurface()`
- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `core/widgets/runtime.tsx` as a reference seam for the runtime registration
  contract proven by Bun comparison smoke
- `tests/unit/widgets/registry.test.ts`
- `tests/unit/widgets/runtimeRegistry.test.ts`
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
- `tests/vitest/widgets/screenEditorsBindingAware.test.tsx`

## New Files to Create

- `tests/vitest/widgets/widgetRegistryBindingTargets.test.ts`

## Implementation Pseudocode

```ts
export type WidgetBindingTarget = {
  propPath: string;
  label: string;
  description?: string;
  modes?: Array<"read" | "write">;
};

export type WidgetDefinition<T = Record<string, unknown>> = {
  // existing fields...
  bindingTargets?: WidgetBindingTarget[];
};

function normalizeBindingTargets(
  targets: WidgetBindingTarget[] | undefined,
  widgetModes: Array<"read" | "write">
) {
  const seen = new Set<string>();
  return (targets ?? []).map((target) => {
    const propPath = target.propPath.trim();
    const label = target.label.trim();
    if (!propPath || !label) {
      throw new Error("widget_binding_target_invalid");
    }
    if (seen.has(propPath)) {
      throw new Error("widget_binding_target_duplicate");
    }
    seen.add(propPath);

    const requestedModes = target.modes ?? widgetModes;
    const modes = Array.from(
      new Set(requestedModes.filter((mode) => widgetModes.includes(mode)))
    );
    if (modes.length === 0) {
      throw new Error("widget_binding_target_modes_invalid");
    }

    return {
      propPath,
      label,
      description: target.description?.trim() || undefined,
      modes,
    };
  });
}
```

```ts
export const screenRecordHeaderBindingTargets: WidgetBindingTarget[] = [
  { propPath: "eyebrow", label: "Eyebrow", modes: ["read"] },
  { propPath: "title", label: "Title", modes: ["read"] },
  { propPath: "subtitle", label: "Subtitle", modes: ["read"] },
  { propPath: "description", label: "Description", modes: ["read"] },
  { propPath: "badge", label: "Badge", modes: ["read"] },
];

export const screenFieldValueBindingTargets: WidgetBindingTarget[] = [
  { propPath: "label", label: "Label", modes: ["read"] },
  { propPath: "value", label: "Value", modes: ["read", "write"] },
  { propPath: "helper", label: "Helper", modes: ["read"] },
];
```

```tsx
// CustomScreenEditorPage.tsx
<FieldBindingPanel
  selectedBlock={selectedBlock}
  selectedWidget={selectedWidget ?? null}
  selectedWidgetSource={selectedWidgetSource}
  value={bindings}
  fields={contentFields}
  focusedPropPath={focusedBindingPropPath}
  onFocusedPropPathChange={setFocusedBindingPropPath}
  onChange={setBindings}
/>
```

```tsx
// FieldBindingPanel.tsx
function resolveBindingPanelModel({
  selectedWidget,
  selectedWidgetSource,
  selectedBlock,
  selectedBindings,
}: {
  selectedWidget: WidgetDefinition | null;
  selectedWidgetSource: "screen-registry" | "legacy-fallback" | null;
  selectedBlock: Block | null;
  selectedBindings: CustomScreenBinding[];
}) {
  if (selectedWidget?.dataAccess?.source === "selected-entry") {
    return {
      mode: "declared-targets" as const,
      targets: listSelectedWidgetBindingTargets({
        widget: selectedWidget,
        existingBindings: selectedBindings,
      }),
    };
  }

  if (selectedWidgetSource === "legacy-fallback") {
    return {
      mode: "legacy-manual" as const,
      suggestedPaths: collectBindingPropPaths(selectedBlock?.data ?? {}),
    };
  }

  return { mode: "layout-read-only" as const };
}

const panelModel = resolveBindingPanelModel({
  selectedWidget,
  selectedWidgetSource,
  selectedBlock,
  selectedBindings,
});

function resolveAllowedBindingModes(input: {
  target: WidgetBindingTarget;
  field: BindingFieldOption | null;
}) {
  const canWrite =
    input.target.modes?.includes("write") === true && input.field?.writable === true;
  return canWrite ? modeOptions : modeOptions.filter((option) => option.value === "read");
}

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
active widget once, then passes that owner plus an explicit
`selectedWidgetSource` signal into the panel. Registry normalization must
preserve the declared `bindingTargets` so the panel and the widget editors read
the same contract after registration, not only before it. To keep the leaf
execution-ready, implement `resolveBindingPanelModel()` before rewiring render
branches so the panel can decide between declared-target cards, legacy manual
mode, and layout-only read-only mode from one explicit owner. Preserved legacy
blocks are the only exception: when the selected block remains editable through
the current fallback registry path but exposes no `bindingTargets`, the panel
should stay in manual compatibility mode instead of dropping existing bindings.
Layout widgets that remain on `selected-content-type` must resolve to the
read-only state even if their defaults contain writable-looking string fields.
Target-level modes are the per-prop contract inside that broader widget owner:
`WidgetDefinition.dataAccess.modes` remains the widget-level ceiling, while
`bindingTargets[].modes` narrows individual prop paths. Under the current live
contract this means `screen-record-header` remains read-only and
`screen-field-value` keeps `value` as the only write-capable target in the
dedicated record editor. Do not widen `label` or `helper` into writable
record-editor paths unless `CustomScreenEntryCanvas` and dedicated-editor
capability ownership move in the same slice.

Actual owner seam notes:

- Add `bindingTargets` to `WidgetDefinition` and preserve it during
  normalization in `core/widgets/registry.ts`, but attach the concrete
  screen-widget metadata in `core/widgets/core/index.ts`, where the repo
  already materializes `surfaces` and `dataAccess` for `screen-*` widgets
  during `createCoreWidgetDefinitions()`.
- Treat `core/admin/ui/widgets/registry.ts` and `core/widgets/runtime.tsx` as
  consumption seams that must keep surfacing the same registered contract. Do
  not replace the core-widget owner with a new UI-local `preferredBinding*`
  map.
- The mounted page seam is the existing `screenWidgetRegistry` plus legacy
  fallback merge in `CustomScreenEditorPage`. `selectedWidgetSource` should be
  derived from that real merge, not reconstructed inside `FieldBindingPanel`.

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
- `bun test tests/unit/widgets/registry.test.ts`
- `bun test tests/unit/widgets/runtimeRegistry.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/widgetRegistryBindingTargets.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenWidgets.test.tsx` when the touched `screen-*` widget files also move their render or preview-bridge behavior
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/styleNoneTokens.test.tsx` when `screen-two-column` normalization or style keys change
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/customScreens/capabilities.test.ts` when the set of write-capable `screen-field-value` targets or dedicated-editor support rules changes
- The Bun suites above stay as current registry-owner comparison smoke while the
  new Vitest binding-target suite is introduced in this slice.
- Add assertions for:
  - `screen-record-header` exposes five target cards and keeps them read-only,
  - `screen-field-value` still exposes `value`, `label`, and `helper`, but only
    `value` remains write-capable under the current dedicated-editor contract,
  - `screen-field-group` and `screen-two-column` render the non-bindable layout
    empty state unless their documented contract changes in the same slice,
  - a saved custom prop path still renders in compatibility mode,
  - a preserved legacy widget keeps manual binding editability even without
    widget-owned `bindingTargets`,
  - `CustomScreenEditorPage` passes the resolved selected widget plus the
    explicit ownership/fallback signal into the panel and the panel consumes
    that owner directly,
  - registry-level normalization preserves `bindingTargets` metadata for
    `screen-record-header` and `screen-field-value`,
  - widget-editor `Data` buttons and Data-tab cards stay aligned on the same
    target names,
  - `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
    keeps mounted `CustomScreenEntryEditor` screen-widget binding/render
    compatibility covered when shared widget metadata changes flow into the
    record-editor surface,
  - `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
    proves the mounted jump/focus flow and must be extended, or paired with
    adjacent mounted coverage, if this leaf rewires the page-level selected
    widget handoff in `CustomScreenEditorPage`,
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
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Bindable prop ownership lives in the widget contract instead of an ad-hoc
   local suggestion map.
2. The Data tab exposes cards for every declared bindable prop.
3. Existing custom prop paths remain editable and visible.
4. Preserved legacy blocks do not lose manual binding editability while the
   fallback registry path still exists.
