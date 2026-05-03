# TASK-251-03: Binding Panel Prop Coverage and Prop-Centric Cards
# FileName: TASK-251-03_Binding_Panel_Prop_Coverage_and_Prop_Centric_Cards.md

**Priority:** High
**Category:** Coderso Custom Screens + Bindings + Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-249-03, TASK-250, TASK-251
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
- `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx` as the current
  runtime owner of the dedicated-editor write seam for
  `screen-field-value.value`
- `core/services/customScreens/bindingResolver.ts` as the current shared owner
  for widget-binding reads/writes and writable-field derivation
- `core/admin/ui/custom-screens/customScreenEntryDraft.ts` as the current owner
  of `editableFields` derived from writable bindings
- `core/admin/ui/custom-screens/assistantSurface.ts` as the owner of assistant
  surface `writableBindingFields`
- `core/services/assistant/adminContextService.ts` and
  `core/services/assistant/adminContextCatalogNormalizer.ts` as the live server
  owners that normalize custom-screen assistant context, binding summaries, and
  secret-safe `writableBindingFields`
- `core/admin/ui/custom-screens/customScreenListModel.ts`
- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx` when dedicated
  editor readiness labels or workspace gating change with the same slice
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` when route-level
  workspace gating, preview-only copy, or writable-binding summaries change
- `core/admin/ui/navigation/sidebarConfig.ts` when
  `supportsDedicatedEditor` changes sidebar shortcut availability for active
  Custom Screens
- `core/admin/ui/widgets/registry.ts` as the admin consumer seam that exposes
  registered widget metadata to the picker, selected-widget resolution, and
  mounted UI tests
- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `core/services/customScreens/capabilities.ts`
- `core/services/customScreens/customScreenSchemas.ts`
- `core/services/customScreens/customScreenService.ts` when save-time
  definition rejection or persistence-path error handling changes
- `core/server/routes/customScreenRoutes.ts` when the slice changes
  `custom_screen_definition_invalid` mapping or the write-route boundary proof
- `core/server/validation/assistantActionSchemas.ts` only when assistant action
  payload shape changes in the same slice; assistant custom-screen summary
  normalization remains owned by `adminContextService.ts` /
  `adminContextCatalogNormalizer.ts`
- `core/widgets/types.ts`
- `core/widgets/registry.ts`
- `core/widgets/core/index.ts` as the actual owner seam where core widget
  metadata is attached during registration
- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenFieldGroup.tsx` and
  `core/widgets/core/screenTwoColumn.tsx` as reference seams only when the
  slice actually changes their layout-only data-access metadata or non-bindable
  guidance
- `core/widgets/runtime.tsx` as a reference seam for the runtime registration
  contract proven by the Bun comparison smoke
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

## Product Contract

1. The Data tab must expose all supported bindable prop paths for the selected
   widget together with explicit per-prop read/write modes.
2. Declaring a bindable prop does not automatically make it writable. The
   shared contract must preserve the current runtime/editor ownership:
   - `screen-record-header` remains read-only,
   - `screen-field-value.value` remains the only write-capable target in the
     dedicated record editor,
   - `screen-field-value.label` and `helper` remain read-only unless runtime
     ownership changes in the same slice.
3. Binding cards must be labeled by prop label / prop path, not by ordinal
   position.
4. Existing persisted custom prop paths that are not part of the declared
   widget target list must remain editable under a compatibility section.
5. `CustomScreenEditorPage` remains the owner of the resolved selected widget
   and must pass that resolved metadata plus an explicit ownership signal
   (`screen-registry` vs `legacy-fallback`) into the Data tab instead of
   forcing `FieldBindingPanel` to rediscover registry state on its own.
6. If the selected block is preserved only through the current legacy fallback
   widget registry path and does not declare widget-owned binding targets, the
   panel must keep a manual binding editor for that block instead of collapsing
   into a non-bindable empty state.
7. `screen-field-group` and `screen-two-column` remain layout widgets with the
   current `selected-content-type` read-only contract. Their `title`,
   `description`, `leftTitle`, and `rightTitle` stay in widget settings and do
   not become selected-entry binding cards in the Data tab.
8. Widget settings and Data-tab suggestions must read from the same
   widget-owned target contract so they do not drift.
9. The same per-prop write contract must be enforced by save/readiness owners:
   unsupported write combinations must not survive persisted definition
   validation, drive `supportsDedicatedEditor`, populate `editableFields`,
   surface as writable assistant context, or leave sidebar shortcut gating out
   of sync with workspace readiness.

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
function resolveAllowedBindingModes(input: {
  target: WidgetBindingTarget;
  field: BindingFieldOption | null;
}) {
  const canWrite =
    input.target.modes?.includes("write") === true && input.field?.writable === true;
  return canWrite ? modeOptions : modeOptions.filter((option) => option.value === "read");
}
```

