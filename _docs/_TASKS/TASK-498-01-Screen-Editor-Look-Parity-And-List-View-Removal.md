# TASK-498-01: Screen-Editor Look Parity + List-View Removal
# FileName: TASK-498-01-Screen-Editor-Look-Parity-And-List-View-Removal.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Custom Screens / Screen Builder
**Estimated Effort:** Large
**Dependencies:** TASK-496-02 (Screen surfaces on shared `CanvasEditor`), TASK-479 (soft/violet redesign)
**Status:** ⏳ To Do
**Parent Task:** TASK-498

---

## Overview

Re-skin the Custom-Screen entry-view builder's **inner content** to the prototype look
(`_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx`) and make the
builder's **right options panel match the Pages editor shell right rail exactly**, then
**remove the List-view editor surface** (List/Editor toggle + list-view row-template
editing) non-destructively. The outer chrome (PageHeader region, `rounded-2xl border
bg-card` card, dotted canvas, floating rail container) already comes from the shared
`CanvasEditor` shell and stays unchanged. No `ScreenDocumentV1`/`ScreenFieldBinding`
model change in this leaf.

- **Goal:** the builder reads as a graphical SCHEMA — corner-tag block cards, muted mono
  `{{ Field }}` tokens in builder mode, a 9-chip `BlockChip` palette, a single
  consolidated right inspector that is structurally identical to the Pages right rail,
  the in-canvas "Add section" affordance and tighter `max-w-2xl` width — and the screen
  editor presents ONLY the entry-view builder (no List/Editor toggle, no list-view
  editor).
- **Owning module/service:** `core/admin/ui/custom-screens/ScreenBlockLibrary.tsx`,
  `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx`,
  `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx`,
  `core/admin/ui/custom-screens/ScreenBlockInspector.tsx`,
  `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` (toggle + list branch removal);
  reference shells `core/admin/ui/shared/CanvasEditor.tsx` and the Pages rail
  `core/admin/ui/pages/PageEditor.tsx` (`railBody`/`builderRail`).
- **Source-of-truth docs / prototype to port from:**
  `_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx` (Section `:28-56`,
  Token `:58-70`, `SECTION_TAG :81-86`, the 9-chip `BlockChip` grid `:234-246`, the flat
  inspector `:250-296`, the "Add section" affordance `:223-228`, `max-w-2xl :220`),
  `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx` (`BlockChip :147-157`).
  Pages right-rail reference: `PageEditor.tsx` `railBody :3000-3074` (in-panel head row:
  hide-panel `PanelRight` button `:3024-3030`, target label + selection chip + scope pill
  `:3031-3047`), `builderRail :3321`, `panel={builderRail} :3486`, `panelPosition="right"
  :3489`.
- **Out of scope:** No new block kinds, no `data`-schema change, no binding-mechanism
  change (TASK-498-02 owns those). No change to `definition.listView` storage, to
  `buildDefaultListRowTemplate`, to the published list runtime (`CustomScreenEntriesTable`),
  or to the `ListView*` component files — they are retained for later relocation. No
  endpoint/RBAC change.

---

## Security Contract

Visual + editor-surface-scoping change only. **No endpoint, endpoint-visibility, auth,
RBAC, CSRF, or rate-limit change.** Removing the List-view editor surface is purely a
render/wiring removal in `CustomScreenEditorPage.tsx`: `definition.listView` stays in the
loaded + saved definition (the save payload is unchanged), so persistence, normalization
(`normalizeCustomScreenListViewDefinition`), and the published list runtime are untouched.
No strict-validation surface is added here (the per-kind reject-unknown schema lands in
TASK-498-02).

---

## Implementation Pseudocode

### A1 — 9-chip `BlockChip` palette (`ScreenBlockLibrary.tsx`)

Replace the 4-item full-width outline-button list (`:13-43, :52-131`) with a 3-col icon
grid of 9 data blocks, mirroring the prototype palette `:234-246`. There is **no shared
`BlockChip` in the real admin UI** (it lives only in the prototype), so port a small local
chip component into this file using the prototype's exact classes (`CanvasEditor.tsx:147-157`).
**Name the local component `PaletteChip`, NOT `BlockChip`** — the standing dead-code guard
`tests/vitest/ui/editor-surface-dead-code.test.ts:30-31` asserts the literal symbol `BlockChip`
appears NOWHERE under `core/` (`grepCount("BlockChip") === ""`, currently green: `grep -arn
BlockChip core` = 0). Naming the ported component `BlockChip` (or ANY name containing that
substring, e.g. `ScreenBlockChip`) re-introduces the symbol into `core/` and red-lights that
guard. `PaletteChip` (no `BlockChip` substring) keeps it green:

```tsx
// core/admin/ui/custom-screens/ScreenBlockLibrary.tsx
function PaletteChip({ icon: Icon, label, onClick, disabled }: {  // NOT `BlockChip` — see guard note above
  icon: ComponentType<{ className?: string }>; label: string;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:text-muted-foreground">
      <Icon className="h-4 w-4" />{label}
    </button>
  );
}

// 9 chips, prototype order + icons: Heading(Type), Text(AlignLeft), Field(Braces),
// Stat(BarChart3), Divider(Minus), Image(ImageIcon), Related list(List), Tabs(Columns3),
// Button(Square). Render each as `<PaletteChip … />` in a `grid grid-cols-3 gap-1.5`.
// - Presentational chips (heading/text/divider/tabs/button) call onAddBlock(kind) directly.
// - Bound chips (field/stat/image/related-list) call onAddBlock(kind) then the host focuses
//   the Bound-field inspector control (TASK-498-02 wires per-kind insert + focus). In THIS
//   leaf, `field` keeps its existing behavior; the other bound kinds are wired in 498-02.
```

> NOTE: the 9 chips reference kinds that only exist after TASK-498-02 extends
> `ScreenBlockKind`. In THIS leaf, render the palette with the chips disabled-or-no-op for
> the not-yet-added kinds, OR sequence the palette swap so the chip→`onAddBlock` wiring for
> a kind is enabled only once 498-02 adds that kind. The look (3-col grid + `BlockChip`)
> ships here; the per-kind insert wiring is owned by 498-02. The 9-chip grid is the SOLE
> insert surface (prototype palette is 9 chips only, `:234-246`): **DELETE the old per-field
> "Fields" list entirely** (`ScreenBlockLibrary.tsx:52-131`) — do NOT keep it beneath the grid
> and do NOT re-add it as a folded picker. A field block is inserted by the **Field** chip
> (`onAddBlock("field")`), and its specific bound field is chosen afterward via the first-class
> **Bound field** `Select` row in the Inspect inspector (A4), exactly like every other bound
> chip (stat/image/related-list). There is no separate per-field palette list.

