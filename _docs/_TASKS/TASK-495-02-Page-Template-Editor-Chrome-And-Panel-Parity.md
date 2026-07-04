# TASK-495-02: Page-Template Editor Chrome And Panel Parity
# FileName: TASK-495-02-Page-Template-Editor-Chrome-And-Panel-Parity.md

**Parent Task:** TASK-495
**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Pages+Templates / Page Builder
**Estimated Effort:** Large
**Dependencies:** TASK-495 (parent); fulfils the unmet right-dock contract of **TASK-479-08-L02** (Done); reuses the `PageHeader` from **TASK-479-06-L02**
**Status:** ✅ Done
**Completed:** 2026-06-30

---

## Overview

GAP B of TASK-495. In the redesign **prototype**, Pages
(`_docs/_PROTOTYPE/src/pages/content/PageEditorPreview.tsx`) and Page Templates
(`_docs/_PROTOTYPE/src/pages/advanced/PageTemplateEditorPreview.tsx`) share ONE
layout: a `PageHeader` (with right-aligned actions) above a `CanvasEditor`
(`_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx`) whose chrome bar
carries the page-builder controls and whose options panel is a **light,
right-pinned, collapsible** popover (`panelPosition="right"`,
`right-4 top-4 w-[280px] bg-popover shadow-pop`).

The **shipped** dev page builder (`core/admin/ui/pages/PageEditor.tsx`) instead:

- pushes a fat `topbarActions` cluster (DeviceSwitcher + Panel + Layers + Page
  settings + History + Preview + Save + Publish) up through
  `EditorShell.topbarActions` (`PageEditor.tsx:2633`) →
  `core/admin/ui/layouts/AdminShell.tsx` `actions={topbarActions}` (`:299`) → the
  **global** `TopBar` `{actions}` slot (`TopBar.tsx:220`), overloading the
  app-wide top bar; and
- renders its control surface as a **dark, bottom-center, draggable** floating
  panel (`absolute bottom-6 left-1/2 … w-[min(760px,…)] bg-slate-950 p-2 text-white`,
  `:2898-2909`), with Undo/Redo living **inside** that panel (`:2956-2968`), a
  bottom-clearance reservation on the canvas, and a "Show panel" reopen chip at
  the bottom-right (`:3188-3199`).

This subtask brings the page/page-template editor to prototype parity in **one
coherent change** to `PageEditor.tsx`'s `return (...)` block (plus the shared
chrome helpers): drain the top bar, add an in-content `PageHeader` + a
page-builder **sub-toolbar** chrome row, re-dock the floating panel from
bottom-center to a **light, right-pinned, collapsible** rail, relight every dark
token, and re-stack the inner 760px-wide rows to fit the narrow rail.

`PageEditor.tsx` is a **shared generic editor** gated by `editorHost.mode`
(`"page" | "page-template" | "menu"`; contract
`core/admin/ui/pages/editor/pageEditorHostContract.ts:177-222`, `mode` at `:178`).
It is mounted by `PageEditorPage.tsx` (mode `"page"`),
`pages/templates/PageTemplateEditorPage.tsx` (mode `"page-template"`), and
`menus/MenuDesignEditorPage.tsx` (mode `"menu"`). **Owner decision (scope gate):
the new chrome applies ONLY when `editorHost.mode !== "menu"`.** The menu visual
designer is NOT covered by the prototype and must stay **entirely on its current
code path** (legacy dark bottom-center draggable panel, `topbarActions` in the top
bar). Note: the menu host omits `editorHost.preview` (the live canvas IS the
preview — contract `:198-203`), which is another reason it stays on the legacy
path.

- **Goal:** `core/admin/ui/pages/PageEditor.tsx` renders, for `page` +
  `page-template` hosts, with: a clean global top bar (drained `{actions}`); an
  in-content `PageHeader` with right-aligned actions
  `[Page settings] [History] [Preview] [Save draft] [Publish]`; a page-builder
  sub-toolbar `[status badge, undo/redo, DeviceSwitcher, Layers, Panel toggle]`;
  and a light, right-pinned, collapsible options panel. The `menu` host keeps the
  legacy bottom toolbar untouched. All `PAGE_MODEL` document ops, cache, dirty
  state, autosave, preview, history, and inline edit are preserved byte-for-byte.
- **Owning module/service:** `core/admin/ui/pages/PageEditor.tsx` (render block
  only — including the in-file `ToolbarSubpanel` renderer, def `:3308`, "Add block"
  CTA `:3415`/`:3502`); `core/admin/ui/pages/editor/FloatingEditorToolbar.tsx`
  (`ToolbarIconButton` relight, `:7-48`, active/hover at `:34-36`);
  `core/admin/ui/pages/editorControls/controlChrome.ts` (light token variants
  beside `editorDarkButtonClass :22` / `editorDarkGhostButtonClass :30` **and** the
  per-control text/focus tokens `editorControlLabelClass :6` /
  `editorControlValueClass :9` / `editorControlFocusClass :12` —
  `ring-white/60`, invisible on light); the registry control files that **hardcode
  inline dark Tailwind (no shared constant — invisible to a grep for
  `editorDark*`)** and must take a `tone` prop. These are NOT just the three
  button-CTA files; the panel body re-docked into the light rail renders the full
  control set, ALL of which are dark-on-dark today and need a light sibling
  (verify the line refs — the file shifts):
  - `editorControls/MediaPickerControl.tsx` (`:44-45` — MediaPickerControl's OWN
    Browse/Remove buttons, CTA + ghost via the `editorDark*` constants; it renders
    `data-page-editor-media-control` (`:34`), NOT the
    `data-page-editor-media-external` "Clear" readout. Its light relight is verified by
    the NEW `page-editor-control-primitives` `tone="light"` mount, NOT the
    `page-editor-v2-flow` `:3168-3170` "Clear" assertion — that button is rendered by the
    in-file `ToolbarMediaUrlField` (`:4586`), see Step 5b).
  - `editorControls/ListItemsControl.tsx` (buttons `:88`/`:100` **and** the raw
    inputs `:70`/`:78` — `bg-white/10`/`bg-white/5 text-slate-100/200`).
  - `editorControls/FacetListControl.tsx` (buttons `:228`/`:295` **and**
    `inputClass`/`subInputClass`/`selectClass` `:27-29` + the row container `:199`
    — `bg-white/5`/`bg-white/10`/`[&>option]:bg-slate-900`).
  - `editorControls/ColorSwatchControl.tsx` (hex input `:145`
    `bg-white/10 text-slate-100`, swatch borders `:94`/`:116`/`:133`
    `border-white/15`).
  - `editorControls/ComboboxControl.tsx` (trigger `:181` `bg-white/10`, value/empty
    text `:182`, hint `:187`, dropdown `:193` `bg-slate-900`, search input `:210`,
    option rows `:267-272` `bg-white/15`/`text-slate-*`).
  - `editorControls/SegmentedControl.tsx` (track `:93` `bg-white/10`, active `:107`
    `bg-white text-slate-950`, idle `:108` `text-slate-300 hover:bg-white/10`).
  - `editorControls/SliderControl.tsx` (native range `accent-white` at `:56` — the
    white thumb/track renders invisible on the light `bg-popover` rail; **this control
    has NO stepper button**, and `SliderControl.tsx:18` is a value-format helper, not a
    button) **and** `editorControls/SliderStepperControl.tsx` (the real
    `stepperButtonClass` `:18` `bg-white/10 text-slate-200`, used at `:62`/`:71`).
  - `editorControls/ToggleSwitch.tsx` (off-track `:26` `bg-white/20`).
  - **In-file `PageEditor.tsx` local field renderers** (defined INSIDE
    `PageEditor.tsx`, NOT in the `editorControls/` registry, but rendered in the same
    panel body and ALSO hardcoding dark Tailwind — each must take the threaded `tone`,
    see Step 5b): `ToolbarGradientField` (def `:4187`), `ToolbarMediaUrlField` (def
    `:4518`), `ToolbarTextField` (def `:4597`), `ToolbarSelectField` (def `:4616`). The
    in-file `ToolbarSubpanel` (def `:3308`, invoked `:3158`) is the single `tone`
    threading entry point that reaches BOTH these local renderers and every registry
    control listed above.
  `core/admin/styles/globals.css` (clearance var rule `:325-331` — see
  reconciliation note); reuse `core/admin/ui/shared/PageHeader.tsx` and
  `core/admin/ui/pages/DeviceSwitcher.tsx` as-is.
