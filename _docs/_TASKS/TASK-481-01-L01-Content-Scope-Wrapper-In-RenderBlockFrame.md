# TASK-481-01-L01: Content-Scope Wrapper in renderBlockFrame & Section Content

# FileName: TASK-481-01-L01-Content-Scope-Wrapper-In-RenderBlockFrame.md

**Parent Subtask:** TASK-481-01
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-477-02
**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-19
**Changelog:** 1317 (created at TASK-481 closure)

---

## Overview

**Goal:** Introduce a content-only scope element (`data-page-editor-content`) inside
the canvas block frame (and the section content region) that contains the rendered
page content AND the block's brand-consuming visual inline style, with the editor
chrome (selection outline/ring, type/override/visibility badges, ghost insert tiles,
"add block beside" handle) staying OUTSIDE it. This is purely structural — no site
brand value is emitted yet (that is TASK-481-02). The wrapper is the seam the
emission leaf paints on.

**Owning module(s) to create-or-extend:**
- `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` — `SectionCanvas`'s
  `renderBlockFrame` callback (frame `<div>` at ~1058–1102) and the `<section>` +
  `PageSectionContent` region (`<section>` ~903–908, `<PageSectionContent>` at :938).

**Source-of-truth docs:**
- `_docs/PAGE_MODEL.md` (page block/section model, `PageBlockStyleV2`).
- `_docs/DESIGN_TOKENS.md` (Pages v2 color-token authoring; the canvas re-paints
  site token variables inline so it resolves the same effective values as the
  front).
- `_docs/THEMES_SPEC.md` (admin shell vs site theme separation).

**Out-of-scope:** Emitting any SITE brand `--color-*` value (TASK-481-02-L02);
the admin-brand re-assertion on chrome (TASK-481-01-L02); inline toolbar palette
threading (TASK-481-03); any change to `core/services/pages/pageRendererV2.tsx`
front rendering, the sanitizer allowlist, or `globals.css`.

## Security Contract

Not a route/auth/data leaf — N/A by surface, stated explicitly for compliance:
- **Endpoint visibility:** none. This is an admin-only client-side render-structure
  change inside the page editor canvas; it adds no endpoint and touches no
  `/admin/api/*` or public route.
- **Auth model / RBAC / CSRF / rate-limit:** unchanged. No request is issued; the
  existing page-editor authz/CSRF on save/load is untouched.
- **Validation:** unchanged. Block/section color values remain validated by the
  single owner `core/services/pages/pageAuthoringSanitizers.ts`
  (`authoringColorTokenNames` allowlist = `["primary","secondary","accent","bg",
  "surface","text","border"]`, `colorTokenPattern`, `sanitizeAuthoringCssColor`).
  This leaf only changes which DOM element a value is *rendered* on, never what is
  accepted/stored.
- **Secret/PII handling:** none; no new data flows to client cache or logs.

## Implementation Pseudocode

Current frame (`renderBlockFrame`, PageAuthoringCanvas.tsx ~1058–1102) — the SAME
`<div>` carries chrome classes, block style, AND `{content}`:

```tsx
<div
  className={joinPageRenderClasses(
    "relative transition outline outline-1 outline-offset-2",
    blockRenderProps.className,
    blockSelected ? "outline-primary ring-2 ring-primary/20"
                  : "outline-transparent hover:outline-primary/30",
    block.visibility.visible ? undefined : "opacity-70")}
  style={blockRenderProps.style}            // <-- block brand visual style (bg/color/border)
  {...blockRenderProps.dataAttributes} ...>
  {blockHasOverride ? <span ...override badge.../> : null}   // chrome
  {block.visibility.visible ? content : <HiddenBlockGhost block={block} />}
  {blockSelected && canAddBlockBeside ? <button ...add-beside/> : null}  // chrome
</div>
```

Target shape — split chrome (stays on the frame) from content scope (inner wrapper):

```tsx
// 1. Frame keeps chrome utilities + LAYOUT style + data hooks; brand visual style
//    moves to the content scope so it shares the content cascade (not the chrome's).
const { color, backgroundColor, backgroundImage, backgroundSize, backgroundPosition,
        borderColor, borderStyle, borderWidth, borderRadius, boxShadow, opacity,
        ...frameLayoutStyle } = blockRenderProps.style;   // visual vs layout split
const contentVisualStyle = { color, backgroundColor, backgroundImage, backgroundSize,
        backgroundPosition, borderColor, borderStyle, borderWidth, borderRadius,
        boxShadow, opacity };

<div /* FRAME = chrome */
  className={/* unchanged outline/ring/transition classes + blockRenderProps.className */}
  style={frameLayoutStyle}                 // padding/margin/textAlign only
  {...blockRenderProps.dataAttributes} {...all existing data-page-editor-* hooks}
  onClick={selectBlock}>
  {blockHasOverride ? <span ...override badge/> : null}     // chrome (outside content)
  <div
    data-page-editor-content="true"
    style={contentVisualStyle}>            // 481-02-L02 merges the SITE brand var map here
    {block.visibility.visible ? content : <HiddenBlockGhost block={block} />}
  </div>
  {blockSelected && canAddBlockBeside ? <button ...add-beside/> : null}  // chrome
</div>
```

