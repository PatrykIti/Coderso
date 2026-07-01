# TASK-499-03: Menu Design Tab — Shared-Shell Editor
# FileName: TASK-499-03-Menu-Design-Tab-Shared-Shell-Editor.md

**Priority:** High
**Category:** Admin UI / Content (Menus) / Page Builder / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-499-02 (menuDocumentV2), TASK-496-01 (`CanvasEditor` shared shell), TASK-479 (control primitives)
**Status:** ⏳ To Do
**Parent Task:** TASK-499

---

## Overview

Flip the "Design" tab (`/menus/:id/design`) off the legacy dark bottom-panel
chrome onto the shared `CanvasEditor` builder shell, replacing the `PageEditor`
menu host with a **thin `MenuDesignEditor`** that edits `menuDocumentV2` directly:
a dotted canvas rendering the `menu-bar` + blocks with click-to-select, a single
floating control panel that swaps menu control primitives per selected block, an
"Add block" rail of menu-adapted blocks, and the existing menu Save/Publish
lifecycle. The keystone is the `nav-items` "positions" block that BINDS the
published item tree (with nesting) — never duplicating item data.

- **Goal:** `core/admin/ui/menus/MenuDesignEditor.tsx` (new) renders the IDENTICAL
  shell chrome + the SAME floating control primitives as Pages, over
  `menuDocumentV2`; `MenuDesignEditorPage.tsx` renders it instead of hosting
  `PageEditor`; `PageEditor.tsx`'s `mode === "menu"` legacy-chrome branch is retired.
- **Owning modules:** `core/admin/ui/menus/{MenuDesignEditor,MenuDesignEditorPage}.tsx`,
  `core/admin/ui/shared/CanvasEditor.tsx` (consumed, not changed),
  `core/admin/ui/pages/editorControls/*` (consumed),
  `core/admin/services/menusClient.ts` (extend `updateMenu` input with
  `document?: unknown` — the PATCH body forwarder; `:204-214` has no `document`
  today),
  `core/admin/ui/pages/PageEditor.tsx` (retire the menu branch) +
  `core/admin/ui/pages/editor/pageEditorHostContract.ts` (drop `"menu"` from the
  `mode` union, `:178`).
- **Out of scope:** the front renderer + default fallback (TASK-499-04); any new
  control-primitive (reuse `ColorSwatchControl`/`SegmentedControl`/`SliderControl`/
  `ToggleSwitch`/`MediaPickerControl`).

### Decision — thin editor on the shared shell (lower risk)

See the board's "how the Design tab gets a Pages-identical editor" decision.
**A thin `MenuDesignEditor` reusing `CanvasEditor.tsx` + `editorControls/*`**, NOT
generalizing `PageEditor` over a document contract. Rationale (one paragraph):
`PageEditor.tsx` (~4.9k lines, binary to `rg`) is statically bound to
`pageDocumentV2` — the page block/section enums, capability/prop/default tables,
the per-`PageBlockType` registry control panels, inline rich-text marks, runtime
preview tokens, command palette, layers, and autosave. Generalizing it over
`menuDocumentV2` (disjoint enums) is a cross-cutting refactor that risks the
entire Pages editor. `CanvasEditor.tsx` is ALREADY a presentational, host-agnostic
shell (`CanvasEditor.tsx:5-30,99-160`) and `editorControls/*` are presentation-only;
a menu document is small and shallow, so the thin editor is far less code and its
regressions cannot reach Pages. It delivers a Pages-identical UX by reusing the
SAME chrome + the SAME controls (the menu appearance panel ALREADY proves this
pattern: `MenuAppearancePanel.tsx:16-21` consumes the shared `editorControls`).

---

## Security Contract

No new endpoint, route, or RBAC change. Save/Publish ride the EXISTING menu
client (`updateMenu` / `publishMenu`); the draft persists via
`UpdateMenuInput.document` (TASK-499-02) through `PATCH /menus/:id`. Menus issue
no preview tokens — the live canvas IS the preview (consistent with the current
host, `MenuDesignEditorPage.tsx:36-47`). The editor writes only the validated
`menuDocumentV2` (strict normalizer rejects unknown at the write boundary); item
data is read-only here (the structure editor owns it). Retiring the
`mode === "menu"` branch removes the legacy dark-chrome path with no impact on
the page / page-template hosts (the menu host is its only consumer).