- **Source-of-truth docs:** `_docs/PAGE_MODEL.md` (document model — **never**
  change block/section shapes, normalization, or responsive-override semantics),
  `_docs/PREVIEW_SPEC.md` (preview/runtime contract), `_docs/DESIGN_TOKENS.md`,
  `_docs/TESTING_STRATEGY.md`. **Prototype to port from:**
  `_docs/_PROTOTYPE/src/pages/advanced/PageTemplateEditorPreview.tsx`,
  `_docs/_PROTOTYPE/src/pages/content/PageEditorPreview.tsx`, and
  `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx`. Background:
  **[[pages-editor-v2-remediation-program]]** and
  **[[page-editor-color-toolbar-live-findings]]** (the real-input toolbar
  regression this change must NOT reintroduce).
- **Out of scope:** No `PAGE_MODEL`/schema/payload changes, no preview-token or
  runtime-preview contract changes, no new builder features, no endpoint/RBAC
  changes. **Do NOT adopt the shared `CanvasEditor` component** (it owns
  `panelOpen` internally, has a static device slot, and only placeholder
  undo/redo — full adoption was deferred to TASK-479-07). Surgically
  re-position + relight the **existing** floating toolbar instead. The `menu`
  host (mode `"menu"`) is out of scope and must keep its current rendering.

> **Supersession / contract notes.** This subtask is governed by TASK-495-01's
> supersession of TASK-479-06-L04 (top-bar theme switcher), and it **fulfils the
> right-dock contract of TASK-479-08-L02**: that leaf's pseudocode specified
> `panelPosition "right"` + a show/hide toggle (its lines 107-113) but also
> retained `topbarActions` in the top bar (its line 88); the shipped code instead
> shipped a dark bottom-center panel + an overloaded top bar. TASK-495-02 lands
> the unmet right-dock contract and corrects the top-bar overload to match the
> prototype.

---

## Security Contract

No endpoint, permission, RBAC, or cache changes (visual + control-placement
restructure only). Preview/autosave/publish keep flowing through the existing
`editorHost` helpers and the `pageEditorHostContract` gating
(`editorHost.preview`/`publish`/`settingsLabel`, `revisionsHost`); the cache
contract (`getCachedDetail`/`loadDetail`/`autosaveDocument`/`saveDocument`,
`subscribeCacheEvents`, no mount-force refetch, no dirty-state overwrite — the
page host backs these with `pagesClient`) and the `RuntimePreviewDialog`
preview-token guards are preserved unchanged. No new network calls are introduced
by re-homing controls.

---

## Implementation Pseudocode

`PageEditor.tsx` reads as **binary to `rg`/`grep`** — use `Read`/`Edit` or
`grep -an`, **never `rg`** ([[pageeditor-tsx-grep-binary-trap]]). Re-anchor by
structure + the line refs below (the file is ~4.9k lines and shifts).

The entire hook block (state/effects/handlers, `~`line 748 onward — `PAGE_MODEL`
document state, cache, dirty-state, autosave, preview, history, selection) stays
**intact**. Only the `return (...)` (from `~`2619) and the two chrome helper
files change. Confirmed-present symbols reused verbatim: `handleSaveDraft`,
`handlePreview`, `handlePublish`, `openRevisions`, `setSettingsOpen`,
`revisionsHost`, `previewLoading`, `isSaving`, `isPublishing`,
`hasUnsavedChanges`, `settingsTitle`, `hasFloatingPanelSelection`,
`resolvedSelectedSection`, `toolbarTargetLabel`, `toolbarCollapsed`,
`undoEditorChange`/`redoEditorChange`/`canUndoEditorChange`/`canRedoEditorChange`.

### Step 0 — derive the mode gate (near the other derived consts, `~`944-961)

```ts
// PageEditor.tsx — add beside hasFloatingPanelSelection / floatingToolbarVisible (:948)
// The prototype covers page + page-template only; the menu visual designer stays
// on the legacy dark bottom-center draggable toolbar (owner scope decision).
const useLegacyChrome = editorHost.mode === "menu";        // menu => unchanged path
const useBuilderChrome = !useLegacyChrome;                 // page + page-template => new chrome
const panelTone: "dark" | "light" = useLegacyChrome ? "dark" : "light";
```

### Step 1 — drain `topbarActions` for the builder chrome (`EditorShell` props, `~`2619-2636)

```tsx
return (
  <EditorShell
    breadcrumbs={
      // Page/page-template: top-bar breadcrumb = resourceLabel · title ONLY.
      // The StatusBadge (:2625) + "Unsaved" pill (:2626-2630) RELOCATE to the
      // sub-toolbar (Step 3). Menu keeps the existing breadcrumb verbatim.
      useLegacyChrome ? (
        /* UNCHANGED legacy breadcrumb node (resourceLabel · title · StatusBadge · Unsaved) */
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{editorHost.resourceLabel}</span>
          <span className="text-sm font-semibold">{page?.title ?? settingsTitle}</span>
        </div>
      )
    }
    topbarActions={useLegacyChrome ? topbarActions : undefined}  // DRAIN for builder chrome
    centerScroll={false}
    contentClassName="h-full"
  >
    {/* outer wrapper: builder chrome moves bg-dotted OFF the outer (so the
        PageHeader + sub-toolbar sit on a clean bg-background) and ONTO the
        canvas scroller (Step 4). Menu keeps bg-dotted on the outer (:2637). */}
    <div className={`relative flex h-full min-h-0 flex-col ${useLegacyChrome ? "bg-dotted" : "bg-background"}`}>
      {/* …Alert banners (error/previewError/autosaveError/revalidationError/
          recoveryCheckError/recoverableAutosave) — UNCHANGED… */}
```

Keep the existing `topbarActions` JSX (`~`2556-2617) **as the menu fallback** — it
is still passed when `useLegacyChrome`. Its DeviceSwitcher/Panel/Layers/Settings/
History/Preview/Save/Publish wiring is reused unchanged by the menu path.

### Step 2 — in-content `PageHeader` (builder chrome only)

Render directly after the Alert banners, **before** the canvas-context bar
(`~`2720). Reuse the existing handlers; **preserve every gate + disabled state**.
`Rocket` is a new lucide import alongside the existing icon imports.