Notes / decisions for the implementer:
- **Why move the visual style inward:** `blockRenderProps.style` (=`toPageBlockStyle`,
  defined in `core/services/pages/pageBlockRenderStyles.ts`:266, imported by
  `pageRendererV2.tsx`:903) merges `toPageBlockVisualStyle` (brand bg/color/border,
  possibly `var(--color-accent)`) with `toPageBlockLayoutStyle` (padding/margin/
  align). Brand vars must be consumed on the SAME element the SITE brand map is
  defined on (the content scope), else they resolve against the admin cascade. Keep
  padding/margin/align on the frame so the chrome outline box is unchanged. Preserve
  the existing `--coderso-block-text` / `--coderso-block-surface` custom props with
  their `backgroundColor`/`color` (they travel together in `toPageBlockVisualStyle`).
- For `isPageBlockVisualElementType` blocks (button/image) `toPageBlockStyle` is
  layout-only (the brand visual lives on the inner element inside `content`), so the
  visual/layout split is a no-op for them and `content` already sits in the scope.
- Apply the SAME `data-page-editor-content` wrapper inside the `<section>` around
  `PageSectionContent` (so section-level rendered content, not the section chrome
  badges, sits in the scope for 481-02). The `<section>` chrome (outline, name
  label ~917, override badge ~921, visibility badges ~925–935) stays outside.
- Do not alter any `data-page-editor-*` attribute names or `onClick`
  selection/stop-propagation behavior; characterization tests (L03) pin them.
- **Error handling:** none required — pure presentational JSX; no domain codes, no
  route boundary, no `map*Error`.

**Regression-test shape (for L03):** render `SectionCanvas` with a block carrying a
brand color; assert a single `[data-page-editor-content]` wraps the rendered block
content, the chrome (`outline-primary`/`ring`, override badge, add-beside handle)
is a sibling/ancestor NOT inside the content wrapper, and the block's
`backgroundColor`/`color` inline style sits on the content wrapper.

## Testing Requirements

- Vitest lane: `tests/vitest/ui/page-authoring-canvas.test.tsx` (admin-UI render
  structure; no runtime/route/DB dependency).
- Cases: content wrapper present and unique per block; chrome rendered outside it;
  brand visual style co-located on the content wrapper; layout (padding/margin/align)
  stays on the frame; `data-page-editor-*` hooks + block selection click behavior
  unchanged; section content wrapped, section chrome badges outside.
- No DB migration artifacts (no schema/DB change).

## Line gate / PageAuthoringCanvas.tsx split

`PageAuthoringCanvas.tsx` is 1,106 lines. Split it cohesively BEFORE adding the
content-scope wrapper, so the brand-surface edits land on already-split modules:

- `core/admin/ui/pages/editor/PageAuthoringCanvasInline.tsx` (new) — the inline
  editable text + mark/color toolbar surface: `InlineEditableCanvasText`,
  `inlineTextMarkPalette`, `MARK_TOOLBAR_DOCK_CYCLE`, the dock placement/icon consts,
  the inline selection helpers, and the text-mark commit types
  (`PageEditorInlineEditTarget`/`PageEditorInlineEditCommit`/
  `PageEditorTextMarkCommit`/`PageEditorTextColorMarkCommit`/
  `PageEditorMarkToolbarDock`).
- `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` (retained facade) — `SectionCanvas`,
  `SectionGapInsertZone`, `HiddenBlockGhost`, `CanvasGhostAddTile`, and named
  re-exports of the public types above (no export-star) so `PageEditor.tsx` and the
  tests keep importing from the unchanged path.

Land order: perform this split first in L01, then add the `data-page-editor-content`
wrapper inside `SectionCanvas`'s `renderBlockFrame` (facade). The inline toolbar
surface is untouched by this leaf (its live-palette change is TASK-481-03-L01, which
edits `PageAuthoringCanvasInline.tsx`).

Post-split receipt: both modules `<=1000` lines (inline ~780, facade ~350); verify
with `wc -l` and `git diff --check`.
