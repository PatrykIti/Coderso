# TASK-497-02: Post Editor Restyle
# FileName: TASK-497-02-Post-Editor-Restyle.md

**Parent Task:** TASK-497
**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content (Posts) / Block Editor
**Estimated Effort:** Large
**Dependencies:** TASK-479-06 (badge soft/outline variants), TASK-479-08-L02 (page-editor chrome precedent), TASK-479-09-L02 (Post editor migrated to redesign tokens — baseline, Done 2026-06-29)
**Status:** ✅ Done
**Completed:** 2026-06-30

---

## Overview

Bring the **Post block editor** to prototype parity as a **RESTYLE only** — no
re-architecture, no feature change. The real editor
(`core/admin/ui/posts/editor/PostBlockEditorShell.tsx`) is **already** its own
three-pane shell via `PostEditorLayout` + `PostEditorRegions` (secondary sidebar /
content canvas / details sidebar). We keep that shell and restyle the three panes'
visual treatment to match `_docs/_PROTOTYPE/src/pages/content/PostEditorPreview.tsx`
+ `_docs/_PROTOTYPE/src/components/patterns/EditorPreviewFrame.tsx`.

**Hard decision (owner-approved):** Do **NOT** adopt the Pages floating-panel shell
`core/admin/ui/shared/CanvasEditor.tsx`. Do **NOT** force the prototype's literal
page-level `PageHeader` + `rounded-2xl … shadow-card` framed `EditorPreviewFrame`
card — that card is non-functional preview scaffolding embedded in a scrolling page,
and the real editor is a full-viewport app (`PostEditorLayout.tsx:103`
`contentClassName="overflow-hidden p-0"`); a rounded scrolling card would regress
full-height editing. **Parity target = the three panes' visual treatment + a single
muted chrome strip**, not the literal card.

- **Goal:** the Post editor chrome (top strip), left rail surface + inserter look,
  and right inspector treatment render in the soft/violet redesign matching the
  prototype, while the **post block model, autosave, revisions, runtime preview,
  status, bulk actions, create drawer, keyboard shortcuts, and every
  `data-post-editor-*` hook / `aria-pressed` / `aria-controls`** stay untouched.
- **Owning files:**
  `core/admin/ui/posts/editor/header/{PostEditorHeader,PostEditorActionCluster}.tsx`;
  `core/admin/ui/posts/editor/PostEditorTopBar.tsx`;
  `core/admin/ui/posts/editor/layout/{PostEditorLayout,PostEditorRegions}.tsx`;
  `core/admin/ui/posts/editor/sidebars/{PostListViewSidebar,PostInserterSidebar}.tsx`;
  `core/admin/ui/posts/editor/blocks/BlockInserter.tsx` (B6 — className-only rail look;
  **preserve** `role="listbox"`/`role="option"`/`aria-selected`/the item description +
  the `activeItemIndex` roving keyboard nav — do NOT swap the option `<Button>` out);
  `core/admin/ui/posts/editor/inspector/{DocumentInspector,PostDetailsSidebar}.tsx`;
  `core/admin/ui/posts/editor/PostEditorCanvas.tsx` (near-zero);
  `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` (prop wiring only);
  **NEW** `core/admin/ui/shared/EditorRail.tsx`.
- **Prototype source to port from:**
  `_docs/_PROTOTYPE/src/components/patterns/EditorPreviewFrame.tsx` (chrome strip
  `:37`, undo/redo `:47-52`, device toggle `:54-62`, left aside `:67`, right aside
  `:73`, `EditorRailGroup` `:82-97`, `EditorRailItem` `:99-119`) and
  `_docs/_PROTOTYPE/src/pages/content/PostEditorPreview.tsx` (autosave badge `:58`,
  Publish `Rocket` `:48-50`, "Post settings" header + soft Draft badge `:75-77`,
  `InspectorRow` `:27-34`, single SEO sub-card `:114-125`, canvas title `:130`).
- **Background memory:** [[pages-editor-v2-remediation-program]] (the Pages
  remediation that this restyle visually mirrors — do not regress its data-* hook
  discipline), [[admin-ui-redesign-prototype]] (TASK-479 soft/violet close-out
  norm: sequential drift-verify + gates).
- **Out of scope:** the **classic** editor `PostClassicEditorShell.tsx` (routed at
  `PostEditorPage.tsx:60-61` when `posts.editor.mode==='classic'`) has no prototype
  counterpart — **OUT OF SCOPE** (B11); only verify it still renders on redesign
  tokens. No `PAGE_MODEL`/post-block-document shape change, no preview/runtime
  contract change, no endpoint/RBAC/cache change. The prototype's non-functional
  preview footer ("This is a non-functional preview…", `PostEditorPreview.tsx:170`),
  sample byline ("By Alex Rivera…", `:134`), and the literal rounded preview card
  frame are preview scaffolding — **drop, do not port**.

---

## Security Contract

**UI-only restyle. No security surface changes.** No route, endpoint, RBAC,
permission, adminPath, or cache-contract change. Autosave/draft/publish/preview keep
flowing through the existing `usePostEditorState` handlers
(`editor.saveDraft`/`editor.publish`/`editor.preview`/`editor.restoreRevision`) and
the `PostRevisionDrawer` / `RuntimePreviewDialog` wiring exactly as today. Undo/redo
and the optional device toggle are pure client-state affordances over the existing
store (`postEditorStore.ts:72-73,438-464`; `usePostEditorState.ts:1051-1052,1069-1070`)
and `PostEditorLayout`'s already-present `viewportMode` prop — they trigger **no**
network call, refetch, or dirty-state mutation. All `data-post-editor-*` hooks,
`aria-pressed`/`aria-controls`/`aria-keyshortcuts`, and `usePostEditorShortcuts`
keybindings are preserved.

---

## Implementation Pseudocode

> Re-anchor by structure, not line numbers — the shell shifts. Every anchor below
> was verified against real source. `PostEditorCanvas.tsx` is large; **use
> `Read`/`grep -an`, never `rg`** (binary-trap, see [[pageeditor-tsx-grep-binary-trap]]).

### B9 (foundation) — Port the rail primitives → NEW `core/admin/ui/shared/EditorRail.tsx`

Confirmed: **no** `EditorRail`/`FilterBar` exists in admin today
(`find core/admin/ui -iname "*EditorRail*"` → none). Port `EditorRailGroup` /
`EditorRailItem` from the prototype (`EditorPreviewFrame.tsx:82-119`), swapping the
prototype's `@/lib/cn` (confirmed `EditorPreviewFrame.tsx:6`) for the admin
convention `@/lib/utils` (matches `shared/StatusBadge.tsx:4`, `shared/DataTable.tsx:12`).
Keep it a pure presentational primitive — but make `EditorRailItem` **wireable**
(real editor needs click/active), not the prototype's `cursor-default` div.

