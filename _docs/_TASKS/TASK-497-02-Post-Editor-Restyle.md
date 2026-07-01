# TASK-497-02: Post Editor Restyle

# FileName: TASK-497-02-Post-Editor-Restyle.md

**Parent Task:** TASK-497
**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content (Posts) / Block Editor
**Estimated Effort:** Large
**Dependencies:** TASK-479-06 (badge soft/outline variants + shared `PageHeader`), TASK-479-08-L02 (page-editor chrome precedent), TASK-479-09-L02 (Post editor migrated to redesign tokens — baseline, Done 2026-06-29)
**Status:** 🚧 In Progress

---

## Overview — RE-SCOPED (owner rejected the first pass as "the old approach")

The first delivery restyled the **existing** full-viewport three-pane app (a single
muted chrome strip, **no** in-page `PageHeader`, **no** framed card, and a "Document
Outline" default left pane). The owner rejected it: it looks like the **old editor**,
not the prototype. **The standing instruction from the start was: make it like the
PROTOTYPE, adapted functionally / EXTEND the contract where needed — NOT preserve the
old layout.** This file is re-scoped to be **prototype-faithful**.

**Design source of truth (read the SOURCE, not screenshots):**
`_docs/_PROTOTYPE/src/pages/content/PostEditorPreview.tsx` +
`_docs/_PROTOTYPE/src/components/patterns/EditorPreviewFrame.tsx`. Verified live, the
prototype renders **two stacked regions inside a normal (non-full-bleed) page**:

1. **An in-page `PageHeader`** (`PostEditorPreview.tsx:39-54`) — breadcrumb `Posts ›
   {title}`, the post title, the description **"Write, format, and publish your
   story."**, and the primary actions **Preview / Save draft / Publish** (`Rocket`).
2. **A bordered rounded editor CARD** below it (`EditorPreviewFrame.tsx:31-36`
   `rounded-2xl border border-border bg-card shadow-card`) whose top is a light
   **chrome bar** (`:37` `bg-muted/40`: title **"Post editor"** + a status/autosave
   badge on the left; undo/redo + device toggle on the right) and whose body is a
   three-pane split: **LEFT** a `w-60` **"Blocks"** rail (`:67` `bg-muted/20`;
   `EditorRailGroup label="Blocks"` + block-type `EditorRailItem`s Paragraph(active)/
   Heading/Image/Quote/Code/List/Embed, `PostEditorPreview.tsx:60-70`), **CENTER** a
   dotted canvas holding a clean `max-w-2xl` article card (`:71` `bg-dotted`;
   `PostEditorPreview.tsx:128-166`), **RIGHT** a `w-72` **"Post settings"** inspector
   (`:73` `bg-card`; Status/Slug/Category/Tags-chips/Featured image/SEO,
   `PostEditorPreview.tsx:73-125`).

**The two invented "hard decisions" are DROPPED:**

- **~~D4~~ (DROPPED): "no in-page `PageHeader`, no framed card — the real editor is a
  full-viewport app".** WRONG. Adopt the prototype's in-page `PageHeader` + the
  bordered `rounded-2xl … shadow-card` card. Convert `PostEditorLayout` from the
  full-bleed `AdminShell contentClassName="overflow-hidden p-0"` shell
  (`PostEditorLayout.tsx:103`) to a **normal padded, scrolling** `AdminShell` page that
  renders `PageHeader` above a framed card (give the card a tall `min-height` so editing
  stays large — the only real concern behind the old D4).
- **~~B6 default~~ (DROPPED): "keep 'Document Outline' as the DEFAULT left pane".**
  WRONG. The **"Blocks"** palette (the real `BlockInserter`) is the DEFAULT left content,
  styled via the shared `EditorRail`. Document **Outline** + **List view** are **not
  dropped** — they are **relocated** to sibling tabs in the same left rail (reachable
  secondary spot), per **Contract Extension #1** below.

**This is still a RESTYLE + a small, faithful contract EXTENSION — no data-model /
autosave / revisions / preview / status / shortcuts / RBAC change.** Every post behavior
and every `data-post-editor-*` / `aria-*` hook is preserved or re-homed (never dropped).
The already-shipped **`core/admin/ui/shared/EditorRail.tsx`** primitive, the flat
**"Post settings"** `DocumentInspector`, and the dotted `max-w-2xl` **canvas** are
correct and stay.

- **Owning files:**
  `core/admin/ui/posts/editor/layout/{PostEditorLayout,PostEditorRegions}.tsx` (the big
  re-layout: `PageHeader` + framed card + chrome-bar);
  `core/admin/ui/posts/editor/header/{PostEditorHeader,PostEditorActionCluster}.tsx`
  (split actions → `PageHeader`, chrome controls → card chrome-bar);
  `core/admin/ui/posts/editor/PostEditorTopBar.tsx` (prop pass-through);
  `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts` (**Extension #1**: add
  `"blocks"` left-rail mode, default it);
  `core/admin/ui/posts/editor/sidebars/{PostListViewSidebar,PostInserterSidebar}.tsx`
  (unify into ONE left rail = **Blocks** | **Outline** | **List** tabs);
  `core/admin/ui/posts/editor/blocks/BlockInserter.tsx` (the real "Blocks" palette —
  className-only rail look; **preserve** `role="listbox"`/`role="option"`/
  `aria-selected`/`activeItemIndex` roving keyboard — do NOT swap the option `<Button>`);
  `core/admin/ui/posts/editor/inspector/{DocumentInspector,PostDetailsSidebar}.tsx`
  (already flat — default-open only, keep the **Block** tab);
  `core/admin/ui/posts/editor/PostEditorCanvas.tsx` (already parity — zero/near-zero);
  `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` (prop wiring + the unified rail);
  the shared `core/admin/ui/shared/{PageHeader,EditorRail}.tsx` (both already exist —
  **consumed**, not re-created).
- **Prototype source to port from:** `EditorPreviewFrame.tsx` (card `:31-36`, chrome
  bar `:37`, toolbar-badge slot `:44-45`, undo/redo `:47-52`, device toggle `:53-62`,
  left aside `:67`, canvas `:71`, right aside `:73`, `EditorRailGroup`/`EditorRailItem`
  `:82-119`) + `PostEditorPreview.tsx` (`PageHeader` `:39-54`, autosave badge `:58`,
  `Rocket` Publish `:49-51`, "Blocks" rail `:60-70`, "Post settings" `:75-77`,
  `InspectorRow` `:27-34`, canvas title `:130`).
- **Background memory:** [[pages-editor-v2-remediation-program]] (visual sibling),
  [[admin-ui-redesign-prototype]] (TASK-479 soft/violet close-out norm), and
  [[prototype-source-over-screenshots]] (match the SOURCE, not screenshots — the reason
  this task is re-scoped).
- **Out of scope:** the **classic** editor `PostClassicEditorShell.tsx` (routed at
  `PostEditorPage.tsx:60-61` when `posts.editor.mode==='classic'`) has no prototype
  counterpart — verify-only. No `PAGE_MODEL`/post-block-document shape change, no
  preview/runtime/endpoint/RBAC/cache change. The prototype's sample byline ("By Alex
  Rivera…", `PostEditorPreview.tsx:134`) and "non-functional preview" footnote (`:169`)
  are preview scaffolding — **drop, do not port**.

---

## Contract Extensions (the "extend where needed", spelled out)

The prototype omits several real-editor affordances (Outline, List view, the Block
inspector tab, the six app toggles). Faithful parity + "nothing dropped" therefore
requires **explicit, documented extensions of the prototype contract** — enumerated
here so reviewers agree before code:

- **Extension #1 — `"blocks"` becomes a first-class DEFAULT left-rail mode; Outline +
  List survive as sibling tabs.** Today `PostEditorLeftRailMode = "outline" |
  "list-view"` and `normalizeLeftRailMode` defaults `"outline"`
  (`usePostEditorLayout.ts:5,37-39`); the block palette is a **separate** mutually
  exclusive `secondarySidebar:"inserter"` surfaced only when "Add block" is toggled
  (`PostBlockEditorShell.tsx:455-466`). EXTEND `PostEditorLeftRailMode` to
  `"blocks" | "outline" | "list-view"`, default **`"blocks"`**, and make the left rail a
  **single always-open panel** with a segmented control **Blocks** | **Outline** |
  **List** (matching the prototype's `EditorRailGroup label="Blocks"`). The
  `BlockInserter` palette is the **Blocks** tab (DEFAULT); `PostDocumentOutline` +
  `PostListViewPanel` are the other two tabs — **relocated, not dropped**. Reverses the
  rejected "Outline default".
- **Extension #2 — the editor becomes an in-page `PageHeader` + framed card (drop the
  full-viewport app shell).** `PostEditorLayout` renders the shared `PageHeader`
  (`shared/PageHeader.tsx:17` — breadcrumbs/title/description/actions already supported)
  above a `rounded-2xl border bg-card shadow-card` card with a tall `min-height`, whose
  top is the chrome bar and whose body is the three panes. Reverses the rejected D4.
- **Extension #3 — the six app-only chrome controls (Add block / Outline / Details /
  Focus / Revisions / Settings) have no prototype slot → they live in the card chrome
  bar as icon-ghost buttons.** Every `aria-pressed`/`aria-expanded`/`aria-controls`/
  `aria-keyshortcuts`/`data-post-editor-shortcut`/`ref` is preserved verbatim (load-
  bearing for `usePostEditorShortcuts` + tests). A documented extension of the
  prototype's simpler chrome — not a drop.