### A2/A3 — corner-tag cards + builder `{{ }}` tokens (`ScreenRuntimeRenderer.tsx`)

Builder-mode block chrome currently prints a raw uppercase `block.type` strip + `GripVertical`
(`:279-287`) and the section header shows `font-mono section.id` (`:589-593`); the `field`
branch resolves & prints live values + Editable/Read/Unbound badges (`:399, 444, 448-456`).
Restyle **builder mode only** (gate on `mode === "builder"`; entry/preview keep resolving
real values):

```tsx
// Block card: corner-tag Badge with a human label (screenBlockLabels[type] or block label),
// positioned -top-2 left-3, on a clean `rounded-2xl bg-card p-5` card with the selection
// border (selectionBorder). Drop the uppercase type strip + GripVertical from builder mode.
// Port the prototype Section (`CustomScreenEditorPreview.tsx:28-56`) + SECTION_TAG (`:81-86`)
// human labels (Header / Fields / Rich text / Related list / etc).

// Builder-mode bound blocks (field / record-header / stat / image / related-list) render a
// muted mono Token instead of the resolved value or the Editable/Read/Unbound badges:
function Token({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">{children}</span>;
}
// e.g. a `field` bound to label "Project" renders `{{ Project }}` in builder mode.
// Section header in builder mode: human title only, NO font-mono section.id.
```

This A3 token change is the single most important look fix — it communicates the
graphical-schema intent. Entry/preview mode rendering is unchanged in this leaf (new-kind
render branches land in 498-02/03).

### A4 + Owner refinement — right-panel parity with the Pages shell rail

Today the screen builder uses a **tab-switched** model: `ScreenAuthoringCanvas` puts a
`ScreenPanelToggleRail` of category tabs (Insert/Layers/Content/Binding/Style) in the
`CanvasEditor` sub-toolbar (`:277-333, :393`) and swaps the floating-panel body between
the library, layers, and a bordered-card `ScreenBlockInspector` (`:335-365`). The Pages
shell instead renders **one consolidated rail body** (`builderRail`/`railBody`) with an
**in-panel header** (hide-panel `PanelRight` button + target label + selection-meta chip +
editing-scope pill, `PageEditor.tsx:3024-3047`) and a single scrollable inspector body.

Make the screen rail **structurally identical to the Pages rail**:

```tsx
// core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx — pass a single consolidated
// `panel` to CanvasEditor that mirrors the Pages railBody shape:
//   <ScreenRailBody>:
//     <head row> = hide-panel button (PanelRight, calls onPanelOpenChange(false)) +
//       <PanelTop> + target label (blockLabel(selectedBlock) ?? "Screen") +
//       selection-meta chip (block type) ; same flex layout/classes as railBody :3010-3047 +
//       BLOCK-ACTION CLUSTER (rendered when a block is selected) = move-up / move-down /
//       duplicate / delete, mirroring the Pages in-panel HEAD action cluster
//       (PageEditor.tsx:3168-3208; Copy=duplicate :3197, Trash2=delete :3207) — RE-CREATED
//       locally per the boundary guard (do NOT import the Pages cluster), wired to the EXISTING
//       onMove/onDuplicate/onDelete props already passed into ScreenAuthoringCanvas (:350-352,
//       currently rendered in the sub-toolbar :394-432). This head cluster is WHERE move/dup/
//       delete LIVE after the sub-toolbar is stripped — Pages keeps them in the panel head, so
//       true parity requires them HERE, NOT in the inspector body (keep ScreenBlockInspector
//       showBlockActions={false} :346 so the body does NOT render a SECOND cluster). Also relocate
//       the command-palette Search trigger (the no-block sub-toolbar button :434-442 that opens
//       AuthoringCommandPalette via commandOpen) into this head row so the palette stays reachable
//       and the sub-toolbar keeps ONLY the panel toggle.
//     <category icon row> = FOUR icons — Settings / Insert / Layers / Inspect (mirrors the
//       Pages panel-category row `data-page-editor-toolbar-row="panels"`, PageEditor.tsx:3213-3232,
//       which lists doc-level + block-level categories together in one in-panel row):
//        - Settings = the EXISTING screen-level `settings` category (Settings2 icon →
//          screenSettingsPanel; ScreenAuthoringCanvas.tsx:277-289 toolbarPanels entry + floating
//          branch :356-358). It is KEPT, NOT dropped — Settings is a doc-level panel and stays
//          ALWAYS-enabled (like the Pages doc-level panels), so screen-level settings remain
//          reachable in the UI and `settingsPanel={screenSettingsPanel}` (CustomScreenEditorPage.tsx:1059)
//          stays wired and live (its floatingPanel branch must NOT become dead).
//        - Insert / Layers → palette / layers (unchanged, doc-level, always-enabled).
//        - Inspect = the FLATTENED block inspector (A4 below): the old Content + Binding + Style
//          category buttons are COLLAPSED into one "Inspect" icon (disabled when no block is
//          selected, like the current Content/Binding/Style buttons :312,:321,:330). Do NOT
//          render three separate Content/Binding/Style icons that all open the same flat body.
//        - rendered as the IN-PANEL category icon row, NOT as a sub-toolbar tab rail. REUSE the
//          existing `ScreenPanelToggleRail` component for this row — relocate it from the sub-
//          toolbar (`ScreenAuthoringCanvas.tsx:393`) into the panel head and restyle its markup in
//          place to the Pages category-row look. Reusing it KEEPS ScreenPanelToggleRail imported by
//          ScreenAuthoringCanvas (:40), so it is NOT orphaned by the dead-code guard's Sweep 6 even
//          after CustomScreenEditorPage drops its OWN ScreenPanelToggleRail import in the list-
//          removal step (:56/:1009). Pass it the FOUR-entry Settings/Insert/Layers/Inspect panels.
//          The relocated/restyled rail MUST still emit `data-screen-toolbar-rail="true"`
//          (ScreenPanelToggleRail.tsx:29) — FOUR suites assert it (custom-screen-editor-restyle
//          :99, custom-screens-page :88/:213, custom-screen-list-view-canvas :204); restyle its
//          classes in place but do NOT drop that attribute.
//     <body> = single scrollable consolidated body:
//        - Settings active → screenSettingsPanel (screen-level settings body; unchanged)
//        - Insert active   → palette (A1 9-chip `PaletteChip` grid)
//        - Layers active   → AuthoringLayersPanel
//        - Inspect active  → flat ScreenBlockInspector with panel="all" (renders
//          Layout/Bound field/Spacing/Background/Visible in one stack — :194-196 already
//          supports panel="all"); drop the per-category content/binding/style sub-routing
//          (`ScreenAuthoringCanvas.tsx:335-354`).
//     <default active category> = the rail is NEVER empty on load (the prototype ALWAYS shows the
//        palette, CustomScreenEditorPreview.tsx:234-246). Default `activePanel` to `"insert"` (palette)
//        when NO block is selected, and to `"inspect"` when a block IS selected. This REPLACES today's
//        initial `useState<ScreenAuthoringPanel | null>(null)` (ScreenAuthoringCanvas.tsx:189), which
//        leaves the floating-panel body blank until a category is clicked — seed the initial value to
//        `"insert"` (and switch to `"inspect"` on first selection) so the palette renders on first paint.
// The Pages rail renders a DISTINCT ToolbarSubpanel per category icon (PageEditor.tsx:3284,
// :3661 ToolbarSubpanel). That per-category split is INTENTIONALLY NOT ported here — the
// screen inspector is one flat body (prototype CustomScreenEditorPreview.tsx:250-296). Pages
// parity is required for the rail CHROME (in-panel hide/grip head + target label + selection
// chip + single scrollable body + show/hide behavior), not for the category-count.
// Keep panelPosition="right" + panelOpen/onPanelOpenChange/reopenAffordance wired through
// CanvasEditor UNCHANGED (show/hide already matches Pages: shared shell reads panelOpen,
// renders reopenAffordance when hidden — CanvasEditor.tsx:145-156).
// The CanvasEditor panel CONTAINER is already byte-identical to Pages
// (PANEL_POSITION_CLASS.right == PageEditor's right-rail container), so parity is achieved
// by matching the panel BODY + in-panel header, not the container.
//
// BOUNDARY GUARD (tests/vitest/ui/custom-screen-authoring-boundary.test.ts forbids
// `@/ui/pages` / `ui/pages/builder` imports from the custom-screens modules): achieve
// Pages-rail parity by RE-CREATING the railBody markup/classes locally in the custom-screens
// tree — do NOT import the Pages `railBody`/`builderRail`/`ToolbarSubpanel`/`PageEditor`
// components. Reuse the soft tokens + lucide icons directly; copy the class strings.
```

