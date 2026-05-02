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

## Sub-Tasks

No child task files.

## Files to Change

- `core/widgets/types.ts`
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- `core/admin/ui/custom-screens/FieldBindingPanel.tsx`
- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- optional new pure helper test if target resolution is extracted

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
export const screenRecordHeaderBindingTargets: WidgetBindingTarget[] = [
  { propPath: "eyebrow", label: "Eyebrow" },
  { propPath: "title", label: "Title" },
  { propPath: "subtitle", label: "Subtitle" },
  { propPath: "description", label: "Description" },
  { propPath: "badge", label: "Badge" },
];
```

```tsx
// FieldBindingPanel.tsx
const bindingTargets = resolveBindingTargets(selectedWidget, selectedBindings);

return (
  <div className="space-y-3">
    {bindingTargets.map((target) => {
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
);
```

If a persisted binding path is not in the declared target list, show it in a
separate `Custom bindings` section instead of dropping it.

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
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- Add assertions for:
  - `screen-record-header` exposes five target cards,
  - `screen-field-value` still exposes `value`, `label`, and `helper`,
  - a saved custom prop path still renders in compatibility mode,
  - widget-editor `Data` buttons and Data-tab cards stay aligned on the same
    target names.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/SCREEN_*` docs
- `_docs/_WIDGETS/README.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Bindable prop ownership lives in the widget contract instead of an ad-hoc
   local suggestion map.
2. The Data tab exposes cards for every declared bindable prop.
3. Existing custom prop paths remain editable and visible.
