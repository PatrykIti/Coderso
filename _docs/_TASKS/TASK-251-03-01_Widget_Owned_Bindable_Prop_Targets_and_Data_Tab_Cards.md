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
- `core/widgets/core/screenFieldGroup.tsx` and
  `core/widgets/core/screenTwoColumn.tsx` as reference seams only when this
  leaf actually changes their layout-only data-access metadata or non-bindable
  guidance
- `core/services/customScreens/capabilities.ts`
- `core/services/customScreens/bindingResolver.ts` as the current shared owner
  for widget-binding reads/writes and writable-field derivation
- `core/services/customScreens/customScreenSchemas.ts`
- `core/services/customScreens/customScreenService.ts` when save-time
  definition rejection or persistence-path error handling changes
- `core/server/routes/customScreenRoutes.ts` when the leaf changes
  `custom_screen_definition_invalid` mapping or the write-route boundary proof
- `core/server/validation/assistantActionSchemas.ts` only when assistant action
  payload shape changes in the same slice; assistant custom-screen summary
  normalization remains owned by `adminContextService.ts` /
  `adminContextCatalogNormalizer.ts`
- `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx` as the current
  runtime owner of the dedicated-editor write seam for
  `screen-field-value.value`
- `core/admin/ui/custom-screens/customScreenEntryDraft.ts`
- `core/admin/ui/custom-screens/assistantSurface.ts`
- `core/services/assistant/adminContextService.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- `core/admin/ui/custom-screens/customScreenListModel.ts`
- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx` when dedicated
  editor readiness labels or workspace gating change with the same slice
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` when route-level
  workspace gating, preview-only copy, or writable-binding summaries change
- `core/admin/ui/navigation/sidebarConfig.ts` when
  `supportsDedicatedEditor` changes Custom Screen sidebar shortcut gating
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
- `tests/vitest/ui/custom-screen-entry-draft.test.ts`
- `tests/vitest/ui/custom-screen-records.test.tsx`
- `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
- `tests/vitest/customScreens/capabilities.test.ts`
- `tests/vitest/customScreens/bindingResolver.test.ts`
- `tests/vitest/admin/custom-screen-schemas.test.ts`
- `tests/vitest/customScreens/customScreenService.test.ts`
- `tests/vitest/assistant/admin-context-service.test.ts`
- `tests/vitest/assistant/admin-context-catalog-normalizer.test.ts`
- `tests/integration/routes/customScreensRoutes.test.ts` when persisted reject
  rules or `mapCustomScreenError("custom_screen_definition_invalid")` change in
  the same slice
- `tests/vitest/ui/custom-screens-list-wave.test.tsx` when
  `supportsDedicatedEditor`, `modeLabel`, or `sidebarShortcutState` change in
  the Custom Screens list/readiness flow
- `tests/vitest/ui/use-assistant-admin-context.test.tsx` when active custom
  screen surface `writableBindingFields` or binding summaries change
- `tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- `tests/vitest/widgets/screenLayoutEditors.test.tsx` when layout-widget editor
  guidance or non-bindable state copy changes in the same slice
- `tests/vitest/admin/advanced-modules.test.ts` and
  `tests/vitest/ui/admin-shell-nav.test.tsx` when
  `supportsDedicatedEditor` changes Custom Screen sidebar shortcut gating

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

function isBindingWriteAllowed(input: {
  binding: CustomScreenBinding;
  widget: WidgetDefinition | null;
}) {
  if (input.binding.mode === "read") return false;
  const target = input.widget?.bindingTargets?.find(
    (candidate) => candidate.propPath === input.binding.propPath
  );
  return target?.modes?.includes("write") === true;
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

```ts
type WidgetBindingContract = {
  widgetId: string;
  widgetType: string;
  widgetSource: "screen-registry" | "legacy-fallback";
  accessSource: WidgetDefinition["dataAccess"]["source"] | null;
  allowedTargets: Map<string, Set<CustomScreenBindingMode>>;
};

function resolveWidgetBindingContracts(input: {
  blocks: Block[];
  screenWidgets: WidgetDefinition[];
  fallbackWidgets: WidgetDefinition[];
}) {
  // Build one widget-aware contract per persisted block id from the actual
  // editor block tree plus the registered screen-widget metadata. This output
  // becomes the shared owner for persisted validation, readiness, runtime, and
  // assistant summaries.
}

