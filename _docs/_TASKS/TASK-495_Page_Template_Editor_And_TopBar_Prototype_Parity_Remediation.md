# TASK-495: Page/Template Editor & Top-Bar Prototype-Parity Remediation
# FileName: TASK-495_Page_Template_Editor_And_TopBar_Prototype_Parity_Remediation.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Pages+Templates / Page Builder
**Estimated Effort:** Large
**Dependencies:** TASK-479 family (post-closure remediation). Specifically **supersedes** the keep-decision in **TASK-479-06-L04** (TopBar Redesign, Done) and **fulfills the unmet right-dock contract** of **TASK-479-08-L02** (Page Editor → Floating-Canvas, Done). Builds on TASK-479-05 (tokens) + TASK-479-06 (shell/primitives) already shipped on `feature/visual`.
**Status:** ⏳ To Do

---

## Overview

Live comparison of the redesign **prototype** (design source-of-truth, `_docs/_PROTOTYPE/`, runs `:5180`) against the **shipped DEV admin** (`core/admin/**`, runs `:5173`) after TASK-479 closed (2026-06-29, HEAD `abb64b6e`; closure `018501ab`) surfaced **two prototype-parity gaps** the owner wants remediated. This is the board task; the two gaps are delivered as two children:

- **TASK-495-01** — TopBar theme-name switcher removal (GAP A).
- **TASK-495-02** — Page/Page-Template editor chrome + right-docked panel parity (GAP B).

Both are **UI-only**: visual + control-placement restructure, no data/route/RBAC change. Background memories: **[[admin-ui-redesign-prototype]]**, **[[pages-editor-v2-remediation-program]]**, **[[page-editor-color-toolbar-live-findings]]**, **[[floating-panel-control-ux-feedback]]**, **[[pageeditor-tsx-grep-binary-trap]]**.

### GAP A — Top bar carries a theme-name switcher the prototype does not have

`core/admin/ui/shared/TopBar.tsx` renders, in its right cluster (`:216-223`): `CreateButton` (`:217`), `<AdminThemeSwitcher/>` (`:218`, imported `:25`), `<AdminColorModeToggle/>` (`:219`), `{actions}` (`:220`), `NotificationsMenu` (`:221`), `UserMenu` (`:222`). The prototype top bar (`_docs/_PROTOTYPE/src/components/shell/Topbar.tsx`) has **no** theme-name switcher (only Create, the `ThemeToggle` color-mode control, notifications, user menu); the visible "Soft Violet" button in DEV **is** `<AdminThemeSwitcher/>`.

`<AdminThemeSwitcher/>` is **mounted only** in `TopBar.tsx` — the only other repo references are doc comments (`core/admin/ui/shared/AdminColorModeToggle.tsx:10`, `core/admin/app/AdminApp.tsx:444`), not JSX mounts — so removing the import + the one usage fully retires it from the chrome. Theme management stays fully reachable via the sidebar **Visual → "Admin UI Theme"** entry → `/admin/themes` (`core/admin/ui/navigation/sidebarConfig.ts`: label `:86`, `href "/admin/themes" :87`, icon `Palette :88`, `permission "themes:read" :89`). The light/dark `<AdminColorModeToggle/>` stays.

### GAP B — Page & Page-Template editor overloads the global top bar and uses a dark bottom-center floating panel

`core/admin/ui/pages/PageEditor.tsx` is a **shared generic editor** gated by `editorHost.mode: "page" | "page-template" | "menu"` (contract `core/admin/ui/pages/editor/pageEditorHostContract.ts:177-222`, `mode` at `:178`). It is hosted by `PageEditorPage.tsx` (mode `"page"`), `pages/templates/PageTemplateEditorPage.tsx` (mode `"page-template"`), and `menus/MenuDesignEditorPage.tsx` (mode `"menu"`).

In the prototype, **Pages** (`content/PageEditorPreview.tsx`) and **Page Templates** (`advanced/PageTemplateEditorPreview.tsx`) use the **same** layout: `PageHeader` + `CanvasEditor` with `panelPosition="right"`. The prototype Menu preview (`content/MenuEditorPreview.tsx`) is a different three-pane `EditorPreviewFrame` that represents the menu-**items/routes** editor — **not** the dev's visual menu **designer** (mode `"menu"`), which the prototype does not cover at all.