No other contract changes: block model, autosave, revisions, runtime preview, status,
dirty-guard, keyboard shortcuts, focus-return, preferences, taxonomy, and the **Block**
inspector tab are all preserved unchanged.

---

## Security Contract

**UI-only restyle + client-state layout extension. No security surface changes.** No
route, endpoint, RBAC, permission, `adminPath`, or cache-contract change. Autosave/draft/
publish/preview keep flowing through the existing `usePostEditorState` handlers
(`editor.saveDraft`/`editor.publish`/`editor.preview`/`editor.restoreRevision`) and the
`PostRevisionDrawer` / `RuntimePreviewDialog` wiring exactly as today
(`PostBlockEditorShell.tsx:532-577,598-621`). The new `"blocks"` left-rail mode, undo/
redo, and the device toggle are **pure client-state** affordances over the existing
`postEditorStore` / `usePostEditorLayout` reducer — they trigger **no** network call,
refetch, or dirty-state mutation. `PageHeader` and `EditorRail`
(`core/admin/ui/shared/*`) are purely presentational (import only `@/components/*` /
`@/lib/*` / `@/ui/shared/AdminLink` / `lucide-react` / `react` — no data/service import),
so they carry no security surface. All `data-post-editor-*` hooks, `aria-pressed`/
`aria-controls`/`aria-keyshortcuts`, and `usePostEditorShortcuts` keybindings are
preserved.

---

## Preserve (untouched or re-homed — never dropped)

- **Behavioral hooks (container-agnostic — survive the re-layout unchanged):**
  autosave (`autosaveError` alert `PostBlockEditorShell.tsx:509-530`; `saveDraft`
  `:601`), revisions (`PostRevisionDrawer` `:532-542`; `openRevisions` `:597`), preview
  (`RuntimePreviewDialog` `:568-577`; `preview` `:598`), status/publish (`:610-621`),
  dirty guard (`hasUnsavedChanges` `:590`), undo/redo (`editor.canUndo/canRedo/undo/redo`
  `:604-607`), shortcuts (`usePostEditorShortcuts` `:389-394`), focus-return (`:335-372`),
  focus mode (`:624`), preferences + settings dialog (`:665-671`), taxonomy (`:257-285`),
  slug + canonical autofill (`:287-333`), move-to-trash (`:174-190`).