---

## Implementation Pseudocode

### 1. `MenuDesignEditor.tsx` — thin editor over the shared shell

```tsx
// core/admin/ui/menus/MenuDesignEditor.tsx
// State: the menuDocumentV2 draft + selection + panelOpen + the menu lifecycle.
export function MenuDesignEditor({ menuId }: { menuId: string }) {
  const initial = getCachedMenuDetail(menuId);
  const [doc, setDoc] = useState<MenuDocumentV2>(() =>
    resolveStoredMenuDocument(initial?.menu.settings)                   // 1) existing draft document
    ?? buildMenuDocumentV2FromLegacy(                                   // 2) seed-from-legacy, NOT written
         resolveStoredMenuAppearance(initial?.menu.settings),          //    (returns null for a FRESH menu —
         resolveStoredMenuNavExtras(initial?.menu.settings))           //    appearance===null AND extras empty —
    ?? createDefaultMenuDocumentV2());                                  // 3) so the chain reaches the default
  // FRESH-MENU SEED CONTRACT (shared with TASK-499-02 §4): a brand-new menu has no
  // stored document and no legacy content, so steps 1+2 are null and the seed is
  // createDefaultMenuDocumentV2() = menu-bar ⊃ [brand(text), nav-items, cta-button?].
  // This is why buildMenuDocumentV2FromLegacy is typed `MenuDocumentV2 | null`; a
  // non-null adapter would make step 3 dead code and seed a fresh Design with NO
  // brand(text) block, failing the seed-default test below.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<PageBreakpoint>("desktop");
  const [panelOpen, setPanelOpen] = useState(true);                    // lazy-init; host owns it (CanvasEditor is controlled read-only)
  const [isDirty, setIsDirty] = useState(false);
  const [items, setItems] = useState<NavigationItem[]>([]);            // published item tree, for nav-items binding

  // load the menu's items (cache-first) + page slugs to bind nav-items preview
  useEffect(() => { /* getMenuWithItemsCached + listPagesCached ->
    mapMenuNodesToNavigationItems(detail.items, pagePathById, {includeDefaultTarget:true}) */ }, [menuId]);

  const updateDoc = (fn: (d: MenuDocumentV2) => MenuDocumentV2) => { setDoc(fn); setIsDirty(true); };
  const selectedBlock = findMenuBlock(doc, selectedId);

  // Block composition — a real composer, not add-only (mirrors the page editor's
  // section/block add/remove/reorder). All go through updateDoc (dirty + same Save).
  const addMenuBlock = (type: MenuBlockType) =>
    updateDoc((d) => insertMenuBlock(d, createDefaultMenuBlock(type)));       // append to menu-bar
  const removeMenuBlock = (id: string) => {
    updateDoc((d) => deleteMenuBlock(d, id));
    if (selectedId === id) setSelectedId(null);                              // clear stale selection
  };
  const moveMenuBlock = (id: string, dir: "up" | "down") =>
    updateDoc((d) => reorderMenuBlock(d, id, dir));                          // intra-menu-bar reorder

  const save = async () => { await updateMenu(menuId, { document: doc }); setIsDirty(false); };
  const publish = async () => { await updateMenu(menuId, { document: doc }); await publishMenu(menuId); setIsDirty(false); };

  return (
    <CanvasEditor
      header={<PageHeader title={initial?.menu.name ?? "Menu design"}
                breadcrumbs={["Content","Menus", name, "Design"]}
                actions={<>{/* Structure tab link (navigate `/menus/${id}`) + Discard + Save + Publish — real handlers */}</>} />}
      title="Menu builder"
      badge={isDirty ? <Badge variant="warning">Unsaved</Badge> : null}
      toolbar={/* DeviceSwitcher(setDevice) + Hide/Show panel toggle (setPanelOpen) */}
      deviceContext={{ value: device, label: deviceLabel(device) }}
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}                                  // required prop; shell reads only
      panelPosition="right"
      reopenAffordance={<ShowPanelChip onClick={() => setPanelOpen(true)} />}
      canvas={
        <div data-menu-design-canvas-scroller className="h-full overflow-auto bg-dotted p-6 lg:p-8"
             onClick={() => setSelectedId(null)}>
          <MenuDocumentCanvas doc={doc} device={device} items={items}
            selectedId={selectedId} onSelect={setSelectedId} />        {/* §2 */}
        </div>
      }
      panel={selectedBlock
        ? <MenuBlockPanel block={selectedBlock} updateDoc={updateDoc}
            onRemove={() => removeMenuBlock(selectedBlock.id)}
            onMove={(dir) => moveMenuBlock(selectedBlock.id, dir)} />  {/* §3 per-block controls + remove/reorder */}
        : <MenuBarPanel section={doc.sections[0]} updateDoc={updateDoc}
            addBlock={addMenuBlock} removeBlock={removeMenuBlock} moveBlock={moveMenuBlock}
            onSelectBlock={setSelectedId} />}  {/* empty selection = bar + Add-block rail + block list w/ reorder/remove */}
    />
  );
}
```

