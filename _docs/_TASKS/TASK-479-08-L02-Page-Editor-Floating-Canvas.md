# TASK-479-08-L02: Page Editor → Floating-Panel Canvas
# FileName: TASK-479-08-L02-Page-Editor-Floating-Canvas.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content (Pages) / Page Builder
**Estimated Effort:** Large
**Dependencies:** TASK-479-06, TASK-479-08-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-08

---

## Overview

Adopt the prototype's floating-panel `CanvasEditor` model in the **real** page
builder: restyle the editor chrome (top bar / breadcrumb / status + Unsaved pills /
device switch / undo-redo / save-publish), restyle the dotted canvas + section
cards to the soft/violet look, and move the section/block controls into a single
**floating, dockable panel that is the sole control surface**, with a show/hide
toggle. All real page-builder behavior — `PAGE_MODEL` document ops, section/block
add/move/delete, inline edit, responsive overrides, autosave, dirty-state guard,
preview, history — is preserved exactly.

- **Goal:** `core/admin/ui/pages/PageEditor.tsx` (+ `pages/editor/*`, `pages/builder/*`,
  `pages/editorControls/*`) render in the redesign with the floating-panel control
  model, while keeping `PAGE_MODEL`, block/section operations, inline edit,
  dirty-state, autosave, and preview untouched.
- **Owning module/service:** `core/admin/ui/pages/PageEditor.tsx`;
  `core/admin/ui/pages/editor/{PageAuthoringCanvas,FloatingEditorToolbar,PageEditorLayers,PageEditorCommandPalette,pageEditorOptions}.tsx/.ts`;
  `core/admin/ui/pages/builder/{VisualPanel,LayoutPanel,BlockSettings,AdvancedPanel,LibraryPanel,WizardPanel,BlockList}.tsx`;
  `core/admin/ui/pages/editorControls/*`; `core/admin/ui/layouts/EditorShell.tsx`.
- **Source-of-truth docs:** `_docs/PAGE_MODEL.md` (document model — **never** change
  block/section shapes, normalization, or responsive-override semantics),
  `_docs/PREVIEW_SPEC.md` (preview/runtime contract), `_docs/DESIGN_TOKENS.md`,
  `_docs/TESTING_STRATEGY.md`. **Prototype source to port from:**
  `_docs/_PROTOTYPE/src/pages/content/PageEditorPreview.tsx` and
  `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx` (+ `BlockChip`).
  Background: see memory note **[[pages-editor-v2-remediation-program]]** and
  **[[page-editor-color-toolbar-live-findings]]** (real-input toolbar regression).
- **Out of scope:** No new builder features, no `PAGE_MODEL`/schema/payload
  changes, no preview-token or runtime-preview contract changes, no endpoint or
  RBAC changes. The prototype `CanvasEditor` is a non-functional preview — port its
  **structure + floating-panel control model**, not its hardcoded "Hero section"
  mock content or `defaultValue`-only inputs.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Preview/autosave/publish keep flowing through
the existing `pagesClient` helpers and the `pageEditorHostContract` gating
(`editorHost.preview`/`publish`/`settingsLabel`, `revisionsHost`); preview-token
guards in `RuntimePreviewDialog` and the cache contract
(`getCachedPageDetail`/`getPageCached`/`autosavePage`/`updatePage`,
`subscribeCacheEvents`, no mount-force refetch, no dirty-state overwrite) are
preserved unchanged.

---

## Implementation Pseudocode

The editor already renders a floating bottom toolbar; the real change is **visual**
(adopt soft/violet tokens) + **structural** (consolidate the section/block controls
into one dockable floating panel as the sole control surface, with a chrome
show/hide toggle modeled on `CanvasEditor`). Keep the entire `PageEditor` hook block
(state/effects/handlers, ~lines 718–2533) intact — that is the `PAGE_MODEL` + cache
+ dirty-state contract. Only the returned `EditorShell` JSX (~2586–3258) and the
panel/toolbar presentation change.