function assertBindingAllowed(input: {
  binding: CustomScreenBinding;
  contract: WidgetBindingContract | null;
}) {
  // Declared targets keep their per-prop mode rules.
  // Unknown prop paths may remain readable compatibility rows, but write-capable
  // combinations without an explicit owner contract fail fast.
}
```

```ts
function normalizeCustomScreenDefinitionWithBindingContracts(input: {
  definition: CustomScreenDefinition;
  contentType: ContentTypeDefinitionContext | null;
}) {
  const bindingContracts = resolveWidgetBindingContracts({
    blocks: input.definition.editorView.blocks,
    screenWidgets: listWidgetsForSurfaceContext({
      surface: "admin-editor-view",
      hasSelectedContentType: true,
    }),
    fallbackWidgets: listWidgets(),
  });

  const bindings = input.definition.editorView.bindings.map((binding) =>
    assertBindingAllowed({
      binding,
      contract: bindingContracts.get(binding.widgetId) ?? null,
    })
  );

  return {
    definition: {
      ...input.definition,
      editorView: { ...input.definition.editorView, bindings },
    },
    bindingContracts,
  };
}
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
The same helper must also gate persisted binding validation, `editableFields`,
assistant surface `writableBindingFields`, and `supportsDedicatedEditor` so an
unsupported write combination cannot be hidden in the panel but still survive in
saved definitions or readiness labels. `sidebarConfig.ts` consumes the same
`supportsDedicatedEditor` flag for active Custom Screen shortcuts, so sidebar
availability must stay aligned with the same readiness contract.

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
- Keep the explicit write-allow helper in `core/services/customScreens/bindingResolver.ts`
  and reuse that seam from UI, readiness, draft, runtime, assistant, and
  route-level workspace consumers instead of creating parallel helpers in page
  or editor components.
- Persisted save-time validation must be widget-aware, not `contentType`-only.
  `normalizeCustomScreenBindings()` currently sees content-type context only, so
  this leaf must either extend that context with per-widget binding contracts or
  run an adjacent shared validator immediately after definition normalization in
  `customScreenService.ts` before writes land. The same failure must continue to
  surface through `custom_screen_definition_invalid` in
  `core/server/routes/customScreenRoutes.ts`.
- The mounted page seam is the existing `screenWidgetRegistry` plus legacy
  fallback merge in `CustomScreenEditorPage`. `selectedWidgetSource` should be
  derived from that real merge, not reconstructed inside `FieldBindingPanel`.
- `CustomScreenEntryCanvas.tsx` remains the live runtime write seam for
  `screen-field-value.value`; if this leaf changes which prop paths are
  write-capable, update that runtime owner in the same slice rather than
  assuming `CustomScreenEntryEditor.tsx` owns the edit bridge by itself.
- Assistant-side custom-screen summaries are normalized in
  `core/services/assistant/adminContextService.ts` and
  `core/services/assistant/adminContextCatalogNormalizer.ts`; keep those server
  owners aligned with `assistantSurface.ts` when narrowed write-capable fields
  change secret-safe context, while `assistantActionSchemas.ts` changes only if
  the assistant action payload shape itself moves in the same slice.
- If `supportsDedicatedEditor`, preview-only binding counts, or route-level
  fallback copy move in the same slice, keep `CustomScreenEntryEditor.tsx`
  aligned with the same write/readiness owner contract instead of letting the
  route drift from `capabilities.ts` or `customScreenListModel.ts`.

## Security Contract

- Visibility: internal admin UI plus internal assistant/admin validation
  payloads only.
- Auth model:
  - authenticated admin session for builder, workspace, and record-editor
    surfaces,
  - existing internal assistant validation/normalization path stays server-side
    and scoped to the same authenticated admin context; no public assistant
    payload contract is introduced.
- RBAC: unchanged `content:write` for persisted binding changes.
- CSRF:
  - no new write route,
  - existing screen saves remain CSRF-backed through the admin client path.
- Rate-limit bucket: unchanged `admin_write` for screen saves.
- Reject-unknown validation:
  - binding-target metadata extends widget definitions only,
  - persisted bindings still pass through the current Custom Screen definition
    schema and route validation,
  - unsupported write-capable `widgetId` / `propPath` / `mode` combinations
    must be rejected in persisted definition and assistant payload validation,
    not only hidden in the Data tab UI.
