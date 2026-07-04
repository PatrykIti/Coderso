# TASK-496-02: Screens Adopt the Shared Editor Chrome
# FileName: TASK-496-02-Screens-Adopt-Shared-Editor-Chrome.md

**Priority:** High
**Category:** Admin UI / Visual Refresh / Custom Screens / Editor Chrome
**Estimated Effort:** Large
**Dependencies:** TASK-496-01 (shared editor-chrome shell + Pages adoption — **hard blocker**, this task consumes the shell it produces), TASK-495-03 (page-editor look shipped), TASK-474 (custom-screen canvas parity + authoring-boundary fence), TASK-468 (screen entry-view editor / ScreenDocumentV1 engine), TASK-479-14-L02 (entry-view canvas), TASK-479-06-L06 (orphaned `shared/CanvasEditor.tsx` port)
**Status:** ✅ Done
**Completed:** 2026-06-30
**Parent Task:** TASK-496

---

## Overview

Make the two **Custom Screen** editor surfaces render through the **shared editor-chrome shell** (`core/admin/ui/shared/CanvasEditor.tsx`, repurposed by 496-01) so they get the exact page-editor look (separated card + in-content `PageHeader` + light right/bottom-docked collapsible panel + dark-correct dotted canvas), while keeping their distinct engine: `ScreenDocumentV1` / `ScreenBlockV1`, the separate `ScreenFieldBinding` layer, the `CustomScreenDefinitionV4` envelope, the dual List/Editor builder views, and the single `ScreenRuntimeRenderer` that drives both builder and inline-edit modes. The two surfaces are:

1. **Screen builder** — `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` (List View column designer + Editor View block canvas), today wrapped in `CustomScreenShell` + a hand-rolled sticky topbar (`:865-928`) + the dark bottom-center `AuthoringCanvasFrame` / `AuthoringFloatingToolbar` (`:957-977`). → adopt the shell with **`panelPosition="right"`** under a `PageHeader` (prototype `CustomScreenEditorPreview.tsx:188-218`, title `"Entry-view builder"`, List view / Entry view toggle in the header).
2. **Screen entry-content editor** — `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` (per-record inline editing), today wrapped in `EditorShell` + a sticky sub-header + `AuthoringCanvasFrame borderless` (`:1206-1228`). → adopt the shell with **`panelPosition="bottom"`** (prototype `CustomScreenEntryEditorPreview.tsx:123-131`, the floating rich-text/format toolbar dock).

The change is **presentation-only**: the screen document model, bindings, list-view model, runtime renderer, autosave/dirty/cache plumbing, and the `{{ field }}` binding semantics are untouched. The **dark `AuthoringFloatingToolbar`** is replaced by the shell's light rail; the now-unused dark chrome (`AuthoringFloatingToolbar`, `AuthoringCanvasFrame`, and the authoring `canvasChrome.ts` they exclusively consume) is **deleted** (NO DEAD CODE). Authoring/screen **logic** to keep: `InlineEditWrapper`, `AuthoringLayersPanel`, `AuthoringCommandPalette`, `authoringCommands`, `authoringSelection`, `selectionChrome`/`selectionBorder`, `ScreenRuntimeRenderer`, `ScreenBlockInspector`, `ScreenBlockLibrary`. (The block binding UI is rendered **inside** `ScreenBlockInspector` via its `bindings`/`onPatchBinding` props — verified `ScreenBlockInspector.tsx:110,258,290`, mounted as the Editor-View `inspectorPanel` whenever `activePanel === "binding"` — `ScreenAuthoringCanvas.tsx:320-349`. The standalone `core/admin/ui/custom-screens/FieldBindingPanel.tsx` is therefore **NOT** on the keep-list: it has **zero** production importers — only `tests/vitest/ui/custom-screen-binding-panel.test.tsx` `:7-8` and `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx` `:8` render it in isolation — so it is a pre-existing production orphan retired by this program; see Step 5.)

See memory **[[task-474-custom-screen-canvas-parity]]** (why screens are a parallel stack behind a boundary fence), **[[task-468-completion-state]]** (the ScreenDocumentV1 engine is Done — do not re-architect it), and **[[pages-editor-v2-remediation-program]]** (the proven chrome being shared).

