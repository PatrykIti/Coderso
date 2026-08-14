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
**Status:** ✅ Done
**Completed:** 2026-07-06

---

## Scope (single-writer keystone)

**Sole writer of `core/admin/ui/forms/FormBuilderPage.tsx` and
`core/admin/ui/forms/FieldLibrary.tsx`,
and their existing coverage `tests/vitest/ui-integration/forms-builder-restyle.test.tsx`
+ `tests/vitest/ui/form-builder.test.tsx` (both MUST be migrated by this subtask —
see Testing requirements; the chrome rewrite otherwise breaks their EditorShell mock
and `Save form` assertions).**
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
     - **RELOCATE the two `lg:hidden` mobile Sheet openers.** The sticky bar being
       deleted (`:787-827`) holds the ONLY triggers that open the retained mobile
       Sheets: the "Fields" button (`:818`, `onClick={() => setMobileFieldsOpen(true)}`)
       and the "Details" button (`:821`, `onClick={() => setMobileSettingsOpen(true)}`).
       Because `EditorFrame`'s `left`/`right` slots are `lg`/`xl`-hidden, these two
       Sheets (`:879`/`:915`) are the sole mobile access to the field rail + inspector.
       Move both openers into this `PageHeader` actions row inside an `lg:hidden`
       wrapper (`<div className="flex items-center gap-2 lg:hidden">…</div>`), keeping
       their exact `variant="outline" size="sm"` styling and `setMobileFieldsOpen(true)`
       / `setMobileSettingsOpen(true)` handlers. Without this the `mobileFieldsOpen`
       /`mobileSettingsOpen` state (`:302-303`) can never become `true`, mobile users
       lose all access to the field rail + inspector, and the state/handlers become
       dead code. Do NOT drop them.
   - `EditorFrame` (`@/ui/shared/EditorFrame`, slots `title/toolbar/actions/left/canvas/right`;
     re-exports `EditorRailGroup`/`EditorRailItem`): `title="Form builder"`;
     `toolbar` = **empty** (leave it unset). The admin `EditorFrame` renders
     `toolbar` in the LEFT chrome group next to the title (`{title}{toolbar}`,
     `EditorFrame.tsx:43-46`) — the OPPOSITE mapping from the prototype
     `EditorPreviewFrame`, whose `toolbar` renders in the RIGHT group next to
     undo/redo/device (`EditorPreviewFrame.tsx:44-45`, badge passed as `toolbar` at
     `FormBuilderPreview.tsx:59`). Since the prototype's status badge + undo/redo +
     device toggle are ALL right-aligned, in the admin frame they go in `actions`
     (parent TASK-516 lines 388-393); putting the badge in `toolbar` would render it
     LEFT (next to "Form builder"), diverging from the prototype.
     `actions` (rendered RIGHT — `EditorFrame.tsx:46`) = the **status badge FIRST**
     (`<Badge variant="outline">{formTitle} · {meta.status}</Badge>`, mirroring the
     prototype's right-aligned `Contact form · draft` badge), THEN two **render-only
     `disabled` Undo/Redo buttons** (`Undo2`/`Redo2` lucide icons, `size="icon-sm"`,
     always `disabled`) placed before the device toggle to mirror the prototype
     chrome (`EditorPreviewFrame.tsx:47-52` renders both unconditionally), THEN the
     **desktop/mobile device toggle** (drives `previewDevice`). Per the parent scope decision (TASK-516 lines 366-377) and
     DoD (line 548), functional edit-history is **out of scope** — do NOT build a
     history stack; render the two buttons disabled so the toolbar matches the
     prototype visually and the parent smoke (which asserts they render disabled)
     passes. `left` = FIELDS rail (see item 4) + added-fields list
     (see item 5); `canvas` = `<FormCanvas … deviceWidth={previewDevice} theme={meta.settings.theme}/>`;
     `right` = `renderFormInspector()` / `FieldSettingsPanel` (unchanged logic).
   - **The `canvas` slot must PRESERVE the full current content-region body
     (`FormBuilderPage.tsx:828-868`), not just `<FormCanvas>`.** Move the inner
     contents of that `<div>` verbatim into the `canvas` slot: (a) the `loadError`
     `<Alert variant="destructive">` (`:829-834`), (b) the `remoteUpdatePending`
     "Updated in another tab" `<Alert>` + Refresh button wired to
     `refreshForm({ allowUnsaved:true })` (`:835-849`), and (c) the
     `isLoading ? "Loading form builder…" placeholder : <FormCanvas …/>` ternary
     (`:850-867`). Dropping these would regress error surfacing + cross-tab conflict
     UX AND break the existing SSR assertion `form-builder.test.tsx:16`
     (`expect(html).toContain("Loading form builder")`). The `EditorFrame` `canvas`
     slot replaces the old `:828` flex wrapper `<div>`, so its padding/scroll is now
     owned by `EditorFrame`, but the three inner pieces move in unchanged.
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
5. **Single-rail model + `FieldListPanel` fate (prototype fidelity — NO
   Fields/Library tab split).** The prototype has exactly ONE left rail — the
   `EditorRailGroup label="Fields"` LIBRARY (`FormBuilderPreview.tsx:60-73`) — and
   field **selection is canvas-click**, NOT a separate added-fields list tab; the
   selected field card carries `ring-2 ring-primary` (`FormBuilderPreview.tsx:117`).
   Per parent TASK-516 lines 414-430, 516-03 therefore mounts **`FieldLibrary`
   ALONE** as `EditorFrame.left` (and in the mobile fields Sheet) — there is **NO**
   `Fields`/`Library` `Tabs` pair and `FieldListPanel` is **NOT** a left-rail tab.
   This is LOW-RISK and already-supported: the real `FormCanvas` ALREADY implements
   canvas-click selection (`onSelectField`/`selectedFieldId` + `ring-2 ring-primary`
   at `FormCanvas.tsx:48`) and per-card remove (`onRemoveField`, `:66`), so no new
   canvas selection work is needed (516-04 Scope §4 "keep selection/remove
   affordances intact" already covers it). **Reorder is out of scope:** it is NOT
   implemented anywhere today (`FieldListPanel` props are only
   `fields/selectedId/onSelect/onAdd`, `FieldListPanel.tsx:17-23` — no `onMove`/
   `onReorder`; the canvas `GripVertical` at `FormCanvas.tsx:54` is a render-only
   handle), so dropping the list tab loses no reorder feature (tracked as a
   follow-up, matching the parent's out-of-scope posture on functional history).
   **`FieldListPanel.tsx` fate + `FormBuilderPage.tsx` sole-writer removal
   (unambiguous):** the removal is done **entirely in `FormBuilderPage.tsx`**, NOT
   by gutting `FieldListPanel.tsx`. Concretely, the sole-writer `FormBuilderPage.tsx`
   edit DELETES: (a) the `fieldListItems` `useMemo<FormFieldListItem[]>`
   (`FormBuilderPage.tsx:317`), (b) BOTH `<FieldListPanel>` render sites — the
   desktop left-tab one (`:749`, replaced by `<FieldLibrary>` in `EditorFrame.left`)
   and the mobile-Sheet one (`:892`, replaced by `<FieldLibrary>` in the mobile
   fields Sheet per this item), and (c) the now-unused
   `import { FieldListPanel, type FormFieldListItem } from "./FieldListPanel"`
   (`:61`), and (d) the now-obsolete Fields/Library **tab machinery** the single-rail
   model deletes on BOTH surfaces: the `leftTab`/`setLeftTab` `useState` (`:293`) + its
   `setLeftTab("fields")` call (`:464`), the desktop leftPanel `<Tabs>` Fields/Library
   wrapper (`:743-747`, `:753`), AND the mobile fields Sheet `<Tabs>` wrapper (`:886`,
   `:899`) — the mobile Sheet content becomes `<FieldLibrary>` alone (matching the desktop
   left slot), so no `leftTab` reference survives (an unused `leftTab`/`setLeftTab` would
   FAIL the same `bun --cwd core lint:types` gate) and neither surface keeps a Fields/Library
   split (single-rail, both desktop + mobile). The `:61` import MUST be dropped: its sole consumer was the `:317` memo
   (grounded: `FormFieldListItem`/`fieldListItems` appear ONLY at `:61`/`:317`/`:749`
   /`:892` in `FormBuilderPage.tsx`), so once the memo + render sites are gone the
   import is unused and would FAIL the `bun --cwd core lint:types` / root `tsc`
   gate. (This corrects the earlier "still imported at `:61`" rationale — after the
   removal it is NOT imported there.)
   **`FieldListPanel.tsx` is NOT reduced/gutted — 516-03 leaves it unchanged.** The
   `FieldListPanel` component (and its `FormFieldListItem` type) is RETAINED because
   the standalone component test `tests/vitest/ui/forms-component-wave.test.tsx:416-486`
   (which is NOT in 516-03's sole-writer set) imports and renders the REAL component
   (`const { FieldListPanel } = await import(".../FieldListPanel")` → `<FieldListPanel
   fields={[]} selectedId={null} onSelect onAdd/>`). Deleting or gutting the component
   would break that unowned test under `vitest` + `tsc`; single-writer discipline
   forbids 516-03 editing it. So `FieldListPanel.tsx` stays a live, test-covered
   primitive that the builder simply no longer renders (no desktop tab, no mobile
   Sheet use). The desktop `left` slot is `FieldLibrary` alone; the mobile fields
   Sheet renders `FieldLibrary` too (no added-fields list retained anywhere).

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
          {/* relocated mobile Sheet openers (were sticky-bar :818/:821 — the ONLY triggers for the
              retained :879/:915 Sheets); EditorFrame left/right are lg-hidden so these are the sole
              mobile access to the field rail + inspector */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button variant="outline" size="sm" onClick={() => setMobileFieldsOpen(true)}>Fields</Button>
            <Button variant="outline" size="sm" onClick={() => setMobileSettingsOpen(true)}>Details</Button>
          </div>
        </div>
      }
    />
    <EditorFrame
      title="Form builder"
      /* toolbar intentionally EMPTY — admin EditorFrame renders toolbar LEFT next to the
         title (EditorFrame.tsx:43-46); the prototype right-aligns the badge, so it goes in
         `actions` below, NOT `toolbar` (parent TASK-516 388-393) */
      actions={
        <div className="flex items-center gap-1.5">
          {/* status badge FIRST (right-aligned like the prototype's `Contact form · draft`,
              FormBuilderPreview.tsx:59) */}
          <Badge variant="outline">{formTitle} · {meta.status}</Badge>
          {/* render-only disabled undo/redo (prototype chrome fidelity; NO history stack — parent scope 366-377) */}
          <Button variant="ghost" size="icon-sm" disabled aria-label="Undo"><Undo2 className="h-4 w-4"/></Button>
          <Button variant="ghost" size="icon-sm" disabled aria-label="Redo"><Redo2 className="h-4 w-4"/></Button>
          {/* segmented device pill (prototype EditorPreviewFrame.tsx:53-61): one bordered
              bg-card p-0.5 container, active device on a bg-muted chip; wired to setPreviewDevice */}
          <div className="ml-1 hidden items-center rounded-lg border border-border bg-card p-0.5 sm:flex">
            <button type="button" aria-label="Desktop preview" aria-pressed={previewDevice==="desktop"}
              onClick={()=>setPreviewDevice("desktop")}
              className={cn("flex size-6 items-center justify-center rounded-md",
                previewDevice==="desktop" ? "bg-muted text-foreground" : "text-muted-foreground")}>
              <Monitor className="size-3.5"/>
            </button>
            <button type="button" aria-label="Mobile preview" aria-pressed={previewDevice==="mobile"}
              onClick={()=>setPreviewDevice("mobile")}
              className={cn("flex size-6 items-center justify-center rounded-md",
                previewDevice==="mobile" ? "bg-muted text-foreground" : "text-muted-foreground")}>
              <Smartphone className="size-3.5"/>
            </button>
          </div>
        </div>
      }
      left={<FieldLibrary items={fieldLibraryItems} onAddField={handleAddField} selectedFieldType={selectedFieldType}/> /* SINGLE library rail — NO Fields/Library Tabs; selection is canvas-click (FormCanvas onSelectField + ring-2 ring-primary), see Scope item 5 */}
      canvas={/* move :828-868 body inner contents here verbatim — NOT just FormCanvas: */
        <>
          {loadError ? (
            <Alert variant="destructive"><AlertTitle>Unable to load form</AlertTitle><AlertDescription>{loadError}</AlertDescription></Alert>
          ) : null}
          {remoteUpdatePending ? (
            <Alert><AlertTitle>Updated in another tab</AlertTitle><AlertDescription className="…">
              <span>New changes are available. Refresh to load the latest version.</span>
              <Button variant="outline" size="sm" onClick={() => refreshForm({ allowUnsaved: true })}>Refresh</Button>
            </AlertDescription></Alert>
          ) : null}
          {isLoading ? (
            <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground shadow-soft">Loading form builder...</div>
          ) : (
            <FormCanvas ... deviceWidth={previewDevice} theme={meta.settings.theme} />
          )}
        </>}
      right={selectedTarget?.type === "form" ? renderFormInspector() : <FieldSettingsPanel .../>}
    />
  </div>
  {/* keep mobile Sheets (:879 fields, :915 inspector — both render the Design tab), toasts, FormRuntimePreviewDialog;
      NOTE: loadError/remoteUpdatePending alerts + isLoading placeholder are NOT dropped — they moved into the EditorFrame `canvas` slot above */}
</AdminShell>
```

The mobile Sheet inspector (`:915`) must also render the Design tab so field/form
inspectors stay reachable on small screens (mirror the desktop tab set).

Error handling: Publish reuses `handleSave` error surfacing (`saveError`).
Device toggle is pure client state (no persistence).

## Testing requirements + lanes

**Lane:** Vitest, Bun-free, pure render (mock `formsClient`). FormBuilderPage's
coverage already lives in the **ui** and **ui-integration** lanes, so this subtask
EXTENDS those files in place — do **NOT** introduce a divergent
`tests/vitest/admin/formBuilderPage.test.tsx` (none exists today; `tests/vitest/admin/`
holds only `formsClient.test.ts`). The chrome rewrite BREAKS both existing files, so
migrating them is mandatory, not optional:

1. **UPDATE `tests/vitest/ui-integration/forms-builder-restyle.test.tsx`** (owned by
   this subtask). This file mounts the real `FormBuilderPage` with heavy children
   mocked and asserts three wired regions. The rewrite makes its central mock inert
   because the page no longer renders `EditorShell`:
   - **Replace the `@/ui/layouts/EditorShell` mock (`:191-210`)** with two mocks that
     match the new chrome: `@/ui/layouts/AdminShell` (passthrough — render
     `<div data-region="topbar">{topbarActions}</div>` + `{children}`) and
     `@/ui/shared/EditorFrame` (map the new slots to the existing region hooks so the
     data-region assertions keep working: `left`→`<aside data-region="left">`,
     `canvas`→`<main data-region="canvas">`, `right`→`<aside data-region="right">`;
     the mock module must also re-export passthrough `EditorRailGroup`/`EditorRailItem`
     because `@/ui/shared/EditorFrame` re-exports them — `EditorFrame.tsx:67`). Leave
     `PageHeader` real (pure layout, SSR-safe). Of the existing region assertions
     (`:302-313`), `canvas:1` in `canvas` and `field-settings-panel` in `right` pass
     unchanged against the EditorFrame mock's regions; **but `field-list:1` in `left`
     must be RETARGETED** — the single-rail model (Scope item 5) mounts `FieldLibrary`
     ALONE in `left` (NO Fields/Library tab pair), so `FieldListPanel` is no longer
     rendered in `left`. Change that assertion to `add-library-field` in `left` (the
     file's own `FieldLibrary` mock, `:212`/`:305`, is now the sole left-slot region),
     and drop the file's `FieldListPanel` mock as inert (the page no longer imports
     or renders `FieldListPanel` — Scope item 5 deletes the `:317` memo, the
     `:749`/`:892` render sites, and the `:61` import; the `FieldListPanel` component
     itself is NOT removed — it remains a standalone test-covered primitive exercised
     by `tests/vitest/ui/forms-component-wave.test.tsx:416-486`, which 516-03 does not
     own — so this file's now-unused mock is simply deleted).
   - **Rename the Save trigger `:368`** `clickByText(view.container, "Save form")`
     → `"Save"` (the PageHeader Save button label changes `Save form`→`Save`; the
     save-writes assertions `:371-374` stay).
   - The `FormCanvas` mock (`:233`) currently renders `canvas:{fields.length}`; extend
     it to also surface the new `deviceWidth` prop (e.g. render
     `device:{deviceWidth}`) so the new device-toggle test below can assert it.
   - There are **no** `Fields Library`/`Advanced Fields` assertions in this file to
     drop (the local `FieldLibrary` mock at `:212` short-circuits that chrome); the
     deletions in Scope item 4 are covered by the `form-builder.test.tsx` render below.
2. **UPDATE `tests/vitest/ui/form-builder.test.tsx`** (owned by this subtask). It
   `renderToString`s the real page (no mocks). **Change `:21`** `expect(html)
   .toContain("Save form")` → `"Save"`. The `"Loading form builder"` assertion
   (`:16`) stays valid ONLY because the `isLoading` placeholder moves into the
   `EditorFrame` `canvas` slot verbatim (Scope item 2) — it must NOT be dropped in
   the chrome rewrite. **`Fields` (`:17`) stays valid** — it is now the single
   `EditorRailGroup label="Fields"` heading (Scope item 4/5), NOT a tab. **But
   `Library` (`:18`) must be DROPPED** — the single-rail model (Scope item 5) removes
   the `Fields`/`Library` `Tabs` pair, so there is no "Library" tab label; simply
   delete the `:18` assertion (do NOT replace it with a bare
   `.not.toContain("Library")` — the `AdminShell` nav rendered under `renderToString`
   may legitimately contain a "…Library" nav link, which would make that negative
   flaky). `Form Settings` (`:19`) is the
   inspector, `Action logs` (`:20`) folds into the `PageHeader` actions row (Scope
   item 2). ADD negative assertions that the deleted non-prototype chrome is gone:
   `expect(html).not.toContain("Fields Library")` and
   `expect(html).not.toContain("Advanced Fields")` (Scope item 4 deletes
   `FieldLibrary.tsx:23-27` header + `:46-50` footer button). Confirm the real
   `AdminShell`/`PageHeader`/`EditorFrame` render under `renderToString` (they are
   pure layout wrappers, already SSR-rendered by the menu/posts editors).
3. **NEW assertions — add to the existing ui-integration file** (extend
   `forms-builder-restyle.test.tsx`, same lane, reuse its `formsClient` mock +
   `mount`/`flush` harness):
   - the field library includes a `Phone` item and adding it appends a `type:"phone"`
     field (needs the file's `FieldLibrary` mock relaxed to expose the `phone` item,
     or a dedicated test that unmocks `FieldLibrary` via `vi.importActual` — mirror
     the `FormSettingsPanel` real-panel pattern already used at `:319-323`);
   - the inspector exposes a `Design` tab that renders `FormDesignPanel`;
   - toggling the device control updates the `deviceWidth` passed to `FormCanvas`
     (assert `device:mobile` appears in the `canvas` region after clicking the
     mobile toggle, via the extended FormCanvas mock above);
   - **Publish calls the mocked `updateForm` with `status:"published"`** (assert the
     call argument, not merely that a save fired — guards the status-override fix
     against the async-`setMeta` regression);
   - **a theme edit through `setFormTheme` marks the form dirty (`Save`/
     `hasUnsavedChanges` enabled) and persists `settings.theme` via `updateForm`**
     (guards the statement-body dirty-flag fix).
   - **the relocated mobile openers stay reachable** — assert a "Details" opener
     button (the mobile inspector trigger, `setMobileSettingsOpen(true)`) renders in
     the `PageHeader` actions row, and clicking it opens the mobile inspector Sheet
     (assert the inspector region content appears). This guards against the sticky-bar
     deletion orphaning the retained mobile Sheets (`:879`/`:915`) and leaving
     `mobileFieldsOpen`/`mobileSettingsOpen` (`:302-303`) permanently `false`. Use
     "Details" (not "Fields") as the query text since "Fields" also labels the
     single `EditorRailGroup` library heading (Scope item 5 — there is no
     Fields/Library tab pair anymore).

## UI/UX fidelity + max-config-flexibility notes

Match the prototype builder chrome (`FormBuilderPreview.tsx`) by ADOPTING the
admin `PageHeader` + `EditorFrame` primitives (see Scope item 2), not by
patching the old `EditorShell` sticky toolbar: in-page `PageHeader` (breadcrumb
`Forms › <name>`, title, description, `Save` ghost + `Publish` primary w/ Rocket),
framed `EditorFrame` card (RIGHT-aligned status badge `<name> · <status>` in the
frame `actions`, NOT `toolbar` — parent TASK-516 388-393; desktop/mobile
device toggle rendered as a single segmented pill — one `rounded-lg border bg-card
p-0.5` container with the active device on a `bg-muted` chip, per
`EditorPreviewFrame.tsx:53-61`, NOT two loose icon buttons — in the frame `actions`,
FIELDS rail left, canvas card, inspector
right). Undo/redo is delivered as **render-only chrome fidelity** — two `disabled`
Undo/Redo buttons (matching the prototype's `EditorPreviewFrame.tsx:47-52` icons +
placement) with NO history stack; functional edit-history is explicitly out of
scope per the parent scope decision (TASK-516 lines 366-377, DoD 548). Do NOT regress the
existing Submissions / Action logs / Runtime preview entry points (fold them into
the `PageHeader` actions row).
