# TASK-479-09-L02: Post Editor Restyle
# FileName: TASK-479-09-L02-Post-Editor-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content
**Estimated Effort:** Large
**Dependencies:** TASK-479-06, TASK-479-09-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-09
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the **functional** Post editor to the prototype look: a calm, document-
style writing canvas (centered `rounded-2xl` card on a soft dotted/warm canvas)
plus a soft inspector/details panel. This is a real, working editor — NOT the
non-functional preview — so the richtext/block model, autosave, revisions, undo/
redo, and dirty-state protection are preserved exactly; only chrome, canvas, and
inspector styling change.

- **Goal:** `core/admin/ui/posts/PostEditorPage.tsx` and the editor shell tree
  (`posts/editor/{PostBlockEditorShell,PostClassicEditorShell,PostEditorCanvas}`,
  `posts/editor/layout/*`, `posts/editor/header/*`, `posts/editor/inspector/*`)
  read like `_docs/_PROTOTYPE/src/pages/content/PostEditorPreview.tsx` — same warm
  tokens, rounded cards, soft inspector — without losing any behavior.
- **Owning module/service:** `core/admin/ui/posts/PostEditorPage.tsx`,
  `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`,
  `core/admin/ui/posts/editor/PostClassicEditorShell.tsx`,
  `core/admin/ui/posts/editor/PostEditorCanvas.tsx`,
  `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx` (+ `PostEditorRegions.tsx`),
  `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`,
  `core/admin/ui/posts/editor/inspector/{BlockInspector,DocumentInspector,InspectorSection}.tsx`.
- **Source-of-truth docs:** prototype editor
  `_docs/_PROTOTYPE/src/pages/content/PostEditorPreview.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{EditorPreviewFrame,CanvasEditor}.tsx`;
  prototype primitives `_docs/_PROTOTYPE/src/components/ui/{card,input,select,badge,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`;
  Page Editor V2 vision note (floating-panel direction) for the optional inspector
  treatment.
- **Out of scope:** No change to `postEditorStore.ts`, the richtext command/
  selection contracts, block schemas, `postInsertFlow`, autosave/revision logic,
  keyboard a11y wiring, or the responsive desktop/mobile sheet behavior in
  `PostEditorLayout.tsx`. No new editor capabilities. The list screen restyle is
  L01. Tokens/shell land in TASK-479-05/06 and are consumed here.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

The editor is wired through `PostEditorLayout` (AdminShell + region slots:
secondary sidebar / content / details sidebar, with desktop columns and mobile
`Sheet`s). Keep that structure; restyle the regions and the canvas/inspector that
fill them. Do NOT alter the `matchMedia` desktop logic, the `viewportMode`/
`focusMode` gating, or the `Sheet` open/close props.

