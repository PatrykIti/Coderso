# TASK-479-15-L02: Form Builder Restyle
# FileName: TASK-479-15-L02-Form-Builder-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Forms / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-15

---

## Overview

Restyle the form builder to the prototype's `FormBuilderPreview`: a three-pane
editor frame with a **field palette** rail (left), a **live form preview**
canvas (center, with the selected field highlighted), and a **field settings**
inspector (right). All real schema, field validation, presets, automation
actions, runtime preview, cache, and unsaved-changes protection are preserved —
only presentation changes.

- **Goal:** Give the builder the soft/violet editor look of the prototype
  (warm canvas, `rounded-2xl` panes, selected-field ring) while keeping the live
  form schema, field add/reorder/remove, the field/action/settings panels, the
  preset flow, the runtime preview dialog, cache hydrate + invalidation, and the
  dirty-state guard fully intact.
- **Owning module/service:** `core/admin/ui/forms/FormBuilderPage.tsx`
  (plus its panes `FieldLibrary.tsx`, `FieldListPanel.tsx`, `FormCanvas.tsx`,
  `FieldSettingsPanel.tsx`, `FormActionsPanel.tsx`, `FormSettingsPanel.tsx`,
  `FormRuntimePreviewDialog.tsx`), backed by
  `core/admin/services/formsClient.ts` and `core/admin/services/forms/*`
  (`formSettings.ts`, `formPresets.ts`).
- **Source-of-truth docs:** `_docs/FORMS_SPEC.md`, `_docs/DESIGN_TOKENS.md`;
  prototype source `_docs/_PROTOTYPE/src/pages/advanced/FormBuilderPreview.tsx`
  and shared primitives
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,EditorPreviewFrame}.tsx`
  (`EditorRailGroup`/`EditorRailItem`),
  `_docs/_PROTOTYPE/src/components/ui/{card,button,badge,input,textarea,select,label,switch,checkbox}.tsx`.
- **Out of scope:** No change to the field/schema model, field validation,
  `normalizeFormSettings`/`getDefaultFormSettings`, presets
  (`clonePresetFields`, `getFormPresetDefinition`, `listFormPresets`), the
  automation action runner, the form runtime widget, or the public-submit
  anti-abuse contract. No replatforming of the editor onto a different shell —
  reuse the existing `EditorShell` (the prototype `EditorPreviewFrame` is a
  visual reference, not a drop-in).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

The builder writes the form schema/settings; the public-submit anti-abuse
contract (nonce, honeypot, optional CAPTCHA, `submissionAccess`) is configured
through `FormSettingsPanel` and validated by `normalizeFormSettings`. Restyle the
panel chrome ONLY — every control stays wired to the same setting; no anti-abuse
default, gate, or validation rule changes.

---

## Implementation Pseudocode

Target file: `core/admin/ui/forms/FormBuilderPage.tsx` (keep the entire
state/effect/handler block — `getCachedFormDetail`/`getFormDetailCached`/
`listFormActionsCached`/`getCachedFormActions` hydrate, `subscribeCacheEvents`
invalidation, `updateForm`/`updateFormFields`/`updateFormActions` writes, the
preset flow, the `Tabs` for Fields/Actions/Settings, the runtime preview dialog,
and the unsaved-changes ref/guard). Only pane chrome + the canvas/inspector JSX
change.

Port from prototype `FormBuilderPreview.tsx`: map the prototype
`EditorPreviewFrame` regions onto the existing real panes —
`left` (Fields rail) → `FieldLibrary` + `FieldListPanel`, `canvas` (live form
preview) → `FormCanvas`, `right` (inspector) → `FieldSettingsPanel`. The
prototype `EditorRailGroup`/`EditorRailItem` look is the styling target for
`FieldLibrary`.

```tsx
// FormBuilderPage.tsx — RENDER ONLY changes inside the existing EditorShell.
// hasUnsavedChangesRef, save/publish handlers, cache subscribe, tab state, and
// every formsClient write stay byte-for-byte.

