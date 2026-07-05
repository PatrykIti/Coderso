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

**Type-boundary contract (blocks 516-03):** 516-01 must (a) extend `FormSettings`
with `theme?: FormFormTheme` **and** (b) **re-export** `FormFormTheme` from
`core/admin/services/formsClient.ts` (verified today: `formsClient.ts:39` defines
`FormSettings` and `formStatus`/`FormStatus` are re-exported there; the service
type lives in `core/services/forms/formSettings.ts`). 516-03 then imports both
`FormFormTheme` and `FormStatus` **from `@/services/formsClient`**, consistent
with the existing admin type boundary (`FormBuilderPage.tsx:42` already imports
`FormSettings` from `@/services/formsClient`, never from the service module).
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
2. **Chrome fidelity (G1) — adopt the prototype in-page `PageHeader` +
   `EditorFrame` layout (NOT a bolt-on to the old toolbar).** The prototype
   (`_docs/_PROTOTYPE/src/pages/advanced/FormBuilderPreview.tsx`; live-verified
   `_docs/_workflows/_smoke/wf516audit-proto-builder.png`) renders an in-page
   `PageHeader` (breadcrumbs `Forms › <name>`, title, description, actions =
   **Save** ghost + **Publish** primary w/ Rocket) wrapping an `EditorPreviewFrame`
   (title `Form builder`, toolbar badge `<name> · draft`, device toggle +
   undo/redo top-right, left FIELDS rail, canvas card, right inspector). REPLACE
   the current full-screen 3-pane `EditorShell` + sticky sub-toolbar
   (`FormBuilderPage.tsx:740` shell, `:787-827` sticky bar) with the admin ports
   of these primitives, mirroring `MenuEditorPage.tsx` (verified: it renders
   `AdminShell` → `PageHeader` → `EditorFrame` at `:854/:871/:999`):
   - Outer chrome: `AdminShell` (`@/ui/layouts/AdminShell`,
     `activeHref="/admin/advanced/forms"`, `breadcrumbs={["Content","Forms", formTitle]}`,
     keep the existing `topbarActions` StatusBadge + "Unsaved changes" badge).
   - `PageHeader` (`@/ui/shared/PageHeader`, slots `breadcrumbs/title/description/actions`):
     `breadcrumbs=[{ label:"Forms", href:"/admin/advanced/forms" }, { label: formTitle }]`,
     `title={formTitle}`, `description="Drag fields onto the canvas and configure
     them on the right."` (the **static builder hint** the prototype shows —
     `FormBuilderPreview.tsx:46` and parent TASK-516 line 346; do NOT bind the
     `PageHeader` description to `formDescription` — the form's own description is
     content shown on the canvas and is usually empty here (`FormBuilderPage.tsx:578`
     falls back to `""`), which would leave the header subtitle blank), `actions` = **Save**
     ghost (`handleSave`, `disabled={isBusy || !hasUnsavedChanges}`) + **Publish**
     primary (Rocket icon, `handlePublish`). Fold the existing **Submissions /
     Action logs / Runtime preview** buttons into this actions row so they stay
     reachable — do NOT drop them.
   - `EditorFrame` (`@/ui/shared/EditorFrame`, slots `title/toolbar/actions/left/canvas/right`;
     re-exports `EditorRailGroup`/`EditorRailItem`): `title="Form builder"`;
     `toolbar` = status badge `<Badge variant="outline">{formTitle} · {meta.status}</Badge>`;
     `actions` = the **desktop/mobile device toggle** (drives `previewDevice`)
     PLUS two **render-only `disabled` Undo/Redo buttons** (`Undo2`/`Redo2` lucide
     icons, `size="icon-sm"`, always `disabled`) placed before the device toggle to
     mirror the prototype chrome (`EditorPreviewFrame.tsx:47-52` renders both
     unconditionally). Per the parent scope decision (TASK-516 lines 366-377) and
     DoD (line 548), functional edit-history is **out of scope** — do NOT build a
     history stack; render the two buttons disabled so the toolbar matches the
     prototype visually and the parent smoke (which asserts they render disabled)
     passes. `left` = FIELDS rail (see item 4) + added-fields list
     (see item 5); `canvas` = `<FormCanvas … deviceWidth={previewDevice} theme={meta.settings.theme}/>`;
     `right` = `renderFormInspector()` / `FieldSettingsPanel` (unchanged logic).
   - The device toggle drives the canvas preview width via the `deviceWidth` prop
     added on `FormCanvas` in 516-04.
   - Keep the mobile `Sheet` fallbacks (`:879` fields, `:915` inspector) since
     `EditorFrame`'s `left`/`right` are `lg`/`xl`-hidden; both Sheets must render
     the Design tab (item 3).
