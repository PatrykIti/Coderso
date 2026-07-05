# TASK-516-03: Builder Chrome, Field Rail Fidelity & Design-Tab Wiring

# FileName: TASK-516-03-Builder-Chrome-And-Rail-Fidelity.md

**Parent Task:** TASK-516
**Priority:** High
**Category:** Admin UI / Content (Forms) / Page Builder
**Estimated Effort:** Large
**Dependencies:** TASK-516-01 (theme model), TASK-516-02 (`FormDesignPanel`),
TASK-516-04 (must land first — `FormCanvasProps` gains the optional
`deviceWidth?`/`theme?` props there before this subtask passes them; land order is
…→ 516-04 → 516-03 →…).
**Status:** ⏳ To Do

---

## Scope (single-writer keystone)

**Sole writer of `core/admin/ui/forms/FormBuilderPage.tsx`,
`core/admin/ui/forms/FieldLibrary.tsx`, `core/admin/ui/forms/FieldListPanel.tsx`.**
Brings the builder chrome + field rail to prototype fidelity and mounts the
Design inspector tab. Ships:

1. **B1 fix — expose `phone` in the field library** (`fieldLibraryItems`) with
   the `Phone` lucide icon. **Do NOT add a File rail entry here** — the `file`
   type is not a valid `FormFieldType` until 516-07 (lands LAST), which adds its
   own File rail item via a bounded additive `file`-only edit to
   `FieldLibrary.tsx`/`FormBuilderPage.tsx` (see 516-07 "File-case UI ownership").
   516-03 must not reference the `file` type.
2. **Chrome fidelity (G1):** add a **desktop/mobile device toggle** driving the
   canvas preview width (passed to `FormCanvas` in 516-04 via a `deviceWidth`
   prop), a **status/`· draft` badge** in the toolbar, and a **Publish** primary
   action (sets `meta.status = "published"` then saves) alongside the existing
   Save. Keep Submissions / Action logs / Runtime preview.
3. **Design tab:** extend the form inspector `Tabs` from `Settings | Automation`
   to `Settings | Design | Automation`, rendering `<FormDesignPanel>` in the new
   tab wired to `meta.settings.theme` via a new `setFormTheme` handler.
4. **Rail styling (G2):** align `FieldLibrary` item styling toward the prototype
   `EditorRailGroup`/`EditorRailItem` look (grouped "Fields", active state).

## Pseudocode (grounded in real code)

```tsx
// fieldLibraryItems (FormBuilderPage.tsx:68) — add:
{ id:"phone", label:"Phone", icon: Phone, type:"phone", helper:"Collects a telephone number." },
// NOTE: no File entry here — 516-07 (lands last) appends the File rail item itself
//       ({ id:"file", label:"File Upload", icon: Paperclip, type:"file", ... }) as an additive file-only edit.

// device toggle state:
const [previewDevice, setPreviewDevice] = useState<"desktop"|"mobile">("desktop");

// theme handler (mirrors setFormSettings :585):
const setFormTheme = (updates: Partial<FormFormTheme> | undefined) =>
  setMeta(prev => ({ ...prev, settings: normalizeFormSettings({
    ...prev.settings,
    theme: updates === undefined ? undefined : { ...(prev.settings.theme ?? {}), ...updates },
  }) })) && setUnsavedChanges(true);

// inspector tabs (renderFormInspector :692) — insert Design between Settings & Automation:
<TabsTrigger value="design">Design</TabsTrigger>
<TabsContent value="design"><FormDesignPanel theme={meta.settings.theme} onThemeChange={setFormTheme} /></TabsContent>
// widen inspectorTab union to "settings" | "design" | "automation"

// Publish action (topbar):
const handlePublish = async () => { setMetaField("status","published"); await handleSave(); };

// pass device + theme to canvas (516-04 consumes):
<FormCanvas ... deviceWidth={previewDevice} theme={meta.settings.theme} />
```

The mobile Sheet inspector (`:915`) must also render the Design tab so field/form
inspectors stay reachable on small screens (mirror the desktop tab set).

Error handling: Publish reuses `handleSave` error surfacing (`saveError`).
Device toggle is pure client state (no persistence).

## Testing requirements + lanes

- **Vitest admin/UI** `tests/vitest/admin/formBuilderPage.test.tsx` (extend or
  NEW): the field library includes a `Phone` item and adding it appends a
  `type:"phone"` field; the inspector exposes a `Design` tab that renders
  `FormDesignPanel`; the device toggle updates the `deviceWidth` passed to
  `FormCanvas`; Publish sets status `published` and triggers save. Pure render
  lane (mock `formsClient`).

## UI/UX fidelity + max-config-flexibility notes

Match the prototype builder chrome (`FormBuilderPreview.tsx`): toolbar status
badge, undo/redo affordance (device toggle required; undo/redo is a stretch goal
— implement if time permits via a bounded fields+meta history stack, else omit
cleanly), desktop/mobile device toggle, `Publish` primary + `Save` ghost. Do NOT
regress existing Submissions / Action logs / Runtime preview entry points.