return (
  <EditorShell
    activeHref="/admin/advanced/forms"
    breadcrumbs={["Content", "Forms", form?.name ?? "Form"]}
    header={
      <PageHeader
        title={form?.name ?? "Form"}
        description="Drag fields onto the canvas and configure them on the right."
        actions={/* keep existing Save (Save icon) + Publish + Preview buttons + their handlers */}
      />
    }
  >
    {/* 3-pane layout styled like EditorPreviewFrame: rounded-2xl panes, soft shadow */}
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]">
      <aside className="rounded-2xl border bg-card p-3 shadow-card">
        {/* FieldLibrary palette — port EditorRailGroup/EditorRailItem styling:
            icon chip + label rows, active row = bg-primary-soft text-primary.
            Keep the SAME fieldLibraryItems + onAddField handlers. */}
        <FieldLibrary items={fieldLibraryItems} onAdd={handleAddField} />
        <FieldListPanel fields={fieldListItems} selectedId={selectedFieldId} onSelect={setSelectedFieldId} onReorder={handleReorder} onRemove={handleRemoveField} />
      </aside>
      <section className="rounded-2xl border bg-muted/30 p-6">
        {/* FormCanvas — live preview. The selected field gets the prototype
            highlight: rounded-xl bg-primary-soft/40 ring-2 ring-primary. Keep
            the real field renderers + selection wiring. */}
        <FormCanvas fields={fields} selectedId={selectedFieldId} onSelectField={setSelectedFieldId} />
      </section>
      <aside className="rounded-2xl border bg-card p-4 shadow-card">
        <Tabs value={inspectorTab} onValueChange={setInspectorTab}>
          {/* keep TabsList: Field / Actions / Settings */}
          <TabsContent value="field"><FieldSettingsPanel settings={selectedFieldSettings} onChange={handleFieldSettingsChange} /></TabsContent>
          <TabsContent value="actions"><FormActionsPanel actions={actions} onChange={handleActionsChange} contentTypes={contentTypes} /></TabsContent>
          <TabsContent value="settings"><FormSettingsPanel settings={settings} onChange={handleSettingsChange} /></TabsContent>
        </Tabs>
      </aside>
    </div>
    <FormRuntimePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} {...previewProps} />
  </EditorShell>
);
```

Inspector field rows (`FieldSettingsPanel`) adopt the prototype `InspectorRow`
shape: `mb-1.5 text-xs font-medium text-muted-foreground` label over the control,
and the Required toggle as a `rounded-xl border px-3 py-2.5` row with a `Switch`.
Keep every control bound to its existing `FieldSettings` field and `onChange`.

**Optional (defer-able) enhancement:** a floating CanvasEditor-style panel for
field settings (as in the Pages editor) MAY replace the right rail later. It is
OUT of scope for this leaf unless explicitly scheduled — this leaf ships the
fixed 3-pane restyle. If pursued, it must reuse the shared floating-panel
primitive and keep identical `FieldSettings` wiring; do not fork the panel.

**Data flow:** mount hydrates form detail + actions from cache
(`getCachedFormDetail`/`getCachedFormActions`) then background-revalidates
(`getFormDetailCached`/`listFormActionsCached`); `subscribeCacheEvents` refreshes
on external change; edits mutate local field/action/settings state guarded by
`hasUnsavedChangesRef`; Save calls `updateFormFields`/`updateFormActions`/
`updateForm`; Publish flips status via `updateForm`.

**Error handling:** unchanged — keep the load/save `Alert`s, the
`isApiClientError` mapping, and the dirty-state guard that blocks
external/refetch overwrites while there are unsaved changes. The restyle adds no
new effect and no synchronous `setState` in effects.

**Routing:** breadcrumb + any back link route through `AdminLink` /
`useAdminRouter().navigate` to the existing `/advanced/forms` and
`/advanced/forms/:id` routes; the prototype's bottom `<Link to="/advanced/forms">`
becomes an `AdminLink`. No hand-built `<a href>`.

**Regression-test shape (see L04):** render asserts the three panes (palette
rail with the field-type items, canvas preview, inspector tabs), that clicking a
palette item still calls the add-field handler, that selecting a field shows its
settings with the Required `Switch` bound, that the Settings tab still renders
the runtime/anti-abuse controls (presence only — value contract untouched), and
that Save/Publish still call the existing client writes (mocked).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/forms-builder-restyle.test.tsx tests/vitest/ui/form-builder.test.tsx tests/vitest/ui/form-canvas.test.tsx tests/vitest/ui/form-canvas-wave.test.tsx tests/vitest/ui/form-actions-panel.test.tsx`

Update literal class/markup assertions in `form-builder.test.tsx` /
`form-canvas*.test.tsx` where the pane chrome + selected-field highlight
intentionally change; keep all behavioral (add/select/reorder/remove field,
settings binding, save/publish, preset, runtime preview) assertions. State in the
summary if any suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-15-L02`.
- `_docs/FORMS_SPEC.md` — note the builder's 3-pane restyle + selected-field
  highlight if the spec describes the builder UX (no schema/validation/anti-abuse
  change).