```ts
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
  // editor block tree plus the registered screen-widget metadata.
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
- Keep the explicit write-allow owner in `core/services/customScreens/bindingResolver.ts`
  and reuse that seam from UI, readiness, draft, runtime, and assistant
  consumers instead of creating parallel helpers in `FieldBindingPanel`,
  `capabilities.ts`, or `CustomScreenEntryEditor.tsx`.
- Persisted save-time validation must be widget-aware, not `contentType`-only:
  thread the resolved widget-binding contracts from the normalized block tree
  into `normalizeCustomScreenBindings()` or an adjacent post-normalization
  validator before `customScreenService.ts` writes definition changes. The same
  failure must still surface through the existing
  `custom_screen_definition_invalid` route boundary in
  `core/server/routes/customScreenRoutes.ts`.
- When rewiring the Data tab, keep the explicit ownership split visible in
  `CustomScreenEditorPage`: `screenWidgetRegistry` remains the primary source
  for current screen widgets, while the merged fallback path preserves already
  saved legacy blocks.
- UI gating is not sufficient. Reuse one explicit write-allow helper across the
  panel, persisted binding normalization, dedicated-editor readiness
  (`supportsDedicatedEditor` / workspace labels), draft `editableFields`, and
  assistant surface `writableBindingFields` so the same invalid write pair
  cannot be blocked in the UI but still survive in saved definitions.
- `CustomScreenEntryCanvas.tsx` remains the live runtime write seam for
  `screen-field-value.value`; if this slice changes which prop paths are
  write-capable, keep that runtime owner aligned in the same patch instead of
  assuming `CustomScreenEntryEditor.tsx` owns the edit bridge by itself.
- Assistant-side custom-screen summaries are normalized in
  `core/services/assistant/adminContextService.ts` and
  `core/services/assistant/adminContextCatalogNormalizer.ts`; update those
  owners together with `assistantSurface.ts` when narrowed write-capable fields
  change secret-safe context, while `assistantActionSchemas.ts` only changes if
  the assistant action payload shape moves in the same slice.
- Keep `CustomScreenEntryEditor.tsx` aligned with the same owner contract so
  route-level workspace gating, preview-only binding counts, and fallback copy
  do not drift from `capabilities.ts` or `customScreenListModel.ts`.
- `core/admin/ui/navigation/sidebarConfig.ts` consumes the same
  `supportsDedicatedEditor` readiness flag when building active sidebar
  shortcuts, so sidebar availability must stay aligned with the updated
  readiness contract in the same slice.

## Security Contract

- Visibility: internal admin UI plus internal assistant/admin validation
  payloads only.
- Auth model:
  - authenticated admin session for builder, workspace, and record-editor
    surfaces,
  - existing internal assistant validation/normalization path stays server-side
    and scoped to the same authenticated admin context; no public assistant
    payload contract is introduced.
- RBAC: saving binding changes remains `content:write` through existing Custom
  Screen saves.
- CSRF:
  - no new write route,
  - existing screen saves remain CSRF-backed through the admin client path.
- Rate-limit bucket: unchanged `admin_write` for screen saves.
- Reject-unknown validation:
  - widget-owned binding-target metadata must not weaken widget schemas,
  - persisted bindings remain normalized through the current Custom Screen
    definition schema,
  - unsupported write-capable `widgetId` / `propPath` / `mode` combinations
    must be rejected in persisted definition and assistant payload validation,
    not only hidden in the Data tab UI.
- Anti-abuse: no public route or public payload is introduced.

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
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenWidgets.test.tsx` when `CustomScreenPreview.tsx` or the core `screen-*` widget render/normalization files move in the same slice
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/styleNoneTokens.test.tsx` when `screen-two-column` normalization or style keys change
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/advanced-modules.test.ts`
  and `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/admin-shell-nav.test.tsx`
  when `supportsDedicatedEditor` changes the availability of active Custom
  Screen sidebar shortcuts
- The Bun suites above remain the current registry-owner comparison smoke until
  the new Vitest binding-target suite is introduced and the lane cutover is
  made explicit in the same slice.
- Add assertions for:
  - all declared bindable props for `screen-record-header` render in Data,
  - `screen-record-header` target cards remain read-only under the current
    widget-level `dataAccess.modes`,
  - `screen-field-value` exposes `value`, `label`, and `helper`, but only
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
  - `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
    keeps mounted `CustomScreenEntryEditor` screen-widget runtime/binding
    refresh compatibility covered when shared widget contract changes touch
    `screen-*` metadata or fallback behavior,
  - `tests/vitest/ui/custom-screen-records.test.tsx` keeps route-level
    workspace gating and preview-only copy aligned with the same
    write/readiness contract,
  - `tests/vitest/ui/use-assistant-admin-context.test.tsx` and adjacent
    assistant-context owners keep `writableBindingFields` aligned with the same
    per-prop write contract when active custom screen surface summaries change,
  - `tests/vitest/admin/advanced-modules.test.ts` and
    `tests/vitest/ui/admin-shell-nav.test.tsx` keep sidebar shortcut gating
    aligned with the same `supportsDedicatedEditor` contract,
  - widget-editor `Data` jump buttons still target the same declared prop paths.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/ASSISTANT_SITE_BUILDER.md` when the binding slice changes assistant
  active-surface summaries, `writableBindingFields`, or assistant validation
  expectations
- `_docs/CMS_API.md` when the binding slice changes active custom-screen
  summaries, documented assistant payloads, or workspace readiness/sidebar
  gating described in the admin API docs
- `_docs/ARCHITECTURE.md` and `_docs/CONTENT_LIST_UX.md` when
  `supportsDedicatedEditor`, active custom-screen context, or sidebar shortcut
  gating contracts change in the same slice
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

1. The Data tab shows full bindable prop coverage for the selected widget.
2. Binding cards are prop-centric instead of ordinal.
3. Widget editors and the Data tab share one binding-target contract.
4. Unsupported write combinations cannot be persisted or surfaced as dedicated
   editor readiness, sidebar shortcut availability, writable draft fields, or
   writable assistant context.