- **Goal:** `CustomScreenEditorPage.tsx` (builder, both List/Editor views) and `CustomScreenEntryEditor.tsx` (entry content) render via the shared `CanvasEditor` shell, visually matching Pages, with all current screen functionality preserved and the dark authoring toolbar retired.
- **Owning modules:** `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`, `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`, `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx`, `core/admin/ui/custom-screens/CustomScreenShell.tsx`, `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx`; the shared shell `core/admin/ui/shared/CanvasEditor.tsx`; retired: `core/admin/ui/authoring/AuthoringFloatingToolbar.tsx`, `core/admin/ui/authoring/AuthoringCanvasFrame.tsx`, `core/admin/ui/authoring/canvasChrome.ts`, and their `core/admin/ui/authoring/index.ts` re-exports (`:1,3,8`).
- **Source-of-truth docs:** `_docs/CONTENT_TYPES_SPEC.md` (screen/binding contract — **only** touched if §"Optional contract refresh" is exercised), `_docs/DESIGN_TOKENS.md`, `_docs/TESTING_STRATEGY.md`. **Prototype source to match:** `_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx` (builder, `panelPosition="right"`) and `_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEntryEditorPreview.tsx` (entry, `panelPosition="bottom"`).
- **Out of scope:** No change to `ScreenDocumentV1`/`ScreenBlockV1`/`ScreenFieldBinding`/`CustomScreenDefinitionV4` shapes, normalization, or `reject-unknown` guards (unless the optional contract refresh below is taken); no change to list-view column/formatter/filter/sort model; no route/RBAC/cache change; no migration of screens onto `PageEditor`/`PageDocumentV2` (Route A is rejected — `pageEditorHostContract.ts:178` `mode` union has no `"screen"` and the host is hardwired to `PageDocumentV2`); no deletion of the authoring **logic** modules.

---

## Security Contract

UI-only. No endpoint, permission-model, route, RBAC, cache-key, or `adminPaths` change. Reads/writes keep flowing through the existing `customScreensClient` helpers and `cacheKeys` / `subscribeCacheEvents` plumbing already in `CustomScreenEditorPage.tsx` and `CustomScreenEntryEditor.tsx` (dirty-state guard, `remoteUpdatePending` revalidation, autosave). The active assistant surface registration (`buildCustomScreenAssistantSurface` → `setActiveAssistantSurfaceContext`, `CustomScreenEditorPage.tsx:233-234`) is preserved unchanged.

The shared shell `core/admin/ui/shared/CanvasEditor.tsx` is **purely presentational** (the repurposed body imports only `@/lib/utils` (`cn`) + `react` types `ReactNode`/`Ref` — the `header`/`toolbar`/`panel`/`badge`/`reopenAffordance` are all host-supplied `ReactNode` slots, so the shell imports **no** `@/ui/shared/PageHeader`, no `@/components/ui/button`, and no `lucide-react`; the host constructs the `PageHeader` node and passes it into the `header` slot) and **must not** gain any data/service import — this keeps it consumable by both `core/admin/ui/pages/*` (without violating the "pages must not import custom-screens" boundary rule) **and** `core/admin/ui/custom-screens/*` (without violating the "screen canvas modules must not import `@/ui/pages` / `ui/pages/builder` / `@/ui/widgets` / `ui/widgets/registry` / `WidgetRenderer`" rule). Both are enforced by `tests/vitest/ui/custom-screen-authoring-boundary.test.ts` — the shell living in `shared/` (not `pages/` or `authoring/`) is what makes the cross-surface reuse boundary-safe.

