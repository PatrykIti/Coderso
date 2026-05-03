# TASK-251-03: Binding Panel Prop Coverage and Prop-Centric Cards
# FileName: TASK-251-03_Binding_Panel_Prop_Coverage_and_Prop_Centric_Cards.md

**Priority:** High
**Category:** Coderso Custom Screens + Bindings + Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-250, TASK-251
**Status:** To Do

---

## Overview

Strengthen the Data tab so it reflects the actual bindable prop surface of the
selected widget instead of relying on a partial local suggestion list plus
generic `Binding N` cards.

This follow-up should make the binding flow prop-first:

- only widgets whose contract is explicitly `selected-entry` own bindable
  record props,
- the Data tab renders cards/rows for those props,
- already-saved legacy blocks that still survive through the current fallback
  registry path keep a manual compatibility mode instead of becoming
  non-editable,
- existing persisted bindings outside the declared target list remain visible as
  compatibility rows instead of silently disappearing.

## Sub-Tasks

- [ ] TASK-251-03-01: Widget-Owned Bindable Prop Targets and Data-Tab Cards

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- `core/admin/ui/widgets/registry.ts` as the admin consumer seam that exposes
  registered widget metadata to the picker, selected-widget resolution, and
  mounted UI tests
- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `core/widgets/types.ts`
- `core/widgets/registry.ts`
- `core/widgets/core/index.ts` as the actual owner seam where core widget
  metadata is attached during registration
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- `core/widgets/runtime.tsx` as a reference seam for the runtime registration
  contract proven by the Bun comparison smoke
- `tests/unit/widgets/registry.test.ts`
- `tests/unit/widgets/runtimeRegistry.test.ts`
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `tests/vitest/widgets/screenEditorsBindingAware.test.tsx`

## New Files to Create

- `tests/vitest/widgets/widgetRegistryBindingTargets.test.ts`

## Product Contract

1. The Data tab must expose all supported bindable prop paths for the selected
   widget.
2. Binding cards must be labeled by prop label / prop path, not by ordinal
   position.
3. Existing persisted custom prop paths that are not part of the declared
   widget target list must remain editable under a compatibility section.
4. `CustomScreenEditorPage` remains the owner of the resolved selected widget
   and must pass that resolved metadata plus an explicit ownership signal
   (`screen-registry` vs `legacy-fallback`) into the Data tab instead of
   forcing `FieldBindingPanel` to rediscover registry state on its own.
5. If the selected block is preserved only through the current legacy fallback
   widget registry path and does not declare widget-owned binding targets, the
   panel must keep a manual binding editor for that block instead of collapsing
   into a non-bindable empty state.
6. `screen-field-group` and `screen-two-column` remain layout widgets with the
   current `selected-content-type` read-only contract. Their `title`,
   `description`, `leftTitle`, and `rightTitle` stay in widget settings and do
   not become selected-entry binding cards in the Data tab.
7. Widget settings and Data-tab suggestions must read from the same
   widget-owned target contract so they do not drift.

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
function listSelectedWidgetBindingTargets(input: {
  widget: WidgetDefinition | null;
  existingBindings: CustomScreenBinding[];
}) {
  if (input.widget?.dataAccess?.source !== "selected-entry") {
    return [];
  }

  const declared = input.widget?.bindingTargets ?? [];
  const existingCustomOnly = input.existingBindings
    .filter((binding) => !declared.some((target) => target.propPath === binding.propPath))
    .map((binding) => ({
      propPath: binding.propPath,
      label: binding.propPath,
      description: "Existing custom binding path",
    }));

  return [...declared, ...existingCustomOnly];
}
```

```ts
type BindingPanelModel =
  | { mode: "declared-targets"; targets: WidgetBindingTarget[] }
  | { mode: "legacy-manual"; suggestedPaths: string[] }
  | { mode: "layout-read-only" };