```tsx
{useBuilderChrome ? (
  <PageHeader
    // No breadcrumbs prop: the top-bar breadcrumb is the sole breadcrumb
    // (avoids a duplicate trail). PageHeader's mb-6 + font-display text-2xl
    // are too tall for the fixed-height editor → tune spacing via className.
    className="mb-0 shrink-0 border-b border-border bg-background px-6 pb-3 pt-4"
    title={page?.title ?? settingsTitle}
    actions={
      <>
        <Button type="button" variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings2 className="h-4 w-4" />
          {editorHost.settingsLabel}
        </Button>
        {revisionsHost ? (
          <Button type="button" variant="ghost" size="sm" onClick={openRevisions}>
            <History className="h-4 w-4" />
            History
          </Button>
        ) : null}
        {editorHost.preview ? (
          <Button type="button" variant="outline" size="sm"
            disabled={previewLoading || !page} onClick={handlePreview}>
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm"
          disabled={isSaving || !page} onClick={handleSaveDraft}>
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save draft"}   {/* relabel Save → "Save draft" */}
        </Button>
        {editorHost.publish ? (
          <Button type="button" size="sm"
            disabled={isPublishing || !page} onClick={handlePublish}>
            <Rocket className="h-4 w-4" />        {/* import Rocket from lucide-react */}
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        ) : null}
      </>
    }
  />
) : null}
```

Order is exactly `[Page settings] [History] [Preview] [Save draft] [Publish]`
(Page settings + History to the LEFT of Preview, per owner). `previewLoading`,
`isSaving`, `isPublishing`, `page` gating and the `editorHost.preview/publish`
+ `revisionsHost` guards are reused verbatim from the legacy `topbarActions`
(`:2589-2615`). The current `handleSaveDraft` handler is already wired to the
legacy Save button (`:2606`), so reuse it as-is.

### Step 3 — page-builder sub-toolbar (builder chrome only)

A chrome row directly under `PageHeader`, modeled on the prototype `CanvasEditor`
chrome bar (`border-b border-border bg-muted/40 px-4 py-2.5`). It is a **shrink-0**
row; the canvas scroller below it still flexes.

```tsx
{useBuilderChrome ? (
  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2">
    {/* LEFT: label + "no-publish" capability badge.
        SCOPE-GATE CORRECTNESS: the page-template host
        (`PageTemplateEditorPage.tsx`) ships `preview` + `saveDocument` but NO
        `publish` field (it has `preview:` at `:236` and no `publish:` key), so a
        badge keyed on `!editorHost.publish` is TRUE for a page-template — which is
        savable. Labeling it "Preview only" therefore MISLABELS a savable resource
        (you can Save draft; you just cannot Publish). Relabel the badge to convey
        the missing PUBLISH capability (NOT "preview only"); the `Eye` icon is
        dropped because it reads as read-only/preview. The Publish button itself
        stays gated on `editorHost.publish` in the PageHeader (Step 2) — only the
        badge copy changes. The badge surfaces in builder chrome only on the
        page-template host (the `page` host provides `publish`, so no badge; the
        `menu` host uses legacy chrome with no sub-toolbar). */}
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Page builder</span>
      {!editorHost.publish ? (
        <Badge variant="soft">Save only</Badge>   {/* was: <Eye/> Preview only — mislabeled the savable page-template */}
      ) : null}
    </div>
    {/* RIGHT: doc-status badge, undo/redo, device, Layers, Panel toggle */}
    <div className="flex items-center gap-1.5">
      {/* RELOCATED doc status (was breadcrumb slot :2625) + Unsaved pill (:2626-2630) */}
      <StatusBadge status={page?.status ?? "draft"} />
      {hasUnsavedChanges ? (
        <Badge variant="warning" className="text-[10px] font-semibold uppercase">Unsaved</Badge>
      ) : null}
      <div className="mx-1 h-5 w-px bg-border" />
      {/* RELOCATED Undo/Redo (were inside the floating toolbar :2956-2968).
          aria-label MUST stay "Undo"/"Redo" — the undo/redo flow test clicks
          them by label (page-editor-v2-flow.test.tsx:1638, clickButtonByLabel
          "Undo"/"Redo" ~:1652-1653). */}
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Undo"
        disabled={!canUndoEditorChange} onClick={undoEditorChange}>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Redo"
        disabled={!canRedoEditorChange} onClick={redoEditorChange}>
        <Redo2 className="h-4 w-4" />
      </Button>
      <div className="mx-1 h-5 w-px bg-border" />
      {/* RELOCATED DeviceSwitcher (:2558) — keep data-page-editor-device-option (DeviceSwitcher.tsx:53) */}
      <DeviceSwitcher value={device} onChange={setDevice} />
      {/* RELOCATED Layers (:2570-2578) */}
      <Button type="button" variant="ghost" size="sm" onClick={() => setLayersOpen((o) => !o)}>
        <Layers className="h-4 w-4" />
        Layers
      </Button>
      {/* RELOCATED Panel toggle (:2559-2569) — keep soft/ghost + aria-pressed */}
      <Button type="button" variant={panelOpen ? "soft" : "ghost"} size="sm"
        onClick={() => setPanelOpen((o) => !o)}
        aria-label={panelOpen ? "Hide panel" : "Show panel"} aria-pressed={panelOpen}>
        <PanelRight className="h-4 w-4" />
        {panelOpen ? "Hide panel" : "Show panel"}
      </Button>
    </div>
  </div>
) : null}
```

### Step 4 — canvas scroller: swap bottom clearance for right padding (builder chrome)

The canvas-context bar (`~`2720-2727) is unchanged. The scroller (`~`2729-2745):

```tsx
<div
  className={`min-h-0 flex-1 overflow-auto overscroll-contain p-6 ${useBuilderChrome ? "bg-dotted" : ""}`}
  data-page-editor-canvas-scroller="true"
  // BUILDER: no bottom clearance (the panel no longer covers the bottom). When
  // the right rail is open, reserve right padding so the centered frame is not
  // occluded by the overlay. MENU: keep the legacy bottom-clearance behavior.
  style={
    useLegacyChrome
      ? (floatingToolbarVisible && toolbarCanvasClearance > 0
          ? ({ paddingBottom: toolbarCanvasClearance,
               "--page-editor-toolbar-clearance": `${toolbarCanvasClearance}px` } as CSSProperties)
          : undefined)
      : (panelOpen && hasFloatingPanelSelection
          ? ({ paddingRight: 360 } as CSSProperties)   // rail width (340) + gap
          : undefined)
  }
  onClick={() => selectSection(null)}
>
```

**Preserve** `data-page-editor-canvas-scroller`, `data-page-editor-canvas-frame`,
`data-page-editor-canvas-device`, `data-page-editor-canvas-context`,
`canvasSiteTokenVariables`, `onClick={() => selectSection(null)}`, and the
`SectionGapInsertZone`/`SectionCanvas` mapping (`~`2746-2896) **byte-for-byte**.

### Step 5 — re-dock + relight the floating panel (the panel at `~`2898-3186)

The panel currently opens on `panelOpen && selectedSection && resolvedSelectedSection`
(`~`2898). Split the **container** by tone but keep the **inner body** (head row +
actions cluster + panels row + subpanels) shared. The cleanest factoring: lift the
inner JSX (`~`2916-3184: the `data-page-editor-toolbar-row="head"` block through
the `ToolbarSubpanel`) into a local `const floatingPanelBody = (…)` and render it
inside whichever container the mode selects.