- Anti-abuse: no public route or weakened validation contract is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/registry.test.ts`
- `bun test tests/unit/widgets/runtimeRegistry.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-entry-draft.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-records.test.tsx` when route-level workspace gating, preview-only messaging, or dedicated-editor readiness copy changes in the same slice
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/customScreens/capabilities.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/customScreens/bindingResolver.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/custom-screen-schemas.test.ts` when persisted binding normalization or save-time reject rules change
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/customScreens/customScreenService.test.ts` when persisted definition rejection or save-path error handling changes
- `bun test tests/integration/routes/customScreensRoutes.test.ts` when
  persisted binding reject rules, route validation wiring, or
  `mapCustomScreenError("custom_screen_definition_invalid")` behavior changes in
  the same slice
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/admin-context-service.test.ts` when assistant surface binding summaries or `writableBindingFields` change
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/admin-context-catalog-normalizer.test.ts` when assistant catalog snapshots or secret-safe binding filtering change
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-list-wave.test.tsx`
  when `supportsDedicatedEditor`, `modeLabel`, or `sidebarShortcutState` change
  in the Custom Screens list/readiness flow
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/use-assistant-admin-context.test.tsx` when active custom screen context or `writableBindingFields` changes in the same slice
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenLayoutEditors.test.tsx` when `screen-field-group` or `screen-two-column` editor guidance/non-bindable layout messaging changes in the same slice
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/widgetRegistryBindingTargets.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenWidgets.test.tsx` when the touched `screen-*` widget files also move their render or preview-bridge behavior
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/styleNoneTokens.test.tsx` when `screen-two-column` normalization or style keys change
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/advanced-modules.test.ts`
  and `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/admin-shell-nav.test.tsx`
  when `supportsDedicatedEditor` changes the availability of active Custom
  Screen sidebar shortcuts
- The Bun suites above stay as current registry-owner comparison smoke while the
  new Vitest binding-target suite is introduced in this slice.
- Add assertions for:
  - `screen-record-header` exposes five target cards and keeps them read-only,
  - `screen-field-value` still exposes `value`, `label`, and `helper`, but only
    `value` remains write-capable under the current dedicated-editor contract,
  - unsupported write-capable combinations are rejected or downgraded before
    they can drive `supportsDedicatedEditor`, `Workspace ready`, or
    `editableFields`,
  - persisted save paths reject unsupported write-capable combinations before
    they can survive `normalizeCustomScreenBindings()` or the current service
    save flow,
  - `tests/integration/routes/customScreensRoutes.test.ts` keeps the
    `custom_screen_definition_invalid` route boundary and `mapCustomScreenError`
    coverage aligned when save-time reject rules change,
  - `tests/vitest/ui/custom-screens-list-wave.test.tsx` keeps list-surface
    `modeLabel` / `sidebarShortcutState` aligned with the same readiness
    contract when `supportsDedicatedEditor` changes,
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
  - `tests/vitest/ui/custom-screen-records.test.tsx` keeps route-level
    workspace gating and preview-only copy aligned with the same
    write/readiness contract,
  - `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
    proves the mounted jump/focus flow and must be extended, or paired with
    adjacent mounted coverage, if this leaf rewires the page-level selected
    widget handoff in `CustomScreenEditorPage`,
  - `tests/vitest/ui/use-assistant-admin-context.test.tsx` and adjacent
    assistant-context owners keep `writableBindingFields` aligned with the same
    per-prop write contract when active custom screen surface summaries change,
  - `tests/vitest/admin/advanced-modules.test.ts` and
    `tests/vitest/ui/admin-shell-nav.test.tsx` keep sidebar shortcut gating
    aligned with the same `supportsDedicatedEditor` contract,
  - `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
    continues to prove legacy widget preservation in the editor surface.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/ASSISTANT_SITE_BUILDER.md` when the binding slice changes assistant
  active-surface summaries, `writableBindingFields`, or assistant validation
  expectations
- `_docs/CMS_API.md` when the leaf changes active custom-screen summaries,
  documented assistant payloads, or workspace readiness/sidebar gating
  described in the admin API docs
- `_docs/ARCHITECTURE.md` and `_docs/CONTENT_LIST_UX.md` when
  `supportsDedicatedEditor`, active custom-screen context, or sidebar shortcut
  gating contracts move in the same slice
- `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md`
- `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md`
- `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md` and
  `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md` only when their layout-only
  `selected-content-type` contract or non-bindable guidance changes in the same
  slice
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
5. Unsupported write combinations cannot be saved or surfaced as dedicated
   editor readiness, sidebar shortcut availability, writable draft fields, or
   writable assistant context.