**Optional contract refresh (only if the data-oriented palette is expanded to match the prototype's Stat / Divider / Related-list / Tabs blocks):** this is **schema-first** — extend the `ScreenBlockKind` union in `core/services/customScreens/screenDocumentOps.ts:10-17` + `screenBlockLabels` (`:37`), add matching cases in `customScreenSchemas.ts` (`screenBlockTypeFromWidgetType` `:393` / `widgetTypeFromScreenBlock` `:408`) and a `ScreenRuntimeRenderer` case, keep every existing `rejectUnknownKeys` (`:232`) / `normalizeScreenBlock` (`:424`) guard (`reject-unknown` preserved), and keep it **backward-compatible** (old documents with the current 7 kinds — `record-header`/`field`/`field-group`/`columns`/`rich-text`/`actions`/`legacy-widget` — still normalize via `normalizeCustomScreenSchemaVersion` `:304`; unknown kinds still throw `custom_screen_definition_invalid`). If this refresh is NOT taken, the screen contract is unchanged. **Default for this task: no contract change** — the visual frame swap needs none, and the `{{ field }}` bindings already exist.

---

## Implementation Pseudocode

> Shell API (from TASK-496-01): `header` (in-content PageHeader node), `title`/`badge`/`toolbar` (sub-toolbar slots — `toolbar` carries the host's light control cluster), optional `deviceContext` (omitted by Screens — no device switcher), `canvas` (host-owned interactive surface), `panel` (the single floating control panel body), `panelPosition: "right" | "bottom"`, plus the **controlled (read-only)** `panelOpen` + its setter passthrough `onPanelOpenChange` (the host owns the lazy `useState`, no effect — ESLint react-hooks safe; per TASK-496-01 the shell only READS `panelOpen` and **never calls** `onPanelOpenChange` — the toolbar toggle + `reopenAffordance` slots flip the host's `setPanelOpen` directly, and the prop is kept to keep that setter referenced), and `reopenAffordance`. Mount inside `EditorShell variant="canvas"` (`EditorShell.tsx:31-42`).

### Step 1 — Screen builder: `CustomScreenEditorPage.tsx`

Replace the sticky topbar (`:865-928`) + the per-view `AuthoringCanvasFrame` wrappers (`:957-1004`) with an in-content `PageHeader` passed as the shell's `header` slot. Keep **every** existing handler and state untouched: `handleAddBlock`, `handlePatchBlock`, `handlePatchBlockData`, `handlePatchBinding`, `handleMoveBlock`, `handleDuplicateBlock`, `handleDeleteBlock`, `handleSelectBlock`, `updateListView`, `handleSave`, `activeBuilderTab` (`:191`), `selectedSectionId`, `selectedId`, `selectedListColumnId`, `definition`, `screenDocument`, `screenBindings`, `contentFields`, the `CustomScreenPreviewRecordOwner` wrapper (`:143,856`), and the workspace preview dialog (`:1008`). Add a host-owned `const [panelOpen, setPanelOpen] = useState(true)` (lazy, no effect) for the controlled shell.

```tsx
// core/admin/ui/custom-screens/CustomScreenEditorPage.tsx — render only (logic unchanged)
return (
  <CustomScreenPreviewRecordOwner key={previewOwnerKey} contentType={selectedContentType}>
    {({ isLoading: previewDataLoading, previewRecordState }) => {
      // Build the in-content PageHeader ONCE, OUTSIDE the List/Editor ternary — it carries
      // the List View / Entry View toggle + Save + Preview and MUST stay reachable in BOTH
      // views (today these live in the single shared sticky topbar :865-928, which sits
      // OUTSIDE the per-view branch that starts at :956; the prototype likewise renders one
      // PageHeader with the toggle above one CanvasEditor — CustomScreenEditorPreview.tsx:188-211).
      const screenPageHeader = (
        <PageHeader title={name || (isCreateMode ? "New screen" : "Untitled")}
          actions={<>
            <ListEntryViewToggle value={activeBuilderTab} onChange={setActiveBuilderTab} /> {/* reuse :878-915 buttons */}
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}><Eye/> Preview</Button>
            <Button size="sm" onClick={handleSave} disabled={isLoading || isSaving}><Save/> {isSaving ? "Saving..." : "Save"}</Button>
          </>} />
      );
      // Panel Hide/Show toggle (mirrors PageEditor:3504-3509) — the REAL consumer of
      // setPanelOpen, so the controlled-shell setter is not a dead passthrough. Reused by
      // the List-view toolbar slot AND forwarded to ScreenAuthoringCanvas (Step 2).
      const screenPanelToggle = (
        <Button variant={panelOpen ? "soft" : "ghost"} size="sm"
          onClick={() => setPanelOpen((o) => !o)}
          aria-label={panelOpen ? "Hide panel" : "Show panel"} aria-pressed={panelOpen}>
          {panelOpen ? "Hide panel" : "Show panel"}
        </Button>
      );
      // Pages-parity reopen chip (mirrors PageEditor:3362-3368) shown when the panel is hidden.
      const screenReopen = (
        <button type="button" onClick={() => setPanelOpen(true)} aria-label="Show panel"
          className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop transition-colors hover:text-primary">
          <SlidersHorizontal className="size-3.5" /> Show panel
        </button>
      );
      return (
      <>
        <CustomScreenShell variant="canvas" /* Step 4 */ name={name} status={status}
          hasUnsavedChanges={hasUnsavedChanges} isCreateMode={isCreateMode}>
          {isLoading ? <LoadingCard/>
           : activeBuilderTab === "list-view" ? (
            <CanvasEditor
              header={screenPageHeader}            {/* SAME node injected in both views */}
              title="List view"
              badge={hasUnsavedChanges ? <UnsavedBadge/> : null}
              toolbar={<><ScreenPanelToggleRail panels={listToolbarPanels} />{screenPanelToggle}</>}  {/* light segmented buttons + panel toggle */}
              panelPosition="right"
              panel={renderActiveListPanel()}     {/* unchanged: elements/column/list/hidden/settings */}
              panelOpen={panelOpen} onPanelOpenChange={setPanelOpen}
              reopenAffordance={screenReopen}
              canvas={
                <ListViewCanvas contentType={selectedContentType} listView={definition.listView}
                  selectedColumnId={selectedListColumnId}
                  onSelectColumn={(id) => { setSelectedListColumnId(id); setActiveListPanel("column"); }}
                  onMoveColumn={handleMoveListColumn} />
              }
            />
          ) : (
            // Editor view: ScreenAuthoringCanvas FORWARDS the shared header + panel toggle/reopen
            // into ITS CanvasEditor (Step 2) — it stays header-LESS itself (it authors none of
            // its own), so the toggle/Save/Preview remain reachable in the Editor view too.
            <ScreenAuthoringCanvas …unchanged props… header={screenPageHeader}
              panelToggle={screenPanelToggle} reopenAffordance={screenReopen}
              panelOpen={panelOpen} onPanelOpenChange={setPanelOpen} />  // refactored in Step 2
          )}
          {error ? <Alert variant="destructive">…</Alert> : null}
          {remoteUpdatePending ? <Alert>…Refresh…</Alert> : null}
        </CustomScreenShell>
        <CustomScreenWorkspacePreviewDialog …unchanged… />
      </>
      );
    }}
  </CustomScreenPreviewRecordOwner>
);
```

`ScreenPanelToggleRail` is a small light-token presentational helper that renders the existing `listToolbarPanels` (`:810`) / `toolbarPanels` arrays as the shell's `toolbar` segmented buttons (Insert/Layers/Content/Binding/Style / Elements/Column/List/Hidden/Settings), replacing the dark `AuthoringFloatingToolbar` panel buttons. Same `{ id, label, icon, active, disabled, onSelect }` shape — only the container/tone changes.

### Step 2 — Editor-View canvas: `ScreenAuthoringCanvas.tsx`

Swap the dark `AuthoringCanvasFrame` + `AuthoringFloatingToolbar` (`:367-469`, `:383`) for the shared `CanvasEditor`. Keep **all** selection/panel logic: `activePanel` state (`:174`), `toolbarPanels` (`:262`), `inspectorPanel` (`ScreenBlockInspector`), `floatingPanel` (Insert → `ScreenBlockLibrary`, Layers → `AuthoringLayersPanel`, else inspector), `commandOpen`/`AuthoringCommandPalette` (`:21,371`), `selectTarget`, and the `ScreenRuntimeRenderer mode="builder"` canvas. The dark move/duplicate/delete ghost actions become light buttons inside the shell `toolbar`.

```tsx
// ScreenAuthoringCanvas.tsx — same hooks/handlers, new frame.
// New props forwarded from CustomScreenEditorPage (Step 1): `header` (the SHARED PageHeader
// node — this component authors none of its own), `panelToggle` (the Hide/Show button node),
// and `reopenAffordance`. They are passed straight through to the shell so the List/Entry
// toggle + Save + Preview stay reachable in the Editor view and the panel can be hidden/shown.
return (
  <CanvasEditor
    header={header}                              {/* SHARED with the List view — keeps the toggle/Save/Preview */}
    title="Entry-view builder"
    panelPosition="right"
    panelOpen={panelOpen} onPanelOpenChange={onPanelOpenChange}
    reopenAffordance={reopenAffordance}
    toolbar={
      <>
        <ScreenPanelToggleRail panels={toolbarPanels} />
        {selectedBlock ? (
          <BlockActionButtons                       /* light tone; same onMove/onDuplicate/onDelete */
            onMoveUp={() => onMove(selectedBlock.id, "up")} onMoveDown={() => onMove(selectedBlock.id, "down")}
            onDuplicate={() => onDuplicate(selectedBlock.id)} onDelete={() => onDelete(selectedBlock.id)} />
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label="Open command palette" onClick={() => setCommandOpen(true)}><Search/></Button>
        )}
        {panelToggle}                               {/* Hide/Show panel — the real setPanelOpen consumer */}
      </>
    }
    panel={
      activePanel === "settings" ? settingsPanel
      : activePanel === "insert" ? <ScreenBlockLibrary fields={fields} onAddBlock={onAddBlock} />
      : activePanel === "layers" ? <AuthoringLayersPanel nodes={layerNodes} selection={selection} onSelect={selectTarget} />
      : inspectorPanel
    }
    canvas={
      <div className="space-y-4" data-screen-authoring-canvas="true">
        {commandOpen ? <AuthoringCommandPalette …unchanged… /> : null}
        {previewNotice}
        <ScreenRuntimeRenderer …unchanged: mode="builder", onSelectSection/onSelectBlock via selectTarget… />
      </div>
    }
  />
);
```

`data-screen-authoring-canvas="true"` is preserved (test hook). The `onClearSelection` previously on `AuthoringCanvasFrame` (`:367`) moves to a canvas-background click → `selectTarget(null)`; do **not** add a panel-wide `onMouseDown` `preventDefault` (regression guard from **[[page-editor-color-toolbar-live-findings]]**).

### Step 3 — Entry content: `CustomScreenEntryEditor.tsx`

Keep `EditorShell` + `breadcrumbs` + `topbarActions`. Replace the sticky sub-header + `ScrollArea` + the `data-custom-screen-entry-document` wrapper holding `AuthoringCanvasFrame borderless` (`:1206-1228`) with the shared shell at `panelPosition="bottom"`. Keep **every** banner/alert (`error`, `remoteUpdatePending`, `remotePresentationUpdatePending`, `!canEditInScreen` `:386,1187`), `presentationPanel` (`:913`), the `canEditInScreen` / `screen` branch gating (`:1203`), and `CustomScreenPreview` fallback (`:67`). Add a host-owned controlled `panelOpen`.

```tsx
// CustomScreenEntryEditor.tsx — inside EditorShell
{isLoading ? <LoadingCard/>
 : screen && canEditInScreen ? (
   <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
        data-custom-screen-entry-document="true">     {/* PRESERVE — restyle test :234 asserts this */}
     {/* NOTE: this PageHeader REPLACES the old sticky sub-header (:1137-1150). PageHeader has
         only title/description/actions — NO eyebrow — so the eyebrow string "Screen-owned
         record editor" (:1141) is INTENTIONALLY DROPPED. It is positively asserted in TWO
         must-stay-green suites (custom-screen-entry-editor-restyle.test.tsx:235 AND
         custom-screen-records.test.tsx:274); BOTH are retargeted to the PRESERVED description
         text below (see Regression-test shape). The description reuses the existing canEdit text. */}
     <CanvasEditor
       header={<PageHeader title={entry?.title?.trim() || (isCreateMode ? "New record" : "Record")}
         description={canEditInScreen
           ? "The canvas is the active editing surface for this record."
           : "This screen still needs writable bindings before it can replace legacy editing paths."} />}
       title="Entry content"
       panelPosition="bottom"
       panelOpen={panelOpen} onPanelOpenChange={setPanelOpen}
       panel={entryFormatToolbar}                       {/* selection-driven inline format dock; null when nothing selected */}
       canvas={<CustomScreenEntryCanvas …unchanged props… />}  {/* mode="entry" :47, enableInlineFieldEditing :53 */}
     />
   </div>
 ) : screen ? <CustomScreenPreview …unchanged… />
 : <ScreenRecordUnavailable/>}
```

The canvas-background click keeps `setSelectedRuntimeBlockId(null)` (`:368,500`; prev `onClearSelection`). The `panel` (`panelPosition="bottom"`) hosts the inline rich-text/format controls when a runtime block is selected (prototype `CustomScreenEntryEditorPreview.tsx:130` bottom dock); it may be `null` when nothing is selected — the shell renders the canvas unobstructed. No new write path; inline edits still flow through `handleFieldChange`/`handleTitleChange`/`handleSlugChange`.

### Step 4 — Shell mount + `CustomScreenShell`

`CustomScreenShell.tsx` currently wraps `EditorShell` (default `panels` variant). The shared shell is a full-height card meant for `EditorShell variant="canvas"` (`EditorShell.tsx:31`). Pass `variant="canvas"` through `CustomScreenShell` so the builder card fills the region; the entry editor's existing `EditorShell` likewise switches to `variant="canvas"` for the shell mount. Keep `CustomScreenShell`'s breadcrumbs + status badge + unsaved-pill `topbarActions`.

### Step 5 — Retire dark authoring chrome (NO DEAD CODE)

After Steps 1-3, the only production importers of the dark chrome are gone (verified): `AuthoringFloatingToolbar` — `ScreenAuthoringCanvas.tsx:22,383` + `CustomScreenEditorPage.tsx:53,960`; `AuthoringCanvasFrame` — those two + `CustomScreenEntryEditor.tsx:44,1208`. Therefore:

- **Delete** `core/admin/ui/authoring/AuthoringFloatingToolbar.tsx`.
- **Delete** `core/admin/ui/authoring/AuthoringCanvasFrame.tsx`.
- **Delete** `core/admin/ui/authoring/canvasChrome.ts` — its only consumer is `AuthoringCanvasFrame` (verified: `authoringCanvasSurfaceClass` / `authoringCanvasViewportClass` / `authoringToolbarPanelClass` are imported solely there at `:6-9`; `authoringPanelHeadingClass` / `authoringDarkGhostButtonClass` have **zero** consumers). The `canvasChrome` references in `MenuDesignEditorPage.tsx` / `PageTemplateEditorPage.tsx` / `pageEditorHostContract.ts:221` are the unrelated host-contract `canvasChrome?:` field, **not** this module.
- **Remove** the three matching `export * from "./…"` lines in `core/admin/ui/authoring/index.ts` (`:1` `AuthoringCanvasFrame`, `:3` `AuthoringFloatingToolbar`, `:8` `canvasChrome`).
- **Keep** `AuthoringLayersPanel`, `AuthoringCommandPalette`, `authoringCommands`, `authoringSelection`, `selectionChrome`/`selectionBorder`, `InlineEditWrapper` (still used — `InlineEditWrapper` by `CustomScreenEntriesTable.tsx` + `ScreenRuntimeRenderer.tsx`; Layers/CommandPalette by `ScreenAuthoringCanvas.tsx`; `selectionBorder` by `ScreenRuntimeRenderer.tsx`).
- Flag (hand the **source-file + barrel deletion** to TASK-496-03 — `AuthoringInsertionZone.tsx` + `index.ts:4`) the pre-existing orphan `AuthoringInsertionZone.tsx` (no production importer) and the already-dead `authoringPanelHeadingClass` / `authoringDarkGhostButtonClass`. **Its TEST coupling, however — the `AuthoringInsertionZone` import + render case in `authoring-canvas.test.tsx` — is removed in THIS leaf** (next bullet), so when 496-03 deletes the file + barrel line there is **no** orphaned test importer left to red-gate. (Source deletion → 496-03; the test edit that the deletion requires → here, the leaf that already owns this test's retarget.)
- Flag the pre-existing **production orphan** `core/admin/ui/custom-screens/FieldBindingPanel.tsx` (**zero** production importers — the block binding UI is rendered by `ScreenBlockInspector` `:110,258,290`, **not** by this component; the Editor-View `activePanel === "binding"` mounts `inspectorPanel` → `ScreenBlockInspector`, never `FieldBindingPanel` — `ScreenAuthoringCanvas.tsx:320-349`; no barrel re-export exists). **Note `FieldBindingPanel.tsx` exports TWO symbols, not one:** the component `FieldBindingPanel` (`:213`) **and** the pure helper `buildBindingFieldOptions` (`:85`, used internally at `:233`; **no** production importer outside the file). Both die with the file. **Hand the source-file deletion to TASK-496-03's sweep** (mirrors the `AuthoringInsertionZone` split), and **retarget its two test importers IN THIS LEAF** so 496-03's deletion leaves no orphaned-but-tested file:
  1. `tests/vitest/ui/custom-screen-binding-panel.test.tsx` imports **BOTH** exports — `FieldBindingPanel` (`:7`) **and** `buildBindingFieldOptions` (`:6`, from the `:5-8` import block) — and has FOUR tests: three render `<FieldBindingPanel>` (`:10-127`) and test #4 ("does not duplicate system and schema fields with the same name", `:129-154`) calls `buildBindingFieldOptions([...])` and asserts its **exact** output array, **including per-field `writable` flags**. Retarget in two parts:
     - **(a) the three render tests** → assert the same binding behavior through the surviving `ScreenBlockInspector` binding surface (its `bindings`/`onPatchBinding` path), preserving binding-**render** coverage;
     - **(b) test #4 + the `:6 buildBindingFieldOptions` import are REMOVED as dead** — `buildBindingFieldOptions` is a **FieldBindingPanel-only** helper that dies with the file. It **cannot** be retargeted to `ScreenBlockInspector`'s equivalent because that helper (`buildFieldOptions`, `ScreenBlockInspector.tsx:88`) is **private** (a `const`, not exported), differently shaped (`{value,label,type}` — **no `writable`**), and dedups with the **opposite** precedence (schema field wins over the same-named system field, `:91`, whereas `buildBindingFieldOptions` keeps the system field — `:85-95`). The **system-vs-schema field dedup** behavior still survives via `ScreenBlockInspector`'s own `buildFieldOptions` `:91` — covered by a render assertion in part (a) that its field `Select` shows no duplicate same-named option — but the FieldBindingPanel-only **`writable`** semantics (which drive that panel's read-only mode gating, `:137,311,399,445`) have **no** `ScreenBlockInspector` equivalent and are dropped with the util. **Remove the `:6` import** so 496-03's deletion leaves no orphaned importer.
  2. `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx` (imports `FieldBindingPanel` `:8` only — **not** `buildBindingFieldOptions` — and renders it in its local `Tabs` "Data" harness `:93`) → **drop** the `FieldBindingPanel` import + that "Data" tab render and **keep** the existing `ScreenBlockInspector` binding-flow assertions.

  **Retarget — do NOT delete the files** (binding-**render** coverage preserved on `ScreenBlockInspector`; the FieldBindingPanel-only dedup/`writable` util test #4 is the **only** assertion dropped, as genuinely dead; no test-**file**-count change, so 496-03's `744 → 745 = +1 guard` baseline stays exact). Source deletion → 496-03; the test edits the deletion requires → here, the leaf that owns these tests.
- **Retarget the now-orphaned test `tests/vitest/ui/authoring-canvas.test.tsx` IN THIS LEAF** (per AGENTS.md "every code change includes tests in the correct lane" — the test update lands with the source deletion, not deferred to 496-03). It imports `AuthoringCanvasFrame` (`:8`), `AuthoringFloatingToolbar` (`:10`), and `AuthoringInsertionZone` (`:11`) and renders + asserts hooks `data-authoring-canvas-frame` / `data-authoring-floating-toolbar` / `data-authoring-toolbar-subpanel` (`:45-94`, asserts `:72,74,75`) — all retired by this program, so those cases WILL go red. **Drop** the `AuthoringCanvasFrame`/`AuthoringFloatingToolbar` render case (`:45-94`) **and the `AuthoringInsertionZone` case (`:195-214`) — unconditionally** (the program has already committed, in the TASK-496 board's NO-DEAD-CODE criterion #4 + 496-03 Sweep 3, to sweeping the 0-production-importer `AuthoringInsertionZone` orphan; removing its test coupling **here** — the leaf that already owns this retarget — lands the test edit alongside the deletion decision and leaves 496-03's file+barrel deletion with no orphaned test importer). Also **remove the now-unused imports** `AuthoringCanvasFrame` (`:8`), `AuthoringFloatingToolbar` (`:10`), and `AuthoringInsertionZone` (`:11`) from the test's import block. **KEEP** the `AuthoringCommandPalette` (`:142-194`), `AuthoringLayersPanel` (`:96-140`), and `isSameAuthoringSelection` (`:217-`) cases (and their imports `AuthoringCommandPalette` / `AuthoringLayersPanel` / `isSameAuthoringSelection` + the `AuthoringCommandGroup` / `AuthoringLayerNode` types) so coverage of the surviving authoring logic is not lost. Retarget — do **not** blanket-delete the file.

Run a dead-import sweep over `core/admin/ui/custom-screens/*` and `core/admin/ui/authoring/index.ts` to confirm no unused imports remain after the swap (drop `AuthoringCanvasFrame` / `AuthoringFloatingToolbar` from the import lists at `CustomScreenEditorPage.tsx:53`, `CustomScreenEntryEditor.tsx:44`, `ScreenAuthoringCanvas.tsx:20-27`).

**Data flow (unchanged):** `customScreensClient` hydrate → `definition` (`CustomScreenDefinitionV4`: `listView` + `editorView.document` / `bindings`) → `screenDocument` / `screenBindings` drive `ScreenRuntimeRenderer` → block/binding ops mutate via `screenDocumentOps` / `createScreenFieldBinding` → `handleSave` persists through `customScreensClient` with the existing dirty/cache guards. The shell only re-homes the chrome; it does not change which handler runs and never touches `ScreenDocumentV1` / `ScreenFieldBinding`.

**Error handling:** keep every existing `Alert` banner and toast; no new error states. Panel open/close, view toggle, and selection must not refetch, must not clear dirty state, and must not re-normalize the document.

**Regression-test shape:** update the assertion in `custom-screen-editor-restyle.test.tsx` that currently expects `data-authoring-floating-toolbar="true"` (`:94`) to instead assert the shell chrome (panel toggle "Hide panel"/"Show panel" — the `screenPanelToggle` node wired into the shell `toolbar` slot in Step 1/Step 2, so this retarget target actually exists in the pseudocode; the light docked panel; the `PageHeader` title) and keep the existing `"Editor View"` toggle + view-switch assertions (`:90,99-107`) green. **The SAME retired dark-chrome hooks are positively asserted in three more suites that MUST also be retargeted to the new shell markup (NOT weakened/deleted), or the test gate goes red on the deleted attributes:** `tests/vitest/ui/custom-screen-list-view-canvas.test.tsx:200-201` (`data-authoring-canvas-frame` + `data-authoring-floating-toolbar` → the shell's relative canvas region + `ScreenPanelToggleRail`/docked `panel` markup the List/Editor canvas now renders), `tests/vitest/ui/custom-screens-page.test.tsx:86,208` (`data-authoring-floating-toolbar` → the shell sub-toolbar / panel toggle), and `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx:176` (`data-authoring-toolbar-subpanel` → the shell `panel` body hosting the Insert → `ScreenBlockLibrary` "Screen Blocks" list). Retarget each to the new shell hook actually rendered — not a guess. (See also Step 5's retarget of `authoring-canvas.test.tsx`.) Keep `data-custom-screen-entry-document="true"` (entry-editor-restyle `:234`) and the `custom-screen-authoring-boundary.test.ts` rules green (shell import is `@/ui/shared/CanvasEditor`, not `@/ui/pages*` / `@/ui/widgets`). **Entry-editor eyebrow retarget (Step 3):** the eyebrow string `"Screen-owned record editor"` (`CustomScreenEntryEditor.tsx:1141`) is dropped by the PageHeader swap (PageHeader has no eyebrow), and it is positively asserted in TWO suites — `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx:235` **and** `tests/vitest/ui/custom-screen-records.test.tsx:274`. Retarget **both** to the PRESERVED PageHeader description text `"The canvas is the active editing surface for this record."` (the `canEditInScreen` description Step 3 keeps) — do NOT just delete the assertions. (`custom-screen-records.test.tsx` therefore joins the explicit retarget enumeration here, not only the run list below.) **FieldBindingPanel retarget (Step 5):** the standalone `FieldBindingPanel` is a 0-production-importer orphan (binding UI lives in `ScreenBlockInspector`) that exports **two** symbols — the component `FieldBindingPanel` and the pure helper `buildBindingFieldOptions` (`:85`). Its two test importers are handled so 496-03 can delete `FieldBindingPanel.tsx` with no orphaned importer: (1) `custom-screen-binding-panel.test.tsx` imports BOTH — `FieldBindingPanel` `:7` (three render tests `:10-127`) and `buildBindingFieldOptions` `:6` (the dedup/`writable` util test #4 `:129-154`): the **render** tests are retargeted to the `ScreenBlockInspector` binding surface (NOT weakened), while the `:6` import + util test #4 are **dropped as dead** (the helper dies with the file; `ScreenBlockInspector`'s own dedup `buildFieldOptions` is private + opposite-precedence + has no `writable`, so test #4 cannot point at it — see Step 5); (2) `custom-screen-editor-binding-flow.test.tsx` `:8,93` is retargeted (import + "Data" tab render dropped, existing `ScreenBlockInspector` binding-flow assertions kept). Binding-**render** coverage is preserved. Add a boundary-style assertion (or extend 496-03's sweep) that `AuthoringFloatingToolbar` / `AuthoringCanvasFrame` / `canvasChrome` are no longer importable and have no importers.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Custom-screen suites (must stay green; update assertions to the new chrome, do **not** weaken them):
  - `NODE_ENV=test bun run vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
  - `NODE_ENV=test bun run vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-list-view-canvas.test.tsx tests/vitest/ui/custom-screen-binding-panel.test.tsx tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx tests/vitest/ui/screen-widgets-editor-wave.test.tsx tests/vitest/ui/authoring-canvas.test.tsx`
  - `authoring-canvas.test.tsx` is **retargeted by Step 5 in this leaf** (dark-chrome render/hook cases dropped, surviving `AuthoringCommandPalette`/`AuthoringLayersPanel`/`isSameAuthoringSelection` cases kept) — it must be green here, not orphaned for 496-03 to discover.
  - `custom-screen-binding-panel.test.tsx` **and** `custom-screen-editor-binding-flow.test.tsx` are **retargeted by Step 5 in this leaf** (the deleted `FieldBindingPanel` render tests swapped for the surviving `ScreenBlockInspector` binding surface — binding-**render** coverage preserved, not weakened; the dead `buildBindingFieldOptions` `:6` import + util test #4 are dropped, as that helper dies with the file and has no `ScreenBlockInspector` equivalent) — both must be green here, not orphaned for 496-03 to discover.
- **TASK-474 boundary (must stay green, unchanged):** `NODE_ENV=test bun run vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-authoring-boundary.test.ts`
- **Cross-surface (shell is now multi-consumer — prove Pages/Menus did not regress):** `NODE_ENV=test bun run vitest run --config vitest.config.ts tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-editor-floating-panel.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- **Contract (only if the optional schema refresh in §Security Contract is taken):** `tests/vitest/admin/custom-screen-schemas.test.ts` — assert backward-compatible read of pre-refresh documents and `reject-unknown` still throws `custom_screen_definition_invalid`.
- **NO-DEAD-CODE / dead-import sweep (acceptance gate):**
  - `! grep -rln "AuthoringFloatingToolbar\|AuthoringCanvasFrame" core/admin/ui/custom-screens` returns no matches.
  - `core/admin/ui/authoring/AuthoringFloatingToolbar.tsx`, `AuthoringCanvasFrame.tsx`, `canvasChrome.ts` no longer exist and are not re-exported by `index.ts`.
  - No unused imports remain in the three edited screen files (lint clean).
- Real-input verification (playwright real mouse+keyboard, `coderso-a.localhost:5173/admin/` per **[[local-cms-run-and-test]]**): builder List/Editor toggle, panel show/hide, block select → inspector, field binding, and entry inline edit all work with a real pointer; guard the documented toolbar focus regression (no panel-wide `preventDefault`).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this child changes status.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-496** + **TASK-496-02**, stating that the screen builder + entry editor now render through the shared `shared/CanvasEditor` shell and the dark `AuthoringFloatingToolbar` / `AuthoringCanvasFrame` / `canvasChrome.ts` were deleted (no dead code).
- A pure visual frame swap needs **no** contract edit — state so explicitly in the changelog. **Only if** the optional palette/contract refresh is taken, cross-link `_docs/CONTENT_TYPES_SPEC.md` (new `ScreenBlockKind` values, schema-first + `reject-unknown` + backward-compatible read) and note it in the changelog.
- Cross-link memory notes **[[task-474-custom-screen-canvas-parity]]**, **[[task-468-completion-state]]**, and **[[pages-editor-v2-remediation-program]]** in the closure entry.