```tsx
// core/admin/ui/pages/PageEditor.tsx — render restyle (logic unchanged)
// Port the chrome/canvas/floating-panel SHAPE from CanvasEditor.tsx.
return (
  <EditorShell
    breadcrumbs={/* AdminBreadcrumbs: resourceLabel · page.title · StatusBadge ·
                    Unsaved pill (hasUnsavedChanges) — restyle to soft tokens,
                    REUSE the shared StatusBadge/status-map from L01 */}
    topbarActions={topbarActions}     // keep DeviceSwitcher/Layers/Settings/
                                       // History/Preview/Save/Publish handlers
    centerScroll={false}
    contentClassName="h-full"
  >
    {/* Chrome bar — model on CanvasEditor's header: title + "Preview only"-style
        status badge + toolbar slot + Undo/Redo + device toggle + a Panel
        show/hide button (aria-pressed). Use rounded-2xl/border-border/bg-muted/40
        soft-shadow tokens. The device toggle stays wired to setDevice. */}

    {/* Canvas surface — keep ALL the data-* hooks the runtime + tests rely on:
        data-page-editor-canvas-scroller, data-page-editor-canvas-frame,
        data-page-editor-canvas-device, data-page-editor-canvas-context,
        the toolbar-clearance paddingBottom + --page-editor-toolbar-clearance var,
        onClick={() => selectSection(null)}, canvasSiteTokenVariables, and the
        SectionGapInsertZone/SectionCanvas mapping. Restyle the dotted bg + the
        white page frame to the soft look (bg-dotted, rounded-2xl, shadow-soft);
        do NOT remove or rename any data-* attribute. */}

    {/* FLOATING PANEL = sole control surface (replaces dark bottom toolbar as the
        primary control home). One dockable popover panel that hosts the section/
        block controls currently split across builder/VisualPanel, LayoutPanel,
        BlockSettings, AdvancedPanel, LibraryPanel + editorControls. Model after
        CanvasEditor's panel: rounded-2xl bg-popover shadow-pop, grip header with
        title (toolbarTargetLabel) + close, max-h scroll body, panelPosition
        "right". Add the show/hide toggle + the "Show panel" reopen affordance.
        The panel renders the EXISTING control components with their EXISTING
        props/handlers (applyInlineTextMark, block ops, responsive overrides) —
        only the container/visual wrapper is new. The "Add block" palette uses
        BlockChip-styled buttons wired to openCommandPalette*/insert handlers. */}

    {/* Layers popover (setLayersOpen) + PageEditorCommandPalette +
        RuntimePreviewDialog + Settings/History Sheets + ConfirmActionDialog +
        all Alert banners (error/previewError/autosaveError/revalidationError/
        recoveryCheckError/recoverableAutosave) keep their existing wiring;
        restyle to rounded-2xl/soft tokens only. */}
  </EditorShell>
);
```

```ts
// Floating-panel control-surface notes (carry over the V2 model, do NOT regress):
// 1. The floating panel is the SOLE control surface — collapse the legacy
//    EditorShell left/right side rails for the page builder into this one panel
//    (keep EditorShell available for other editors; pass no left/right panel here).
// 2. Show/hide: a single panelOpen state (lazy-init true). NO sync setState in an
//    effect — derive from state/props; ESLint 9 react-hooks compliant.
// 3. REAL-INPUT REGRESSION GUARD (memory: page-editor-color-toolbar-live-findings):
//    the prior toolbar broke real mouse/keyboard because a toolbar-wide
//    onMouseDown preventDefault stole focus (swatch click no-op, URL input
//    unfocusable). When wrapping controls in the new floating panel, do NOT add a
//    panel-wide preventDefault on pointer/mouse-down; per-fragment color, the URL
//    input, and inline-mark controls MUST stay focusable and live-updating with a
//    real mouse + keyboard. Verify with playwright real-input, not synthetic events.
// 4. Keep ColorSwatchControl/Combobox/Facet/ListItems/Segmented/Slider controls
//    and their accessibility (editorControlFocusClass) intact.
```

**Data flow:** unchanged. `getPageCached`/`getCachedPageDetail` hydrate →
`PAGE_MODEL` document state drives `SectionCanvas`/`LayerBlockRows` →
section/block ops mutate the document via the existing `createPageBlockV2`/
responsive-override helpers → `autosavePage`/`updatePage` persist with the
dirty-state guard (`useAdminDirtyNavigationGuard`) → `subscribeCacheEvents`
background-revalidates without overwriting dirty state → `previewPage` +
`RuntimePreviewDialog` honor preview tokens (`PREVIEW_SPEC.md`). The floating panel
only re-homes the controls; it does not change which handler runs.

**Error handling:** keep every existing Alert banner and the
`createAdminActionToastAdapter` calls; keep `isSessionExpiredApiError` handling.
Restyle banners to the soft destructive/warning tokens; add no new error states.
Panel open/close and device switch must not refetch or clear dirty state.

**Regression-test shape:** see TASK-479-08-L03 — assert restyled chrome renders,
the floating panel + show/hide toggle exist, the canvas `data-*` hooks are intact,
"Add section"/Layers/Page settings/Preview/History/Publish still render, and the
existing `page-editor-v2-flow` + `page-authoring-canvas` suites stay green.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-editor-layers.test.tsx tests/vitest/ui/page-editor-command-palette.test.tsx tests/vitest/ui/page-editor-control-primitives.test.tsx`
- All other `tests/vitest/ui/page-editor-*` and `tests/vitest/pageBuilder/*` suites
  must stay green (do not weaken assertions to fit the restyle — keep the data-*
  hook assertions in `page-editor.test.tsx`).
- Real-input verification (manual / playwright real mouse+keyboard) of the floating
  panel: swatch click, URL input focus, inline mark live update — guarding the
  documented `page-editor-color-toolbar-live-findings` regression.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-479** + **TASK-479-08-L02**.
- If the floating-panel model changes any documented editor behavior, cross-link
  the change from `_docs/PAGE_MODEL.md` / `_docs/PREVIEW_SPEC.md`; a pure visual
  restyle should need **no** contract edits — state explicitly in the changelog if
  one was required.
