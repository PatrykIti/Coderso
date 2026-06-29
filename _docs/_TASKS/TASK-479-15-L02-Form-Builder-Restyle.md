# TASK-479-15-L02: Form Builder Restyle
# FileName: TASK-479-15-L02-Form-Builder-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Forms / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ✅ Done
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
  `core/admin/services/formsClient.ts` and the form domain helpers in
  `core/services/forms/*` (`formSettings.ts`, `formPresets.ts`).
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
`EditorPreviewFrame` regions onto the **existing `EditorShell` props** (the real
`EditorShell` exposes `leftPanel` / `rightPanel` asides + a center `children`
slot — there is NO `header` prop on `EditorShell` or `AdminShell`) —
`left` (Fields rail) → `EditorShell.leftPanel` (the existing Fields/Library
`Tabs` over `FieldListPanel` + `FieldLibrary`), `canvas` (live form preview) →
`EditorShell` center `children` (`FormCanvas`), `right` (inspector) →
`EditorShell.rightPanel` (`FieldSettingsPanel` when a field is selected, else
`renderFormInspector()` — the Settings/Automation `Tabs` over `FormSettingsPanel`
+ `FormActionsPanel`). The prototype `EditorRailGroup`/`EditorRailItem` look is
the styling target for `FieldLibrary`. `EditorPreviewFrame` is a visual reference
only and is NOT ported to core (per 06-L02) — do not import it.

```tsx
// FormBuilderPage.tsx — RENDER ONLY changes inside the existing EditorShell.
// hasUnsavedChangesRef, save/publish handlers, cache subscribe, tab state, and
// every formsClient write stay byte-for-byte.
//
// IMPORTANT — match the REAL EditorShell API: it already renders the 3-pane
// frame via `leftPanel` / `rightPanel` asides + a center `children` slot. It has
// NO `header` prop (neither does AdminShell). The builder has no PageHeader —
// Save / Submissions / Action logs / Runtime-preview live in the center sticky
// toolbar, and status + "Unsaved changes" pills go through `topbarActions`. So
// RESTYLE the existing panes — do NOT add a `header` prop and do NOT rebuild a
// custom `<div className="grid grid-cols-[…]">` inside children.

return (
  <EditorShell
    activeHref="/admin/advanced/forms"
    breadcrumbs={["Content", "Forms", formTitle]}
    topbarActions={/* keep the existing status + "Unsaved changes" pills */}
    rightPanelClassName="p-0"
    leftPanel={
      // Fields rail — restyle the EXISTING Fields/Library Tabs (variant="line")
      // over FieldListPanel + FieldLibrary; port the EditorRailGroup/
      // EditorRailItem look (icon chip + label rows, active = bg-primary-soft
      // text-primary). Keep the SAME wiring:
      //   <FieldListPanel fields={fieldListItems} selectedId={selectedFieldId}
      //     onSelect={(id) => setSelectedTarget({ type: "field", id })} onAdd={…} />
      //   <FieldLibrary items={fieldLibraryItems} onAddField={handleAddField} />
    }
    rightPanel={
      // Inspector — keep the existing selection split:
      //   field selected → <FieldSettingsPanel field={selectedField}
      //     allFields={fields} onChange={handleFieldChange}
      //     onSettingsChange={handleFieldSettingsChange} onDuplicate={handleDuplicate} />
      //   form selected  → renderFormInspector() (Settings/Automation Tabs over
      //     FormSettingsPanel + FormActionsPanel). Restyle chrome only.
    }
  >
    {/* center children = restyled sticky toolbar (Submissions / Action logs /
        Runtime preview / Save — same handlers) over the live canvas. The selected
        field gets the prototype highlight (rounded-xl bg-primary-soft/40 ring-2
        ring-primary) applied INSIDE FormCanvas; keep the real field renderers +
        selection wiring. */}
    <FormCanvas
      formTitle={formTitle}
      formDescription={formDescription}
      layoutMode={meta.settings.layoutMode}
      stepTitles={meta.settings.stepTitles}
      formSelected={selectedTarget?.type === "form"}
      selectedFieldId={selectedFieldId}
      fields={fields}
      onSelectField={(id) => setSelectedTarget({ type: "field", id })}
      onSelectForm={() => setSelectedTarget({ type: "form" })}
      onRemoveField={handleRemoveField}
    />
    <FormRuntimePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} {...previewProps} />
  </EditorShell>
);
```

Inspector field rows (`FieldSettingsPanel`) adopt the prototype `InspectorRow`
shape: `mb-1.5 text-xs font-medium text-muted-foreground` label over the control,
and the Required toggle as a `rounded-xl border px-3 py-2.5` row with a `Switch`.
Keep every control bound to its existing `FieldSettings` field via the real
`onChange`/`onSettingsChange` callbacks.

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

**Regression-test shape (see L04):** an SSR snapshot (`renderToString` under
`AdminRouterProvider`) of `FormBuilderPage` asserts the three regions are present
(the Fields/Library rail with field-type items, the canvas preview, and the
inspector). The `submissionAccess` control is asserted by rendering
`FormSettingsPanel` **directly** with seeded props (the existing forms-suite
idiom — `forms.test.tsx` renders `FieldSettingsPanel` directly) and checking the
`submissionAccess` (public|internal) Select is present (presence only — value
contract untouched). Note: honeypot / CAPTCHA are NOT controls in
`FormSettingsPanel` (it only renders `submissionAccess`); they are enforced
server-side (bot protection + global security settings), so do not assert them on
this panel. Add-field, field selection, the Required
`Switch` binding, and Save/Publish writes are interaction-dependent — keep them in
the existing behavioral suites (or an explicit `createRoot`+`act` test), not in
the single SSR snapshot.

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