Flatten `ScreenBlockInspector.tsx` (`:252-365`) to the prototype's single inspector
(`CustomScreenEditorPreview.tsx:250-296`): `Layout` / `Bound field` / `Spacing` /
`Background` swatches / `Visible`, each as an `InspectorRow` (label + control), with the
Bound-field `Select` promoted to a first-class row (currently buried under the "Binding"
tab in a bordered card via `FieldBindingControls :100-166`). Remove the per-tab bordered
`rounded-lg border p-3` card wrappers in favor of the flat `InspectorRow` stack. Keep the
existing `onPatchBlock`/`onPatchBlockData`/`onPatchBinding` handlers wired. The block-actions
(move/duplicate/delete) stay REACHABLE but render in the panel HEAD action cluster (specified in
the head-row spec above — Pages parity), NOT in the inspector body: keep
`ScreenBlockInspector showBlockActions={false}` (`ScreenAuthoringCanvas.tsx:346`) so the flattened
inspector body does NOT render its own move/dup/delete cluster (a second, non-Pages-parity copy).
The inspector's `onMove`/`onDuplicate`/`onDelete` props stay passed for type-stability; the
rendered controls live in the head row.

**Dropped sub-controls (prototype-faithful) + `panel`-prop collapse — STATE THE FATE.** The
prototype flat inspector (`:250-296`) has NO binding-mode "Interaction" row and NO "Advanced
style"/"Open style controls" style-MODAL, so BOTH are removed by the flatten, and the
`panel="content"|"binding"|"style"` sub-values collapse to one body:

- The `FieldBindingControls` "Interaction" mode `Select` (`ScreenBlockInspector.tsx:142-163`) is
  **DROPPED**. Read/readwrite binding mode is no longer a user-visible control — it is set
  per-kind by the Bound-field control (TASK-498-02 B4: display kinds → `mode:"read"`; `field` +
  an editable header bound to `title` → `readwrite`). KEEP the "Bound field" `Select` row
  (`:122-141`) as the first-class flat row with its `onPatchBinding` wiring.