- `panelOpen` is a single lazy-init flag; **NO sync setState in an effect**
  (ESLint react-hooks compliant). `CanvasEditor` is controlled read-only — it
  never calls `onPanelOpenChange`; the toolbar toggle + reopen chip flip the
  host's setter directly (`CanvasEditor.tsx:14-23,64-83`).
- Reuse the menu detail cache + refresh contract from the items editor
  (`getCachedMenuDetail` / `getMenuWithItemsCached`).

### 2. `MenuDocumentCanvas` — render menu-bar + blocks, click-to-select

```tsx
// Server-render-shaped preview using the SAME mapping the front will use, so the
// canvas matches production. Renders the menu-bar layout + each block; nav-items
// expands the live `items` with nesting (reuse SiteNavItem semantics or a 1:1
// admin mirror). Each block is wrapped in a selectable frame:
function SelectableBlock({ id, selected, onSelect, children }) {
  return <div data-menu-block-id={id} onClick={(e) => { e.stopPropagation(); onSelect(id); }}
    className={cn("rounded-lg", selected && "ring-2 ring-primary")}>{children}</div>;
}
// Styling comes from the menu-bar layout (reuse buildSiteShellPreviewCss-style
// CSS over the document's menu-bar layout — see TASK-499-04's menuDocumentCss).
```