Current DEV diverges in two ways:
- **Overloaded global top bar:** `PageEditor` builds a fat `topbarActions` node (`PageEditor.tsx:2556-2617` — DeviceSwitcher `:2558` + Panel `:2559-2569` + Layers `:2570-2578` + Page settings `:2579-2582` + History `:2583-2588` + Preview `:2589-2600` + Save `:2601-2610` + Publish `:2611-2615`) pushed via `EditorShell topbarActions` (`PageEditor.tsx:2633`) → `core/admin/ui/layouts/AdminShell.tsx` `actions={topbarActions}` (`:299`) → `TopBar {actions}` (`:220`). `EditorShell` lives at `core/admin/ui/layouts/EditorShell.tsx`.
- **Dark bottom-center floating panel** as the control surface (`PageEditor.tsx:2898-2909`: `absolute bottom-6 left-1/2 … w-[min(760px,…)] bg-slate-950 p-2 text-white shadow-2xl`, draggable via `translateX(-50%)+toolbarOffset` `:2903`), with Undo/Redo **inside** it (`:2956-2968`), inner dark buttons via `ToolbarIconButton` (`core/admin/ui/pages/editor/FloatingEditorToolbar.tsx:34-36`), a bottom-right "Show panel" reopen chip (`:3188-3199`), and a bottom-clearance reservation (`paddingBottom: toolbarCanvasClearance :2736-2743`, ResizeObserver `:2003-2014`, the `--page-editor-toolbar-clearance` rule in `core/admin/styles/globals.css:325-331`).

---

## Scope gating (critical)

The new chrome applies **only when `editorHost.mode !== "menu"`** (i.e. `"page"` + `"page-template"`). **Mode `"menu"` stays entirely on its current code path** — same `topbarActions`, same dark bottom floating panel, same drag + clearance plumbing. The visual menu designer is out of scope for this pass and the prototype does not cover it. TASK-495-02 must branch on `editorHost.mode`, not unconditionally rewrite the return block.

## Owner decisions (authoritative)