- **Every `data-post-editor-*` hook** (`-header-row="primary"`, `-header-cluster`,
  `-sync-state`, `-region`, `-details`, `-details-tab`, `-details-tab-trigger`,
  `-shortcut`, `-density`, `-viewport-toggle`, `-undo`, `-redo`, `-save-draft`,
  `-outline-insert` — the "Insert block from outline" Plus dropdown, re-homed into the
  Outline tab per E2, **not** dropped) and every `aria-pressed`/`aria-expanded`/
  `aria-controls` on the toggle buttons — **moved containers only** (into the chrome bar /
  `PageHeader` / the unified rail's Outline tab), attributes verbatim.
- **The DOM ids** the toggles target: `post-editor-block-inserter` (Add-block
  `aria-controls`), `post-editor-document-overview` (Outline `aria-controls`),
  `post-editor-details` — re-attached to the corresponding tab panels of the unified
  left rail / the inspector.
- **The Block inspector tab** (`PostDetailsSidebar.tsx:49-55`, both
  `data-post-editor-details-tab-trigger="document"|"block"`) — selection-driven block
  editing is required by the block model; the prototype simply omits it.
- **The inserter listbox a11y** — `role="listbox"`/`role="option"`/`aria-selected`/
  `tabIndex`/`activeItemIndex` roving keyboard + item descriptions in `BlockInserter.tsx`
  (only className changes to the rail look).
- **Classic editor** (`PostClassicEditorShell.tsx`) renders on redesign tokens — verify
  only.

---

## Implementation Pseudocode

> Re-anchor by structure, not line numbers — the shell shifts. Every anchor below was
> verified against real source. `PostEditorCanvas.tsx` is large; **use `Read`/`grep -an`,
> never `rg`** ([[pageeditor-tsx-grep-binary-trap]]).

### E1 (foundation) — Extension #1: add the `"blocks"` left-rail mode + default it

`hooks/usePostEditorLayout.ts` — extend the enum + normalizer + default; keep the reducer
transitions otherwise intact.

```ts
// usePostEditorLayout.ts:5
export type PostEditorLeftRailMode = "blocks" | "outline" | "list-view";   // + "blocks"

// usePostEditorLayout.ts:37-39 — default now "blocks" (was "outline")
const normalizeLeftRailMode = (value: PostEditorLeftRailMode | undefined): PostEditorLeftRailMode =>
  value === "outline" || value === "list-view" ? value : "blocks";

// Derived helpers (:287-291): the left rail is one always-open panel; the Blocks palette
//   is shown when leftRailMode === "blocks". Fold the old "inserter" surface into the mode:
//   - showInserter  => secondarySidebar !== null && state.leftRailMode === "blocks"
//   - openInserter() => dispatch open_secondary "list-view" (the generic "left rail open"
//       value) + set_left_rail_mode "blocks"   (keeps the reducer's open/close transitions;
//       the vestigial "inserter" secondarySidebar value stays in the type only for
//       back-compat parse of stored layout — see E-store).
```

> **Reconcile the two OTHER `showInserter` consumers E1 re-means (do NOT leave them on the
> old two-mode derivation):** redefining `showInserter` to `secondarySidebar !== null &&
> leftRailMode === "blocks"` changes the meaning of `!showInserter` for two live consumers the
> shell already has, neither of which is a drop but both of which must be re-pointed under 3 modes:
> **(a) the Outline toggle's `aria-pressed`** — `outlineVisible = !focusMode &&
> secondarySidebarOpen && !showInserter` (`PostBlockEditorShell.tsx:627-628`). Under 3 modes
> `!showInserter` now also matches the **List** tab, so the Outline button would read pressed while
> LIST is active. Change it to `... && leftRailMode === "outline"` (track the Outline tab only) so
> the `aria-pressed` the contract preserves "verbatim" stays truthful. **(b) the mobile
> secondary-sidebar open handler** (`PostBlockEditorShell.tsx:646-648`) hardcodes
> `setLeftRailMode("outline") + openListView()` — opening the rail on mobile would land on Outline,
> not the new default **Blocks**. Change it to `setLeftRailMode("blocks")` so mobile matches the
> desktop Blocks-default the whole re-scope is built on. (Both are E1/E4 details; the "mobile
> Sheets KEEP as today" / "handleToggleOutline unchanged shape" notes cover container/shape, not
> these two derived values.)

`PostBlockEditorShell.tsx` — the storage fallback + parse + serialize:

```ts
// resolveInitialLayoutState fallback (:80-85): default the left rail OPEN on "blocks"
const fallback = {
  secondarySidebar: "list-view",   // "left rail open" sentinel (Blocks shown via leftRailMode)
  detailsOpen: true,
  detailsTab: resolveInitialDetailsTab(preferences),
  leftRailMode: "blocks",          // was "outline"
};
// parse validation (:105-108): accept "blocks" | "outline" | "list-view"; map a legacy
//   stored secondarySidebar:"inserter" → open + leftRailMode "blocks".
// serialize (:207-214): unchanged shape; now persists leftRailMode "blocks" by default.
```

> **`post-editor-layout-state` is a CONTRACT-lock suite here (not frozen):** adding
> `"blocks"` + changing the default is a deliberate contract extension, so
> `tests/vitest/posts/post-editor-layout-state.test.ts` is **re-baselined** (default
> `leftRailMode` → `"blocks"`; add a `"blocks"→"outline"→"list-view"` transition case) —
> keep every existing transition/focus-restore assertion.

### E2 — Unify the left rail into ONE "Blocks | Outline | List" panel (DEFAULT = Blocks)

Merge the two left components into a single always-open rail rendered by
`sidebars/PostListViewSidebar.tsx` (extended). It already owns a 2-tab `Tabs`
(`:105-144`, `value={leftRailMode}`); ADD a third **Blocks** tab hosting the real
palette. `PostInserterSidebar.tsx` is **kept** (its own
`post-editor-inserter-sidebar.test.tsx` mounts it) — the unified rail simply renders the
same `<BlockInserter showHeader={false} …>` directly as the Blocks tab body.

```tsx
// sidebars/PostListViewSidebar.tsx — segmented control now THREE tabs (proto label "Blocks")
//   Replace the "Document Outline" header copy (:66) with a neutral rail title (or drop the
//   header row); the segmented control is the primary affordance.
<Tabs value={leftRailMode} onValueChange={(v) => onLeftRailModeChange?.(v as PostEditorLeftRailMode)}>
  <TabsList className="grid w-full grid-cols-3 bg-muted/40" aria-label="Editor left rail">
    <TabsTrigger value="blocks"    data-post-editor-left-rail-tab="blocks">Blocks</TabsTrigger>
    <TabsTrigger value="outline"   data-post-editor-left-rail-tab="outline">Outline</TabsTrigger>
    <TabsTrigger value="list-view" data-post-editor-left-rail-tab="list-view">List</TabsTrigger>
  </TabsList>

  {/* BLOCKS (default) — the real palette; id is the Add-block toggle's aria-controls target */}
  <TabsContent value="blocks" forceMount id="post-editor-block-inserter"
               className="m-0 min-h-0 flex-1 overflow-auto">
    <BlockInserter onInsertBlock={onInsertBlock} showHeader={false}
                   recentlyUsedTypes={recentlyUsedTypes} />
  </TabsContent>

  {/* OUTLINE — keep PostDocumentOutline (:126-133). Keep id="post-editor-document-overview"
      on the panel/region so the Outline toggle's aria-controls stays valid.
      RE-HOME (do NOT drop) the "Insert block from outline" Plus dropdown + its
      data-post-editor-outline-insert="true" hook (PostListViewSidebar.tsx:69-102,76-77) into
      this Outline tab's header row — it is a real insert-after-selected affordance and a
      data-post-editor-* hook, so per the "never dropped" invariant it moves containers only.
      Three suites assert it (post-block-editor-shell.test.tsx:13, post-editor-listview-
      outline.test.tsx:47, and the shell handler PostBlockEditorShell.tsx:474-479). */}
  <TabsContent value="outline" forceMount id="post-editor-document-overview" …>
    {/* keep the Plus dropdown here: aria-label="Insert block from outline" +
        data-post-editor-outline-insert="true" */}
    <PostDocumentOutline … />
  </TabsContent>

  {/* LIST — keep PostListViewPanel (:134-143) verbatim */}
  <TabsContent value="list-view" forceMount …><PostListViewPanel … /></TabsContent>
</Tabs>
// KEEP: root data-post-editor-sidebar, data-post-editor-left-rail-mode={leftRailMode},
//   role="region". Root surface bg stays transparent so the region's bg-muted/20 shows.
```

`PostBlockEditorShell.tsx` — collapse the `showInserter ? <PostInserterSidebar/> :
<PostListViewSidebar/>` branch (`:455-485`) into the **single** unified rail; thread the
new `onInsertBlock`/`recentlyUsedTypes` for the Blocks tab. Re-point the header toggles:

```tsx
// handleToggleInserter (:343-350): open the rail + setLeftRailMode("blocks")
//   (openInserter now = open_secondary "list-view" + set_left_rail_mode "blocks").
// handleToggleOutline (:352-362): open the rail + setLeftRailMode("outline") — unchanged shape.
// secondarySidebar slot (:455-485) becomes ONE component:
const secondarySidebar = (
  <PostListViewSidebar
    document={editor.state.document}
    selectedBlockId={editor.state.selectedBlockId}
    onSelectBlock={(id) => handleSelectBlock(id)}
    onDeleteBlock={editor.deleteBlock}
    onMoveBlockToIndex={editor.moveBlockToIndex}
    onInsertBlock={(type) => editor.insertBlock(type, { source: "outline-plus", target: { mode: "after-selected" } })}
    // ^ REUSE the existing PostInsertSource member "outline-plus" (postInsertFlow.ts:3 union =
    //   "sidebar" | "slash" | "appender" | "outline-plus" — there is NO "left-rail"; inventing one
    //   breaks lint:types + re-baselines post-block-editor-shell-wave.test.tsx:804). Keeping
    //   "outline-plus" keeps that "unchanged" wave GREEN (it asserts source:"outline-plus").
    leftRailMode={layout.leftRailMode}
    onLeftRailModeChange={layout.setLeftRailMode}
    showOutlineHints={preferences.showOutlineHints}
    showKeyboardHints={preferences.showKeyboardHints}
  />
);
```

### E3 — Extension #2a: the in-page `PageHeader` (Preview / Save draft / Publish)

`PostBlockEditorShell.tsx` — build the actions cluster and pass `PageHeader` props into
the layout. Reuse the existing handlers (`:598-621`) unchanged.

```tsx
const pageActions = (
  <PostEditorActionCluster                        // now = Preview + Save draft + Publish only
    status={editor.status}
    saving={editor.state.saving || editor.autosaveSaving || editor.restoringRevisionId !== null}
    onPreview={() => { editor.preview().catch(() => undefined); }}
    onSaveDraft={() => { editor.saveDraft().catch(() => undefined); }}
    onPublish={/* existing publish handler with toast, :610-621 */}
  />
);
// pass to <PostEditorLayout …>:
pageTitle={editor.title || "Edit Post"}
pageDescription="Write, format, and publish your story."     // proto PostEditorPreview.tsx:42
pageActions={pageActions}
// BREADCRUMB OWNERSHIP (single trail — do NOT double it): the AdminShell chrome ALREADY renders
//   the persistent trail `["Content","Posts",title]` (shellBreadcrumbs, PostBlockEditorShell.tsx:487
//   → AdminShell `breadcrumbs`, :585). So the in-page PageHeader is passed NO `breadcrumbs` prop —
//   matching the shipped list convention (PostsListPage.tsx:429-433 / PageListPage.tsx:393-395:
//   AdminShell owns the trail, PageHeader carries title/description/actions ONLY). Do NOT also
//   thread `pageBreadcrumbs` into the PageHeader, or the editor renders TWO stacked breadcrumb
//   trails (AdminShell chrome "Content / Posts / {title}" + PageHeader "Posts › {title}"),
//   inconsistent with TASK-497-01. The prototype's in-page breadcrumb (PostEditorPreview.tsx:39-40)
//   is satisfied by the AdminShell trail in the real app (the preview frame has no AdminShell
//   chrome; the real editor page does — the single trail lives there).
```

`header/PostEditorActionCluster.tsx` — **split**: keep Preview (outline, `Eye`) + Save
draft (ghost) + Publish (`Rocket`, `Update` when published). **Remove** the autosave
`Badge` + undo/redo from this cluster (they move to the chrome bar, E4). Keep
`data-post-editor-header-cluster="primary-actions"` + `data-post-editor-save-draft`. Keep
the `status === "published" ? "Update" : "Publish"` label flip + status-driven
`aria-label`.

### E4 — Extension #2b + #3: the framed card + chrome bar

`layout/PostEditorLayout.tsx` — convert from full-viewport app to a padded scrolling page
rendering `PageHeader` + a framed card. The card's top is the chrome bar (the existing
`header` region, now the `PostEditorHeader` chrome), its body is the three panes.

```tsx
// PostEditorLayout.tsx — NEW shape (was AdminShell contentClassName="overflow-hidden p-0" :103)
return (
  <AdminShell activeHref={activeHref} breadcrumbs={breadcrumbs}>   {/* default padded, scrolling; AdminShell OWNS the single breadcrumb trail */}
    <PageHeader
      title={pageTitle}
      description={pageDescription}
      actions={pageActions}
    />                                                {/* NO breadcrumbs prop — AdminShell owns the trail (E3), so no double breadcrumb; matches TASK-497-01 */}
    <div
      className="flex min-h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card"
      data-post-editor-frame="true"        // EditorPreviewFrame.tsx:31-36
      data-post-editor-density={editorDensity}   // KEEP the density hook (was PostEditorLayout.tsx:110)
      //   — user-persisted comfortable/compact text sizing must survive the re-layout
      //   (userSettingsService.test.ts:66-68,100-102); do NOT drop it onto the old shell root.
    >
      {header ? <PostEditorHeaderRegion>{header}</PostEditorHeaderRegion> : null}   {/* chrome bar */}
      <div className="flex min-h-0 flex-1">
        {showDesktopSecondary ? (
          <PostEditorSecondarySidebarRegion className={compactSidePanels ? "w-56" : undefined}>
            {secondarySidebar}                                                     // w-60 bg-muted/20 lg:block (compact → w-56)
          </PostEditorSecondarySidebarRegion>
        ) : null}
        <PostEditorContentRegion>{content}</PostEditorContentRegion>                {/* bg-dotted canvas */}
        {showDesktopDetails ? (
          <PostEditorSidebarRegion className={compactSidePanels ? "w-72" : undefined}>
            {detailsSidebar}                                                       // w-72 bg-card lg:block (gate-consistent — see E4 regions note; compact override kept)
          </PostEditorSidebarRegion>
        ) : null}
        {/* KEEP the compactSidePanels width override (was PostEditorLayout.tsx:113,121, w-56/w-72)
            threaded into the new w-60/w-72 regions — this is a user-persisted preference, do NOT
            drop it when hardcoding the prototype widths. */}
      </div>
    </div>
    {/* mobile Sheets for secondary/details — KEEP as today (:127-155) */}
  </AdminShell>
);
```

`layout/PostEditorRegions.tsx` — adopt prototype widths + the left=lg / right=xl reveal;
the header region stays the chrome-bar surface.

```tsx
// PostEditorHeaderRegion (:12): keep "shrink-0 border-b border-border bg-muted/40"  (chrome bar)
// PostEditorSecondarySidebarRegion (:49): "…w-60 shrink-0 border-r border-border bg-muted/20 lg:block"
//   (proto w-60, EditorPreviewFrame.tsx:67 — was w-64)
// PostEditorSidebarRegion (:64): "…w-72 shrink-0 border-l border-border bg-card lg:block"
//   (proto w-72, EditorPreviewFrame.tsx:73 — was w-80; KEEP lg:block — do NOT adopt the proto's
//   xl:block. The details-region MOUNT is JS-gated on the lg `(min-width:1024px)` matchMedia query
//   (showDesktopDetails, PostEditorLayout.tsx:36,81-82), so the CSS reveal breakpoint MUST agree
//   with that JS gate. Adopting xl:block literally opens a 1024–1279px dead zone where the
//   inspector is open (toggle aria-pressed true, showDesktopDetails mounts the aside) yet the
//   CSS `hidden … xl:block` keeps it display:none AND no mobile Sheet renders (isDesktopViewport
//   true) — an open-but-hidden inspector, a real regression of AC "RIGHT Post settings inspector
//   open by default". The proto's xl:block is a pure-CSS static-preview artifact with no JS gate.
//   The LEFT rail stays lg:block for the same gate-consistency reason. If an xl reveal is ever
//   wanted, raise the JS showDesktopDetails gate to `(min-width:1280px)` in lockstep and re-verify
//   the secondary rail stays lg — the details reveal breakpoint MUST match the JS mount gate.)
```

`header/PostEditorHeader.tsx` — becomes the **chrome bar** (Preview/Save/Publish are
gone → `PageHeader`). Keep the single strip carrying `data-post-editor-header-row="primary"`.

```tsx
// LEFT of chrome bar: (optional) back-arrow + the static "Post editor" title ONLY.
//   proto EditorPreviewFrame.tsx:38-42 (title span). The prototype's LEFT badge is the
//   hardcoded "Preview only" scaffolding pill — correctly DROPPED. The dynamic sync Badge
//   is a RIGHT-side live-state indicator (see below), grouped with undo/redo + device toggle.
<div className="flex items-center gap-2" data-post-editor-header-left-context="true">
  <Button variant="ghost" size="icon" onClick={onClose} aria-label="Back to posts"
    title="Back to posts" data-post-editor-header-close="true"><ArrowLeft className="h-4 w-4"/></Button>
  <span className="text-sm font-medium">Post editor</span>
</div>

// RIGHT of chrome bar: the dynamic sync Badge + undo/redo + divider + device toggle + the six
//   app toggles (Extension #3). The Badge sits in the prototype's `toolbar` slot position — on
//   the RIGHT, immediately AHEAD of the undo/redo divider — matching the prototype's grouping of
//   live-state indicators (autosave status + undo/redo + device) on the right
//   (EditorPreviewFrame.tsx:37-52 renders `{toolbar}` :44-45 before the undo/redo divider :46-52;
//   PostEditorPreview.tsx:58 feeds toolbar={<Badge>Draft · autosaved</Badge>}).
<Badge variant="outline" data-post-editor-sync-state="true">{syncLabel}</Badge>  {/* moved here from the cluster; proto `toolbar` slot :44-45 */}
//   then undo/redo (proto EditorPreviewFrame.tsx:47-52), device toggle (unchanged,
//   PostEditorHeader.tsx:143-177), then Add block / Outline / Details / Focus / Revisions /
//   Settings — icon-ghost, EVERY aria-pressed/aria-expanded/aria-controls/aria-keyshortcuts/
//   data-post-editor-shortcut/ref preserved VERBATIM from the current PostEditorHeader.tsx:181-265.
//   syncLabel = saving ? "Saving..." : dirty ? "Unsaved changes"
//     : lastSavedAt ? `Saved at ${formatSavedAt(lastSavedAt)}` : "Synced"   (moved from the cluster)
//   (The regression suite asserts data-post-editor-sync-state presence/text, not side, so this
//    right-side placement is a free fidelity fix — no test change.)
```

> **a11y guard:** the six demoted toggles keep `aria-label` (`PostEditorHeader.tsx:190`
> inserter, `:207` outline, `:224` details, `:238` focus, `:249` revisions, `:260`
> settings) + `aria-controls` (`post-editor-block-inserter` / `post-editor-document-
> overview` / `post-editor-details`) — moving them into the chrome bar loses nothing.

`PostEditorTopBar.tsx` + `PostBlockEditorShell.tsx` — thread the new `PageHeader` props
(`pageTitle`/`pageDescription`/`pageActions`) through the layout; the
existing `onSaveDraft`/`canUndo`/`canRedo`/`onUndo`/`onRedo`/`viewportMode`/
`onSetViewportMode`/toggle handlers/refs stay wired. `viewportMode` state already exists
(`PostBlockEditorShell.tsx:155`).

> **The new `pageTitle`/`pageDescription`/`pageActions` props MUST be declared OPTIONAL on
> `PostEditorLayoutProps`** (`pageTitle?: string` etc. — matching the shared `PageHeader`'s
> documented backward-compat). Three suites mount `PostEditorLayout` **directly** with the OLD
> prop set (zero PageHeader props) and would fail `bun --cwd core lint:types` (a gate) if any new
> prop were declared **required**: `post-editor-layout-responsive.test.tsx` (3 tests,
> mounts at :9/:34/:54), `post-editor-layout-render-wave.test.tsx` (2 tests, :129/:154/:186), and
> `post-editor-keyboard-a11y.test.tsx` test 2 (:79). Declaring them optional keeps all three
> green (PageHeader simply does not render when its data is absent).

### E5 — Right inspector: already flat "Post settings" — DEFAULT-OPEN only

`inspector/DocumentInspector.tsx` already renders the flat **"Post settings"** header +
`StatusBadge`, light `InspectorRow` rows, and a single `bg-muted/30` SEO sub-card (B7,
shipped/correct) = prototype `PostEditorPreview.tsx:75-125`. **No structural change.**
Ensure the details sidebar defaults **open** (already `initialDetailsOpen:true` via the
E1 fallback + `PostBlockEditorShell.tsx:83`) so the card's right pane shows Post settings
by default. **KEEP** the **Block** tab (`PostDetailsSidebar.tsx:49-55`) + every
`onChange*` handler (`PostBlockEditorShell.tsx:442-448`) + `data-post-editor-
inspector="document"`. Optional cosmetic nudge: render Tags as soft `Badge` chips like
`PostEditorPreview.tsx:98-102` (not required by any test).

### E6 — Center canvas: already at parity — no change

`PostEditorCanvas.tsx` is already the prototype's dotted-canvas + centered card: `:1354`
`bg-dotted px-4 py-8…`, `:1359` `mx-auto … max-w-2xl rounded-2xl border bg-card p-6
shadow-card`. Leave untouched (optional single-token nudge title `text-5xl`→`text-3xl` to
match `PostEditorPreview.tsx:130`; **no** sample byline). The selection-gated
`PostRichTextToolbar` is functional block editing (selection-driven) — not the "busy
default toolbar"; it does not spoil the clean default look, no change.

### E7 — Classic editor — OUT OF SCOPE (verify-only)

`PostClassicEditorShell.tsx` (routed `PostEditorPage.tsx:60-61`) has no prototype
reference — do not restyle; only confirm it still renders on redesign tokens
(`post-classic-editor-shell-wave.test.tsx` stays green).

---

## Testing Requirements

Run from repo root (per [[local-cms-run-and-test]] / TASK-479 close-out norm):

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- **FUNCTIONAL posts suites — behavior, stay GREEN (do not weaken):**
  - `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/posts/postEditorStore.test.ts tests/vitest/posts/post-editor-focus-return.test.ts tests/vitest/posts/post-editor-preferences.test.ts tests/vitest/posts/post-insert-flow.test.ts`
  - DB-backed posts integration are **Bun-owned** (`bun:test`) and outside the vitest
    glob — run explicitly with the DB-test env per AGENTS.md:
    `set -a && [ -f .env ] && . ./.env; set +a && bun test tests/integration/posts/posts-revisions-flow.test.ts tests/integration/posts/posts-runtime-flow.test.ts`
  - Behavior-only editor/list waves stay green unchanged:
    `post-details-sidebar-wave.test.tsx`,
    `post-classic-editor-shell-wave.test.tsx` (E7 guard), `post-editor-canvas-wave.test.tsx`,
    `post-block-inserter-wave.test.tsx` (its `ArrowDown`+`Enter` listbox insertion path is
    preserved by the E2 className-only restyle), `post-editor-inserter-sidebar.test.tsx`
    (`PostInserterSidebar` kept).
  - **NOT in the unchanged set (moved to the re-baseline list below — they render the REAL
    shell/hook and assert the exact affordances E1/E2 change):** `post-block-editor-shell.test.tsx`
    (asserts the literal `"Document Outline"` / `"List view"` / `data-post-editor-outline-insert`
    strings E2 relocates — :12,:13,:18), `post-editor-layout-hook-wave.test.tsx` (hard-asserts the
    OLD default `"outline"` + the old `showInserter` derivation E1 changes — :66,:173,:193),
    `post-block-editor-shell-wave.test.tsx` (a **TWO-anchor re-baseline** — NOT one line, and
    NOT "not a weakening": (a) its malformed-stored-layout tolerance test — `"tolerates malformed
    stored layout fields"` at :1129 — seeds `leftRailMode:"also-bad"` (:1140) and hard-asserts the
    shell falls back to `initialLeftRailMode:"outline"` (:1155). E1's E-store change makes the
    malformed fallback default `"blocks"` (see E1 `:227`), so :1155 goes RED — re-point :1155
    `"outline"` → `"blocks"`. **(b) the `source:"sidebar"` insert assertion also breaks:** this
    suite mocks `usePostEditorLayout` with `showInserter:true` (:25), so TODAY the shell renders the
    MOCKED `PostInserterSidebar` (:474-491), which provides the `"insert-paragraph"` button
    (:486-487 → `onInsertBlock("paragraph")` → shell `source:"sidebar"`) clicked at :620 and
    hard-asserted at :635-638 (`insertBlock("paragraph", { source: "sidebar", target:{...} })`).
    E2 COLLAPSES the `layout.showInserter ? <PostInserterSidebar/> : <PostListViewSidebar/>` branch
    (`PostBlockEditorShell.tsx:455-485`) into ONE unified `PostListViewSidebar` whose insert path
    uses `source:"outline-plus"`, so `PostInserterSidebar` no longer renders in the shell:
    `"insert-paragraph"` never mounts, the `.find(...)?.click()` no-ops, and the `source:"sidebar"`
    assertion goes RED. **Re-point that assertion to the unified rail's palette insert
    (`source:"outline-plus"` — behaviorally identical in `resolvePostInsertMutation`, already
    exercised by the mock's `"insert-heading"` button at :517-518 / assertion at :804), OR remove
    the `insert-paragraph` click+assertion** (:620,:635-638). Also note the `"close-inserter"`
    button (:619, from the same dropped `PostInserterSidebar` mock) no longer renders, so the
    `closeSecondarySidebar` coverage that click provided now comes SOLELY from
    `"close-secondary-shell"` (:621, assertion :631). Its `source:"outline-plus"` assertion at :804
    and the toggle-outline `setLeftRailMode("outline")` assertions at :632,:850 **STAY GREEN** — the
    Outline toggle is preserved. This is a pure test-anchor break (not a functional regression), but
    it still fails the gate if only :1155 is touched — do NOT describe it as a "one-line, not a
    weakening" re-baseline).
- **CONTRACT / PRESENTATION-LOCK suites — UPDATED (re-baselined to the new look, NOT
  weakened).** They render the **real** header/layout/inspector and assert the exact
  chrome this re-scope changes; re-point only the changed strings, keep every functional
  assertion:
  - `tests/vitest/posts/post-editor-layout-state.test.ts` — **contract lock for
    Extension #1:** re-baseline default `leftRailMode` `"outline"` → `"blocks"`; add a
    `blocks → outline → list-view` transition; keep all existing open/close/focus-restore
    transitions green.
  - `tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx` — **ADD** the new
    look: an in-page `PageHeader` renders the description `"Write, format, and publish
    your story."` + Preview/Publish in `PageHeader.actions`; the editor is wrapped in the
    framed card (`data-post-editor-frame` / `rounded-2xl` + `shadow-card` on the frame).
    Re-point the old `toContain("Publishing")` inverse to `"Post settings"`. KEEP the
    canvas-card test (`rounded-2xl`/`max-w-2xl`/`shadow-card`) + the reducer-dirty test.
  - `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx` — **mount change
    REQUIRED (this suite renders `PostEditorTopBar` in ISOLATION via
    `renderToString(<PostEditorTopBar .../>)` at :30, NOT the full shell).** E3/E4 MOVE the
    entire `PostEditorActionCluster` (Preview / Save draft / Publish / `data-post-editor-header-
    cluster="primary-actions"` / the saving-`disabled` state / the `"Update"` publish-label flip)
    OUT of `PostEditorHeader`/`PostEditorTopBar` into shell-built `pageActions` passed to
    `PostEditorLayout`'s `PageHeader` — a **sibling** of, not nested inside, `PostEditorTopBar`.
    Those buttons therefore no longer exist in a TopBar-only mount, so the primary-actions /
    Preview (:41) / saving-`disabled` (:51) / `"Update"` (:59) assertions (:32,:41,:51,:59) **must
    move onto a full-shell mount** — either relocate them to `post-editor-shell-restyle.test.tsx` /
    the `posts-editor-chrome-wave` regression (both of which mount `renderAdminUi(<PostBlockEditor
    Shell/>)` so `pageActions` is in the DOM), or change this suite's first test to mount the full
    shell. **Also the dynamic-title assertion `toContain("Header workflow")` (:43) breaks the same
    way:** E4 makes the chrome bar's left context a STATIC `"Post editor"` span (E4 above) and moves
    the dynamic post title/breadcrumbs (the `breadcrumbs` prop that carries `"Header workflow"`, via
    `PostEditorHeader` leftContext — `PostEditorHeader.tsx:92,122`) to the in-page `PageHeader`,
    which does NOT render in a `renderToString(<PostEditorTopBar/>)` isolation mount. So **move :43
    onto the full-shell mount too** (where the `PageHeader` renders `editor.title`), OR re-point the
    TopBar-mount assertion to the new static chrome-bar title `"Post editor"`. Note that the
    `title`/`breadcrumbs` props to `PostEditorTopBar`/`PostEditorHeader` become **vestigial** once the
    dynamic title lives in `PageHeader`. **KEEP against the TopBar mount only the true chrome-bar affordances:** the six icon
    toggles via preserved `aria-label`/`title` (`"Toggle block inserter"`, and — since this suite
    seeds `outlineVisible:true` — `"Hide document overview"`), `data-post-editor-header-close`,
    Revisions, Editor settings, and the sync badge (`"Saving..."`). Drop any
    `data-post-editor-header-row="secondary"` / `secondary-controls` check (single strip). Do
    **not** try to "re-point a demoted-label check to a preserved TopBar aria-label" for
    Preview/Publish — they are moved-out primary actions, not demoted-to-icon toggles.
  - `tests/vitest/ui-integration/post-editor-layout-shell.test.tsx` — assert the
    `PageHeader` + framed card render; `secondary-sidebar` region uses `bg-muted/20`; the
    left rail's **Blocks** tab is the default (`data-post-editor-left-rail-tab="blocks"`
    present + selected). Re-point the three breaking string assertions (peer-precise, mirroring
    shell.test :12/:13/:18): **:19** `data-post-editor-left-rail-mode="outline"` → `"blocks"`
    (Blocks is now the default — E1); **:20** `"List view"` → `"List"` (the renamed rail-tab
    label — E2); **:22** `"Document Outline"` → a stable rail marker (the retained
    `post-editor-document-overview` id / the Outline tab label — E2 relocates it to a tab). KEEP
    `primary-actions`, close, `"Loading post editor"`, `"Move to trash"`, and the **Outline** +
    **List** tabs present.
  - `tests/vitest/ui-integration/post-editor-listview-outline.test.tsx` — re-baseline to
    the **three-tab** rail (Blocks default | Outline | List); the `"Document Outline"` (:41)
    and `"List view"` (:45) copy is re-pointed to the new rail-tab labels / a stable marker
    (the outline-insert hook at :47 is **kept** — re-homed into the Outline tab per E2); keep
    the Outline/List panel behavior assertions.
  - `tests/vitest/ui/post-block-editor-shell.test.tsx` — **re-baseline (moved out of the
    unchanged bucket):** it renders the real shell (no mocks) and asserts the exact strings E2
    relocates — re-point `"Document Outline"` (:12) + `"List view"` (:18) to the new rail-tab
    labels / a stable marker (e.g. `data-post-editor-left-rail-tab="blocks"`), and keep the
    `data-post-editor-outline-insert="true"` assertion (:13 — the dropdown is re-homed into the
    Outline tab, not dropped).
  - `tests/vitest/ui/post-editor-layout-hook-wave.test.tsx` — **contract lock for Extension #1
    (moved out of the unchanged bucket):** re-baseline the invalid-mode normalize default (:66)
    `"outline"` → `"blocks"`, and rewrite the `showInserter` expectations (:173 / :193) to the new
    "rail-open AND `leftRailMode === "blocks"`" semantics; keep every other transition/focus-
    restore assertion.
  - `tests/vitest/ui/post-block-editor-shell-wave.test.tsx` — **TWO-anchor re-baseline (moved out
    of the unchanged bucket) — NOT a single line:** (a) the `"tolerates malformed stored layout
    fields"` test (:1129) seeds a stored `leftRailMode:"also-bad"` (:1140) and hard-asserts the
    shell's malformed-storage fallback resolves `initialLeftRailMode:"outline"` (:1155). E1's
    E-store change (`:227`) flips the malformed fallback default to `"blocks"`, so re-point :1155
    `"outline"` → `"blocks"` (the malformed-tolerance behavior is unchanged). **(b)** because this
    suite mocks `showInserter:true` (:25), the shell TODAY renders the mocked `PostInserterSidebar`
    (:474-491) and its `"insert-paragraph"` click (:620) hard-asserts `insertBlock("paragraph", {
    source: "sidebar" })` (:635-638). E2 collapses the `showInserter ? <PostInserterSidebar/> :
    <PostListViewSidebar/>` branch (`PostBlockEditorShell.tsx:455-485`) into the ONE unified
    `PostListViewSidebar` (insert path `source:"outline-plus"`), so `PostInserterSidebar` — and its
    `"insert-paragraph"` (:620) + `"close-inserter"` (:619) buttons — no longer render; the
    `source:"sidebar"` assertion goes RED. **Re-point the :620/:635-638 assertion to the unified
    rail's palette insert (`source:"outline-plus"` — identical in `resolvePostInsertMutation`,
    already covered by the mock's `"insert-heading"` at :517-518 / assertion :804), OR remove it;
    and note `"close-inserter"` (:619) no longer renders so its `closeSecondarySidebar` coverage now
    comes solely from `"close-secondary-shell"` (:621, assertion :631).** **KEEP** the
    `source:"outline-plus"` assertion (:804 — the E2 Blocks-tab insert reuses that source) and the
    toggle-outline `setLeftRailMode("outline")` assertions (:632,:850 — the Outline toggle is
    preserved) green. Pure test-anchor break (no functional regression), but touching only :1155
    fails the gate — this is **not** a one-line re-baseline.
  - `tests/vitest/ui-integration/post-editor-smoke-regression.test.tsx` — **re-baseline (was
    unlisted):** it renders the real page SSR and asserts `"Document Outline"` (:14, :35);
    re-point those to a stable rail marker that survives the restyle (e.g.
    `data-post-editor-region="secondary-sidebar"` or the retained `post-editor-document-overview`
    id). KEEP the classic-route `not.toContain("Document Outline")` at :25 as-is.
  - `tests/vitest/ui/post-list-view-sidebar-wave.test.tsx` — **re-baseline (was unlisted):** E2
    restructures `PostListViewSidebar` from a 2-tab to a 3-tab rail (adds the **Blocks** tab
    hosting a real `forceMount` `BlockInserter`, drops the `"Document Outline"` header, renames
    `"List view"`→`"List"`). This suite mounts `PostListViewSidebar` directly (:188) and does NOT
    mock `BlockInserter`, so mock `BlockInserter` here (as it already mocks the other tab bodies)
    or assert the new three-tab shape; re-confirm the `[data-tabs-value='list-view']` (:209) +
    button-textContent lookups still resolve. Thread the new `recentlyUsedTypes` prop (see E2
    shell wiring).
  - `tests/vitest/ui-integration/post-document-inspector.test.tsx` — inspector is already
    flat (E5, no change): keep `"Post settings"`, the `InspectorRow` labels,
    `"Featured image"`, `"Danger zone"`, `"Move to trash"`, `"Last updated"`, single SEO
    sub-card green (no edits expected beyond any that already landed in the first pass).
  - `tests/vitest/ui-integration/post-editor-writing-canvas-flow.test.tsx` — its first
    test renders `PostEditorTopBar` in ISOLATION (`renderToString(<PostEditorTopBar .../>)` at
    :31). The `"Preview"` (:36) + `"Publish"` (:37) assertions target the moved-out
    `PostEditorActionCluster` (E3/E4 relocate it to the shell's `PageHeader` `pageActions`), so —
    like `post-editor-header-workflow.test.tsx` — they are **NOT** demoted-to-icon toggles with a
    preserved TopBar `aria-label` to re-point to. **Move the :36/:37 Preview/Publish assertions
    onto a full-shell mount** (relocate to `post-editor-shell-restyle` / the `posts-editor-chrome-
    wave` regression, or mount `PostBlockEditorShell` here) so `pageActions` is in the DOM; keep
    the Outline-toggle `"Hide document overview"` icon assertion against the TopBar mount. KEEP the
    `PostListViewPanel` test green.
  - **Verify after E1 (should stay green, but re-run because E1 touches `openInserter` +
    the `showInserter` derivation):** `tests/vitest/ui/post-editor-support-wave-2.test.tsx`
    exercises the reducer/hook transitions directly (`createPostEditorLayoutState` shape :240-247;
    the `openInserter`+`setLeftRailMode`+`showInserter` chain expecting `showInserter===false`
    with `leftRailMode:"list-view"` at :282). Its assertions **should** survive the new derivation,
    but if the `openInserter` two-dispatch form shifts them, re-baseline them to match — do not
    assume it is frozen.
  - **Verify after E4 — re-run because E4 REWRITES `PostEditorLayout` (full-bleed shell →
    padded `AdminShell` + in-page `PageHeader` + framed card):** the three suites that mount
    `PostEditorLayout` DIRECTLY with the OLD prop set (no PageHeader props) —
    `tests/vitest/ui-integration/post-editor-layout-responsive.test.tsx` (3 tests) and
    `tests/vitest/ui/post-editor-layout-render-wave.test.tsx` (2 tests). They should STAY green
    (regions / density / compact widths / matchMedia / mobile Sheets are all preserved; the
    `data-post-editor-density` attr moves onto the framed-card `div`, but the SSR string still
    contains it), **provided the new PageHeader props are declared OPTIONAL** (see E4 above) — if
    they were required these two suites (and `post-editor-keyboard-a11y.test.tsx` test 2, below)
    would fail `lint:types`. Re-run and re-baseline only if a token genuinely moved.
  - **Verified NOT broken (leave untouched):** `post-list-restyle.test.tsx` (list track,
    497-01), `post-editor-details-tabs.test.tsx` (Block tab kept),
    `post-editor-keyboard-a11y.test.tsx` (aria hooks preserved — but note its **test 2 mounts
    `PostEditorLayout` directly** at :79 with no PageHeader props, so its "untouched" green status
    likewise DEPENDS on the new PageHeader props being OPTIONAL per E4).
- **REPLACE / re-baseline (NOT a new file) — `tests/vitest/ui/posts-editor-chrome-wave.test.tsx`
  ALREADY EXISTS and is committed (HEAD, 453 lines).** It currently encodes the **rejected
  first-pass** look: it mocks `leftRailMode: "outline"` (:24,:32 — the old default) and its
  describe only asserts the single chrome strip / `bg-muted/40` / autosave badge / `bg-muted/20`
  rail — it does **NOT** assert the in-page `PageHeader`, the framed card
  (`data-post-editor-frame` / `rounded-2xl` / `shadow-card`), the `"Write, format, and publish
  your story."` description, or the Blocks-default tab. **Overwrite** the stale describe body +
  its `leftRailMode:"outline"` mock with the regression shape below (Section "Regression-test
  shape"); do **not** append a second describe and leave the old outline-default assertions as a
  false green. (This is a re-baseline of a committed file, so — like
  `post-editor-layout-state.test.ts` — it does **not** move the test-file count.)
- Full `bun test` (vitest + `test:bun`) + `gates:coderso` (5/5) green.
- Runtime smoke via `coderso-dev-core-host` + `playwright-cli`
  (`http://coderso-a.localhost:5173/admin/posts` → open a post; light + dark): an in-page
  `PageHeader` (title + description + Preview/Save draft/Publish) ABOVE a bordered rounded
  card; card chrome bar ("Post editor" + autosave badge + undo/redo + device toggle + the
  six toggles); LEFT rail defaults to **Blocks** (the palette) with Outline/List tabs
  reachable; dotted canvas clean article; RIGHT "Post settings" inspector open; Block tab
  still selectable after clicking a block. White page = server down → re-run helper.

---

## Regression-test shape

`tests/vitest/ui/posts-editor-chrome-wave.test.tsx` — render the **real**
`PostBlockEditorShell` so the assertions see real classNames/aria. **Do NOT** mirror
`post-block-editor-shell-wave.test.tsx`'s mocks (it mocks away `PostEditorLayout` /
`PostEditorTopBar` / the sidebars / inspector / canvas — exactly the components these
assertions target). Instead mock **only the data/seam hooks** (`usePostEditorState` /
`usePostEditorLayout` / `usePostEditorPreferences` / `usePostEditorShortcuts` /
`useFocusReturn` + router / taxonomy / `sonner` / `RuntimePreviewDialog`), leave the
layout/topbar/sidebars/inspector/canvas **real**, and stub `matchMedia` `matches:true`
(or force `viewportMode="desktop"`) so the desktop regions mount
(`PostEditorLayout.tsx:76-84`; pattern at `post-editor-layout-render-wave.test.tsx:124`).

> **Test idiom (repo convention — NOT `@testing-library`):** this repo has **no**
> `@testing-library/react` / `jest-dom`, and **adding them is out of scope** (TASK-497-03).
> So **do NOT** import `screen`/`fireEvent`/`.toBeDisabled()`. Mirror the wave idiom: a
> top-of-file `// @vitest-environment happy-dom` docblock (**required**), mount via
> `createRoot` + `React.act` (copy the `mount` helper from
> `post-editor-layout-render-wave.test.tsx:79-103`, here `renderEditor()` → `{ container }`),
> assert via `container.querySelector(...)` / `Array.from(...querySelectorAll("button")).find(...)`.

```tsx
describe("TASK-497-02 post editor prototype parity", () => {
  it("renders an in-page PageHeader (description + Preview/Publish in actions) ABOVE a framed card", () => {
    const { container } = renderEditor();
    expect(container.textContent).toContain("Write, format, and publish your story.");
    const frame = container.querySelector('[data-post-editor-frame="true"]');
    expect(frame?.className).toContain("rounded-2xl");
    expect(frame?.className).toContain("shadow-card");
    // Preview + Publish live in the PageHeader actions, ABOVE the frame (not the chrome strip)
    expect(container.querySelector('[aria-label="Open runtime preview"]')).toBeTruthy();
    expect(
      Array.from(container.querySelectorAll("button")).some((b) =>
        /Publish post|Update published post/.test(b.getAttribute("aria-label") ?? ""),
      ),
    ).toBe(true);
  });

  it("chrome bar: single strip with title, autosave badge, undo/redo, device toggle", () => {
    const { container } = renderEditor();
    const header = container.querySelector('[data-post-editor-region="header"]');
    expect(header?.className).toContain("bg-muted/40");
    expect(container.querySelector('[data-post-editor-header-row="secondary"]')).toBeNull();
    expect(container.querySelector('[data-post-editor-sync-state="true"]')?.textContent)
      .toMatch(/Saving\.\.\.|Unsaved changes|Saved at|Synced/);
    expect(container.querySelector('[aria-label="Undo"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Desktop preview"]')).toBeTruthy();
  });

  it("undo/redo disabled when no history (override the mock canUndo/canRedo → false)", () => {
    const { container } = renderEditor();
    expect(container.querySelector('[aria-label="Undo"]')?.hasAttribute("disabled")).toBe(true);
    expect(container.querySelector('[aria-label="Redo"]')?.hasAttribute("disabled")).toBe(true);
  });

  it("LEFT rail defaults to Blocks; Outline + List survive as sibling tabs", () => {
    const { container } = renderEditor();
    const region = container.querySelector('[data-post-editor-region="secondary-sidebar"]');
    expect(region?.className).toContain("bg-muted/20");
    // three tabs; Blocks is the default (Extension #1)
    expect(container.querySelector('[data-post-editor-left-rail-tab="blocks"]')).toBeTruthy();
    expect(container.querySelector('[data-post-editor-left-rail-tab="outline"]')).toBeTruthy();
    expect(container.querySelector('[data-post-editor-left-rail-tab="list-view"]')).toBeTruthy();
    // EditorRail IS consumed: the Blocks palette wraps its sections in EditorRailGroup
    expect(container.querySelector("[data-editor-rail-group]")).toBeTruthy();
    // the default rail mode is "blocks"
    expect(container.querySelector('[data-post-editor-left-rail-mode="blocks"]')).toBeTruthy();
  });

  it("preserves the six chrome toggles' a11y + shortcut hooks after demoting labels to icons", () => {
    const { container } = renderEditor();
    const header = container.querySelector('[data-post-editor-region="header"]');
    const add = header?.querySelector('[aria-label="Toggle block inserter"]');
    expect(add?.getAttribute("aria-controls")).toBe("post-editor-block-inserter");
    expect(add?.hasAttribute("aria-pressed")).toBe(true);
    expect(add?.getAttribute("data-post-editor-shortcut")).toBeTruthy();
    const outline = Array.from(header?.querySelectorAll("button") ?? []).find((b) =>
      /document overview/i.test(b.getAttribute("aria-label") ?? ""),
    );
    expect(outline?.getAttribute("aria-controls")).toBe("post-editor-document-overview");
  });

  it("RIGHT inspector is flat 'Post settings' with a single SEO sub-card + Block tab, default open", () => {
    const { container } = renderEditor();
    const sidebar = container.querySelector('[data-post-editor-region="sidebar"]');
    expect(sidebar?.className).toContain("bg-card");
    expect(sidebar?.textContent).toContain("Post settings");
    expect(sidebar?.querySelectorAll(".bg-muted\\/30").length).toBe(1);
    expect(container.querySelector('[data-post-editor-details-tab-trigger="block"]')).toBeTruthy();
  });

  it("canvas keeps bg-dotted + max-w-2xl card", () => {
    const { container } = renderEditor();
    expect(container.querySelector(".bg-dotted")).toBeTruthy();
    expect(container.querySelector(".max-w-2xl")).toBeTruthy();
  });
});
```

> **Do not** assert brittle full class strings beyond the load-bearing tokens above; the
> functional suites (store / focus-return / preferences / insert-flow + revisions/runtime
> integration) remain the source of truth for behavior and pass unchanged.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status
  (**orchestrator-owned** — do not touch stats here).
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-497** + **TASK-497-02**,
  noting the re-scope to prototype parity: in-page `PageHeader` (title + description +
  Preview/Save draft/Publish) above a framed `rounded-2xl … shadow-card` card; card
  chrome bar ("Post editor" + autosave Badge + undo/redo + device toggle + the six app
  toggles); **Blocks** default left rail (Extension #1) with Outline + List relocated to
  sibling tabs; flat "Post settings" inspector kept; **Block tab kept**; shared
  `PageHeader` + `EditorRail` consumed; classic editor out of scope. State the two DROPPED
  invented decisions (~~D4~~ full-viewport-no-card, ~~B6~~ Outline-default).
- A pure visual/layout restyle needs **no** contract edits to `_docs/PAGE_MODEL.md` /
  `_docs/PREVIEW_SPEC.md` — state explicitly in the changelog that none were required.
- Cross-link [[pages-editor-v2-remediation-program]] + [[prototype-source-over-screenshots]].