The canvas binds `nav-items` to the published `items` (read-only) — the same data
the front renders, so empty-vs-custom parity is visible while authoring. Clicking
a block selects it (innermost wins via `stopPropagation`); clicking the dotted
backdrop clears selection (matches the page editor's `selectSection(null)`).

### 3. Per-block control panels — reuse `editorControls/*`

```tsx
// MenuBarPanel  — menu-bar layout = MenuAppearance surface subset; reuse the
//   MenuAppearancePanel control set (ColorSwatch surface/border, Segmented
//   alignment/shadow, Slider paddingX/Y/borderWidth, ToggleSwitch sticky) but
//   writing into doc.sections[0].layout instead of settings.menuAppearance.
//   Plus an "Add block" rail: nav-items / brand / cta-button / divider / spacer
//   (and phase-2 search/account/language), each inserting a default block (addBlock).
//   Plus a "Blocks" LIST of the menu-bar's current blocks, each row with:
//     - click -> onSelectBlock(id)  (select to edit)
//     - up/down -> moveBlock(id, dir)  (intra-menu-bar reorder)
//     - remove (trash) -> removeBlock(id)
//   so the bar is a real COMPOSER (add + reorder + remove), matching the page
//   editor's section/block manipulation — not an add-only surface.
// MenuBlockPanel — header has Remove (onRemove) + Move up/down (onMove) for the
//   selected block; then switch(block.type):
//   "nav-items"  -> Slider itemGap/fontSize, Segmented fontWeight/textTransform/
//                   dropdownDirection/mobileMode, ColorSwatch link/hover/active
//   "brand"      -> Segmented mode(text|image), Input href, MediaPickerControl (image mode)
//   "cta-button" -> reuse the page button controls OR a minimal label/href/variant set
//   "divider"/"spacer" -> reuse the leaf controls
//   "search"/"account"/"language" -> minimal field sets (phase-2)
```

Block manipulation helpers (`insertMenuBlock` / `deleteMenuBlock` /
`reorderMenuBlock` + `createDefaultMenuBlock`) live in `menuDocumentV2.ts`
(TASK-499-02, pure functions over `doc.sections[0].blocks`); the editor only wires
them through `updateDoc`. `nav-items` may be add/remove/reorder like any block (the
front simply renders no `<nav>` if the document omits it — the default-fallback in
TASK-499-04 only triggers when the WHOLE document is empty, not when a single block
is absent).

All controls already exist in `core/admin/ui/pages/editorControls/index.ts`
(`ColorSwatchControl`, `SegmentedControl`, `SliderControl`, `ToggleSwitch`,
`MediaPickerControl`, …). The panel writes through `updateDoc`, so every edit
marks the draft dirty and rides the same Save/Publish discipline.

> **REAL-INPUT REGRESSION GUARD** (memory: *page-editor-color-toolbar-live-findings*):
> do NOT add a panel-wide `onMouseDown`/`preventDefault`. Per-swatch color, the
> brand/cta URL inputs, and segmented controls MUST stay focusable and
> live-updating with a real mouse + keyboard. Verify with playwright real input.

### 4. `MenuDesignEditorPage.tsx` — render the thin editor

```tsx
// Replace the PageEditor host (current :245-307) with:
export function MenuDesignEditorPage({ menuId }: { menuId?: string }) {
  const resolved = menuId ?? resolveDesignMenuId(window.location.pathname);
  return resolved ? <MenuDesignEditor key={resolved} menuId={resolved} /> : <MissingMenuState />;
}
// DELETE: toMenuDesignEditorDetail, MenuDesignCanvasChrome, the PageEditorHost,
// the menuDesignEditorPalette import, the appearancePanel/canvasChrome/renderSettings host wiring.
```

### 5. Retire the `mode === "menu"` legacy-chrome branch in `PageEditor.tsx`

```ts
// PageEditor.tsx:963 — `const useLegacyChrome = editorHost.mode === "menu";`
// Once MenuDesignEditorPage no longer hosts PageEditor, "menu" is an unreachable
// mode. Retire the branch:
//   - drop "menu" from PageEditorHost.mode union (pageEditorHostContract.ts:178)
//   - remove useLegacyChrome / panelTone "dark" / the bg-slate-950 legacy panel
//     path (:963-965, :3499-3543) — the builder chrome (CanvasEditor) becomes the
//     ONLY chrome; useBuilderChrome is always true.
//   - remove the now-dead host seams used ONLY by the menu host: `palette` and
//     `appearancePanel` (pageEditorHostContract.ts:213,215) — verified set ONLY by
//     MenuDesignEditorPage.tsx (no page / page-template host wires them). If a future
//     host needs `palette`, keep the type but drop the menu-only legacy chrome.
//   - RETAIN `canvasChrome` (pageEditorHostContract.ts:221) — it is a SHARED seam,
//     NOT menu-only: the page-template host sets it for the propagation banner
//     (PageTemplateEditorPage.tsx:246 `canvasChrome: () => <TemplatePropagationBanner/>`,
//     comment :242 "same seam the Menus editor uses") and page-templates-surface.test.tsx
//     (:229,:238) asserts it is a function + renders it. Dropping `canvasChrome` from
//     the host type would type-error lint:types AND red that suite. Keep it.
// AUDIT FIRST (board risk): grep all `editorHost.mode` / `useLegacyChrome` / seam
// (`palette` / `appearancePanel` / `canvasChrome`) setters before deleting; keep the
// change scoped so page + page-template suites stay green.
```

Stop using the legacy `menuDesignDocument.ts` adapter + `MenuAppearancePanel` as a
host panel ONCE 499-04's front fallback handles legacy menus (the legacy RENDER
path — `normalizeMenuAppearance` + `menuNavExtras` + `buildSiteShellCss` — STAYS
for back-compat; only the legacy AUTHORING host wiring is removed).