```tsx
{panelOpen && selectedSection && resolvedSelectedSection ? (
  useLegacyChrome ? (
    // ── MENU: UNCHANGED legacy dark bottom-center draggable panel ──
    <div
      ref={toolbarElementRef}
      className="absolute bottom-6 left-1/2 z-30 w-[min(760px,calc(100%-2rem))] rounded-2xl bg-slate-950 p-2 text-white shadow-2xl"
      style={{ transform: `translateX(calc(-50% + ${toolbarOffset.x}px)) translateY(${toolbarOffset.y}px)` }}
      aria-label={`${toolbarTargetLabel} tools`}
      data-page-editor-floating-toolbar="true"
      data-page-editor-toolbar-collapsed={toolbarCollapsed ? "true" : "false"}
      data-page-editor-toolbar-dragging={toolbarDragging ? "true" : "false"}
    >
      {floatingPanelBody /* tone="dark", includes drag grip + in-panel undo/redo */}
    </div>
  ) : (
    // ── PAGE / PAGE-TEMPLATE: light, right-pinned, collapsible rail ──
    <div
      ref={toolbarElementRef}
      className="absolute right-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-[min(340px,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover p-2 text-foreground shadow-pop"
      aria-label={`${toolbarTargetLabel} tools`}
      data-page-editor-floating-toolbar="true"
      data-page-editor-toolbar-collapsed={toolbarCollapsed ? "true" : "false"}
      // NOTE: no transform, no data-page-editor-toolbar-dragging (drag not used
      // for builder chrome — see Step 6 + the test-impact note below).
    >
      {floatingPanelBody /* tone="light", header close instead of drag grip;
                            undo/redo NOT here (they live in the sub-toolbar) */}
    </div>
  )
) : null}
```

`floatingPanelBody` is the existing inner JSX with these tone-driven edits:

1. **Head row** (`~`2916): for the builder it must **re-stack vertically** to fit
   the 340px rail — change **only the head CONTAINER's flex direction** from a
   single horizontal `flex flex-wrap items-center` row to `flex flex-col gap-2`
   (identity line on top, the action cluster wrapping below). The legacy (menu)
   keeps the horizontal row. Preserve `data-page-editor-toolbar-row="head"` and
   `data-page-editor-toolbar-actions="true"` on the action cluster (tests assert
   them: `page-editor-v2-flow.test.tsx:3014`, `:3059`). **Keep the action
   cluster's `ml-auto` class INTACT** — do NOT strip it when re-stacking. The
   drag-state test this contract KEEPS (Regression-test shape, keep-range
   `~`:2991-3069) asserts `expect(actionCluster?.className).toContain("ml-auto")`
   at `page-editor-v2-flow.test.tsx:3016`. Under `flex-col` `ml-auto` is
   layout-inert but harmless, and leaving it on the cluster keeps that kept
   assertion green; touch only the PARENT container's direction class. (If a
   future change deliberately drops `ml-auto` for the column layout, update
   assertion `:3016` in the SAME change rather than letting it fail by accident.)