```tsx
// core/admin/ui/shared/EditorRail.tsx  (NEW)
import { type ButtonHTMLAttributes, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EditorRailGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4" data-editor-rail-group="true">
      <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function EditorRailItem({
  icon, children, active, onClick, ...rest
}: {
  icon?: ReactNode;
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;          // wireable (proto was cursor-default decorative)
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  // ADAPT-NOT-COPY: `const Cmp = onClick ? "button" : "div"` infers the string-literal
  // UNION "button" | "div"; JSX then narrows allowed props to the INTERSECTION of
  // button+div attributes, so `type={...}` and the `{...rest}` (ButtonHTMLAttributes)
  // spread are NOT assignable to a possible <div> → a hard `lint:types` error (an
  // explicit acceptance gate, TASK-497-03 AC#3). Annotating `Cmp: ElementType` (not the
  // literal union) accepts arbitrary props on either tag and compiles clean. (Equivalent:
  // `(onClick ? "button" : "div") as ElementType`, or two discriminated branches.)
  const Cmp: ElementType = onClick ? "button" : "div";
  return (
    <Cmp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-active={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors [&_svg]:size-4 [&_svg]:text-muted-foreground",
        onClick ? "cursor-pointer" : "cursor-default",
        active
          ? "bg-primary-soft text-primary-soft-foreground [&_svg]:text-primary"
          : "hover:bg-accent",
      )}
      {...rest}
    >
      {icon}
      {children}
    </Cmp>
  );
}
```