- The "Advanced style" `Dialog` (`ScreenBlockInspector.tsx:367-384`; trigger "Open style
  controls", `[data-screen-style-dialog="true"]`) is **DROPPED**. Block `variant`/style is edited
  INLINE in the flat "Background" swatch row (no modal), matching the prototype's inline Background
  swatches.
- The `panel` prop's `"content"|"binding"|"style"` sub-values (`showContent`/`showBinding`/
  `showStyle` :194-196) collapse: the inspector renders ONE flat body. Keep `panel="all"` as the
  single rendered shape (the rail's "Inspect" category passes `panel="all"`); drop the per-category
  content/binding/style sub-routing (`ScreenAuthoringCanvas.tsx:335-354`, already called out above).

Both changes break the two suites that render `ScreenBlockInspector` DIRECTLY with `panel="binding"`
/ `panel="style"` and hard-assert "Interaction" / "Advanced style" / the style dialog — they are
re-pointed in **Testing Requirements** below (mirroring the List/Editor-toggle and widget-picker
re-points). 498-02 B4 cross-notes this drop and adds only the BEHAVIORAL mode coverage.

> The entry-view sub-toolbar keeps ONLY doc-level controls (the Hide/Show-panel toggle). The
> unsaved indicator is NOT re-added as a CanvasEditor `badge=` pill in the screen sub-toolbar —
> `CustomScreenShell` already renders the status + "Unsaved changes" pill in the PageHeader region
> (so the `Badge` import is deleted in the list-removal step below). Move the per-block category
> buttons (via the REUSED `ScreenPanelToggleRail`, relocated from the sub-toolbar), the per-block
> action cluster (move/duplicate/delete, `ScreenAuthoringCanvas.tsx:394-432`), AND the command-
> palette Search trigger (`:434-442`) INTO the panel head (per the head-row spec above) so the
> right rail owns block navigation + block actions + search exactly like Pages, leaving the
> sub-toolbar with ONLY the Hide/Show-panel toggle. Stripping the sub-toolbar must NOT DELETE these
> controls — they are RELOCATED into the head (onMove/onDuplicate/onDelete + the
> AuthoringCommandPalette `commandOpen` flow stay wired), so block reorder/duplicate/delete + search
> stay reachable.

### A5 — entry-dock slim presentation toolbar (`CustomScreenEntryEditor.tsx`) — RESTYLE, do NOT drop the override editor

**Reconcile-lens WARNING — the bottom dock is NOT a look-only card.** The entry editor's
bottom-dock `presentationPanel` (`CustomScreenEntryEditor.tsx:915-1086`) is the fully-wired,
shipped **presentation-OVERRIDE editing surface** (TASK-496-02): it edits per-record per-block
**Text size / Emphasis / Tone** (`data-presentation-control="textSize|textEmphasis|tone"`,
`:986/:1012/:1038`) + a **Media override** (`data-presentation-control="mediaAssetId"`, `:1069`)
via `handleSelectedPresentationChange → draftOverrides`, and persists them through the
**Save / Reload / Clear selected presentation** handlers (`handleSavePresentation` `:943`,
`handleReloadPresentation` `:956`, `handleClearSelectedPresentation` `:967`) to the presentation
save endpoint. The prototype's bottom toolbar (`CustomScreenEntryEditorPreview.tsx:242-284`) is a
**decorative** `Aa` + Bold/Italic/Underline/Strikethrough + Heading/List/Link + color-swatch +
Align row with **NO handlers** — a DIFFERENT capability (inline text formatting). A wholesale
"replace with the prototype toolbar" would (a) DROP the shipped presentation-override editing, (b)
ORPHAN a large block of state/handlers (`draftOverrides` consumers, `handleSavePresentation`/
`Reload`/`ClearSelectedPresentation`, `presentationText*Options`, `presentationToneOptions`,
`selectedTextSize`/`selectedTextEmphasis`/`selectedTone`/`selectedMediaAssetId`,
`isPresentationSaving`, `presentationError`, `selectedPresentationOverrideCount`) →
`@typescript-eslint/no-unused-vars` → the leaf's required `bun --cwd core lint` FAILS, and (c)
turn RED the 5 `custom-screen-record-interactions.test.tsx` tests that hard-assert the panel + its
controls. That is the reconcile defect the Posts lesson warns against — a shipped capability
silently dropped.

**What to do (owner rule: adapt/extend the LOOK, drop NOTHING).** Adopt the prototype's slim
bottom-docked toolbar **LOOK** — a single compact inline row docked via
`CanvasEditor panelPosition="bottom"` — but keep it wired to the **REAL** presentation-override
controls. Restyle the tall `rounded-2xl border … p-4 shadow-soft` card (`:917-1086`) into one slim
inline `flex items-center gap-1 … py-1.5` toolbar row (prototype `:243` shape) that hosts, left to
right: the selected-block label chip + a compact **Text size**, **Emphasis**, **Tone** control
group (the existing 3 Selects, restyled small/inline — segmented or compact `Select`, not a
3-column grid card) + the **Media override** control (kept, shown only when
`selectedPresentationTarget.mediaField`) + a divider + the **Save presentation** / **Reload
presentation** / **Clear selected presentation** buttons (kept, restyled to `icon-sm`/`ghost`
prototype density). Do **NOT** port the prototype's decorative `Bold/Italic/Underline/Strikethrough/
Heading/List/Link/Align` no-op marks — they have no backing in the custom-screen model and adding
non-functional controls violates the real-input rule (they are the exact fabricated affordances the
entry-restyle guard `custom-screen-entry-editor-restyle.test.tsx:20-25` de-fabricates); the REAL
analog of "text formatting" here IS the Text-size/Emphasis/Tone override group, so wire the look to
those.

**Fate of every symbol — KEPT (nothing orphaned).** Keep `presentationPanel` and every hook it
consumes: the `data-custom-screen-entry-presentation-panel="true"` container (`:919`), all four
`data-presentation-control` hooks (`:986/:1012/:1038/:1069`), the "Save presentation" / "Reload
presentation" / "Clear selected presentation" buttons + their handlers, the
`presentationTextSizeOptions`/`presentationTextEmphasisOptions`/`presentationToneOptions`,
`selectedTextSize`/`selectedTextEmphasis`/`selectedTone`/`selectedMediaAssetId`,
`isPresentationSaving`, `presentationError`, and `selectedPresentationOverrideCount` — only the
wrapper CLASSES change (card → slim toolbar row). `panelPosition="bottom"`, `panel={presentationPanel}`,
`panelOpen`/`onPanelOpenChange`, `panelDataProps={{ "data-screen-editor-panel": "true" }}`, and the
`presentationOverrides={draftOverrides}` render prop (`:1241`) all stay wired, so the persisted
overrides keep RENDERING on the canvas and the save round-trip is intact. Because every symbol +
data hook + button label is retained, `lint`/`lint:types` stay green and the 5
`custom-screen-record-interactions.test.tsx` tests + the `custom-screen-entry-editor-restyle`
presentation guard stay green with NO test re-point.

**Real-input guard (memory [[page-editor-color-toolbar-live-findings]]):** do NOT add a panel-wide
`onMouseDown`/`onPointerDown` `preventDefault` — keep the Select controls, media picker, and any
swatch focusable + live-updating with a real mouse + keyboard.

### A6 — minor look (`ScreenAuthoringCanvas.tsx`)

- Add the dashed in-canvas "Add section" affordance below the sections (prototype
  `:223-228`): a full-width `rounded-2xl border border-dashed` button calling the existing
  add-section path (or `onAddBlock` default-section creation), placed inside the
  `data-screen-authoring-canvas` container.
- Tighten the canvas width from `max-w-4xl` (`:467`) to `max-w-2xl` to match the prototype.
- Ensure the panel has a title bar ("Header section"-style) via the in-panel head row above.
- Keep ALL `data-*` hooks (`data-screen-editor-canvas-scroller`,
  `data-screen-authoring-canvas`, `data-screen-editor-panel`, `data-screen-block-id`,
  `data-screen-block-type`, `data-screen-section-id`, `data-selected`,
  `data-screen-toolbar-rail`) intact — tests + the runtime rely on them; restyle classes only,
  rename none. In particular `data-screen-toolbar-rail="true"` (emitted by
  `ScreenPanelToggleRail.tsx:29`) is asserted by FOUR suites
  (`custom-screen-editor-restyle.test.tsx:99`, `custom-screens-page.test.tsx:88` and `:213`,
  `custom-screen-list-view-canvas.test.tsx:204`); A4 RELOCATES + restyles that same
  `ScreenPanelToggleRail` into the panel head, so the relocated/restyled rail MUST still emit
  `data-screen-toolbar-rail="true"` (do NOT drop the attribute during the "restyle in place" — it
  rides the reused component and those four kept assertions depend on it).

### Owner refinement — remove the List-view editor surface (`CustomScreenEditorPage.tsx`)

Non-destructively drop the List/Editor view editor from this screen:

```tsx
// core/admin/ui/custom-screens/CustomScreenEditorPage.tsx
// 1. Remove the List/Editor segmented toggle from screenPageHeader (`:874-911`) and the
//    sm:hidden toggle button. The header keeps Preview + Save only.
// 2. Remove the `activeBuilderTab === "list-view"` branch (the CanvasEditor with
//    ListViewCanvas, `:996-1040`); always render the entry-view <ScreenAuthoringCanvas>
//    branch (`:1041-1072`).
// 3. Drop the now-dead list-editor state/handlers AND every symbol they leave unused, so
//    `bun --cwd core lint` + `lint:types` stay green (@typescript-eslint/no-unused-vars).
//    This removal is gate-complete — delete ALL of the following from CustomScreenEditorPage.tsx:
//    State/memos/handlers:
//      - activeBuilderTab/setActiveBuilderTab (`:197`)
//      - activeListPanel/setActiveListPanel (`:200`)
//      - selectedListColumnId/setSelectedListColumnId (`:201`) + selectedListColumn memo (`:219`).
//        ALSO remove the `setSelectedListColumnId(nextDefinition.listView.columns[0]?.id ?? null)`
//        call inside the KEPT `applyScreen` load handler (`:340`): deleting the state declaration
//        without removing this use-site leaves a dangling `setSelectedListColumnId` reference and
//        fails `lint:types` ("Cannot find name 'setSelectedListColumnId'"). The other
//        setSelectedListColumnId calls (`:321`/`:553`/`:604`/`:776`/`:1032`) all live INSIDE the
//        list-editor handlers/branch deleted above, so they go with them.
//      - availableListFieldOptions memo (`:223`)
//      - updateListView (`:314`), handleAddListColumn (`:547`), handleMoveListColumn (`:556`),
//        the list column patch/remove handlers (`:586-600` region)
//      - renderActiveListPanel (`:807`), listToolbarPanels (`:816`), and the
//        libraryPanel/listColumnPanel/listSettingsPanel/hiddenColumnsPanel builders
//      - the ListViewAuthoringPanel type alias (`:83`)
//    Now-orphaned IMPORTS (must also be deleted — the FILES stay on disk, only these import
//    statements in CustomScreenEditorPage.tsx go):
//      - the four ListView* component imports (`:48-51`): ListViewDesigner, ListViewCanvas,
//        ListViewColumnInspector, ListViewElementLibrary
//      - the three customScreenListModel imports (`:71-73`): buildListColumnFromOption,
//        getVisibleListColumns, listSelectableListFields
//      - the four orphaned lucide icons on line `:1`: Columns3, EyeOff, Settings2, ListPlus
//        (KEEP Eye [Preview button :918], Save [:927], SlidersHorizontal [Show-panel :945,:957])
//      - the `ScreenPanelToggleRail` import (`:56`) — its ONLY consumer is the removed list branch
//        (`<ScreenPanelToggleRail panels={listToolbarPanels} />` :1009); the entry-view builder owns
//        its OWN toggle rail inside ScreenAuthoringCanvas, so this CustomScreenEditorPage import orphans.
//      - the `Badge` import (`:5`) — its ONLY consumer is the removed list branch's CanvasEditor
//        `badge={hasUnsavedChanges ? <Badge>Unsaved</Badge> : null}` pill (`:1001-1005`). Deleting it
//        does NOT drop the unsaved indicator from the UI: `CustomScreenShell`
//        (`hasUnsavedChanges={hasUnsavedChanges}` :967) already renders the status Badge + "Unsaved
//        changes" pill in the PageHeader region (CustomScreenShell.tsx:47-55) for the entry-view
//        branch, so the entry-view sub-toolbar does NOT re-add a separate Unsaved pill.
//    KEEP `screenSettingsPanel` (still passed to ScreenAuthoringCanvas `settingsPanel=` and
//    reachable via the builder Settings panel) and `updateDefinition`/`definition` (still used
//    by the editor-view path + handleSave).
//    GATE-COMPLETE RE-AFFIRM: after the above deletions (state + memos + handlers, the four
//    ListView* imports, the three customScreenListModel imports, ScreenPanelToggleRail, Badge,
//    the four lucide icons, the ListViewAuthoringPanel type, AND the applyScreen:340 use-site) NO
//    deleted symbol is still referenced and NO surviving symbol is left unused — `lint` +
//    `lint:types` pass with no @typescript-eslint/no-unused-vars or "Cannot find name" error.
// 4. CustomScreenWorkspacePreviewDialog: pass a fixed mode="editor-view" (was
//    mode={activeBuilderTab}, `:1078`). NOTE — the dialog gates its published-list preview on
//    `mode === "list-view"` (`CustomScreenWorkspacePreviewDialog.tsx:102-115`), so pinning
//    mode="editor-view" ALSO removes the published-list PREVIEW from this surface (consistent
//    with relocating list editing + preview later). `listView` is still passed ONLY to keep
//    the prop shape + save round-trip intact — NOT because the dialog will render it. The
//    dialog's now-unreachable `mode === "list-view"` branch (and its
//    CustomScreenEntriesTable/buildCustomScreenPreviewEntries references) stays in place
//    untouched (dead-but-statically-referenced, so no unused-import in the dialog).
// 5. DO NOT delete ListViewCanvas.tsx / ListViewDesigner.tsx / ListViewColumnInspector.tsx
//    / ListViewElementLibrary.tsx — leave the FILES in place (dead-in-this-surface,
//    relocatable later). Removing their IMPORTS in CustomScreenEditorPage.tsx (step 3) is
//    NOT deleting the files. DO NOT touch definition.listView in load/save: handleSave still
//    persists the whole definition (listView + editorView) so stored list config round-trips
//    unchanged.
// 6. DEAD-CODE GUARD RECONCILIATION (tests/vitest/ui/editor-surface-dead-code.test.ts).
//    Removing the four ListView* imports (step 3) leaves ListViewDesigner.tsx /
//    ListViewColumnInspector.tsx / ListViewElementLibrary.tsx with ZERO importers across BOTH
//    core AND tests (their ONLY importer was this file, :48/:50/:51), so the suite's Sweep 6 case
//    ("no editor-surface component is orphaned", :52-74) reports them as orphans and the gate
//    FAILS. Because step 5 KEEPS those files on disk (relocatable later), EXTEND the existing
//    Sweep 6 KEEP allowlist regex (:55-56, already allowlisting PageEditorPage|PageList|
//    PageRevisionDrawer) to ALSO allow ListViewDesigner|ListViewColumnInspector|
//    ListViewElementLibrary (retained-but-import-removed relocatable list-editor files). Do NOT
//    weaken the orphan assertion otherwise. ListViewCanvas.tsx is NOT orphaned (keeps the
//    CustomScreenWorkspacePreviewDialog `buildCustomScreenPreviewEntries` importer :22 + the
//    custom-screen-list-view-canvas test importer), and ScreenPanelToggleRail is NOT orphaned (A4
//    REUSES it for the in-panel category row, keeping its ScreenAuthoringCanvas importer :40), so
//    neither needs an allowlist entry. (This is a test-file RE-POINT in THIS leaf — named in the
//    Testing command + the Testing Requirements bullet below.)
```

**Data flow:** unchanged. The screen definition still loads via the existing read path
(`normalizeCustomScreenDefinitionForRead`) and saves via `handleSave` →
`normalizeCustomScreenDefinitionForWrite` with `definition.listView` intact. The builder
mutates `definition.editorView.document`/`bindings` only (existing
`addScreenBlock`/`updateScreenBlock`/`moveScreenBlock` ops). Panel open/close and selection
do not refetch or clear dirty state.

**Error handling:** keep the existing `error`/`remoteUpdatePending` Alert banners and the
`CustomScreenShell` wrapper; restyle to soft tokens only; add no new error states.

**Regression-test shape:** assert the builder renders corner-tag cards + a `{{ label }}`
token in builder mode (no live value, no Editable/Read/Unbound badge); assert the 9-chip
palette renders (and the ported local chip component is named `PaletteChip`, NOT `BlockChip` —
the dead-code guard below stays green); assert the right panel renders the consolidated rail body
with the in-panel hide-panel button + target label (Pages-parity) and the show/hide toggle still
flips `panelOpen`; assert the FOUR category icons (Settings / Insert / Layers / Inspect) render
with Settings ALWAYS-enabled and Inspect disabled when no block is selected, and that selecting
the Settings category opens `screenSettingsPanel` (screen-level settings stay reachable — guard
that its floatingPanel branch is NOT dead after the list removal); **assert block actions stay
REACHABLE after the sub-toolbar strip** — with a block selected, the panel HEAD renders the
move-up / move-down / duplicate / delete action cluster (aria-labels intact) and clicking them
fires `onMove`/`onDuplicate`/`onDelete`, the command-palette Search trigger is reachable from the
head, and the flattened inspector body does NOT render a SECOND move/dup/delete cluster
(`showBlockActions` stays `false`); assert the List/Editor toggle
is GONE and the list-view canvas does not render; assert `definition.listView` is still present
in the saved payload (load→save round-trip keeps columns/rowTemplate); assert all canvas
`data-*` hooks are intact.
Static/gate guard: `lint` + `lint:types` clean with no unused list-editor symbols (the four
`ListView*` imports, the three `customScreenListModel` imports, the `ScreenPanelToggleRail`
import, the `Badge` import, the `ListViewAuthoringPanel` type,
`updateListView`/`availableListFieldOptions`/`selectedListColumn` all deleted; the
`setSelectedListColumnId` call in the KEPT `applyScreen` handler [:340] removed alongside the
state declaration; the `Columns3`/`EyeOff`/`Settings2`/`ListPlus` icons all deleted); the
boundary suite stays green (no `ui/pages` import added for the rail parity); and the standing
dead-code guard `editor-surface-dead-code.test.ts` stays green — the ported local palette chip is
named `PaletteChip` (NOT `BlockChip`, so its "dead BlockChip export is gone" grep stays empty) and
its Sweep 6 KEEP regex is extended to allowlist the retained `ListViewDesigner`/
`ListViewColumnInspector`/`ListViewElementLibrary` files.

---

## Testing Requirements

- `bun --cwd core lint` (must be clean — no unused list-editor symbols after the removal)
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx tests/vitest/ui/custom-screen-binding-panel.test.tsx tests/vitest/ui/custom-screen-list-view-canvas.test.tsx tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui/custom-screen-authoring-boundary.test.ts tests/vitest/ui/editor-surface-dead-code.test.ts`
- **Boundary suite must stay green:** `tests/vitest/ui/custom-screen-authoring-boundary.test.ts`
  forbids `@/ui/pages` / `ui/pages/builder` (+ widget-runtime) imports from the custom-screens
  modules (`:53-75`). Achieving Pages-rail parity by re-creating the railBody markup locally
  (NOT importing the Pages rail) keeps this suite green; do not add any `ui/pages` import.
- **Re-point the standing dead-code guard `tests/vitest/ui/editor-surface-dead-code.test.ts`
  (named in the per-leaf command above — surfaces both breaks at the leaf, not only 498-04's
  full-dir run):** this leaf trips it in TWO independent places.
  - **(1) "the dead BlockChip export is gone" (`:30-31`)** asserts the literal symbol `BlockChip`
    appears NOWHERE under `core/`. A1 adds a local palette chip to `ScreenBlockLibrary.tsx`. Keep
    this case GREEN by naming that component **`PaletteChip`** (no `BlockChip` substring) — NO test
    edit is needed for this case (do NOT name it `BlockChip`/`ScreenBlockChip`, which both contain
    the guarded substring).
  - **(2) "no editor-surface component is orphaned … Sweep 6" (`:52-74`)** fails because removing
    the four ListView* imports from `CustomScreenEditorPage.tsx` (list-removal step 3) leaves
    `ListViewDesigner`/`ListViewColumnInspector`/`ListViewElementLibrary` with 0 core + 0 test
    importers while step 5 KEEPS the files on disk. EXTEND the Sweep 6 KEEP allowlist regex
    (`:55-56`, already allowlisting `PageEditorPage|PageList|PageRevisionDrawer`) to ALSO allow
    `ListViewDesigner|ListViewColumnInspector|ListViewElementLibrary` (relocatable-later list-editor
    files) — rewrite, do NOT weaken the orphan assertion. `ListViewCanvas` is NOT orphaned (keeps
    the preview-dialog `buildCustomScreenPreviewEntries` importer + its test) and
    `ScreenPanelToggleRail` is NOT orphaned (A4 reuses it for the in-panel category row), so neither
    needs an allowlist entry.
- **Re-point the two suites that assert the REMOVED List/Editor toggle (rewrite, do not
  weaken):**
  - `tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx` — the test "renders
    the soft segmented view control and the floating-panel canvas" (`:84-102`, asserts
    `"List View"`/`"Editor View"`/`aria-pressed`) and "switching to the Editor View tab
    reveals the entry-view authoring canvas" (`:104-119`) must be rewritten for the always-on
    entry-view builder: assert NO List/Editor segmented control (`expect(html).not.toContain
    ("Editor View")`), and that `[data-screen-authoring-canvas="true"]` is present on initial
    render WITHOUT clicking any tab. Keep the Save/Preview/Hide-panel/PageHeader assertions.
  - `tests/vitest/ui/custom-screen-list-view-canvas.test.tsx` — the test "custom screen List
    View editor renders the shared canvas chrome without editor rails" (`:195-210`) targets the
    REMOVED list-view editor surface; rewrite it to assert the list-view editor canvas does NOT
    render — but assert the LIST-ONLY markers absent: KEEP `not.toContain("Selected Column")`
    (`:209`, the list column-inspector copy) and may add `not.toContain('data-selected-column')`
    (the underlying list column-selection hook). **Do NOT assert the shared toolbar rail absent:**
    the always-on entry-view builder REUSES `ScreenPanelToggleRail`, which emits the SAME
    `data-screen-toolbar-rail="true"` hook (`:204`, A4/A6), so that assertion STAYS green and must
    be KEPT, not flipped to `not.toContain`. Also KEEP `data-screen-editor-canvas-scroller="true"`
    (`:203`) + "Hide panel" (`:205`, the shared shell chrome) and assert the always-on entry-view
    builder renders instead (`[data-screen-authoring-canvas="true"]` present). Update/rename the
    suite if its scope is now solely "list-view editor absent".
  - `tests/vitest/ui/custom-screens-page.test.tsx` — this suite renders `CustomScreenEditorPage`
    (`:5`) and hard-asserts the REMOVED strings `"List View"`/`"Editor View"` (`:84-85, :112-113,
    :210`) and `"Select a content type before configuring List View."` (`:92`) across four tests
    ("renders builder controls in create mode" `:78`, "renders builder canvas and save action"
    `:106`, "tolerates cached stale screen bindings on read" `:119`, and the `:204` render).
    Those `toContain` assertions FAIL once the toggle + list-view copy are removed (and would turn
    the full `tests/vitest/ui` gate in 498-04 red). **The "renders builder controls in create mode"
    test (`:78`) ALSO hard-asserts TWO list-only panel aria-labels that break with the SAME
    removal — `aria-label="List settings"` (`:90`) and `aria-label="Screen settings"` (`:91`).**
    Both are emitted ONLY by the deleted `listToolbarPanels` (CustomScreenEditorPage.tsx
    `label:"List settings"` :835, `label:"Screen settings"` :851 → ScreenPanelToggleRail.tsx:38
    `aria-label={panel.label}`). The default `activeBuilderTab` is `"list-view"`
    (CustomScreenEditorPage.tsx:197-199), so today an un-clicked `renderAdminUi` renders the
    list-view branch and emits those two labels; after the removal the always-on entry-view
    `ScreenAuthoringCanvas` rail emits Settings/Insert/Layers/Inspect, whose retained Settings
    category is `label:"Settings"` (ScreenAuthoringCanvas.tsx:282) → `aria-label="Settings"`, so
    NEITHER "List settings" NOR "Screen settings" renders any more. Re-point: DROP the `"List View"`/
    `"Editor View"`/`"Select a content type before configuring List View."` assertions; **DROP
    `aria-label="List settings"` (`:90`) outright (no list-settings panel exists in the entry-view
    builder); and RE-POINT `aria-label="Screen settings"` (`:91`) to the entry-view rail's retained
    Settings category `aria-label="Settings"` (ScreenAuthoringCanvas.tsx:282 — which proves
    screen-level settings stay reachable, A4);** instead assert the always-on entry-view builder
    renders (`[data-screen-authoring-canvas="true"]` present on the initial `CustomScreenEditorPage`
    render, no tab click); KEEP the Save/Preview/PageHeader, the `data-screen-toolbar-rail="true"`
    (`:88, :213` — the REUSED rail still emits it, see A4/A6), the `not.toContain("Selected Column")`
    (`:94, :214`), and the stale-binding-tolerance assertions. **Do NOT read "KEEP the create-mode
    assertions" as keeping `:90-91` as-is:** "Screen settings" looks like a keep (screen settings DO
    stay reachable), but its exact label string changes to "Settings", so the literal
    `aria-label="Screen settings"` assertion goes RED and must be re-pointed; both `:90` and `:91`
    break alongside the three enumerated strings.
  - `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx` — this suite renders
    `CustomScreenEditorPage` (`:9`) and in three tests reveals the block library by clicking the
    soon-removed toggle via `findButton(container, "Editor View")?.dispatchEvent(...)` (`:162,
    :240, :274`); the titles are "Editor View library exposes…" / "Editor View keeps legacy
    blocks…" / "Editor View field library stays empty…" (`:155, :191, :262`). After removal
    `findButton(...,"Editor View")` returns `undefined` and the click no-ops, so the tests then
    pass-by-luck or fail on the always-on library. Re-point: REMOVE the `"Editor View"`
    findButton/click (the builder is always-on — there is no tab to switch), assert the library
    renders WITHOUT the click (keep the subsequent Insert-panel `findButtonByLabel("Insert")`
    open + the `[data-screen-editor-panel]` / `toContain("Screen Blocks")` / no-page-widget
    assertions), and rename the "Editor View …" titles to the always-on entry-view builder.
    **Also re-point the POSITIVE palette-LABEL assertions, not just the toggle click** (this is
    load-bearing — the A1 palette swap, NOT the toggle removal, breaks them): A1 replaces
    `ScreenBlockLibrary`'s current 4-item labels `"Record header"`/`"Field group"`/`"Two columns"`
    (`ScreenBlockLibrary.tsx:21/27/33`) with the 9-chip `BlockChip` labels (Heading/Text/Field/
    Stat/Divider/Image/Related list/Tabs/Button — the chip labels render as static text regardless
    of which kinds 498-02 has wired yet), so `toContain("Record header")` (`:180, :255, :288`),
    `toContain("Field group")` (`:181`) and `toContain("Two columns")` (`:182`) all turn RED after
    A1. Replace those positive assertions with new chip labels actually rendered (e.g.
    `toContain("Heading")` / `toContain("Field")` / `toContain("Stat")` / `toContain("Related list")`);
    DROP `"Field group"`/`"Two columns"` outright — `field-group`/`columns` have NO replacement chip
    in the 9-chip palette, so they must NOT be renamed-to-something, just removed. **DROP
    `toContain("Title")` (`:183`) too** — A1 DELETES the per-field "Fields" list (the 9-chip grid is
    the sole insert surface; a field's specific bound field is chosen via the Bound-field `Select` in
    the Inspect inspector, not a per-field palette list), so no individual schema-field label (e.g.
    "Title") renders in the palette any more; re-point it to a rendered chip label (e.g.
    `toContain("Field")`, already added above) instead of the removed field list. KEEP
    the `not.toContain("Hero")` (`:184`) / `not.toContain("Feature Grid")` (`:185,
    :256, :289`) page-widget exclusions (none of the new chip labels contains "Hero"/"Feature Grid";
    the lowercase `toContain("hero")` legacy-block CANVAS assertion at `:254` is about the rendered
    legacy block, not the palette, and is unaffected). State explicitly that the palette label set
    changes in A1 so this suite — named in this leaf's Testing command (`:318`) and re-run in
    498-04's full `tests/vitest/ui-integration` gate — stays green.