- **GAP A:** Remove `<AdminThemeSwitcher/>` from the top bar; keep breadcrumbs and `<AdminColorModeToggle/>`. Theme management remains via the sidebar `/admin/themes` route.
- **GAP B (page + page-template only):**
  - Drain `topbarActions` out of the global top bar (keep the **top-bar breadcrumb** — owner said breadcrumbs may stay).
  - Add an in-content **`PageHeader`** (`@/ui/shared/PageHeader`, file `core/admin/ui/shared/PageHeader.tsx`; note its `Crumb` uses `href`, not `to`; `PageHeader` ships `mb-6` + `font-display text-2xl`, so spacing needs tuning inside the fixed-height editor) with right-aligned actions, in order: **[Page settings] [History] [Preview] [Save draft] [Publish]** (Page settings + History to the **left** of Preview; reuse `setSettingsOpen(true)`, `openRevisions`, `handlePreview`, `handleSaveDraft`, `handlePublish`; relabel Save → "Save draft" ghost; Publish gets a `Rocket` icon + primary variant; preserve disabled / `Saving…` / `Publishing…` states and the `editorHost.preview`/`publish` + `revisionsHost` guards). To avoid a duplicate breadcrumb, the in-content `PageHeader` renders **without** its own breadcrumb (top-bar breadcrumb only) — chosen default.
  - Add a page-builder **sub-toolbar** chrome row: left = "Page builder" label + a **"Save only" (no-publish) badge** keyed on `!editorHost.publish` (NOT "Preview only" — the page-template host is savable, it just omits `publish`; see TASK-495-02 Step 3); right = relocated doc-status `StatusBadge` ("Title · status", from breadcrumb slot `:2625` + the Unsaved badge `:2626-2630`), relocated **Undo/Redo** (from the floating toolbar `:2956-2968`, wired to `undoEditorChange`/`redoEditorChange`/`canUndoEditorChange`/`canRedoEditorChange`), the `DeviceSwitcher` (`:2558`, keep `data-page-editor-device-option` hooks — `DeviceSwitcher.tsx:53`), **Layers** (relocated `:2570-2578` → `setLayersOpen`), and the **Panel toggle** (relocated `:2559-2569`, keep `panelOpen ? 'soft' : 'ghost'` + `aria-pressed`, label "Hide panel"/"Show panel").
  - Re-dock the **existing** floating panel from dark bottom-center to a **light, right-pinned, collapsible** rail (`absolute right-4 top-4 … ~w-[320-340px] bg-popover text-foreground border-border shadow-pop`, vertical flex, internal scroll), with a header close (`PanelRight` → `setPanelOpen(false)`); move the "Show panel" reopen chip to **top-right**. Relight every dark token (`bg-slate-950`/`text-white`/`bg-white/10`/`text-slate-400`/sky pill/`border-white/10`/`bg-white/5`/`text-slate-100` + `ToolbarIconButton` in `FloatingEditorToolbar.tsx:34-36`) to light tokens. **The relight is NOT just the button CTAs**: thread a `tone: "dark"|"light"` (default `"dark"` for the menu branch) through `ToolbarSubpanel` into **every** `editorControls` primitive that hardcodes inline dark Tailwind — `ColorSwatchControl`, `ComboboxControl`, `SegmentedControl`, `SliderControl`/`SliderStepperControl`, `ToggleSwitch`, `MediaPickerControl`, `ListItemsControl`, `FacetListControl` — plus light siblings for all token kinds (inputs, selects, segmented track/active/idle, combobox dropdown/options, swatch borders, toggle off-track, label/value, and the focus ring), or the bulk of the rail's controls ship dark-on-light. See TASK-495-02 Step 5b. The inner 760px-wide horizontal head/actions/tabs/subpanel must **re-stack vertically** for the narrow rail.
  - **Branch (do not globally delete) the drag + bottom-clearance plumbing.** Because `PageEditor.tsx` is shared and the `menu` host must keep the legacy draggable bottom panel, the drag plumbing (`toolbarOffset`/`setToolbarOffset :804`, `toolbarDragging`/`setToolbarDragging :803`, `startToolbarDrag :1964-1976`, pointer-move effect `:1978-1994`, `toolbarDragRef :805`, the `transform`, `data-page-editor-toolbar-dragging`) and the bottom-clearance (`paddingBottom :2736-2743` + ResizeObserver `:2003-2014` + the `--page-editor-toolbar-clearance` rule in `globals.css:325-331`) are **retained for the `menu` branch** and simply **not referenced** by the `page`/`page-template` builder branch (no transform, no `data-page-editor-toolbar-dragging`, no bottom padding) — which is the user-visible "removal" prototype parity requires. A literal global deletion would break the menu path; see TASK-495-02 §Step 6 reconciliation. If the right overlay occludes a wide canvas, reserve **right** padding instead.
  - **Do NOT** adopt shared `CanvasEditor` here (it owns `panelOpen` internally, a static device slot, and placeholder undo/redo — full adoption was deferred to TASK-479-07). Surgically re-position + relight the **existing** floating toolbar.

## Carry-over constraints (DO NOT regress)

- The floating panel stays the **sole control surface**; single `panelOpen` state (`PageEditor.tsx:753`, lazy `true`, **no** sync `setState` in an effect — ESLint 9 react-hooks compliant).
- **Real-input guard** (memory **[[page-editor-color-toolbar-live-findings]]**): no panel-wide `onMouseDown`/`pointerdown` `preventDefault` that steals focus; per-fragment color swatch, URL input, and inline-mark controls must stay focusable + live-updating with a **real** mouse + keyboard. Verify via playwright real-input, not synthetic events.
- Preserve all `data-page-editor-*` hooks (`-floating-toolbar :2906`, `-toolbar-collapsed :2907`, `-toolbar-row`, `-toolbar-actions`, `-device-option` from `DeviceSwitcher.tsx:53`, and the canvas `data-page-editor-canvas-*` set), `PAGE_MODEL` document ops, the host cache contract, dirty-state guard, autosave, and preview logic — unchanged.
- `PageEditor.tsx` reads as **binary** to `rg`/grep (memory **[[pageeditor-tsx-grep-binary-trap]]**) — implementers must use Read/Edit or `grep -an`, never `rg`. Re-anchor by structure + line refs (the file is ~4.9k lines and shifts often).

---

## Security Contract

No endpoint/permission/RBAC/cache changes (visual + control-placement restructure only). Preview/autosave/publish keep flowing through the existing `editorHost` helpers and the `pageEditorHostContract` gating (`editorHost.preview`/`publish`/`settingsLabel`, `revisionsHost`); the cache contract (`getCachedDetail`/`loadDetail`/`autosaveDocument`/`saveDocument`, `subscribeCacheEvents`, no mount-force refetch, no dirty-state overwrite — the page host backs these with `pagesClient`) and the `RuntimePreviewDialog` preview-token guards are preserved unchanged. GAP A only removes a presentational mount; `/admin/themes` and `themes:read` are unaffected.