> **Types gate guard (verify before copying):** the `Cmp: ElementType` annotation is
> load-bearing — without it `bun --cwd core lint:types` fails on the `type`/`{...rest}`
> props (see comment above). Keep the `& ButtonHTMLAttributes` spread only because
> `ElementType` makes it safe; it is **not** used to smuggle listbox semantics into the
> inserter (B6 keeps the inserter's own `<Button role="option">` — see B6).

### B1 + B6/B7 (region surfaces) — `layout/PostEditorRegions.tsx`

Three surfaces only — keep every `data-post-editor-region`, `aria-label`, sizing.

```tsx
// PostEditorHeaderRegion (className on line 12): single muted chrome strip
//   FROM: "shrink-0 border-b bg-background/95 backdrop-blur"
//   TO:   "shrink-0 border-b border-border bg-muted/40"   // EditorPreviewFrame.tsx:37
// PostEditorSecondarySidebarRegion (className on line 55): left rail surface → bg-muted/20
//   FROM: "...w-64 shrink-0 border-r bg-background lg:block"
//   TO:   "...w-64 shrink-0 border-r border-border bg-muted/20 lg:block"  // :67
//   (KEEP w-64 — full-height app rail; do NOT shrink to proto w-60)
// PostEditorSidebarRegion / details (className on line 72): inspector surface → bg-card
//   FROM: "...w-80 shrink-0 border-l bg-background lg:block"
//   TO:   "...w-80 shrink-0 border-l border-border bg-card lg:block"      // :73
```

### B1–B5 — Top bar: collapse two rows → ONE muted strip, with autosave badge, undo/redo, device toggle, Save draft + Rocket

`header/PostEditorHeader.tsx` today renders TWO rows: row1
(`data-post-editor-header-row="primary"`, `min-h-14 … px-4 py-2`, `:82-129`)
= back-arrow + breadcrumb + `PostEditorActionCluster` + Settings gear; and a
`border-t` row2 (`data-post-editor-header-row="secondary"`, `:131-214`) of **labeled**
buttons Add block / Outline / Details / Focus / Revisions. Collapse to ONE strip;
**demote** the row2 toggles to `size="icon"` ghost buttons; **preserve every a11y
attribute** (`aria-pressed`/`aria-expanded`/`aria-controls`/`aria-keyshortcuts`/
`data-post-editor-shortcut`/`title`/`ref`) so `usePostEditorShortcuts` + the layout
tests keep passing.

```tsx
// header/PostEditorHeader.tsx — single strip (logic/handlers unchanged)
// New props threaded in (all optional → backward compatible):
//   canUndo, canRedo, onUndo, onRedo,
//   onSaveDraft,                       // B3
//   viewportMode, onSetViewportMode    // B5 (optional)
return (
  <div
    className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6"
    data-post-editor-header-row="primary"            // KEEP hook (tests assert it)
  >
    {/* LEFT: back arrow + breadcrumb (unchanged, :86-102) */}
    <div className="flex min-w-0 items-center gap-3" data-post-editor-header-left-context="true">
      <Button variant="ghost" size="icon" onClick={onClose}
        aria-label="Back to posts" title="Back to posts"
        data-post-editor-header-close="true"><ArrowLeft className="h-4 w-4" /></Button>
      <div className="min-w-0">{leftContext}</div>
    </div>

    {/* RIGHT cluster — order mirrors EditorPreviewFrame.tsx:44-62 then actions */}
    <div className="flex w-full flex-wrap items-center justify-end gap-1.5 md:w-auto"
         data-post-editor-header-cluster="primary-row">
      {/* B2: autosave badge (in PostEditorActionCluster) + B3/B4 live here */}
      <PostEditorActionCluster
        status={status} dirty={dirty} saving={saving} lastSavedAt={lastSavedAt}
        onPreview={onPreview} onPublish={onPublish}
        onSaveDraft={onSaveDraft}                       // B3
        canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo}  // B4
      />

      {/* B5 (optional): device/viewport toggle — model EditorPreviewFrame.tsx:54-62 */}
      {onSetViewportMode ? (
        <div className="ml-1 hidden items-center rounded-lg border border-border bg-card p-0.5 sm:flex"
             role="group" aria-label="Editor viewport" data-post-editor-viewport-toggle="true">
          <Button type="button" variant="ghost" size="icon-sm"
            aria-pressed={viewportMode !== "mobile"} aria-label="Desktop preview"
            onClick={() => onSetViewportMode("desktop")}
            className={viewportMode !== "mobile" ? "bg-muted text-foreground" : "text-muted-foreground"}>
            <Monitor className="size-3.5" /></Button>
          <Button type="button" variant="ghost" size="icon-sm"
            aria-pressed={viewportMode === "mobile"} aria-label="Mobile preview"
            onClick={() => onSetViewportMode("mobile")}
            className={viewportMode === "mobile" ? "bg-muted text-foreground" : "text-muted-foreground"}>
            <Smartphone className="size-3.5" /></Button>
        </div>
      ) : null}

      <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />

      {/* DEMOTED row2 toggles → icon ghosts. KEEP every a11y attr + ref + data-* */}
      <Button ref={addButtonRef} type="button"
        variant={inserterVisible ? "secondary" : "ghost"} size="icon"
        onClick={onToggleInserter}
        aria-pressed={inserterVisible} aria-expanded={inserterVisible}
        aria-controls="post-editor-block-inserter" aria-label="Toggle block inserter"
        aria-keyshortcuts={formatPostEditorShortcutAria("toggleInserter")}
        data-post-editor-shortcut={inserterShortcut}
        title={`Add block (${inserterShortcut})`}><Plus className="h-4 w-4" /></Button>

      <Button ref={outlineButtonRef} type="button"
        variant={outlineVisible ? "secondary" : "ghost"} size="icon"
        onClick={onToggleOutline}
        aria-pressed={outlineVisible} aria-expanded={outlineVisible}
        aria-controls="post-editor-document-overview" aria-label={outlineLabel}
        aria-keyshortcuts={formatPostEditorShortcutAria("toggleOutline")}
        data-post-editor-shortcut={outlineShortcut}
        title={`${outlineLabel} (${outlineShortcut})`}><ListTree className="h-4 w-4" /></Button>

      <Button ref={detailsButtonRef} type="button"
        variant={detailsOpen ? "secondary" : "ghost"} size="icon"
        onClick={onToggleDetails}
        aria-pressed={detailsOpen} aria-expanded={detailsOpen}
        aria-controls="post-editor-details" aria-label={detailsLabel}
        aria-keyshortcuts={formatPostEditorShortcutAria("toggleDetails")}
        data-post-editor-shortcut={detailsShortcut}
        title={`${detailsLabel} (${detailsShortcut})`}><Sidebar className="h-4 w-4" /></Button>

      <Button type="button" variant={focusMode ? "secondary" : "ghost"} size="icon"
        onClick={onToggleFocusMode} aria-pressed={focusMode}
        aria-label="Toggle full width editor" title="Toggle full width editor">
        <Columns3 className="h-4 w-4" /></Button>

      <Button type="button" variant="ghost" size="icon"
        onClick={onOpenRevisions} aria-label="Open revision history" title="Revisions">
        <History className="h-4 w-4" /></Button>

      <Button type="button" variant="ghost" size="icon"
        onClick={onOpenSettings} aria-label="Editor settings" title="Editor settings"
        data-post-editor-header-settings="true"><Settings className="h-4 w-4" /></Button>
    </div>
  </div>
  // NOTE: the old <div data-post-editor-header-row="secondary"> wrapper (:131-214)
  // is REMOVED. The regression test asserts it is gone (single strip).
);
```

> **a11y guard:** the demoted icon buttons MUST keep `aria-label` (already present at
> `:149` inserter, `:163` outline, `:180` details, `:196` focus, `:208` revisions),
> so demoting label→icon does **not** lose accessible names.

### B2 + B3 + B4 — `header/PostEditorActionCluster.tsx`

Keep the dynamic `syncLabel` logic (`:30-36` Saving…/Unsaved changes/Saved at HH:MM/
Synced) — only re-skin the pill `<span>` (`:44-49`) to a `Badge`. Add undo/redo
(`EditorPreviewFrame.tsx:47-52`), an explicit **Save draft** ghost (`PostEditorPreview.tsx:48`),
and swap Publish icon `Send`→`Rocket` (`:50`).

```tsx
// header/PostEditorActionCluster.tsx
import { Eye, Redo2, Rocket, Undo2 } from "lucide-react";   // was: Eye, Send
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// props += onSaveDraft?, canUndo?, canRedo?, onUndo?, onRedo?
const syncLabel = saving ? "Saving..." : dirty ? "Unsaved changes"
  : lastSavedAt ? `Saved at ${formatSavedAt(lastSavedAt)}` : "Synced";

return (
  <div className="flex flex-wrap items-center justify-end gap-2"
       aria-label="Primary editor actions" data-post-editor-header-cluster="primary-actions">

    {/* B2: pill span → Badge outline. KEEP dynamic text + the data hook tests rely on */}
    <Badge variant="outline" className="hidden md:inline-flex"
           data-post-editor-sync-state="true">{syncLabel}</Badge>

    {/* B4: undo/redo — WIRED, disabled when no history */}
    {onUndo ? (
      <Button type="button" variant="ghost" size="icon-sm" onClick={onUndo}
        disabled={!canUndo} aria-label="Undo" title="Undo"
        data-post-editor-undo="true"><Undo2 className="h-4 w-4" /></Button>
    ) : null}
    {onRedo ? (
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRedo}
        disabled={!canRedo} aria-label="Redo" title="Redo"
        data-post-editor-redo="true"><Redo2 className="h-4 w-4" /></Button>
    ) : null}

    <Button type="button" variant="outline" size="sm" onClick={onPreview}
      disabled={saving} aria-label="Open runtime preview">
      <Eye className="h-4 w-4" /> Preview</Button>

    {/* B3: explicit Save draft (ghost) — wired to existing editor.saveDraft() */}
    {onSaveDraft ? (
      <Button type="button" variant="ghost" size="sm" onClick={onSaveDraft}
        disabled={saving} aria-label="Save draft"
        data-post-editor-save-draft="true">Save draft</Button>
    ) : null}

    {/* Publish: Send → Rocket. Label flip Update/Publish UNCHANGED (:67,70) */}
    <Button type="button" size="sm" onClick={onPublish} disabled={saving}
      aria-label={status === "published" ? "Update published post" : "Publish post"}>
      <Rocket className="h-4 w-4" />
      {status === "published" ? "Update" : "Publish"}</Button>
  </div>
);
```

### Prop threading — `PostEditorTopBar.tsx` + `PostBlockEditorShell.tsx`

`PostEditorTopBar.tsx` is a thin pass-through to `PostEditorHeader` (it does not
forward the new props today) — extend its props type and forward the new ones
(`onSaveDraft`, `canUndo`, `canRedo`, `onUndo`, `onRedo`, `viewportMode`,
`onSetViewportMode`). Then wire from the shell:

```tsx
// PostBlockEditorShell.tsx — add device state (B5) near the other layout state.
const [viewportMode, setViewportMode] =
  useState<"auto" | "desktop" | "mobile">("auto");           // matches PostEditorLayout type

// In the <PostEditorTopBar …> block (currently starts :586) add:
onSaveDraft={() => { editor.saveDraft().catch(() => undefined); }}   // editor.saveDraft already used at :520
canUndo={editor.canUndo}                                            // :1051 (usePostEditorState)
canRedo={editor.canRedo}                                            // :1052
onUndo={editor.undo}                                                // :1069
onRedo={editor.redo}                                                // :1070
viewportMode={viewportMode}
onSetViewportMode={setViewportMode}
// (onPreview/onPublish/onToggle*/refs/onOpenSettings — UNCHANGED)

// On <PostEditorLayout …> (:582) pass the device state through (prop already exists,
// PostEditorLayout.tsx:31,58,76-77; shell currently passes nothing → defaults "auto"):
viewportMode={viewportMode}
```

> The shell already maps `shellBreadcrumbs = ["Content","Posts", title]` (`:486`) and
> `editorBreadcrumbs` (`:488`) into the header — leave those untouched.

### B6 — Left rail: `bg-muted/20` surface (done via region) + inserter as rail-item look

Keep BOTH panels and all their behavior. The **inserter palette** is the true
"Blocks" analog → re-skin its result rows to the rail look; the
`PostListViewSidebar` (Outline / List view, `:56-149`, root `bg-background` at `:58`)
keeps its tabs and sits on the `bg-muted/20` region. Restyle `PostListViewSidebar`'s
root `bg-background` (`:58`) to `bg-transparent` so the region's `bg-muted/20` shows
through; keep its `data-post-editor-sidebar`, `id`, tabs, and
`data-post-editor-left-rail-*` hooks.

```tsx
// EditorRail CONSUMPTION (REQUIRED — this is HOW the NEW core/admin/ui/shared/EditorRail.tsx
//   is consumed by the left rail, satisfying parent AC#5; it is NOT optional):
//   sidebars/PostInserterSidebar.tsx + blocks/BlockInserter.tsx — wrap the inserter's
//   "Blocks"/"Recently used" result sections (the recently-used <section> BlockInserter.tsx:187
//   and each catalog group <section> :236) in <EditorRailGroup label={…}>. EditorRailGroup
//   renders only a plain <div> (+ a label <div>), so it is a11y-NEUTRAL — placing it inside
//   the role="listbox" (:182) does NOT alter the role="option"/aria-selected/roving-keyboard
//   semantics (post-block-inserter-wave ArrowDown+Enter stays green). To avoid a DUPLICATE
//   heading, reuse each section's existing heading as the EditorRailGroup `label` (the
//   recently-used Badge :189 / the category Badge :238, and/or the PostInserterSidebar header
//   :34) and drop the now-redundant heading so the same label is not rendered twice.
//   EditorRailItem is NOT rendered here (exported-for-reuse only — B6 keeps the inserter's own
//   <Button role="option"> below; the inserter rows MIMIC EditorRailItem's active TOKEN, not
//   the element).

// blocks/BlockInserter.tsx — restyle the catalog/recently-used option rows to the RAIL
//   LOOK via className + the Button `variant` ONLY. Do NOT replace the existing <Button
//   role="option"> with EditorRailItem — that would drop role="option"/aria-selected/tabIndex
//   + the item description and break the listbox roving-keyboard insertion path.
//   KEEP verbatim (BlockInserter.tsx): role="listbox" (:182), and per option (:205-218,
//   :253-274): role="option", aria-selected={itemIndex === activeItemIndex}, tabIndex,
//   ref, the {item.description}, the activeItemIndex keydown handler, onInsertBlock wiring,
//   recentlyUsedTypes. Switch each option <Button>'s variant="outline" (:205,:253) →
//   variant="ghost": the `outline` variant hard-codes `border … shadow-soft` (button.tsx:20)
//   which the rail className below does NOT strip (tailwind-merge only drops *conflicting*
//   utilities), so leaving it `outline` keeps a prototype-mismatched bordered-card look;
//   `ghost` gives the borderless rail surface the prototype shows (EditorPreviewFrame.tsx:99-119).
//   Then add rail classes to each option <Button> className. KEEP `h-auto` (the current
//   `:206,:254` value): each option is TWO-LINE (label + `line-clamp-2` description,
//   :216-219), and the default Button size hard-codes a fixed `h-9` (button.tsx:28) that
//   tailwind-merge does NOT drop unless an explicit height utility is present — omit
//   `h-auto` and the second (description) line clips/overflows. APPEND the rail classes to
//   the existing `h-auto …` value (do not replace it):
//     className={cn(
//       "flex h-auto w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
//       itemIndex === activeItemIndex
//         ? "bg-primary-soft text-primary-soft-foreground"   // <-- the rail active token
//         : "hover:bg-accent",
//     )}
//   The chrome-wave's "inserter items use the rail active class bg-primary-soft" assertion
//   is satisfied by THIS className (it does not require the literal EditorRailItem element).
```

> **a11y is load-bearing here:** `post-block-inserter-wave.test.tsx:135-148` dispatches
> `ArrowDown`+`Enter` on the `role="listbox"` container and asserts `onInsertBlock` fires,
> and `post-editor-inserter-sidebar.test.tsx` mounts the sidebar — both must stay green.
> So the inserter option keeps its `<Button role="option" aria-selected>` and only its
> className changes. (The slash-menu, if it shares this markup, is therefore unaffected —
> there is no element-type swap to scope.) Verify by `Read`ing `blocks/BlockInserter.tsx`
> first; it is in the 497-02 Owning files.

### B7 + B10 — Right inspector: flat "Post settings" + status header + `InspectorRow` + single SEO sub-card

`inspector/DocumentInspector.tsx` today wraps every group in heavy `InspectorSection`
cards (`InspectorSection.tsx:33` `space-y-3 rounded-xl border p-3`, uppercase titles +
InfoTips) and **double-nests** SEO inside an "Advanced" section
(`DocumentInspector.tsx:205-286`: outer "Advanced" → inner "Title, URL and excerpt"
`:211` + "SEO summary" `:236`). Restyle to the prototype's light label-over-control
rows and **one** muted SEO sub-card. **KEEP every `onChange*` handler** (wired from
the shell `:441-447`) and the `data-post-editor-inspector="document"` hook (`:113`).
**KEEP the Block tab** in `PostDetailsSidebar` (`:49-55`) — selection-driven block
editing is required by the post block model; the prototype simply doesn't depict it.

```tsx
// inspector/DocumentInspector.tsx — local light row helper (port PostEditorPreview.tsx:27-34)
function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

return (
  <div className="space-y-4 p-4" data-post-editor-inspector="document">   // KEEP hook (:113)
    {/* Flat header: "Post settings" + status badge (B7 + B10). proto :75-77 */}
    <div className="mb-1 flex items-center justify-between">
      <span className="text-sm font-semibold">Post settings</span>
      <StatusBadge status={status} className="capitalize" />   {/* KEEP shared StatusBadge
        (draft→secondary, StatusBadge.tsx:29). The prototype's "soft" Draft is an
        optional cosmetic nuance (B10) — do NOT fork the shared StatusBadge map; the
        regression tests do not assert a soft-only class on this badge. */}
    </div>

    {/* Post title — KEEP the existing title <Input> wired to onTitleChange (:213-214) as a
        light row. The prototype omits a title field, but we KEEP it (exactly like the Block
        tab is kept) so `onTitleChange` stays CONSUMED — dropping the row would strand the
        destructured prop (ESLint --max-warnings=0 unused-var failure) AND break the
        FUNCTIONAL post-document-inspector-wave.test.tsx:367 (`expect(onTitleChange)
        .toHaveBeenCalledWith("Updated title")`, found by the input value "Hello world"). */}
    <InspectorRow label="Post title">
      {/* existing <Input value={title} onChange={(e) => onTitleChange(e.target.value)} /> (:213-214) */}
    </InspectorRow>

    {/* Publishing — keep StatusBadge + the timestamp <dl> (:120-133, incl. the "Last updated"
        <dt> :122), unwrapped from InspectorSection, as light rows. The <dl> is
        `formatTimestamp`'s SOLE consumer (:56-61 → :123/:127/:131), so it MUST be rendered
        here (do NOT collapse Publishing to a bare StatusBadge): drop the <dl> and
        `formatTimestamp` strands → `bun --cwd core lint` (`--max-warnings=0`) red-gates on
        no-unused-vars AND the post-document-inspector.test.tsx:46 `toContain("Last updated")`
        presentation-lock goes red. */}
    <InspectorRow label="Status"><StatusBadge status={status} /></InspectorRow>
    {/* keep the timestamps <dl> (:120-133) VERBATIM, directly under the Status row (no
        InspectorSection wrapper) — this is what keeps `formatTimestamp` consumed: */}
    <dl className="grid gap-2 text-xs text-muted-foreground">
      <div className="flex items-center justify-between gap-3">
        <dt>Last updated</dt>
        <dd className="text-right text-foreground">{formatTimestamp(updatedAt)}</dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt>Published</dt>
        <dd className="text-right text-foreground">{formatTimestamp(publishedAt)}</dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt>Scheduled</dt>
        <dd className="text-right text-foreground">{formatTimestamp(scheduledAt)}</dd>
      </div>
    </dl>

    <InspectorRow label="Category">
      {/* the existing <Select value={categoryId…} onValueChange={onCategoryIdChange}>
          block (:146-163) verbatim — handlers UNCHANGED, taxonomyLoading/error UI kept.
          DROP the "Current category / Linked tag terms" bg-muted/30 summary box (:140-143)
          so the SEO sub-card below is the ONLY bg-muted/30 (keeps the single-SEO test true). */}
    </InspectorRow>

    <InspectorRow label="Slug">
      {/* existing slug <Input value={slug} onChange={onSlugChange}> (:218) +
          className="font-mono text-xs" to match proto :87; keep slugDisplay note :219-224 */}
    </InspectorRow>

    <InspectorRow label="Tags (comma separated)">
      {/* existing <Input value={tagsInput} onChange={onTagsInputChange}> (:185-189) */}
    </InspectorRow>

    <InspectorRow label="Featured image">
      {/* existing <MediaPicker value={featuredImage} onChange={onFeaturedImageChange}> (:197-202) */}
    </InspectorRow>

    {/* Excerpt — keep <Textarea value={excerpt} onChange={onExcerptChange}> (:228-232) */}
    <InspectorRow label="Excerpt">{/* … */}</InspectorRow>

    {/* SINGLE muted SEO sub-card (collapse the double-nest). proto :114-125 */}
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SEO</span>
        <Badge variant="outline">SEO {seoCompleteCount}/3</Badge>   {/* keep counter :208 */}
      </div>
      <InspectorRow label="SEO title">{/* <Input value={seo.title} onChange={onSeoChange({title})} /> :244-248 */}</InspectorRow>
      <InspectorRow label="SEO description">{/* <Textarea value={seo.description} … /> :252-256 */}</InspectorRow>
      <InspectorRow label="Canonical URL">{/* <Input value={seo.canonicalUrl} … /> :260-264 */}</InspectorRow>
      <InspectorRow label="Robots">{/* existing robots <Select> :268-282 */}</InspectorRow>
    </div>

    {/* Danger zone — keep, but as a light bordered row (destructive Move to trash :288-306) */}
  </div>
);
```

> **Block tab unchanged.** `PostDetailsSidebar.tsx:44-57` keeps the Post/Block
> `Tabs`, the `disabled={!hasBlock}` Block trigger (`:49-55`), and both
> `data-post-editor-details-tab-trigger="document"|"block"` hooks (`:46,52`). Only
> `DocumentInspector`'s internal layout changes.

> **Lint guard (B7 flatten) — mirror the `onTitleChange` handling for the two symbols the
> flatten STRANDS, or `bun --cwd core lint` (`--max-warnings=0`, AC#3/#7) red-gates on
> `@typescript-eslint/no-unused-vars`:**
> - **`taxonomySummary`** — dropping the "Current category / Linked tag terms" `bg-muted/30`
>   box (`DocumentInspector.tsx:140-143`) removes its **only** consumer (`:141-142`), so the
>   destructured `taxonomySummary` (`:86`) becomes unused. **Remove it from the destructure**
>   (it MAY stay in `DocumentInspectorProps` `:33-36` and keep being passed by the shell at
>   `PostBlockEditorShell.tsx:430` — an un-destructured prop is NOT a lint error).
> - **`InspectorSection` import** (`DocumentInspector.tsx:17`) — the flatten replaces **every**
>   `<InspectorSection>` (used at `:114,136,193,205,211,236,288`) with `InspectorRow`/plain
>   `<div>`, so the import becomes unused. **Remove the import.** (Leave `InspectorSection.tsx`
>   itself in place — `PostDetailsSidebar`/other inspectors may still use it.)
>
> **Kept-used (do NOT remove) — `formatTimestamp` (`:56-61`):** unlike the two stranded symbols
> above, `formatTimestamp` stays REFERENCED, because B7 RETAINS its single consumer — the
> timestamps `<dl>` (`:120-133`, used at `:123/:127/:131`), rendered verbatim under the Status
> row in the Publishing pseudocode above. The "two symbols the flatten STRANDS" count above is
> therefore exact (only `taxonomySummary` + the `InspectorSection` import are removed);
> `formatTimestamp` and its `<dl>` are KEPT. If an implementer instead drops the `<dl>`
> (collapsing Publishing to a bare StatusBadge), `formatTimestamp` becomes unused → the SAME
> `--max-warnings=0` no-unused-vars red-gate, AND `post-document-inspector.test.tsx:46`
> `toContain("Last updated")` goes red — so the `<dl>` is non-optional.

### B8 — Canvas (near-parity, optional nudge only)

`PostEditorCanvas.tsx` is **already at parity**: `:1354` `bg-dotted px-4 py-8…`,
`:1359` `mx-auto … max-w-2xl rounded-2xl border bg-card p-6 shadow-card`. Optional
single-token nudge: title `:1372` `text-5xl`→`text-3xl` to exactly match
`PostEditorPreview.tsx:130`. **Do NOT** add the fixture byline. If skipped, leave the
canvas untouched — the regression test guards `bg-dotted` + `max-w-2xl` either way.

### B11 — Classic editor

`PostClassicEditorShell.tsx` (routed `PostEditorPage.tsx:60-61`) is **OUT OF SCOPE**
— no prototype reference. Do not restyle; only confirm it still renders on redesign
tokens (its existing `post-classic-editor-shell-wave.test.tsx` must stay green).

---

## Testing Requirements

Run from repo root (per [[local-cms-run-and-test]] / TASK-479 close-out norm):

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- **FUNCTIONAL posts suites — must stay GREEN, UNTOUCHED** (behavior, not chrome — do
  **not** weaken to fit the restyle):
  - `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/posts/postEditorStore.test.ts tests/vitest/posts/post-editor-layout-state.test.ts tests/vitest/posts/post-editor-focus-return.test.ts tests/vitest/posts/post-editor-preferences.test.ts tests/vitest/posts/post-insert-flow.test.ts`
  - DB-backed posts integration are **Bun-owned** (both `import … from "bun:test"`,
    `tests/integration/posts/posts-revisions-flow.test.ts:1` + `posts-runtime-flow.test.ts:1`)
    and are **not** under the vitest `include` glob (`vitest.config.ts:13` = `tests/vitest/**`)
    nor the `test:bun` glob (`package.json:26` lists only routes/runtime/server/store/plugins),
    so run them **explicitly via `bun test`** (NOT vitest — vitest would collect nothing /
    fail to resolve `bun:test`), with the DB-test env per AGENTS.md:
    `set -a && [ -f .env ] && . ./.env; set +a && bun test tests/integration/posts/posts-revisions-flow.test.ts tests/integration/posts/posts-runtime-flow.test.ts`
  - Editor/list UI waves that touch **behavior** keep passing unchanged:
    `post-block-editor-shell.test.tsx`, `post-block-editor-shell-wave.test.tsx`,
    `post-details-sidebar-wave.test.tsx`, `post-editor-layout-render-wave.test.tsx`,
    `post-editor-layout-hook-wave.test.tsx`, `post-classic-editor-shell-wave.test.tsx`
    (B11 guard), `post-editor-canvas-wave.test.tsx`, `post-list-view-sidebar-wave.test.tsx`,
    `post-block-inserter-wave.test.tsx` (its `ArrowDown`+`Enter` listbox insertion path is
    preserved by the B6 className-only restyle).
- **PRESENTATION-LOCK suites — must be UPDATED (re-baselined to the new look, NOT
  weakened).** These render the **real** header/inspector/list (no mocks) and assert the
  exact first-pass chrome this restyle deliberately changes; they all run under the
  `bun run test:vitest` closure gate (`vitest.config.ts:13` include = `tests/vitest/**`,
  which covers `tests/vitest/ui-integration/`), so the restyle is impossible without
  editing them. Re-point only the changed strings; keep every functional assertion:
  - `tests/vitest/ui/post-document-inspector-wave.test.tsx` — re-baseline the two
    presentation strings the flatten removes: `:300` `"Current category: Not assigned"`
    (the `bg-muted/30` category summary box is dropped) and `:320`
    `"SEO fields completed: 0/3"` (replaced by the `Badge` `"SEO 0/3"`). **KEEP** all the
    functional callback assertions (`:364-374`: onCategoryIdChange / onTagsInputChange /
    onFeaturedImageChange / **onTitleChange** / onSlugChange / onExcerptChange / onSeoChange ×4
    / onMoveToTrash) green — B7 keeps the Post title row + every control + Danger zone, and
    `:321` `"Public URL:"` survives (slugDisplay note kept).
  - `tests/vitest/ui-integration/post-document-inspector.test.tsx` — re-point `:39`
    `"Publishing"`, `:40` `"Categories and tags"`, `:44` `"Advanced"`, `:45`
    `"Current category"` (all dropped by the flatten) to the new flat labels
    (`"Post settings"` / the `InspectorRow` `"Status"`+`"Category"` labels). **KEEP** `:41`
    `"Featured image"`, `:42` `"Danger zone"`, `:43` `"Move to trash"`, `:46` `"Last updated"`
    (B7 preserves all four).
  - `tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx` — `:25`
    `toContain("Publishing")` (and the inverted comment `:24` "(NOT an invented single
    'Post settings' header)") is the designed inverse of B7 → re-baseline to
    `toContain("Post settings")`. **KEEP** `:26` `"Featured image"`, `:28` `"Publish"`, and
    the canvas-card test `:62-64` (`rounded-2xl`/`max-w-2xl`/`shadow-card` — B8 leaves the
    canvas card untouched) and the reducer-dirty test `:67-76` green.
  - `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx` — drop `:33`
    `data-post-editor-header-cluster="secondary-controls"` (the secondary row is removed),
    and replace the visible-text checks `:35` `"Add block"` + `:36` `"Outline"` (labels
    demoted to icons) with the preserved `aria-label`/`title` equivalents — `"Toggle block
    inserter"` (static) and, because this suite seeds `outlineVisible: true` (`:23`), the
    outline toggle's computed label is `"Hide document overview"` (PostEditorHeader.tsx:64
    `outlineVisible ? "Hide document overview" : "Show document overview"`), so assert
    `"Hide document overview"` — **not** `"Show document overview"`. (This suite renders via
    `renderToString` and asserts on the `html` string, so re-point with
    `html.toContain("Hide document overview")` / `html.toContain("Toggle block inserter")`, or
    robustly `expect(/document overview/i.test(html)).toBe(true)` — it does **not** use
    `screen`/`getByRole`, mirroring its existing `renderToString`+`toContain` idiom.) **KEEP** `:32`
    `primary-actions`,
    `:34` close, `:37` `"Revisions"` (title attr kept), `:38` `"Preview"`, `:39`
    `"Editor settings"`, and the saving/dirty + publish-label tests green.
  - `tests/vitest/ui-integration/post-editor-layout-shell.test.tsx` — drop `:16`
    `data-post-editor-header-cluster="secondary-controls"`. **KEEP** `:14`
    `secondary-sidebar`, `:15` `primary-actions`, `:17` close, `:18` left-rail-mode, `:19`
    `"List view"`, `:20` `"Loading post editor"`, `:21` `"Document Outline"`, `:22`
    `"Move to trash"` (all preserved).
  - `tests/vitest/ui-integration/post-editor-writing-canvas-flow.test.tsx` — its FIRST
    test renders `PostEditorTopBar`; replace `:33` `"Outline"` (header label demoted to an
    icon) with the preserved `aria-label`/`title` — this suite also seeds `outlineVisible:
    true` (`:24`), so the computed label is `"Hide document overview"` (PostEditorHeader.tsx:64),
    **not** `"Show document overview"`; assert `"Hide document overview"` (or a
    `/document overview/i` match). **KEEP** the
    `PostListViewPanel` test (`Section`/`CTA block`/`Embed block`) green.
  - **Verified NOT broken (leave untouched):** `tests/vitest/ui-integration/post-list-restyle.test.tsx`
    — its `:38` `toContain("shadow-card")` renders `<PostsListPage>` in the **loading**
    state, whose loading card (`PostsListPage.tsx:513`) independently carries `shadow-card`
    (untouched; A4 only changes the `PostsTable` wrapper `:77`), and its `:60` asserts
    `rounded-2xl` (A4 keeps it) — so it stays GREEN; and
    `post-editor-listview-outline.test.tsx:46` `"Outline"` is the **rail tab** label
    (preserved), not the demoted header toggle.
- **NEW restyle suite:** `tests/vitest/ui/posts-editor-chrome-wave.test.tsx`
  (Section "Regression-test shape").
- Full `bun test` (vitest + `test:bun`) + `gates:coderso` (5/5) green.
- Runtime smoke via `coderso-dev-core-host` + `playwright-cli`
  (`http://coderso-a.localhost:5173/admin/posts` → open a post): single chrome strip,
  autosave badge text live-updates, Save draft + Publish(Rocket) + undo/redo +
  device toggle work, Block tab still selectable after clicking a block, inspector
  rows + single SEO sub-card render. White page = server down → re-run helper.

---

## Regression-test shape

`tests/vitest/ui/posts-editor-chrome-wave.test.tsx` — render the **real**
`PostBlockEditorShell` so the assertions below see real classNames/aria.

> **Do NOT literally mirror `post-block-editor-shell-wave.test.tsx`'s mocks.** That suite
> mocks away `PostEditorLayout` (`:347`), `PostEditorTopBar` (`:400`), `PostInserterSidebar`
> (`:474`), `PostListViewSidebar` (`:493`), `PostDetailsSidebar` (`:322`), and
> `PostEditorCanvas` (`:381`) — i.e. **exactly** the components whose real header/region/
> inspector/canvas classNames + undo/redo buttons these new assertions target — so a literal
> mirror yields an all-failing test. Instead:
> - Mock **only the data/seam hooks** (`usePostEditorState` / `usePostEditorLayout` /
>   `usePostEditorPreferences` / `usePostEditorShortcuts` / `useFocusReturn` + router /
>   taxonomy / `sonner` / `RuntimePreviewDialog`). Leave `PostEditorLayout`/`PostEditorTopBar`/
>   the sidebars/inspector/canvas **real**.
> - The desktop regions only mount when `isDesktopViewport` is true (`PostEditorLayout.tsx:76-84`),
>   and happy-dom's `matchMedia` defaults `matches:false` → the secondary-sidebar/sidebar
>   regions would never render. **Stub `matchMedia` `matches:true`** (the pattern at
>   `post-editor-layout-render-wave.test.tsx:124` `vi.stubGlobal("matchMedia", …)`) **or**
>   force `viewportMode="desktop"` (`:194`) so those regions mount.
> - For the "undo/redo disabled on fresh load" case, override the `usePostEditorState` mock's
>   `canUndo`/`canRedo` to **false** (the shell-wave mock seeds them `true`).

> **Test idiom (repo convention — NOT `@testing-library`):** this repo has **no**
> `@testing-library/react` (not in `package.json`/`core/package.json`, not in `node_modules`)
> and **no** `jest-dom` (`tests/setup/vitest.ts:3-28` registers only `toBeTrue`/`toBeFalse`/
> `toBeObject`), and **adding them is out of scope** (TASK-497-03 lists "changing the `bun test`
> / vitest runner config" + "no production code beyond the new test file(s)" as out of scope, so
> the fix is to *translate the assertions*, **not** add the infra). So **do NOT** write
> `import { screen, fireEvent } from "@testing-library/react"` or use `.toBeDisabled()` /
> `.toHaveAttribute(...)` — the module is unresolved (red `bun --cwd core lint:types`) and the
> matchers are undefined (throw at runtime → red `bun run test:vitest`). Mirror the existing wave
> idiom verbatim: a top-of-file `// @vitest-environment happy-dom` docblock (**required** —
> `vitest.config.ts` defaults `environment: node`, which has no DOM), mount via `createRoot` +
> `React.act` (copy the `mount` helper from `post-editor-layout-render-wave.test.tsx:79-103`,
> here named `renderEditor()` → returns `{ container }`), and assert via
> `container.querySelector(...)` / `Array.from(container.querySelectorAll("button")).find(...)`.
> Translations used below: `screen.getByText(re)` → `container.querySelector(sel)?.textContent`
> + `.toContain`/`.toMatch`; `screen.getByLabelText("X")` → `container.querySelector('[aria-label="X"]')`;
> `screen.getByRole("button",{name:re})` → `Array.from(scope.querySelectorAll("button")).find(b =>
> re.test(b.getAttribute("aria-label") ?? ""))`; `.toBeDisabled()` →
> `expect(el?.hasAttribute("disabled")).toBe(true)`; `.toHaveAttribute("aria-controls", id)` →
> `expect(el?.getAttribute("aria-controls")).toBe(id)`; `.toHaveAttribute("aria-pressed")`
> (presence) → `expect(el?.hasAttribute("aria-pressed")).toBe(true)`; `fireEvent.click(el)` →
> `React.act(() => el?.dispatchEvent(new MouseEvent("click", { bubbles: true })))`. The
> `getAttribute(...).className.toContain(...)` template is already correct in the first/rail/
> inspector/canvas cases — the rest are translated to match.

Assertions (repo idiom — `renderEditor()` = the `createRoot` helper above; `React` imported):

```tsx
describe("TASK-497-02 post editor chrome restyle", () => {
  it("renders a single muted chrome strip (no secondary toolbar row)", () => {
    const { container } = renderEditor();
    expect(container.querySelector('[data-post-editor-header-row="primary"]')).toBeTruthy();
    // collapsed: the labeled second row is gone
    expect(container.querySelector('[data-post-editor-header-row="secondary"]')).toBeNull();
    // header region surface reads the muted chrome token
    expect(container.querySelector('[data-post-editor-region="header"]')?.className)
      .toContain("bg-muted/40");
  });

  it("keeps autosave badge with dynamic sync text", () => {
    const { container } = renderEditor();
    // the Badge carries data-post-editor-sync-state="true" (PostEditorActionCluster) — scope
    // to it instead of a global text match, so the dynamic syncLabel is read off the real node.
    const badge = container.querySelector('[data-post-editor-sync-state="true"]');
    expect(badge?.textContent).toMatch(/Saving\.\.\.|Unsaved changes|Saved at|Synced/);
  });

  it("wires undo/redo and disables them when no history", () => {
    // override the usePostEditorState mock's canUndo/canRedo to false for THIS render
    const { container } = renderEditor();
    expect(container.querySelector('[aria-label="Undo"]')?.hasAttribute("disabled")).toBe(true);
    expect(container.querySelector('[aria-label="Redo"]')?.hasAttribute("disabled")).toBe(true);
  });

  it("exposes Save draft, Preview, and Publish(Rocket; Update when published)", () => {
    const { container } = renderEditor();
    expect(container.querySelector('[aria-label="Save draft"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Open runtime preview"]')).toBeTruthy();
    // Publish aria-label is status-driven ("Publish post" | "Update published post")
    const publish = Array.from(container.querySelectorAll("button")).find((b) =>
      /Publish post|Update published post/.test(b.getAttribute("aria-label") ?? ""),
    );
    expect(publish).toBeTruthy();
  });

  it("preserves toggle a11y + shortcut hooks after demoting labels to icons", () => {
    const { container } = renderEditor();
    const add = container.querySelector('[aria-label="Toggle block inserter"]');
    expect(add?.getAttribute("aria-controls")).toBe("post-editor-block-inserter");
    expect(add?.hasAttribute("aria-pressed")).toBe(true);
    expect(add?.getAttribute("data-post-editor-shortcut")).toBeTruthy();
    // Scope to the header BUTTON: PostListViewSidebar's region also carries
    // aria-label="Document overview sidebar" (PostListViewSidebar.tsx:62), so a bare
    // container-wide /document overview/i match is ambiguous (2 nodes) whenever the
    // list-view sidebar is mounted. Scope the .find(...) to the header strip's <button>.
    const header = container.querySelector('[data-post-editor-region="header"]');
    const outline = Array.from(header?.querySelectorAll("button") ?? []).find((b) =>
      /document overview/i.test(b.getAttribute("aria-label") ?? ""),
    );
    expect(outline?.getAttribute("aria-controls")).toBe("post-editor-document-overview");
  });

  it("optional device toggle is wired (aria-pressed) and changes nothing on the network", () => {
    const { container } = renderEditor();
    const desktop = container.querySelector('[aria-label="Desktop preview"]');
    const mobile = container.querySelector('[aria-label="Mobile preview"]');
    React.act(() => {
      mobile?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    // same reconciled node — its aria-pressed flips to "false" after selecting mobile
    expect(desktop?.getAttribute("aria-pressed")).toBe("false");
  });

  it("left rail region uses bg-muted/20 and inserter is wrapped in EditorRailGroup with active rail token", () => {
    // render with the inserter OPEN (layout.showInserter:true) so the rail-group host mounts
    const { container } = renderEditor(/* inserterOpen */);
    const region = container.querySelector('[data-post-editor-region="secondary-sidebar"]');
    expect(region?.className).toContain("bg-muted/20");
    // EditorRail.tsx IS consumed (parent AC#5): the inserter sections are wrapped in
    // EditorRailGroup (emits data-editor-rail-group). Guards EditorRail.tsx against shipping
    // as a dead/unconsumed module. NOTE — PostBlockEditorShell.tsx:454 renders the secondary
    // slot as `showInserter ? <PostInserterSidebar/> : <PostListViewSidebar/>`, so the inserter
    // and the Outline/List-view tabs are MUTUALLY EXCLUSIVE — do NOT also assert
    // data-post-editor-left-rail-tab="outline" in THIS render (those tabs live in the untouched
    // post-editor-listview-outline / post-list-view-sidebar-wave / layout-shell suites).
    expect(container.querySelector('[data-editor-rail-group]')).toBeTruthy();
    // …and an inserter option row carries the active rail token (bg-primary-soft) via its kept
    // <Button role="option"> className (NOT a literal EditorRailItem element — B6 preserves the
    // listbox a11y).
  });

  it("inspector is flat: Post settings header + InspectorRow labels + single SEO sub-card + Block tab", () => {
    const { container } = renderEditor();
    // exactly ONE muted SEO sub-card — SCOPE to the details-sidebar region: the REAL canvas
    // rich-text toolbar also emits bg-muted/30 for a SELECTED block (PostRichTextToolbar.tsx:
    // 403,456 via PostEditorCanvas.tsx:648), so a whole-container count is not reliably 1.
    const sidebar = container.querySelector('[data-post-editor-region="sidebar"]');
    expect(sidebar?.textContent).toContain("Post settings");
    expect(sidebar?.textContent).toContain("SEO");
    expect(sidebar?.querySelectorAll(".bg-muted\\/30").length).toBe(1);
    // Block tab still present (post block model preserved)
    expect(container.querySelector('[data-post-editor-details-tab-trigger="block"]')).toBeTruthy();
  });

  it("canvas keeps bg-dotted + max-w-2xl card", () => {
    const { container } = renderEditor();
    expect(container.querySelector(".bg-dotted")).toBeTruthy();
    expect(container.querySelector(".max-w-2xl")).toBeTruthy();
  });
});
```

> **Do not** assert against brittle full class strings beyond the load-bearing
> tokens above; the existing functional suites (store/layout-state/focus-return/
> preferences/insert-flow + revisions/runtime integration) remain the source of
> truth for behavior and must pass unchanged.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-497** + **TASK-497-02**,
  noting: single muted chrome strip; autosave Badge; Save draft + Publish(Rocket);
  undo/redo wired; optional device toggle; left rail `bg-muted/20` + inserter rail
  look; inspector "Post settings" + `InspectorRow` + single SEO sub-card; **Block tab
  kept**; new shared `core/admin/ui/shared/EditorRail.tsx`; classic editor explicitly
  out of scope.
- A pure visual restyle needs **no** contract edits to `_docs/PAGE_MODEL.md` /
  `_docs/PREVIEW_SPEC.md` — state explicitly in the changelog that none were required.
- Cross-link [[pages-editor-v2-remediation-program]] (visual sibling of this restyle).