> **Do NOT delete `menuDesignDocument.ts`** — defer it as explicit dead code.
> `tests/vitest/services/menu-nav-extras.test.ts` still imports `buildMenuDesignDocument`
> / `menuDesignEditorPalette` / `collectMenuDesignExtras` / `resolveMenuDesignDraft`
> (`:4-10`) and exercises them in the `menu design document adapter` describe (`:104-154`)
> plus the `settings.menuAppearance document vehicle` describe (`:156-`). Deleting the
> file reds that whole suite — including its PRESERVED `normalizeMenuNavExtras` and
> `buildSiteShellPreviewCss` back-compat assertions, which 499-05 keeps green
> UNTOUCHED. Leave `menuDesignDocument.ts` in place (unreferenced by production once
> the menu host stops hosting `PageEditor`) and record it as a dead-code residual in
> the 499-05 closure follow-ups. `MenuAppearancePanel` has NO test dependency, so its
> host-panel wiring can be removed without impacting any suite.

**Error handling:** keep the menu load-failed + save-failed toasts (reuse the
items editor's `isApiClientError` handling); panel open/close and device switch
must not refetch or clear dirty state.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- New `tests/vitest/ui/menu-design-editor.test.tsx`:
  - renders the `CanvasEditor` builder shell (NOT the `bg-slate-950` legacy panel).
  - FRESH (empty) menu seeds `createDefaultMenuDocumentV2()` = menu-bar ⊃
    brand(text)/nav-items (the adapter returns `null` ⇒ chain reaches the default); a
    LEGACY menu seeds `buildMenuDocumentV2FromLegacy` (appearance ⇒ menu-bar layout +
    nav-items props; image extra ⇒ brand(image); button extra ⇒ cta-button). Both run
    WITHOUT writing until Save.
  - selecting a block opens its control panel; editing a control marks dirty and
    patches `menuDocumentV2`; Save calls `updateMenu({document})`; Publish calls
    `updateMenu` then `publishMenu`.
  - **Composer (add / remove / reorder):** Add-block rail appends a default block;
    the per-block Remove deletes it AND clears a stale selection; up/down reorders
    within the menu-bar; each marks dirty and round-trips through `updateMenu({document})`.
  - `nav-items` binds the live item tree read-only (does not persist item data).
- **Replace** `tests/vitest/ui/menu-design-editor-flow.test.tsx` (old PageEditor
  host flow) with the new editor's flow; assert the legacy dark chrome is gone.
- **Impacted page-editor host-contract suite — MUST be updated here:**
  `tests/vitest/pages/page-editor-host-contract.test.ts:18-20` asserts
  `modes = ["page","page-template","menu"]`; dropping `"menu"` from the
  `PageEditorHost["mode"]` union (`pageEditorHostContract.ts:178`) type-errors +
  fails this test, so this subtask MUST edit it down to `["page","page-template"]`.
- **menusClient impacted suite:** `tests/vitest/admin/menusClient.test.ts` — assert
  the `updateMenu` PATCH body forwards `document` (after extending its input type;
  see Owning Modules).
- **Regression:** `tests/vitest/pages/page-editor-*` (where most page-editor logic
  suites live, incl. `page-editor-host-contract.test.ts`) +
  `tests/vitest/ui/page-editor*.test.tsx` + `pageBuilder/*` stay green after the
  `mode === "menu"` retirement (page + page-template unaffected).
- **`tests/vitest/ui/page-templates-surface.test.tsx` MUST stay green:** it asserts
  `host.canvasChrome` is a function (`:229`) and renders it (`:238`); since
  `canvasChrome` is RETAINED as a shared seam (§5 — page-template host sets it for the
  propagation banner), this suite passes unchanged. It would only break if
  `canvasChrome` were wrongly dropped from the host contract type.
- Real-input (playwright): select menu-bar → change surface color swatch; select
  brand → switch text↔image + pick a logo; select cta-button → edit label/href;
  toggle Hide/Show panel — all live, no synthetic-only passes.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + Statistics on status change (closing agent).
- Add a `_docs/_CHANGELOG/` entry linking **TASK-499** + **TASK-499-03**; note the
  retirement of the `mode === "menu"` legacy chrome and the menu authoring host.