```tsx
// 1) PostEditorHeader.tsx (header/) — port the prototype PageHeader + chrome:
//    keep breadcrumbs via canonical AdminBreadcrumbs (Posts -> title), keep the
//    real Preview / Save draft / Publish buttons + their handlers and the
//    autosave/status Badge. Restyle to: ghost+outline+primary(violet) button
//    set, "Draft · autosaved" soft Badge (port look from PostEditorPreview's
//    <Badge variant="outline">), undo/redo as ghost icon-sm. No handler edits.

// 2) Writing canvas — PostEditorCanvas.tsx + PostEditorRegions content region:
//    wrap the editable document in the prototype "document card":
//      <article class="mx-auto max-w-2xl rounded-2xl border bg-card p-10 shadow-card">
//    on a warm/dotted canvas background (bg-dotted token from theme.css). The
//    contentEditable / block-render internals are UNCHANGED — only the framing
//    wrapper, max-width, padding, and typography classes (font-display title,
//    text-[15px] leading-relaxed body) are restyled to match the preview.
//    Preserve selection rects, drag handles, block toolbars, and inserter logic.

// 3) Inspector — inspector/{DocumentInspector,BlockInspector,InspectorSection}:
//    restyle the details panel to the prototype "Post settings" inspector:
//      - section header: "Post settings" + soft status Badge.
//      - InspectorRow look: xs muted label above each control (port the
//        InspectorRow shape from PostEditorPreview).
//      - controls keep their REAL bindings (status Select, slug Input mono,
//        category Select, tags Badges + add input, featured image tile + Upload,
//        SEO meta box). Only classes change; every onChange/value stays wired to
//        the postEditorStore. The SEO group becomes a "rounded-xl border bg-muted/30
//        p-3" card like the prototype.

// 4) OPTIONAL (owner's V2 direction) — floating-panel inspector:
//    Behind the existing details-sidebar slot, the inspector MAY adopt the
//    prototype CanvasEditor floating-panel treatment
//    (_docs/_PROTOTYPE/.../CanvasEditor.tsx): a pinned, dismissible panel over the
//    canvas instead of a fixed right column. If adopted, it MUST reuse
//    PostEditorLayout's existing detailsSidebarOpen / onDetailsSidebarOpenChange
//    state and the mobile Sheet fallback — do NOT fork the layout or introduce a
//    second open-state source of truth. If it adds risk, keep the docked column
//    and defer the floating panel to a follow-up; the docked restyle is the
//    required deliverable, the floating panel is the stretch.

// 5) Both shells: PostBlockEditorShell.tsx and PostClassicEditorShell.tsx render
//    through PostEditorLayout. Apply the same token/card restyle to BOTH so the
//    block and classic modes stay visually consistent. PostEditorPage.tsx mode
//    resolution (resolvePostEditorMode) is UNCHANGED.
```

**Data flow:** `PostEditorPage` resolves mode (query `?editor=` → `posts.editor.mode`
setting → `blocks` default) and renders the matching shell → shell binds the
`postEditorStore` (blocks, selection, dirty/autosave) → `PostEditorLayout` places
header/canvas/inspector → controls read/write the store. The restyle touches only
the JSX/classNames in these render trees; the store and its actions are untouched.

**Dirty-state / autosave (preserve):** Do not change when the editor marks dirty,
debounced autosave, or the unsaved-changes guard. The restyle must not remount the
canvas (no key churn) or reset controlled inputs — keep the same component
identities so React preserves editor state and the dirty flag.

**Navigation/href constraint (preserve):** Breadcrumbs and any back-to-list /
preview links must keep routing through `AdminBreadcrumbs`/`AdminLink`/
`adminPaths`/`prefetchAdminRoute`. Do not hand-build hrefs while restyling.

**React-hooks rules:** No new sync `setState` in effects. If the optional floating
panel needs open/close state, reuse the layout's existing prop-driven state or a
reducer; derive visibility at render. Respect the existing `matchMedia` effect
shape in `PostEditorLayout` (do not duplicate it).

**Error handling:** Editor error/empty/loading states keep their current copy and
conditions; they inherit the new card/token styling. No new error surfaces.

**Regression-test shape:** see L03 — render the editor shell (block mode) with a
seeded store; assert the document card wrapper carries the rounded-2xl/max-w-2xl/
shadow-card classes, the inspector renders the "Post settings" section with the
status Select still bound, the header exposes Save draft/Publish, and a basic
block edit still flips the dirty/autosave indicator (behavioral guard that the
restyle did not sever store wiring).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx`
  (new suite in L03)
- The full existing editor suite MUST stay green — at minimum re-run:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/post-editor-layout-shell.test.tsx tests/vitest/admin/post-editor-layout-responsive.test.tsx tests/vitest/admin/post-document-inspector.test.tsx tests/vitest/admin/post-block-inspector.test.tsx tests/vitest/admin/post-autosave-flow.test.tsx tests/vitest/admin/post-editor-smoke-regression.test.tsx`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-09-L02`.
- If the optional floating-panel inspector is adopted, record the decision and the
  reused `PostEditorLayout` state contract in the editor/design notes so the Page
  editor (which shares the V2 floating-panel direction) stays consistent.