- **Re-point the two suites that render `ScreenBlockInspector` DIRECTLY and assert the FLATTENED-AWAY
  "Interaction" row / "Advanced style" modal (rewrite, do not weaken — these break on the A4 flatten,
  NOT the list removal):**
  - `tests/vitest/ui/custom-screen-binding-panel.test.tsx` — `renderInspector` (`:48-67`) mounts
    `ScreenBlockInspector` with `panel="binding"` (`:58`), and the test "renders bound-field +
    interaction controls" hard-asserts `toContain("Bound field")` AND `toContain("Interaction")`
    (`:104-105`). A4 DROPS the "Interaction" mode row and collapses the `panel` sub-values. Re-point:
    switch `renderInspector` to `panel="all"` (`:58`); rename the test to "renders the bound-field
    control"; KEEP `toContain("Bound field")` (`:104`) and the `querySelector('[role="combobox"]')
    not null` onPatchBinding coverage (`:107`); DROP the `toContain("Interaction")` assertion
    (`:105`). In the dedup test (`:113-156`), target the Bound-field `Select` SPECIFICALLY (e.g. via
    a stable data hook on the Bound-field row) instead of the first `[role="combobox"]` — under
    `panel="all"` the flat inspector renders multiple Selects (Layout/Spacing) so the first combobox
    is no longer the Bound-field one; KEEP the system-vs-schema dedup assertions (`:148-152`)
    unchanged. Binding-MODE coverage (display kind → read) is NOT lost — it moves to the behavioral
    assertion owned by 498-02 B4 (mode-via-`onPatchBinding`).
  - `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx` — the test
    "ScreenBlockInspector opens advanced style controls in a modal" (`:122-160`) mounts
    `ScreenBlockInspector` with `panel="style"` (`:133`) and hard-asserts `toContain("Advanced
    style")` (`:145`), the "Open style controls" trigger (`:151`) and `[data-screen-style-dialog=
    "true"]` (`:155`). A4 DROPS the style MODAL (variant edited INLINE in the Background row).
    Re-point: rewrite this test for the flattened inspector — mount with `panel="all"`; DROP the
    "Advanced style"/"Open style controls"/style-dialog assertions; instead assert the flat inspector
    edits `variant` INLINE with NO modal (e.g. `querySelector('[data-screen-style-dialog]')` is null
    and the inline variant / Background row renders). The file's FIRST test ("retired screen widgets
    do not expose legacy binding jump controls" `:111-120`) is unrelated and stays unchanged. Do not
    weaken binding coverage. Both suites are named in this leaf's Testing command (`:318`) and re-run
    in 498-02 (`:308`) + 498-04's full `tests/vitest/ui` + `tests/vitest/ui-integration` gates.
- **Presentation-override guard stays green with NO re-point (A5 restyle keeps the capability):**
  `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx` (added to the leaf
  command above) has 5 tests that hard-assert the presentation-override editor —
  `[data-custom-screen-entry-presentation-panel]` (`:420, :541`), the "Save presentation" /
  "Reload presentation" / "Clear selected presentation" buttons (`:424, :431, :465, :481, :516`),
  and `[data-presentation-control="mediaAssetId"]` (`:557, :567`). A5 RESTYLES the bottom dock's
  card into the slim prototype toolbar but KEEPS every one of those hooks + button labels + handlers
  wired (nothing dropped/orphaned), so these tests + the `custom-screen-entry-editor-restyle`
  presentation guard (`:20-25`, which already de-fabricates the prototype's decorative mark toolbar)
  stay green WITHOUT edits. Do NOT drop the presentation editor or replace it with the prototype's
  no-op Bold/Italic/Underline marks — that would break this suite AND `lint` (orphaned override
  state/handlers).
- All other `tests/vitest/ui*/custom-screen*` suites must stay green (update, do not
  weaken, any assertion that targeted the removed List/Editor toggle — re-point it to the
  always-on entry-view builder; keep the `definition.listView` round-trip assertions).
- Real-input verification (manual / `playwright-cli` on `http://coderso-a.localhost:5173/admin/`
  per MEMORY) of the restyled slim entry-dock presentation toolbar: change Text size / Emphasis /
  Tone, set a Media override, and Save/Reload/Clear presentation with a real mouse + keyboard and
  confirm the override live-updates the canvas — guarding the `page-editor-color-toolbar-live-findings`
  regression (no panel-wide `preventDefault`).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-498** + **TASK-498-01**, noting
  the List-view editor surface was removed non-destructively (model/runtime retained) and
  the right rail was brought to Pages parity.
- A pure look + surface-scoping change should need no contract-doc edit; state explicitly in
  the changelog if one was required.