---

## Relationship to TASK-479 (supersession + fulfillment)

- **Supersedes TASK-479-06-L04** (TopBar Redesign, Done 2026-06-29), whose pseudocode said `<AdminThemeSwitcher /> {/* KEEP existing admin theme-PROFILE dropdown */}`. TASK-495-01 reverses **that one decision** to match the prototype; the rest of L04 stands. Do **not** flip L04's status — record the supersession in the TASK-495 closure changelog entry.
- **Fulfills TASK-479-08-L02** (Page Editor → Floating-Canvas, Done 2026-06-29), whose contract specified `panelPosition="right"` + a show/hide toggle (`:107-113`) but **also** said to keep `topbarActions` in the top bar (`:88`); the shipped code instead landed a dark bottom-center panel + an overloaded top bar. TASK-495-02 delivers the unmet right-dock + clean top bar (PageHeader + sub-toolbar), carrying over all L02 guards.

---

## Children

| ID | Title | Scope |
|----|-------|-------|
| **TASK-495-01** | TopBar Theme-Switcher Removal | Remove `<AdminThemeSwitcher/>` usage (`TopBar.tsx:218`) + import (`:25`); update the two tests that assert it (`tests/vitest/admin/topbar-color-mode-toggle.test.tsx` mocks the switcher `:7-9` and asserts present + color-toggle ordering `:46-68`; `tests/vitest/ui-integration/admin-shell/topbar.test.tsx:208-214` renders the real switcher and asserts the html contains "Admin UI Theme") and delete the now-dead switcher mock in a third file (`tests/vitest/ui/admin-breadcrumbs.test.tsx:10-12`, which mounts the real `TopBar` but never asserts the switcher — harmless, just cleanup). All in the same commit. |
| **TASK-495-02** | Page-Template Editor Chrome And Panel Parity | One coherent rewrite of `PageEditor.tsx`'s return block, gated `editorHost.mode !== "menu"`: drain `topbarActions`; add `PageHeader` [Page settings, History, Preview, Save draft, Publish]; add the page-builder sub-toolbar [status, undo/redo, device, Layers, Panel toggle]; re-dock + relight the floating panel bottom→right with vertical re-stack; branch (not delete) the drag/clearance plumbing so `menu` keeps it; move the reopen chip top-right; preserve all `data-page-editor-*` hooks + `PAGE_MODEL`/cache/dirty/autosave/preview + the real-input guard. Mode `"menu"` keeps the current code path. |

---

## Validation & closure expectations

- **Gates:** `bun --cwd core lint`; `bun --cwd core lint:types` green.
- **TASK-495-01:** the two admin top-bar suites above pass with updated assertions (switcher absent; color-toggle + the rest of the right cluster still ordered correctly).
- **TASK-495-02:** all `tests/vitest/ui/page-editor-*` + `page-authoring-canvas` suites stay green (do **not** weaken `data-*` hook assertions), plus new assertions for the in-content `PageHeader`, the page-builder sub-toolbar, the right-docked panel, a **non-button control relight guard** (e.g. `SegmentedControl` track / `ColorSwatchControl` hex input — plus one in-file LOCAL field renderer such as `ToolbarGradientField`'s "Add stop" — renders the light token on the page host and the dark token on a bare `mode:"menu"` host, so the relight is not silently button-only), a **"Save only" no-publish badge guard** (a publish-absent `page-template`/bare host shows the `Save only` badge; the `page` host does not), and that mode `"menu"` still renders the legacy bottom toolbar (including the dark-chrome RENDER tokens, reproduced via a bare `mode:"menu"` `PageEditorHost` fixture, NOT a `MenuDesignEditorPage` mount). Real-input playwright check of swatch/URL/inline-mark focus in the re-docked panel.
- **Runtime smoke:** Pages editor and Page-Templates editor (`:5173`) match the prototype (`:5180`) layout; menu designer unchanged.
- **Docs on status change / closure:** update `_docs/_TASKS/README.md` board + **Statistics**; add a `_docs/_CHANGELOG/` entry linking **TASK-479** + **TASK-495**, explicitly noting the **TASK-479-06-L04** supersession and the **TASK-479-08-L02** contract fulfillment.