2. **First head control** (`~`2917-2922): menu keeps the `GripVertical` drag
   handle wired to `startToolbarDrag` (`onPointerDown` at `:2919`). For the
   builder, replace it with a **close** `ToolbarIconButton` (`PanelRight` →
   `setPanelOpen(false)`, owner's "header close") and an optional non-interactive
   `GripHorizontal` glyph for affordance parity.
3. **Identity tokens** (`~`2924-2936): relight `text-slate-400` →
   `text-muted-foreground`, the `bg-white/10` selection chip →
   `bg-muted text-muted-foreground`, and the `bg-sky-400/15 text-sky-200`
   editing-scope pill → `bg-primary-soft text-primary-soft-foreground`. Preserve
   `data-page-editor-editing-scope={device}`.
4. **Collapse button** (`~`2942-2953): keep (Minimize2/Maximize2 + `toolbarCollapsed`).
5. **Undo/Redo** (`~`2956-2968): render **only when `useLegacyChrome`** — for the
   builder they now live in the sub-toolbar (Step 3). Everything else in the
   actions cluster (copy/paste/move/duplicate/delete/add-beside, `~`2970-3088)
   stays for both modes. Preserve the `Add block beside` `aria-label` (asserted at
   `page-editor-v2-flow.test.tsx:6256`).
6. **Panels row** (`~`3093-3110): keep; relight the `border-t border-white/10` →
   `border-t border-border`. Preserve `data-page-editor-toolbar-row="panels"`.
7. **Subpanels** (`~`3112-3184): relight the dark subpanel tokens
   (`bg-white/5 text-slate-100`, `border-white/10`, `text-slate-200`/`text-slate-400`)
   to `bg-muted/40 text-foreground`, `border-border`,
   `text-foreground`/`text-muted-foreground`. Preserve
   `data-page-editor-toolbar-panel`, `data-page-editor-subpanel`,
   `data-page-editor-subpanel-header`, `data-page-editor-subpanel-scroll`. Keep
   the `PageEditorColorPaletteContext.Provider` + all `ToolbarSubpanel` handler
   props (`onSectionControlChange`, `onBlockControlChange`, `onClearOverride`,
   responsive override resets, `onAddBlock`) **unchanged**. **ALSO pass
   `tone={panelTone}` to the `<ToolbarSubpanel>` invocation (`:3158`)** and add a
   matching `tone?: "dark" | "light"` (default `"dark"`) to its def (`:3308`): this is
   the SINGLE threading entry point that carries the Step 5b relight into the
   registry-control pipeline AND the in-file local field renderers
   (`ToolbarGradientField`/`ToolbarMediaUrlField`/`ToolbarTextField`/`ToolbarSelectField`)
   it renders. Adding the `tone` prop is the one allowed change to the `ToolbarSubpanel`
   call beyond the handler props above; the default `"dark"` keeps the menu branch
   (and the existing render-prop tests) green.

Pass `tone={panelTone}` through to `ToolbarIconButton` and use a small token map
so the relight is centralized rather than scattered:

```ts
// inside PageEditor render, before floatingPanelBody:
const panelTokens = panelTone === "dark"
  ? { headerBorder: "border-white/10", label: "text-slate-400",
      chip: "bg-white/10", scopePill: "bg-sky-400/15 text-sky-200",
      subPanelBg: "bg-white/5 text-slate-100", subHeaderBorder: "border-white/10",
      subTitle: "text-slate-200", subDesc: "text-slate-400" }
  : { headerBorder: "border-border", label: "text-muted-foreground",
      chip: "bg-muted text-muted-foreground",
      scopePill: "bg-primary-soft text-primary-soft-foreground",
      subPanelBg: "bg-muted/40 text-foreground", subHeaderBorder: "border-border",
      subTitle: "text-foreground", subDesc: "text-muted-foreground" };
```

### Step 5b — relight `ToolbarIconButton` + `controlChrome` constants (tone-aware)

`FloatingEditorToolbar.tsx` (`ToolbarIconButton`, `:7-48`; active/hover at `:34-36`)
is shared by both branches. Add a `tone?: "dark" | "light"` prop (default `"dark"`
to preserve menu) and branch the active/hover classes:

```tsx
// FloatingEditorToolbar.tsx
export const ToolbarIconButton = ({ tooltip, active = false, expanded, panelId,
  disabled = false, onClick, onPointerDown, tone = "dark", children }: {
  /* …existing… */ tone?: "dark" | "light";
}) => {
  const toneClass = tone === "light"
    ? (active ? "bg-primary-soft text-primary-soft-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground")
    : (active ? "bg-white/15 text-white"
              : "text-slate-300 hover:bg-white/10 hover:text-white");
  return (/* …button with `${editorControlFocusClass} ${toneClass}`… */);
};
```

`controlChrome.ts` exposes `editorDarkButtonClass` (`:22`) /
`editorDarkGhostButtonClass` (`:30`) **and** the per-control text/focus tokens
`editorControlLabelClass` (`:6` — `text-slate-400`) / `editorControlValueClass`
(`:9` — `text-slate-100`) / `editorControlFocusClass` (`:12` — `ring-white/60`)
that EVERY control primitive renders (MediaPicker `:37`, ListItems `:58`, FacetList
`:187`, plus the focus ring on every input/swatch/combobox). On the new light
`bg-popover`/`bg-muted` rail all of these render slate-on-light / invisible-ring.
Add light siblings for **every token KIND** the panel body uses — not just the two
button CTAs — and keep the dark ones for the menu branch:

```ts
// controlChrome.ts — add light siblings (dark ones stay for the menu branch).
// Buttons / text:
export const editorPanelButtonClass =
  "border border-border bg-muted text-foreground shadow-none hover:bg-muted/70";
export const editorPanelGhostButtonClass =
  "text-muted-foreground hover:bg-muted hover:text-foreground";
export const editorPanelLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
export const editorPanelValueClass =
  "text-xs font-semibold tabular-nums text-foreground";
// Focus ring (replaces editorControlFocusClass' ring-white/60 on light):
export const editorPanelFocusClass =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring";
// Inputs / selects (ColorSwatch hex, ListItems/FacetList inputs + select, Combobox
// trigger + search): replace bg-white/10 + bg-white/5 + text-slate-100/200 +
// border-white/15 + [&>option]:bg-slate-900.
export const editorPanelInputClass =
  "border border-border bg-background text-foreground placeholder:text-muted-foreground";
export const editorPanelSubInputClass =
  "border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground";
export const editorPanelSelectClass =
  "border border-border bg-background text-foreground [&>option]:bg-popover";
// Swatch borders (border-white/15 → light):
export const editorPanelSwatchBorderClass = "border-border hover:border-foreground/40";
// Row container (FacetList :199 bg-white/5 border-white/10 → light):
export const editorPanelRowClass = "border border-border bg-muted/40";
// Segmented control (track bg-white/10, active bg-white text-slate-950, idle
// text-slate-300 → light):
export const editorPanelSegmentTrackClass = "bg-muted";
export const editorPanelSegmentActiveClass = "bg-background text-foreground shadow-sm";
export const editorPanelSegmentIdleClass =
  "text-muted-foreground hover:bg-muted hover:text-foreground";
// Combobox dropdown surface + option states (bg-slate-900 / bg-white/15 → light):
export const editorPanelDropdownClass = "border border-border bg-popover shadow-pop";
export const editorPanelOptionActiveClass = "bg-primary-soft text-primary-soft-foreground";
export const editorPanelOptionFocusClass = "bg-muted text-foreground";
export const editorPanelOptionIdleClass =
  "text-foreground hover:bg-muted hover:text-foreground";
// Toggle off-track (bg-white/20 → light):
export const editorPanelToggleOffClass = "bg-muted-foreground/30";
// Slider range accent (SliderControl :56 accent-white → light, NOT a stepper button):
export const editorPanelSliderAccentClass = "accent-primary";
```

**These tokens are NOT all PageEditor-local — they are consumed across the registry
control files reached through the generic `ToolbarSubpanel` control pipeline, none
of which take a `tone` prop today.** A `tone: "dark" | "light"` (default `"dark"` to
preserve the menu branch) must be threaded **PageEditor render → `ToolbarSubpanel`
→ EVERY registry control renderer** (not only the three button-CTA files), and each
consumer must select the `editorPanel*` light tokens when `tone === "light"`.
**Scope warning:** following the contract literally for only the three button files
relights the buttons + labels but leaves the BULK of the panel's controls — color
swatch, alignment/segmented, sliders, toggles, comboboxes, list/facet inputs +
selects, and the focus ring — rendering dark-on-light / illegible on `bg-popover`,
defeating the right-rail parity goal. Thread `tone` into **all** of these (verify
the line refs — the file shifts):

- **`PageEditor.tsx` local `ToolbarSubpanel`** (def `:3308`; "Add block" CTA
  `:3415`/`:3502`, `editorDarkButtonClass`) — relightable in-file once `tone`
  reaches the subpanel renderer. **Required** for the rewritten dark-chrome test's
  "Add block" → `editorPanelButtonClass` assertion
  (`page-editor-v2-flow.test.tsx:3157-3158`). Also relight the **in-subpanel tokens
  the same renderer hardcodes** (else they ship dark-on-light too): the
  responsive-override pills (`bg-sky-400/20 text-sky-200` active /
  `bg-white/10 text-slate-400` idle, `:3580`) →
  `editorPanelOptionActiveClass` / `editorPanelOptionIdleClass`; the reset chip
  (`text-slate-300 hover:bg-white/10`, `:3694`) → `editorPanelGhostButtonClass`; and the
  `text-slate-300` label (`:3659`) → `text-muted-foreground`.
- **`PageEditor.tsx` local field renderers (in-file — defined inside `PageEditor.tsx`,
  NOT in the `editorControls/` registry, but ALSO rendered in the panel body and ALSO
  hardcoding dark Tailwind).** Thread the same `tone` so these are relit, or they ship
  dark-on-light on the right rail:
  - **`ToolbarGradientField`** (def `:4187`) — the **"Add stop"** button
    (`editorDarkButtonClass`, `:4285-4289`) → `editorPanelButtonClass`; the ghost button
    (`editorDarkGhostButtonClass`, `:4261`) → `editorPanelGhostButtonClass`; the row
    container (`border-white/10 bg-white/5`, `:4243`) → `editorPanelRowClass`. **This
    "Add stop" button is the THIRD in-file `editorDarkButtonClass` consumer** — a grep
    of `editorDarkButtonClass` returns the `:154` import + `:3415` + `:3502` + `:4289`,
    so the complete in-file dark-button relight list is **`3415`/`3502`/`4289`**, NOT
    just the two "Add block" CTAs.
  - **`ToolbarMediaUrlField`** (def `:4518`) — `bg-white/10` `:4578` →
    `editorPanelInputClass`; `text-slate-300` `:4581` → `text-muted-foreground`;
    `editorDarkGhostButtonClass` `:4586` → `editorPanelGhostButtonClass`. **This
    `:4586` ghost button IS the Background external-URL "Clear" readout the rewritten
    dark-chrome test asserts as `editorPanelGhostButtonClass`
    (`page-editor-v2-flow.test.tsx:3168-3170`, which queries the
    `data-page-editor-media-external` container at `:4579` → `.querySelector("button")`);
    relighting it here is what turns that assertion green — NOT threading `tone` into
    `MediaPickerControl` (whose remove button is a SIBLING nested inside this field at
    `:4570`, renders `data-page-editor-media-control`, and is not even shown in the
    external-URL fixture).**
  - **`ToolbarTextField`** (def `:4597`) — `border-white/15 bg-white/10 text-slate-100`
    `:4609` → `editorPanelInputClass`.
  - **`ToolbarSelectField`** (def `:4616`) — same dark input `:4632` →
    `editorPanelSelectClass`.
- **`editorControls/MediaPickerControl.tsx`** (`:44-45`:
  `triggerButtonClassName=editorDarkButtonClass`,
  `removeButtonClassName=editorDarkGhostButtonClass`) — these are MediaPickerControl's
  OWN Browse/Remove buttons, forwarded as render-prop class names to the mocked
  `<MediaPicker>`. The control renders `data-page-editor-media-control` (`:34`), **not**
  the `data-page-editor-media-external` "Clear" readout, so it is **NOT** the button the
  `page-editor-v2-flow.test.tsx:3168-3170` assertion targets (that is
  `ToolbarMediaUrlField:4586`, above), and in that fixture (external URL,
  `selectedAssetId` null) its remove button is not even rendered. **Required** relight,
  but verified by a DIFFERENT test: the control hardcodes the dark constants and takes no
  `tone`, so its `editorPanel*` light siblings are asserted by the NEW
  `page-editor-control-primitives.test.tsx` `tone="light"` render-prop mount
  (`~`:818-820), which is its actual per-primitive home.
- **`editorControls/ListItemsControl.tsx`** — buttons `:88`/`:100` →
  `editorPanel(Ghost)ButtonClass`; raw inputs `:70`/`:78` →
  `editorPanelInputClass`/`editorPanelSubInputClass`.
- **`editorControls/FacetListControl.tsx`** — buttons `:228`/`:295`; `inputClass`/
  `subInputClass`/`selectClass` `:27-29` → `editorPanelInputClass`/
  `editorPanelSubInputClass`/`editorPanelSelectClass`; row container `:199` →
  `editorPanelRowClass`.
- **`editorControls/ColorSwatchControl.tsx`** — hex input `:145` →
  `editorPanelInputClass`; swatch borders `:94`/`:116`/`:133` →
  `editorPanelSwatchBorderClass`.
- **`editorControls/ComboboxControl.tsx`** — trigger `:181` → `editorPanelInputClass`;
  dropdown `:193` → `editorPanelDropdownClass`; search input `:210` →
  `editorPanelSubInputClass`; option rows `:267-272` →
  `editorPanelOptionActive/Focus/IdleClass`.
- **`editorControls/SegmentedControl.tsx`** — track `:93` →
  `editorPanelSegmentTrackClass`; active `:107` → `editorPanelSegmentActiveClass`;
  idle `:108` → `editorPanelSegmentIdleClass`.
- **`editorControls/SliderControl.tsx`** — native range `accent-white` at `:56` →
  `editorPanelSliderAccentClass` (`accent-primary`). NOTE: `SliderControl.tsx:18` is a
  value-format helper, NOT a stepper button — `SliderControl` has no stepper; its sole
  illegible token is the white range accent at `:56`, which is white-on-light
  (invisible) on the new light rail.
- **`editorControls/SliderStepperControl.tsx`** — the real stepper buttons
  (`stepperButtonClass` `:18`, used at `:62`/`:71`) → `editorPanel(Ghost)ButtonClass`.
- **`editorControls/ToggleSwitch.tsx`** — off-track `:26` → `editorPanelToggleOffClass`.
- The shared `editorControlFocusClass` (`:12`, `ring-white/60`) on every input /
  swatch / combobox / stepper → swap to `editorPanelFocusClass` when `tone === "light"`.

**Minimum to turn the rewritten dark-chrome test green:** thread `tone` into the
local `ToolbarSubpanel` ("Add block", `:3415`/`:3502` → `editorPanelButtonClass`,
satisfies `:3157-3158`) **and** the in-file `ToolbarMediaUrlField` (Background
external-URL "Clear", `:4586` → `editorPanelGhostButtonClass`, satisfies `:3168-3170`).
**NOT** `MediaPickerControl` — its remove button renders `data-page-editor-media-control`,
is not the `data-page-editor-media-external` "Clear" readout the `:3168-3170` assertion
queries, and is not even mounted in that external-URL fixture; threading `tone` only into
`MediaPickerControl` leaves `:4586` dark and `:3168-3170` RED. (`MediaPickerControl` is
still a REQUIRED relight — see its bullet above — but for the
`page-editor-control-primitives` `tone="light"` mount, not this dark-chrome test.) **For
complete light-parity (REQUIRED for this deliverable, not optional):** thread `tone` into ALL primitives above so color, segmented/alignment,
sliders, toggles, comboboxes, and list/facet inputs+selects render legible on the
light rail — otherwise the rail ships with the bulk of its controls dark-on-light
while the button-only test stays green (a silent parity failure). Centralize via the
single `tone`-keyed token map in `controlChrome.ts` consumed by every control,
rather than scattering the branch per call-site.

**Add a non-button relight guard test** (so the full relight is regression-protected,
not just the buttons): assert at least one NON-button control renders the LIGHT token
on the page host and the DARK token on a menu host — e.g. on the default `page` mount
the `SegmentedControl` track carries `editorPanelSegmentTrackClass` (or the
`ColorSwatchControl` hex input carries `editorPanelInputClass`), while a bare
`mode:"menu"` host (see the dark-render fixture in the Regression-test shape) keeps
`bg-white/10`. **Also assert at least one in-file LOCAL field renderer is relit** (the
registry-only guard does not cover them) — e.g. the `ToolbarGradientField` "Add stop"
button carries `editorPanelButtonClass` on the page host — so the local-renderer
omission (`ToolbarGradientField`/`ToolbarMediaUrlField`/`ToolbarTextField`/
`ToolbarSelectField` + the in-subpanel pills/chip) is regression-protected, not just
the registry controls. Without these guards the button-only dark-chrome test lets
broken controls ship green.

`editorCanvasCtaButtonClass` (`:38`) / `editorCanvasGhostTileClass*` (`:48+`) are
for the **always-white canvas** (not the panel) — leave them unchanged for both
modes.

### Step 6 — branch builder-vs-menu plumbing; reopen chip to top-right; globals.css

```tsx
// Reopen affordance (:3188-3199): move from bottom-right to TOP-right for the
// builder; keep bottom-right for menu (it mirrors the legacy bottom panel).
{!panelOpen && hasFloatingPanelSelection ? (
  <button type="button" onClick={() => setPanelOpen(true)}
    className={`absolute z-30 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop transition-colors hover:text-primary ${
      useLegacyChrome ? "bottom-6 right-6" : "right-4 top-4"}`}
    aria-label="Show panel">
    <SlidersHorizontal className="size-3.5" /> Show panel
  </button>
) : null}
```

**Drag/clearance plumbing — reconciliation note (important).** The TASK-495
brief's GAP B wording said to *delete* the drag plumbing
(`toolbarOffset`/`toolbarDragging`/`startToolbarDrag`/the pointer-move effect/
`toolbarDragRef` + transform + `data-page-editor-toolbar-dragging`) and the
bottom-clearance (`toolbarCanvasClearance` + the ResizeObserver effect + the
`--page-editor-toolbar-clearance` rule in `globals.css:325-331`). That wording
assumed `PageEditor.tsx` was page-only. Because the **menu** host shares this
component and the owner requires the menu path to keep the **legacy bottom
toolbar** (which IS the draggable, clearance-reserving panel), this plumbing is
**not globally dead** — it must remain for the `useLegacyChrome` branch.
Therefore:

- **Keep** `toolbarOffset`/`setToolbarOffset` (`:804`), `toolbarDragging`/
  `setToolbarDragging` (`:803`), `toolbarDragRef` (`:805`), `startToolbarDrag`
  (`:1964-1976`), the pointer-move effect (`:1978-1994`), `toolbarCanvasClearance`
  (`:809`) + the ResizeObserver effect (`:2003-2014`), and the
  `--page-editor-toolbar-clearance` rule (`globals.css:325-331`). They now run
  **only** when the legacy/menu branch renders. The globals.css rule is harmless
  for the builder (the var is simply unset → `scroll-margin-bottom` defaults to
  `0px`), so it stays untouched.
- For the **builder** branch they are simply **not referenced** (no transform, no
  `data-page-editor-toolbar-dragging`, no bottom padding) — which is the
  user-visible "removal" the prototype parity requires, achieved by branching
  rather than deleting.
- This is a deliberate deviation from the literal "delete the plumbing" wording,
  required to satisfy "mode `menu` keeps its current code path." Record it in the
  closure changelog.

### Data flow

Unchanged. `getCachedDetail`/`loadDetail` hydrate → `PAGE_MODEL` document state
drives `SectionCanvas`/Layers → section/block ops mutate the document via the
existing helpers → `autosaveDocument`/`saveDocument` persist behind the
`useAdminDirtyNavigationGuard` dirty-state guard → `subscribeCacheEvents`
background-revalidates without overwriting dirty state → `editorHost.preview` +
`RuntimePreviewDialog` honor preview tokens. Re-homing the controls (top bar →
PageHeader/sub-toolbar; bottom panel → right rail) changes **which container
renders a handler**, never **which handler runs**. Panel open/close, the Panel
toggle, device switch, and reopen chip must **not** refetch or clear dirty state
(`panelOpen` stays a single lazy-`true` `useState` at `:753`; no `setState` in an
effect).

### Error handling

Keep every existing Alert banner (`error`, `previewError`, `autosaveError`,
`revalidationError`, `recoveryCheckError`, recoverable-autosave prompt) and all
`createAdminActionToastAdapter` / `isSessionExpiredApiError` handling. No new error
states. The PageHeader/sub-toolbar buttons reuse the same `disabled` guards
(`previewLoading`, `isSaving`, `isPublishing`, `!page`), so failure surfaces are
identical.

### Real-input regression guard (DO NOT regress — [[page-editor-color-toolbar-live-findings]])

The right rail must **not** add any panel-wide `onMouseDown`/`onPointerDown`
`preventDefault` (the prior cause of swatch-click no-ops and an unfocusable URL
input). Per-fragment color swatch, the URL input, and inline-mark controls must
stay focusable + live-updating with a **real** mouse + keyboard. The L02 carry-over
constraints hold: the floating panel is the **sole** control surface; single
`panelOpen` state; no sync `setState` in an effect (ESLint 9 `react-hooks`). Verify
with `playwright-cli` real input, not synthetic events.

### Regression-test shape

Update the two builder-chrome-affected tests in
`tests/vitest/ui/page-editor-v2-flow.test.tsx` **in the same change** (these mount
the default `page` host, which is now the new chrome):

- **"PageEditor floating toolbar labels selection, switches one panel, collapses,
  and tracks drag state"** (`:2984`): the page builder no longer drags — **remove
  the drag-state block** (`~`:3071-3101, which BEGINS with
  `const dragHandle = view.container.querySelector('button[aria-label="Drag toolbar"]')`
  at `:3071` — `:3070` is blank — then the `pointerdown` →
  `data-page-editor-toolbar-dragging="true"` (`:3081`) → `transform` contains
  `35px`/`22px` → `pointerup` assertions (`:3099`)). **The `dragHandle` binding (`:3071`)
  MUST be deleted WITH the block**: it is referenced ONLY inside the removed block
  (`:3073`), so removing only `:3072-3101` orphans a declared-but-unused `const`, which
  trips `@typescript-eslint/no-unused-vars` and **fails `bun --cwd core lint`** (an
  explicit closure gate). Rename the test to drop "tracks drag state". Keep the label /
  single-panel-switch / collapse assertions (`~`:2991-3069) — those target preserved
  hooks (`data-page-editor-floating-toolbar`, `-toolbar-collapsed`, `-toolbar-row`,
  `-toolbar-actions` at `:3014`/`:3059`). Relocate the removed `dragHandle` lookup +
  drag-state assertions into the new bare `mode:"menu"` fixture (the menu-mode guard
  below), where the legacy draggable panel still renders. Add: the panel container
  carries the right-dock classes (`right-4`/`top-4`) and has **no** inline
  `transform`/`data-page-editor-toolbar-dragging`.
- **"PageEditor dark-toolbar buttons and canvas CTAs use the shared non-inverting
  chrome"** (`:3106`): the page mount is now **light**. Split the assertions by
  kind so nothing is silently dropped:
  - **Light DOM RENDER assertions (page mount):** update the two in-panel render
    checks to expect `editorPanelButtonClass` on the rendered "Add block" CTA
    (`~`:3157-3158) and `editorPanelGhostButtonClass` on the rendered Background
    external-URL "Clear" readout (`~`:3164-3169), instead of the dark constants.
    Keep the `editorCanvasCtaButtonClass` canvas-CTA render assertions
    (`~`:3144-3146) unchanged (the white canvas is unchanged).
  - **Mode-agnostic CONSTANT-value (shape) checks — KEEP in this page-mode test,
    do NOT relocate.** The existing `editorDarkButtonClass` value checks
    (`~`:3150-3151: contains `bg-white/10` / `hover:bg-white/20`) are
    mount-independent and the dark constants are still LIVE (the menu branch renders
    them), so they stay. **ADD** the missing `editorDarkGhostButtonClass`
    value-shape check (e.g. contains `text-slate-200` / `hover:bg-white/10`) and
    **ADD** light-constant shape checks for the new tokens
    (`editorPanelButtonClass` contains `bg-muted`; `editorPanelGhostButtonClass`
    contains `text-muted-foreground`). These constant checks need no mount and keep
    BOTH tones covered.
  - **Do NOT "move the dark RENDER assertions to a menu-mode case" by mounting
    `MenuDesignEditorPage`** — that mount **cannot reproduce them**, for three reasons
    intrinsic to that page (NOT the MediaPicker mock): it runs a RESTRICTED palette
    (`button/image only, no section inserts` — `MenuDesignEditorPage.tsx:260-261`) with
    an empty sections palette (no "Add section"); it surfaces the host-appearance panel
    as its DEFAULT floating panel (not a section Content panel with an "Add block" CTA);
    and it provides **no selectable hero section with an external `backgroundImage`**, so
    the Background external-URL "Clear" readout is never reached. **The file-level
    `@/ui/media/MediaPicker` mock is NOT the cause** and must NOT be changed: both
    controls render via `PageEditor.tsx` **independent of `MediaPicker`** — the "Add
    block" CTA comes from the in-file `ToolbarSubpanel` (`:3415`/`:3502`), and the
    "Clear" readout from the inline `data-page-editor-media-external` block
    (`:4576-4592`) gated on `showsExternalValue` (`:4567`) and driven by the
    `mediaClient` mock (`menu-design-editor-flow.test.tsx:281-283`, which returns
    non-null arrays). Swapping the bare `MediaPicker` stub (`:308-309`) would only break
    sibling menu tests that rely on it. The dark RENDER assertions are reproduced
    instead via a bare `mode:"menu"` `PageEditorHost` fixture in
    `menu-design-editor-flow.test.tsx` (spelled out in the menu-mode guard bullet below)
    — NOT a `MenuDesignEditorPage` mount.

**`page-editor-control-primitives.test.tsx` — directly affected per-primitive suite
(ADD to the run command above).** This file mounts `MediaPickerControl`,
`SegmentedControl`, `ColorSwatchControl`, `SliderControl`, and `ToggleSwitch` with **no**
`tone` prop, and its `MediaPickerControl` case asserts the render-prop shape
`{ triggerButtonClassName: editorDarkButtonClass, removeButtonClassName:
editorDarkGhostButtonClass }` (`~`:489-510) — a render-prop assertion, not a
mount-independent value check. These assertions stay green **only because the threaded
`tone` defaults to `"dark"`** on every primitive: do **NOT** make `tone` required or flip
a default, or this (previously un-run) suite breaks while it is not even in the test list.
Because it is the per-primitive home for these constants, **ADD here a NEW (REQUIRED)
`tone="light"` mount** asserting the `editorPanel*` light tokens — e.g. mount
`MediaPickerControl` with `tone="light"` and assert the render-prop shape
`{ triggerButtonClassName: editorPanelButtonClass, removeButtonClassName:
editorPanelGhostButtonClass }`, or mount `SegmentedControl`/`ColorSwatchControl` with
`tone="light"` and assert the `editorPanel*` segment-track / hex-input token. This is
the per-primitive relight regression home (more focused than the integration-level
non-button guard above); the existing **no-tone (dark-default)** render-prop assertion
at `~`:489-510 stays unchanged beside it, so both tones are covered at the primitive
level. Without this light mount the threaded `tone="light"` path is exercised only at
the integration level and can silently regress per-primitive.

Add new builder assertions (in `page-editor-v2-flow.test.tsx` or a focused
`page-editor-chrome.test.tsx`):

- The global top bar `{actions}` slot is **drained**: no DeviceSwitcher / no
  `data-page-editor-device-option` in the `TopBar` region (they render in the
  sub-toolbar instead).
- `PageHeader` renders builder actions in order `Page settings → History →
  Preview → Save draft → Publish` (assert the `Save draft` label + a `Publish`
  button with the Rocket icon; respect `editorHost.preview`/`publish`/
  `revisionsHost` gates).
- The sub-toolbar renders: `Page builder` label, the relocated `StatusBadge`,
  `Undo`/`Redo` (by `aria-label`), the `DeviceSwitcher`
  (`data-page-editor-device-option`), `Layers`, and the Panel toggle
  (`aria-pressed`, label flips `Hide panel`/`Show panel`).
- The options panel is **right-docked** (`[data-page-editor-floating-toolbar="true"]`
  has `right-4`/`top-4`, not `bottom-6 left-1/2`), and the reopen chip appears
  **top-right** when `panelOpen` is false.
- Undo/redo flow still works (existing test at `:1638` clicks Undo/Redo by
  `aria-label` via `clickButtonByLabel`, `~`:1652-1653) now that they live in the
  sub-toolbar.
- **The "Save only" capability badge (REQUIRED — this is the owner's most-justified
  parity decision, Step 3, and the default `page` host SUPPRESSES it, so the builder
  assertions above never exercise it).** Mount a **publish-absent, preview-present**
  builder host — either a `mode:"page-template"` host or a bare `PageEditorHost` with
  `preview` but **no** `publish` key (mirror the inline-host pattern at
  `menu-design-editor-flow.test.tsx:623-638`) — and assert its sub-toolbar renders a
  badge with the exact text **"Save only"** and with **no** `Eye` icon. Also assert the
  **default `page` host** (which provides `publish` — `PageEditor.tsx:281`/`:292`)
  renders **NO** such badge. Without this publish-absent mount, the badge label +
  `!editorHost.publish` gating ships completely unverified — free to silently regress to
  "Preview only" or to surface on the `page` host (the page-template builder host is the
  ONLY mode where the badge appears, and no listed suite mounts one today).

**Existing page-host test to RELOCATE (not weaken) — `menu-design-editor-flow.test.tsx:649`.**
The same file also carries `"the default page host keeps the full palette and the
preview affordance"` (`:649`), which mounts the **default `page` host** (now the
builder chrome) and asserts Preview lives in the **drained** top-bar slot:
`const topbar = container.querySelector('[data-editor-topbar="true"]'); expect(findButton(topbar, "Preview")).toBeTruthy();`
(`:656-657`). `findButton` is **scoped to the passed node** (`:357`) and the
`EditorShell` mock renders `topbarActions` into that `data-editor-topbar` div
(`:265`). After Step 1 drains `topbarActions={... : undefined}` for the page host,
that slot is empty and Preview relocates to the in-content `PageHeader` (in
`children`/`<main>`), so this assertion **FAILS**. **Relocate** the Preview check
off the drained `data-editor-topbar` slot to the in-content `PageHeader` region
(or assert Preview renders **anywhere in `container`**, not scoped to the topbar
slot) for the page host. This is a **required relocation to mirror the new
chrome**, NOT an assertion weakening — the "keep green unchanged" directive does
not apply to a control that legitimately moved. The sibling **menu-host**
assertions at `:519-540` (`menu host hides the preview affordance and publish
rides the menu flow`) stay valid as-is: the menu keeps the legacy top bar, so its
`data-editor-topbar` slot still holds Preview-absent / Save / Publish.

Add a **menu-mode** guard in `tests/vitest/ui/menu-design-editor-flow.test.tsx`
using a **bare `mode:"menu"` `PageEditorHost`** (mirror the inline-host pattern at
`menu-design-editor-flow.test.tsx:623-638` — a literal `PageEditorHost` object
mounted as `<PageEditor host={...}/>`, NOT a `MenuDesignEditorPage` mount). Give the
fixture a detail whose first section is a **hero with an external `backgroundImage`
URL** plus a **heading block**, and select that section so the legacy dark panel
opens with both the Content subpanel (the "Add block" CTA) and the Background
subpanel (the external-URL "Clear" readout). Assert that this `menu`-host mount:
- renders the **legacy bottom toolbar** — dark, bottom-center `bottom-6 left-1/2`,
  draggable (`pointerdown` flips `data-page-editor-toolbar-dragging="true"` and
  applies the `transform`), keeps `topbarActions` in the top bar, and renders **no**
  in-content `PageHeader` / sub-toolbar. (Relocate the drag-state assertions removed
  from the page test here.)
- carries the **dark RENDER tokens** the page mount no longer shows: the "Add block"
  CTA has `editorDarkButtonClass`, and the Background `data-page-editor-media-external`
  "Clear" button has `editorDarkGhostButtonClass` — the dark-chrome RENDER coverage
  the page test gave up, now exercised on the branch that actually renders dark.

> The bare-host fixture is the correct vehicle because `MenuDesignEditorPage`'s
> restricted palette + appearance-panel default + absent selectable hero section (see
> the prior bullet) never surface those two controls — **not** the `MediaPicker` mock,
> which leaves both controls renderable. Keeping the dark CONSTANT-value shape checks in
> the page test (prior bullet) plus these dark RENDER checks here means the
> non-inverting-chrome coverage is preserved for BOTH tones, not silently dropped.

Do **not** weaken the `data-*` hook assertions in `page-editor.test.tsx`,
`page-authoring-canvas.test.tsx`, or `page-editor-floating-panel.test.tsx`; they
must stay green unchanged.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-editor-floating-panel.test.tsx tests/vitest/ui/page-editor-control-primitives.test.tsx tests/vitest/ui/page-editor-layout-shell.test.tsx tests/vitest/ui/page-editor-layers.test.tsx tests/vitest/ui/page-editor-command-palette.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
  (`page-editor-control-primitives.test.tsx` is in this list because it directly
  asserts the threaded `tone` defaults — see the Regression-test shape note.)
- All other `tests/vitest/ui/page-editor-*` suites must stay green (do not weaken
  assertions to fit the restyle — keep the `data-page-editor-*` hook assertions).
- Real-input verification (`playwright-cli`, real mouse + keyboard) of the
  right-docked panel: per-fragment swatch click, URL input focus, inline-mark live
  update — guarding the documented [[page-editor-color-toolbar-live-findings]]
  regression. Confirm a menu (mode `"menu"`) editor still shows the legacy bottom
  toolbar and remains draggable.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this subtask changes
  status.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-479** + **TASK-495**;
  note (a) the L02 right-dock contract fulfilment, (b) the drag/clearance-plumbing
  reconciliation (kept for the `menu` branch rather than deleted), and (c) the two
  updated `page-editor-v2-flow` tests + the new menu-mode guard.
- A pure control-placement + visual restyle should need **no** `PAGE_MODEL.md` /
  `PREVIEW_SPEC.md` contract edits — state this explicitly in the changelog; if any
  documented editor behavior changed, cross-link it.

Related memories: [[pages-editor-v2-remediation-program]],
[[page-editor-color-toolbar-live-findings]], [[pageeditor-tsx-grep-binary-trap]].
