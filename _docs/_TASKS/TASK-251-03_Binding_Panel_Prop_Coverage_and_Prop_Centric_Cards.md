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
- existing persisted bindings outside the declared target list remain visible as
  compatibility rows instead of silently disappearing.

## Sub-Tasks

- [ ] TASK-251-03-01: Widget-Owned Bindable Prop Targets and Data-Tab Cards

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `core/widgets/types.ts`
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- additional widget metadata tests if a shared helper is extracted

## Product Contract

1. The Data tab must expose all supported bindable prop paths for the selected
   widget.
2. Binding cards must be labeled by prop label / prop path, not by ordinal
   position.
3. Existing persisted custom prop paths that are not part of the declared
   widget target list must remain editable under a compatibility section.
4. `CustomScreenEditorPage` remains the owner of the resolved selected widget
   and must pass that resolved metadata into the Data tab instead of forcing
   `FieldBindingPanel` to rediscover registry state on its own.
5. `screen-field-group` and `screen-two-column` remain layout widgets with the
   current `selected-content-type` read-only contract. Their `title`,
   `description`, `leftTitle`, and `rightTitle` stay in widget settings and do
   not become selected-entry binding cards in the Data tab.
6. Widget settings and Data-tab suggestions must read from the same
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

```tsx
<FieldBindingPanel
  selectedBlock={selectedBlock}
  selectedWidget={selectedWidget ?? null}
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
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- Add assertions for:
  - all declared bindable props for `screen-record-header` render in Data,
  - cards are labeled by prop name/path instead of `Binding 1`,
  - an existing unknown prop path remains visible as a compatibility row,
  - `CustomScreenEditorPage` passes the resolved selected widget into the Data
    tab instead of requiring registry re-resolution in the panel,
  - `screen-field-group` and `screen-two-column` no longer surface selected-entry
    binding cards unless their documented data-access contract changes in the
    same slice,
  - widget-editor `Data` jump buttons still target the same declared prop paths.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/SCREEN_*` files when bindable prop targets become
  explicit source-of-truth metadata
- `_docs/_WIDGETS/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. The Data tab shows full bindable prop coverage for the selected widget.
2. Binding cards are prop-centric instead of ordinal.
3. Widget editors and the Data tab share one binding-target contract.