3. **Design tab:** extend the form inspector `Tabs` from `Settings | Automation`
   to `Settings | Design | Automation`, rendering `<FormDesignPanel>` in the new
   tab wired to `meta.settings.theme` via a new `setFormTheme` handler.
4. **Rail styling (G2) — REUSE the existing shared rail primitives, do not
   hand-roll classes.** `EditorRailGroup`/`EditorRailItem` already exist in the
   admin (`core/admin/ui/shared/EditorRail.tsx`, re-exported from
   `@/ui/shared/EditorFrame`; ported for TASK-497 with `active`/`onClick`/`disabled`
   support and used by the Posts/Menu editors). Rewrite `FieldLibrary` to import
   `{ EditorRailGroup, EditorRailItem }` from `@/ui/shared/EditorFrame` and render
   the field types as a single grouped "Fields" rail (`active` = the
   currently-selected field's type), replacing today's bespoke flat `<button>` list
   (`FieldLibrary.tsx:30-43`). Do NOT re-approximate the rail with new Tailwind.
   **Also DELETE the two non-prototype chrome elements the rewrite must not keep:**
   (a) the standalone "Fields Library" header block (`FieldLibrary.tsx:23-27`) — the
   `EditorRailGroup label="Fields"` supplies the group heading, so a separate header
   is redundant and absent from the prototype (`FormBuilderPreview.tsx:60-73` shows
   only the `EditorRailGroup`); and (b) the dead no-op "Advanced Fields" footer
   `<Button>` (`FieldLibrary.tsx:46-50`), which has no handler and no prototype
   counterpart. After the rewrite `FieldLibrary` returns only the
   `EditorRailGroup`/`EditorRailItem` list (drop the now-unused `Button`/`ScrollArea`
   imports — `EditorRailGroup` supplies the label + item spacing, and the
   `EditorFrame` left aside owns overflow scrolling, matching the prototype
   `EditorPreviewFrame` aside `overflow-y-auto`, so no local `ScrollArea` is needed).
5. **Field list panel ownership (G2 consistency).** `FieldListPanel`
   (`core/admin/ui/forms/FieldListPanel.tsx`) is the added-fields list; keep it
   reachable inside the `EditorFrame` `left` slot (as the "Fields" tab beside the
   "Library" rail) and in the mobile Sheet. Align its selectable rows
   (`FieldListPanel.tsx:77-104`) toward the `EditorRailItem` active/hover look for
   rail visual consistency — a **bounded styling-only** edit that preserves the
   search box, per-row Required badge, type label, and the add ("+") button. This
   makes the sole-writer claim over `FieldListPanel.tsx` non-empty and
   unambiguous.

## Pseudocode (grounded in real code)

```tsx
// ── new imports ───────────────────────────────────────────────
import { AdminShell } from "@/ui/layouts/AdminShell";        // replaces EditorShell (:46)
import { PageHeader } from "@/ui/shared/PageHeader";
import { EditorFrame, EditorRailGroup, EditorRailItem } from "@/ui/shared/EditorFrame";
import { Monitor, Smartphone, Rocket, Undo2, Redo2 } from "lucide-react";
import type { FormFormTheme, FormStatus } from "@/services/formsClient"; // 516-01 re-exports FormFormTheme here
// (FormSettings already imported from @/services/formsClient at :42)

// fieldLibraryItems (FormBuilderPage.tsx:68) — add:
{ id:"phone", label:"Phone", icon: Phone, type:"phone", helper:"Collects a telephone number." },
// NOTE: no File entry here — 516-07 (lands last) appends the File rail item itself
//       ({ id:"file", label:"File Upload", icon: Paperclip, type:"file", ... }) as an additive file-only edit.

// device toggle state:
const [previewDevice, setPreviewDevice] = useState<"desktop"|"mobile">("desktop");

// theme handler — STATEMENT BODY (mirror setFormSettings :585-594 exactly; the old
// `setMeta(...) && setUnsavedChanges(true)` is broken: setMeta returns undefined so the
// dirty flag never fires and theme edits silently can't be saved).
//
// GROUP-LEVEL REPLACE semantics (the contract 516-02 relies on): `{ ...(prev.settings.theme
// ?? {}), ...updates }` is a SHALLOW merge, so each key in `updates` (a group like
// `layout`/`surface`) REPLACES the whole group object at that key — it does NOT deep-merge
// inside a group. This is exactly what enables 516-02's per-control reset (`clearKey`): the
// panel emits the already-reduced group object (target key deleted) DIRECTLY via
// onThemeChange, and this replace overwrites the stored group with the reduced one, so the
// deleted key is gone. `normalizeFormSettings`→`normalizeFormTheme` is present-only, so an
// emptied group emitted as `{ [group]: undefined }` (or the whole `theme: undefined` for
// "reset all") is dropped — no leftover empty objects, byte-identity preserved.
const setFormTheme = (updates: Partial<FormFormTheme> | undefined) => {
  setMeta((prev) => ({
    ...prev,
    settings: normalizeFormSettings({
      ...prev.settings,
      theme: updates === undefined ? undefined : { ...(prev.settings.theme ?? {}), ...updates },
    }),
  }));
  setUnsavedChanges(true);
};

// FIELDS rail (FieldLibrary.tsx) — REUSE shared primitives, active = selected field's type:
<EditorRailGroup label="Fields">
  {items.map((it) => (
    <EditorRailItem
      key={it.id}
      icon={<it.icon />}
      active={it.type === selectedFieldType /* passed in from FormBuilderPage; undefined ⇒ no active */}
      onClick={() => onAddField(it)}
    >
      {it.label}
    </EditorRailItem>
  ))}
</EditorRailGroup>

// inspector tabs (renderFormInspector :692) — insert Design between Settings & Automation:
<TabsTrigger value="design">Design</TabsTrigger>
<TabsContent value="design"><FormDesignPanel theme={meta.settings.theme} onThemeChange={setFormTheme} /></TabsContent>
// widen inspectorTab union AND its onValueChange cast (:695) to "settings" | "design" | "automation"

// Publish — pass an explicit status override so the SAME-tick save payload is 'published'.
// (setMeta is async: reading `meta.status` inside handleSave after setMetaField would still
//  see the pre-update 'draft' in this handler's closure — the naive version saves 'draft'.)
const handleSave = async ({ statusOverride }: { statusOverride?: FormStatus } = {}) => {
  // …unchanged (:528-533)…
  updateForm(activeForm.id, {
    name: meta.name,
    description: meta.description,
    status: statusOverride ?? meta.status,   // was `status: meta.status` (:551)
    submissionAccess: meta.submissionAccess,
    successMessage: meta.successMessage,
    successRedirectUrl: meta.successRedirectUrl,
    settings: meta.settings,
  }),
  // …unchanged Promise.all + error/finally (:547-573); note existing handleSave() call sites
  //   (onClick, :812) pass no args, so the default `{}` keeps them working…
};
const handlePublish = async () => {
  setMetaField("status", "published");       // keep local inspector UI in sync
  await handleSave({ statusOverride: "published" });
};

// ── chrome: replace EditorShell (:740) + sticky sub-toolbar (:787-827) ──
<AdminShell activeHref="/admin/advanced/forms" breadcrumbs={["Content","Forms", formTitle]} topbarActions={/* StatusBadge + Unsaved badge, unchanged */}>
  <div className="flex h-full flex-col gap-6">
    <PageHeader
      breadcrumbs={[{ label:"Forms", href:"/admin/advanced/forms" }, { label: formTitle }]}
      title={formTitle}
      description="Drag fields onto the canvas and configure them on the right." // static builder hint (prototype FormBuilderPreview.tsx:46), NOT formDescription
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={openSubmissions}>Submissions</Button>
          <Button variant="outline" size="sm" onClick={openActionLogs}>Action logs</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={openRuntimePreview} disabled={!activeForm || isBusy}><Eye className="h-4 w-4"/> Runtime preview</Button>
          <Button variant="ghost" onClick={handleSave} disabled={isBusy || !hasUnsavedChanges}>{isSaving ? "Saving..." : "Save"}</Button>
          <Button className="gap-1.5" onClick={handlePublish} disabled={isBusy || !activeForm}><Rocket className="size-4"/> Publish</Button>
        </div>
      }
    />
    <EditorFrame
      title="Form builder"
      toolbar={<Badge variant="outline">{formTitle} · {meta.status}</Badge>}
      actions={
        <div className="flex items-center gap-1">
          {/* render-only disabled undo/redo (prototype chrome fidelity; NO history stack — parent scope 366-377) */}
          <Button variant="ghost" size="icon-sm" disabled aria-label="Undo"><Undo2 className="h-4 w-4"/></Button>
          <Button variant="ghost" size="icon-sm" disabled aria-label="Redo"><Redo2 className="h-4 w-4"/></Button>
          <Button variant={previewDevice==="desktop"?"secondary":"ghost"} size="icon-sm" onClick={()=>setPreviewDevice("desktop")}><Monitor className="h-4 w-4"/></Button>
          <Button variant={previewDevice==="mobile"?"secondary":"ghost"} size="icon-sm" onClick={()=>setPreviewDevice("mobile")}><Smartphone className="h-4 w-4"/></Button>
        </div>
      }
      left={/* Fields/Library Tabs: FieldListPanel (added fields) + FieldLibrary rail */}
      canvas={<FormCanvas ... deviceWidth={previewDevice} theme={meta.settings.theme} />}
      right={selectedTarget?.type === "form" ? renderFormInspector() : <FieldSettingsPanel .../>}
    />
  </div>
  {/* keep mobile Sheets (:879 fields, :915 inspector — both render the Design tab), toasts, FormRuntimePreviewDialog */}
</AdminShell>
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
  `FormCanvas`; **Publish calls the mocked `updateForm` with `status:"published"`**
  (assert the call argument, not merely that a save fired — this guards the
  status-override fix against the async-`setMeta` regression); **a theme edit
  through `setFormTheme` marks the form dirty (Save/`hasUnsavedChanges` enabled)
  and persists `settings.theme` via `updateForm`** (guards the statement-body
  dirty-flag fix). Pure render lane (mock `formsClient`).

## UI/UX fidelity + max-config-flexibility notes

Match the prototype builder chrome (`FormBuilderPreview.tsx`) by ADOPTING the
admin `PageHeader` + `EditorFrame` primitives (see Scope item 2), not by
patching the old `EditorShell` sticky toolbar: in-page `PageHeader` (breadcrumb
`Forms › <name>`, title, description, `Save` ghost + `Publish` primary w/ Rocket),
framed `EditorFrame` card (toolbar status badge `<name> · <status>`, desktop/mobile
device toggle in the frame `actions`, FIELDS rail left, canvas card, inspector
right). Undo/redo is delivered as **render-only chrome fidelity** — two `disabled`
Undo/Redo buttons (matching the prototype's `EditorPreviewFrame.tsx:47-52` icons +
placement) with NO history stack; functional edit-history is explicitly out of
scope per the parent scope decision (TASK-516 lines 366-377, DoD 548). Do NOT regress the
existing Submissions / Action logs / Runtime preview entry points (fold them into
the `PageHeader` actions row).