function resolveBindingPanelModel(input: {
  selectedWidget: WidgetDefinition | null;
  selectedWidgetSource: "screen-registry" | "legacy-fallback" | null;
  selectedBlock: Block | null;
  selectedBindings: CustomScreenBinding[];
}) {
  if (input.selectedWidget?.dataAccess?.source === "selected-entry") {
    return {
      mode: "declared-targets",
      targets: listSelectedWidgetBindingTargets({
        widget: input.selectedWidget,
        existingBindings: input.selectedBindings,
      }),
    } satisfies BindingPanelModel;
  }

  if (input.selectedWidgetSource === "legacy-fallback") {
    return {
      mode: "legacy-manual",
      suggestedPaths: collectBindingPropPaths(input.selectedBlock?.data ?? {}),
    } satisfies BindingPanelModel;
  }

  return { mode: "layout-read-only" } satisfies BindingPanelModel;
}
```

```tsx
<FieldBindingPanel
  selectedBlock={selectedBlock}
  selectedWidget={selectedWidget ?? null}
  selectedWidgetSource={selectedWidgetSource}
  value={bindings}
  fields={contentFields}
  onChange={setBindings}
/>
```

```tsx
{bindingTargets.map((target) => {
  const binding = selectedBindings.find((item) => item.propPath === target.propPath) ?? null;
  return (
    <BindingTargetCard
      key={target.propPath}
      title={target.label}
      propPath={target.propPath}
      description={target.description}
      binding={binding}
      onAdd={() => addBinding(target.propPath)}
      onChange={(patch) => updateBinding(binding!.id, patch)}
    />
  );
})}
```

Execution notes for the implementer:

- The selected-entry versus selected-content-type contract is not owned by a
  UI-only map. Extend `WidgetDefinition` in `core/widgets/types.ts`, preserve it
  through normalization in `core/widgets/registry.ts`, and attach the concrete
  screen-widget metadata in `core/widgets/core/index.ts` alongside the existing
  `surfaces` and `dataAccess` fields.
- `core/admin/ui/widgets/registry.ts` and `core/widgets/runtime.tsx` are
  consumption seams. They should continue to surface the same widget-owned
  contract after registration; do not duplicate `selected-entry` versus
  `selected-content-type` branching in `FieldBindingPanel` or other UI-only
  helper maps.
- When rewiring the Data tab, keep the explicit ownership split visible in
  `CustomScreenEditorPage`: `screenWidgetRegistry` remains the primary source
  for current screen widgets, while the merged fallback path preserves already
  saved legacy blocks.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged authenticated admin session.
- RBAC: saving binding changes remains `content:write` through existing Custom
  Screen saves.
- CSRF: no new write route.
- Rate-limit bucket: unchanged `admin_write` for screen saves.
- Reject-unknown validation:
  - widget-owned binding-target metadata must not weaken widget schemas,
  - persisted bindings remain normalized through the current Custom Screen
    definition schema.
- Anti-abuse: no public route or public payload is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/registry.test.ts`
- `bun test tests/unit/widgets/runtimeRegistry.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/widgetRegistryBindingTargets.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenWidgets.test.tsx` when `CustomScreenPreview.tsx` or the core `screen-*` widget render/normalization files move in the same slice
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/styleNoneTokens.test.tsx` when `screen-two-column` normalization or style keys change
- The Bun suites above remain the current registry-owner comparison smoke until
  the new Vitest binding-target suite is introduced and the lane cutover is
  made explicit in the same slice.
- Add assertions for:
  - all declared bindable props for `screen-record-header` render in Data,
  - cards are labeled by prop name/path instead of `Binding 1`,
  - an existing unknown prop path remains visible as a compatibility row,
  - a preserved legacy widget without `bindingTargets` metadata keeps a manual
    compatibility editor instead of a non-bindable empty state,
  - `CustomScreenEditorPage` passes the resolved selected widget into the Data
    tab instead of requiring registry re-resolution in the panel,
  - registry normalization preserves widget-owned `bindingTargets` for
    `admin-editor-view` widgets and keeps layout-only widgets out of the
    selected-entry binding contract,
  - `screen-field-group` and `screen-two-column` no longer surface selected-entry
    binding cards unless their documented data-access contract changes in the
    same slice,
  - `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx` still
    proves legacy widget preservation in the picker/selected-widget flow,
  - `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
    proves the mounted `Data` tab jump/focus flow and must be extended, or
    paired with adjacent mounted coverage, if this slice rewires the page-level
    selected-widget handoff inside `CustomScreenEditorPage`,
  - widget-editor `Data` jump buttons still target the same declared prop paths.

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

1. The Data tab shows full bindable prop coverage for the selected widget.
2. Binding cards are prop-centric instead of ordinal.
3. Widget editors and the Data tab share one binding-target contract.
